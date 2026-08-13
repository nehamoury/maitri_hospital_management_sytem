// Package ipd implements the In-Patient Department module: ward/bed
// master, admissions with auto-generated admission numbers, bed
// allocation/transfer/release, the daily clinical chart (progress notes,
// rounds, vitals), clinical orders, diet orders and structured discharge.
package ipd

import (
	"time"

	"github.com/ahms/backend/internal/models"
)

// WardRequest is the payload for POST /wards and PUT /wards/{id}.
type WardRequest struct {
	Code         string `json:"code" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Location     string `json:"location"`
	DepartmentID string `json:"department_id"`
	IsActive     *bool  `json:"is_active"`
}

// BedRequest is the payload for POST /beds and PUT /beds/{id}.
type BedRequest struct {
	WardID   string `json:"ward_id" binding:"required"`
	BedNo    string `json:"bed_no" binding:"required"`
	BedType  string `json:"bed_type" binding:"omitempty,oneof=GENERAL SEMI_PRIVATE PRIVATE ICU"`
	Status   string `json:"status" binding:"omitempty,oneof=AVAILABLE OCCUPIED RESERVED MAINTENANCE"`
	IsActive *bool  `json:"is_active"`
}

// BedStatusRequest is the payload for PUT /beds/{id}/status.
type BedStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=AVAILABLE OCCUPIED RESERVED MAINTENANCE"`
}

// AdmitRequest is the payload for POST /admissions.
type AdmitRequest struct {
	PatientID             string `json:"patient_id" binding:"required"`
	DepartmentID          string `json:"department_id" binding:"required"`
	DoctorID              string `json:"doctor_id" binding:"required"`
	BedID                 string `json:"bed_id"`
	AdmissionType         string `json:"admission_type" binding:"omitempty,oneof=PLANNED EMERGENCY"`
	AdmissionDate         string `json:"admission_date" binding:"omitempty,datetime=2006-01-02"`
	AdmissionTime         string `json:"admission_time"`
	Reason                string `json:"reason"`
	Diagnosis             string `json:"diagnosis"`
	Notes                 string `json:"notes"`
	ExpectedDischargeDate string `json:"expected_discharge_date" binding:"omitempty,datetime=2006-01-02"`
}

// UpdateAdmissionRequest is the payload for PUT /admissions/{id}.
type UpdateAdmissionRequest struct {
	DepartmentID          string `json:"department_id"`
	DoctorID              string `json:"doctor_id"`
	AdmissionType         string `json:"admission_type" binding:"omitempty,oneof=PLANNED EMERGENCY"`
	Reason                string `json:"reason"`
	Diagnosis             string `json:"diagnosis"`
	Notes                 string `json:"notes"`
	ExpectedDischargeDate string `json:"expected_discharge_date"`
	Status                string `json:"status" binding:"omitempty,oneof=ADMITTED TRANSFERRED DISCHARGED CANCELLED"`
}

// TransferBedRequest is the payload for POST /admissions/{id}/transfer.
type TransferBedRequest struct {
	BedID  string `json:"bed_id" binding:"required"`
	Reason string `json:"reason"`
}

// NoteRequest is the payload for POST /admissions/{id}/notes.
type NoteRequest struct {
	NoteType string       `json:"note_type" binding:"required,oneof=ADMISSION_ASSESSMENT DOCTOR_ROUND NURSE_NOTE VITAL PROGRESS"`
	Notes    string       `json:"notes"`
	Shift    string       `json:"shift" binding:"omitempty,oneof=MORNING EVENING NIGHT"`
	Vitals   models.JSONB `json:"vitals"`
}

// OrderRequest is the payload for POST /admissions/{id}/orders.
type OrderRequest struct {
	OrderType   string `json:"order_type" binding:"required,oneof=MEDICINE TREATMENT INVESTIGATION OTHER"`
	Description string `json:"description" binding:"required"`
	Frequency   string `json:"frequency"`
	Quantity    string `json:"quantity"`
	Notes       string `json:"notes"`
	Status      string `json:"status" binding:"omitempty,oneof=ORDERED IN_PROGRESS COMPLETED HELD CANCELLED"`
}

