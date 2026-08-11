package portal

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrNotFound is returned when a patient/id doesn't match any row.
var ErrNotFound = errors.New("record not found")

// ErrInvalidCredentials is returned when UHID + mobile don't match.
var ErrInvalidCredentials = errors.New("invalid uhid or mobile")

// Repository is the data-access layer for the patient portal.
type Repository interface {
	FindPatientByUhidMobile(uhid, mobile string) (*models.Patient, error)
	FindPatientByID(id uuid.UUID) (*models.Patient, error)
	FindAppointmentsByPatient(patientID uuid.UUID) ([]models.Appointment, error)
	FindPrescriptionsByPatient(patientID uuid.UUID) ([]models.Prescription, error)
	FindBillsByPatient(patientID uuid.UUID) ([]models.Bill, error)
	CreateAppointmentWithToken(appt *models.Appointment) error
	FindRolePermissionsByName(name string) ([]string, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a portal Repository.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindPatientByUhidMobile(uhid, mobile string) (*models.Patient, error) {
	var p models.Patient
	err := r.db.First(&p, "uhid = ? AND mobile = ? AND is_active = ?", uhid, mobile, true).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrInvalidCredentials
	}
	return &p, err
}

func (r *repository) FindPatientByID(id uuid.UUID) (*models.Patient, error) {
	var p models.Patient
	err := r.db.First(&p, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (r *repository) FindAppointmentsByPatient(patientID uuid.UUID) ([]models.Appointment, error) {
	var list []models.Appointment
	err := r.db.Preload("Patient").Preload("Doctor.User").
		Where("patient_id = ?", patientID).
		Order("appointment_date desc, token_number asc").
		Find(&list).Error
	return list, err
}

func (r *repository) FindPrescriptionsByPatient(patientID uuid.UUID) ([]models.Prescription, error) {
	var list []models.Prescription
	err := r.db.Joins("JOIN encounters ON encounters.id = prescriptions.encounter_id").
		Preload("Doctor.User").Preload("Items").
		Where("encounters.patient_id = ?", patientID).
		Order("prescriptions.created_at desc").
		Find(&list).Error
	return list, err
}

func (r *repository) FindBillsByPatient(patientID uuid.UUID) ([]models.Bill, error) {
	var list []models.Bill
	err := r.db.Preload("Items").Preload("Payments").
		Where("patient_id = ?", patientID).
		Order("created_at desc").
		Find(&list).Error
	return list, err
}

// CreateAppointmentWithToken mirrors the appointments module: assigns the
// next token for (DoctorID, AppointmentDate) inside a transaction that
// locks the doctor row so concurrent bookings never collide.
func (r *repository) CreateAppointmentWithToken(appt *models.Appointment) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var doctor models.Doctor
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&doctor, "id = ?", appt.DoctorID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("doctor not found")
			}
			return err
		}

		dayStart := time.Date(
			appt.AppointmentDate.Year(), appt.AppointmentDate.Month(), appt.AppointmentDate.Day(),
			0, 0, 0, 0, appt.AppointmentDate.Location(),
		)
		dayEnd := dayStart.Add(24 * time.Hour)

		var maxToken int
		row := tx.Model(&models.Appointment{}).
			Select("COALESCE(MAX(token_number), 0)").
			Where("doctor_id = ? AND appointment_date >= ? AND appointment_date < ? AND status != ?",
				appt.DoctorID, dayStart, dayEnd, models.AppointmentCancelled).
			Row()
		if err := row.Scan(&maxToken); err != nil {
			return err
		}

		appt.TokenNumber = maxToken + 1
		appt.Status = models.AppointmentScheduled
		appt.AppointmentDate = dayStart

		var systemUser models.User
		if err := tx.Where("email = ?", "admin@ahms.local").First(&systemUser).Error; err != nil {
			return fmt.Errorf("system user for booking not found: %w", err)
		}
		appt.BookedByUserID = systemUser.ID

		return tx.Create(appt).Error
	})
}

func (r *repository) FindRolePermissionsByName(name string) ([]string, error) {
	var role models.Role
	if err := r.db.Preload("Permissions").Where("name = ?", name).First(&role).Error; err != nil {
		return nil, err
	}
	permissions := make([]string, 0, len(role.Permissions))
	for _, p := range role.Permissions {
		permissions = append(permissions, p.Name)
	}
	return permissions, nil
}
