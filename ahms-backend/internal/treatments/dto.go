// Package treatments implements the generic procedure treatment engine.
// A TreatmentPlan orders a course of a ProcedureType (Panchakarma today,
// other categories later) for a patient; TreatmentSessions are the
// individual executed sittings. Therapists execute sessions, doctors own
// the plan lifecycle and write the final assessment.
package treatments

import (
	"time"

	"github.com/ahms/backend/internal/models"
)

// CreatePlanRequest is the payload for POST /treatment-plans.
type CreatePlanRequest struct {
	PatientID              string `json:"patient_id" binding:"required"`
	EncounterID            string `json:"encounter_id"`
	DoctorID               string `json:"doctor_id"`
	ProcedureTypeID        string `json:"procedure_type_id" binding:"required"`
	Indication             string `json:"indication"`
	PlannedSessions        int    `json:"planned_sessions" binding:"required,gt=0,lte=60"`
	Frequency              string `json:"frequency" binding:"required,oneof=DAILY ALTERNATE_DAY WEEKLY"`
	StartDate              string `json:"start_date" binding:"required"`
	AssignedTherapistUserID string `json:"assigned_therapist_user_id"`
	Notes                  string `json:"notes"`
}

// UpdatePlanRequest allows editing plan fields before approval.
type UpdatePlanRequest struct {
	ProcedureTypeID        string `json:"procedure_type_id"`
	Indication             string `json:"indication"`
	PlannedSessions        *int   `json:"planned_sessions"`
	Frequency              string `json:"frequency"`
	StartDate              string `json:"start_date"`
	AssignedTherapistUserID string `json:"assigned_therapist_user_id"`
	Notes                  string `json:"notes"`
}

// CompletePlanRequest carries the doctor's final assessment.
type CompletePlanRequest struct {
	FinalAssessment string `json:"final_assessment" binding:"required"`
}

// StartSessionRequest is the payload for POST /treatment-sessions/:id/start.
type StartSessionRequest struct {
	BeforeCondition string `json:"before_condition"`
	Duration        int    `json:"duration_minutes"`
	Notes           string `json:"notes"`
}

// CompleteSessionRequest is the payload for POST /treatment-sessions/:id/complete.
type CompleteSessionRequest struct {
	AfterCondition string `json:"after_condition"`
	Complications  string `json:"complications"`
	Observations   string `json:"observations"`
	Duration       int    `json:"duration_minutes"`
	MaterialsUsed  string `json:"materials_used"`
	Notes          string `json:"notes"`
}

// SkipSessionRequest is the payload for POST /treatment-sessions/:id/skip.
type SkipSessionRequest struct {
	Reason string `json:"reason"`
}

// ReassignTherapistRequest is the payload for POST /treatment-plans/:id/reassign-therapist.
type ReassignTherapistRequest struct {
	TherapistUserID string `json:"therapist_user_id" binding:"required"`
}

// ReassignSessionTherapistRequest is the payload for PATCH /treatment-sessions/:id/therapist.
type ReassignSessionTherapistRequest struct {
	TherapistUserID string `json:"therapist_user_id" binding:"required"`
}

// SessionResponse is the public shape of one executed session.
type SessionResponse struct {
	ID             string  `json:"id"`
	SessionNumber  int     `json:"session_number"`
	SessionDate    string  `json:"session_date"`
	TherapistUserID string `json:"therapist_user_id,omitempty"`
	TherapistName  string  `json:"therapist_name,omitempty"`
	TherapistOverridden bool `json:"therapist_overridden"`
	Status         string  `json:"status"`
	Duration       int     `json:"duration_minutes"`
	MaterialsUsed  string  `json:"materials_used,omitempty"`
	BeforeCondition string `json:"before_condition,omitempty"`
	AfterCondition  string `json:"after_condition,omitempty"`
	Complications   string `json:"complications,omitempty"`
	Observations    string `json:"observations,omitempty"`
	Notes           string `json:"notes,omitempty"`
	StartedAt       string  `json:"started_at,omitempty"`
	CompletedAt     string  `json:"completed_at,omitempty"`
}

// PlanResponse is the public shape of a treatment plan with its sessions.
type PlanResponse struct {
	ID                string            `json:"id"`
	PlanNo            string            `json:"plan_no"`
	PatientID         string            `json:"patient_id"`
	PatientName       string            `json:"patient_name"`
	PatientUHID       string            `json:"patient_uh_id"`
	EncounterID       string            `json:"encounter_id,omitempty"`
	ProcedureTypeID   string            `json:"procedure_type_id"`
	ProcedureName     string            `json:"procedure_name"`
	ProcedureCategory string            `json:"procedure_category"`
	DoctorName        string            `json:"doctor_name"`
	Indication        string            `json:"indication"`
	PlannedSessions   int               `json:"planned_sessions"`
	Frequency         string            `json:"frequency"`
	StartDate         string            `json:"start_date"`
	EndDate           string            `json:"end_date,omitempty"`
	TherapistName     string            `json:"therapist_name,omitempty"`
	Status            string            `json:"status"`
	Notes             string            `json:"notes"`
	ApprovedBy        string            `json:"approved_by,omitempty"`
	ApprovedAt        string            `json:"approved_at,omitempty"`
	FinalAssessment   string            `json:"final_assessment,omitempty"`
	CompletedBy       string            `json:"completed_by,omitempty"`
	CompletedAt       string            `json:"completed_at,omitempty"`
	CreatedAt         string            `json:"created_at"`
	Sessions          []SessionResponse `json:"sessions"`
}

