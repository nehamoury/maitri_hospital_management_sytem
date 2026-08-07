package dashboard

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"gorm.io/gorm"
)

// Repository runs the aggregate queries backing the dashboard. It reads
// directly from the shared tables rather than depending on the other
// modules' repositories, keeping dashboard a self-contained, read-only
// reporting layer.
type Repository interface {
	CountPatientsRegisteredOn(day time.Time) (int64, error)
	CountAppointmentsOn(day time.Time, scope *models.DataScope) (int64, error)
	CountActiveDepartments() (int64, error)
	CountActiveDoctors() (int64, error)
	RecentPatients(limit int) ([]models.Patient, error)
	AppointmentsOn(day time.Time, scope *models.DataScope) ([]models.Appointment, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func dayBounds(day time.Time) (time.Time, time.Time) {
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location())
	return start, start.Add(24 * time.Hour)
}

func (r *repository) CountPatientsRegisteredOn(day time.Time) (int64, error) {
	start, end := dayBounds(day)
	var count int64
	err := r.db.Model(&models.Patient{}).
		Where("created_at >= ? AND created_at < ?", start, end).
		Count(&count).Error
	return count, err
}

func (r *repository) CountAppointmentsOn(day time.Time, scope *models.DataScope) (int64, error) {
	start, end := dayBounds(day)
	var count int64
	query := r.db.Model(&models.Appointment{}).
		Where("appointment_date >= ? AND appointment_date < ? AND status != ?", start, end, models.AppointmentCancelled)
	
	if scope != nil && scope.DoctorID != nil {
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}
		
	err := query.Count(&count).Error
	return count, err
}

func (r *repository) CountActiveDepartments() (int64, error) {
	var count int64
	err := r.db.Model(&models.Department{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
}

func (r *repository) CountActiveDoctors() (int64, error) {
	var count int64
	err := r.db.Model(&models.Doctor{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
}

func (r *repository) RecentPatients(limit int) ([]models.Patient, error) {
	var patients []models.Patient
	err := r.db.Order("created_at desc").Limit(limit).Find(&patients).Error
	return patients, err
}

func (r *repository) AppointmentsOn(day time.Time, scope *models.DataScope) ([]models.Appointment, error) {
	start, end := dayBounds(day)
	var appts []models.Appointment
	query := r.db.Preload("Patient").Preload("Doctor.User").
		Where("appointment_date >= ? AND appointment_date < ?", start, end).
		Order("token_number asc")
		
	if scope != nil && scope.DoctorID != nil {
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}
	
	err := query.Find(&appts).Error
	return appts, err
}
