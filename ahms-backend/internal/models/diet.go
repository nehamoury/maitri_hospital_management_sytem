package models

import (
	"time"

	"github.com/google/uuid"
)

// MealOrder status constants.
const (
	MealStatusPending  = "PENDING"
	MealStatusPrepared = "PREPARED"
	MealStatusServed   = "SERVED"
	MealStatusHeld     = "HELD"
)

// MealType constants.
const (
	MealTypeBreakfast = "BREAKFAST"
	MealTypeLunch     = "LUNCH"
	MealTypeDinner    = "DINNER"
	MealTypeSnacks    = "SNACKS"
)

// DietPlan defines the doctor prescribed diet type, duration, and restrictions.
type DietPlan struct {
	BaseModel
	AdmissionID uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
	PatientID   uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`

	DietType           string    `gorm:"type:varchar(100);not null" json:"diet_type"` // e.g., "Laghu Ahar", "Peyadi"
	Pathya             string    `gorm:"type:text" json:"pathya"`                    // Recommended foods/do's
	Apathya            string    `gorm:"type:text" json:"apathya"`                   // Restricted foods/dont's
	SpecialInstructions string    `gorm:"type:text" json:"special_instructions"`
	StartDate          time.Time `gorm:"not null" json:"start_date"`
	EndDate            time.Time `gorm:"not null" json:"end_date"`
	IsActive           bool      `gorm:"default:true;index" json:"is_active"`

	OrderedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"ordered_by_user_id"`
	OrderedByUser   User      `gorm:"foreignKey:OrderedByUserID" json:"ordered_by_user,omitempty"`

	MealOrders []MealOrder `gorm:"foreignKey:DietPlanID" json:"meal_orders,omitempty"`
}

func (DietPlan) TableName() string { return "diet_plans" }

// MealOrder is a scheduled meal for an admitted patient. It stores the Ward and Bed historically.
type MealOrder struct {
	BaseModel
	DietPlanID  uuid.UUID `gorm:"type:uuid;not null;index" json:"diet_plan_id"`
	AdmissionID uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
	PatientID   uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`

	// Ward and Bed snapshot at generation time (safe from future transfers).
	WardID uuid.UUID `gorm:"type:uuid;not null;index" json:"ward_id"`
	BedID  uuid.UUID `gorm:"type:uuid;not null;index" json:"bed_id"`

	MealType      string    `gorm:"type:varchar(30);not null" json:"meal_type"` // BREAKFAST, LUNCH, etc.
	ScheduledDate time.Time `gorm:"type:date;not null" json:"scheduled_date"`   // Date portion only

	Status string `gorm:"type:varchar(30);not null;default:'PENDING';index" json:"status"`

	PreparedAt *time.Time `json:"prepared_at,omitempty"`
	PreparedBy *uuid.UUID `gorm:"type:uuid;index" json:"prepared_by,omitempty"`

	ServedAt *time.Time `json:"served_at,omitempty"`
	ServedBy *uuid.UUID `gorm:"type:uuid;index" json:"served_by,omitempty"`

	Remarks string `gorm:"type:text" json:"remarks,omitempty"`
}

func (MealOrder) TableName() string { return "meal_orders" }
