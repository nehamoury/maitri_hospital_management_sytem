package consultations

import (
	"errors"
	"testing"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	encounterExists bool
	doctor          *models.Doctor
	created         []*models.Consultation
	saved           *models.Consultation
	completed       bool
	doctorErr       error
}

func (f *fakeRepo) FindByEncounterID(encounterID uuid.UUID, scope *models.DataScope) (*models.Consultation, error) {
	return nil, ErrNotFound
}

func (f *fakeRepo) FindByID(id uuid.UUID, scope *models.DataScope) (*models.Consultation, error) {
	if f.saved != nil && f.saved.ID == id {
		return f.saved, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) CreateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error {
	c.ID = uuid.New()
	c.CreatedAt = time.Now()
	f.saved = c
	f.created = append(f.created, c)
	return nil
}

func (f *fakeRepo) UpdateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error {
	f.saved = c
	return nil
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

func (f *fakeRepo) CompleteEncounter(encounterID uuid.UUID, scope *models.DataScope) error {
	f.completed = true
	return nil
}

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func doctorFixture() *models.Doctor {
	u := models.User{BaseModel: models.BaseModel{ID: uuid.New()}, FullName: "Dr. Test"}
	return &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}, User: u}
}

func TestConsultationCreateHappyPath(t *testing.T) {
	repo := &fakeRepo{encounterExists: true, doctor: doctorFixture()}
	svc := newTestService(repo)

	c, err := svc.Create(uuid.New(), CreateConsultationRequest{
		ChiefComplaints: "Lower back pain",
		ClinicalNotes:   "Katigraha",
		Diagnoses: []DiagnosisInput{
			{Diagnosis: "Katigraha", DiagnosisType: "PRIMARY"},
		},
		FollowUpDate: "2026-08-10",
	}, uuid.New(), nil)

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if c.ChiefComplaints != "Lower back pain" {
		t.Fatalf("chief complaints not saved: %s", c.ChiefComplaints)
	}
	if !repo.completed {
		t.Fatal("encounter should be completed after consultation is saved")
	}
}

func TestConsultationCreateRejectsMissingEncounter(t *testing.T) {
	repo := &fakeRepo{encounterExists: false, doctor: doctorFixture()}
	svc := newTestService(repo)

	_, err := svc.Create(uuid.New(), CreateConsultationRequest{}, uuid.New(), nil)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
	if repo.completed {
		t.Fatal("encounter must not be completed when consultation fails")
	}
}

func TestConsultationCreateUsesEncounterDoctor(t *testing.T) {
	doctor := doctorFixture()
	repo := &fakeRepo{encounterExists: true, doctor: doctor}
	svc := newTestService(repo)

	c, err := svc.Create(uuid.New(), CreateConsultationRequest{}, uuid.New(), nil)
	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if c.DoctorID != doctor.ID {
		t.Fatal("doctor should be resolved from the encounter")
	}
}

func TestConsultationCreateRejectsInvalidFollowUp(t *testing.T) {
	repo := &fakeRepo{encounterExists: true, doctor: doctorFixture()}
	svc := newTestService(repo)

	_, err := svc.Create(uuid.New(), CreateConsultationRequest{
		FollowUpDate: "10/08/2026",
	}, uuid.New(), nil)

	if err == nil {
		t.Fatal("invalid follow-up date must return an error")
	}
}

func TestConsultationUpdateHappyPath(t *testing.T) {
	existing := &models.Consultation{
		BaseModel:       models.BaseModel{ID: uuid.New()},
		EncounterID:     uuid.New(),
		DoctorID:        uuid.New(),
		ChiefComplaints: "old",
	}
	repo := &fakeRepo{encounterExists: true, doctor: doctorFixture()}
	repo.saved = existing
	svc := newTestService(repo)

	c, err := svc.Update(existing.ID, UpdateConsultationRequest{
		ChiefComplaints: "new",
		ClinicalNotes:   "updated plan",
	}, nil)
	if err != nil {
		t.Fatalf("update should succeed, got %v", err)
	}
	if c.ChiefComplaints != "new" {
		t.Fatalf("expected updated complaints, got %s", c.ChiefComplaints)
	}
}

func TestConsultationUpdateNotFound(t *testing.T) {
	repo := &fakeRepo{encounterExists: true, doctor: doctorFixture()}
	svc := newTestService(repo)

	_, err := svc.Update(uuid.New(), UpdateConsultationRequest{}, nil)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestBuildDiagnosesDefaultsToPrimary(t *testing.T) {
	diagnoses := buildDiagnoses(uuid.New(), uuid.New(), []DiagnosisInput{
		{Diagnosis: "Amavata"},
	})
	if len(diagnoses) != 1 {
		t.Fatalf("expected 1 diagnosis, got %d", len(diagnoses))
	}
	if diagnoses[0].DiagnosisType != models.DiagnosisPrimary {
		t.Fatalf("expected PRIMARY default, got %s", diagnoses[0].DiagnosisType)
	}
}
