package billing

import (
	"errors"
	"testing"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	bill      *models.Bill
	nextNo    string
	notFound  bool
	paymentID uuid.UUID
}

func (f *fakeRepo) CreateBill(bill *models.Bill, items []models.BillItem) (*models.Bill, error) {
	bill.ID = uuid.New()
	bill.BillNo = f.nextNo
	bill.Items = items
	f.bill = bill
	return bill, nil
}

func (f *fakeRepo) FindBillByID(id uuid.UUID, scope *models.DataScope) (*models.Bill, error) {
	if f.notFound || f.bill == nil {
		return nil, ErrNotFound
	}
	return f.bill, nil
}

func (f *fakeRepo) FindBillByNo(no string, scope *models.DataScope) (*models.Bill, error) {
	if f.bill != nil && f.bill.BillNo == no {
		return f.bill, nil
	}
	return nil, ErrNotFound
}

func (f *fakeRepo) ListBills(filter BillFilter, scope *models.DataScope) ([]models.Bill, error) {
	return nil, nil
}

func (f *fakeRepo) NextBillNumber(year int) (string, error) {
	return f.nextNo, nil
}

func (f *fakeRepo) ApplyPayment(id uuid.UUID, amount float64, method, ref string, userID uuid.UUID) (*models.Bill, error) {
	if f.bill == nil {
		return nil, ErrNotFound
	}
	f.bill.PaidAmount += amount
	f.bill.DueAmount = f.bill.NetAmount - f.bill.PaidAmount
	if f.bill.PaidAmount >= f.bill.NetAmount {
		f.bill.PaymentStatus = models.BillPaid
	} else if f.bill.PaidAmount > 0 {
		f.bill.PaymentStatus = models.BillPartial
	}
	f.paymentID = uuid.New()
	return f.bill, nil
}

