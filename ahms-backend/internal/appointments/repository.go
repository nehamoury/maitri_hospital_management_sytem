package appointments

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrNotFound is returned when an appointment id doesn't match any row.
var ErrNotFound = errors.New("appointment not found")

// Repository is the data-access layer for appointments.
type Repository interface {
	CreateWithToken(appt *models.Appointment) error
	FindAll(doctorID, patientID *uuid.UUID, date *time.Time, scope *models.DataScope) ([]models.Appointment, error)
	FindByID(id uuid.UUID, scope *models.DataScope) (*models.Appointment, error)
	UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Appointment, error)
	CountOnDate(day time.Time) (int64, error)
	FindOrCreatePatient(fullName, mobile, email string) (*models.Patient, error)
	GetSystemUserID() (uuid.UUID, error)
	CountSlotsOnDay(doctorID uuid.UUID, dayStart, dayEnd time.Time) (map[string]int64, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// CreateWithToken assigns the next sequential token number for
// (DoctorID, AppointmentDate) and creates the appointment, all inside a
// transaction that row-locks the doctor record for the duration — this
// serializes concurrent booking requests for the same doctor so two
// patients can never receive the same token for the same day.
func (r *repository) CreateWithToken(appt *models.Appointment) error {
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

		return tx.Create(appt).Error
	})
}

func (r *repository) FindAll(doctorID, patientID *uuid.UUID, date *time.Time, scope *models.DataScope) ([]models.Appointment, error) {
	query := r.db.Preload("Patient").Preload("Doctor.User").Order("appointment_date desc, token_number asc")
	if scope != nil && scope.DoctorID != nil {
		// A doctor only ever sees their own appointment queue.
		query = query.Where("appointments.doctor_id = ?", *scope.DoctorID)
	}
	if doctorID != nil {
		query = query.Where("doctor_id = ?", *doctorID)
	}
	if patientID != nil {
		query = query.Where("patient_id = ?", *patientID)
	}
	if date != nil {
		dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		dayEnd := dayStart.Add(24 * time.Hour)
		query = query.Where("appointment_date >= ? AND appointment_date < ?", dayStart, dayEnd)
	}
	var appts []models.Appointment
	err := query.Find(&appts).Error
	return appts, err
}

func (r *repository) FindByID(id uuid.UUID, scope *models.DataScope) (*models.Appointment, error) {
	var appt models.Appointment
	query := r.db.Preload("Patient").Preload("Doctor.User").Where("id = ?", id)
	if scope != nil && scope.DoctorID != nil {
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}
	err := query.First(&appt).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &appt, err
}

func (r *repository) UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Appointment, error) {
	query := r.db.Model(&models.Appointment{}).Where("id = ?", id)
	if scope != nil && scope.DoctorID != nil {
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}
	result := query.Update("status", status)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.FindByID(id, scope)
}

func (r *repository) CountOnDate(day time.Time) (int64, error) {
	dayStart := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	var count int64
	err := r.db.Model(&models.Appointment{}).
		Where("appointment_date >= ? AND appointment_date < ? AND status != ?", dayStart, dayEnd, models.AppointmentCancelled).
		Count(&count).Error
	return count, err
}

func (r *repository) FindOrCreatePatient(fullName, mobile, email string) (*models.Patient, error) {
	var patient models.Patient
	if err := r.db.Where("mobile = ? AND deleted_at IS NULL", mobile).First(&patient).Error; err == nil {
		return &patient, nil
	}

	year := time.Now().Year()
	var counter models.UHIDCounter
	err := r.db.Where("year = ?", year).First(&counter).Error
	if err != nil {
		counter = models.UHIDCounter{Year: year, LastNumber: 0}
		r.db.Create(&counter)
	}
	nextNumber := counter.LastNumber + 1
	uhID := fmt.Sprintf("MCAH-%d-%06d", year, nextNumber)
	r.db.Model(&models.UHIDCounter{}).Where("year = ?", year).Update("last_number", nextNumber)

	var systemUser models.User
	r.db.Where("email = ?", "admin@ahms.local").First(&systemUser)

	patient = models.Patient{
		UHID:              uhID,
		FullName:          fullName,
		Mobile:            mobile,
		Email:             email,
		Gender:            "OTHER",
		RegisteredByUserID: systemUser.ID,
	}
	if err := r.db.Create(&patient).Error; err != nil {
		return nil, err
	}
	return &patient, nil
}

func (r *repository) GetSystemUserID() (uuid.UUID, error) {
	var user models.User
	if err := r.db.Where("email = ?", "admin@ahms.local").First(&user).Error; err != nil {
		return uuid.Nil, fmt.Errorf("system user not found")
	}
	return user.ID, nil
}

// CountSlotsOnDay returns how many non-cancelled appointments each time
// slot carries for a doctor on a single day. Slots with no bookings are
// simply absent from the map (their count is treated as zero).
func (r *repository) CountSlotsOnDay(doctorID uuid.UUID, dayStart, dayEnd time.Time) (map[string]int64, error) {
	type slotRow struct {
		Slot string
		C    int64
	}
	var rows []slotRow
	err := r.db.Model(&models.Appointment{}).
		Select("time_slot AS slot, COUNT(*) AS c").
		Where("doctor_id = ? AND appointment_date >= ? AND appointment_date < ? AND status != ? AND time_slot <> ''",
			doctorID, dayStart, dayEnd, models.AppointmentCancelled).
		Group("time_slot").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	counts := make(map[string]int64, len(rows))
	for _, row := range rows {
		counts[row.Slot] = row.C
	}
	return counts, nil
}
