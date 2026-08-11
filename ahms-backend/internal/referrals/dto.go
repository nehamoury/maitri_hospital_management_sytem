// Package referrals implements the inter-department referral workflow.
// A referral links a source encounter (where the doctor decided to refer)
// to a destination department. The receiving doctor can see the relevant
// previous clinical history through the referral detail endpoint.
package referrals

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// CreateReferralRequest is the payload for POST /referrals.
type CreateReferralRequest struct {
	PatientID            string `json:"patient_id" binding:"required"`
	SourceEncounterID    string `json:"source_encounter_id" binding:"required"`
	ToDepartmentID       string `json:"to_department_id" binding:"required"`
	PreferredDoctorID    string `json:"preferred_doctor_id"`
	Reason               string `json:"reason" binding:"required"`
	ClinicalNotes        string `json:"clinical_notes"`
	Priority             string `json:"priority" binding:"omitempty,oneof=ROUTINE URGENT EMERGENCY"`
	RecommendedTreatment string `json:"recommended_treatment"`
	Diagnosis            string `json:"diagnosis"`
}

// UpdateReferralStatusRequest is the payload for PATCH /referrals/{id}/status.
type UpdateReferralStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=CREATED RECEIVED ACCEPTED CONSULTATION_STARTED COMPLETED REJECTED CANCELLED"`
}

// ReferralItemResponse is a summary row for the incoming-referrals dashboard.
type ReferralItemResponse struct {
	ID             string `json:"id"`
	ReferralNo     string `json:"referral_no"`
	PatientID      string `json:"patient_id"`
	UHID           string `json:"uhid"`
	PatientName    string `json:"patient_name"`
	FromDepartment string `json:"from_department"`
	ToDepartment   string `json:"to_department"`
	Reason         string `json:"reason"`
	Priority       string `json:"priority"`
	Diagnosis      string `json:"diagnosis"`
	Status         string `json:"status"`
	ReferredAt     string `json:"referred_at"`
}

// ReferralResponse is the full detail of a referral including the source
// clinical history the receiving doctor needs.
type ReferralResponse struct {
	ID                   string         `json:"id"`
	ReferralNo           string         `json:"referral_no"`
	PatientID            string         `json:"patient_id"`
	UHID                 string         `json:"uhid"`
	PatientName          string         `json:"patient_name"`
	FromDepartment       string         `json:"from_department"`
	ToDepartment         string         `json:"to_department"`
	PreferredDoctor      string         `json:"preferred_doctor,omitempty"`
	Reason               string         `json:"reason"`
	ClinicalNotes        string         `json:"clinical_notes"`
	Priority             string         `json:"priority"`
	RecommendedTreatment string         `json:"recommended_treatment"`
	Diagnosis            string         `json:"diagnosis"`
	Status               string         `json:"status"`
	ReferredBy           string         `json:"referred_by"`
	SourceEncounter      *SourceHistory `json:"source_encounter"`
	ReferredAt           string         `json:"referred_at"`
	Attachments          []AttachmentResponse `json:"attachments"`
}

// AttachmentResponse is the metadata of a referral attachment.
type AttachmentResponse struct {
	ID         string `json:"id"`
	FileName   string `json:"file_name"`
	FilePath   string `json:"file_path"`
	FileType   string `json:"file_type"`
	FileSize   int64  `json:"file_size"`
	UploadedBy string `json:"uploaded_by"`
	UploadedAt string `json:"uploaded_at"`
}

// SourceHistory carries the relevant previous consultation data.
type SourceHistory struct {
	EncounterID    string                `json:"encounter_id"`
	VisitDate      string                `json:"visit_date"`
	DepartmentName string                `json:"department_name"`
	DoctorName     string                `json:"doctor_name"`
	Consultations  []SourceConsultation   `json:"consultations"`
	Diagnoses      []SourceDiagnosis     `json:"diagnoses"`
	Prescriptions  []SourcePrescription  `json:"prescriptions"`
}

// SourceConsultation is the clinical record of the source encounter.
type SourceConsultation struct {
	ConsultationID  string            `json:"consultation_id"`
	ChiefComplaints string            `json:"chief_complaints"`
	History         string            `json:"history"`
	Examination     string            `json:"examination"`
	ClinicalNotes   string            `json:"clinical_notes"`
	TreatmentPlan   string            `json:"treatment_plan"`
	AyurvedaFields  models.JSONB      `json:"ayurveda_fields"`
	Diagnoses       []SourceDiagnosis `json:"diagnoses"`
}

// SourceDiagnosis is a diagnosis in the source history.
type SourceDiagnosis struct {
	Diagnosis     string `json:"diagnosis"`
	DiagnosisType string `json:"diagnosis_type"`
	Notes         string `json:"notes"`
}

