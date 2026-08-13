package patientdocs

import (
	"strings"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains patient-document business logic.
type Service interface {
	Add(patientID uuid.UUID, fileName, filePath, fileType string, size int64, docType, notes string, userID uuid.UUID) (*models.PatientDocument, error)
	List(patientID uuid.UUID, scope *models.DataScope) ([]models.PatientDocument, error)
	Get(id uuid.UUID, scope *models.DataScope) (*models.PatientDocument, error)
	Delete(id uuid.UUID, scope *models.DataScope) error
}

type service struct {
	repo Repository
}

// NewService builds a patient-document Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// Add records a freshly stored document against a patient.
func (s *service) Add(patientID uuid.UUID, fileName, filePath, fileType string, size int64, docType, notes string, userID uuid.UUID) (*models.PatientDocument, error) {
	doc := &models.PatientDocument{
		PatientID:        patientID,
		DocType:          strings.ToUpper(strings.TrimSpace(docType)),
		Notes:            strings.TrimSpace(notes),
		FileName:         fileName,
		FilePath:         filePath,
		FileType:         fileType,
		FileSize:         size,
		UploadedByUserID: userID,
	}
	if doc.DocType == "" {
		doc.DocType = "OTHER"
	}
	if err := s.repo.Create(doc); err != nil {
		return nil, err
	}
	return doc, nil
}

func (s *service) List(patientID uuid.UUID, scope *models.DataScope) ([]models.PatientDocument, error) {
	return s.repo.ListByPatient(patientID, scope)
}

func (s *service) Get(id uuid.UUID, scope *models.DataScope) (*models.PatientDocument, error) {
	return s.repo.FindByID(id, scope)
}

func (s *service) Delete(id uuid.UUID, scope *models.DataScope) error {
	return s.repo.DeleteByID(id, scope)
}