// PlanListItem is a lightweight row for the plans list.
type PlanListItem struct {
	ID                string `json:"id"`
	PlanNo            string `json:"plan_no"`
	PatientID         string `json:"patient_id"`
	PatientName       string `json:"patient_name"`
	PatientUHID       string `json:"patient_uh_id"`
	ProcedureName     string `json:"procedure_name"`
	ProcedureCategory string `json:"procedure_category"`
	DoctorName        string `json:"doctor_name"`
	PlannedSessions   int    `json:"planned_sessions"`
	StartDate         string `json:"start_date"`
	EndDate           string `json:"end_date,omitempty"`
	TherapistName     string `json:"therapist_name,omitempty"`
	Status            string `json:"status"`
	CreatedAt         string `json:"created_at"`
	CompletedSessions int    `json:"completed_sessions"`
}

// ProcedureTypeResponse is the public shape of a procedure type.
type ProcedureTypeResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
}

// TherapistResponse is a user that can be assigned to deliver sessions.
type TherapistResponse struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
}

func toSessionResponse(s *models.TreatmentSession) SessionResponse {
	r := SessionResponse{
		ID:             s.ID.String(),
		SessionNumber:  s.SessionNumber,
		SessionDate:    s.SessionDate.Format("2006-01-02"),
		TherapistOverridden: s.TherapistOverridden,
		Status:         s.Status,
		Duration:       s.Duration,
		MaterialsUsed:  s.MaterialsUsed,
		BeforeCondition: s.BeforeCondition,
		AfterCondition:  s.AfterCondition,
		Complications:   s.Complications,
		Observations:    s.Observations,
		Notes:           s.Notes,
	}
	if s.TherapistUserID != nil {
		r.TherapistUserID = s.TherapistUserID.String()
	}
	if s.TherapistUser != nil {
		r.TherapistName = s.TherapistUser.FullName
	}
	if s.StartedAt != nil {
		r.StartedAt = s.StartedAt.Format(time.RFC3339)
	}
	if s.CompletedAt != nil {
		r.CompletedAt = s.CompletedAt.Format(time.RFC3339)
	}
	return r
}

func therapistName(p *models.TreatmentPlan) string {
	if p.AssignedTherapistUser != nil {
		return p.AssignedTherapistUser.FullName
	}
	return ""
}

func toResponse(p *models.TreatmentPlan) PlanResponse {
	r := PlanResponse{
		ID:                p.ID.String(),
		PlanNo:            p.PlanNo,
		PatientID:         p.PatientID.String(),
		PatientName:       p.Patient.FullName,
		PatientUHID:       p.Patient.UHID,
		ProcedureTypeID:   p.ProcedureTypeID.String(),
		ProcedureName:     p.ProcedureType.Name,
		ProcedureCategory: p.ProcedureType.Category,
		DoctorName:        p.Doctor.User.FullName,
		Indication:        p.Indication,
		PlannedSessions:   p.PlannedSessions,
		Frequency:         p.Frequency,
		StartDate:         p.StartDate.Format("2006-01-02"),
		TherapistName:     therapistName(p),
		Status:            p.Status,
		Notes:             p.Notes,
		FinalAssessment:   p.FinalAssessment,
		CreatedAt:         p.CreatedAt.Format(time.RFC3339),
	}
	if p.EncounterID != nil {
		r.EncounterID = p.EncounterID.String()
	}
	if p.EndDate != nil {
		r.EndDate = p.EndDate.Format("2006-01-02")
	}
	if p.ApprovedByUser != nil {
		r.ApprovedBy = p.ApprovedByUser.FullName
	}
	if p.ApprovedAt != nil {
		r.ApprovedAt = p.ApprovedAt.Format(time.RFC3339)
	}
	if p.CompletedByUser != nil {
		r.CompletedBy = p.CompletedByUser.FullName
	}
	if p.CompletedAt != nil {
		r.CompletedAt = p.CompletedAt.Format(time.RFC3339)
	}
	for i := range p.Sessions {
		r.Sessions = append(r.Sessions, toSessionResponse(&p.Sessions[i]))
	}
	return r
}

func toListItem(p *models.TreatmentPlan) PlanListItem {
	r := PlanListItem{
		ID:                p.ID.String(),
		PlanNo:            p.PlanNo,
		PatientID:         p.PatientID.String(),
		PatientName:       p.Patient.FullName,
		PatientUHID:       p.Patient.UHID,
		ProcedureName:     p.ProcedureType.Name,
		ProcedureCategory: p.ProcedureType.Category,
		DoctorName:        p.Doctor.User.FullName,
		PlannedSessions:   p.PlannedSessions,
		StartDate:         p.StartDate.Format("2006-01-02"),
		TherapistName:     therapistName(p),
		Status:            p.Status,
		CreatedAt:         p.CreatedAt.Format(time.RFC3339),
	}
	if p.EndDate != nil {
		r.EndDate = p.EndDate.Format("2006-01-02")
	}
	completed := 0
	for i := range p.Sessions {
		if p.Sessions[i].Status == models.SessionCompleted || p.Sessions[i].Status == models.SessionSkipped {
			completed++
		}
	}
	r.CompletedSessions = completed
	return r
}
