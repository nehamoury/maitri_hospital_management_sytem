package auth

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"gorm.io/gorm"
)

// ErrUserNotFound is returned when no active user matches the given
// lookup criteria.
var ErrUserNotFound = errors.New("user not found")

// ErrDuplicateEmail is returned when updating a profile would collide
// with another user's email address.
var ErrDuplicateEmail = errors.New("a user with this email already exists")

// Repository is the data-access layer for authentication. It reads users
// for sessions and supports the small set of self-service writes needed
// by /auth/me (profile update + password change); account administration
// lives in the users module.
type Repository interface {
	FindActiveUserByEmail(email string) (*models.User, error)
	FindUserByID(id string) (*models.User, error)
	EmailTaken(email, excludeID string) bool
	UpdateProfile(id, fullName, email, mobile string) error
	SetPassword(id, hash string) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindActiveUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Role.Permissions").
		Where("email = ? AND is_active = ?", email, true).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) FindUserByID(id string) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Role.Permissions").
		Where("id = ? AND is_active = ?", id, true).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// EmailTaken reports whether any user other than excludeID uses the email.
func (r *repository) EmailTaken(email, excludeID string) bool {
	var count int64
	r.db.Model(&models.User{}).
		Where("lower(email) = lower(?) AND id <> ?", email, excludeID).
		Count(&count)
	return count > 0
}

// UpdateProfile persists the caller's edited profile fields.
func (r *repository) UpdateProfile(id, fullName, email, mobile string) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"full_name": fullName,
		"email":     email,
		"mobile":    mobile,
	}).Error
}

// SetPassword replaces the stored password hash for a user.
func (r *repository) SetPassword(id, hash string) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("password_hash", hash).Error
}
