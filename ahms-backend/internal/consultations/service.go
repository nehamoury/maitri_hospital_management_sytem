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

// ayurvedaScalars lists the typed Ayurvedic scalar assessments and their JSON
// key inside the legacy ayurveda_fields map. Column order matches request DTOs.
var ayurvedaScalars = []struct {
	key string
	col func(*models.Consultation) *string
}{
	{"prakriti", func(c *models.Consultation) *string { return &c.Prakriti }},
	{"vikriti", func(c *models.Consultation) *string { return &c.Vikriti }},
	{"dosha", func(c *models.Consultation) *string { return &c.Dosha }},
	{"agni", func(c *models.Consultation) *string { return &c.Agni }},
	{"nadi", func(c *models.Consultation) *string { return &c.Nadi }},
	{"mala", func(c *models.Consultation) *string { return &c.Mala }},
	{"mutra", func(c *models.Consultation) *string { return &c.Mutra }},
	{"jihva", func(c *models.Consultation) *string { return &c.Jihva }},
	{"nidra", func(c *models.Consultation) *string { return &c.Nidra }},
}

// applyAyurvedaSync keeps the typed scalar columns and the legacy
// ayurveda_fields JSONB map consistent. Explicitly sent typed fields win,
// empty typed fields are backfilled from the map (old payloads keep working),
// and the nested ashtavidha/dashavidha entries in the map are preserved.
func applyAyurvedaSync(c *models.Consultation, typed [9]string, mapFields models.JSONB) {
	af := mapFields
	if af == nil {
		if c.AyurvedaFields != nil {
			af = c.AyurvedaFields
		} else {
			af = models.JSONB{}
		}
	}
	for i, s := range ayurvedaScalars {
		val := typed[i]
		if val == "" {
			if v, ok := af[s.key]; ok {
				if str, ok := v.(string); ok {
					val = str
				}
			}
		} else {
			af[s.key] = val
		}
		*s.col(c) = val
	}
	c.AyurvedaFields = af
}

func scalarInput(req CreateConsultationRequest) [9]string {
	return [9]string{req.Prakriti, req.Vikriti, req.Dosha, req.Agni, req.Nadi, req.Mala, req.Mutra, req.Jihva, req.Nidra}
}

func scalarInputUpdate(req UpdateConsultationRequest) [9]string {
	return [9]string{req.Prakriti, req.Vikriti, req.Dosha, req.Agni, req.Nadi, req.Mala, req.Mutra, req.Jihva, req.Nidra}
}

func (s *service) Create(encounterID uuid.UUID, req CreateConsultationRequest, doctorUserID uuid.UUID) (*models.Consultation, error) {
	encounter, err := s.repo.FindEncounterByID(encounterID)
	if err != nil {
		return nil, err
	}

	followUp, err := parseFollowUp(req.FollowUpDate)
	if err != nil {
		return nil, err
	}

	c := &models.Consultation{
		EncounterID:     encounterID,
		DoctorID:        encounter.DoctorID,
		ChiefComplaints: req.ChiefComplaints,
		History:         req.History,
		Examination:     req.Examination,
		ClinicalNotes:   req.ClinicalNotes,
		TreatmentPlan:   req.TreatmentPlan,
		DietPathya:      req.DietPathya,
		DietApathya:     req.DietApathya,
		FollowUpDate:    followUp,
	}
	applyAyurvedaSync(c, scalarInput(req), req.AyurvedaFields)

	diagnoses := buildDiagnoses(encounterID, encounter.DoctorID, req.Diagnoses)

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
	applyAyurvedaSync(c, scalarInputUpdate(req), req.AyurvedaFields)
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
