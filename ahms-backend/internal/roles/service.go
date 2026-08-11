package roles

import (
	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains role-management business logic.
type Service interface {
	List() ([]models.Role, error)
	GetByID(id uuid.UUID) (*models.Role, error)
	Permissions() ([]models.Permission, error)
	UpdatePermissions(id uuid.UUID, permissionNames []string) (*models.Role, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) List() ([]models.Role, error) {
	return s.repo.FindAll()
}

func (s *service) GetByID(id uuid.UUID) (*models.Role, error) {
	return s.repo.FindByID(id)
}

func (s *service) Permissions() ([]models.Permission, error) {
	return s.repo.FindPermissions()
}

func (s *service) UpdatePermissions(id uuid.UUID, permissionNames []string) (*models.Role, error) {
	if err := s.repo.UpdatePermissions(id, permissionNames); err != nil {
		return nil, err
	}
	return s.repo.FindByID(id)
}
