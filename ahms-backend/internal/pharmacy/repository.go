package pharmacy

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when an id doesn't match any row.
var ErrNotFound = errors.New("record not found")

// ErrInsufficientStock is returned when dispensing more than available.
var ErrInsufficientStock = errors.New("insufficient stock")

// Repository is the data-access layer for pharmacy.
type Repository interface {
	CreateMedicine(m *models.Medicine) error
	FindAllMedicines(search string, lowStock bool, outOfStock bool, nearExpiry bool, expired bool) ([]models.Medicine, error)
	FindMedicineByID(id uuid.UUID) (*models.Medicine, error)
	UpdateMedicine(m *models.Medicine) error
	AdjustStock(m *models.Medicine, qty float64, batchNumber string, notes string, userID uuid.UUID) error
	ReturnStock(m *models.Medicine, qty float64, batchNumber string, notes string, userID uuid.UUID) error
	ListTransactions(medicineID uuid.UUID) ([]models.InventoryTransaction, error)
	FindPrescriptionWithItems(id uuid.UUID) (*models.Prescription, error)
	DispenseItems(rx *models.Prescription, updates []dispenseUpdate, userID uuid.UUID) error
	FindDoctorOrStaffRoleName(userID uuid.UUID) (string, error)
}

type dispenseUpdate struct {
	ItemID     uuid.UUID
	Dispensed  int
	MedicineID *uuid.UUID
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateMedicine(m *models.Medicine) error {
	return r.db.Create(m).Error
}

func (r *repository) FindAllMedicines(search string, lowStock bool, outOfStock bool, nearExpiry bool, expired bool) ([]models.Medicine, error) {
	query := r.db.Order("name asc")
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR formulation ILIKE ?", like, like)
	}
	if lowStock {
		query = query.Where("stock_qty <= low_stock_threshold")
	}
	if outOfStock {
		query = query.Where("stock_qty <= 0.001")
	}
	now := time.Now()
	nearExpiryCutoff := now.AddDate(0, 3, 0)
	if nearExpiry {
		query = query.Where("expiry_date IS NOT NULL AND expiry_date > ? AND expiry_date <= ?", now, nearExpiryCutoff)
	}
	if expired {
		query = query.Where("expiry_date IS NOT NULL AND expiry_date <= ?", now)
	}
	var list []models.Medicine
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) FindMedicineByID(id uuid.UUID) (*models.Medicine, error) {
	var m models.Medicine
	err := r.db.First(&m, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &m, err
}

func (r *repository) UpdateMedicine(m *models.Medicine) error {
	return r.db.Save(m).Error
}

// AdjustStock applies a signed quantity change and records an inventory
// transaction atomically. The medicine row is locked so concurrent
// adjustments cannot corrupt the balance.
func (r *repository) AdjustStock(m *models.Medicine, qty float64, batchNumber string, notes string, userID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var locked models.Medicine
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&locked, "id = ?", m.ID).Error; err != nil {
			return err
		}
		newBalance := locked.StockQty + qty
		if newBalance < 0 {
			return ErrInsufficientStock
		}
		if err := tx.Model(&models.Medicine{}).Where("id = ?", m.ID).Update("stock_qty", newBalance).Error; err != nil {
			return err
		}
		return tx.Create(&models.InventoryTransaction{
			MedicineID:      m.ID,
			Type:            txTypeFor(qty),
			Quantity:        qty,
			BalanceAfter:    newBalance,
			BatchNumber:     batchNumber,
			Notes:           notes,
			CreatedByUserID: userID,
		}).Error
	})
}

func txTypeFor(qty float64) string {
	if qty > 0 {
		return models.InventoryPurchase
	}
	if qty < 0 {
		return models.InventoryAdjustment
	}
	return models.InventoryAdjustment
}

// ReturnStock adds returned stock back to the medicine balance and records a
// RETURN inventory transaction atomically.
func (r *repository) ReturnStock(m *models.Medicine, qty float64, batchNumber string, notes string, userID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var locked models.Medicine
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&locked, "id = ?", m.ID).Error; err != nil {
			return err
		}
		newBalance := locked.StockQty + qty
		if err := tx.Model(&models.Medicine{}).Where("id = ?", m.ID).Update("stock_qty", newBalance).Error; err != nil {
			return err
		}
		return tx.Create(&models.InventoryTransaction{
			MedicineID:      m.ID,
			Type:            models.InventoryReturn,
			Quantity:        qty,
			BalanceAfter:    newBalance,
			BatchNumber:     batchNumber,
			Notes:           notes,
			CreatedByUserID: userID,
		}).Error
	})
}

// ListTransactions returns the stock-movement history for one medicine.
func (r *repository) ListTransactions(medicineID uuid.UUID) ([]models.InventoryTransaction, error) {
	var list []models.InventoryTransaction
	err := r.db.Preload("Medicine").
		Where("medicine_id = ?", medicineID).
		Order("created_at desc").
		Limit(200).
		Find(&list).Error
	return list, err
}

func (r *repository) FindPrescriptionWithItems(id uuid.UUID) (*models.Prescription, error) {
	var p models.Prescription
	err := r.db.Preload("Doctor.User").Preload("Items").First(&p, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

// DispenseItems atomically records dispensing: increments the dispensed
// quantities on the prescription items, decrements linked medicine stock
// (recording DISPENSE inventory transactions) and updates the prescription
// status.
func (r *repository) DispenseItems(rx *models.Prescription, updates []dispenseUpdate, userID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		totalItems := len(rx.Items)
		fullyDispensed := 0

		for _, u := range updates {
			var item models.PrescriptionItem
			if err := tx.First(&item, "id = ?", u.ItemID).Error; err != nil {
				return fmt.Errorf("prescription item not found: %s", u.ItemID)
			}
			newDispensed := item.DispensedQty + u.Dispensed
			if err := tx.Model(&models.PrescriptionItem{}).
				Where("id = ?", u.ItemID).
				Update("dispensed_qty", newDispensed).Error; err != nil {
				return err
			}
			if newDispensed >= item.Quantity {
				fullyDispensed++
			}

			if u.MedicineID != nil {
				var med models.Medicine
				if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&med, "id = ?", *u.MedicineID).Error; err != nil {
					return fmt.Errorf("medicine not found: %s", *u.MedicineID)
				}
				newBalance := med.StockQty - float64(u.Dispensed)
				if newBalance < 0 {
					return ErrInsufficientStock
				}
				if err := tx.Model(&models.Medicine{}).Where("id = ?", *u.MedicineID).Update("stock_qty", newBalance).Error; err != nil {
					return err
				}
				if err := tx.Create(&models.InventoryTransaction{
					MedicineID:      med.ID,
					Type:            models.InventoryDispense,
					Quantity:        -float64(u.Dispensed),
					BalanceAfter:    newBalance,
					ReferenceID:     rx.ID.String(),
					Notes:           "dispensed against prescription",
					CreatedByUserID: userID,
				}).Error; err != nil {
					return err
				}
			}
		}

		status := models.PrescriptionPartiallyDispensed
		if fullyDispensed >= totalItems {
			status = models.PrescriptionDispensed
		}
		return tx.Model(&models.Prescription{}).Where("id = ?", rx.ID).Update("status", status).Error
	})
}

func (r *repository) FindDoctorOrStaffRoleName(userID uuid.UUID) (string, error) {
	var user models.User
	if err := r.db.First(&user, "id = ?", userID).Error; err != nil {
		return "", err
	}
	return user.FullName, nil
}
