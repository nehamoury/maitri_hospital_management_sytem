package billing

import (
	"time"

	"github.com/ahms/backend/internal/models"
)

// CreateBillRequest is the payload for POST /bills.
type CreateBillRequest struct {
	PatientID   string  `json:"patient_id" binding:"required"`
	EncounterID string  `json:"encounter_id"`
	Discount    float64 `json:"discount" binding:"gte=0"`
	Items       []BillItemInput `json:"items" binding:"required,min=1,dive"`
}

// BillItemInput is one billed line.
type BillItemInput struct {
	Description string  `json:"description" binding:"required,min=2"`
	Quantity    int     `json:"quantity" binding:"required,gt=0"`
	Rate        float64 `json:"rate" binding:"required,gte=0"`
	ServiceType string  `json:"service_type"`
}

// PaymentRequest is the payload for POST /bills/{id}/payments.
type PaymentRequest struct {
	Amount    *float64 `json:"amount" binding:"required,gte=0"`
	Method    string   `json:"method" binding:"oneof=CASH CARD UPI BANK_TRANSFER"`
	Reference string   `json:"reference"`
}

// BillItemResponse is the public shape of a billed line.
type BillItemResponse struct {
	ID          string  `json:"id"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	Rate        float64 `json:"rate"`
	Amount      float64 `json:"amount"`
	ServiceType string  `json:"service_type"`
}

// PaymentResponse is the public shape of a payment.
type PaymentResponse struct {
	ID        string  `json:"id"`
	Amount    float64 `json:"amount"`
	Method    string  `json:"method"`
	Reference string  `json:"reference"`
	CreatedAt string  `json:"created_at"`
}

// BillResponse is the public shape of a bill.
type BillResponse struct {
	ID            string             `json:"id"`
	BillNo        string             `json:"bill_no"`
	PatientID     string             `json:"patient_id"`
	PatientName   string             `json:"patient_name"`
	EncounterID   string             `json:"encounter_id,omitempty"`
	TotalAmount   float64            `json:"total_amount"`
	Discount      float64            `json:"discount"`
	NetAmount     float64            `json:"net_amount"`
	PaidAmount    float64            `json:"paid_amount"`
	DueAmount     float64            `json:"due_amount"`
	PaymentStatus string             `json:"payment_status"`
	BilledBy      string             `json:"billed_by"`
	Items         []BillItemResponse `json:"items"`
	Payments      []PaymentResponse  `json:"payments"`
	CreatedAt     string             `json:"created_at"`
}

func toBillResponse(b *models.Bill) BillResponse {
	resp := BillResponse{
		ID:            b.ID.String(),
		BillNo:        b.BillNo,
		PatientID:     b.PatientID.String(),
		PatientName:   b.Patient.FullName,
		EncounterID:   "",
		TotalAmount:   b.TotalAmount,
		Discount:      b.Discount,
		NetAmount:     b.NetAmount,
		PaidAmount:    b.PaidAmount,
		DueAmount:     b.DueAmount,
		PaymentStatus: b.PaymentStatus,
		BilledBy:      b.BilledBy.FullName,
		CreatedAt:     b.CreatedAt.Format(time.RFC3339),
	}
	if b.EncounterID != nil {
		resp.EncounterID = b.EncounterID.String()
	}
	for i := range b.Items {
		it := &b.Items[i]
		resp.Items = append(resp.Items, BillItemResponse{
			ID:          it.ID.String(),
			Description: it.Description,
			Quantity:    it.Quantity,
			Rate:        it.Rate,
			Amount:      it.Amount,
			ServiceType: it.ServiceType,
		})
	}
	return resp
}
