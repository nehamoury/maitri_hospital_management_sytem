package doctors

import (
	"fmt"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/google/uuid"
)

// Service contains doctor business logic.
type Service interface {
	Create(req CreateDoctorRequest) (*models.Doctor, error)
	List() ([]models.Doctor, error)
	GetByID(id uuid.UUID) (*models.Doctor, error)
	Update(id uuid.UUID, req UpdateDoctorRequest) (*models.Doctor, error)
	Delete(id uuid.UUID) error
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(req CreateDoctorRequest) (*models.Doctor, error) {
	if s.repo.EmailExists(req.Email) {
		return nil, ErrDuplicateEmail
	}
	if s.repo.MobileExists(req.Mobile) {
		return nil, ErrDuplicateMobile
	}

	deptID, err := uuid.Parse(req.DepartmentID)
	if err != nil {
		return nil, fmt.Errorf("invalid department_id: %w", err)
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		FullName:     req.FullName,
		Email:        req.Email,
		Mobile:       req.Mobile,
		PasswordHash: hash,
		IsActive:     true,
	}

	roleID, err := s.repo.DoctorRoleID()
	if err != nil {
		return nil, fmt.Errorf("could not resolve DOCTOR role: %w", err)
	}
	user.RoleID = roleID

	doctor := &models.Doctor{
		DepartmentID:    deptID,
		Specialization:  req.Specialization,
		Qualification:   req.Qualification,
		ExperienceYears: req.ExperienceYears,
		ConsultationFee: req.ConsultationFee,
		IsActive:        true,
	}

	if err := s.repo.CreateWithUser(user, doctor); err != nil {
		return nil, err
	}

	created, err := s.repo.FindByID(doctor.ID)
	if err != nil {
		return doctor, nil
	}
	return created, nil
}

func (s *service) List() ([]models.Doctor, error) {
	return s.repo.FindAll()
}

func (s *service) GetByID(id uuid.UUID) (*models.Doctor, error) {
	return s.repo.FindByID(id)
}

func (s *service) Update(id uuid.UUID, req UpdateDoctorRequest) (*models.Doctor, error) {
	doctor, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	deptID, err := uuid.Parse(req.DepartmentID)
	if err != nil {
		return nil, fmt.Errorf("invalid department_id: %w", err)
	}

	doctor.DepartmentID = deptID
	doctor.Specialization = req.Specialization
	doctor.Qualification = req.Qualification
	doctor.ExperienceYears = req.ExperienceYears
	doctor.ConsultationFee = req.ConsultationFee
	if req.IsActive != nil {
		doctor.IsActive = *req.IsActive
	}

	if err := s.repo.Update(doctor); err != nil {
		return nil, err
	}
	return s.repo.FindByID(id)
}

func (s *service) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}
