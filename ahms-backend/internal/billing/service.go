package billing

import (
	"errors"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains billing business logic.
type Service interface {
	CreateBill(req CreateBillRequest, userID uuid.UUID) (*models.Bill, error)
	GetBill(id uuid.UUID, scope *models.DataScope) (*models.Bill, error)
	GetBillByNo(no string, scope *models.DataScope) (*models.Bill, error)
	ListBills(status, query string, scope *models.DataScope) ([]models.Bill, error)
	ListBillsByPatient(patientID uuid.UUID, scope *models.DataScope) ([]models.Bill, error)
	AddPayment(id uuid.UUID, req PaymentRequest, userID uuid.UUID) (*models.Bill, error)
	RefundPayment(id uuid.UUID, req RefundRequest, userID uuid.UUID) (*models.Bill, error)
}

type service struct {
	repo Repository
}

// NewService builds a billing Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateBill(req CreateBillRequest, userID uuid.UUID) (*models.Bill, error) {
	patientID, err := uuid.Parse(req.PatientID)
	if err != nil {
		return nil, err
	}
	items := make([]models.BillItem, 0, len(req.Items))
	total := 0.0
	for _, in := range req.Items {
		serviceType := in.ServiceType
		if serviceType == "" {
			serviceType = models.BillServiceOPD
		}
		amount := in.Rate * float64(in.Quantity)
		total += amount
		items = append(items, models.BillItem{
			Description: in.Description,
			Quantity:    in.Quantity,
			Rate:        in.Rate,
			Amount:      amount,
			ServiceType: serviceType,
		})
	}

	year := time.Now().Year()
	no, err := s.repo.NextBillNumber(year)
	if err != nil {
		return nil, err
	}

	net := total - req.Discount
	if net < 0 {
		net = 0
	}
	status := models.BillUnpaid
	if net <= 0 {
		status = models.BillPaid
	}
	bill := &models.Bill{
		BillNo:        no,
		PatientID:     patientID,
		TotalAmount:   total,
		Discount:      req.Discount,
		NetAmount:     net,
		PaidAmount:    0,
		DueAmount:     net,
		PaymentStatus: status,
		BilledByUserID: userID,
	}
	if req.EncounterID != "" {
		eid, err := uuid.Parse(req.EncounterID)
		if err != nil {
			return nil, err
		}
		bill.EncounterID = &eid
	}
	if req.AdmissionID != "" {
		aid, err := uuid.Parse(req.AdmissionID)
		if err != nil {
			return nil, err
		}
		bill.AdmissionID = &aid
	}
	return s.repo.CreateBill(bill, items)
}

func (s *service) GetBill(id uuid.UUID, scope *models.DataScope) (*models.Bill, error) {
	return s.repo.FindBillByID(id, scope)
}

func (s *service) GetBillByNo(no string, scope *models.DataScope) (*models.Bill, error) {
	return s.repo.FindBillByNo(no, scope)
}

func (s *service) ListBills(status, query string, scope *models.DataScope) ([]models.Bill, error) {
	return s.repo.ListBills(BillFilter{Status: status, Query: query}, scope)
}

func (s *service) ListBillsByPatient(patientID uuid.UUID, scope *models.DataScope) ([]models.Bill, error) {
	return s.repo.ListBills(BillFilter{PatientID: patientID.String()}, scope)
}

func (s *service) AddPayment(id uuid.UUID, req PaymentRequest, userID uuid.UUID) (*models.Bill, error) {
	return s.repo.ApplyPayment(id, *req.Amount, req.Method, req.Reference, userID)
}

// RefundPayment validates the refund amount and reverses a collection.
func (s *service) RefundPayment(id uuid.UUID, req RefundRequest, userID uuid.UUID) (*models.Bill, error) {
	if req.Amount == nil || *req.Amount <= 0 {
		return nil, errors.New("refund amount must be greater than zero")
	}
	return s.repo.ApplyRefund(id, *req.Amount, req.Reason, userID)
}
