package consultations

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when a consultation/encounter id doesn't match.
var ErrNotFound = errors.New("consultation not found")

// Repository is the data-access layer for consultations.
type Repository interface {
	FindByEncounterID(encounterID uuid.UUID, scope *models.DataScope) (*models.Consultation, error)
	FindByID(id uuid.UUID, scope *models.DataScope) (*models.Consultation, error)
	CreateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error
	UpdateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error
	FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error)
	FindEncounterByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error)
	CompleteEncounter(encounterID uuid.UUID, scope *models.DataScope) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// doctorScope restricts a consultation to one a (doctor) user actually owns.
// The consultation's DoctorID mirrors Encounter.DoctorID at save time, so a
// doctor can only ever resolve/act on consultations they authored.
func doctorScope(query *gorm.DB, scope *models.DataScope) *gorm.DB {
	if scope != nil && scope.DoctorID != nil {
		return query.Where("consultations.doctor_id = ?", *scope.DoctorID)
	}
	return query
}

func (r *repository) FindByEncounterID(encounterID uuid.UUID, scope *models.DataScope) (*models.Consultation, error) {
	var c models.Consultation
	query := r.db.Preload("Doctor.User").Preload("Diagnoses").
		Where("encounter_id = ?", encounterID)
	query = doctorScope(query, scope)
	err := query.First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *repository) FindByID(id uuid.UUID, scope *models.DataScope) (*models.Consultation, error) {
	var c models.Consultation
	query := r.db.Preload("Doctor.User").Preload("Diagnoses").
		Where("id = ?", id)
	query = doctorScope(query, scope)
	err := query.First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *repository) CreateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(c).Error; err != nil {
			return err
		}
		for i := range diagnoses {
			diagnoses[i].ConsultationID = &c.ID
			if err := tx.Create(&diagnoses[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) UpdateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(c).Error; err != nil {
			return err
		}
		// Replace diagnoses for this consultation.
		if err := tx.Where("consultation_id = ?", c.ID).Delete(&models.Diagnosis{}).Error; err != nil {
			return err
		}
		for i := range diagnoses {
			diagnoses[i].ID = uuid.Nil
			diagnoses[i].ConsultationID = &c.ID
			if err := tx.Create(&diagnoses[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").First(&doctor, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doctor, err
}

func (r *repository) FindEncounterByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error) {
	var enc models.Encounter
	query := r.db.Where("id = ?", id)
	if scope != nil && scope.DoctorID != nil {
		// A doctor may only consult on encounters they are the treating doctor for.
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}
	err := query.First(&enc).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &enc, err
}

func (r *repository) CompleteEncounter(encounterID uuid.UUID, scope *models.DataScope) error {
	query := r.db.Model(&models.Encounter{}).Where("id = ?", encounterID)
	if scope != nil && scope.DoctorID != nil {
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}
	return query.Update("status", models.EncounterCompleted).Error
}
