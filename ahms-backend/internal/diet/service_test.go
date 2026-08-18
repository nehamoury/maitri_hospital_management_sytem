package diet

import (
	"errors"
	"testing"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// fakeRepo is an in-memory Repository used to test the diet service layer
// without a database.
type fakeRepo struct {
	plans    map[uuid.UUID]*models.DietPlan
	meals    map[uuid.UUID]*models.MealOrder
	admis    map[uuid.UUID]*models.Admission
	templates map[uuid.UUID]*models.DietTemplate
	admToPlan map[uuid.UUID]uuid.UUID // admission -> active plan
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		plans:     map[uuid.UUID]*models.DietPlan{},
		meals:     map[uuid.UUID]*models.MealOrder{},
		admis:     map[uuid.UUID]*models.Admission{},
		templates: map[uuid.UUID]*models.DietTemplate{},
		admToPlan: map[uuid.UUID]uuid.UUID{},
	}
}

func (f *fakeRepo) CreateDietPlan(plan *models.DietPlan) error {
	plan.ID = uuid.New()
	f.plans[plan.ID] = plan
	return nil
}

func (f *fakeRepo) GetDietPlan(id uuid.UUID, _ *models.DataScope) (*models.DietPlan, error) {
	p, ok := f.plans[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return p, nil
}

func (f *fakeRepo) GetActiveDietPlanForAdmission(admissionID uuid.UUID, _ *models.DataScope) (*models.DietPlan, error) {
	for _, p := range f.plans {
		if p.AdmissionID == admissionID && p.IsActive {
			return p, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (f *fakeRepo) ListDietPlansForAdmission(admissionID uuid.UUID, _ *models.DataScope) ([]models.DietPlan, error) {
	var out []models.DietPlan
	for _, p := range f.plans {
		if p.AdmissionID == admissionID {
			out = append(out, *p)
		}
	}
	return out, nil
}

func (f *fakeRepo) DeactivatePlansForAdmission(admissionID uuid.UUID) error {
	for _, p := range f.plans {
		if p.AdmissionID == admissionID {
			p.IsActive = false
		}
	}
	return nil
}

func (f *fakeRepo) UpdateDietPlan(plan *models.DietPlan) error {
	if _, ok := f.plans[plan.ID]; !ok {
		return ErrNotFound
	}
	f.plans[plan.ID] = plan
	return nil
}

func (f *fakeRepo) DoctorOwnsAdmission(admissionID, doctorID uuid.UUID) error {
	a, ok := f.admis[admissionID]
	if !ok || a.DoctorID != doctorID {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (f *fakeRepo) CreateMealOrders(meals []models.MealOrder) (int, error) {
	created := 0
	for i := range meals {
		duplicate := false
		for _, m := range f.meals {
			if m.AdmissionID == meals[i].AdmissionID &&
				m.ScheduledDate.Equal(meals[i].ScheduledDate) &&
				m.MealType == meals[i].MealType {
				duplicate = true
				break
			}
		}
		if duplicate {
			continue // idempotent bulk generation: skip existing (mirrors repo)
		}
		meals[i].ID = uuid.New()
		cp := meals[i]
		f.meals[cp.ID] = &cp
		created++
	}
	return created, nil
}

func (f *fakeRepo) CreateMealOrder(meal *models.MealOrder) error {
	for _, m := range f.meals {
		if m.AdmissionID == meal.AdmissionID &&
			m.ScheduledDate.Equal(meal.ScheduledDate) &&
			m.MealType == meal.MealType {
			return ErrDuplicateMeal
		}
	}
	meal.ID = uuid.New()
	cp := *meal
	f.meals[cp.ID] = &cp
	return nil
}

func (f *fakeRepo) GetMealOrder(id uuid.UUID) (*models.MealOrder, error) {
	m, ok := f.meals[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return m, nil
}

func (f *fakeRepo) UpdateMealOrder(meal *models.MealOrder) error {
	if _, ok := f.meals[meal.ID]; !ok {
		return ErrNotFound
	}
	f.meals[meal.ID] = meal
	return nil
}

func (f *fakeRepo) GetMealOrdersByFilter(f2 KitchenSheetFilter) ([]models.MealOrder, error) {
	var out []models.MealOrder
	for _, m := range f.meals {
		out = append(out, *m)
	}
	return out, nil
}

func (f *fakeRepo) GetActiveIPDAdmissions(t time.Time) ([]models.Admission, error) {
	var out []models.Admission
	for _, a := range f.admis {
		if a.Status == models.AdmissionAdmitted {
			out = append(out, *a)
		}
	}
	return out, nil
}

func (f *fakeRepo) GetAdmissionForMeal(admissionID uuid.UUID) (*models.Admission, error) {
	a, ok := f.admis[admissionID]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return a, nil
}

func (f *fakeRepo) GetWardsForKitchen() ([]WardOption, error) { return nil, nil }

func (f *fakeRepo) GetKitchenAdmissions() ([]models.Admission, error) {
	var out []models.Admission
	for _, a := range f.admis {
		out = append(out, *a)
	}
	return out, nil
}

func (f *fakeRepo) ListDietTemplates(activeOnly bool) ([]models.DietTemplate, error) {
	var out []models.DietTemplate
	for _, t := range f.templates {
		if activeOnly && !t.IsActive {
			continue
		}
		out = append(out, *t)
	}
	return out, nil
}

func (f *fakeRepo) GetDietTemplate(id uuid.UUID) (*models.DietTemplate, error) {
	t, ok := f.templates[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return t, nil
}

func (f *fakeRepo) CreateDietTemplate(t *models.DietTemplate) error {
	t.ID = uuid.New()
	f.templates[t.ID] = t
	return nil
}

func (f *fakeRepo) UpdateDietTemplate(t *models.DietTemplate) error {
	if _, ok := f.templates[t.ID]; !ok {
		return ErrNotFound
	}
	f.templates[t.ID] = t
	return nil
}

// seedActiveAdmission creates an admitted admission with an open bed
// allocation and returns its id.
func seedActiveAdmission(f *fakeRepo) uuid.UUID {
	admID := uuid.New()
	bedID := uuid.New()
	wardID := uuid.New()
	now := time.Now()
	adm := &models.Admission{
		BaseModel:     models.BaseModel{ID: admID},
		PatientID:     uuid.New(),
		Patient:       models.Patient{BaseModel: models.BaseModel{ID: uuid.New()}, FullName: "Test Patient", UHID: "MCAH-2026-000001"},
		AdmissionDate: now,
		Status:        models.AdmissionAdmitted,
		BedHistory: []models.AdmissionBed{
			{BaseModel: models.BaseModel{ID: uuid.New()}, BedID: bedID, FromDate: now, Bed: models.Bed{BaseModel: models.BaseModel{ID: bedID}, WardID: wardID, BedNo: "G1"}},
		},
	}
	f.admis[admID] = adm
	return admID
}

func seedActivePlan(f *fakeRepo, admID uuid.UUID) uuid.UUID {
	now := time.Now()
	plan := &models.DietPlan{
		AdmissionID:         admID,
		PatientID:           f.admis[admID].PatientID,
		DietType:            "Laghu Ahar",
		Pathya:              "Warm khichdi",
		SpecialInstructions: "Serve warm",
		StartDate:           now.AddDate(0, 0, -1),
		EndDate:             now.AddDate(0, 0, 7),
		IsActive:            true,
		OrderedByUserID:     uuid.New(),
	}
	if err := f.CreateDietPlan(plan); err != nil {
		panic(err)
	}
	f.admToPlan[admID] = plan.ID
	return plan.ID
}

func seedMeal(f *fakeRepo, admID uuid.UUID, status string) uuid.UUID {
	meal := &models.MealOrder{
		AdmissionID:   admID,
		PatientID:     f.admis[admID].PatientID,
		WardID:        uuid.New(),
		BedID:         uuid.New(),
		MealType:      models.MealTypeBreakfast,
		ScheduledDate: time.Now(),
		Status:        status,
	}
	if err := f.CreateMealOrder(meal); err != nil {
		panic(err)
	}
	return meal.ID
}

func newTestService() (*service, *fakeRepo) {
	f := newFakeRepo()
	return &service{repo: f}, f
}

// ─── Status transition (FSM) tests ───────────────────────────────────────────

func TestMealStatusFSM(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	mealID := seedMeal(f, admID, models.MealStatusPending)
	user := uuid.New()

	cases := []struct {
		name   string
		from   string
		to     string
		expect error
	}{
		{"pending to preparing", models.MealStatusPending, models.MealStatusPreparing, nil},
		{"pending to ready (skip preparing)", models.MealStatusPending, models.MealStatusReady, ErrInvalidTransition},
		{"pending to served (skip preparing+ready)", models.MealStatusPending, models.MealStatusServed, ErrInvalidTransition},
		{"pending to held", models.MealStatusPending, models.MealStatusHeld, nil},
		{"held to pending (reopen)", models.MealStatusHeld, models.MealStatusPending, nil},
		{"preparing to ready", models.MealStatusPreparing, models.MealStatusReady, nil},
		{"preparing to held", models.MealStatusPreparing, models.MealStatusHeld, nil},
		{"ready to served", models.MealStatusReady, models.MealStatusServed, nil},
		{"ready to held", models.MealStatusReady, models.MealStatusHeld, ErrInvalidTransition},
		{"served to anything", models.MealStatusServed, models.MealStatusPending, ErrInvalidTransition},
		{"held to ready (no prepare step)", models.MealStatusHeld, models.MealStatusReady, ErrInvalidTransition},
		{"unknown status", models.MealStatusPending, "INVALID", ErrInvalidTransition},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			f.meals[mealID].Status = tc.from
			err := s.UpdateMealStatus(mealID, user, UpdateMealStatusRequest{Status: tc.to})
			if tc.expect == nil {
				if err != nil {
					t.Fatalf("expected transition %s→%s to succeed, got %v", tc.from, tc.to, err)
				}
				return
			}
			if !errors.Is(err, tc.expect) {
				t.Fatalf("expected %v for %s→%s, got %v", tc.expect, tc.from, tc.to, err)
			}
		})
	}
}

func TestMealStatusPreparingRecordsUser(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	mealID := seedMeal(f, admID, models.MealStatusPending)
	user := uuid.New()

	if err := s.UpdateMealStatus(mealID, user, UpdateMealStatusRequest{Status: models.MealStatusPreparing}); err != nil {
		t.Fatalf("preparing failed: %v", err)
	}
	meal, _ := f.GetMealOrder(mealID)
	if meal.PreparedBy == nil || *meal.PreparedBy != user {
		t.Fatal("PreparedBy should record the acting user")
	}
	if meal.PreparedAt == nil {
		t.Fatal("PreparedAt should be set")
	}
}

func TestMealStatusIdempotent(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	mealID := seedMeal(f, admID, models.MealStatusServed)
	user := uuid.New()

	if err := s.UpdateMealStatus(mealID, user, UpdateMealStatusRequest{Status: models.MealStatusServed}); err != nil {
		t.Fatalf("same-status update should be a no-op, got %v", err)
	}
}

// ─── Meal cancellation tests ──────────────────────────────────────────────────

func TestCancelMealPendingOK(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	mealID := seedMeal(f, admID, models.MealStatusPending)
	user := uuid.New()

	if err := s.CancelMeal(mealID, user, CancelMealRequest{Reason: "NPO before procedure"}); err != nil {
		t.Fatalf("cancel failed: %v", err)
	}
	meal, _ := f.GetMealOrder(mealID)
	if meal.Status != models.MealStatusCancelled {
		t.Fatalf("expected CANCELLED, got %s", meal.Status)
	}
	if meal.CancelledByUserID == nil || *meal.CancelledByUserID != user {
		t.Fatal("cancelled_by_user_id should be recorded")
	}
	if meal.CancelledAt == nil {
		t.Fatal("cancelled_at should be set")
	}
	if meal.CancellationReason != "NPO before procedure" {
		t.Fatalf("expected reason to persist, got %q", meal.CancellationReason)
	}
}

func TestCancelMealOnlyFromPending(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	mealID := seedMeal(f, admID, models.MealStatusPreparing)

	err := s.CancelMeal(mealID, uuid.New(), CancelMealRequest{Reason: "wrong"} )
	if !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("expected ErrInvalidTransition for PREPARING cancel, got %v", err)
	}
}

func TestCancelMealRequiresReason(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	mealID := seedMeal(f, admID, models.MealStatusPending)

	if err := s.CancelMeal(mealID, uuid.New(), CancelMealRequest{Reason: "  "}); err == nil {
		t.Fatal("expected error when reason is blank")
	}
}

// ─── Manual meal creation tests ───────────────────────────────────────────────

func TestCreateManualMealInvalidType(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	seedActivePlan(f, admID)

	_, err := s.CreateManualMeal(CreateManualMealRequest{AdmissionID: admID.String(), MealType: "MIDNIGHT"}, uuid.New())
	if !errors.Is(err, ErrInvalidMealType) {
		t.Fatalf("expected ErrInvalidMealType, got %v", err)
	}
}

func TestCreateManualMealNoActivePlan(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f) // no plan

	_, err := s.CreateManualMeal(CreateManualMealRequest{AdmissionID: admID.String(), MealType: models.MealTypeLunch}, uuid.New())
	if !errors.Is(err, ErrNoActiveDietPlan) {
		t.Fatalf("expected ErrNoActiveDietPlan, got %v", err)
	}
}

func TestCreateManualMealDuplicate(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	seedActivePlan(f, admID)

	req := CreateManualMealRequest{AdmissionID: admID.String(), MealType: models.MealTypeLunch}
	if _, err := s.CreateManualMeal(req, uuid.New()); err != nil {
		t.Fatalf("first create failed: %v", err)
	}
	_, err := s.CreateManualMeal(req, uuid.New())
	if !errors.Is(err, ErrDuplicateMeal) {
		t.Fatalf("expected ErrDuplicateMeal, got %v", err)
	}
}

// ─── Daily generation idempotency ─────────────────────────────────────────────

func TestGenerateDailyMealsIdempotent(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	seedActivePlan(f, admID)
	day := time.Now()

	count1, err := s.GenerateDailyMeals(day)
	if err != nil {
		t.Fatalf("first generation failed: %v", err)
	}
	if count1 != 4 {
		t.Fatalf("expected 4 meals (4 types) on first run, got %d", count1)
	}

	count2, err := s.GenerateDailyMeals(day)
	if err != nil {
		t.Fatalf("second generation failed: %v", err)
	}
	if count2 != 0 {
		t.Fatalf("expected 0 new meals on second run (idempotent), got %d", count2)
	}
}

func TestGenerateDailyMealsCopiesInstructions(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	seedActivePlan(f, admID)
	day := time.Now()

	if _, err := s.GenerateDailyMeals(day); err != nil {
		t.Fatalf("generation failed: %v", err)
	}
	for _, m := range f.meals {
		if m.ScheduledDate.Format("2006-01-02") != day.Format("2006-01-02") {
			continue
		}
		if m.SpecialInstructions != "Serve warm" {
			t.Fatalf("expected plan instructions copied to meal, got %q", m.SpecialInstructions)
		}
	}
}

// ─── Plan edit / renew / cancel ───────────────────────────────────────────────

func TestUpdateDietPlan(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	planID := seedActivePlan(f, admID)

	updated, err := s.UpdateDietPlan(planID, UpdateDietPlanRequest{
		DietType: "Peyadi",
		Pathya:   "Rice peya",
		StartDate: time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
		EndDate:   time.Now().AddDate(0, 0, 3).Format("2006-01-02"),
	}, uuid.New(), nil)
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated.DietType != "Peyadi" || updated.Pathya != "Rice peya" {
		t.Fatal("plan fields not updated")
	}
}

func TestUpdateDietPlanBadDates(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	planID := seedActivePlan(f, admID)

	_, err := s.UpdateDietPlan(planID, UpdateDietPlanRequest{
		DietType:  "Peyadi",
		StartDate: "2026-02-10",
		EndDate:   "2026-02-01", // before start
	}, uuid.New(), nil)
	if err == nil {
		t.Fatal("expected error for end before start")
	}
}

func TestRenewDietPlan(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	planID := seedActivePlan(f, admID)
	plan, _ := f.GetDietPlan(planID, nil)
	oldEnd := plan.EndDate

	newEnd := oldEnd.AddDate(0, 0, 14)
	if _, err := s.RenewDietPlan(planID, RenewDietPlanRequest{EndDate: newEnd.Format("2006-01-02")}, uuid.New(), nil); err != nil {
		t.Fatalf("renew failed: %v", err)
	}
	plan, _ = f.GetDietPlan(planID, nil)
	if !plan.EndDate.After(oldEnd) {
		t.Fatal("end date should extend after renewal")
	}
}

func TestCancelDietPlanRecordsAudit(t *testing.T) {
	s, f := newTestService()
	admID := seedActiveAdmission(f)
	planID := seedActivePlan(f, admID)
	user := uuid.New()

	if err := s.CancelDietPlan(planID, user, CancelDietPlanRequest{Reason: "changed regimen"}, nil); err != nil {
		t.Fatalf("cancel failed: %v", err)
	}
	plan, _ := f.GetDietPlan(planID, nil)
	if plan.IsActive {
		t.Fatal("plan should be inactive after cancel")
	}
	if plan.CancelledByUserID == nil || *plan.CancelledByUserID != user {
		t.Fatal("cancelled_by_user_id should be recorded")
	}
	if plan.CancelledAt == nil {
		t.Fatal("cancelled_at should be set")
	}
	if plan.CancellationReason != "changed regimen" {
		t.Fatalf("reason not persisted: %q", plan.CancellationReason)
	}
}