// OrderStatusRequest is the payload for PUT /admissions/{id}/orders/{oid}/status.
type OrderStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=ORDERED IN_PROGRESS COMPLETED HELD CANCELLED"`
}

// DietRequest is the payload for POST /admissions/{id}/diet.
type DietRequest struct {
	DietType     string `json:"diet_type" binding:"required"`
	Schedule     string `json:"schedule"`
	Instructions string `json:"instructions"`
	Status       string `json:"status" binding:"omitempty,oneof=ORDERED PREPARED SERVED HELD"`
}

// DischargeRequest is the payload for POST /admissions/{id}/discharge.
type DischargeRequest struct {
	DischargeType        string `json:"discharge_type" binding:"required,oneof=CURED IMPROVED REFERRED LAMA ABSCOND EXPIRED"`
	DischargeDate        string `json:"discharge_date" binding:"omitempty,datetime=2006-01-02"`
	DischargeTime        string `json:"discharge_time"`
	FinalDiagnosis       string `json:"final_diagnosis"`
	TreatmentGiven       string `json:"treatment_given"`
	ProceduresDone       string `json:"procedures_done"`
	MedicinesAtDischarge string `json:"medicines_at_discharge"`
	FollowUpInstructions string `json:"follow_up_instructions"`
	FollowUpDate         string `json:"follow_up_date" binding:"omitempty,datetime=2006-01-02"`
	Summary              string `json:"summary"`
	DischargeNotes       string `json:"discharge_notes"`
}

// WardResponse is the public shape of a ward with live bed statistics.
type WardResponse struct {
	ID            string   `json:"id"`
	Code          string   `json:"code"`
	Name          string   `json:"name"`
	Location      string   `json:"location"`
	DepartmentID  *string  `json:"department_id,omitempty"`
	DepartmentName string  `json:"department_name,omitempty"`
	IsActive      bool     `json:"is_active"`
	TotalBeds     int      `json:"total_beds"`
	AvailableBeds int      `json:"available_beds"`
	OccupiedBeds  int      `json:"occupied_beds"`
	ReservedBeds  int      `json:"reserved_beds"`
	MaintenanceBeds int   `json:"maintenance_beds"`
	Beds          []BedResponse `json:"beds,omitempty"`
}

// BedResponse is the public shape of a bed.
type BedResponse struct {
	ID       string `json:"id"`
	WardID   string `json:"ward_id"`
	WardName string `json:"ward_name,omitempty"`
	BedNo    string `json:"bed_no"`
	BedType  string `json:"bed_type"`
	Status   string `json:"status"`
	IsActive bool   `json:"is_active"`
}

// AdmissionItemResponse is the public summary row of an admission.
type AdmissionItemResponse struct {
	ID             string `json:"id"`
	AdmissionNo    string `json:"admission_no"`
	PatientID      string `json:"patient_id"`
	UHID           string `json:"uhid"`
	PatientName    string `json:"patient_name"`
	Gender         string `json:"gender"`
	Age            string `json:"age"`
	DepartmentID   string `json:"department_id"`
	DepartmentName string `json:"department_name"`
	DoctorID       string `json:"doctor_id"`
	DoctorName     string `json:"doctor_name"`
	BedID          string `json:"bed_id,omitempty"`
	BedNo          string `json:"bed_no,omitempty"`
	WardName       string `json:"ward_name,omitempty"`
	AdmissionType  string `json:"admission_type"`
	AdmissionDate  string `json:"admission_date"`
	Reason         string `json:"reason"`
	Status         string `json:"status"`
	CreatedAt      string `json:"created_at"`
}

