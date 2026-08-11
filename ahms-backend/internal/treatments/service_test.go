package treatments

import (
	"errors"
	"testing"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	patientOK       bool
	procOK          bool
	therapistOK     bool
	doctor          *models.Doctor
	plan            *models.TreatmentPlan
	session         *models.TreatmentSession
	patientExistsErr error
	notFound        bool
	nextNumber      int
	completed       int
}

func (f *fakeRepo) CreatePlanWithSessions(plan *models.TreatmentPlan, sessions []models.TreatmentSession) error {
	if f.nextNumber == 0 {
		f.nextNumber = 100
	}
	f.nextNumber++
	plan.ID = uuid.New()
	plan.PlanNo = "PKR-2026-000100"
	plan.Sessions = sessions
	f.plan = plan
	return nil
}

func (f *fakeRepo) FindPlanByID(id uuid.UUID) (*models.TreatmentPlan, error) {
	if f.plan == nil || (f.notFound && f.plan.ID != id) {
		return nil, ErrNotFound
	}
	return f.plan, nil
}

func (f *fakeRepo) ListPlans(filter ListFilter) ([]models.TreatmentPlan, error) {
	return []models.TreatmentPlan{}, nil
}

func (f *fakeRepo) UpdatePlan(plan *models.TreatmentPlan) error {
	f.plan = plan
	return nil
}

func (f *fakeRepo) NextPlanNumber(year int) (string, error) {
	if f.nextNumber == 0 {
		f.nextNumber = 100
	}
	f.nextNumber++
	return "PKR-2026-000100", nil
}

func (f *fakeRepo) FindSessionByID(id uuid.UUID) (*models.TreatmentSession, error) {
	if f.session == nil {
		return nil, ErrNotFound
	}
	return f.session, nil
}

func (f *fakeRepo) UpdateSession(session *models.TreatmentSession) error {
	f.session = session
	return nil
}

func (f *fakeRepo) TodaySessions(therapistUserID uuid.UUID) ([]models.TreatmentPlan, error) {
	return []models.TreatmentPlan{}, nil
}

func (f *fakeRepo) PatientExists(id uuid.UUID) (bool, error) {
	return f.patientOK, f.patientExistsErr
}

func (f *fakeRepo) EncounterExists(id uuid.UUID) (bool, error) {
	return true, nil
}

func (f *fakeRepo) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	if f.doctor == nil {
		return nil, ErrNotFound
	}
	return f.doctor, nil
}

func (f *fakeRepo) FindDoctorByID(id uuid.UUID) (*models.Doctor, error) {
	if f.doctor == nil {
		return nil, ErrNotFound
	}
	return f.doctor, nil
}

func (f *fakeRepo) ProcedureTypeExists(id uuid.UUID) (bool, error) {
	return f.procOK, nil
}

func (f *fakeRepo) TherapistExists(userID uuid.UUID) (bool, error) {
	return f.therapistOK, nil
}

func (f *fakeRepo) CountCompletedSessions(planID uuid.UUID) (int, error) {
	return f.completed, nil
}

func (f *fakeRepo) ListProcedureTypes() ([]models.ProcedureType, error) {
	return []models.ProcedureType{}, nil
}

func (f *fakeRepo) ListTherapists() ([]models.User, error) {
	return []models.User{}, nil
}

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func planFixture(status string) *models.TreatmentPlan {
	now := time.Now()
	id := uuid.New()
	pid := uuid.New()
	ptID := uuid.New()
	docID := uuid.New()
	return &models.TreatmentPlan{
		BaseModel:       models.BaseModel{ID: id},
		PlanNo:          "PKR-2026-000100",
		PatientID:       pid,
		ProcedureTypeID: ptID,
		DoctorID:        docID,
		PlannedSessions: 3,
		Frequency:       models.FrequencyDaily,
		StartDate:       now,
		EndDate:         &now,
		Status:          status,
	}
}

func sessionFixture(status string) *models.TreatmentSession {
	now := time.Now()
	plan := planFixture(models.TreatmentApproved)
	sessionID := uuid.New()
	therapistID := uuid.New()
	return &models.TreatmentSession{
		BaseModel:       models.BaseModel{ID: sessionID},
		PlanID:          plan.ID,
		SessionNumber:   1,
		SessionDate:     now,
		Status:          status,
		TherapistUserID: &therapistID,
		Plan:            *plan,
	}
}

