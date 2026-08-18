package diet

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrNotFound          = errors.New("not found")
	ErrInvalidTransition = errors.New("invalid meal status transition")
	ErrDuplicateMeal     = errors.New("meal order already exists for this date")
	ErrNoActiveDietPlan  = errors.New("no active diet plan for this admission")
	ErrInvalidMealType   = errors.New("invalid meal type")
)

type Service interface {
	CreateDietPlan(req CreateDietPlanRequest, orderedByUserID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	GetDietPlan(id uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	GetActiveDietPlan(admissionID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	ListDietPlans(admissionID uuid.UUID, scope *models.DataScope) ([]DietPlanResponse, error)
	UpdateDietPlan(id uuid.UUID, req UpdateDietPlanRequest, userID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	RenewDietPlan(id uuid.UUID, req RenewDietPlanRequest, userID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	CancelDietPlan(id uuid.UUID, userID uuid.UUID, req CancelDietPlanRequest, scope *models.DataScope) error

	// Daily generation and operations
	GenerateDailyMeals(t time.Time) (int, error)
	GetKitchenSheet(f KitchenSheetFilter) ([]MealOrderResponse, error)
	UpdateMealStatus(mealID uuid.UUID, userID uuid.UUID, req UpdateMealStatusRequest) error
	CreateManualMeal(req CreateManualMealRequest, userID uuid.UUID) (*MealOrderResponse, error)
	CancelMeal(id uuid.UUID, userID uuid.UUID, req CancelMealRequest) error

	// Kitchen helpers
	GetWardsForKitchen() ([]WardOption, error)
	GetKitchenAdmissions() ([]KitchenAdmission, error)

	// Diet templates
	ListDietTemplates(activeOnly bool) ([]DietTemplateResponse, error)
	CreateDietTemplate(req CreateDietTemplateRequest, userID uuid.UUID) (*DietTemplateResponse, error)
	UpdateDietTemplate(id uuid.UUID, req UpdateDietTemplateRequest, userID uuid.UUID) (*DietTemplateResponse, error)
}

type service struct {
	repo Repository
	db   *gorm.DB
}

func NewService(repo Repository, db *gorm.DB) Service {
	return &service{repo: repo, db: db}
}

// kolkataLocation returns the hospital's canonical timezone (Asia/Kolkata),
// falling back to the fixed UTC+5:30 offset if the zone database is missing.
func kolkataLocation() *time.Location {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.FixedZone("IST", 5*3600+1800)
	}
	return loc
}

// todayInKolkata returns today's date (midnight) in hospital-local time.
func todayInKolkata() time.Time {
	now := time.Now().In(kolkataLocation())
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, kolkataLocation())
}

// currentAllocation resolves the active (open-ended) bed allocation of an
// admission. Returns nil when the admission has no live bed right now.
func currentAllocation(adm *models.Admission) *models.AdmissionBed {
	for i := range adm.BedHistory {
		if adm.BedHistory[i].ToDate == nil {
			return &adm.BedHistory[i]
		}
	}
	return nil
}

// ─── Diet Plans ───────────────────────────────────────────────────────────────

func (s *service) CreateDietPlan(req CreateDietPlanRequest, orderedByUserID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error) {
	admID, err := uuid.Parse(req.AdmissionID)
	if err != nil {
		return nil, errors.New("invalid admission_id")
	}
	patID, err := uuid.Parse(req.PatientID)
	if err != nil {
		return nil, errors.New("invalid patient_id")
	}
	if scope != nil && scope.DoctorID != nil {
		// Write-side ownership: a doctor may only prescribe diet for their own
		// admissions.
		if err := s.repo.DoctorOwnsAdmission(admID, *scope.DoctorID); err != nil {
			return nil, ErrNotFound
		}
	}
	sd, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date format, use YYYY-MM-DD")
	}
	ed, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end_date format, use YYYY-MM-DD")
	}

	if sd.After(ed) {
		return nil, errors.New("start_date must not be after end_date")
	}

	plan := &models.DietPlan{
		AdmissionID:         admID,
		PatientID:           patID,
		DietType:            req.DietType,
		Pathya:              req.Pathya,
		Apathya:             req.Apathya,
		SpecialInstructions: req.SpecialInstructions,
		StartDate:           sd,
		EndDate:             ed,
		IsActive:            true,
		OrderedByUserID:     orderedByUserID,
	}

	// Transactional consistency: deactivating the previous active plan and
	// creating the new one happen atomically — a partial failure can never
	// leave an admission with zero active plans.
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.DietPlan{}).
			Where("admission_id = ? AND is_active = ?", admID, true).
			Update("is_active", false).Error; err != nil {
			return err
		}
		return tx.Create(plan).Error
	}); err != nil {
		return nil, err
	}

	full, err := s.repo.GetDietPlan(plan.ID, nil)
	if err != nil {
		return nil, err
	}
	resp := DietPlanToResponse(*full)
	return &resp, nil
}

