package timeline

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrPatientNotFound is returned when a patient id doesn't match any row.
var ErrPatientNotFound = errors.New("patient not found")

// Repository is the data-access layer for the patient timeline.
type Repository interface {
	FindPatient(id uuid.UUID) (*models.Patient, error)
	FindEncountersWithHistory(patientID uuid.UUID) ([]models.Encounter, error)
	FindTreatmentPlans(patientID uuid.UUID) ([]models.TreatmentPlan, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindPatient(id uuid.UUID) (*models.Patient, error) {
	var patient models.Patient
	err := r.db.First(&patient, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrPatientNotFound
	}
	return &patient, err
}

// FindEncountersWithHistory loads every encounter of the patient across
// all departments, including nested consultations, diagnoses and
// prescriptions with their items. This is the source of the
// cross-department longitudinal record.
func (r *repository) FindEncountersWithHistory(patientID uuid.UUID) ([]models.Encounter, error) {
	var encounters []models.Encounter
	err := r.db.Preload("Department").
		Preload("Doctor.User").
		Preload("Diagnoses").
		Preload("Consultations.Doctor.User").
		Preload("Consultations.Diagnoses").
		Preload("Prescriptions.Items").
		Where("patient_id = ?", patientID).
		Order("visit_date asc, created_at asc").
		Find(&encounters).Error
	return encounters, err
}

// FindTreatmentPlans loads every treatment plan of the patient with the
// nested procedure, doctors, therapist and executed sessions. Standalone
// plans (no encounter) appear too, since they are part of the journey.
func (r *repository) FindTreatmentPlans(patientID uuid.UUID) ([]models.TreatmentPlan, error) {
	var plans []models.TreatmentPlan
	err := r.db.Preload("ProcedureType").
		Preload("Doctor.User").
		Preload("AssignedTherapistUser").
		Preload("ApprovedByUser").
		Preload("CompletedByUser").
		Preload("Sessions").
		Where("patient_id = ?", patientID).
		Order("created_at asc").
		Find(&plans).Error
	return plans, err
}
