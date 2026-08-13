package models

import (
	"time"

	"github.com/google/uuid"
)

// Bed statuses. AVAILABLE beds are free for allocation; OCCUPIED beds are
// held by a current admission; RESERVED holds a bed for a booked admission;
// MAINTENANCE takes a bed out of service.
const (
	BedAvailable   = "AVAILABLE"
	BedOccupied    = "OCCUPIED"
	BedReserved    = "RESERVED"
	BedMaintenance = "MAINTENANCE"
)

// ValidBedStatuses is the allow-list used for request validation.
var ValidBedStatuses = map[string]bool{
	BedAvailable:   true,
	BedOccupied:    true,
	BedReserved:    true,
	BedMaintenance: true,
}

// Bed types / categories.
const (
	BedTypeGeneral     = "GENERAL"
	BedTypeSemiPrivate = "SEMI_PRIVATE"
	BedTypePrivate     = "PRIVATE"
	BedTypeICU         = "ICU"
)

// ValidBedTypes is the allow-list used for request validation.
var ValidBedTypes = map[string]bool{
	BedTypeGeneral:     true,
	BedTypeSemiPrivate: true,
	BedTypePrivate:     true,
	BedTypeICU:         true,
}

// Admission status lifecycle: ADMITTED → (TRANSFERRED)* → DISCHARGED.
// CANCELLED covers an admission that never materialised.
const (
	AdmissionAdmitted    = "ADMITTED"
	AdmissionTransferred = "TRANSFERRED"
	AdmissionDischarged  = "DISCHARGED"
	AdmissionCancelled   = "CANCELLED"
)

// ValidAdmissionStatuses is the allow-list for the admission lifecycle.
var ValidAdmissionStatuses = map[string]bool{
	AdmissionAdmitted:    true,
	AdmissionTransferred: true,
	AdmissionDischarged:  true,
	AdmissionCancelled:   true,
}

// Admission types.
const (
	AdmissionTypePlanned   = "PLANNED"
	AdmissionTypeEmergency = "EMERGENCY"
)

// Discharge types.
const (
	DischargeTypeCured    = "CURED"
	DischargeTypeImproved = "IMPROVED"
	DischargeTypeReferred = "REFERRED"
	DischargeTypeLAMA     = "LAMA"
	DischargeTypeAbscond  = "ABSCOND"
	DischargeTypeExpired  = "EXPIRED"
)

// ValidDischargeTypes is the allow-list for discharge summaries.
var ValidDischargeTypes = map[string]bool{
	DischargeTypeCured:    true,
	DischargeTypeImproved: true,
	DischargeTypeReferred: true,
	DischargeTypeLAMA:     true,
	DischargeTypeAbscond:  true,
	DischargeTypeExpired:  true,
}

// Progress note types — admission assessment, doctor rounds, nurse notes,
// vitals-only recordings and generic progress entries.
const (
	NoteTypeAdmissionAssessment = "ADMISSION_ASSESSMENT"
	NoteTypeDoctorRound         = "DOCTOR_ROUND"
	NoteTypeNurseNote           = "NURSE_NOTE"
	NoteTypeVital               = "VITAL"
	NoteTypeProgress            = "PROGRESS"
)

// ValidNoteTypes is the allow-list for progress note types.
var ValidNoteTypes = map[string]bool{
	NoteTypeAdmissionAssessment: true,
	NoteTypeDoctorRound:         true,
	NoteTypeNurseNote:           true,
	NoteTypeVital:               true,
	NoteTypeProgress:            true,
}

// Care shifts.
const (
	ShiftMorning = "MORNING"
	ShiftEvening = "EVENING"
	ShiftNight   = "NIGHT"
)

// Admission order types (Step 3 clinical orders).
const (
	OrderTypeMedicine     = "MEDICINE"
	OrderTypeTreatment    = "TREATMENT"
	OrderTypeInvestigation = "INVESTIGATION"
	OrderTypeOther        = "OTHER"
)

// ValidOrderTypes is the allow-list for admission orders.
var ValidOrderTypes = map[string]bool{
	OrderTypeMedicine:      true,
	OrderTypeTreatment:     true,
	OrderTypeInvestigation: true,
	OrderTypeOther:         true,
}

// Admission order statuses.
const (
	OrderOrdered    = "ORDERED"
	OrderInProgress = "IN_PROGRESS"
	OrderCompleted  = "COMPLETED"
	OrderOnHold     = "HELD"
	OrderCancelled  = "CANCELLED"
)

// Diet order statuses.
const (
	DietOrdered  = "ORDERED"
	DietPrepared = "PREPARED"
	DietServed   = "SERVED"
	DietHeld     = "HELD"
)

