// Package pharmacy implements the medicine master, inventory stock and
// prescription dispensing workflow.
package pharmacy

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/prescriptions"
)

// PrescriptionResponse aliases the prescriptions package shape so Swagger
// can render the dispense response.
type PrescriptionResponse = prescriptions.PrescriptionResponse

// CreateMedicineRequest is the payload for POST /medicines.
type CreateMedicineRequest struct {
	Name              string  `json:"name" binding:"required,min=2,max=200"`
	Formulation       string  `json:"formulation" binding:"max=100"`
	Unit              string  `json:"unit" binding:"max=20"`
	BatchNumber       string  `json:"batch_number" binding:"max=100"`
	ExpiryDate        string  `json:"expiry_date"` // YYYY-MM-DD
	StockQty          float64 `json:"stock_qty" binding:"gte=0"`
	LowStockThreshold float64 `json:"low_stock_threshold" binding:"gte=0"`
}

// UpdateMedicineRequest is the payload for PATCH /medicines/{id}.
type UpdateMedicineRequest struct {
	Name              string  `json:"name" binding:"required,min=2,max=200"`
	Formulation       string  `json:"formulation" binding:"max=100"`
	Unit              string  `json:"unit" binding:"max=20"`
	BatchNumber       string  `json:"batch_number" binding:"max=100"`
	ExpiryDate        string  `json:"expiry_date"` // YYYY-MM-DD
	LowStockThreshold float64 `json:"low_stock_threshold" binding:"gte=0"`
	IsActive          *bool   `json:"is_active"`
}

// StockAdjustRequest is the payload for POST /medicines/{id}/stock.
// Positive quantity adds stock (purchase), negative removes it (adjustment).
type StockAdjustRequest struct {
	Quantity    float64 `json:"quantity" binding:"required"`
	BatchNumber string  `json:"batch_number"`
	Notes       string  `json:"notes"`
}

// DispenseItem is one prescription line to dispense.
type DispenseItem struct {
	PrescriptionItemID string  `json:"prescription_item_id" binding:"required"`
	Quantity           int     `json:"quantity" binding:"required,gt=0"`
	MedicineID         string  `json:"medicine_id"`
}

// DispenseRequest is the payload for POST /prescriptions/{id}/dispense.
type DispenseRequest struct {
	Items []DispenseItem `json:"items" binding:"required,min=1,dive"`
}

// MedicineResponse is the public shape of a medicine with stock.
type MedicineResponse struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Formulation       string  `json:"formulation"`
	Unit              string  `json:"unit"`
	BatchNumber       string  `json:"batch_number"`
	ExpiryDate        string  `json:"expiry_date"`
	StockQty          float64 `json:"stock_qty"`
	LowStockThreshold float64 `json:"low_stock_threshold"`
	IsActive          bool    `json:"is_active"`
	LowStock          bool    `json:"low_stock"`
	OutOfStock        bool    `json:"out_of_stock"`
	IsExpired         bool    `json:"is_expired"`
	NearExpiry        bool    `json:"near_expiry"`
	CreatedAt         string  `json:"created_at"`
}

// ReturnStockRequest is the payload for POST /medicines/{id}/return.
type ReturnStockRequest struct {
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	BatchNumber string  `json:"batch_number"`
	Notes       string  `json:"notes"`
}

func toMedicineResponse(m *models.Medicine) MedicineResponse {
	expiryStr := ""
	isExpired := false
	nearExpiry := false
	if m.ExpiryDate != nil {
		expiryStr = m.ExpiryDate.Format("2006-01-02")
		isExpired = m.ExpiryDate.Before(time.Now())
		nearExpiry = !isExpired && m.ExpiryDate.Before(time.Now().AddDate(0, 3, 0))
	}
	return MedicineResponse{
		ID:                m.ID.String(),
		Name:              m.Name,
		Formulation:       m.Formulation,
		Unit:              m.Unit,
		BatchNumber:       m.BatchNumber,
		ExpiryDate:        expiryStr,
		StockQty:          m.StockQty,
		LowStockThreshold: m.LowStockThreshold,
		IsActive:          m.IsActive,
		LowStock:          m.StockQty <= m.LowStockThreshold,
		OutOfStock:        m.StockQty <= 0.001,
		IsExpired:         isExpired,
		NearExpiry:        nearExpiry,
		CreatedAt:         m.CreatedAt.Format(time.RFC3339),
	}
}

// InventoryTransactionResponse is a stock movement record.
type InventoryTransactionResponse struct {
	ID           string  `json:"id"`
	MedicineName string  `json:"medicine_name"`
	Type         string  `json:"type"`
	Quantity     float64 `json:"quantity"`
	BalanceAfter float64 `json:"balance_after"`
	BatchNumber  string  `json:"batch_number"`
	ReferenceID  string  `json:"reference_id,omitempty"`
	Notes        string  `json:"notes"`
	CreatedAt    string  `json:"created_at"`
}

func toTxResponse(t *models.InventoryTransaction) InventoryTransactionResponse {
	return InventoryTransactionResponse{
		ID:           t.ID.String(),
		MedicineName: t.Medicine.Name,
		Type:         t.Type,
		Quantity:     t.Quantity,
		BalanceAfter: t.BalanceAfter,
		BatchNumber:  t.BatchNumber,
		ReferenceID:  t.ReferenceID,
		Notes:        t.Notes,
		CreatedAt:    t.CreatedAt.Format(time.RFC3339),
	}
}

// toPrescriptionResponse reuses the public prescription shape after dispense.
func toPrescriptionResponse(p *models.Prescription) prescriptions.PrescriptionResponse {
	resp := prescriptions.PrescriptionResponse{
		ID:          p.ID.String(),
		EncounterID: p.EncounterID.String(),
		DoctorID:    p.DoctorID.String(),
		DoctorName:  p.Doctor.User.FullName,
		Status:      p.Status,
		Notes:       p.Notes,
		CreatedAt:   p.CreatedAt.Format(time.RFC3339),
	}
	for i := range p.Items {
		it := &p.Items[i]
		resp.Items = append(resp.Items, prescriptions.PrescriptionItemResponse{
			ID:           it.ID.String(),
			Medicine:     it.Medicine,
			Formulation:  it.Formulation,
			Dose:         it.Dose,
			Frequency:    it.Frequency,
			Duration:     it.Duration,
			Quantity:     it.Quantity,
			Anupana:      it.Anupana,
			Route:        it.Route,
			Instructions: it.Instructions,
			DispensedQty: it.DispensedQty,
		})
	}
	return resp
}
