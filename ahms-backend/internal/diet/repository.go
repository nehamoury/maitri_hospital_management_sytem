package diet

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	CreateDietPlan(plan *models.DietPlan) error
	GetDietPlan(id uuid.UUID, scope *models.DataScope) (*models.DietPlan, error)
	GetActiveDietPlanForAdmission(admissionID uuid.UUID, scope *models.DataScope) (*models.DietPlan, error)
	ListDietPlansForAdmission(admissionID uuid.UUID, scope *models.DataScope) ([]models.DietPlan, error)
	DeactivatePlansForAdmission(admissionID uuid.UUID) error
	DoctorOwnsAdmission(admissionID, doctorID uuid.UUID) error

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

// applyDoctorScope restricts diet queries to plans on admissions the given
// doctor is the treating doctor for. A nil scope or a scope without a
// DoctorID leaves the query unscoped (kitchen/nursing staff get full access).
func applyDoctorScope(q *gorm.DB, scope *models.DataScope) *gorm.DB {
	if scope == nil || scope.DoctorID == nil {
		return q
	}
	return q.Where("EXISTS (SELECT 1 FROM admissions WHERE admissions.id = diet_plans.admission_id AND admissions.doctor_id = ? AND admissions.deleted_at IS NULL)", *scope.DoctorID)
}

// ─── Diet Plans ───────────────────────────────────────────────────────────────

func (r *repository) CreateDietPlan(plan *models.DietPlan) error {
	return r.db.Create(plan).Error
}

func (r *repository) GetDietPlan(id uuid.UUID, scope *models.DataScope) (*models.DietPlan, error) {
	var plan models.DietPlan
	query := r.db.Preload("OrderedByUser").Where("diet_plans.id = ?", id)
	applyDoctorScope(query, scope)
	if err := query.First(&plan).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *repository) GetActiveDietPlanForAdmission(admissionID uuid.UUID, scope *models.DataScope) (*models.DietPlan, error) {
	var plan models.DietPlan
	query := r.db.Preload("OrderedByUser").
		Where("diet_plans.admission_id = ? AND diet_plans.is_active = ?", admissionID, true)
	applyDoctorScope(query, scope)
	err := query.
		Order("diet_plans.created_at DESC").
		First(&plan).Error
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *repository) ListDietPlansForAdmission(admissionID uuid.UUID, scope *models.DataScope) ([]models.DietPlan, error) {
	var plans []models.DietPlan
	query := r.db.Preload("OrderedByUser").
		Where("diet_plans.admission_id = ?", admissionID)
	applyDoctorScope(query, scope)
	err := query.
		Order("diet_plans.created_at DESC").
		Find(&plans).Error
	return plans, err
}

func (r *repository) DeactivatePlansForAdmission(admissionID uuid.UUID) error {
	return r.db.Model(&models.DietPlan{}).
		Where("admission_id = ? AND is_active = ?", admissionID, true).
		Update("is_active", false).Error
}

func (r *repository) DoctorOwnsAdmission(admissionID, doctorID uuid.UUID) error {
	var count int64
	err := r.db.Model(&models.Admission{}).
		Where("id = ? AND doctor_id = ? AND deleted_at IS NULL", admissionID, doctorID).
		Count(&count).Error
	if err != nil {
		return err
	}
	if count == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
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
