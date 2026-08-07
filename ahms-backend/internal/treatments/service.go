package treatments

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains the treatment engine business logic.
type Service interface {
	CreatePlan(req CreatePlanRequest, doctorUserID uuid.UUID) (*models.TreatmentPlan, error)
	UpdatePlan(id uuid.UUID, req UpdatePlanRequest) (*models.TreatmentPlan, error)
	GetPlan(id uuid.UUID) (*models.TreatmentPlan, error)
	ListPlans(filter ListFilter) ([]models.TreatmentPlan, error)
	ApprovePlan(id uuid.UUID, approverUserID uuid.UUID) (*models.TreatmentPlan, error)
	CancelPlan(id uuid.UUID, userID uuid.UUID) (*models.TreatmentPlan, error)
	CompletePlan(id uuid.UUID, req CompletePlanRequest, userID uuid.UUID) (*models.TreatmentPlan, error)
	StartSession(id uuid.UUID, req StartSessionRequest, therapistUserID uuid.UUID) (*models.TreatmentSession, error)
	CompleteSession(id uuid.UUID, req CompleteSessionRequest, therapistUserID uuid.UUID) (*models.TreatmentSession, error)
	SkipSession(id uuid.UUID, req SkipSessionRequest, userID uuid.UUID) (*models.TreatmentSession, error)
	TodaySessions(therapistUserID uuid.UUID) ([]models.TreatmentPlan, error)
	ListProcedureTypes() ([]models.ProcedureType, error)
	ListTherapists() ([]models.User, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

// buildSessionSchedule generates one session per step from the start date
// using the frequency. End date is derived from the last session.
func buildSessionSchedule(startDate time.Time, count int, frequency string, therapistID *uuid.UUID) ([]models.TreatmentSession, time.Time) {
	step := 1
	switch frequency {
	case models.FrequencyAlternateDay:
		step = 2
	case models.FrequencyWeekly:
		step = 7
	}
	sessions := make([]models.TreatmentSession, 0, count)
	var last time.Time
	for i := 0; i < count; i++ {
		date := startDate.AddDate(0, 0, i*step)
		sessions = append(sessions, models.TreatmentSession{
			SessionNumber:   i + 1,
			SessionDate:     date,
			Status:          models.SessionPending,
			TherapistUserID: therapistID,
		})
		last = date
	}
	return sessions, last
}

func (s *service) CreatePlan(req CreatePlanRequest, doctorUserID uuid.UUID) (*models.TreatmentPlan, error) {
	patientID, err := parseUUID(req.PatientID)
	if err != nil {
		return nil, err
	}
	procedureTypeID, err := parseUUID(req.ProcedureTypeID)
	if err != nil {
		return nil, err
	}
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, err
	}

	patientOK, err := s.repo.PatientExists(patientID)
	if err != nil {
		return nil, err
	}
	if !patientOK {
		return nil, ErrNotFound
	}
	procOK, err := s.repo.ProcedureTypeExists(procedureTypeID)
	if err != nil {
		return nil, err
	}
	if !procOK {
		return nil, ErrNotFound
	}
	doctor, err := s.repo.FindDoctorByUserID(doctorUserID)
	if err != nil {
		return nil, err
	}

	var therapistID *uuid.UUID
	if req.AssignedTherapistUserID != "" {
		tID, err := parseUUID(req.AssignedTherapistUserID)
		if err != nil {
			return nil, err
		}
		ok, err := s.repo.TherapistExists(tID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, ErrNotFound
		}
		therapistID = &tID
	}

	freq := req.Frequency
	if freq == "" {
		freq = models.FrequencyDaily
	}

	sessions, endDate := buildSessionSchedule(startDate, req.PlannedSessions, freq, therapistID)

	year := time.Now().Year()
	no, err := s.repo.NextPlanNumber(year)
	if err != nil {
		return nil, err
	}

	plan := &models.TreatmentPlan{
		PlanNo:                no,
		PatientID:             patientID,
		ProcedureTypeID:       procedureTypeID,
		DoctorID:              doctor.ID,
		Indication:            req.Indication,
		PlannedSessions:       req.PlannedSessions,
		Frequency:             freq,
		StartDate:             startDate,
		EndDate:               &endDate,
		AssignedTherapistUserID: therapistID,
		Status:                models.TreatmentPlanned,
		Notes:                 req.Notes,
	}
	if req.EncounterID != "" {
		eid, err := parseUUID(req.EncounterID)
		if err != nil {
			return nil, err
		}
		exists, err := s.repo.EncounterExists(eid)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, ErrNotFound
		}
		plan.EncounterID = &eid
	}

	if err := s.repo.CreatePlanWithSessions(plan, sessions); err != nil {
		return nil, err
	}
	return s.repo.FindPlanByID(plan.ID)
}