func (s *service) GetDietPlan(id uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error) {
	plan, err := s.repo.GetDietPlan(id, scope)
	if err != nil {
		return nil, ErrNotFound
	}
	resp := DietPlanToResponse(*plan)
	return &resp, nil
}

func (s *service) GetActiveDietPlan(admissionID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error) {
	plan, err := s.repo.GetActiveDietPlanForAdmission(admissionID, scope)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	resp := DietPlanToResponse(*plan)
	return &resp, nil
}

func (s *service) ListDietPlans(admissionID uuid.UUID, scope *models.DataScope) ([]DietPlanResponse, error) {
	plans, err := s.repo.ListDietPlansForAdmission(admissionID, scope)
	if err != nil {
		return nil, err
	}
	out := make([]DietPlanResponse, len(plans))
	for i, p := range plans {
		out[i] = DietPlanToResponse(p)
	}
	return out, nil
}

func (s *service) UpdateDietPlan(id uuid.UUID, req UpdateDietPlanRequest, userID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error) {
	plan, err := s.repo.GetDietPlan(id, scope)
	if err != nil {
		return nil, ErrNotFound
	}
	sd, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date format, use YYYY-MM-DD")
	}
	ed, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end_date format, use YYYY-MM-DD")
	}
	if sd.After(ed) {
		return nil, errors.New("start_date must not be after end_date")
	}

	plan.DietType = req.DietType
	plan.Pathya = req.Pathya
	plan.Apathya = req.Apathya
	plan.SpecialInstructions = req.SpecialInstructions
	plan.StartDate = sd
	plan.EndDate = ed

	if err := s.repo.UpdateDietPlan(plan); err != nil {
		return nil, err
	}
	full, err := s.repo.GetDietPlan(plan.ID, scope)
	if err != nil {
		return nil, err
	}
	resp := DietPlanToResponse(*full)
	return &resp, nil
}

func (s *service) RenewDietPlan(id uuid.UUID, req RenewDietPlanRequest, userID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error) {
	plan, err := s.repo.GetDietPlan(id, scope)
	if err != nil {
		return nil, ErrNotFound
	}
	if !plan.IsActive {
		return nil, errors.New("cannot renew an inactive diet plan")
	}
	ed, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end_date format, use YYYY-MM-DD")
	}
	if ed.Before(plan.EndDate) {
		return nil, errors.New("renewal end_date must not be before the current end_date")
	}
	plan.EndDate = ed
	if err := s.repo.UpdateDietPlan(plan); err != nil {
		return nil, err
	}
	full, err := s.repo.GetDietPlan(plan.ID, scope)
	if err != nil {
		return nil, err
	}
	resp := DietPlanToResponse(*full)
	return &resp, nil
}

