package models

import (
	"time"

	"github.com/google/uuid"
)

// Inventory transaction types.
const (
	InventoryPurchase   = "PURCHASE"
	InventoryDispense   = "DISPENSE"
	InventoryReturn     = "RETURN"
	InventoryAdjustment = "ADJUSTMENT"
)

// Medicine is an item in the pharmacy medicine master with its stock.
type Medicine struct {
	BaseModel
	Name              string     `gorm:"type:varchar(200);uniqueIndex;not null" json:"name"`
	Formulation       string     `gorm:"type:varchar(100)" json:"formulation"`
	Unit              string     `gorm:"type:varchar(20)" json:"unit"` // e.g. tablet, ml, gm
	BatchNumber       string     `gorm:"type:varchar(100)" json:"batch_number"`
	ExpiryDate        *time.Time `json:"expiry_date"`
	StockQty          float64    `gorm:"not null;default:0" json:"stock_qty"`
	LowStockThreshold float64    `gorm:"not null;default:10" json:"low_stock_threshold"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`
}

func (Medicine) TableName() string {
	return "medicines"
}

// InventoryTransaction records every stock movement. Every movement has a
// type and a balance-after so the full history is reconstructable.
type InventoryTransaction struct {
	BaseModel
	MedicineID   uuid.UUID `gorm:"type:uuid;not null;index" json:"medicine_id"`
	Medicine     Medicine  `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
	Type         string    `gorm:"type:varchar(20);not null" json:"type"`
	Quantity     float64   `gorm:"not null" json:"quantity"`
	BalanceAfter float64   `gorm:"not null" json:"balance_after"`
	BatchNumber  string    `gorm:"type:varchar(100)" json:"batch_number"`
	ReferenceID  string    `gorm:"type:varchar(64);index" json:"reference_id,omitempty"`
	Notes        string    `gorm:"type:text" json:"notes"`

	CreatedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_user_id"`
	CreatedBy       User      `gorm:"foreignKey:CreatedByUserID" json:"created_by,omitempty"`
}

func (InventoryTransaction) TableName() string {
	return "inventory_transactions"
}
