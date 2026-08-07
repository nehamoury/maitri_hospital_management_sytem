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
		return tx.Create(&models.Payment{
			BillID:          bill.ID,
			Amount:          amount,
			Method:          method,
			ReferenceNumber: ref,
			ReceivedByUserID: userID,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return r.FindBillByID(id)
}
