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
	Status  string `json:"status" binding:"required"` // PREPARED, SERVED, HELD
	Remarks string `json:"remarks"`
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
	ServedAt      *time.Time `json:"served_at,omitempty"`
	ServedBy      string    `json:"served_by_name,omitempty"`
	Remarks       string    `json:"remarks,omitempty"`
	DietType      string    `json:"diet_type"`
	Pathya        string    `json:"pathya,omitempty"`
	Apathya       string    `json:"apathya,omitempty"`
	SpecialInstr  string    `json:"special_instructions,omitempty"`
}

func DietPlanToResponse(p models.DietPlan) DietPlanResponse {
	return DietPlanResponse{
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
		CreatedAt:           p.CreatedAt,
	}
}
