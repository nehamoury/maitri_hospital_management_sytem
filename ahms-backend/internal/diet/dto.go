package diet

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// ─── Request DTOs ─────────────────────────────────────────────────────────────

type CreateDietPlanRequest struct {
	AdmissionID         string `json:"admission_id" binding:"required"`
	PatientID           string `json:"patient_id" binding:"required"`
	DietType            string `json:"diet_type" binding:"required"` // e.g. "Laghu Ahar"
	Pathya              string `json:"pathya"`
	Apathya             string `json:"apathya"`
	SpecialInstructions string `json:"special_instructions"`
	StartDate           string `json:"start_date" binding:"required"` // YYYY-MM-DD
	EndDate             string `json:"end_date" binding:"required"`   // YYYY-MM-DD
}

type UpdateMealStatusRequest struct {
	Status  string `json:"status" binding:"required"` // PREPARING, READY, SERVED, HELD, PENDING (reopen)
	Remarks string `json:"remarks"`
}

type CreateManualMealRequest struct {
	AdmissionID         string `json:"admission_id" binding:"required"`
	MealType            string `json:"meal_type" binding:"required"` // BREAKFAST, LUNCH, DINNER, SNACKS
	ScheduledDate       string `json:"scheduled_date"`               // YYYY-MM-DD; defaults to today (Asia/Kolkata)
	SpecialInstructions string `json:"special_instructions"`
}

type CancelMealRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type UpdateDietPlanRequest struct {
	DietType            string `json:"diet_type" binding:"required"`
	Pathya              string `json:"pathya"`
	Apathya             string `json:"apathya"`
	SpecialInstructions string `json:"special_instructions"`
	StartDate           string `json:"start_date" binding:"required"` // YYYY-MM-DD
	EndDate             string `json:"end_date" binding:"required"`   // YYYY-MM-DD
}

type RenewDietPlanRequest struct {
	EndDate string `json:"end_date" binding:"required"` // new end date, YYYY-MM-DD
}

type CancelDietPlanRequest struct {
	Reason string `json:"reason"`
}

type CreateDietTemplateRequest struct {
	Name                string `json:"name" binding:"required"`
	Pathya              string `json:"pathya"`
	Apathya             string `json:"apathya"`
	SpecialInstructions string `json:"special_instructions"`
}

type UpdateDietTemplateRequest struct {
	Name                string `json:"name" binding:"required"`
	Pathya              string `json:"pathya"`
	Apathya             string `json:"apathya"`
	SpecialInstructions string `json:"special_instructions"`
	IsActive            *bool  `json:"is_active"`
}

