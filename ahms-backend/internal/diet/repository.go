package diet

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	CreateDietPlan(plan *models.DietPlan) error
	GetDietPlan(id uuid.UUID) (*models.DietPlan, error)
	GetActiveDietPlanForAdmission(admissionID uuid.UUID) (*models.DietPlan, error)
	ListDietPlansForAdmission(admissionID uuid.UUID) ([]models.DietPlan, error)
	DeactivatePlansForAdmission(admissionID uuid.UUID) error

	// Meal orders
	CreateMealOrders(meals []models.MealOrder) error
	GetMealOrder(id uuid.UUID) (*models.MealOrder, error)
	UpdateMealOrder(meal *models.MealOrder) error
	GetMealOrdersByFilter(f KitchenSheetFilter) ([]models.MealOrder, error)

	// Helper queries for active IPD bed allocations
	GetActiveIPDAdmissions(t time.Time) ([]models.Admission, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// ─── Diet Plans ───────────────────────────────────────────────────────────────

func (r *repository) CreateDietPlan(plan *models.DietPlan) error {
	return r.db.Create(plan).Error
}

func (r *repository) GetDietPlan(id uuid.UUID) (*models.DietPlan, error) {
	var plan models.DietPlan
	if err := r.db.Preload("OrderedByUser").First(&plan, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *repository) GetActiveDietPlanForAdmission(admissionID uuid.UUID) (*models.DietPlan, error) {
	var plan models.DietPlan
	err := r.db.Preload("OrderedByUser").
		Where("admission_id = ? AND is_active = ?", admissionID, true).
		Order("created_at DESC").
		First(&plan).Error
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *repository) ListDietPlansForAdmission(admissionID uuid.UUID) ([]models.DietPlan, error) {
	var plans []models.DietPlan
	err := r.db.Preload("OrderedByUser").
		Where("admission_id = ?", admissionID).
		Order("created_at DESC").
		Find(&plans).Error
	return plans, err
}

func (r *repository) DeactivatePlansForAdmission(admissionID uuid.UUID) error {
	return r.db.Model(&models.DietPlan{}).
		Where("admission_id = ? AND is_active = ?", admissionID, true).
		Update("is_active", false).Error
}

// ─── Meal Orders ──────────────────────────────────────────────────────────────

func (r *repository) CreateMealOrders(meals []models.MealOrder) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range meals {
			// Idempotent generation: skip if already exists for admission + date + type
			var count int64
			err := tx.Model(&models.MealOrder{}).
				Where("admission_id = ? AND scheduled_date = ? AND meal_type = ?",
					meals[i].AdmissionID, meals[i].ScheduledDate, meals[i].MealType).
				Count(&count).Error
			if err != nil {
				return err
			}
			if count == 0 {
				if err := tx.Create(&meals[i]).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (r *repository) GetMealOrder(id uuid.UUID) (*models.MealOrder, error) {
	var meal models.MealOrder
	if err := r.db.First(&meal, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &meal, nil
}

func (r *repository) UpdateMealOrder(meal *models.MealOrder) error {
	return r.db.Save(meal).Error
}

func (r *repository) GetMealOrdersByFilter(f KitchenSheetFilter) ([]models.MealOrder, error) {
	q := r.db.Order("scheduled_date DESC")
	if f.WardID != "" {
		if _, err := uuid.Parse(f.WardID); err == nil {
			q = q.Where("ward_id = ?", f.WardID)
		} else {
			q = q.Where("ward_id IN (SELECT id FROM wards WHERE code = ? AND deleted_at IS NULL)", f.WardID)
		}
	}
	if f.MealType != "" {
		q = q.Where("meal_type = ?", f.MealType)
	}
	if !f.ScheduledDate.IsZero() {
		q = q.Where("scheduled_date = ?", f.ScheduledDate.Format("2006-01-02"))
	}
	var orders []models.MealOrder
	return orders, q.Find(&orders).Error
}

// ─── IPD active allocations ───────────────────────────────────────────────────

func (r *repository) GetActiveIPDAdmissions(t time.Time) ([]models.Admission, error) {
	// Query currently active admissions (admitted and not discharged)
	// preloading BedHistory (where to_date is NULL) to resolve historical Ward and Bed
	var admissions []models.Admission
	err := r.db.
		Preload("Patient").
		Preload("BedHistory", "to_date IS NULL").
		Preload("BedHistory.Bed").
		Preload("BedHistory.Bed.Ward").
		Where("status = ? AND admission_date <= ? AND (discharged_at IS NULL OR discharged_at > ?)",
			models.AdmissionAdmitted, t, t).
		Find(&admissions).Error
	return admissions, err
}
