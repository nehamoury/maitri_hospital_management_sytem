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
	FindByEncounterID(encounterID uuid.UUID) (*models.Consultation, error)
	FindByID(id uuid.UUID) (*models.Consultation, error)
	CreateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error
	UpdateWithDiagnoses(c *models.Consultation, diagnoses []models.Diagnosis) error
	FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error)
	FindEncounterByID(id uuid.UUID) (*models.Encounter, error)
	CompleteEncounter(encounterID uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindByEncounterID(encounterID uuid.UUID) (*models.Consultation, error) {
	var c models.Consultation
	err := r.db.Preload("Doctor.User").Preload("Diagnoses").
		First(&c, "encounter_id = ?", encounterID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.Consultation, error) {
	var c models.Consultation
	err := r.db.Preload("Doctor.User").Preload("Diagnoses").
		First(&c, "id = ?", id).Error
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

func (r *repository) FindEncounterByID(id uuid.UUID) (*models.Encounter, error) {
	var enc models.Encounter
	err := r.db.First(&enc, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &enc, err
}

func (r *repository) CompleteEncounter(encounterID uuid.UUID) error {
	return r.db.Model(&models.Encounter{}).
		Where("id = ?", encounterID).
		Update("status", models.EncounterCompleted).Error
}
