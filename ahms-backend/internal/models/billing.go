package models

import "github.com/google/uuid"

// Bill payment statuses.
const (
	BillUnpaid  = "UNPAID"
	BillPartial = "PARTIAL"
	BillPaid    = "PAID"
)

// PaymentMethodRefund marks a refund ledger entry (stored as a negative
// payment amount on the originating bill).
const PaymentMethodRefund = "REFUND"

// Bill service types for line items.
const (
	BillServiceOPD          = "OPD"
	BillServiceIPD          = "IPD"
	BillServiceProcedure    = "PROCEDURE"
	BillServicePharmacy     = "PHARMACY"
	BillServiceInvestigation = "INVESTIGATION"
	BillServiceConsultation = "CONSULTATION"
)

// Bill is an invoice with individual line items.
type Bill struct {
	BaseModel
	BillNo    string `gorm:"type:varchar(30);uniqueIndex;not null" json:"bill_no"`

	PatientID   uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient     Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`
	EncounterID *uuid.UUID `gorm:"type:uuid;index" json:"encounter_id,omitempty"`

	TotalAmount   float64 `gorm:"type:decimal(10,2);not null;default:0" json:"total_amount"`
	Discount      float64 `gorm:"type:decimal(10,2);not null;default:0" json:"discount"`
	NetAmount     float64 `gorm:"type:decimal(10,2);not null;default:0" json:"net_amount"`
	PaidAmount    float64 `gorm:"type:decimal(10,2);not null;default:0" json:"paid_amount"`
	DueAmount     float64 `gorm:"type:decimal(10,2);not null;default:0" json:"due_amount"`
	PaymentStatus string  `gorm:"type:varchar(20);not null;default:'UNPAID'" json:"payment_status"`

	BilledByUserID uuid.UUID  `gorm:"type:uuid;not null" json:"billed_by_user_id"`
	BilledBy       User       `gorm:"foreignKey:BilledByUserID" json:"billed_by,omitempty"`

	Items []BillItem `gorm:"foreignKey:BillID" json:"items,omitempty"`
	Payments []Payment `gorm:"foreignKey:BillID" json:"payments,omitempty"`
}

func (Bill) TableName() string {
	return "bills"
}

// BillItem is a single line in a bill.
type BillItem struct {
	BaseModel
	BillID      uuid.UUID `gorm:"type:uuid;not null;index" json:"bill_id"`
	Bill        Bill      `gorm:"foreignKey:BillID" json:"bill,omitempty"`
	Description string    `gorm:"type:varchar(255);not null" json:"description"`
	Quantity    int       `gorm:"not null;default:1" json:"quantity"`
	Rate        float64   `gorm:"type:decimal(10,2);not null;default:0" json:"rate"`
	Amount      float64   `gorm:"type:decimal(10,2);not null;default:0" json:"amount"`
	ServiceType string    `gorm:"type:varchar(20);not null;default:'OPD'" json:"service_type"`
}

func (BillItem) TableName() string {
	return "bill_items"
}

// BillCounter tracks the last-issued bill sequence per year so numbers
// look like BILL-2026-000001.
type BillCounter struct {
	Year       int `gorm:"primaryKey"`
	LastNumber int `gorm:"not null;default:0"`
}

func (BillCounter) TableName() string {
	return "bill_counters"
}

// Payment is a payment received against a bill.
type Payment struct {
	BaseModel
	BillID          uuid.UUID `gorm:"type:uuid;not null;index" json:"bill_id"`
	Bill            Bill      `gorm:"foreignKey:BillID" json:"bill,omitempty"`
	Amount          float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
	Method          string    `gorm:"type:varchar(20);not null;default:'CASH'" json:"method"`
	ReferenceNumber string    `gorm:"type:varchar(64)" json:"reference_number,omitempty"`

	ReceivedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"received_by_user_id"`
	ReceivedBy       User      `gorm:"foreignKey:ReceivedByUserID" json:"received_by,omitempty"`
}

func (Payment) TableName() string {
	return "payments"
}
