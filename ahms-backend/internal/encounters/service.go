package encounters

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains encounter business logic.
type Service interface {
	Create(req CreateEncounterRequest, createdByUserID uuid.UUID) (*models.Encounter, error)
	List(patientID, departmentID, doctorID, status string, date string, scope *models.DataScope) ([]models.Encounter, error)
	GetByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error)
	UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Encounter, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(req CreateEncounterRequest, createdByUserID uuid.UUID) (*models.Encounter, error) {
	patientID, err := uuid.Parse(req.PatientID)
	if err != nil {
		return nil, err
	}
	departmentID, err := uuid.Parse(req.DepartmentID)
	if err != nil {
		return nil, err
	}
	doctorID, err := uuid.Parse(req.DoctorID)
	if err != nil {
		return nil, err
	}

	var referralID *uuid.UUID
	if req.ReferralID != "" {
		rid, err := uuid.Parse(req.ReferralID)
		if err != nil {
			return nil, err
		}
		referralID = &rid
	}

	visitDate := time.Now()
	if req.VisitDate != "" {
		parsed, err := time.Parse("2006-01-02", req.VisitDate)
		if err != nil {
			return nil, err
		}
		visitDate = parsed
	}

	encounterType := req.EncounterType
	if encounterType == "" {
		encounterType = models.EncounterTypeOPD
	}
	visitType := req.VisitType
	if visitType == "" {
		visitType = models.VisitTypeNew
	}

	e := &models.Encounter{
		PatientID:       patientID,
		DepartmentID:    departmentID,
		DoctorID:        doctorID,
		EncounterType:   encounterType,
		VisitType:       visitType,
		VisitDate:       visitDate,
		Status:          models.EncounterRegistered,
		ConsultationFee: req.ConsultationFee,
		PaymentStatus:   models.PaymentUnpaid,
		ReferralID:      referralID,
		CreatedByUserID: createdByUserID,
	}

	if err := s.repo.CreateWithToken(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *service) List(patientID, departmentID, doctorID, status, date string, scope *models.DataScope) ([]models.Encounter, error) {
	var pID, dID, docID *uuid.UUID
	if patientID != "" {
		id, err := uuid.Parse(patientID)
		if err != nil {
			return nil, err
		}
		pID = &id
	}
	if departmentID != "" {
		id, err := uuid.Parse(departmentID)
		if err != nil {
			return nil, err
		}
		dID = &id
	}
	if doctorID != "" {
		id, err := uuid.Parse(doctorID)
		if err != nil {
			return nil, err
		}
		docID = &id
	}

	var day *time.Time
	if date != "" {
		parsed, err := time.Parse("2006-01-02", date)
		if err != nil {
			return nil, err
		}
		day = &parsed
	}

	return s.repo.FindAll(pID, dID, docID, status, day, scope)
}

func (s *service) GetByID(id uuid.UUID, scope *models.DataScope) (*models.Encounter, error) {
	return s.repo.FindByID(id, scope)
}

func (s *service) UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Encounter, error) {
	return s.repo.UpdateStatus(id, status, scope)
}
