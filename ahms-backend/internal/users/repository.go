package users

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when a user id doesn't match any row.
var ErrNotFound = errors.New("user not found")

// ErrDuplicateEmail / ErrDuplicateMobile are returned when the new
// account fields collide with an existing user.
var (
	ErrDuplicateEmail  = errors.New("a user with this email already exists")
	ErrDuplicateMobile = errors.New("a user with this mobile number already exists")
)

// ErrRoleNotFound is returned when the selected role doesn't exist.
var ErrRoleNotFound = errors.New("role not found")

// Repository is the data-access layer for staff users.
type Repository interface {
	Create(user *models.User) error
	FindAll() ([]models.User, error)
	FindByID(id uuid.UUID) (*models.User, error)
	Update(user *models.User) error
	Delete(id uuid.UUID) error
	EmailExists(email string) bool
	MobileExists(mobile string) bool
	RoleExists(roleID uuid.UUID) (bool, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *repository) FindAll() ([]models.User, error) {
	var users []models.User
	err := r.db.Preload("Role").
		Where("role_id IS NOT NULL").
		Order("created_at desc").
		Find(&users).Error
	return users, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Role").First(&user, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &user, err
}

func (r *repository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *repository) Delete(id uuid.UUID) error {
	result := r.db.Model(&models.User{}).Where("id = ?", id).Update("is_active", false)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *repository) EmailExists(email string) bool {
	var count int64
	r.db.Model(&models.User{}).Where("lower(email) = lower(?)", email).Count(&count)
	return count > 0
}

func (r *repository) MobileExists(mobile string) bool {
	var count int64
	r.db.Model(&models.User{}).Where("mobile = ?", mobile).Count(&count)
	return count > 0
}

func (r *repository) RoleExists(roleID uuid.UUID) (bool, error) {
	var count int64
	if err := r.db.Model(&models.Role{}).Where("id = ?", roleID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