func (s *service) CancelDietPlan(id uuid.UUID, userID uuid.UUID, req CancelDietPlanRequest, scope *models.DataScope) error {
	plan, err := s.repo.GetDietPlan(id, scope)
	if err != nil {
		return ErrNotFound
	}
	if !plan.IsActive {
		return nil // idempotent — already cancelled/deactivated
	}
	now := time.Now()
	plan.IsActive = false
	plan.CancelledByUserID = &userID
	plan.CancelledAt = &now
	plan.CancellationReason = req.Reason
	return s.repo.UpdateDietPlan(plan)
}

// ─── Daily Meal Generation ───────────────────────────────────────────────────

func (s *service) GenerateDailyMeals(t time.Time) (int, error) {
	// Find all active admissions
	admissions, err := s.repo.GetActiveIPDAdmissions(t)
	if err != nil {
		return 0, err
	}

	mealsGenerated := 0
	mealsList := []models.MealOrder{}

	for _, adm := range admissions {
		// Find active diet plan
		plan, err := s.repo.GetActiveDietPlanForAdmission(adm.ID, nil)
		if err != nil {
			// No active diet plan, skip
			continue
		}

		// Ensure date is within diet validity range
		dateTrunc := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		if dateTrunc.Before(plan.StartDate) || dateTrunc.After(plan.EndDate) {
			continue
		}

		// Resolve current active BedHistory allocation for Ward/Bed reference snapshot
		activeAlloc := currentAllocation(&adm)
		if activeAlloc == nil || activeAlloc.Bed.WardID == uuid.Nil {
			// Patient is admitted but not currently allocated to a bed/ward, skip
			continue
		}

		// Prepare 4 standard meals; carry the plan's kitchen-facing notes so
		// the kitchen sheet shows meal-level instructions without an extra lookup.
		mealTypes := []string{models.MealTypeBreakfast, models.MealTypeLunch, models.MealTypeDinner, models.MealTypeSnacks}
		for _, mt := range mealTypes {
			mealsList = append(mealsList, models.MealOrder{
				DietPlanID:           plan.ID,
				AdmissionID:          adm.ID,
				PatientID:            adm.PatientID,
				WardID:               activeAlloc.Bed.WardID,
				BedID:                activeAlloc.BedID,
				MealType:             mt,
				ScheduledDate:        dateTrunc,
				Status:               models.MealStatusPending,
				SpecialInstructions:  plan.SpecialInstructions,
			})
		}
	}

	if len(mealsList) > 0 {
		created, err := s.repo.CreateMealOrders(mealsList)
		if err != nil {
			return 0, err
		}
		mealsGenerated = created
	}

	return mealsGenerated, nil
}

// ─── Kitchen dashboard sheet ──────────────────────────────────────────────────

func (s *service) GetKitchenSheet(f KitchenSheetFilter) ([]MealOrderResponse, error) {
	orders, err := s.repo.GetMealOrdersByFilter(f)
	if err != nil {
		return nil, err
	}

	out := make([]MealOrderResponse, 0, len(orders))
	for _, o := range orders {
		resp, err := s.toMealOrderResponse(o)
		if err != nil {
			continue
		}
		out = append(out, *resp)
	}
	return out, nil
}

