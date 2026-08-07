package pharmacy

import (
	"errors"
	"testing"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

type fakeRepo struct {
	medicine      *models.Medicine
	prescription  *models.Prescription
	dispensed     []dispenseUpdate
	insufficient  bool
	notFound      bool
}

func (f *fakeRepo) CreateMedicine(m *models.Medicine) error {
	m.ID = uuid.New()
	f.medicine = m
	return nil
}

func (f *fakeRepo) FindAllMedicines(search string, lowStock bool, nearExpiry bool, expired bool) ([]models.Medicine, error) {
	return nil, nil
}

func (f *fakeRepo) FindMedicineByID(id uuid.UUID) (*models.Medicine, error) {
	if f.notFound || f.medicine == nil {
		return nil, ErrNotFound
	}
	return f.medicine, nil
}

func (f *fakeRepo) UpdateMedicine(m *models.Medicine) error {
	f.medicine = m
	return nil
}

func (f *fakeRepo) AdjustStock(m *models.Medicine, qty float64, batchNumber string, notes string, userID uuid.UUID) error {
	if f.insufficient && m.StockQty+qty < 0 {
		return ErrInsufficientStock
	}
	f.medicine.StockQty += qty
	return nil
}

func (f *fakeRepo) FindPrescriptionWithItems(id uuid.UUID) (*models.Prescription, error) {
	if f.prescription == nil {
		return nil, ErrNotFound
	}
	return f.prescription, nil
}

func (f *fakeRepo) DispenseItems(rx *models.Prescription, updates []dispenseUpdate, userID uuid.UUID) error {
	if f.insufficient {
		return ErrInsufficientStock
	}
	f.dispensed = updates
	rx.Status = models.PrescriptionDispensed
	return nil
}

func (f *fakeRepo) FindDoctorOrStaffRoleName(userID uuid.UUID) (string, error) { return "", nil }

func newTestService(f *fakeRepo) Service {
	return NewService(f)
}

func TestCreateMedicineDefaultsThreshold(t *testing.T) {
	repo := &fakeRepo{}
	svc := newTestService(repo)

	m, err := svc.CreateMedicine(CreateMedicineRequest{Name: "Chyawanprash"})
	if err != nil {
		t.Fatalf("create should succeed, got %v", err)
	}
	if m.LowStockThreshold != 10 {
		t.Fatalf("expected default threshold 10, got %v", m.LowStockThreshold)
	}
	if !m.IsActive {
		t.Fatal("new medicine should be active by default")
	}
}

func TestAdjustStockHappyPath(t *testing.T) {
	repo := &fakeRepo{medicine: &models.Medicine{BaseModel: models.BaseModel{ID: uuid.New()}, StockQty: 50}}
	svc := newTestService(repo)

	m, err := svc.AdjustStock(repo.medicine.ID, StockAdjustRequest{Quantity: 100}, uuid.New())
	if err != nil {
		t.Fatalf("adjust should succeed, got %v", err)
	}
	if m.StockQty != 150 {
		t.Fatalf("expected stock 150, got %v", m.StockQty)
	}
}

func TestAdjustStockRejectsNegativeBalance(t *testing.T) {
	repo := &fakeRepo{medicine: &models.Medicine{BaseModel: models.BaseModel{ID: uuid.New()}, StockQty: 10}, insufficient: true}
	svc := newTestService(repo)

	_, err := svc.AdjustStock(repo.medicine.ID, StockAdjustRequest{Quantity: -50}, uuid.New())
	if !errors.Is(err, ErrInsufficientStock) {
		t.Fatalf("expected ErrInsufficientStock, got %v", err)
	}
}

func TestDispenseHappyPath(t *testing.T) {
	item := models.PrescriptionItem{BaseModel: models.BaseModel{ID: uuid.New()}, Medicine: "Chyawanprash", Quantity: 30}
	rx := &models.Prescription{
		BaseModel: models.BaseModel{ID: uuid.New()},
		Status:    models.PrescriptionPrescribed,
		Items:     []models.PrescriptionItem{item},
	}
	repo := &fakeRepo{prescription: rx}
	svc := newTestService(repo)

	medID := uuid.New()
	_, err := svc.Dispense(rx.ID, DispenseRequest{
		Items: []DispenseItem{
			{PrescriptionItemID: item.ID.String(), Quantity: 30, MedicineID: medID.String()},
		},
	}, uuid.New())

	if err != nil {
		t.Fatalf("dispense should succeed, got %v", err)
	}
	if len(repo.dispensed) != 1 || repo.dispensed[0].MedicineID == nil || *repo.dispensed[0].MedicineID != medID {
		t.Fatal("dispense update should carry the linked medicine id")
	}
}

func TestDispenseRejectsInsufficientStock(t *testing.T) {
	item := models.PrescriptionItem{BaseModel: models.BaseModel{ID: uuid.New()}, Medicine: "Triphala", Quantity: 12}
	rx := &models.Prescription{
		BaseModel: models.BaseModel{ID: uuid.New()},
		Status:    models.PrescriptionPrescribed,
		Items:     []models.PrescriptionItem{item},
	}
	repo := &fakeRepo{prescription: rx, insufficient: true}
	svc := newTestService(repo)

	_, err := svc.Dispense(rx.ID, DispenseRequest{
		Items: []DispenseItem{
			{PrescriptionItemID: item.ID.String(), Quantity: 12, MedicineID: uuid.NewString()},
		},
	}, uuid.New())

	if !errors.Is(err, ErrInsufficientStock) {
		t.Fatalf("expected ErrInsufficientStock, got %v", err)
	}
}

func TestDispenseRejectsInvalidItemID(t *testing.T) {
	rx := &models.Prescription{
		BaseModel: models.BaseModel{ID: uuid.New()},
		Status:    models.PrescriptionPrescribed,
		Items:     []models.PrescriptionItem{{BaseModel: models.BaseModel{ID: uuid.New()}, Quantity: 10}},
	}
	repo := &fakeRepo{prescription: rx}
	svc := newTestService(repo)

	_, err := svc.Dispense(rx.ID, DispenseRequest{
		Items: []DispenseItem{{PrescriptionItemID: "not-a-uuid", Quantity: 10}},
	}, uuid.New())

	if err == nil {
		t.Fatal("invalid item id must return an error")
	}
}

func TestDispenseRejectsMissingPrescription(t *testing.T) {
	repo := &fakeRepo{}
	svc := newTestService(repo)

	_, err := svc.Dispense(uuid.New(), DispenseRequest{
		Items: []DispenseItem{{PrescriptionItemID: uuid.NewString(), Quantity: 1}},
	}, uuid.New())

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
