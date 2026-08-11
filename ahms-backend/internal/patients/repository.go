package patients

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrNotFound is returned when a patient id doesn't match any row.
var ErrNotFound = errors.New("patient not found")

// Repository is the data-access layer for patients.
type Repository interface {
	FindActiveByMobile(mobile string) ([]models.Patient, error)
	FindDuplicates(mobile, alternateMobile, email, fullName string, dob *time.Time) ([]models.Patient, error)
	CreateWithUHID(patient *models.Patient) error
	FindAll(search string, scope *models.DataScope) ([]models.Patient, error)
	FindByID(id uuid.UUID) (*models.Patient, error)
	Update(patient *models.Patient) error
	Delete(id uuid.UUID) error
	CountRegisteredOn(day time.Time) (int64, error)
	FindRecent(limit int) ([]models.Patient, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindActiveByMobile(mobile string) ([]models.Patient, error) {
	var patients []models.Patient
	err := r.db.Where("mobile = ? AND is_active = ?", mobile, true).Find(&patients).Error
	return patients, err
}

// FindDuplicates looks up active patients that match the incoming
// registration on any of the configured duplicate-combination rules:
//   - same primary mobile
//   - same primary mobile is already covered above; additionally alternate mobile
//   - same alternate mobile
//   - same email
//   - same full name AND date of birth
//   - same full name AND mobile
//
// Name matching is case-insensitive. Only active (non-deleted) patients
// are considered duplicates.
func (r *repository) FindDuplicates(mobile, alternateMobile, email, fullName string, dob *time.Time) ([]models.Patient, error) {
	conds := []string{}
	args := []interface{}{}

	if mobile != "" {
		conds = append(conds, `mobile = ?`)
		args = append(args, mobile)
	}
	if alternateMobile != "" {
		conds = append(conds, `alternate_mobile = ?`)
		args = append(args, alternateMobile)
	}
	if email != "" {
		conds = append(conds, `email = ?`)
		args = append(args, email)
	}
	if fullName != "" && mobile != "" {
		conds = append(conds, `lower(full_name) = lower(?) AND mobile = ?`)
		args = append(args, fullName, mobile)
	}
	if fullName != "" && dob != nil {
		conds = append(conds, `lower(full_name) = lower(?) AND dob = ?`)
		args = append(args, fullName, dob)
	}
	if len(conds) == 0 {
		return []models.Patient{}, nil
	}

	var listOut []models.Patient
	err := r.db.Where(
		"is_active = ? AND ("+strings.Join(conds, ") OR (")+")",
		append([]interface{}{true}, args...)...,
	).Order("created_at desc").Find(&listOut).Error
	return listOut, err
}

// CreateWithUHID generates the next UHID for the current year and
// creates the patient in a single transaction. The year's counter row
// is row-locked (SELECT ... FOR UPDATE) for the duration of the
// transaction, so concurrent registrations are serialized and can never
// produce a duplicate UHID.
func (r *repository) CreateWithUHID(patient *models.Patient) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		year := time.Now().Year()

		var counter models.UHIDCounter
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("year = ?", year).
			First(&counter).Error

		if errors.Is(err, gorm.ErrRecordNotFound) {
			counter = models.UHIDCounter{Year: year, LastNumber: 0}
			if err := tx.Create(&counter).Error; err != nil {
				return fmt.Errorf("failed to initialize uhid counter: %w", err)
			}
			// Re-fetch with a lock now that the row exists.
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("year = ?", year).First(&counter).Error; err != nil {
				return err
			}
		} else if err != nil {
			return fmt.Errorf("failed to lock uhid counter: %w", err)
		}

		nextNumber := counter.LastNumber + 1
		patient.UHID = fmt.Sprintf("MCAH-%d-%06d", year, nextNumber)

		if err := tx.Create(patient).Error; err != nil {
			return err
		}

		return tx.Model(&models.UHIDCounter{}).
			Where("year = ?", year).
			Update("last_number", nextNumber).Error
	})
}

func (r *repository) FindAll(search string, scope *models.DataScope) ([]models.Patient, error) {
	var patientsList []models.Patient
	query := r.db.Order("created_at desc")
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("full_name ILIKE ? OR mobile ILIKE ? OR uhid ILIKE ?", like, like, like)
	}

	if scope != nil && scope.DoctorID != nil {
		query = query.Where("EXISTS (SELECT 1 FROM encounters WHERE encounters.patient_id = patients.id AND encounters.doctor_id = ? AND encounters.deleted_at IS NULL)", *scope.DoctorID)
	}

	err := query.Find(&patientsList).Error
	return patientsList, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.Patient, error) {
	var patient models.Patient
	err := r.db.First(&patient, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &patient, err
}

func (r *repository) Update(patient *models.Patient) error {
	return r.db.Save(patient).Error
}

func (r *repository) Delete(id uuid.UUID) error {
	result := r.db.Delete(&models.Patient{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *repository) CountRegisteredOn(day time.Time) (int64, error) {
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location())
	end := start.Add(24 * time.Hour)
	var count int64
	err := r.db.Model(&models.Patient{}).
		Where("created_at >= ? AND created_at < ?", start, end).
		Count(&count).Error
	return count, err
}

func (r *repository) FindRecent(limit int) ([]models.Patient, error) {
	var patientsList []models.Patient
	err := r.db.Order("created_at desc").Limit(limit).Find(&patientsList).Error
	return patientsList, err
}
