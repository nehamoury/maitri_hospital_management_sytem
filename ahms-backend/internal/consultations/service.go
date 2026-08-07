package consultations

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains consultation business logic.
type Service interface {
	Create(encounterID uuid.UUID, req CreateConsultationRequest, doctorUserID uuid.UUID) (*models.Consultation, error)
	GetByEncounterID(encounterID uuid.UUID) (*models.Consultation, error)
	GetByID(id uuid.UUID) (*models.Consultation, error)
	Update(id uuid.UUID, req UpdateConsultationRequest) (*models.Consultation, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func parseFollowUp(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func (s *service) Create(encounterID uuid.UUID, req CreateConsultationRequest, doctorUserID uuid.UUID) (*models.Consultation, error) {
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

	followUp, err := parseFollowUp(req.FollowUpDate)
	if err != nil {
		return nil, err
	}

	c := &models.Consultation{
		EncounterID:     encounterID,
		DoctorID:        doctor.ID,
		ChiefComplaints: req.ChiefComplaints,
		History:         req.History,
		Examination:     req.Examination,
		ClinicalNotes:   req.ClinicalNotes,
		TreatmentPlan:   req.TreatmentPlan,
		DietPathya:      req.DietPathya,
		DietApathya:     req.DietApathya,
		AyurvedaFields:  req.AyurvedaFields,
		FollowUpDate:    followUp,
	}

	diagnoses := buildDiagnoses(encounterID, doctor.ID, req.Diagnoses)

	if err := s.repo.CreateWithDiagnoses(c, diagnoses); err != nil {
		return nil, err
	}

	// A saved consultation means the consultation is done — complete the encounter.
	if err := s.repo.CompleteEncounter(encounterID); err != nil {
		return nil, err
	}

	return s.repo.FindByID(c.ID)
}

func (s *service) GetByEncounterID(encounterID uuid.UUID) (*models.Consultation, error) {
	return s.repo.FindByEncounterID(encounterID)
}

func (s *service) GetByID(id uuid.UUID) (*models.Consultation, error) {
	return s.repo.FindByID(id)
}

func (s *service) Update(id uuid.UUID, req UpdateConsultationRequest) (*models.Consultation, error) {
	c, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	followUp, err := parseFollowUp(req.FollowUpDate)
	if err != nil {
		return nil, err
	}

	c.ChiefComplaints = req.ChiefComplaints
	c.History = req.History
	c.Examination = req.Examination
	c.ClinicalNotes = req.ClinicalNotes
	c.TreatmentPlan = req.TreatmentPlan
	c.DietPathya = req.DietPathya
	c.DietApathya = req.DietApathya
	c.AyurvedaFields = req.AyurvedaFields
	c.FollowUpDate = followUp

	diagnoses := buildDiagnoses(c.EncounterID, c.DoctorID, req.Diagnoses)

	if err := s.repo.UpdateWithDiagnoses(c, diagnoses); err != nil {
		return nil, err
	}
	return s.repo.FindByID(c.ID)
}

func buildDiagnoses(encounterID, doctorID uuid.UUID, inputs []DiagnosisInput) []models.Diagnosis {
	diagnoses := make([]models.Diagnosis, 0, len(inputs))
	for _, in := range inputs {
		dtype := in.DiagnosisType
		if dtype == "" {
			dtype = models.DiagnosisPrimary
		}
		diagnoses = append(diagnoses, models.Diagnosis{
			EncounterID:   encounterID,
			Diagnosis:     in.Diagnosis,
			DiagnosisType: dtype,
			Notes:         in.Notes,
			DoctorID:      doctorID,
		})
	}
	return diagnoses
}