func (f *fakeRepo) ApplyRefund(id uuid.UUID, amount float64, reason string, userID uuid.UUID) (*models.Bill, error) {
	if f.bill == nil {
		return nil, ErrNotFound
	}
	if amount <= 0 || amount > f.bill.PaidAmount {
		return nil, ErrRefundExceedsPaid
	}
	f.bill.PaidAmount -= amount
	f.bill.DueAmount = f.bill.NetAmount - f.bill.PaidAmount
	switch {
	case f.bill.PaidAmount <= 0:
		f.bill.PaymentStatus = models.BillUnpaid
	case f.bill.PaidAmount >= f.bill.NetAmount:
		f.bill.PaymentStatus = models.BillPaid
	default:
		f.bill.PaymentStatus = models.BillPartial
	}
	return f.bill, nil
}

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func TestCreateBillComputesTotals(t *testing.T) {
	repo := &fakeRepo{nextNo: "BILL-2026-000001"}
	svc := newTestService(repo)

	bill, err := svc.CreateBill(CreateBillRequest{
		PatientID: uuid.NewString(),
		Discount:  100,
		Items: []BillItemInput{
			{Description: "OPD Consultation", Quantity: 1, Rate: 500, ServiceType: "OPD"},
			{Description: "Chyawanprash", Quantity: 1, Rate: 450, ServiceType: "PHARMACY"},
		},
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if bill.TotalAmount != 950 {
		t.Fatalf("expected total 950, got %v", bill.TotalAmount)
	}
	if bill.NetAmount != 850 {
		t.Fatalf("expected net 850 after discount, got %v", bill.NetAmount)
	}
	if bill.DueAmount != 850 {
		t.Fatalf("expected due 850, got %v", bill.DueAmount)
	}
	if bill.PaymentStatus != models.BillUnpaid {
		t.Fatalf("expected UNPAID status, got %s", bill.PaymentStatus)
	}
	if bill.BillNo != "BILL-2026-000001" {
		t.Fatalf("expected generated bill no, got %s", bill.BillNo)
	}
}

func TestCreateBillDefaultsServiceType(t *testing.T) {
	repo := &fakeRepo{nextNo: "BILL-2026-000002"}
	svc := newTestService(repo)

	bill, err := svc.CreateBill(CreateBillRequest{
		PatientID: uuid.NewString(),
		Items: []BillItemInput{
			{Description: "Yoga Session", Quantity: 1, Rate: 300},
		},
	}, uuid.New())

	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if bill.Items[0].ServiceType != models.BillServiceOPD {
		t.Fatalf("expected OPD default service type, got %s", bill.Items[0].ServiceType)
	}
}

func TestCreateBillRejectsInvalidPatient(t *testing.T) {
	repo := &fakeRepo{nextNo: "BILL-2026-000003"}
	svc := newTestService(repo)

	_, err := svc.CreateBill(CreateBillRequest{
		PatientID: "not-a-uuid",
		Items:     []BillItemInput{{Description: "X", Quantity: 1, Rate: 100}},
	}, uuid.New())

	if err == nil {
		t.Fatal("invalid patient id must return an error")
	}
}

func TestAddPaymentPartialThenPaid(t *testing.T) {
	bill := &models.Bill{
		BaseModel:     models.BaseModel{ID: uuid.New()},
		NetAmount:     1000,
		PaidAmount:    0,
		DueAmount:     1000,
		PaymentStatus: models.BillUnpaid,
	}
	repo := &fakeRepo{bill: bill}
	svc := newTestService(repo)

	b1, err := svc.AddPayment(bill.ID, PaymentRequest{Amount: float64Ptr(400), Method: "CASH"}, uuid.New())
	if err != nil {
		t.Fatalf("partial payment should succeed, got %v", err)
	}
	if b1.PaymentStatus != models.BillPartial || b1.DueAmount != 600 {
		t.Fatalf("expected PARTIAL / due 600, got %s / %v", b1.PaymentStatus, b1.DueAmount)
	}

	b2, err := svc.AddPayment(bill.ID, PaymentRequest{Amount: float64Ptr(600), Method: "UPI"}, uuid.New())
	if err != nil {
		t.Fatalf("final payment should succeed, got %v", err)
	}
	if b2.PaymentStatus != models.BillPaid || b2.DueAmount != 0 {
		t.Fatalf("expected PAID / due 0, got %s / %v", b2.PaymentStatus, b2.DueAmount)
	}
}

func TestAddPaymentNotFound(t *testing.T) {
	repo := &fakeRepo{notFound: true}
	svc := newTestService(repo)

	_, err := svc.AddPayment(uuid.New(), PaymentRequest{Amount: float64Ptr(100), Method: "CASH"}, uuid.New())
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestRefundPaymentRecomputesStatus(t *testing.T) {
	bill := &models.Bill{
		BaseModel:     models.BaseModel{ID: uuid.New()},
		NetAmount:     1000,
		PaidAmount:    600,
		DueAmount:     400,
		PaymentStatus: models.BillPartial,
	}
	repo := &fakeRepo{bill: bill}
	svc := newTestService(repo)

	// Partial refund keeps the bill PARTIAL.
	b, err := svc.RefundPayment(bill.ID, RefundRequest{Amount: float64Ptr(200), Reason: "overcharged"}, uuid.New())
	if err != nil {
		t.Fatalf("refund should succeed, got %v", err)
	}
	if b.PaymentStatus != models.BillPartial || b.PaidAmount != 400 || b.DueAmount != 600 {
		t.Fatalf("expected PARTIAL / paid 400 / due 600, got %s / %v / %v", b.PaymentStatus, b.PaidAmount, b.DueAmount)
	}

	// Refunding everything restores UNPAID.
	b2, err := svc.RefundPayment(bill.ID, RefundRequest{Amount: float64Ptr(400), Reason: "full refund"}, uuid.New())
	if err != nil {
		t.Fatalf("full refund should succeed, got %v", err)
	}
	if b2.PaymentStatus != models.BillUnpaid || b2.PaidAmount != 0 || b2.DueAmount != b2.NetAmount {
		t.Fatalf("expected UNPAID / paid 0, got %s / %v", b2.PaymentStatus, b2.PaidAmount)
	}
}

func TestRefundPaymentValidation(t *testing.T) {
	repo := &fakeRepo{notFound: true}
	svc := newTestService(repo)

	_, err := svc.RefundPayment(uuid.New(), RefundRequest{Amount: float64Ptr(0), Reason: "zero"}, uuid.New())
	if err == nil {
		t.Fatal("refunding 0 must return an error")
	}

	_, err = svc.RefundPayment(uuid.New(), RefundRequest{Reason: "no amount"}, uuid.New())
	if err == nil {
		t.Fatal("missing amount must return an error")
	}

	bill := &models.Bill{
		BaseModel:     models.BaseModel{ID: uuid.New()},
		NetAmount:     1000,
		PaidAmount:    100,
		DueAmount:     900,
		PaymentStatus: models.BillPartial,
	}
	repo2 := &fakeRepo{bill: bill}
	svc2 := newTestService(repo2)
	_, err = svc2.RefundPayment(bill.ID, RefundRequest{Amount: float64Ptr(500), Reason: "too much"}, uuid.New())
	if err == nil {
		t.Fatal("refunding more than paid must return an error")
	}
}

func TestGetBillByNo(t *testing.T) {
	bill := &models.Bill{BaseModel: models.BaseModel{ID: uuid.New()}, BillNo: "BILL-2026-000010"}
	repo := &fakeRepo{bill: bill}
	svc := newTestService(repo)

	got, err := svc.GetBillByNo("BILL-2026-000010", nil)
	if err != nil {
		t.Fatalf("lookup should succeed, got %v", err)
	}
	if got.BillNo != "BILL-2026-000010" {
		t.Fatalf("unexpected bill: %s", got.BillNo)
	}

	_, err = svc.GetBillByNo("BILL-2026-999999", nil)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func float64Ptr(v float64) *float64 { return &v }
