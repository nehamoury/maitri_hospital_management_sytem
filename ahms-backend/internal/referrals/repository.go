package referrals

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrNotFound is returned when a referral/encounter id doesn't match.
var ErrNotFound = errors.New("referral not found")

// Repository is the data-access layer for referrals. CreateWithNumber
// issues the next REF-YYYY-NNNNNN number under a row lock on the year's
// counter, inside the same transaction that creates the referral.
type Repository interface {
	CreateWithNumber(r *models.Referral) error
	FindIncoming(toDepartmentID uuid.UUID, statuses []string) ([]models.Referral, error)
	FindByID(id uuid.UUID) (*models.Referral, error)
	UpdateStatus(id uuid.UUID, status string) (*models.Referral, error)
	FindEncounterWithHistory(id uuid.UUID) (*models.Encounter, error)
	FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error)
	AttachFile(att *models.ReferralAttachment) error
	FindAttachmentsByReferralID(referralID uuid.UUID) ([]models.ReferralAttachment, error)
	FindAttachmentByID(id uuid.UUID) (*models.ReferralAttachment, error)
	DeleteAttachment(id uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateWithNumber(referral *models.Referral) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Validate and lock the source encounter.
		var enc models.Encounter
		if err := tx.First(&enc, "id = ?", referral.SourceEncounterID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("source encounter not found")
			}
			return err
		}
		var patient models.Patient
		if err := tx.First(&patient, "id = ?", referral.PatientID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("patient not found")
			}
			return err
		}
		var toDept models.Department
		if err := tx.First(&toDept, "id = ?", referral.ToDepartmentID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("destination department not found")
			}
			return err
		}

		year := time.Now().Year()
		var counter models.ReferralCounter
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("year = ?", year).
			First(&counter).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			counter = models.ReferralCounter{Year: year, LastNumber: 0}
			if err := tx.Create(&counter).Error; err != nil {
				return fmt.Errorf("failed to initialize referral counter: %w", err)
			}
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("year = ?", year).First(&counter).Error; err != nil {
				return err
			}
		} else if err != nil {
			return fmt.Errorf("failed to lock referral counter: %w", err)
		}

		next := counter.LastNumber + 1
		referral.ReferralNo = fmt.Sprintf("REF-%d-%06d", year, next)
		referral.Status = models.ReferralCreated

		if err := tx.Create(referral).Error; err != nil {
			return err
		}
		return tx.Model(&models.ReferralCounter{}).
			Where("year = ?", year).
			Update("last_number", next).Error
	})
}

func (r *repository) FindIncoming(toDepartmentID uuid.UUID, statuses []string) ([]models.Referral, error) {
	query := r.db.Preload("Patient").Preload("FromDepartment").Preload("ToDepartment").
		Where("to_department_id = ?", toDepartmentID)
	if len(statuses) > 0 {
		query = query.Where("status IN ?", statuses)
	}
	var list []models.Referral
	err := query.Order("created_at desc").Find(&list).Error
	return list, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.Referral, error) {
	var referral models.Referral
	err := r.db.Preload("Patient").
		Preload("FromDepartment").
		Preload("ToDepartment").
		Preload("PreferredDoctor.User").
		Preload("ReferredBy").
		Preload("Attachments.UploadedBy").
		Preload("SourceEncounter.Department").
		Preload("SourceEncounter.Doctor.User").
		Preload("SourceEncounter.Consultations.Diagnoses").
		Preload("SourceEncounter.Diagnoses").
		Preload("SourceEncounter.Prescriptions.Items").
		First(&referral, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &referral, err
}

func (r *repository) UpdateStatus(id uuid.UUID, status string) (*models.Referral, error) {
	result := r.db.Model(&models.Referral{}).Where("id = ?", id).Update("status", status)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.FindByID(id)
}

func (r *repository) FindEncounterWithHistory(id uuid.UUID) (*models.Encounter, error) {
	var enc models.Encounter
	err := r.db.Preload("Department").
		Preload("Doctor.User").
		Preload("Consultations.Doctor.User").
		Preload("Consultations.Diagnoses").
		Preload("Diagnoses").
		Preload("Prescriptions.Items").
		First(&enc, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &enc, err
}

func (r *repository) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").First(&doctor, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doctor, err
}

func (r *repository) AttachFile(att *models.ReferralAttachment) error {
	return r.db.Create(att).Error
}

func (r *repository) FindAttachmentsByReferralID(referralID uuid.UUID) ([]models.ReferralAttachment, error) {
	var list []models.ReferralAttachment
	err := r.db.Preload("UploadedBy").
		Where("referral_id = ?", referralID).
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

func (r *repository) FindAttachmentByID(id uuid.UUID) (*models.ReferralAttachment, error) {
	var att models.ReferralAttachment
	err := r.db.First(&att, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &att, err
}

func (r *repository) DeleteAttachment(id uuid.UUID) error {
	result := r.db.Delete(&models.ReferralAttachment{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
