// Package patientdocs manages clinical/administrative documents attached
// to a patient record. Files are persisted under the shared uploads
// directory and served through the static /uploads route.
package patientdocs

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when a document id doesn't match any row.
var ErrNotFound = errors.New("document not found")

// Repository is the data-access layer for patient documents.
type Repository interface {
	Create(doc *models.PatientDocument) error
	ListByPatient(patientID uuid.UUID) ([]models.PatientDocument, error)
	FindByID(id uuid.UUID) (*models.PatientDocument, error)
	DeleteByID(id uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(doc *models.PatientDocument) error {
	return r.db.Create(doc).Error
}

func (r *repository) ListByPatient(patientID uuid.UUID) ([]models.PatientDocument, error) {
	var docs []models.PatientDocument
	err := r.db.Preload("UploadedBy").
		Where("patient_id = ?", patientID).
		Order("created_at desc").
		Find(&docs).Error
	return docs, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.PatientDocument, error) {
	var doc models.PatientDocument
	err := r.db.Preload("UploadedBy").First(&doc, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doc, err
}

func (r *repository) DeleteByID(id uuid.UUID) error {
	res := r.db.Delete(&models.PatientDocument{}, "id = ?", id)
	if res.RowsAffected == 0 && res.Error == nil {
		return ErrNotFound
	}
	return res.Error
}