// toMealOrderResponse hydrates a MealOrder row with patient, ward/bed, diet
// plan and user display names. It also surfaces the patient's allergy /
// chronic-disease flags so the kitchen sheet can highlight at-risk meals.
// When the service has no DB handle (unit tests), a bare response is built.
func (s *service) toMealOrderResponse(o models.MealOrder) (*MealOrderResponse, error) {
	resp := &MealOrderResponse{
		ID:            o.ID,
		DietPlanID:    o.DietPlanID,
		AdmissionID:   o.AdmissionID,
		PatientID:     o.PatientID,
		MealType:      o.MealType,
		ScheduledDate: o.ScheduledDate,
		Status:        o.Status,
		PreparedAt:    o.PreparedAt,
		ReadyAt:       o.ReadyAt,
		ServedAt:      o.ServedAt,
		Remarks:       o.Remarks,
		SpecialInstr:  o.SpecialInstructions,
		CancelledAt:   o.CancelledAt,
		CancellationReason: o.CancellationReason,
	}
	if s.db == nil {
		return resp, nil
	}

	var patient models.Patient
	var ward models.Ward
	var bed models.Bed
	var diet models.DietPlan

	s.db.First(&patient, "id = ?", o.PatientID)
	s.db.First(&ward, "id = ?", o.WardID)
	s.db.First(&bed, "id = ?", o.BedID)
	s.db.First(&diet, "id = ?", o.DietPlanID)

	var prepUser, readyUser, serveUser, cancelUser models.User
	if o.PreparedBy != nil {
		s.db.First(&prepUser, "id = ?", *o.PreparedBy)
	}
	if o.ReadyBy != nil {
		s.db.First(&readyUser, "id = ?", *o.ReadyBy)
	}
	if o.ServedBy != nil {
		s.db.First(&serveUser, "id = ?", *o.ServedBy)
	}
	if o.CancelledByUserID != nil {
		s.db.First(&cancelUser, "id = ?", *o.CancelledByUserID)
	}

	specialInstr := o.SpecialInstructions
	if specialInstr == "" {
		specialInstr = diet.SpecialInstructions
	}

	resp.PatientName = patient.FullName
	resp.PatientUHID = patient.UHID
	resp.WardName = ward.Name
	resp.BedNo = bed.BedNo
	resp.DietType = diet.DietType
	resp.Pathya = diet.Pathya
	resp.Apathya = diet.Apathya
	resp.SpecialInstr = specialInstr
	resp.PatientAllergies = patient.Allergies
	resp.PatientChronicDiseases = patient.ChronicDiseases
	resp.PreparedBy = prepUser.FullName
	resp.ReadyBy = readyUser.FullName
	resp.ServedBy = serveUser.FullName
	resp.CancelledBy = cancelUser.FullName
	return resp, nil
}

// CreateManualMeal creates a single meal order on demand (kitchen can add a
// meal that was not auto-generated). Requires an admitted admission with an
// active diet plan and a live bed allocation.
func (s *service) CreateManualMeal(req CreateManualMealRequest, userID uuid.UUID) (*MealOrderResponse, error) {
	admID, err := uuid.Parse(req.AdmissionID)
	if err != nil {
		return nil, errors.New("invalid admission_id")
	}
	if !models.ValidMealTypes[req.MealType] {
		return nil, ErrInvalidMealType
	}
	date, err := parseMealDate(req.ScheduledDate)
	if err != nil {
		return nil, err
	}

	adm, err := s.repo.GetAdmissionForMeal(admID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	plan, err := s.repo.GetActiveDietPlanForAdmission(admID, nil)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNoActiveDietPlan
		}
		return nil, err
	}
	if date.Before(plan.StartDate) || date.After(plan.EndDate) {
		return nil, fmt.Errorf("scheduled date %s is outside the active diet plan validity (plan end: %s)",
			date.Format("2006-01-02"), plan.EndDate.Format("2006-01-02"))
	}

	activeAlloc := currentAllocation(adm)
	if activeAlloc == nil || activeAlloc.Bed.WardID == uuid.Nil {
		return nil, errors.New("admission is not currently allocated to a bed")
	}

	meal := &models.MealOrder{
		DietPlanID:           plan.ID,
		AdmissionID:          adm.ID,
		PatientID:            adm.PatientID,
		WardID:               activeAlloc.Bed.WardID,
		BedID:                activeAlloc.BedID,
		MealType:             req.MealType,
		ScheduledDate:        date,
		Status:               models.MealStatusPending,
		SpecialInstructions:  req.SpecialInstructions,
	}
	if meal.SpecialInstructions == "" {
		meal.SpecialInstructions = plan.SpecialInstructions
	}

	if err := s.repo.CreateMealOrder(meal); err != nil {
		return nil, err
	}
	return s.toMealOrderResponse(*meal)
}

