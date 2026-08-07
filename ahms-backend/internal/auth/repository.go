package auth

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"gorm.io/gorm"
)

// ErrUserNotFound is returned when no active user matches the given
// lookup criteria.
var ErrUserNotFound = errors.New("user not found")

// Repository is the data-access layer for authentication. It only reads
// users (account creation happens in the users module); this keeps the
// auth module focused solely on login/session concerns.
type Repository interface {
	FindActiveUserByEmail(email string) (*models.User, error)
	FindUserByID(id string) (*models.User, error)
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
