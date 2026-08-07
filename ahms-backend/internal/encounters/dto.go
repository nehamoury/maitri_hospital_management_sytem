// Package encounters implements the OPD visit workflow. Each visit is an
// Encounter attached to an existing patient — never a new patient record.
package encounters

import (
	"time"

	"github.com/ahms/backend/internal/models"
)

// CreateEncounterRequest is the payload for POST /encounters (reception
// creates an OPD visit for an already-registered patient).
type CreateEncounterRequest struct {
	PatientID       string  `json:"patient_id" binding:"required"`
	DepartmentID    string  `json:"department_id" binding:"required"`
	DoctorID        string  `json:"doctor_id" binding:"required"`
	EncounterType   string  `json:"encounter_type" binding:"omitempty,oneof=OPD IPD"`
	VisitType       string  `json:"visit_type" binding:"omitempty,oneof=NEW FOLLOW_UP"`
	VisitDate       string  `json:"visit_date" binding:"omitempty,datetime=2006-01-02"`
	ConsultationFee float64 `json:"consultation_fee"`
	ReferralID      string  `json:"referral_id"`
}

// UpdateEncounterStatusRequest is the payload for PATCH /encounters/{id}/status.
type UpdateEncounterStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=REGISTERED WAITING IN_CONSULTATION COMPLETED"`
}

// EncounterResponse is the public shape of an encounter.
type EncounterResponse struct {
	ID              string                      `json:"id"`
	PatientID       string                      `json:"patient_id"`
	UHID            string                      `json:"uhid"`
	PatientName     string                      `json:"patient_name"`
	DepartmentID    string                      `json:"department_id"`
	DepartmentName  string                      `json:"department_name"`
	DoctorID        string                      `json:"doctor_id"`
	DoctorName      string                      `json:"doctor_name"`
	EncounterType   string                      `json:"encounter_type"`
	VisitType       string                      `json:"visit_type"`
	VisitDate       string                      `json:"visit_date"`
	TokenNumber     int                         `json:"token_number"`
	Status          string                      `json:"status"`
	ConsultationFee float64                     `json:"consultation_fee"`
	PaymentStatus   string                      `json:"payment_status"`
	ReferralID      *string                     `json:"referral_id,omitempty"`
	Consultations   []EncounterConsultationItem `json:"consultations"`
	Diagnoses       []EncounterDiagnosisItem    `json:"diagnoses"`
	Prescriptions   []EncounterPrescriptionItem `json:"prescriptions"`
	CreatedAt       string                      `json:"created_at"`
}

type EncounterConsultationItem struct {
	ConsultationID  string            `json:"consultation_id"`
	ChiefComplaints string            `json:"chief_complaints"`
	History         string            `json:"history"`
	Examination     string            `json:"examination"`
	ClinicalNotes   string            `json:"clinical_notes"`
	TreatmentPlan   string            `json:"treatment_plan"`
	DietPathya      string            `json:"diet_pathya"`
	DietApathya     string            `json:"diet_apathya"`
	AyurvedaFields  models.JSONB      `json:"ayurveda_fields"`
	FollowUpDate    string            `json:"follow_up_date,omitempty"`
	Diagnoses       []EncounterDiagnosisItem `json:"diagnoses"`
	CreatedAt       string            `json:"created_at"`
}

type EncounterDiagnosisItem struct {
	Diagnosis     string `json:"diagnosis"`
	DiagnosisType string `json:"diagnosis_type"`
	Notes         string `json:"notes"`
}

type EncounterPrescriptionItem struct {
	PrescriptionID string                              `json:"prescription_id"`
	Status         string                              `json:"status"`
	Notes          string                              `json:"notes"`
	Items          []EncounterPrescriptionItemLine     `json:"items"`
	CreatedAt      string                              `json:"created_at"`
}

type EncounterPrescriptionItemLine struct {
	Medicine     string `json:"medicine"`
	Formulation  string `json:"formulation"`
	Dose         string `json:"dose"`
	Frequency    string `json:"frequency"`
	Duration     string `json:"duration"`
	Quantity     int    `json:"quantity"`
	Anupana      string `json:"anupana"`
	Route        string `json:"route"`
	DispensedQty int    `json:"dispensed_qty"`
}

func toResponse(e *models.Encounter) EncounterResponse {
	var referralID *string
	if e.ReferralID != nil {
		s := e.ReferralID.String()
		referralID = &s
	}
	resp := EncounterResponse{
		ID:              e.ID.String(),
		PatientID:       e.PatientID.String(),
		UHID:            e.Patient.UHID,
		PatientName:     e.Patient.FullName,
		DepartmentID:    e.DepartmentID.String(),
		DepartmentName:  e.Department.Name,
		DoctorID:        e.DoctorID.String(),
		DoctorName:      e.Doctor.User.FullName,
		EncounterType:   e.EncounterType,
		VisitType:       e.VisitType,
		VisitDate:       e.VisitDate.Format("2006-01-02"),
		TokenNumber:     e.TokenNumber,
		Status:          e.Status,
		ConsultationFee: e.ConsultationFee,
		PaymentStatus:   e.PaymentStatus,
		ReferralID:      referralID,
		CreatedAt:       e.CreatedAt.Format(time.RFC3339),
	}

	for i := range e.Diagnoses {
		d := &e.Diagnoses[i]
		resp.Diagnoses = append(resp.Diagnoses, EncounterDiagnosisItem{
			Diagnosis:     d.Diagnosis,
			DiagnosisType: d.DiagnosisType,
			Notes:         d.Notes,
		})
	}

	for i := range e.Consultations {
		c := &e.Consultations[i]
		cons := EncounterConsultationItem{
			ConsultationID:  c.ID.String(),
			ChiefComplaints: c.ChiefComplaints,
			History:         c.History,
			Examination:     c.Examination,
			ClinicalNotes:   c.ClinicalNotes,
			TreatmentPlan:   c.TreatmentPlan,
			DietPathya:      c.DietPathya,
			DietApathya:     c.DietApathya,
			AyurvedaFields:  c.AyurvedaFields,
			CreatedAt:       c.CreatedAt.Format(time.RFC3339),
		}
		if c.FollowUpDate != nil {
			cons.FollowUpDate = c.FollowUpDate.Format("2006-01-02")
		}
		for j := range c.Diagnoses {
			d := &c.Diagnoses[j]
			cons.Diagnoses = append(cons.Diagnoses, EncounterDiagnosisItem{
				Diagnosis:     d.Diagnosis,
				DiagnosisType: d.DiagnosisType,
				Notes:         d.Notes,
			})
		}
		resp.Consultations = append(resp.Consultations, cons)
	}

	for i := range e.Prescriptions {
		p := &e.Prescriptions[i]
		sp := EncounterPrescriptionItem{
			PrescriptionID: p.ID.String(),
			Status:         p.Status,
			Notes:          p.Notes,
			CreatedAt:      p.CreatedAt.Format(time.RFC3339),
		}
		for j := range p.Items {
			it := &p.Items[j]
			sp.Items = append(sp.Items, EncounterPrescriptionItemLine{
				Medicine:     it.Medicine,
				Formulation:  it.Formulation,
				Dose:         it.Dose,
				Frequency:    it.Frequency,
				Duration:     it.Duration,
				Quantity:     it.Quantity,
				Anupana:      it.Anupana,
				Route:        it.Route,
				DispensedQty: it.DispensedQty,
			})
		}
		resp.Prescriptions = append(resp.Prescriptions, sp)
	}

	return resp
}