// parseMealDate parses a YYYY-MM-DD date, defaulting to today (Asia/Kolkata).
func parseMealDate(raw string) (time.Time, error) {
	if raw == "" {
		return todayInKolkata(), nil
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return time.Time{}, errors.New("invalid scheduled_date format, use YYYY-MM-DD")
	}
	return t, nil
}

// CancelMeal soft-cancels a PENDING meal with a mandatory reason. Once a meal
// has started (PREPARING) or is READY it can no longer be cancelled.
func (s *service) CancelMeal(id uuid.UUID, userID uuid.UUID, req CancelMealRequest) error {
	meal, err := s.repo.GetMealOrder(id)
	if err != nil {
		return ErrNotFound
	}
	if meal.Status != models.MealStatusPending {
		return fmt.Errorf("%w: cannot cancel a %s meal (only PENDING meals can be cancelled)", ErrInvalidTransition, meal.Status)
	}
	if strings.TrimSpace(req.Reason) == "" {
		return errors.New("cancellation reason is required")
	}
	now := time.Now()
	meal.Status = models.MealStatusCancelled
	meal.CancelledByUserID = &userID
	meal.CancelledAt = &now
	meal.CancellationReason = req.Reason
	return s.repo.UpdateMealOrder(meal)
}

// ─── Kitchen helpers ──────────────────────────────────────────────────────────

func (s *service) GetWardsForKitchen() ([]WardOption, error) {
	return s.repo.GetWardsForKitchen()
}

func (s *service) GetKitchenAdmissions() ([]KitchenAdmission, error) {
	admissions, err := s.repo.GetKitchenAdmissions()
	if err != nil {
		return nil, err
	}
	out := make([]KitchenAdmission, 0, len(admissions))
	for _, adm := range admissions {
		alloc := currentAllocation(&adm)
		if alloc == nil {
			continue
		}
		plan, err := s.repo.GetActiveDietPlanForAdmission(adm.ID, nil)
		if err != nil {
			continue
		}
		out = append(out, KitchenAdmission{
			AdmissionID:  adm.ID,
			AdmissionNo:  adm.AdmissionNo,
			PatientID:    adm.PatientID,
			PatientName:  adm.Patient.FullName,
			PatientUHID:  adm.Patient.UHID,
			WardID:       alloc.Bed.WardID,
			WardName:     alloc.Bed.Ward.Name,
			BedNo:        alloc.Bed.BedNo,
			DietPlanID:   plan.ID,
			DietType:     plan.DietType,
			SpecialInstr: plan.SpecialInstructions,
			Pathya:       plan.Pathya,
			Apathya:      plan.Apathya,
		})
	}
	return out, nil
}

// ─── Diet Templates ───────────────────────────────────────────────────────────

func (s *service) ListDietTemplates(activeOnly bool) ([]DietTemplateResponse, error) {
	templates, err := s.repo.ListDietTemplates(activeOnly)
	if err != nil {
		return nil, err
	}
	out := make([]DietTemplateResponse, len(templates))
	for i, t := range templates {
		out[i] = dietTemplateToResponse(t)
	}
	return out, nil
}

func (s *service) CreateDietTemplate(req CreateDietTemplateRequest, userID uuid.UUID) (*DietTemplateResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("template name is required")
	}
	t := &models.DietTemplate{
		Name:                name,
		Pathya:              req.Pathya,
		Apathya:             req.Apathya,
		SpecialInstructions: req.SpecialInstructions,
		IsActive:            true,
		CreatedByUserID:     userID,
	}
	if err := s.repo.CreateDietTemplate(t); err != nil {
		return nil, err
	}
	resp := dietTemplateToResponse(*t)
	return &resp, nil
}

