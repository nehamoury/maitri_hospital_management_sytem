package prescriptions

import (
	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains prescription business logic.
type Service interface {
	Create(encounterID uuid.UUID, req CreatePrescriptionRequest, doctorUserID uuid.UUID) (*models.Prescription, error)
	GetByEncounterID(encounterID uuid.UUID) (*models.Prescription, error)
	GetByID(id uuid.UUID) (*models.Prescription, error)
	GetByIDForPrint(id uuid.UUID) (*models.Prescription, error)
	List(in ListInput) ([]models.Prescription, error)
	UpdateStatus(id uuid.UUID, status string) (*models.Prescription, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(encounterID uuid.UUID, req CreatePrescriptionRequest, doctorUserID uuid.UUID) (*models.Prescription, error) {
	exists, err := s.repo.EncounterExists(encounterID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	doctor, err := s.repo.FindDoctorByUserID(doctorUserID)
	if err != nil {
		return nil, err
	}

	p := &models.Prescription{
		EncounterID: encounterID,
		DoctorID:    doctor.ID,
		Status:      models.PrescriptionPrescribed,
		Notes:       req.Notes,
	}

	items := make([]models.PrescriptionItem, 0, len(req.Items))
	for _, in := range req.Items {
		items = append(items, models.PrescriptionItem{
			Medicine:     in.Medicine,
			Formulation:  in.Formulation,
			Dose:         in.Dose,
			Frequency:    in.Frequency,
			Duration:     in.Duration,
			Quantity:     in.Quantity,
			Anupana:      in.Anupana,
			Route:        in.Route,
			Instructions: in.Instructions,
		})
	}

	if err := s.repo.CreateWithItems(p, items); err != nil {
		return nil, err
	}
	return s.repo.FindByID(p.ID)
}

func (s *service) GetByEncounterID(encounterID uuid.UUID) (*models.Prescription, error) {
	return s.repo.FindByEncounterID(encounterID)
}

func (s *service) GetByID(id uuid.UUID) (*models.Prescription, error) {
	return s.repo.FindByID(id)
}

func (s *service) GetByIDForPrint(id uuid.UUID) (*models.Prescription, error) {
	return s.repo.FindByIDForPrint(id)
}

func (s *service) List(in ListInput) ([]models.Prescription, error) {
	return s.repo.List(in)
}

func (s *service) UpdateStatus(id uuid.UUID, status string) (*models.Prescription, error) {
	return s.repo.UpdateStatus(id, status)
}
