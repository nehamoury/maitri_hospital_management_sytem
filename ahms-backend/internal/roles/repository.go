package roles

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when a role id doesn't match any row.
var ErrNotFound = errors.New("role not found")

// ErrInvalidPermission is returned when a requested permission name is
// not part of the seeded catalog.
var ErrInvalidPermission = errors.New("one or more permission names are not recognized")

// Repository is the data-access layer for roles.
type Repository interface {
	FindAll() ([]models.Role, error)
	FindByID(id uuid.UUID) (*models.Role, error)
	FindPermissions() ([]models.Permission, error)
	UpdatePermissions(roleID uuid.UUID, permissionNames []string) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindAll() ([]models.Role, error) {
	var roles []models.Role
	err := r.db.Preload("Permissions").Order("created_at asc").Find(&roles).Error
	return roles, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.Role, error) {
	var role models.Role
	err := r.db.Preload("Permissions").First(&role, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &role, err
}

func (r *repository) FindPermissions() ([]models.Permission, error) {
	var permissions []models.Permission
	err := r.db.Order("name asc").Find(&permissions).Error
	return permissions, err
}

// UpdatePermissions replaces the role's permission set. Invalid names are
// rejected so a typo can never silently strip a role's access.
func (r *repository) UpdatePermissions(roleID uuid.UUID, permissionNames []string) error {
	role, err := r.FindByID(roleID)
	if err != nil {
		return err
	}

	var permissions []models.Permission
	if len(permissionNames) > 0 {
		if err := r.db.Where("name IN ?", permissionNames).Find(&permissions).Error; err != nil {
			return err
		}
		if len(permissions) != len(permissionNames) {
			return ErrInvalidPermission
		}
	}

	return r.db.Model(role).Association("Permissions").Replace(permissions)
}
