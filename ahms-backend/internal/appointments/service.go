package appointments

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains appointment business logic.
type Service interface {
	Book(req CreateAppointmentRequest, bookedByUserID uuid.UUID) (*models.Appointment, error)
	PublicBook(req PublicAppointmentRequest) (*models.Appointment, error)
	List(doctorID, patientID *uuid.UUID, date *time.Time) ([]models.Appointment, error)
	GetByID(id uuid.UUID) (*models.Appointment, error)
	UpdateStatus(id uuid.UUID, status string) (*models.Appointment, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Book(req CreateAppointmentRequest, bookedByUserID uuid.UUID) (*models.Appointment, error) {
	patientID, err := uuid.Parse(req.PatientID)
	if err != nil {
		return nil, err
	}
	doctorID, err := uuid.Parse(req.DoctorID)
	if err != nil {
		return nil, err
	}
	date, err := time.Parse("2006-01-02", req.AppointmentDate)
	if err != nil {
		return nil, err
	}

	appt := &models.Appointment{
		PatientID:       patientID,
		DoctorID:        doctorID,
		AppointmentDate: date,
		Reason:          req.Reason,
		BookedByUserID:  bookedByUserID,
	}

	if err := s.repo.CreateWithToken(appt); err != nil {
		return nil, err
	}

	return s.repo.FindByID(appt.ID)
}

func (s *service) PublicBook(req PublicAppointmentRequest) (*models.Appointment, error) {
	doctorID, err := uuid.Parse(req.DoctorID)
	if err != nil {
		return nil, err
	}
	date, err := time.Parse("2006-01-02", req.AppointmentDate)
	if err != nil {
		return nil, err
	}

	patient, err := s.repo.FindOrCreatePatient(req.FullName, req.Mobile, req.Email)
	if err != nil {
		return nil, err
	}

	systemUserID, err := s.repo.GetSystemUserID()
	if err != nil {
		return nil, err
	}

	appt := &models.Appointment{
		PatientID:       patient.ID,
		DoctorID:        doctorID,
		AppointmentDate: date,
		Reason:          req.Reason,
		BookedByUserID:  systemUserID,
	}

	if err := s.repo.CreateWithToken(appt); err != nil {
		return nil, err
	}

	return s.repo.FindByID(appt.ID)
}

func (s *service) List(doctorID, patientID *uuid.UUID, date *time.Time) ([]models.Appointment, error) {
	return s.repo.FindAll(doctorID, patientID, date)
}

func (s *service) GetByID(id uuid.UUID) (*models.Appointment, error) {
	return s.repo.FindByID(id)
}

func (s *service) UpdateStatus(id uuid.UUID, status string) (*models.Appointment, error) {
	return s.repo.UpdateStatus(id, status)
}