// SourcePrescription is a prescription in the source history, showing what
// was prescribed versus what was actually dispensed.
type SourcePrescription struct {
	PrescriptionID string                   `json:"prescription_id"`
	Status         string                   `json:"status"`
	Notes          string                   `json:"notes"`
	Items          []SourcePrescriptionItem `json:"items"`
}

// SourcePrescriptionItem is a medicine line, including dispensed quantity.
type SourcePrescriptionItem struct {
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

func toItemResponse(r *models.Referral) ReferralItemResponse {
	return ReferralItemResponse{
		ID:             r.ID.String(),
		ReferralNo:     r.ReferralNo,
		PatientID:      r.PatientID.String(),
		UHID:           r.Patient.UHID,
		PatientName:    r.Patient.FullName,
		FromDepartment: r.FromDepartment.Name,
		ToDepartment:   r.ToDepartment.Name,
		Reason:         r.Reason,
		Priority:       r.Priority,
		Diagnosis:      r.Diagnosis,
		Status:         r.Status,
		ReferredAt:     r.CreatedAt.Format(time.RFC3339),
	}
}

func toAttachmentResponse(a *models.ReferralAttachment, uploadedByName string) AttachmentResponse {
	return AttachmentResponse{
		ID:         a.ID.String(),
		FileName:   a.FileName,
		FilePath:   a.FilePath,
		FileType:   a.FileType,
		FileSize:   a.FileSize,
		UploadedBy: uploadedByName,
		UploadedAt: a.CreatedAt.Format(time.RFC3339),
	}
}

func toResponse(r *models.Referral) ReferralResponse {
	resp := ReferralResponse{
		ID:                   r.ID.String(),
		ReferralNo:           r.ReferralNo,
		PatientID:            r.PatientID.String(),
		UHID:                 r.Patient.UHID,
		PatientName:          r.Patient.FullName,
		FromDepartment:       r.FromDepartment.Name,
		ToDepartment:         r.ToDepartment.Name,
		Reason:               r.Reason,
		ClinicalNotes:        r.ClinicalNotes,
		Priority:             r.Priority,
		RecommendedTreatment: r.RecommendedTreatment,
		Diagnosis:            r.Diagnosis,
		Status:               r.Status,
		ReferredBy:           r.ReferredBy.FullName,
		ReferredAt:           r.CreatedAt.Format(time.RFC3339),
		Attachments:          []AttachmentResponse{},
	}
	for i := range r.Attachments {
		a := &r.Attachments[i]
		resp.Attachments = append(resp.Attachments, toAttachmentResponse(a, a.UploadedBy.FullName))
	}
	if r.PreferredDoctor != nil {
		resp.PreferredDoctor = r.PreferredDoctor.User.FullName
	}

	src := r.SourceEncounter
	if src.ID != uuid.Nil {
		sh := &SourceHistory{
			EncounterID:    src.ID.String(),
			VisitDate:      src.VisitDate.Format("2006-01-02"),
			DepartmentName: src.Department.Name,
			DoctorName:     src.Doctor.User.FullName,
		}
		for i := range src.Diagnoses {
			d := &src.Diagnoses[i]
			sh.Diagnoses = append(sh.Diagnoses, SourceDiagnosis{
				Diagnosis:     d.Diagnosis,
				DiagnosisType: d.DiagnosisType,
				Notes:         d.Notes,
			})
		}
		for i := range src.Consultations {
			c := &src.Consultations[i]
			sc := SourceConsultation{
				ConsultationID:  c.ID.String(),
				ChiefComplaints: c.ChiefComplaints,
				History:         c.History,
				Examination:     c.Examination,
				ClinicalNotes:   c.ClinicalNotes,
				TreatmentPlan:   c.TreatmentPlan,
				AyurvedaFields:  c.AyurvedaFields,
			}
			for i := range c.Diagnoses {
				d := &c.Diagnoses[i]
				sc.Diagnoses = append(sc.Diagnoses, SourceDiagnosis{
					Diagnosis:     d.Diagnosis,
					DiagnosisType: d.DiagnosisType,
					Notes:         d.Notes,
				})
			}
			sh.Consultations = append(sh.Consultations, sc)
		}
		for i := range src.Prescriptions {
			p := &src.Prescriptions[i]
			sp := SourcePrescription{
				PrescriptionID: p.ID.String(),
				Status:         p.Status,
				Notes:          p.Notes,
			}
			for j := range p.Items {
				it := &p.Items[j]
				sp.Items = append(sp.Items, SourcePrescriptionItem{
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
			sh.Prescriptions = append(sh.Prescriptions, sp)
		}
		resp.SourceEncounter = sh
	}
	return resp
}