// Ward is a physical ward that groups beds. It may be tied to a department.
type Ward struct {
	BaseModel
	Code         string      `gorm:"type:varchar(20);uniqueIndex;not null" json:"code"`
	Name         string      `gorm:"type:varchar(150);uniqueIndex;not null" json:"name"`
	Location     string      `gorm:"type:varchar(150)" json:"location"`
	DepartmentID *uuid.UUID  `gorm:"type:uuid;index" json:"department_id,omitempty"`
	Department   *Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	IsActive     bool        `gorm:"default:true" json:"is_active"`

	Beds []Bed `gorm:"foreignKey:WardID" json:"beds,omitempty"`
}

func (Ward) TableName() string { return "wards" }

// Bed is a single bed within a ward. Status is maintained by the bed
// management engine (allocation, transfer, release).
type Bed struct {
	BaseModel
	WardID   uuid.UUID `gorm:"type:uuid;not null;index" json:"ward_id"`
	Ward     Ward      `gorm:"foreignKey:WardID" json:"ward,omitempty"`
	BedNo    string    `gorm:"type:varchar(30);not null" json:"bed_no"`
	BedType  string    `gorm:"type:varchar(20);not null;default:'GENERAL'" json:"bed_type"`
	Status   string    `gorm:"type:varchar(20);not null;default:'AVAILABLE'" json:"status"`
	IsActive bool      `gorm:"default:true" json:"is_active"`
}

func (Bed) TableName() string { return "beds" }

// Admission is the core IPD entity. Each IPD stay of a patient is one
// admission carrying its own admission number, the admitting department,
// doctor and current bed, plus the full status lifecycle.
type Admission struct {
	BaseModel
	AdmissionNo string `gorm:"type:varchar(30);uniqueIndex;not null" json:"admission_no"`

	PatientID uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient   Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	DepartmentID uuid.UUID  `gorm:"type:uuid;not null;index" json:"department_id"`
	Department   Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`

	DoctorID uuid.UUID `gorm:"type:uuid;not null;index" json:"doctor_id"`
	Doctor   Doctor    `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`

	BedID *uuid.UUID `gorm:"type:uuid;index" json:"bed_id,omitempty"`
	Bed   *Bed       `gorm:"foreignKey:BedID" json:"bed,omitempty"`

	AdmissionType         string     `gorm:"type:varchar(20);not null;default:'PLANNED'" json:"admission_type"`
	AdmissionDate         time.Time  `gorm:"type:date;not null;index" json:"admission_date"`
	AdmissionTime         string     `gorm:"type:varchar(10)" json:"admission_time"`
	Reason                string     `gorm:"type:text" json:"reason"`
	Diagnosis             string     `gorm:"type:text" json:"diagnosis"`
	Notes                 string     `gorm:"type:text" json:"notes"`
	ExpectedDischargeDate *time.Time `gorm:"type:date" json:"expected_discharge_date,omitempty"`

	Status string `gorm:"type:varchar(20);not null;default:'ADMITTED'" json:"status"`

	AdmittedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"admitted_by_user_id"`
	AdmittedBy       User      `gorm:"foreignKey:AdmittedByUserID" json:"admitted_by,omitempty"`

	DischargedAt      *time.Time `json:"discharged_at,omitempty"`
	DischargedByUserID *uuid.UUID `gorm:"type:uuid;index" json:"discharged_by_user_id,omitempty"`
	DischargedBy      *User      `gorm:"foreignKey:DischargedByUserID" json:"discharged_by,omitempty"`

	ProgressNotes []ProgressNote   `gorm:"foreignKey:AdmissionID" json:"progress_notes,omitempty"`
	DietOrders    []DietOrder      `gorm:"foreignKey:AdmissionID" json:"diet_orders,omitempty"`
	Orders        []AdmissionOrder `gorm:"foreignKey:AdmissionID" json:"orders,omitempty"`
	BedHistory    []AdmissionBed   `gorm:"foreignKey:AdmissionID" json:"bed_history,omitempty"`
	Discharge     *DischargeSummary `gorm:"foreignKey:AdmissionID" json:"discharge,omitempty"`
}

func (Admission) TableName() string { return "admissions" }

