package departments

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when a department id doesn't match any row.
var ErrNotFound = errors.New("department not found")

// ErrDuplicateName is returned when a department name already exists.
var ErrDuplicateName = errors.New("a department with this name already exists")

// ErrDuplicateCode is returned when a department code already exists.
var ErrDuplicateCode = errors.New("a department with this code already exists")

// ErrInvalidType is returned when the department type is not in the allow-list.
var ErrInvalidType = errors.New("invalid department type")

// Repository is the data-access layer for departments.
type Repository interface {
	Create(dept *models.Department) error
	FindAll() ([]models.Department, error)
	FindByID(id uuid.UUID) (*models.Department, error)
	FindByName(name string) (*models.Department, error)
	FindByCode(code string) (*models.Department, error)
	Update(dept *models.Department) error
	Delete(id uuid.UUID) error
	Count() (int64, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(dept *models.Department) error {
	return r.db.Create(dept).Error
}

func (r *repository) FindAll() ([]models.Department, error) {
	var depts []models.Department
	err := r.db.Order("name asc").Find(&depts).Error
	return depts, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.Department, error) {
	var dept models.Department
	err := r.db.First(&dept, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &dept, err
}

func (r *repository) FindByName(name string) (*models.Department, error) {
	var dept models.Department
	err := r.db.Where("lower(name) = lower(?)", name).First(&dept).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &dept, err
}

func (r *repository) FindByCode(code string) (*models.Department, error) {
	var dept models.Department
	err := r.db.Where("lower(code) = lower(?)", code).First(&dept).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &dept, err
}

func (r *repository) Update(dept *models.Department) error {
	return r.db.Save(dept).Error
}

func (r *repository) Delete(id uuid.UUID) error {
	result := r.db.Delete(&models.Department{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *repository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Department{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
}
