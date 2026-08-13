package lab

import (
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Repository defines all DB operations for the lab module.
type Repository interface {
	// Categories
	CreateCategory(cat *models.InvestigationCategory) error
	UpdateCategory(cat *models.InvestigationCategory) error
	GetCategory(id uuid.UUID) (*models.InvestigationCategory, error)
	ListCategories(activeOnly bool) ([]models.InvestigationCategory, error)

	// Tests
	CreateTest(test *models.InvestigationTest) error
	UpdateTest(test *models.InvestigationTest) error
	GetTest(id uuid.UUID) (*models.InvestigationTest, error)
	ListTests(categoryID string, activeOnly bool) ([]models.InvestigationTest, error)

	// Orders
	NextOrderNumber(year int) (string, error)
	CreateOrder(order *models.InvestigationOrder, items []models.InvestigationOrderItem) error
	GetOrder(id uuid.UUID) (*models.InvestigationOrder, error)
	ListOrders(f ListOrdersFilter) ([]models.InvestigationOrder, int64, error)
	UpdateOrder(order *models.InvestigationOrder) error

	// Sample
	CreateSample(sample *models.InvestigationSample) error

	// Order items
	GetOrderItem(id uuid.UUID) (*models.InvestigationOrderItem, error)
	UpdateOrderItem(item *models.InvestigationOrderItem) error
	UpdateOrderItems(items []models.InvestigationOrderItem) error

	// Patient timeline
	ListOrdersByPatient(patientID uuid.UUID) ([]models.InvestigationOrder, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// ─── Category ──────────────────────────────────────────────────────────────────

func (r *repository) CreateCategory(cat *models.InvestigationCategory) error {
	return r.db.Create(cat).Error
}

func (r *repository) UpdateCategory(cat *models.InvestigationCategory) error {
	return r.db.Save(cat).Error
}

func (r *repository) GetCategory(id uuid.UUID) (*models.InvestigationCategory, error) {
	var cat models.InvestigationCategory
	if err := r.db.First(&cat, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &cat, nil
}

func (r *repository) ListCategories(activeOnly bool) ([]models.InvestigationCategory, error) {
	q := r.db.Order("name ASC")
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	var cats []models.InvestigationCategory
	return cats, q.Find(&cats).Error
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func (r *repository) CreateTest(test *models.InvestigationTest) error {
	return r.db.Create(test).Error
}

func (r *repository) UpdateTest(test *models.InvestigationTest) error {
	return r.db.Save(test).Error
}

func (r *repository) GetTest(id uuid.UUID) (*models.InvestigationTest, error) {
	var test models.InvestigationTest
	if err := r.db.Preload("Category").First(&test, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &test, nil
}

func (r *repository) ListTests(categoryID string, activeOnly bool) ([]models.InvestigationTest, error) {
	q := r.db.Preload("Category").Order("name ASC")
	if activeOnly {
		q = q.Where("is_active = ?", true)
	}
	if categoryID != "" {
		q = q.Where("category_id = ?", categoryID)
	}
	var tests []models.InvestigationTest
	return tests, q.Find(&tests).Error
}

// ─── Order Number ─────────────────────────────────────────────────────────────

// NextOrderNumber atomically increments the counter and returns the next
// order number in the format LAB-YYYY-NNNNNN.
func (r *repository) NextOrderNumber(year int) (string, error) {
	var counter models.InvestigationOrderCounter
	tx := r.db.Begin()
	if tx.Error != nil {
		return "", tx.Error
	}

	result := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("year = ?", year).First(&counter)

	if result.Error != nil {
		// No row yet — create first
		counter = models.InvestigationOrderCounter{Year: year, LastNumber: 0}
		if err := tx.Create(&counter).Error; err != nil {
			tx.Rollback()
			return "", err
		}
	}

	counter.LastNumber++
	if err := tx.Save(&counter).Error; err != nil {
		tx.Rollback()
		return "", err
	}
	if err := tx.Commit().Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("LAB-%d-%06d", year, counter.LastNumber), nil
}

// ─── Orders ───────────────────────────────────────────────────────────────────

func (r *repository) CreateOrder(order *models.InvestigationOrder, items []models.InvestigationOrderItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
		}
		return tx.Create(&items).Error
	})
}

func (r *repository) GetOrder(id uuid.UUID) (*models.InvestigationOrder, error) {
	var order models.InvestigationOrder
	err := r.db.
		Preload("Patient").
		Preload("OrderedByUser").
		Preload("ReviewedByUser").
		Preload("CancelledByUser").
		Preload("Items").
		Preload("Items.Test").
		Preload("Items.Test.Category").
		Preload("Items.ResultedByUser").
		Preload("Items.VerifiedByUser").
		Preload("Sample").
		Preload("Sample.CollectedByUser").
		First(&order, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *repository) ListOrders(f ListOrdersFilter) ([]models.InvestigationOrder, int64, error) {
	q := r.db.
		Preload("Patient").
		Preload("OrderedByUser").
		Preload("Items").
		Where("investigation_orders.deleted_at IS NULL")

	if f.PatientID != "" {
		q = q.Where("patient_id = ?", f.PatientID)
	}
	if f.EncounterID != "" {
		q = q.Where("encounter_id = ?", f.EncounterID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.Priority != "" {
		q = q.Where("priority = ?", f.Priority)
	}
	if !f.From.IsZero() {
		q = q.Where("created_at >= ?", f.From)
	}
	if !f.To.IsZero() {
		q = q.Where("created_at < ?", f.To)
	}

	var total int64
	if err := q.Model(&models.InvestigationOrder{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := f.Page
	if page < 1 {
		page = 1
	}
	pageSize := f.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var orders []models.InvestigationOrder
	err := q.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&orders).Error
	return orders, total, err
}

func (r *repository) UpdateOrder(order *models.InvestigationOrder) error {
	return r.db.Save(order).Error
}

// ─── Sample ───────────────────────────────────────────────────────────────────

func (r *repository) CreateSample(sample *models.InvestigationSample) error {
	return r.db.Create(sample).Error
}

// ─── Order Items ──────────────────────────────────────────────────────────────

func (r *repository) GetOrderItem(id uuid.UUID) (*models.InvestigationOrderItem, error) {
	var item models.InvestigationOrderItem
	if err := r.db.Preload("Test").First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) UpdateOrderItem(item *models.InvestigationOrderItem) error {
	return r.db.Save(item).Error
}

func (r *repository) UpdateOrderItems(items []models.InvestigationOrderItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range items {
			if err := tx.Save(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ─── Patient Timeline ─────────────────────────────────────────────────────────

func (r *repository) ListOrdersByPatient(patientID uuid.UUID) ([]models.InvestigationOrder, error) {
	var orders []models.InvestigationOrder
	err := r.db.
		Preload("Items").
		Preload("Items.Test").
		Where("patient_id = ? AND deleted_at IS NULL", patientID).
		Order("created_at DESC").
		Find(&orders).Error
	return orders, err
}

// Helper: recompute order-level status from item statuses.
// Returns the new order status string.
func computeOrderStatus(items []models.InvestigationOrderItem) string {
	if len(items) == 0 {
		return models.LabOrderOrdered
	}
	allVerified := true
	anyResulted := false
	for _, item := range items {
		if item.Status == models.LabItemCancelled {
			continue
		}
		if item.Status != models.LabItemVerified {
			allVerified = false
		}
		if item.Status == models.LabItemResultEntered || item.Status == models.LabItemVerified {
			anyResulted = true
		}
	}
	if allVerified {
		return models.LabOrderResultAvailable
	}
	if anyResulted {
		return models.LabOrderProcessing
	}
	return ""
}

// unused var guard
var _ = time.Now
