package pharmacy

import (
	"errors"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains pharmacy business logic.
type Service interface {
	CreateMedicine(req CreateMedicineRequest) (*models.Medicine, error)
	ListMedicines(search string, lowStock bool, outOfStock bool, nearExpiry bool, expired bool) ([]models.Medicine, error)
	GetMedicine(id uuid.UUID) (*models.Medicine, error)
	UpdateMedicine(id uuid.UUID, req UpdateMedicineRequest) (*models.Medicine, error)
	AdjustStock(id uuid.UUID, req StockAdjustRequest, userID uuid.UUID) (*models.Medicine, error)
	ReturnStock(id uuid.UUID, req ReturnStockRequest, userID uuid.UUID) (*models.Medicine, error)
	ListTransactions(id uuid.UUID) ([]models.InventoryTransaction, error)
	Dispense(prescriptionID uuid.UUID, req DispenseRequest, userID uuid.UUID) (*models.Prescription, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateMedicine(req CreateMedicineRequest) (*models.Medicine, error) {
	m := &models.Medicine{
		Name:              req.Name,
		Formulation:       req.Formulation,
		Unit:              req.Unit,
		BatchNumber:       req.BatchNumber,
		StockQty:          req.StockQty,
		LowStockThreshold: req.LowStockThreshold,
		IsActive:          true,
	}
	if req.ExpiryDate != "" {
		if t, err := time.Parse("2006-01-02", req.ExpiryDate); err == nil {
			m.ExpiryDate = &t
		}
	}
	if m.LowStockThreshold == 0 {
		m.LowStockThreshold = 10
	}
	if err := s.repo.CreateMedicine(m); err != nil {
		return nil, err
	}
	return s.repo.FindMedicineByID(m.ID)
}

func (s *service) ListMedicines(search string, lowStock bool, outOfStock bool, nearExpiry bool, expired bool) ([]models.Medicine, error) {
	return s.repo.FindAllMedicines(search, lowStock, outOfStock, nearExpiry, expired)
}

func (s *service) GetMedicine(id uuid.UUID) (*models.Medicine, error) {
	return s.repo.FindMedicineByID(id)
}

func (s *service) UpdateMedicine(id uuid.UUID, req UpdateMedicineRequest) (*models.Medicine, error) {
	m, err := s.repo.FindMedicineByID(id)
	if err != nil {
		return nil, err
	}
	m.Name = req.Name
	m.Formulation = req.Formulation
	m.Unit = req.Unit
	m.BatchNumber = req.BatchNumber
	m.LowStockThreshold = req.LowStockThreshold
	if req.ExpiryDate != "" {
		if t, err := time.Parse("2006-01-02", req.ExpiryDate); err == nil {
			m.ExpiryDate = &t
		}
	} else {
		m.ExpiryDate = nil
	}
	if req.IsActive != nil {
		m.IsActive = *req.IsActive
	}
	if err := s.repo.UpdateMedicine(m); err != nil {
		return nil, err
	}
	return s.repo.FindMedicineByID(id)
}

func (s *service) AdjustStock(id uuid.UUID, req StockAdjustRequest, userID uuid.UUID) (*models.Medicine, error) {
	m, err := s.repo.FindMedicineByID(id)
	if err != nil {
		return nil, err
	}
	if err := s.repo.AdjustStock(m, req.Quantity, req.BatchNumber, req.Notes, userID); err != nil {
		return nil, err
	}
	return s.repo.FindMedicineByID(id)
}

func (s *service) ReturnStock(id uuid.UUID, req ReturnStockRequest, userID uuid.UUID) (*models.Medicine, error) {
	m, err := s.repo.FindMedicineByID(id)
	if err != nil {
		return nil, err
	}
	if err := s.repo.ReturnStock(m, req.Quantity, req.BatchNumber, req.Notes, userID); err != nil {
		return nil, err
	}
	return s.repo.FindMedicineByID(id)
}

func (s *service) ListTransactions(id uuid.UUID) ([]models.InventoryTransaction, error) {
	return s.repo.ListTransactions(id)
}

func (s *service) Dispense(prescriptionID uuid.UUID, req DispenseRequest, userID uuid.UUID) (*models.Prescription, error) {
	rx, err := s.repo.FindPrescriptionWithItems(prescriptionID)
	if err != nil {
		return nil, err
	}

	updates := make([]dispenseUpdate, 0, len(req.Items))
	for _, in := range req.Items {
		itemID, err := uuid.Parse(in.PrescriptionItemID)
		if err != nil {
			return nil, err
		}
		upd := dispenseUpdate{ItemID: itemID, Dispensed: in.Quantity}
		if in.MedicineID != "" {
			mid, err := uuid.Parse(in.MedicineID)
			if err != nil {
				return nil, err
			}
			upd.MedicineID = &mid
		}
		updates = append(updates, upd)
	}

	if err := s.repo.DispenseItems(rx, updates, userID); err != nil {
		if errors.Is(err, ErrInsufficientStock) {
			return nil, ErrInsufficientStock
		}
		return nil, err
	}
	return s.repo.FindPrescriptionWithItems(prescriptionID)
}
