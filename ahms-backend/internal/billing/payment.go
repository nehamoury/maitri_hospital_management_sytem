package billing

import (
	"errors"
	"strconv"
	"strings"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func itoa(n int) string { return strconv.Itoa(n) }

func pad(n int) string {
	s := strconv.Itoa(n)
	return strings.Repeat("0", 6-len(s)) + s
}

func truncate(s string, max int) string {
	r := []rune(s)
	if len(r) > max {
		return string(r[:max])
	}
	return s
}

// ErrRefundExceedsPaid is returned when a refund amount is larger than
// the amount already collected for the bill.
var ErrRefundExceedsPaid = errors.New("refund amount exceeds paid amount")

func (r *repository) ApplyPayment(id uuid.UUID, amount float64, method, ref string, userID uuid.UUID) (*models.Bill, error) {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var bill models.Bill
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&bill, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		paid := bill.PaidAmount + amount
		status := models.BillUnpaid
		switch {
		case paid >= bill.NetAmount:
			paid = bill.NetAmount
			status = models.BillPaid
		case paid > 0:
			status = models.BillPartial
		}
		if err := tx.Model(&models.Bill{}).Where("id = ?", id).Updates(map[string]interface{}{
			"paid_amount":    paid,
			"due_amount":     bill.NetAmount - paid,
			"payment_status": status,
		}).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.Payment{
			BillID:          bill.ID,
			Amount:          amount,
			Method:          method,
			ReferenceNumber: ref,
			ReceivedByUserID: userID,
		}).Error; err != nil {
			return err
		}
		if bill.EncounterID != nil {
			if err := r.syncEncounterPayment(tx, *bill.EncounterID); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.FindBillByID(id)
}

// ApplyRefund reverses a previously collected payment: it validates that
// the amount does not exceed what has been paid, records a negative
// Payment ledger entry (method REFUND), recomputes the bill totals and
// payment status, and re-syncs the linked encounter payment status.
func (r *repository) ApplyRefund(id uuid.UUID, amount float64, reason string, userID uuid.UUID) (*models.Bill, error) {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var bill models.Bill
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&bill, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if amount <= 0 || amount > bill.PaidAmount {
			return ErrRefundExceedsPaid
		}
		paid := bill.PaidAmount - amount
		status := models.BillPartial
		switch {
		case paid <= 0:
			paid = 0
			status = models.BillUnpaid
		case paid >= bill.NetAmount:
			status = models.BillPaid
		}
		if err := tx.Model(&models.Bill{}).Where("id = ?", id).Updates(map[string]interface{}{
			"paid_amount":    paid,
			"due_amount":     bill.NetAmount - paid,
			"payment_status": status,
		}).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.Payment{
			BillID:           bill.ID,
			Amount:           -amount,
			Method:           models.PaymentMethodRefund,
			ReferenceNumber:  truncate(reason, 64),
			ReceivedByUserID: userID,
		}).Error; err != nil {
			return err
		}
		if bill.EncounterID != nil {
			if err := r.syncEncounterPayment(tx, *bill.EncounterID); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.FindBillByID(id)
}
