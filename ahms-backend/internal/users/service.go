package users

import (
	"fmt"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/google/uuid"
)

// Service contains staff-user business logic.
type Service interface {
	Create(req CreateUserRequest) (*models.User, error)
	List() ([]models.User, error)
	GetByID(id uuid.UUID) (*models.User, error)
	Update(id uuid.UUID, req UpdateUserRequest) (*models.User, error)
	Delete(id uuid.UUID, actingUserID uuid.UUID) error
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(req CreateUserRequest) (*models.User, error) {
	if s.repo.EmailExists(req.Email) {
		return nil, ErrDuplicateEmail
	}
	if s.repo.MobileExists(req.Mobile) {
		return nil, ErrDuplicateMobile
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return nil, fmt.Errorf("invalid role_id: %w", err)
	}
	ok, err := s.repo.RoleExists(roleID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrRoleNotFound
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
		RoleID:       roleID,
	}
	if err := s.repo.Create(user); err != nil {
		return nil, err
	}
	return s.repo.FindByID(user.ID)
}

func (s *service) List() ([]models.User, error) {
	return s.repo.FindAll()
}

func (s *service) GetByID(id uuid.UUID) (*models.User, error) {
	return s.repo.FindByID(id)
}

func (s *service) Update(id uuid.UUID, req UpdateUserRequest) (*models.User, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return nil, fmt.Errorf("invalid role_id: %w", err)
	}
	ok, err := s.repo.RoleExists(roleID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrRoleNotFound
	}

	if req.Email != user.Email && s.repo.EmailExists(req.Email) {
		return nil, ErrDuplicateEmail
	}
	if req.Mobile != user.Mobile && s.repo.MobileExists(req.Mobile) {
		return nil, ErrDuplicateMobile
	}

	user.FullName = req.FullName
	user.Email = req.Email
	user.Mobile = req.Mobile
	user.RoleID = roleID
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if req.Password != "" {
		hash, err := utils.HashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = hash
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}
	return s.repo.FindByID(id)
}

func (s *service) Delete(id uuid.UUID, actingUserID uuid.UUID) error {
	if id == actingUserID {
		return ErrSelfDelete
	}
	user, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if user.Role.Name == models.RoleSuperAdmin {
		return ErrCannotDeactivateSuperAdmin
	}
	return s.repo.Delete(id)
}
