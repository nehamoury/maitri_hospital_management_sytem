// Package timeline exposes the longitudinal cross-department patient
// history (GET /patients/{id}/timeline). It aggregates encounters,
// consultations, diagnoses and prescriptions in chronological order so a
// receiving doctor can see the full clinical journey without paper files.
package timeline

import (
	"time"

	"github.com/ahms/backend/internal/models"
)

// TimelineResponse is the full longitudinal record of one patient.
type TimelineResponse struct {
	PatientID   string                  `json:"patient_id"`
	UHID        string                  `json:"uhid"`
	PatientName string                  `json:"patient_name"`
	Gender      string                  `json:"gender"`
	Age         int                     `json:"age"`
	Mobile      string                  `json:"mobile"`
	Encounters  []EncounterTimeline     `json:"encounters"`
	TreatmentPlans []TreatmentPlanTimeline `json:"treatment_plans"`
	Admissions  []AdmissionTimeline     `json:"admissions"`
}

// AdmissionTimeline is an IPD stay in the patient's history.
type AdmissionTimeline struct {
	AdmissionID    string                  `json:"admission_id"`
	AdmissionNo    string                  `json:"admission_no"`
	AdmissionDate  string                  `json:"admission_date"`
	DischargedAt   string                  `json:"discharged_at,omitempty"`
	DepartmentID   string                  `json:"department_id"`
	DepartmentName string                  `json:"department_name"`
	DoctorID       string                  `json:"doctor_id"`
	DoctorName     string                  `json:"doctor_name"`
	BedNo          string                  `json:"bed_no,omitempty"`
	WardName       string                  `json:"ward_name,omitempty"`
	Reason         string                  `json:"reason"`
	Diagnosis      string                  `json:"diagnosis"`
	Status         string                  `json:"status"`
	DischargeType  string                  `json:"discharge_type,omitempty"`
	FinalDiagnosis string                  `json:"final_diagnosis,omitempty"`
	Summary        string                  `json:"summary,omitempty"`
	Notes          []TimelineNote          `json:"notes"`
	Orders         []TimelineOrder         `json:"orders"`
	DietOrders     []TimelineDietOrder     `json:"diet_orders"`
}

// TimelineNote is a progress note inside an admission timeline entry.
type TimelineNote struct {
	NoteType         string       `json:"note_type"`
	Notes            string       `json:"notes"`
	Shift            string       `json:"shift"`
	Vitals           models.JSONB `json:"vitals"`
	RecordedBy       string       `json:"recorded_by"`
	CreatedAt        string       `json:"created_at"`
}

// TimelineOrder is a clinical order inside an admission timeline entry.
type TimelineOrder struct {
	OrderType   string `json:"order_type"`
	Description string `json:"description"`
	Frequency   string `json:"frequency"`
	Quantity    string `json:"quantity"`
	Status      string `json:"status"`
	OrderedBy   string `json:"ordered_by"`
	CreatedAt   string `json:"created_at"`
}