// AdmissionResponse is the public detail of an admission including the
// full clinical chart.
type AdmissionResponse struct {
	ID             string `json:"id"`
	AdmissionNo    string `json:"admission_no"`
	PatientID      string `json:"patient_id"`
	UHID           string `json:"uhid"`
	PatientName    string `json:"patient_name"`
	Gender         string `json:"gender"`
	Age            string `json:"age"`
	DepartmentID   string `json:"department_id"`
	DepartmentName string `json:"department_name"`
	DoctorID       string `json:"doctor_id"`
	DoctorName     string `json:"doctor_name"`
	BedID          string `json:"bed_id,omitempty"`
	BedNo          string `json:"bed_no,omitempty"`
	BedType        string `json:"bed_type,omitempty"`
	WardName       string `json:"ward_name,omitempty"`
	AdmissionType  string `json:"admission_type"`
	AdmissionDate  string `json:"admission_date"`
	AdmissionTime  string `json:"admission_time"`
	Reason         string `json:"reason"`
	Diagnosis      string `json:"diagnosis"`
	Notes          string `json:"notes"`
	ExpectedDischargeDate string `json:"expected_discharge_date,omitempty"`
	Status         string `json:"status"`
	AdmittedBy     string `json:"admitted_by"`
	DischargedAt   string `json:"discharged_at,omitempty"`
	DischargedBy   string `json:"discharged_by,omitempty"`
	NotesList      []NoteResponse       `json:"progress_notes"`
	OrdersList     []OrderResponse      `json:"orders"`
	DietList       []DietResponse       `json:"diet_orders"`
	BedHistory     []BedHistoryResponse `json:"bed_history"`
	Discharge      *DischargeResponse   `json:"discharge,omitempty"`
	CreatedAt      string               `json:"created_at"`
}

// NoteResponse is the public shape of a progress note.
type NoteResponse struct {
	ID          string       `json:"id"`
	NoteType    string       `json:"note_type"`
	Notes       string       `json:"notes"`
	Shift       string       `json:"shift"`
	Vitals      models.JSONB `json:"vitals"`
	RecordedBy  string       `json:"recorded_by"`
	CreatedAt   string       `json:"created_at"`
}

// OrderResponse is the public shape of a clinical order.
type OrderResponse struct {
	ID          string `json:"id"`
	OrderType   string `json:"order_type"`
	Description string `json:"description"`
	Frequency   string `json:"frequency"`
	Quantity    string `json:"quantity"`
	Notes       string `json:"notes"`
	Status      string `json:"status"`
	OrderedBy   string `json:"ordered_by"`
	CreatedAt   string `json:"created_at"`
}

// DietResponse is the public shape of a diet order.
type DietResponse struct {
	ID           string `json:"id"`
	DietType     string `json:"diet_type"`
	Schedule     string `json:"schedule"`
	Instructions string `json:"instructions"`
	Status       string `json:"status"`
	OrderedBy    string `json:"ordered_by"`
	CreatedAt    string `json:"created_at"`
}

// BedHistoryResponse is the public shape of a bed assignment record.
type BedHistoryResponse struct {
	ID        string `json:"id"`
	BedID     string `json:"bed_id"`
	BedNo     string `json:"bed_no"`
	WardName  string `json:"ward_name"`
	FromDate  string `json:"from_date"`
	ToDate    string `json:"to_date,omitempty"`
	Reason    string `json:"reason"`
	ChangedBy string `json:"changed_by"`
}

// DischargeResponse is the public shape of a discharge summary.
type DischargeResponse struct {
	DischargeType        string `json:"discharge_type"`
	FinalDiagnosis       string `json:"final_diagnosis"`
	TreatmentGiven       string `json:"treatment_given"`
	ProceduresDone       string `json:"procedures_done"`
	MedicinesAtDischarge string `json:"medicines_at_discharge"`
	FollowUpInstructions string `json:"follow_up_instructions"`
	FollowUpDate         string `json:"follow_up_date,omitempty"`
	Summary              string `json:"summary"`
	DischargeNotes       string `json:"discharge_notes"`
}

// WardOccupancyRow is one ward's live occupancy summary.
type WardOccupancyRow struct {
	WardID        string `json:"ward_id"`
	WardName      string `json:"ward_name"`
	TotalBeds     int    `json:"total_beds"`
	AvailableBeds int    `json:"available_beds"`
	OccupiedBeds  int    `json:"occupied_beds"`
	ReservedBeds  int    `json:"reserved_beds"`
	MaintenanceBeds int  `json:"maintenance_beds"`
}

func fmtTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02T15:04:05Z07:00")
}

func fmtDate(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}
