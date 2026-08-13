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
	ListByPatient(patientID uuid.UUID, scope *models.DataScope) ([]models.PatientDocument, error)
	FindByID(id uuid.UUID, scope *models.DataScope) (*models.PatientDocument, error)
	DeleteByID(id uuid.UUID, scope *models.DataScope) error
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

// doctorScope joins the document's patient to the doctor's encounters so a
// scoped (doctor) request only resolves documents for patients that doctor
// has actually treated, or nothing if scope has no DoctorID.
func doctorScope(query *gorm.DB, scope *models.DataScope) *gorm.DB {
	if scope != nil && scope.DoctorID != nil {
		return query.Where("EXISTS (SELECT 1 FROM encounters WHERE encounters.patient_id = patient_documents.patient_id AND encounters.doctor_id = ? AND encounters.deleted_at IS NULL)", *scope.DoctorID)
	}
	return query
}

func (r *repository) ListByPatient(patientID uuid.UUID, scope *models.DataScope) ([]models.PatientDocument, error) {
	var docs []models.PatientDocument
	query := r.db.Preload("UploadedBy").
		Where("patient_id = ?", patientID)
	query = doctorScope(query, scope)
	err := query.Order("created_at desc").
		Find(&docs).Error
	return docs, err
}

func (r *repository) FindByID(id uuid.UUID, scope *models.DataScope) (*models.PatientDocument, error) {
	var doc models.PatientDocument
	query := r.db.Preload("UploadedBy")
	query = doctorScope(query, scope)
	err := query.First(&doc, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doc, err
}

func (r *repository) DeleteByID(id uuid.UUID, scope *models.DataScope) error {
	query := r.db.Where("id = ?", id)
	query = doctorScope(query, scope)
	res := query.Delete(&models.PatientDocument{})
	if res.RowsAffected == 0 && res.Error == nil {
		return ErrNotFound
	}
	return res.Error
}
