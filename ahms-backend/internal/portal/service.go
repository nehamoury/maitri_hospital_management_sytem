package portal

import (
	"time"

	"github.com/ahms/backend/internal/auth"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/google/uuid"
)

// Service contains patient-portal business logic.
type Service interface {
	Login(uhid, mobile string) (*LoginResponse, error)
	Profile(patientID uuid.UUID) (*ProfileResponse, error)
	Appointments(patientID uuid.UUID) ([]PortalAppointmentResponse, error)
	BookAppointment(patientID uuid.UUID, req BookAppointmentRequest) (*PortalAppointmentResponse, error)
	Prescriptions(patientID uuid.UUID) ([]PortalPrescriptionResponse, error)
	Bills(patientID uuid.UUID) ([]PortalBillResponse, error)
}

type service struct {
	repo       Repository
	jwtManager *utils.JWTManager
}

// NewService builds a portal Service.
func NewService(repo Repository, jwtManager *utils.JWTManager) Service {
	return &service{repo: repo, jwtManager: jwtManager}
}

func (s *service) Login(uhid, mobile string) (*LoginResponse, error) {
	patient, err := s.repo.FindPatientByUhidMobile(uhid, mobile)
	if err != nil {
		return nil, err
	}

	permissions, err := s.repo.FindRolePermissionsByName(models.RolePatient)
	if err != nil {
		return nil, err
	}

	email := patient.Email
	if email == "" {
		email = "patient@ahms.local"
	}
	accessToken, err := s.jwtManager.GenerateAccessToken(patient.ID, email, models.RolePatient)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.jwtManager.GenerateRefreshToken(patient.ID, email, models.RolePatient)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600,
		User: auth.UserResponse{
			ID:          patient.ID.String(),
			FullName:    patient.FullName,
			Email:       email,
			Mobile:      patient.Mobile,
			RoleName:    models.RolePatient,
			Permissions: permissions,
		},
	}, nil
}

func (s *service) Profile(patientID uuid.UUID) (*ProfileResponse, error) {
	patient, err := s.repo.FindPatientByID(patientID)
	if err != nil {
		return nil, err
	}
	profile := toProfile(patient)
	return &profile, nil
}

func (s *service) Appointments(patientID uuid.UUID) ([]PortalAppointmentResponse, error) {
	list, err := s.repo.FindAppointmentsByPatient(patientID)
	if err != nil {
		return nil, err
	}
	resp := make([]PortalAppointmentResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toAppointment(&list[i]))
	}
	return resp, nil
}

func (s *service) BookAppointment(patientID uuid.UUID, req BookAppointmentRequest) (*PortalAppointmentResponse, error) {
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
	}
	if err := s.repo.CreateAppointmentWithToken(appt); err != nil {
		return nil, err
	}

	// Re-read with preloads to fill doctor name.
	list, err := s.repo.FindAppointmentsByPatient(patientID)
	if err != nil {
		return nil, err
	}
	for i := range list {
		if list[i].ID == appt.ID {
			resp := toAppointment(&list[i])
			return &resp, nil
		}
	}
	resp := toAppointment(&models.Appointment{
		BaseModel:       models.BaseModel{ID: appt.ID},
		DoctorID:        appt.DoctorID,
		AppointmentDate: appt.AppointmentDate,
		TokenNumber:     appt.TokenNumber,
		Status:          appt.Status,
		Reason:          appt.Reason,
	})
	return &resp, nil
}

func (s *service) Prescriptions(patientID uuid.UUID) ([]PortalPrescriptionResponse, error) {
	list, err := s.repo.FindPrescriptionsByPatient(patientID)
	if err != nil {
		return nil, err
	}
	resp := make([]PortalPrescriptionResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toPrescription(&list[i]))
	}
	return resp, nil
}

func (s *service) Bills(patientID uuid.UUID) ([]PortalBillResponse, error) {
	list, err := s.repo.FindBillsByPatient(patientID)
	if err != nil {
		return nil, err
	}
	resp := make([]PortalBillResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toBill(&list[i]))
	}
	return resp, nil
}
