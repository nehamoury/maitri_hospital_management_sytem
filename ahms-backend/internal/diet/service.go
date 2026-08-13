package diet

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrNotFound          = errors.New("not found")
	ErrInvalidTransition = errors.New("invalid meal status transition")
	ErrDuplicateMeal     = errors.New("meal order already exists for this date")
)

type Service interface {
	CreateDietPlan(req CreateDietPlanRequest, orderedByUserID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	GetDietPlan(id uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	GetActiveDietPlan(admissionID uuid.UUID, scope *models.DataScope) (*DietPlanResponse, error)
	ListDietPlans(admissionID uuid.UUID, scope *models.DataScope) ([]DietPlanResponse, error)
	CancelDietPlan(id uuid.UUID, scope *models.DataScope) error

	// Daily generation and operations
	GenerateDailyMeals(t time.Time) (int, error)
	GetKitchenSheet(f KitchenSheetFilter) ([]MealOrderResponse, error)
	UpdateMealStatus(mealID uuid.UUID, userID uuid.UUID, req UpdateMealStatusRequest) error
}

type service struct {
	repo Repository
	db   *gorm.DB
}

func NewService(repo Repository, db *gorm.DB) Service {
	return &service{repo: repo, db: db}
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

	// Deactivate any currently active plans for this admission
	if err := s.repo.DeactivatePlansForAdmission(admID); err != nil {
		return nil, err
	}

	if err := s.repo.CreateDietPlan(plan); err != nil {
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

func (s *service) CancelDietPlan(id uuid.UUID, scope *models.DataScope) error {
	plan, err := s.repo.GetDietPlan(id, scope)
	if err != nil {
		return ErrNotFound
	}
	plan.IsActive = false
	return s.db.Save(plan).Error
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
		var activeAlloc *models.AdmissionBed
		for i := range adm.BedHistory {
			if adm.BedHistory[i].ToDate == nil {
				activeAlloc = &adm.BedHistory[i]
				break
			}
		}
		if activeAlloc == nil || activeAlloc.Bed.WardID == uuid.Nil {
			// Patient is admitted but not currently allocated to a bed/ward, skip
			continue
		}

		// Prepare 4 standard meals
		mealTypes := []string{models.MealTypeBreakfast, models.MealTypeLunch, models.MealTypeDinner, models.MealTypeSnacks}
		for _, mt := range mealTypes {
			mealsList = append(mealsList, models.MealOrder{
				DietPlanID:    plan.ID,
				AdmissionID:   adm.ID,
				PatientID:     adm.PatientID,
				WardID:        activeAlloc.Bed.WardID,
				BedID:         activeAlloc.BedID,
				MealType:      mt,
				ScheduledDate: dateTrunc,
				Status:        models.MealStatusPending,
			})
		}
	}

	if len(mealsList) > 0 {
		if err := s.repo.CreateMealOrders(mealsList); err != nil {
			return 0, err
		}
		mealsGenerated = len(mealsList)
	}

	return mealsGenerated, nil
}

// ─── Kitchen dashboard sheet ──────────────────────────────────────────────────

func (s *service) GetKitchenSheet(f KitchenSheetFilter) ([]MealOrderResponse, error) {
	orders, err := s.repo.GetMealOrdersByFilter(f)
	if err != nil {
		return nil, err
	}

	out := []MealOrderResponse{}
	for _, o := range orders {
		// Preload patient and ward/bed details manually or load them
		var patient models.Patient
		var ward models.Ward
		var bed models.Bed
		var diet models.DietPlan

		s.db.First(&patient, "id = ?", o.PatientID)
		s.db.First(&ward, "id = ?", o.WardID)
		s.db.First(&bed, "id = ?", o.BedID)
		s.db.First(&diet, "id = ?", o.DietPlanID)

		var prepUser models.User
		var serveUser models.User
		if o.PreparedBy != nil {
			s.db.First(&prepUser, "id = ?", *o.PreparedBy)
		}
		if o.ServedBy != nil {
			s.db.First(&serveUser, "id = ?", *o.ServedBy)
		}

		out = append(out, MealOrderResponse{
			ID:            o.ID,
			DietPlanID:    o.DietPlanID,
			AdmissionID:   o.AdmissionID,
			PatientID:     o.PatientID,
			PatientName:   patient.FullName,
			PatientUHID:   patient.UHID,
			WardName:      ward.Name,
			BedNo:         bed.BedNo,
			MealType:      o.MealType,
			ScheduledDate: o.ScheduledDate,
			Status:        o.Status,
			PreparedAt:    o.PreparedAt,
			PreparedBy:    prepUser.FullName,
			ServedAt:      o.ServedAt,
			ServedBy:      serveUser.FullName,
			Remarks:       o.Remarks,
			DietType:      diet.DietType,
			Pathya:        diet.Pathya,
			Apathya:       diet.Apathya,
			SpecialInstr:  diet.SpecialInstructions,
		})
	}
	return out, nil
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
	// Strict State Machine: PENDING -> PREPARED -> SERVED (or PENDING/PREPARED -> HELD)
	switch req.Status {
	case models.MealStatusPrepared:
		if meal.Status != models.MealStatusPending && meal.Status != models.MealStatusHeld {
			return fmt.Errorf("%w: cannot transition from %s to PREPARED", ErrInvalidTransition, meal.Status)
		}
		meal.Status = models.MealStatusPrepared
		meal.PreparedAt = &now
		meal.PreparedBy = &userID

	case models.MealStatusServed:
		if meal.Status != models.MealStatusPrepared {
			return fmt.Errorf("%w: cannot transition from %s to SERVED (must be PREPARED first)", ErrInvalidTransition, meal.Status)
		}
		meal.Status = models.MealStatusServed
		meal.ServedAt = &now
		meal.ServedBy = &userID

	case models.MealStatusHeld:
		if meal.Status == models.MealStatusServed {
			return fmt.Errorf("%w: cannot hold already SERVED meal", ErrInvalidTransition)
		}
		meal.Status = models.MealStatusHeld

	default:
		return fmt.Errorf("%w: unknown status %s", ErrInvalidTransition, req.Status)
	}

	if req.Remarks != "" {
		meal.Remarks = req.Remarks
	}

	return s.repo.UpdateMealOrder(meal)
}
