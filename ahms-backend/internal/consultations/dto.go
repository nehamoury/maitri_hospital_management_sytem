// Package consultations implements the doctor's clinical record workflow
// attached to an encounter.
package consultations

import (
	"time"

	"github.com/ahms/backend/internal/models"
)

// DiagnosisInput is a single diagnosis line within a consultation.
type DiagnosisInput struct {
	Diagnosis     string `json:"diagnosis" binding:"required"`
	DiagnosisType string `json:"diagnosis_type" binding:"omitempty,oneof=PRIMARY COMORBIDITY"`
	Notes         string `json:"notes"`
}

// CreateConsultationRequest is the payload for POST /encounters/{id}/consultation.
type CreateConsultationRequest struct {
	ChiefComplaints string           `json:"chief_complaints"`
	History         string           `json:"history"`
	Examination     string           `json:"examination"`
	ClinicalNotes   string           `json:"clinical_notes"`
	TreatmentPlan   string           `json:"treatment_plan"`
	DietPathya      string           `json:"diet_pathya"`
	DietApathya     string           `json:"diet_apathya"`
	AyurvedaFields  models.JSONB     `json:"ayurveda_fields"`
	Prakriti        string           `json:"prakriti"`
	Vikriti         string           `json:"vikriti"`
	Dosha           string           `json:"dosha"`
	Agni            string           `json:"agni"`
	Nadi            string           `json:"nadi"`
	Mala            string           `json:"mala"`
	Mutra           string           `json:"mutra"`
	Jihva           string           `json:"jihva"`
	Nidra           string           `json:"nidra"`
	FollowUpDate    string           `json:"follow_up_date"`
	Diagnoses       []DiagnosisInput `json:"diagnoses"`
}

// UpdateConsultationRequest is the payload for PUT /consultations/{id}.
type UpdateConsultationRequest struct {
	ChiefComplaints string           `json:"chief_complaints"`
	History         string           `json:"history"`
	Examination     string           `json:"examination"`
	ClinicalNotes   string           `json:"clinical_notes"`
	TreatmentPlan   string           `json:"treatment_plan"`
	DietPathya      string           `json:"diet_pathya"`
	DietApathya     string           `json:"diet_apathya"`
	AyurvedaFields  models.JSONB     `json:"ayurveda_fields"`
	Prakriti        string           `json:"prakriti"`
	Vikriti         string           `json:"vikriti"`
	Dosha           string           `json:"dosha"`
	Agni            string           `json:"agni"`
	Nadi            string           `json:"nadi"`
	Mala            string           `json:"mala"`
	Mutra           string           `json:"mutra"`
	Jihva           string           `json:"jihva"`
	Nidra           string           `json:"nidra"`
	FollowUpDate    string           `json:"follow_up_date"`
	Diagnoses       []DiagnosisInput `json:"diagnoses"`
}

// ConsultationResponse is the public shape of a consultation with its diagnoses.
type ConsultationResponse struct {
	ID              string              `json:"id"`
	EncounterID     string              `json:"encounter_id"`
	DoctorID        string              `json:"doctor_id"`
	DoctorName      string              `json:"doctor_name"`
	ChiefComplaints string              `json:"chief_complaints"`
	History         string              `json:"history"`
	Examination     string              `json:"examination"`
	ClinicalNotes   string              `json:"clinical_notes"`
	TreatmentPlan   string              `json:"treatment_plan"`
	DietPathya      string              `json:"diet_pathya"`
	DietApathya     string              `json:"diet_apathya"`
	AyurvedaFields  models.JSONB        `json:"ayurveda_fields"`
	Prakriti        string              `json:"prakriti"`
	Vikriti         string              `json:"vikriti"`
	Dosha           string              `json:"dosha"`
	Agni            string              `json:"agni"`
	Nadi            string              `json:"nadi"`
	Mala            string              `json:"mala"`
	Mutra           string              `json:"mutra"`
	Jihva           string              `json:"jihva"`
	Nidra           string              `json:"nidra"`
	FollowUpDate    string              `json:"follow_up_date,omitempty"`
	Diagnoses       []DiagnosisResponse `json:"diagnoses"`
	CreatedAt       string              `json:"created_at"`
}

type DiagnosisResponse struct {
	ID            string `json:"id"`
	Diagnosis     string `json:"diagnosis"`
	DiagnosisType string `json:"diagnosis_type"`
	Notes         string `json:"notes"`
}

func toResponse(c *models.Consultation) ConsultationResponse {
	var followUp string
	if c.FollowUpDate != nil {
		followUp = c.FollowUpDate.Format("2006-01-02")
	}
	resp := ConsultationResponse{
		ID:              c.ID.String(),
		EncounterID:     c.EncounterID.String(),
		DoctorID:        c.DoctorID.String(),
		DoctorName:      c.Doctor.User.FullName,
		ChiefComplaints: c.ChiefComplaints,
		History:         c.History,
		Examination:     c.Examination,
		ClinicalNotes:   c.ClinicalNotes,
		TreatmentPlan:   c.TreatmentPlan,
		DietPathya:      c.DietPathya,
		DietApathya:     c.DietApathya,
		AyurvedaFields:  c.AyurvedaFields,
		Prakriti:        c.Prakriti,
		Vikriti:         c.Vikriti,
		Dosha:           c.Dosha,
		Agni:            c.Agni,
		Nadi:            c.Nadi,
		Mala:            c.Mala,
		Mutra:           c.Mutra,
		Jihva:           c.Jihva,
		Nidra:           c.Nidra,
		FollowUpDate:    followUp,
		CreatedAt:       c.CreatedAt.Format(time.RFC3339),
	}
	for _, d := range c.Diagnoses {
		resp.Diagnoses = append(resp.Diagnoses, DiagnosisResponse{
			ID:            d.ID.String(),
			Diagnosis:     d.Diagnosis,
			DiagnosisType: d.DiagnosisType,
			Notes:         d.Notes,
		})
	}
	return resp
}
