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
	FindPatient(id uuid.UUID, scope *models.DataScope) (*models.Patient, error)
	FindEncountersWithHistory(patientID uuid.UUID) ([]models.Encounter, error)
	FindTreatmentPlans(patientID uuid.UUID) ([]models.TreatmentPlan, error)
	FindAdmissions(patientID uuid.UUID) ([]models.Admission, error)
	FindLabOrders(patientID uuid.UUID) ([]models.InvestigationOrder, error)
	FindReferrals(patientID uuid.UUID) ([]models.Referral, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindPatient(id uuid.UUID, scope *models.DataScope) (*models.Patient, error) {
	var patient models.Patient
	query := r.db.Where("id = ?", id)
	if scope != nil && scope.DoctorID != nil {
		// A doctor may only view the longitudinal timeline of patients they
		// have treated (an encounter exists between doctor and patient).
		query = query.Where("EXISTS (SELECT 1 FROM encounters WHERE encounters.patient_id = patients.id AND encounters.doctor_id = ? AND encounters.deleted_at IS NULL)", *scope.DoctorID)
	}
	err := query.First(&patient).Error
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

// FindAdmissions loads every IPD admission of the patient with its
// department, doctor, current bed, discharge summary and clinical chart,
// so the longitudinal timeline also surfaces IPD stays.
func (r *repository) FindAdmissions(patientID uuid.UUID) ([]models.Admission, error) {
	var admissions []models.Admission
	err := r.db.Preload("Department").
		Preload("Doctor.User").
		Preload("Bed.Ward").
		Preload("Discharge").
		Preload("ProgressNotes").
		Preload("Orders").
		Preload("DietOrders").
		Where("patient_id = ?", patientID).
		Order("admission_date asc, created_at asc").
		Find(&admissions).Error
	return admissions, err
}

// FindLabOrders loads every lab order of the patient with its ordering
// context, tests and result status so the timeline can surface "CBC →
// Report Available" events.
func (r *repository) FindLabOrders(patientID uuid.UUID) ([]models.InvestigationOrder, error) {
	var orders []models.InvestigationOrder
	err := r.db.Preload("OrderedByUser").
		Preload("ReviewedByUser").
		Preload("Items.Test").
		Preload("Sample").
		Where("patient_id = ?", patientID).
		Order("created_at asc").
		Find(&orders).Error
	return orders, err
}

// FindReferrals loads every referral of the patient together with the
// source encounter's clinical snapshot and the involved departments, so
// the timeline can surface "Referral from General Medicine → Ayurveda"
// events with their notes.
func (r *repository) FindReferrals(patientID uuid.UUID) ([]models.Referral, error) {
	var referrals []models.Referral
	err := r.db.Preload("FromDepartment").
		Preload("ToDepartment").
		Preload("PreferredDoctor.User").
		Preload("ReferredBy").
		Preload("SourceEncounter.Department").
		Preload("SourceEncounter.Doctor.User").
		Preload("SourceEncounter.Diagnoses").
		Preload("SourceEncounter.Consultations.Diagnoses").
		Preload("SourceEncounter.Prescriptions.Items").
		Where("patient_id = ?", patientID).
		Order("created_at asc").
		Find(&referrals).Error
	return referrals, err
}
