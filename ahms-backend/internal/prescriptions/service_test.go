package prescriptions

import (
	"errors"
	"testing"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	encounterExists bool
	doctor          *models.Doctor
	saved           *models.Prescription
	doctorErr       error
}

func (f *fakeRepo) FindByEncounterID(encounterID uuid.UUID, scope *models.DataScope) (*models.Prescription, error) {
	return nil, ErrNotFound
}

func (f *fakeRepo) FindByID(id uuid.UUID, scope *models.DataScope) (*models.Prescription, error) {
	if f.saved != nil && f.saved.ID == id {
		return f.saved, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) FindByIDForPrint(id uuid.UUID, scope *models.DataScope) (*models.Prescription, error) {
	if f.saved != nil && f.saved.ID == id {
		return f.saved, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) List(in ListInput, scope *models.DataScope) ([]models.Prescription, error) {
	if f.saved == nil {
		return nil, nil
	}
	return []models.Prescription{*f.saved}, nil
}

func (f *fakeRepo) CreateWithItems(p *models.Prescription, items []models.PrescriptionItem) error {
	p.ID = uuid.New()
	p.Items = items
	f.saved = p
	return nil
}

func (f *fakeRepo) UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Prescription, error) {
	if f.saved != nil && f.saved.ID == id {
		f.saved.Status = status
		return f.saved, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	if f.doctorErr != nil {
		return nil, f.doctorErr
	}
	return f.doctor, nil
}

func (f *fakeRepo) FindEncounterByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error) {
	if !f.encounterExists {
		return nil, ErrNotFound
	}
	var docID uuid.UUID
	if f.doctor != nil {
		docID = f.doctor.ID
	}
	return &models.Encounter{BaseModel: models.BaseModel{ID: id}, DoctorID: docID}, nil
}

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func TestPrescriptionCreateHappyPath(t *testing.T) {
	doctor := &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}}
	repo := &fakeRepo{encounterExists: true, doctor: doctor}
	svc := newTestService(repo)

	p, err := svc.Create(uuid.New(), CreatePrescriptionRequest{
		Notes: "take with warm milk",
		Items: []PrescriptionItemInput{
			{Medicine: "Chyawanprash", Dose: "10gm", Frequency: "2x daily", Quantity: 30},
		},
	}, uuid.New(), nil)

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if p.Status != models.PrescriptionPrescribed {
		t.Fatalf("expected PRESCRIBED status, got %s", p.Status)
	}
	if p.DoctorID != doctor.ID {
		t.Fatal("doctor id should be resolved from the caller")
	}
	if len(p.Items) != 1 || p.Items[0].Medicine != "Chyawanprash" {
		t.Fatal("prescription items should be persisted")
	}
}

func TestPrescriptionCreateRejectsMissingEncounter(t *testing.T) {
	doctor := &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}}
	repo := &fakeRepo{encounterExists: false, doctor: doctor}
	svc := newTestService(repo)

	_, err := svc.Create(uuid.New(), CreatePrescriptionRequest{
		Items: []PrescriptionItemInput{{Medicine: "Chyawanprash"}},
	}, uuid.New(), nil)

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestPrescriptionCreateUsesEncounterDoctor(t *testing.T) {
	doctor := &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}}
	repo := &fakeRepo{encounterExists: true, doctor: doctor}
	svc := newTestService(repo)

	p, err := svc.Create(uuid.New(), CreatePrescriptionRequest{
		Items: []PrescriptionItemInput{{Medicine: "Chyawanprash"}},
	}, uuid.New(), nil)

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if p.DoctorID != doctor.ID {
		t.Fatal("doctor should be resolved from the encounter")
	}
}

func TestPrescriptionUpdateStatusHappyPath(t *testing.T) {
	rx := &models.Prescription{BaseModel: models.BaseModel{ID: uuid.New()}, Status: models.PrescriptionPrescribed}
	repo := &fakeRepo{encounterExists: true, saved: rx}
	svc := newTestService(repo)

	p, err := svc.UpdateStatus(rx.ID, models.PrescriptionDispensed, nil)
	if err != nil {
		t.Fatalf("update should succeed, got %v", err)
	}
	if p.Status != models.PrescriptionDispensed {
		t.Fatalf("expected DISPENSED status, got %s", p.Status)
	}
}

func TestPrescriptionUpdateStatusNotFound(t *testing.T) {
	repo := &fakeRepo{encounterExists: true}
	svc := newTestService(repo)

	_, err := svc.UpdateStatus(uuid.New(), models.PrescriptionDispensed, nil)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