// AdmissionBed records every bed assignment in an admission's history. The
// row with to_date IS NULL is the current assignment; it is closed
// (to_date set) on transfer and on discharge, which frees the old bed.
type AdmissionBed struct {
	BaseModel
	AdmissionID     uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
	Admission       Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`
	BedID           uuid.UUID `gorm:"type:uuid;not null" json:"bed_id"`
	Bed             Bed       `gorm:"foreignKey:BedID" json:"bed,omitempty"`
	FromDate        time.Time `json:"from_date"`
	ToDate          *time.Time `json:"to_date,omitempty"`
	Reason          string    `gorm:"type:varchar(255)" json:"reason"`
	ChangedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"changed_by_user_id"`
	ChangedBy       User      `gorm:"foreignKey:ChangedByUserID" json:"changed_by,omitempty"`
}

func (AdmissionBed) TableName() string { return "admission_beds" }

// ProgressNote is a single clinical entry in the IPD chart: admission
// assessment, doctor round, nurse note, or a vitals recording.
type ProgressNote struct {
	BaseModel
	AdmissionID uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
	Admission   Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`

	NoteType string `gorm:"type:varchar(30);not null;default:'PROGRESS'" json:"note_type"`
	Notes    string `gorm:"type:text" json:"notes"`
	Shift    string `gorm:"type:varchar(10)" json:"shift"`
	// Vitals holds typed observation values (bp, pulse, temp, rr, spo2,
	// weight, blood_sugar) as a flexible JSONB object.
	Vitals         JSONB `gorm:"type:jsonb" json:"vitals,omitempty"`
	RecordedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"recorded_by_user_id"`
	RecordedBy     User  `gorm:"foreignKey:RecordedByUserID" json:"recorded_by,omitempty"`
}

func (ProgressNote) TableName() string { return "progress_notes" }

// AdmissionOrder is a generic clinical order against an admission —
// typically medicine, treatment (Panchakarma etc.) or investigation.
type AdmissionOrder struct {
	BaseModel
	AdmissionID uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
	Admission   Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`

	OrderType   string `gorm:"type:varchar(20);not null" json:"order_type"`
	Description string `gorm:"type:text;not null" json:"description"`
	Frequency   string `gorm:"type:varchar(50)" json:"frequency"`
	Quantity    string `gorm:"type:varchar(50)" json:"quantity"`
	Notes       string `gorm:"type:text" json:"notes"`
	Status      string `gorm:"type:varchar(20);not null;default:'ORDERED'" json:"status"`

	OrderedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"ordered_by_user_id"`
	OrderedBy       User      `gorm:"foreignKey:OrderedByUserID" json:"ordered_by,omitempty"`
}

func (AdmissionOrder) TableName() string { return "admission_orders" }

// DietOrder is a diet prescription for a patient admission.
type DietOrder struct {
	BaseModel
	AdmissionID  uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
	Admission    Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`
	DietType     string    `gorm:"type:varchar(100);not null" json:"diet_type"`
	Schedule     string    `gorm:"type:varchar(255)" json:"schedule"`
	Instructions string    `gorm:"type:text" json:"instructions"`
	Status       string    `gorm:"type:varchar(20);not null;default:'ORDERED'" json:"status"`

	OrderedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"ordered_by_user_id"`
	OrderedBy       User      `gorm:"foreignKey:OrderedByUserID" json:"ordered_by,omitempty"`
}

func (DietOrder) TableName() string { return "diet_orders" }

// DischargeSummary is the structured discharge record created when an
// admission is discharged. It also carries the final diagnosis, procedures
// performed, medicines at discharge and follow-up instructions.
type DischargeSummary struct {
	BaseModel
	AdmissionID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"admission_id"`
	Admission   Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`

	DischargeType         string     `gorm:"type:varchar(20);not null" json:"discharge_type"`
	FinalDiagnosis        string     `gorm:"type:text" json:"final_diagnosis"`
	TreatmentGiven        string     `gorm:"type:text" json:"treatment_given"`
	ProceduresDone        string     `gorm:"type:text" json:"procedures_done"`
	MedicinesAtDischarge  string     `gorm:"type:text" json:"medicines_at_discharge"`
	FollowUpInstructions  string     `gorm:"type:text" json:"follow_up_instructions"`
	FollowUpDate          *time.Time `gorm:"type:date" json:"follow_up_date,omitempty"`
	Summary               string     `gorm:"type:text" json:"summary"`
	DischargeNotes        string     `gorm:"type:text" json:"discharge_notes"`
}

func (DischargeSummary) TableName() string { return "discharge_summaries" }

// AdmissionCounter tracks the last-issued admission sequence per year so
// numbers look like IPD-2026-000001. A single row per year is row-locked
// and incremented inside the transaction that creates the admission.
type AdmissionCounter struct {
	Year       int `gorm:"primaryKey"`
	LastNumber int `gorm:"not null;default:0"`
}

func (AdmissionCounter) TableName() string { return "admission_counters" }