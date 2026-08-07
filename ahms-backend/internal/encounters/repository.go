package encounters

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrNotFound is returned when an encounter id doesn't match any row.
var ErrNotFound = errors.New("encounter not found")

// Repository is the data-access layer for encounters. CreateWithToken
// assigns the next sequential token for (DoctorID, VisitDate) inside a
// transaction that row-locks the doctor row, so concurrent registrations
// for the same doctor on the same day can never collide.
type Repository interface {
	CreateWithToken(e *models.Encounter) error
	FindAll(patientID, departmentID, doctorID *uuid.UUID, status string, date *time.Time, scope *models.DataScope) ([]models.Encounter, error)
	FindByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error)
	UpdateStatus(id uuid.UUID, status string) (*models.Encounter, error)
	SetReferral(id uuid.UUID, referralID uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateWithToken(e *models.Encounter) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Validate and lock the doctor row — serializes concurrent token
		// assignment for the same doctor/date.
		var doctor models.Doctor
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&doctor, "id = ?", e.DoctorID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("doctor not found")
			}
			return err
		}

		var patient models.Patient
		if err := tx.First(&patient, "id = ?", e.PatientID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("patient not found")
			}
			return err
		}

		var dept models.Department
		if err := tx.First(&dept, "id = ?", e.DepartmentID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("department not found")
			}
			return err
		}

		dayStart := time.Date(e.VisitDate.Year(), e.VisitDate.Month(), e.VisitDate.Day(),
			0, 0, 0, 0, e.VisitDate.Location())
		dayEnd := dayStart.Add(24 * time.Hour)

		var maxToken int
		row := tx.Model(&models.Encounter{}).
			Select("COALESCE(MAX(token_number), 0)").
			Where("doctor_id = ? AND visit_date >= ? AND visit_date < ?",
				e.DoctorID, dayStart, dayEnd).
			Row()
		if err := row.Scan(&maxToken); err != nil {
			return err
		}

		e.TokenNumber = maxToken + 1
		e.VisitDate = dayStart

		return tx.Create(e).Error
	})
}

func (r *repository) FindAll(patientID, departmentID, doctorID *uuid.UUID, status string, date *time.Time, scope *models.DataScope) ([]models.Encounter, error) {
	query := r.db.Preload("Patient").Preload("Department").Preload("Doctor.User").
		Order("visit_date desc, token_number asc")

	if patientID != nil {
		query = query.Where("patient_id = ?", *patientID)
	}
	if departmentID != nil {
		query = query.Where("department_id = ?", *departmentID)
	}
	if doctorID != nil {
		query = query.Where("doctor_id = ?", *doctorID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if date != nil {
		dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		dayEnd := dayStart.Add(24 * time.Hour)
		query = query.Where("visit_date >= ? AND visit_date < ?", dayStart, dayEnd)
	}
	
	if scope != nil && scope.DoctorID != nil {
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}

	var list []models.Encounter
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) FindByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error) {
	var e models.Encounter
	err := r.db.
		Preload("Patient").
		Preload("Department").
		Preload("Doctor.User").
		Preload("Consultations.Diagnoses").
		Preload("Diagnoses").
		Preload("Prescriptions.Items").
		First(&e, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	
	if scope != nil && scope.DoctorID != nil {
		if e.DoctorID != *scope.DoctorID {
			return nil, ErrNotFound // Or a forbidden error, but NotFound is safer against probing
		}
	}
	
	return &e, err
}

func (r *repository) UpdateStatus(id uuid.UUID, status string) (*models.Encounter, error) {
	result := r.db.Model(&models.Encounter{}).Where("id = ?", id).Update("status", status)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.FindByID(id, nil)
}

func (r *repository) SetReferral(id uuid.UUID, referralID uuid.UUID) error {
	return r.db.Model(&models.Encounter{}).Where("id = ?", id).Update("referral_id", referralID).Error
}
