package patients

import (
	"errors"
	"testing"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// fakeRepo is an in-memory Repository used to test the service layer
// without a database. FindDuplicates returns matches from byMobile (which
// doubles as the duplicate set for tests) plus any entries keyed under
// byName below.
type fakeRepo struct {
	byMobile map[string][]models.Patient
	byName   map[string][]models.Patient
	created  []*models.Patient
}

func (f *fakeRepo) FindDuplicates(mobile, alternateMobile, email, fullName string, dob *time.Time) ([]models.Patient, error) {
	var out []models.Patient
	out = append(out, f.byMobile[mobile]...)
	if f.byName != nil {
		out = append(out, f.byName[fullName]...)
	}
	return out, nil
}

func (f *fakeRepo) FindActiveByMobile(mobile string) ([]models.Patient, error) {
	return f.byMobile[mobile], nil
}

func (f *fakeRepo) CreateWithUHID(patient *models.Patient) error {
	f.created = append(f.created, patient)
	return nil
}

func (f *fakeRepo) FindAll(search string) ([]models.Patient, error) {
	return nil, nil
}

func (f *fakeRepo) FindByID(id uuid.UUID) (*models.Patient, error) {
	return nil, ErrNotFound
}

func (f *fakeRepo) Update(patient *models.Patient) error { return nil }

func (f *fakeRepo) Delete(id uuid.UUID) error { return nil }

func (f *fakeRepo) CountRegisteredOn(day time.Time) (int64, error) { return 0, nil }

func (f *fakeRepo) FindRecent(limit int) ([]models.Patient, error) { return nil, nil }

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func TestCreateRejectsDuplicateMobile(t *testing.T) {
	existing := models.Patient{BaseModel: models.BaseModel{ID: uuid.New()}, FullName: "Ramesh Kumar", Mobile: "9111111111"}
	repo := &fakeRepo{byMobile: map[string][]models.Patient{"9111111111": {existing}}}
	svc := newTestService(repo)

	_, duplicates, err := svc.Create(CreatePatientRequest{
		FullName: "Suresh Kumar",
		Gender:   "MALE",
		Mobile:   "9111111111",
	}, uuid.New())

	if !errors.Is(err, ErrDuplicateMobile) {
		t.Fatalf("expected ErrDuplicateMobile, got %v", err)
	}
	if len(duplicates) != 1 {
		t.Fatalf("expected 1 duplicate, got %d", len(duplicates))
	}
	if len(repo.created) != 0 {
		t.Fatal("no patient should be created when duplicates are rejected")
	}
}

func TestCreateRejectsDuplicateByNameAndDOB(t *testing.T) {
	existing := models.Patient{BaseModel: models.BaseModel{ID: uuid.New()}, FullName: "Sameer", Mobile: "9333333333"}
	repo := &fakeRepo{byMobile: map[string][]models.Patient{}, byName: map[string][]models.Patient{"Sameer": {existing}}}
	svc := newTestService(repo)

	_, duplicates, err := svc.Create(CreatePatientRequest{
		FullName: "Sameer",
		Gender:   "MALE",
		DOB:      "1990-01-01",
		Mobile:   "9444444444",
	}, uuid.New())

	if !errors.Is(err, ErrDuplicateMobile) {
		t.Fatalf("expected ErrDuplicateMobile for name+DOB match, got %v", err)
	}
	if len(duplicates) != 1 {
		t.Fatalf("expected 1 duplicate, got %d", len(duplicates))
	}
	if len(repo.created) != 0 {
		t.Fatal("no patient should be created when a name+DOB duplicate is found")
	}
}

func TestCreateWithForceBypassesDuplicateCheck(t *testing.T) {
	existing := models.Patient{BaseModel: models.BaseModel{ID: uuid.New()}, FullName: "Ramesh Kumar", Mobile: "9111111111"}
	repo := &fakeRepo{byMobile: map[string][]models.Patient{"9111111111": {existing}}}
	svc := newTestService(repo)

	created, _, err := svc.Create(CreatePatientRequest{
		FullName: "Suresh Kumar",
		Gender:   "MALE",
		Mobile:   "9111111111",
		Force:    true,
	}, uuid.New())

	if err != nil {
		t.Fatalf("create with force should succeed, got %v", err)
	}
	if created == nil || created.FullName != "Suresh Kumar" {
		t.Fatal("expected created patient to be returned")
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected 1 patient created, got %d", len(repo.created))
	}
}

func TestCreateParsesDOB(t *testing.T) {
	repo := &fakeRepo{byMobile: map[string][]models.Patient{}}
	svc := newTestService(repo)

	created, _, err := svc.Create(CreatePatientRequest{
		FullName: "Ramesh Kumar",
		Gender:   "MALE",
		DOB:      "1990-05-15",
		Mobile:   "9222222222",
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if created.DOB == nil {
		t.Fatal("DOB should be parsed when provided")
	}
	if created.DOB.Year() != 1990 || created.DOB.Month() != 5 || created.DOB.Day() != 15 {
		t.Fatalf("DOB parsed incorrectly: %v", created.DOB)
	}
}

func TestCreateRejectsInvalidDOBFormat(t *testing.T) {
	repo := &fakeRepo{byMobile: map[string][]models.Patient{}}
	svc := newTestService(repo)

	_, _, err := svc.Create(CreatePatientRequest{
		FullName: "Ramesh Kumar",
		Gender:   "MALE",
		DOB:      "15/05/1990",
		Mobile:   "9222222222",
	}, uuid.New())

	if err == nil {
		t.Fatal("invalid DOB format must return an error")
	}
}
