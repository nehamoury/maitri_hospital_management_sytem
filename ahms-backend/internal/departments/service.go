package departments

import (
	"errors"
	"regexp"
	"strings"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains department business logic.
type Service interface {
	Create(req CreateDepartmentRequest) (*models.Department, error)
	List() ([]models.Department, error)
	GetByID(id uuid.UUID) (*models.Department, error)
	Update(id uuid.UUID, req UpdateDepartmentRequest) (*models.Department, error)
	Delete(id uuid.UUID) error
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

var nonAlphaNumeric = regexp.MustCompile(`[^a-zA-Z0-9]+`)

// generateCode derives a department code from its name when one is not
// provided (e.g. "Nadi Pariksha" -> "NADIPAR"), uppercased and trimmed
// to 8 characters.
func generateCode(name string) string {
	clean := nonAlphaNumeric.ReplaceAllString(name, "")
	if clean == "" {
		clean = "DEPT"
	}
	code := strings.ToUpper(clean)
	if len(code) > 8 {
		code = code[:8]
	}
	return code
}

func (s *service) Create(req CreateDepartmentRequest) (*models.Department, error) {
	if !models.ValidDepartmentTypes[req.Type] {
		return nil, ErrInvalidType
	}
	if _, err := s.repo.FindByName(req.Name); err == nil {
		return nil, ErrDuplicateName
	} else if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		code = generateCode(req.Name)
	}
	if _, err := s.repo.FindByCode(code); err == nil {
		return nil, ErrDuplicateCode
	} else if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	dept := &models.Department{
		Code:        code,
		Name:        req.Name,
		Type:        req.Type,
		Description: req.Description,
		DefaultFee:  req.DefaultFee,
		IsActive:    true,
	}
	if err := s.repo.Create(dept); err != nil {
		return nil, err
	}
	return dept, nil
}

func (s *service) List() ([]models.Department, error) {
	return s.repo.FindAll()
}

func (s *service) GetByID(id uuid.UUID) (*models.Department, error) {
	return s.repo.FindByID(id)
}

func (s *service) Update(id uuid.UUID, req UpdateDepartmentRequest) (*models.Department, error) {
	dept, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if !models.ValidDepartmentTypes[req.Type] {
		return nil, ErrInvalidType
	}

	if existing, err := s.repo.FindByName(req.Name); err == nil && existing.ID != id {
		return nil, ErrDuplicateName
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		code = generateCode(req.Name)
	}
	if existing, err := s.repo.FindByCode(code); err == nil && existing.ID != id {
		return nil, ErrDuplicateCode
	}

	dept.Code = code
	dept.Name = req.Name
	dept.Type = req.Type
	dept.Description = req.Description
	dept.DefaultFee = req.DefaultFee
	if req.IsActive != nil {
		dept.IsActive = *req.IsActive
	}

	if err := s.repo.Update(dept); err != nil {
		return nil, err
	}
	return dept, nil
}

func (s *service) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}
