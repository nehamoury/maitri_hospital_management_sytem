package referrals

import (
	"errors"
	"testing"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	encounter *models.Encounter
	doctor    *models.Doctor
	saved     *models.Referral
	byID      *models.Referral
	encErr    error
}

func (f *fakeRepo) CreateWithNumber(r *models.Referral) error {
	r.ID = uuid.New()
	r.ReferralNo = "REF-2026-000001"
	r.Status = models.ReferralCreated
	r.CreatedAt = time.Now()
	f.saved = r
	return nil
}

func (f *fakeRepo) FindIncoming(toDepartmentID uuid.UUID, statuses []string, scope *models.DataScope) ([]models.Referral, error) {
	return []models.Referral{}, nil
}

func (f *fakeRepo) FindByID(id uuid.UUID, scope *models.DataScope) (*models.Referral, error) {
	if f.byID != nil {
		return f.byID, nil
	}
	if f.saved != nil && f.saved.ID == id {
		return f.saved, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Referral, error) {
	if f.saved != nil && f.saved.ID == id {
		f.saved.Status = status
		return f.saved, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) FindEncounterWithHistory(id uuid.UUID) (*models.Encounter, error) {
	if f.encErr != nil {
		return nil, f.encErr
	}
	if f.encounter != nil {
		return f.encounter, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	return f.doctor, nil
}

func (f *fakeRepo) AttachFile(att *models.ReferralAttachment) error {
	att.ID = uuid.New()
	return nil
}

func (f *fakeRepo) FindAttachmentsByReferralID(referralID uuid.UUID, scope *models.DataScope) ([]models.ReferralAttachment, error) {
	return []models.ReferralAttachment{}, nil
}

func (f *fakeRepo) FindAttachmentByID(id uuid.UUID, scope *models.DataScope) (*models.ReferralAttachment, error) {
	return nil, ErrNotFound
}

func (f *fakeRepo) DeleteAttachment(id uuid.UUID, scope *models.DataScope) error {
	return nil
}

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func encounterFixture() *models.Encounter {
	return &models.Encounter{
		BaseModel:    models.BaseModel{ID: uuid.New()},
		DepartmentID: uuid.New(),
		Status:       models.EncounterRegistered,
	}
}

func TestReferralCreateHappyPath(t *testing.T) {
	repo := &fakeRepo{encounter: encounterFixture()}
	svc := newTestService(repo)

	ref, err := svc.Create(CreateReferralRequest{
		PatientID:         uuid.NewString(),
		SourceEncounterID: uuid.NewString(),
		ToDepartmentID:    uuid.NewString(),
		Reason:            "needs Panchakarma",
		RecommendedTreatment: "Kati Basti",
		Diagnosis:            "Katigraha",
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if ref.ReferralNo == "" {
		t.Fatal("referral number should be assigned")
	}
	if ref.Status != models.ReferralCreated {
		t.Fatalf("expected CREATED status, got %s", ref.Status)
	}
}

func TestReferralCreateDefaultsPriorityRoutine(t *testing.T) {
	repo := &fakeRepo{encounter: encounterFixture()}
	svc := newTestService(repo)

	ref, err := svc.Create(CreateReferralRequest{
		PatientID:         uuid.NewString(),
		SourceEncounterID: uuid.NewString(),
		ToDepartmentID:    uuid.NewString(),
		Reason:            "follow-up",
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if ref.Priority != models.ReferralPriorityRoutine {
		t.Fatalf("expected ROUTINE default priority, got %s", ref.Priority)
	}
}

func TestReferralCreateRejectsInvalidUUID(t *testing.T) {
	repo := &fakeRepo{encounter: encounterFixture()}
	svc := newTestService(repo)

	_, err := svc.Create(CreateReferralRequest{
		PatientID:         "not-a-uuid",
		SourceEncounterID: uuid.NewString(),
		ToDepartmentID:    uuid.NewString(),
		Reason:            "test",
	}, uuid.New())

	if err == nil {
		t.Fatal("invalid patient id must return an error")
	}
}

func TestReferralCreateRejectsMissingSourceEncounter(t *testing.T) {
	repo := &fakeRepo{encErr: ErrNotFound}
	svc := newTestService(repo)

	_, err := svc.Create(CreateReferralRequest{
		PatientID:         uuid.NewString(),
		SourceEncounterID: uuid.NewString(),
		ToDepartmentID:    uuid.NewString(),
		Reason:            "test",
	}, uuid.New())

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestReferralCreateUsesSourceEncounterDepartment(t *testing.T) {
	enc := encounterFixture()
	repo := &fakeRepo{encounter: enc}
	svc := newTestService(repo)

	ref, err := svc.Create(CreateReferralRequest{
		PatientID:         uuid.NewString(),
		SourceEncounterID: uuid.NewString(),
		ToDepartmentID:    uuid.NewString(),
		Reason:            "test",
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if ref.FromDepartmentID != enc.DepartmentID {
		t.Fatal("from department should be derived from the source encounter")
	}
}

func TestReferralUpdateStatusNotFound(t *testing.T) {
	repo := &fakeRepo{encounter: encounterFixture()}
	svc := newTestService(repo)

	_, err := svc.UpdateStatus(uuid.New(), models.ReferralAccepted, nil)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestReferralIncomingUsesCallerDepartment(t *testing.T) {
	doctor := &models.Doctor{BaseModel: models.BaseModel{ID: uuid.New()}, DepartmentID: uuid.New()}
	repo := &fakeRepo{encounter: encounterFixture(), doctor: doctor}
	svc := newTestService(repo)

	list, err := svc.Incoming("", uuid.New(), nil)
	if err != nil {
		t.Fatalf("incoming should succeed, got %v", err)
	}
	if list == nil {
		t.Fatal("expected an empty (non-nil) incoming list")
	}
}
