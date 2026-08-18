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
	UpdateDietPlan(plan *models.DietPlan) error
	DoctorOwnsAdmission(admissionID, doctorID uuid.UUID) error

	// Meal orders
	CreateMealOrders(meals []models.MealOrder) (int, error)
	CreateMealOrder(meal *models.MealOrder) error
	GetMealOrder(id uuid.UUID) (*models.MealOrder, error)
	UpdateMealOrder(meal *models.MealOrder) error
	GetMealOrdersByFilter(f KitchenSheetFilter) ([]models.MealOrder, error)

	// Helper queries for active IPD bed allocations
	GetActiveIPDAdmissions(t time.Time) ([]models.Admission, error)
	GetAdmissionForMeal(admissionID uuid.UUID) (*models.Admission, error)

	// Kitchen helpers
	GetWardsForKitchen() ([]WardOption, error)
	GetKitchenAdmissions() ([]models.Admission, error)

	// Diet template masters
	ListDietTemplates(activeOnly bool) ([]models.DietTemplate, error)
	GetDietTemplate(id uuid.UUID) (*models.DietTemplate, error)
	CreateDietTemplate(t *models.DietTemplate) error
	UpdateDietTemplate(t *models.DietTemplate) error
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

func (r *repository) UpdateDietPlan(plan *models.DietPlan) error {
	return r.db.Save(plan).Error
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

func (r *repository) CreateMealOrders(meals []models.MealOrder) (int, error) {
	created := 0
	err := r.db.Transaction(func(tx *gorm.DB) error {
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
				// Carry the plan's kitchen-facing notes onto the meal row.
				if meals[i].SpecialInstructions == "" && meals[i].DietPlanID != uuid.Nil {
					var plan models.DietPlan
					if err := tx.Select("special_instructions").First(&plan, "id = ?", meals[i].DietPlanID).Error; err == nil {
						meals[i].SpecialInstructions = plan.SpecialInstructions
					}
				}
				if err := tx.Create(&meals[i]).Error; err != nil {
					return err
				}
				created++
			}
		}
		return nil
	})
	return created, err
}

// CreateMealOrder creates a single manual meal order, rejecting duplicates
// for the same admission + date + meal type.
func (r *repository) CreateMealOrder(meal *models.MealOrder) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var count int64
		err := tx.Model(&models.MealOrder{}).
			Where("admission_id = ? AND scheduled_date = ? AND meal_type = ?",
				meal.AdmissionID, meal.ScheduledDate, meal.MealType).
			Count(&count).Error
		if err != nil {
			return err
		}
		if count > 0 {
			return ErrDuplicateMeal
		}
		return tx.Create(meal).Error
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

// GetAdmissionForMeal fetches an admitted admission for manual meal creation,
// preloading the current bed allocation and the patient record.
func (r *repository) GetAdmissionForMeal(admissionID uuid.UUID) (*models.Admission, error) {
	var adm models.Admission
	err := r.db.
		Preload("Patient").
		Preload("BedHistory", "to_date IS NULL").
		Preload("BedHistory.Bed").
		Preload("BedHistory.Bed.Ward").
		Where("id = ? AND status = ? AND deleted_at IS NULL", admissionID, models.AdmissionAdmitted).
		First(&adm).Error
	if err != nil {
		return nil, err
	}
	return &adm, nil
}

// GetWardsForKitchen lists only wards that currently host an active IPD
// admission, so the kitchen dashboard filter shows real options. Wards with
// no active patient are omitted.
func (r *repository) GetWardsForKitchen() ([]WardOption, error) {
	var wards []WardOption
	err := r.db.Raw(`SELECT DISTINCT w.id, w.code, w.name
		FROM wards w
		JOIN beds b ON b.ward_id = w.id AND b.deleted_at IS NULL
		JOIN admission_beds ab ON ab.bed_id = b.id AND ab.to_date IS NULL
		JOIN admissions a ON a.id = ab.admission_id
		WHERE w.deleted_at IS NULL AND a.status = ? AND a.deleted_at IS NULL
		ORDER BY w.name`, models.AdmissionAdmitted).Scan(&wards).Error
	return wards, err
}

// GetKitchenAdmissions lists currently admitted admissions that have an
// active diet plan and a live bed allocation — the candidates for manual
// meal ordering.
func (r *repository) GetKitchenAdmissions() ([]models.Admission, error) {
	var admissions []models.Admission
	err := r.db.
		Preload("Patient").
		Preload("BedHistory", "to_date IS NULL").
		Preload("BedHistory.Bed").
		Preload("BedHistory.Bed.Ward").
		Where("status = ? AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM diet_plans dp WHERE dp.admission_id = admissions.id AND dp.is_active = true AND dp.deleted_at IS NULL)",
			models.AdmissionAdmitted).
		Order("admission_date DESC").
		Find(&admissions).Error
	return admissions, err
}

// ─── Diet Templates ────────────────────────────────────────────────────────────

func (r *repository) ListDietTemplates(activeOnly bool) ([]models.DietTemplate, error) {
	var templates []models.DietTemplate
	q := r.db.Preload("CreatedByUser").Order("name ASC")
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	err := q.Find(&templates).Error
	return templates, err
}

func (r *repository) GetDietTemplate(id uuid.UUID) (*models.DietTemplate, error) {
	var t models.DietTemplate
	if err := r.db.Preload("CreatedByUser").First(&t, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *repository) CreateDietTemplate(t *models.DietTemplate) error {
	return r.db.Create(t).Error
}

func (r *repository) UpdateDietTemplate(t *models.DietTemplate) error {
	return r.db.Save(t).Error
}
