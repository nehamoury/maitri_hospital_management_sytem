// Package prescriptions implements the doctor's medicine order workflow.
// Prescription status distinguishes what was prescribed vs what the
// pharmacy actually dispensed.
package prescriptions

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// PrescriptionItemInput is a single medicine line in a prescription.
type PrescriptionItemInput struct {
	Medicine     string `json:"medicine" binding:"required"`
	Formulation  string `json:"formulation"`
	Dose         string `json:"dose"`
	Frequency    string `json:"frequency"`
	Duration     string `json:"duration"`
	Quantity     int    `json:"quantity"`
	Anupana      string `json:"anupana"`
	Route        string `json:"route"`
	Instructions string `json:"instructions"`
}

// CreatePrescriptionRequest is the payload for POST /encounters/{id}/prescriptions.
type CreatePrescriptionRequest struct {
	Notes string                  `json:"notes"`
	Items []PrescriptionItemInput `json:"items" binding:"required,min=1,dive"`
}

// UpdatePrescriptionStatusRequest is the payload for PATCH /prescriptions/{id}/status.
type UpdatePrescriptionStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=PRESCRIBED PARTIALLY_DISPENSED DISPENSED"`
}

// PrescriptionItemResponse is the public shape of a prescription item.
type PrescriptionItemResponse struct {
	ID           string `json:"id"`
	Medicine     string `json:"medicine"`
	Formulation  string `json:"formulation"`
	Dose         string `json:"dose"`
	Frequency    string `json:"frequency"`
	Duration     string `json:"duration"`
	Quantity     int    `json:"quantity"`
	Anupana      string `json:"anupana"`
	Route        string `json:"route"`
	Instructions string `json:"instructions"`
	DispensedQty int    `json:"dispensed_qty"`
}

// PrescriptionResponse is the public shape of a prescription with its items.
type PrescriptionResponse struct {
	ID          string                     `json:"id"`
	EncounterID string                     `json:"encounter_id"`
	DoctorID    string                     `json:"doctor_id"`
	DoctorName  string                     `json:"doctor_name"`
	Status      string                     `json:"status"`
	Notes       string                     `json:"notes"`
	Items       []PrescriptionItemResponse `json:"items"`
	CreatedAt   string                     `json:"created_at"`
}

func toItemResponse(it *models.PrescriptionItem) PrescriptionItemResponse {
	return PrescriptionItemResponse{
		ID:           it.ID.String(),
		Medicine:     it.Medicine,
		Formulation:  it.Formulation,
		Dose:         it.Dose,
		Frequency:    it.Frequency,
		Duration:     it.Duration,
		Quantity:     it.Quantity,
		Anupana:      it.Anupana,
		Route:        it.Route,
		Instructions: it.Instructions,
		DispensedQty: it.DispensedQty,
	}
}

func toResponse(p *models.Prescription) PrescriptionResponse {
	resp := PrescriptionResponse{
		ID:          p.ID.String(),
		EncounterID: p.EncounterID.String(),
		DoctorID:    p.DoctorID.String(),
		DoctorName:  p.Doctor.User.FullName,
		Status:      p.Status,
		Notes:       p.Notes,
		CreatedAt:   p.CreatedAt.Format(time.RFC3339),
	}
	for i := range p.Items {
		resp.Items = append(resp.Items, toItemResponse(&p.Items[i]))
	}
	return resp
}

// PrescriptionListItem is a lightweight row for the pharmacy dispensing
// queue with the patient's name and UHID to help identify the prescription.
type PrescriptionListItem struct {
	ID          string                     `json:"id"`
	EncounterID string                     `json:"encounter_id"`
	DoctorName  string                     `json:"doctor_name"`
	Status      string                     `json:"status"`
	Notes       string                     `json:"notes"`
	PatientName string                     `json:"patient_name"`
	PatientUHID string                     `json:"patient_uh_id"`
	Items       []PrescriptionItemResponse `json:"items"`
	CreatedAt   string                     `json:"created_at"`
}

func toListItem(p *models.Prescription) PrescriptionListItem {
	resp := PrescriptionListItem{
		ID:          p.ID.String(),
		EncounterID: p.EncounterID.String(),
		DoctorName:  p.Doctor.User.FullName,
		Status:      p.Status,
		Notes:       p.Notes,
		CreatedAt:   p.CreatedAt.Format(time.RFC3339),
	}
	if p.Encounter.Patient.ID != uuid.Nil {
		resp.PatientName = p.Encounter.Patient.FullName
		resp.PatientUHID = p.Encounter.Patient.UHID
	}
	for i := range p.Items {
		resp.Items = append(resp.Items, toItemResponse(&p.Items[i]))
	}
	return resp
}
