package models

import (
	"time"

	"github.com/google/uuid"
)

// Procedure categories. Panchakarma is the first category; the engine is
// generic so future categories (PHYSIOTHERAPY, YOGA, KSHAR_SUTRA,
// AGNIKARMA, MINOR_PROCEDURES) plug in with no schema change.
const (
	ProcedureCategoryPanchakarma = "PANCHAKARMA"
)

// Treatment plan lifecycle. A plan is created by a doctor, approved by a
// Panchakarma doctor, executed via sessions, and finally completed with a
// doctor's final assessment.
const (
	TreatmentPlanned     = "PLANNED"
	TreatmentApproved    = "APPROVED"
	TreatmentInProgress  = "IN_PROGRESS"
	TreatmentCompleted   = "COMPLETED"
	TreatmentCancelled   = "CANCELLED"
)

// Treatment session lifecycle.
const (
	SessionPending    = "PENDING"
	SessionInProgress = "IN_PROGRESS"
	SessionCompleted  = "COMPLETED"
	SessionSkipped    = "SKIPPED"
)

// Session frequency options used when auto-generating the schedule.
const (
	FrequencyDaily        = "DAILY"
	FrequencyAlternateDay = "ALTERNATE_DAY"
	FrequencyWeekly       = "WEEKLY"
)

// ProcedureType is the master list of procedures the treatment engine can
// plan. Category keeps the engine generic (Panchakarma today, others
// later) while Name is the specific procedure (Abhyanga, Basti, ...).
type ProcedureType struct {
	BaseModel
	Name        string `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Category    string `gorm:"type:varchar(50);not null;default:'PANCHAKARMA'" json:"category"`
	Description string `gorm:"type:text" json:"description"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
}

func (ProcedureType) TableName() string { return "procedure_types" }

// TreatmentPlan is one patient's course of a procedure (e.g. a 7-session
// Abhyanga course). Sessions are auto-generated from the plan when it is
// created and executed by the assigned therapist.
type TreatmentPlan struct {
	BaseModel
	PlanNo string `gorm:"type:varchar(30);uniqueIndex;not null" json:"plan_no"`

	PatientID uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient   Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// EncounterID is optional; a plan can be created directly from a
	// consultation or as a standalone order.
	EncounterID *uuid.UUID `gorm:"type:uuid;index" json:"encounter_id,omitempty"`
	Encounter   *Encounter `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`

	ProcedureTypeID uuid.UUID     `gorm:"type:uuid;not null;index" json:"procedure_type_id"`
	ProcedureType   ProcedureType `gorm:"foreignKey:ProcedureTypeID" json:"procedure_type,omitempty"`

	DoctorID uuid.UUID `gorm:"type:uuid;not null" json:"doctor_id"`
	Doctor   Doctor    `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`

	Indication       string     `gorm:"type:text" json:"indication"`
	PlannedSessions  int        `gorm:"not null" json:"planned_sessions"`
	Frequency        string     `gorm:"type:varchar(20);not null;default:'DAILY'" json:"frequency"`
	StartDate        time.Time  `gorm:"type:date;not null" json:"start_date"`
	EndDate          *time.Time `gorm:"type:date" json:"end_date,omitempty"`
	AssignedTherapistUserID *uuid.UUID `gorm:"type:uuid;index" json:"assigned_therapist_user_id,omitempty"`
	AssignedTherapistUser   *User      `gorm:"foreignKey:AssignedTherapistUserID" json:"assigned_therapist_user,omitempty"`

	Status    string `gorm:"type:varchar(20);not null;default:'PLANNED'" json:"status"`
	Notes     string `gorm:"type:text" json:"notes"`

	ApprovedByUserID *uuid.UUID `gorm:"type:uuid;index" json:"approved_by_user_id,omitempty"`
	ApprovedByUser   *User      `gorm:"foreignKey:ApprovedByUserID" json:"approved_by_user,omitempty"`
	ApprovedAt       *time.Time `json:"approved_at,omitempty"`

	// FinalAssessment is the doctor's completion summary after all
	// sessions finish.
	FinalAssessment  string     `gorm:"type:text" json:"final_assessment"`
	CompletedByUserID *uuid.UUID `gorm:"type:uuid;index" json:"completed_by_user_id,omitempty"`
	CompletedByUser   *User      `gorm:"foreignKey:CompletedByUserID" json:"completed_by_user,omitempty"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`

	Sessions []TreatmentSession `gorm:"foreignKey:PlanID" json:"sessions,omitempty"`
}

func (TreatmentPlan) TableName() string { return "treatment_plans" }

// TreatmentSession is one executed sitting within a plan (session 1 of 7).
// The therapist records the before/after condition and any complications.
type TreatmentSession struct {
	BaseModel
	PlanID uuid.UUID    `gorm:"type:uuid;not null;index" json:"plan_id"`
	Plan   TreatmentPlan `gorm:"foreignKey:PlanID" json:"plan,omitempty"`

	SessionNumber int       `gorm:"not null" json:"session_number"`
	SessionDate   time.Time `gorm:"type:date;not null;index" json:"session_date"`

	TherapistUserID *uuid.UUID `gorm:"type:uuid;index" json:"therapist_user_id,omitempty"`
	TherapistUser   *User      `gorm:"foreignKey:TherapistUserID" json:"therapist_user,omitempty"`

	Status         string     `gorm:"type:varchar(20);not null;default:'PENDING'" json:"status"`
	Duration       int        `gorm:"not null;default:0" json:"duration_minutes"`
	MaterialsUsed  string     `gorm:"type:text" json:"materials_used"`
	BeforeCondition string    `gorm:"type:text" json:"before_condition"`
	AfterCondition  string    `gorm:"type:text" json:"after_condition"`
	Complications   string    `gorm:"type:text" json:"complications"`
	Observations    string    `gorm:"type:text" json:"observations"`
	Notes           string    `gorm:"type:text" json:"notes"`

	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

func (TreatmentSession) TableName() string { return "treatment_sessions" }

// TreatmentPlanCounter tracks the last-issued treatment plan sequence per
// year so plan numbers look like PKR-2026-000001. A single row per year is
// row-locked and incremented inside the transaction that creates the plan.
type TreatmentPlanCounter struct {
	Year       int `gorm:"primaryKey"`
	LastNumber int `gorm:"not null;default:0"`
}

func (TreatmentPlanCounter) TableName() string { return "treatment_plan_counters" }
