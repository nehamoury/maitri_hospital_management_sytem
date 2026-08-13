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
	FindBillByID(id uuid.UUID, scope *models.DataScope) (*models.Bill, error)
	FindBillByNo(no string, scope *models.DataScope) (*models.Bill, error)
	ListBills(filter BillFilter, scope *models.DataScope) ([]models.Bill, error)
	NextBillNumber(year int) (string, error)
	ApplyPayment(id uuid.UUID, amount float64, method, ref string, userID uuid.UUID) (*models.Bill, error)
	ApplyRefund(id uuid.UUID, amount float64, reason string, userID uuid.UUID) (*models.Bill, error)
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

// applyDoctorScope restricts bill queries to bills on patients the given
// doctor has treated. A nil scope or a scope without a DoctorID leaves the
// query unscoped (billing desk gets full access).
func applyDoctorScope(q *gorm.DB, scope *models.DataScope) *gorm.DB {
	if scope == nil || scope.DoctorID == nil {
		return q
	}
	return q.Where("EXISTS (SELECT 1 FROM encounters WHERE encounters.patient_id = bills.patient_id AND encounters.doctor_id = ? AND encounters.deleted_at IS NULL)", *scope.DoctorID)
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
	return r.FindBillByID(bill.ID, nil)
}

// syncEncounterPayment recomputes an encounter's payment_status from all of
// its linked bills, so OPD records never drift from the billing state.
func (r *repository) syncEncounterPayment(tx *gorm.DB, encounterID uuid.UUID) error {
	var bills []models.Bill
	if err := tx.Where("encounter_id = ?", encounterID).Find(&bills).Error; err != nil {
		return err
	}
	status := models.PaymentUnpaid
	if len(bills) > 0 {
		var totalNet, totalPaid float64
		anyPaid, allPaid := false, true
		for _, b := range bills {
			totalNet += b.NetAmount
			totalPaid += b.PaidAmount
			if b.PaidAmount > 0 {
				anyPaid = true
			}
			if b.PaymentStatus != models.BillPaid {
				allPaid = false
			}
		}
		if allPaid && totalPaid > 0 && totalPaid >= totalNet {
			status = models.PaymentPaid
		} else if anyPaid {
			status = models.PaymentPartial
		}
	}
	return tx.Model(&models.Encounter{}).Where("id = ?", encounterID).Update("payment_status", status).Error
}

func (r *repository) FindBillByID(id uuid.UUID, scope *models.DataScope) (*models.Bill, error) {
	var b models.Bill
	query := r.db.Preload("Patient").Preload("Items").Preload("BilledBy").
		Preload("Payments").
		Where("bills.id = ?", id)
	applyDoctorScope(query, scope)
	err := query.First(&b).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &b, err
}

func (r *repository) FindBillByNo(no string, scope *models.DataScope) (*models.Bill, error) {
	var b models.Bill
	query := r.db.Preload("Patient").Preload("Items").Preload("BilledBy").
		Preload("Payments").
		Where("bills.bill_no = ?", no)
	applyDoctorScope(query, scope)
	err := query.First(&b).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &b, err
}

func (r *repository) ListBills(filter BillFilter, scope *models.DataScope) ([]models.Bill, error) {
	query := r.db.Preload("Patient").Preload("Items").Preload("BilledBy").Where("bills.deleted_at IS NULL").Order("bills.created_at desc")
	applyDoctorScope(query, scope)
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
