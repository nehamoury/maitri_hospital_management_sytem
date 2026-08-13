package patientdocs

import (
	"testing"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	docs      []models.PatientDocument
	createErr error
	findErr   error
	deleteErr error
}

func (f *fakeRepo) Create(doc *models.PatientDocument) error {
	if f.createErr != nil {
		return f.createErr
	}
	doc.ID = uuid.New()
	f.docs = append(f.docs, *doc)
	return nil
}

func (f *fakeRepo) ListByPatient(patientID uuid.UUID, scope *models.DataScope) ([]models.PatientDocument, error) {
	var out []models.PatientDocument
	for _, d := range f.docs {
		if d.PatientID == patientID {
			out = append(out, d)
		}
	}
	return out, nil
}

func (f *fakeRepo) FindByID(id uuid.UUID, scope *models.DataScope) (*models.PatientDocument, error) {
	if f.findErr != nil {
		return nil, f.findErr
	}
	for i := range f.docs {
		if f.docs[i].ID == id {
			return &f.docs[i], nil
		}
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) DeleteByID(id uuid.UUID, scope *models.DataScope) error {
	if f.deleteErr != nil {
		return f.deleteErr
	}
	for i := range f.docs {
		if f.docs[i].ID == id {
			f.docs = append(f.docs[:i], f.docs[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func TestAddDefaultsDocTypeAndTrims(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)

	doc, err := svc.Add(uuid.New(), "report.pdf", "/uploads/patient_docs/x.pdf", "application/pdf", 123, "  report ", "  some notes  ", uuid.New())
	if err != nil {
		t.Fatalf("add should succeed, got %v", err)
	}
	if doc.DocType != "REPORT" {
		t.Fatalf("expected trimmed uppercase REPORT, got %q", doc.DocType)
	}
	if doc.Notes != "some notes" {
		t.Fatalf("expected trimmed notes, got %q", doc.Notes)
	}
	if doc.FileName != "report.pdf" {
		t.Fatalf("expected original filename preserved, got %q", doc.FileName)
	}
}

func TestAddDefaultsOther(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)

	doc, err := svc.Add(uuid.New(), "scan.png", "/uploads/patient_docs/y.png", "image/png", 456, "", "", uuid.New())
	if err != nil {
		t.Fatalf("add should succeed, got %v", err)
	}
	if doc.DocType != "OTHER" {
		t.Fatalf("expected OTHER default, got %q", doc.DocType)
	}
}

func TestListFiltersByPatient(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)

	p1 := uuid.New()
	p2 := uuid.New()
	_, _ = svc.Add(p1, "a.pdf", "/a.pdf", "application/pdf", 1, "", "", uuid.New())
	_, _ = svc.Add(p2, "b.pdf", "/b.pdf", "application/pdf", 1, "", "", uuid.New())
	_, _ = svc.Add(p1, "c.pdf", "/c.pdf", "application/pdf", 1, "", "", uuid.New())

	list, err := svc.List(p1, nil)
	if err != nil {
		t.Fatalf("list should succeed, got %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 docs for patient 1, got %d", len(list))
	}
}

func TestDeleteNotFound(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)

	err := svc.Delete(uuid.New(), nil)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