func (s *service) UpdateDietTemplate(id uuid.UUID, req UpdateDietTemplateRequest, userID uuid.UUID) (*DietTemplateResponse, error) {
	t, err := s.repo.GetDietTemplate(id)
	if err != nil {
		return nil, ErrNotFound
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("template name is required")
	}
	t.Name = name
	t.Pathya = req.Pathya
	t.Apathya = req.Apathya
	t.SpecialInstructions = req.SpecialInstructions
	if req.IsActive != nil {
		t.IsActive = *req.IsActive
	}
	if err := s.repo.UpdateDietTemplate(t); err != nil {
		return nil, err
	}
	resp := dietTemplateToResponse(*t)
	return &resp, nil
}

func dietTemplateToResponse(t models.DietTemplate) DietTemplateResponse {
	return DietTemplateResponse{
		ID:                  t.ID,
		Name:                t.Name,
		Pathya:              t.Pathya,
		Apathya:             t.Apathya,
		SpecialInstructions: t.SpecialInstructions,
		IsActive:            t.IsActive,
		CreatedByName:       t.CreatedByUser.FullName,
		CreatedAt:           t.CreatedAt,
	}
}

// ─── Status updates and transition logic ──────────────────────────────────────

func (s *service) UpdateMealStatus(mealID uuid.UUID, userID uuid.UUID, req UpdateMealStatusRequest) error {
	meal, err := s.repo.GetMealOrder(mealID)
	if err != nil {
		return ErrNotFound
	}

	// Guard idempotent checks
	if meal.Status == req.Status {
		return nil
	}

	now := time.Now()
	// Strict State Machine:
	//   PENDING → PREPARING → READY → SERVED
	//   PENDING/PREPARING → HELD → PENDING (reopen)
	// Cancellation is a dedicated endpoint (CancelMeal) and only from PENDING.
	switch req.Status {
	case models.MealStatusPreparing:
		if meal.Status != models.MealStatusPending {
			return fmt.Errorf("%w: cannot transition from %s to PREPARING", ErrInvalidTransition, meal.Status)
		}
		meal.Status = models.MealStatusPreparing
		meal.PreparedAt = &now
		meal.PreparedBy = &userID

	case models.MealStatusReady:
		if meal.Status != models.MealStatusPreparing {
			return fmt.Errorf("%w: cannot transition from %s to READY (must be PREPARING first)", ErrInvalidTransition, meal.Status)
		}
		meal.Status = models.MealStatusReady
		meal.ReadyAt = &now
		meal.ReadyBy = &userID

	case models.MealStatusServed:
		if meal.Status != models.MealStatusReady {
			return fmt.Errorf("%w: cannot transition from %s to SERVED (must be READY first)", ErrInvalidTransition, meal.Status)
		}
		meal.Status = models.MealStatusServed
		meal.ServedAt = &now
		meal.ServedBy = &userID

	case models.MealStatusHeld:
		if meal.Status != models.MealStatusPending && meal.Status != models.MealStatusPreparing {
			return fmt.Errorf("%w: cannot hold a meal in %s (only PENDING or PREPARING meals can be held)", ErrInvalidTransition, meal.Status)
		}
		meal.Status = models.MealStatusHeld

	case models.MealStatusPending:
		// Reopen a held meal back into the queue.
		if meal.Status != models.MealStatusHeld {
			return fmt.Errorf("%w: cannot reopen a %s meal (only HELD meals can be reopened)", ErrInvalidTransition, meal.Status)
		}
		meal.Status = models.MealStatusPending
		meal.PreparedAt = nil
		meal.PreparedBy = nil
		meal.ReadyAt = nil
		meal.ReadyBy = nil

	default:
		return fmt.Errorf("%w: unknown status %s", ErrInvalidTransition, req.Status)
	}

	if req.Remarks != "" {
		meal.Remarks = req.Remarks
	}

	return s.repo.UpdateMealOrder(meal)
}
