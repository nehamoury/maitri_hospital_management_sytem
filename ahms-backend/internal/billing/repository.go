package billing

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when an id doesn't match any row.
var ErrNotFound = errors.New("record not found")

// Repository is the data-access layer for billing.
type Repository interface {
	CreateBill(bill *models.Bill, items []models.BillItem) (*models.Bill, error)
	FindBillByID(id uuid.UUID) (*models.Bill, error)
	FindBillByNo(no string) (*models.Bill, error)
	ListBills(filter BillFilter) ([]models.Bill, error)
	NextBillNumber(year int) (string, error)
	ApplyPayment(id uuid.UUID, amount float64, method, ref string, userID uuid.UUID) (*models.Bill, error)
}

// BillFilter narrows the bill listing.
type BillFilter struct {
	Status    string
	Query     string
	PatientID string
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a billing Repository.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateBill(bill *models.Bill, items []models.BillItem) (*models.Bill, error) {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(bill).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].BillID = bill.ID
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.FindBillByID(bill.ID)
}

func (r *repository) FindBillByID(id uuid.UUID) (*models.Bill, error) {
	var b models.Bill
	err := r.db.Preload("Patient").Preload("Items").Preload("BilledBy").
		First(&b, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &b, err
}

func (r *repository) FindBillByNo(no string) (*models.Bill, error) {
	var b models.Bill
	err := r.db.Preload("Patient").Preload("Items").Preload("BilledBy").
		First(&b, "bill_no = ?", no).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &b, err
}

func (r *repository) ListBills(filter BillFilter) ([]models.Bill, error) {
	query := r.db.Preload("Patient").Preload("Items").Preload("BilledBy").Order("created_at desc")
	if filter.Status != "" {
		query = query.Where("payment_status = ?", filter.Status)
	}
	if filter.Query != "" {
		like := "%" + filter.Query + "%"
		query = query.Where("bill_no ILIKE ?", like)
	}
	if filter.PatientID != "" {
		query = query.Where("patient_id = ?", filter.PatientID)
	}
	var list []models.Bill
	err := query.Find(&list).Error
	return list, err
}

// NextBillNumber increments the yearly counter and returns the next
// BILL-YYYY-NNNNNN number atomically.
func (r *repository) NextBillNumber(year int) (string, error) {
	var no string
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var counter models.BillCounter
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			FirstOrCreate(&counter, models.BillCounter{Year: year}).Error; err != nil {
			return err
		}
		counter.LastNumber++
		if err := tx.Save(&counter).Error; err != nil {
			return err
		}
		no = formatBillNo(year, counter.LastNumber)
		return nil
	})
	return no, err
}

func formatBillNo(year, n int) string {
	return "BILL-" + itoa(year) + "-" + pad(n)
}