func (s *service) UpdatePlan(id uuid.UUID, req UpdatePlanRequest) (*models.TreatmentPlan, error) {
	plan, err := s.repo.FindPlanByID(id)
	if err != nil {
		return nil, err
	}
	if plan.Status != models.TreatmentPlanned {
		return nil, ErrInvalidState
	}

	if req.ProcedureTypeID != "" {
		ptID, err := parseUUID(req.ProcedureTypeID)
		if err != nil {
			return nil, err
		}
		ok, err := s.repo.ProcedureTypeExists(ptID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, ErrNotFound
		}
		plan.ProcedureTypeID = ptID
	}
	if req.Indication != "" {
		plan.Indication = req.Indication
	}
	if req.Frequency != "" {
		plan.Frequency = req.Frequency
	}
	if req.StartDate != "" {
		d, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, err
		}
		plan.StartDate = d
	}
	if req.Notes != "" {
		plan.Notes = req.Notes
	}
	if req.AssignedTherapistUserID != "" {
		tID, err := parseUUID(req.AssignedTherapistUserID)
		if err != nil {
			return nil, err
		}
		ok, err := s.repo.TherapistExists(tID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, ErrNotFound
		}
		plan.AssignedTherapistUserID = &tID
	}
	if req.PlannedSessions != nil && *req.PlannedSessions > 0 && *req.PlannedSessions <= 60 {
		plan.PlannedSessions = *req.PlannedSessions
	}

	// Rebuild the session schedule from the (possibly edited) fields.
	sessions, endDate := buildSessionSchedule(plan.StartDate, plan.PlannedSessions, plan.Frequency, plan.AssignedTherapistUserID)
	plan.Sessions = sessions
	plan.EndDate = &endDate

	if err := s.repo.UpdatePlan(plan); err != nil {
		return nil, err
	}
	return s.repo.FindPlanByID(plan.ID)
}

func (s *service) GetPlan(id uuid.UUID) (*models.TreatmentPlan, error) {
	return s.repo.FindPlanByID(id)
}

func (s *service) ListPlans(filter ListFilter) ([]models.TreatmentPlan, error) {
	return s.repo.ListPlans(filter)
}

func (s *service) ApprovePlan(id uuid.UUID, approverUserID uuid.UUID) (*models.TreatmentPlan, error) {
	plan, err := s.repo.FindPlanByID(id)
	if err != nil {
		return nil, err
	}
	if plan.Status != models.TreatmentPlanned {
		return nil, ErrInvalidState
	}
	now := time.Now()
	plan.Status = models.TreatmentApproved
	plan.ApprovedByUserID = &approverUserID
	plan.ApprovedAt = &now
	if err := s.repo.UpdatePlan(plan); err != nil {
		return nil, err
	}
	return s.repo.FindPlanByID(plan.ID)
}

func (s *service) CancelPlan(id uuid.UUID, userID uuid.UUID) (*models.TreatmentPlan, error) {
	plan, err := s.repo.FindPlanByID(id)
	if err != nil {
		return nil, err
	}
	if plan.Status == models.TreatmentCompleted || plan.Status == models.TreatmentCancelled {
		return nil, ErrInvalidState
	}
	plan.Status = models.TreatmentCancelled
	if err := s.repo.UpdatePlan(plan); err != nil {
		return nil, err
	}
	return s.repo.FindPlanByID(plan.ID)
}

