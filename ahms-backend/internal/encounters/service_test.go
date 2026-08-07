package encounters

import (
	"testing"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	created    []*models.Encounter
	byID       *models.Encounter
	err        error
	updateErr  error
}

func (f *fakeRepo) CreateWithToken(e *models.Encounter) error {
	if f.err != nil {
		return f.err
	}
	e.ID = uuid.New()
	e.TokenNumber = 3
	e.VisitDate = time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC)
	f.created = append(f.created, e)
	return nil
}

func (f *fakeRepo) FindAll(patientID, departmentID, doctorID *uuid.UUID, status string, date *time.Time, scope *models.DataScope) ([]models.Encounter, error) {
	return nil, nil
}

func (f *fakeRepo) FindByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error) {
	if f.byID != nil {
		return f.byID, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) UpdateStatus(id uuid.UUID, status string) (*models.Encounter, error) {
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	if f.byID != nil {
		f.byID.Status = status
		return f.byID, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) SetReferral(id uuid.UUID, referralID uuid.UUID) error { return nil }

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func TestEncounterCreateHappyPath(t *testing.T) {
	repo := &fakeRepo{}
	svc := newTestService(repo)

	e, err := svc.Create(CreateEncounterRequest{
		PatientID:     uuid.NewString(),
		DepartmentID:  uuid.NewString(),
		DoctorID:      uuid.NewString(),
		EncounterType: "OPD",
		VisitType:     "NEW",
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if e.Status != models.EncounterRegistered {
		t.Fatalf("expected REGISTERED status, got %s", e.Status)
	}
	if e.TokenNumber != 3 {
		t.Fatalf("expected token 3, got %d", e.TokenNumber)
	}
	if e.PaymentStatus != models.PaymentUnpaid {
		t.Fatalf("expected UNPAID payment status, got %s", e.PaymentStatus)
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected 1 encounter created, got %d", len(repo.created))
	}
}

func TestEncounterCreateDefaultsToOPDAndNew(t *testing.T) {
	repo := &fakeRepo{}
	svc := newTestService(repo)

	e, err := svc.Create(CreateEncounterRequest{
		PatientID:    uuid.NewString(),
		DepartmentID: uuid.NewString(),
		DoctorID:     uuid.NewString(),
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if e.EncounterType != models.EncounterTypeOPD {
		t.Fatalf("expected OPD default, got %s", e.EncounterType)
	}
	if e.VisitType != models.VisitTypeNew {
		t.Fatalf("expected NEW visit type default, got %s", e.VisitType)
	}
}

func TestEncounterCreateRejectsInvalidUUID(t *testing.T) {
	repo := &fakeRepo{}
	svc := newTestService(repo)

	_, err := svc.Create(CreateEncounterRequest{
		PatientID:    "not-a-uuid",
		DepartmentID: uuid.NewString(),
		DoctorID:     uuid.NewString(),
	}, uuid.New())

	if err == nil {
		t.Fatal("invalid patient id must return an error")
	}
	if len(repo.created) != 0 {
		t.Fatal("no encounter should be created on validation failure")
	}
}

func TestEncounterCreateRejectsBadVisitDate(t *testing.T) {
	repo := &fakeRepo{}
	svc := newTestService(repo)

	_, err := svc.Create(CreateEncounterRequest{
		PatientID:    uuid.NewString(),
		DepartmentID: uuid.NewString(),
		DoctorID:     uuid.NewString(),
		VisitDate:    "03/08/2026",
	}, uuid.New())

	if err == nil {
		t.Fatal("invalid visit date must return an error")
	}
}

func TestEncounterUpdateStatusNotFound(t *testing.T) {
	repo := &fakeRepo{}
	svc := newTestService(repo)

	_, err := svc.UpdateStatus(uuid.New(), models.EncounterCompleted)
	if err == nil {
		t.Fatal("updating a missing encounter must return ErrNotFound")
	}
}

func TestEncounterUpdateStatusHappyPath(t *testing.T) {
	existing := &models.Encounter{BaseModel: models.BaseModel{ID: uuid.New()}, Status: models.EncounterRegistered}
	repo := &fakeRepo{byID: existing}
	svc := newTestService(repo)

	e, err := svc.UpdateStatus(existing.ID, models.EncounterCompleted)
	if err != nil {
		t.Fatalf("update should succeed, got %v", err)
	}
	if e.Status != models.EncounterCompleted {
		t.Fatalf("expected COMPLETED status, got %s", e.Status)
	}
}