type KitchenSheetFilter struct {
	WardID        string
	MealType      string
	ScheduledDate time.Time
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

type DietPlanResponse struct {
	ID                  uuid.UUID `json:"id"`
	AdmissionID         uuid.UUID `json:"admission_id"`
	PatientID           uuid.UUID `json:"patient_id"`
	DietType            string    `json:"diet_type"`
	Pathya              string    `json:"pathya"`
	Apathya             string    `json:"apathya"`
	SpecialInstructions string    `json:"special_instructions"`
	StartDate           time.Time `json:"start_date"`
	EndDate             time.Time `json:"end_date"`
	IsActive            bool      `json:"is_active"`
	OrderedByName       string    `json:"ordered_by_name"`
	CancelledByID       *uuid.UUID `json:"cancelled_by_user_id,omitempty"`
	CancelledByName     string    `json:"cancelled_by_name,omitempty"`
	CancelledAt         *time.Time `json:"cancelled_at,omitempty"`
	CancellationReason  string    `json:"cancellation_reason,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

type MealOrderResponse struct {
	ID            uuid.UUID `json:"id"`
	DietPlanID    uuid.UUID `json:"diet_plan_id"`
	AdmissionID   uuid.UUID `json:"admission_id"`
	PatientID     uuid.UUID `json:"patient_id"`
	PatientName   string    `json:"patient_name"`
	PatientUHID   string    `json:"patient_uhid"`
	WardName      string    `json:"ward_name"`
	BedNo         string    `json:"bed_no"`
	MealType      string    `json:"meal_type"`
	ScheduledDate time.Time `json:"scheduled_date"`
	Status        string    `json:"status"`
	PreparedAt    *time.Time `json:"prepared_at,omitempty"`
	PreparedBy    string    `json:"prepared_by_name,omitempty"`
	ReadyAt       *time.Time `json:"ready_at,omitempty"`
	ReadyBy       string    `json:"ready_by_name,omitempty"`
	ServedAt      *time.Time `json:"served_at,omitempty"`
	ServedBy      string    `json:"served_by_name,omitempty"`
	Remarks       string    `json:"remarks,omitempty"`
	DietType      string    `json:"diet_type"`
	Pathya        string    `json:"pathya,omitempty"`
	Apathya       string    `json:"apathya,omitempty"`
	SpecialInstr  string    `json:"special_instructions,omitempty"`
	// Allergy / red-flag info surfaced from the patient record so the kitchen
	// can spot at-risk meals at a glance.
	PatientAllergies         string     `json:"patient_allergies,omitempty"`
	PatientChronicDiseases   string     `json:"patient_chronic_diseases,omitempty"`
	CancelledAt              *time.Time `json:"cancelled_at,omitempty"`
	CancelledBy              string     `json:"cancelled_by_name,omitempty"`
	CancellationReason       string     `json:"cancellation_reason,omitempty"`
}

type WardOption struct {
	ID   uuid.UUID `json:"id"`
	Code string    `json:"code"`
	Name string    `json:"name"`
}

type KitchenAdmission struct {
	AdmissionID  uuid.UUID `json:"admission_id"`
	AdmissionNo  string    `json:"admission_no"`
	PatientID    uuid.UUID `json:"patient_id"`
	PatientName  string    `json:"patient_name"`
	PatientUHID  string    `json:"patient_uhid"`
	WardID       uuid.UUID `json:"ward_id"`
	WardName     string    `json:"ward_name"`
	BedNo        string    `json:"bed_no"`
	DietPlanID   uuid.UUID `json:"diet_plan_id"`
	DietType     string    `json:"diet_type"`
	SpecialInstr string    `json:"special_instructions,omitempty"`
	Pathya       string    `json:"pathya,omitempty"`
	Apathya      string    `json:"apathya,omitempty"`
}

type DietTemplateResponse struct {
	ID                  uuid.UUID `json:"id"`
	Name                string    `json:"name"`
	Pathya              string    `json:"pathya"`
	Apathya             string    `json:"apathya"`
	SpecialInstructions string    `json:"special_instructions"`
	IsActive            bool      `json:"is_active"`
	CreatedByName       string    `json:"created_by_name"`
	CreatedAt           time.Time `json:"created_at"`
}

func DietPlanToResponse(p models.DietPlan) DietPlanResponse {
	resp := DietPlanResponse{
		ID:                  p.ID,
		AdmissionID:         p.AdmissionID,
		PatientID:           p.PatientID,
		DietType:            p.DietType,
		Pathya:              p.Pathya,
		Apathya:             p.Apathya,
		SpecialInstructions: p.SpecialInstructions,
		StartDate:           p.StartDate,
		EndDate:             p.EndDate,
		IsActive:            p.IsActive,
		OrderedByName:       p.OrderedByUser.FullName,
		CancelledAt:         p.CancelledAt,
		CancellationReason:  p.CancellationReason,
		CreatedAt:           p.CreatedAt,
	}
	if p.CancelledByUserID != nil {
		resp.CancelledByID = p.CancelledByUserID
	}
	if p.CancelledByUser != nil {
		resp.CancelledByName = p.CancelledByUser.FullName
	}
	return resp
}