func (s *service) CompletePlan(id uuid.UUID, req CompletePlanRequest, userID uuid.UUID) (*models.TreatmentPlan, error) {
	plan, err := s.repo.FindPlanByID(id)
	if err != nil {
		return nil, err
	}
	if plan.Status != models.TreatmentApproved && plan.Status != models.TreatmentInProgress {
		return nil, ErrInvalidState
	}
	done, err := s.repo.CountCompletedSessions(plan.ID)
	if err != nil {
		return nil, err
	}
	if done < plan.PlannedSessions {
		return nil, ErrInvalidState
	}
	now := time.Now()
	plan.Status = models.TreatmentCompleted
	plan.FinalAssessment = req.FinalAssessment
	plan.CompletedByUserID = &userID
	plan.CompletedAt = &now
	if err := s.repo.UpdatePlan(plan); err != nil {
		return nil, err
	}
	return s.repo.FindPlanByID(plan.ID)
}

func (s *service) StartSession(id uuid.UUID, req StartSessionRequest, therapistUserID uuid.UUID) (*models.TreatmentSession, error) {
	session, err := s.repo.FindSessionByID(id)
	if err != nil {
		return nil, err
	}
	if session.Status != models.SessionPending {
		return nil, ErrInvalidState
	}
	// Only the assigned therapist (or a Panchakarma doctor) may execute.
	if session.TherapistUserID != nil && *session.TherapistUserID != therapistUserID {
		return nil, ErrInvalidState
	}
	now := time.Now()
	session.Status = models.SessionInProgress
	session.BeforeCondition = req.BeforeCondition
	session.Notes = req.Notes
	session.StartedAt = &now

	if err := s.repo.UpdateSession(session); err != nil {
		return nil, err
	}

	// Move the plan into IN_PROGRESS on the first session start.
	plan, err := s.repo.FindPlanByID(session.PlanID)
	if err != nil {
		return nil, err
	}
	if plan.Status == models.TreatmentApproved {
		plan.Status = models.TreatmentInProgress
		if err := s.repo.UpdatePlan(plan); err != nil {
			return nil, err
		}
	}
	return s.repo.FindSessionByID(session.ID)
}

func (s *service) CompleteSession(id uuid.UUID, req CompleteSessionRequest, therapistUserID uuid.UUID) (*models.TreatmentSession, error) {
	session, err := s.repo.FindSessionByID(id)
	if err != nil {
		return nil, err
	}
	if session.Status != models.SessionInProgress {
		return nil, ErrInvalidState
	}
	if session.TherapistUserID != nil && *session.TherapistUserID != therapistUserID {
		return nil, ErrInvalidState
	}
	now := time.Now()
	session.Status = models.SessionCompleted
	session.AfterCondition = req.AfterCondition
	session.Complications = req.Complications
	session.Observations = req.Observations
	if req.Notes != "" {
		session.Notes = req.Notes
	}
	session.CompletedAt = &now
	if err := s.repo.UpdateSession(session); err != nil {
		return nil, err
	}
	return s.repo.FindSessionByID(session.ID)
}

func (s *service) SkipSession(id uuid.UUID, req SkipSessionRequest, userID uuid.UUID) (*models.TreatmentSession, error) {
	session, err := s.repo.FindSessionByID(id)
	if err != nil {
		return nil, err
	}
	if session.Status != models.SessionPending {
		return nil, ErrInvalidState
	}
	now := time.Now()
	session.Status = models.SessionSkipped
	session.Observations = req.Reason
	session.CompletedAt = &now
	if err := s.repo.UpdateSession(session); err != nil {
		return nil, err
	}
	return s.repo.FindSessionByID(session.ID)
}

func (s *service) TodaySessions(therapistUserID uuid.UUID) ([]models.TreatmentPlan, error) {
	return s.repo.TodaySessions(therapistUserID)
}

func (s *service) ListProcedureTypes() ([]models.ProcedureType, error) {
	return s.repo.ListProcedureTypes()
}

func (s *service) ListTherapists() ([]models.User, error) {
	return s.repo.ListTherapists()
}