func TestCreatePlanHappyPath(t *testing.T) {
	repo := &fakeRepo{
		patientOK:   true,
		procOK:      true,
		doctor:      &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}},
		therapistOK: true,
	}
	svc := newTestService(repo)

	plan, err := svc.CreatePlan(CreatePlanRequest{
		PatientID:              uuid.NewString(),
		ProcedureTypeID:        uuid.NewString(),
		PlannedSessions:        3,
		Frequency:              models.FrequencyDaily,
		StartDate:              "2026-08-10",
		AssignedTherapistUserID: uuid.NewString(),
		Indication:             "Katigraha",
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if plan.PlanNo == "" {
		t.Fatal("plan number should be assigned")
	}
	if plan.Status != models.TreatmentPlanned {
		t.Fatalf("expected PLANNED status, got %s", plan.Status)
	}
}

func TestCreatePlanRejectsUnknownPatient(t *testing.T) {
	repo := &fakeRepo{patientOK: false, procOK: true, doctor: &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}}}
	svc := newTestService(repo)

	_, err := svc.CreatePlan(CreatePlanRequest{
		PatientID:       uuid.NewString(),
		ProcedureTypeID: uuid.NewString(),
		PlannedSessions: 3,
		Frequency:       models.FrequencyDaily,
		StartDate:       "2026-08-10",
	}, uuid.New())

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestCreatePlanRejectsUnknownDoctor(t *testing.T) {
	repo := &fakeRepo{patientOK: true, procOK: true}
	svc := newTestService(repo)

	_, err := svc.CreatePlan(CreatePlanRequest{
		PatientID:       uuid.NewString(),
		ProcedureTypeID: uuid.NewString(),
		PlannedSessions: 3,
		Frequency:       models.FrequencyDaily,
		StartDate:       "2026-08-10",
	}, uuid.New())

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestCreatePlanRejectsUnknownTherapist(t *testing.T) {
	repo := &fakeRepo{patientOK: true, procOK: true, doctor: &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}}, therapistOK: false}
	svc := newTestService(repo)

	_, err := svc.CreatePlan(CreatePlanRequest{
		PatientID:              uuid.NewString(),
		ProcedureTypeID:        uuid.NewString(),
		PlannedSessions:        3,
		Frequency:              models.FrequencyDaily,
		StartDate:              "2026-08-10",
		AssignedTherapistUserID: uuid.NewString(),
	}, uuid.New())

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestApprovePlanFromPlanned(t *testing.T) {
	repo := &fakeRepo{plan: planFixture(models.TreatmentPlanned)}
	svc := newTestService(repo)

	plan, err := svc.ApprovePlan(repo.plan.ID, uuid.New())
	if err != nil {
		t.Fatalf("approve should succeed, got %v", err)
	}
	if plan.Status != models.TreatmentApproved {
		t.Fatalf("expected APPROVED, got %s", plan.Status)
	}
}

func TestApprovePlanRejectsInProgress(t *testing.T) {
	repo := &fakeRepo{plan: planFixture(models.TreatmentInProgress)}
	svc := newTestService(repo)

	_, err := svc.ApprovePlan(repo.plan.ID, uuid.New())
	if !errors.Is(err, ErrInvalidState) {
		t.Fatalf("expected ErrInvalidState, got %v", err)
	}
}

func TestCompletePlanRequiresAllSessionsDone(t *testing.T) {
	repo := &fakeRepo{plan: planFixture(models.TreatmentInProgress), completed: 2}
	svc := newTestService(repo)

	_, err := svc.CompletePlan(repo.plan.ID, CompletePlanRequest{FinalAssessment: "improved"}, uuid.New())
	if !errors.Is(err, ErrInvalidState) {
		t.Fatalf("expected ErrInvalidState when sessions outstanding, got %v", err)
	}
}

func TestCompletePlanHappyPath(t *testing.T) {
	repo := &fakeRepo{plan: planFixture(models.TreatmentInProgress), completed: 3}
	svc := newTestService(repo)

	plan, err := svc.CompletePlan(repo.plan.ID, CompletePlanRequest{FinalAssessment: "improved"}, uuid.New())
	if err != nil {
		t.Fatalf("complete should succeed, got %v", err)
	}
	if plan.Status != models.TreatmentCompleted {
		t.Fatalf("expected COMPLETED, got %s", plan.Status)
	}
}

func TestStartSessionMovesPlanToInProgress(t *testing.T) {
	plan := planFixture(models.TreatmentApproved)
	therapistID := uuid.New()
	repo := &fakeRepo{
		plan: plan,
		session: &models.TreatmentSession{
			BaseModel:       models.BaseModel{ID: uuid.New()},
			PlanID:          plan.ID,
			SessionNumber:   1,
			SessionDate:     time.Now(),
			Status:          models.SessionPending,
			TherapistUserID: &therapistID,
			Plan:            *plan,
		},
	}
	svc := newTestService(repo)

	session, err := svc.StartSession(repo.session.ID, StartSessionRequest{BeforeCondition: "mild pain"}, therapistID)
	if err != nil {
		t.Fatalf("start should succeed, got %v", err)
	}
	if session.Status != models.SessionInProgress {
		t.Fatalf("expected IN_PROGRESS, got %s", session.Status)
	}
	if repo.plan.Status != models.TreatmentInProgress {
		t.Fatalf("expected plan to become IN_PROGRESS, got %s", repo.plan.Status)
	}
}

func TestStartSessionWrongTherapistRejected(t *testing.T) {
	plan := planFixture(models.TreatmentApproved)
	therapistID := uuid.New()
	repo := &fakeRepo{
		plan: plan,
		session: &models.TreatmentSession{
			BaseModel:       models.BaseModel{ID: uuid.New()},
			PlanID:          plan.ID,
			Status:          models.SessionPending,
			TherapistUserID: &therapistID,
			Plan:            *plan,
		},
	}
	svc := newTestService(repo)

	_, err := svc.StartSession(repo.session.ID, StartSessionRequest{}, uuid.New())
	if !errors.Is(err, ErrInvalidState) {
		t.Fatalf("expected ErrInvalidState for wrong therapist, got %v", err)
	}
}

func TestCompleteSessionHappyPath(t *testing.T) {
	therapistID := uuid.New()
	sess := sessionFixture(models.SessionInProgress)
	sess.TherapistUserID = &therapistID
	repo := &fakeRepo{session: sess, plan: planFixture(models.TreatmentInProgress)}
	svc := newTestService(repo)

	session, err := svc.CompleteSession(repo.session.ID, CompleteSessionRequest{
		AfterCondition: "pain reduced",
		Observations:   "tolerated well",
	}, therapistID)
	if err != nil {
		t.Fatalf("complete should succeed, got %v", err)
	}
	if session.Status != models.SessionCompleted {
		t.Fatalf("expected COMPLETED, got %s", session.Status)
	}
}