// TimelineDietOrder is a diet order inside an admission timeline entry.
type TimelineDietOrder struct {
	DietType     string `json:"diet_type"`
	Schedule     string `json:"schedule"`
	Instructions string `json:"instructions"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
}

// EncounterTimeline is one visit in the patient's history.
type EncounterTimeline struct {
	EncounterID    string                 `json:"encounter_id"`
	VisitDate      string                 `json:"visit_date"`
	DepartmentID   string                 `json:"department_id"`
	DepartmentName string                 `json:"department_name"`
	DoctorID       string                 `json:"doctor_id"`
	DoctorName     string                 `json:"doctor_name"`
	VisitType      string                 `json:"visit_type"`
	TokenNumber    int                    `json:"token_number"`
	Status         string                 `json:"status"`
	ReferralID     *string                `json:"referral_id,omitempty"`
	Diagnoses      []TimelineDiagnosis    `json:"diagnoses"`
	Consultations  []TimelineConsultation `json:"consultations"`
	Prescriptions  []TimelinePrescription `json:"prescriptions"`
}

// TimelineDiagnosis is a diagnosis within a timeline entry.
type TimelineDiagnosis struct {
	Diagnosis     string `json:"diagnosis"`
	DiagnosisType string `json:"diagnosis_type"`
	Notes         string `json:"notes"`
}

// TimelineConsultation is a consultation within a timeline entry.
type TimelineConsultation struct {
	ConsultationID  string              `json:"consultation_id"`
	ChiefComplaints string              `json:"chief_complaints"`
	History         string              `json:"history"`
	Examination     string              `json:"examination"`
	ClinicalNotes   string              `json:"clinical_notes"`
	TreatmentPlan   string              `json:"treatment_plan"`
	DietPathya      string              `json:"diet_pathya"`
	DietApathya     string              `json:"diet_apathya"`
	AyurvedaFields  models.JSONB        `json:"ayurveda_fields"`
	Diagnoses       []TimelineDiagnosis `json:"diagnoses"`
	FollowUpDate    string              `json:"follow_up_date,omitempty"`
	CreatedAt       string              `json:"created_at"`
}

// TimelinePrescription is a prescription within a timeline entry.
type TimelinePrescription struct {
	PrescriptionID string                     `json:"prescription_id"`
	Status         string                     `json:"status"`
	Notes          string                     `json:"notes"`
	Items          []TimelinePrescriptionItem `json:"items"`
	CreatedAt      string                     `json:"created_at"`
}

// TimelinePrescriptionItem is a medicine line within a prescription.
type TimelinePrescriptionItem struct {
	Medicine     string `json:"medicine"`
	Formulation  string `json:"formulation"`
	Dose         string `json:"dose"`
	Frequency    string `json:"frequency"`
	Duration     string `json:"duration"`
	Quantity     int    `json:"quantity"`
	Anupana      string `json:"anupana"`
	DispensedQty int    `json:"dispensed_qty"`
}

// TreatmentPlanTimeline is a treatment course (Panchakarma today) in the
// patient's history with its session log.
type TreatmentPlanTimeline struct {
	PlanID            string                    `json:"plan_id"`
	PlanNo            string                    `json:"plan_no"`
	ProcedureName     string                    `json:"procedure_name"`
	ProcedureCategory string                    `json:"procedure_category"`
	DoctorName        string                    `json:"doctor_name"`
	Indication        string                    `json:"indication"`
	PlannedSessions   int                       `json:"planned_sessions"`
	Frequency         string                    `json:"frequency"`
	StartDate         string                    `json:"start_date"`
	EndDate           string                    `json:"end_date,omitempty"`
	TherapistName     string                    `json:"therapist_name,omitempty"`
	Status            string                    `json:"status"`
	ApprovedBy        string                    `json:"approved_by,omitempty"`
	FinalAssessment   string                    `json:"final_assessment,omitempty"`
	CompletedBy       string                    `json:"completed_by,omitempty"`
	CreatedAt         string                    `json:"created_at"`
	Sessions          []TimelineTreatmentSession `json:"sessions"`
}

// TimelineTreatmentSession is one executed sitting within a treatment plan.
type TimelineTreatmentSession struct {
	SessionNumber   int    `json:"session_number"`
	SessionDate     string `json:"session_date"`
	TherapistName   string `json:"therapist_name,omitempty"`
	Status          string `json:"status"`
	BeforeCondition string `json:"before_condition,omitempty"`
	AfterCondition  string `json:"after_condition,omitempty"`
	Complications   string `json:"complications,omitempty"`
	Observations    string `json:"observations,omitempty"`
}

func toTreatmentTimeline(p *models.TreatmentPlan) TreatmentPlanTimeline {
	entry := TreatmentPlanTimeline{
		PlanID:            p.ID.String(),
		PlanNo:            p.PlanNo,
		ProcedureName:     p.ProcedureType.Name,
		ProcedureCategory: p.ProcedureType.Category,
		DoctorName:        p.Doctor.User.FullName,
		Indication:        p.Indication,
		PlannedSessions:   p.PlannedSessions,
		Frequency:         p.Frequency,
		StartDate:         p.StartDate.Format("2006-01-02"),
		Status:            p.Status,
		FinalAssessment:   p.FinalAssessment,
		CreatedAt:         p.CreatedAt.Format(time.RFC3339),
	}
	if p.EndDate != nil {
		entry.EndDate = p.EndDate.Format("2006-01-02")
	}
	if p.AssignedTherapistUser != nil {
		entry.TherapistName = p.AssignedTherapistUser.FullName
	}
	if p.ApprovedByUser != nil {
		entry.ApprovedBy = p.ApprovedByUser.FullName
	}
	if p.CompletedByUser != nil {
		entry.CompletedBy = p.CompletedByUser.FullName
	}
	for i := range p.Sessions {
		s := &p.Sessions[i]
		ts := TimelineTreatmentSession{
			SessionNumber:   s.SessionNumber,
			SessionDate:     s.SessionDate.Format("2006-01-02"),
			Status:          s.Status,
			BeforeCondition: s.BeforeCondition,
			AfterCondition:  s.AfterCondition,
			Complications:   s.Complications,
			Observations:    s.Observations,
		}
		if s.TherapistUser != nil {
			ts.TherapistName = s.TherapistUser.FullName
		}
		entry.Sessions = append(entry.Sessions, ts)
	}
	return entry
}

func toAdmissionTimeline(a *models.Admission) AdmissionTimeline {
	entry := AdmissionTimeline{
		AdmissionID:    a.ID.String(),
		AdmissionNo:    a.AdmissionNo,
		AdmissionDate:  a.AdmissionDate.Format("2006-01-02"),
		DepartmentID:   a.DepartmentID.String(),
		DepartmentName: a.Department.Name,
		DoctorID:       a.DoctorID.String(),
		DoctorName:     a.Doctor.User.FullName,
		Reason:         a.Reason,
		Diagnosis:      a.Diagnosis,
		Status:         a.Status,
	}
	if a.Bed != nil {
		entry.BedNo = a.Bed.BedNo
		entry.WardName = a.Bed.Ward.Name
	}
	if a.DischargedAt != nil {
		entry.DischargedAt = a.DischargedAt.Format("2006-01-02")
	}
	if a.Discharge != nil {
		entry.DischargeType = a.Discharge.DischargeType
		entry.FinalDiagnosis = a.Discharge.FinalDiagnosis
		entry.Summary = a.Discharge.Summary
	}
	for i := range a.ProgressNotes {
		n := &a.ProgressNotes[i]
		entry.Notes = append(entry.Notes, TimelineNote{
			NoteType:  n.NoteType,
			Notes:     n.Notes,
			Shift:     n.Shift,
			Vitals:    n.Vitals,
			RecordedBy: n.RecordedBy.FullName,
			CreatedAt: n.CreatedAt.Format(time.RFC3339),
		})
	}
	for i := range a.Orders {
		o := &a.Orders[i]
		entry.Orders = append(entry.Orders, TimelineOrder{
			OrderType:   o.OrderType,
			Description: o.Description,
			Frequency:   o.Frequency,
			Quantity:    o.Quantity,
			Status:      o.Status,
			OrderedBy:   o.OrderedBy.FullName,
			CreatedAt:   o.CreatedAt.Format(time.RFC3339),
		})
	}
	for i := range a.DietOrders {
		d := &a.DietOrders[i]
		entry.DietOrders = append(entry.DietOrders, TimelineDietOrder{
			DietType:     d.DietType,
			Schedule:     d.Schedule,
			Instructions: d.Instructions,
			Status:       d.Status,
			CreatedAt:    d.CreatedAt.Format(time.RFC3339),
		})
	}
	return entry
}

func toResponse(patient *models.Patient, encounters []models.Encounter, plans []models.TreatmentPlan, admissions []models.Admission) TimelineResponse {
	resp := TimelineResponse{
		PatientID:   patient.ID.String(),
		UHID:        patient.UHID,
		PatientName: patient.FullName,
		Gender:      patient.Gender,
		Age:         patient.Age,
		Mobile:      patient.Mobile,
	}

	for i := range plans {
		resp.TreatmentPlans = append(resp.TreatmentPlans, toTreatmentTimeline(&plans[i]))
	}

	for i := range admissions {
		resp.Admissions = append(resp.Admissions, toAdmissionTimeline(&admissions[i]))
	}

	for i := range encounters {
		e := &encounters[i]
		entry := EncounterTimeline{
			EncounterID:    e.ID.String(),
			VisitDate:      e.VisitDate.Format("2006-01-02"),
			DepartmentID:   e.DepartmentID.String(),
			DepartmentName: e.Department.Name,
			DoctorID:       e.DoctorID.String(),
			DoctorName:     e.Doctor.User.FullName,
			VisitType:      e.VisitType,
			TokenNumber:    e.TokenNumber,
			Status:         e.Status,
		}
		if e.ReferralID != nil {
			s := e.ReferralID.String()
			entry.ReferralID = &s
		}

		for j := range e.Diagnoses {
			d := &e.Diagnoses[j]
			entry.Diagnoses = append(entry.Diagnoses, TimelineDiagnosis{
				Diagnosis:     d.Diagnosis,
				DiagnosisType: d.DiagnosisType,
				Notes:         d.Notes,
			})
		}

		for j := range e.Consultations {
			cons := &e.Consultations[j]
			tc := TimelineConsultation{
				ConsultationID:  cons.ID.String(),
				ChiefComplaints: cons.ChiefComplaints,
				History:         cons.History,
				Examination:     cons.Examination,
				ClinicalNotes:   cons.ClinicalNotes,
				TreatmentPlan:   cons.TreatmentPlan,
				DietPathya:      cons.DietPathya,
				DietApathya:     cons.DietApathya,
				AyurvedaFields:  cons.AyurvedaFields,
				CreatedAt:       cons.CreatedAt.Format(time.RFC3339),
			}
			if cons.FollowUpDate != nil {
				tc.FollowUpDate = cons.FollowUpDate.Format("2006-01-02")
			}
			for k := range cons.Diagnoses {
				d := &cons.Diagnoses[k]
				tc.Diagnoses = append(tc.Diagnoses, TimelineDiagnosis{
					Diagnosis:     d.Diagnosis,
					DiagnosisType: d.DiagnosisType,
					Notes:         d.Notes,
				})
			}
			entry.Consultations = append(entry.Consultations, tc)
		}

		for j := range e.Prescriptions {
			p := &e.Prescriptions[j]
			tp := TimelinePrescription{
				PrescriptionID: p.ID.String(),
				Status:         p.Status,
				Notes:          p.Notes,
				CreatedAt:      p.CreatedAt.Format(time.RFC3339),
			}
			for k := range p.Items {
				it := &p.Items[k]
				tp.Items = append(tp.Items, TimelinePrescriptionItem{
					Medicine:     it.Medicine,
					Formulation:  it.Formulation,
					Dose:         it.Dose,
					Frequency:    it.Frequency,
					Duration:     it.Duration,
					Quantity:     it.Quantity,
					Anupana:      it.Anupana,
					DispensedQty: it.DispensedQty,
				})
			}
			entry.Prescriptions = append(entry.Prescriptions, tp)
		}

		resp.Encounters = append(resp.Encounters, entry)
	}
	return resp
}
