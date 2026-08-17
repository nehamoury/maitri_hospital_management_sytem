package doctors

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when a doctor id doesn't match any row.
var ErrNotFound = errors.New("doctor not found")

// ErrDuplicateEmail / ErrDuplicateMobile are returned when the linked
// user account fields collide with an existing user.
var (
	ErrDuplicateEmail  = errors.New("a user with this email already exists")
	ErrDuplicateMobile = errors.New("a user with this mobile number already exists")
)

// Repository is the data-access layer for doctors. CreateWithUser runs
// inside a single transaction because a doctor is always backed by a
// user account — both rows must be created together or not at all.
type Repository interface {
	CreateWithUser(user *models.User, doctor *models.Doctor) error
	FindAll() ([]models.Doctor, error)
	FindByID(id uuid.UUID) (*models.Doctor, error)
	FindByUserID(userID uuid.UUID) (*models.Doctor, error)
	Update(doctor *models.Doctor) error
	Delete(id uuid.UUID) error
	Count() (int64, error)
	EmailExists(email string) bool
	MobileExists(mobile string) bool
	DoctorRoleID() (uuid.UUID, error)
	HasInConsultation(id uuid.UUID) (bool, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateWithUser(user *models.User, doctor *models.Doctor) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		doctor.UserID = user.ID
		if err := tx.Create(doctor).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *repository) FindAll() ([]models.Doctor, error) {
	var doctors []models.Doctor
	err := r.db.Preload("User").Preload("Department").Order("created_at desc").Find(&doctors).Error
	return doctors, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").Preload("Department").First(&doctor, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doctor, err
}

func (r *repository) FindByUserID(userID uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").Preload("Department").First(&doctor, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doctor, err
}

func (r *repository) Update(doctor *models.Doctor) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&doctor.User).Error; err != nil {
			return err
		}
		if err := tx.Omit("User", "Department").Save(doctor).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *repository) Delete(id uuid.UUID) error {
	doctor, err := r.FindByID(id)
	if err != nil {
		return err
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&models.Doctor{}, "id = ?", id).Error; err != nil {
			return err
		}
		// Deactivate the linked login rather than deleting the user
		// outright, preserving referential integrity with historical
		// appointments that reference this doctor.
		return tx.Model(&models.User{}).Where("id = ?", doctor.UserID).Update("is_active", false).Error
	})
}

func (r *repository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Doctor{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
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

func (r *repository) DoctorRoleID() (uuid.UUID, error) {
	var role models.Role
	if err := r.db.Where("name = ?", models.RoleDoctor).First(&role).Error; err != nil {
		return uuid.Nil, err
	}
	return role.ID, nil
}

// HasInConsultation reports whether the doctor currently has an encounter
// in the IN_CONSULTATION state — i.e. the doctor is actively seeing a
// patient right now.
func (r *repository) HasInConsultation(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Encounter{}).
		Where("doctor_id = ? AND status = ? AND deleted_at IS NULL", id, models.EncounterInConsultation).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
