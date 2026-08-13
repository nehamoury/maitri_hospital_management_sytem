package models

import (
	"time"

	"github.com/google/uuid"
)

// ─── Status constants ────────────────────────────────────────────────────────

// InvestigationOrder statuses (order-level state machine).
const (
	LabOrderOrdered          = "ORDERED"
	LabOrderSampleCollected  = "SAMPLE_COLLECTED"
	LabOrderProcessing       = "PROCESSING"
	LabOrderResultAvailable  = "RESULT_AVAILABLE"
	LabOrderDoctorReviewed   = "DOCTOR_REVIEWED"
	LabOrderCancelled        = "CANCELLED"
	LabOrderRejected         = "REJECTED"
)

// InvestigationOrderItem statuses (per-test status within an order).
const (
	LabItemPending         = "PENDING"
	LabItemProcessing      = "PROCESSING"
	LabItemResultEntered   = "RESULT_ENTERED"
	LabItemVerified        = "VERIFIED"
	LabItemCancelled       = "CANCELLED"
)

// Result flag (normal/abnormal classification per item).
const (
	LabFlagNormal   = "NORMAL"
	LabFlagLow      = "LOW"
	LabFlagHigh     = "HIGH"
	LabFlagCritical = "CRITICAL"
)

// Priority levels for lab orders.
const (
	LabPriorityRoutine = "ROUTINE"
	LabPriorityUrgent  = "URGENT"
	LabPriorityStat    = "STAT"
)

// ─── Test Category ───────────────────────────────────────────────────────────

// InvestigationCategory groups tests (e.g., HAEMATOLOGY, BIOCHEMISTRY, MICROBIOLOGY).
type InvestigationCategory struct {
	BaseModel
	Name        string `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Code        string `gorm:"type:varchar(20);uniqueIndex;not null" json:"code"`
	Description string `gorm:"type:text" json:"description"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`

	Tests []InvestigationTest `gorm:"foreignKey:CategoryID" json:"tests,omitempty"`
}

func (InvestigationCategory) TableName() string { return "investigation_categories" }

// ─── Test Master ─────────────────────────────────────────────────────────────

// InvestigationTest is the test catalog. Each test has a category, sample
// type, reference range, and a turnaround time. Reference ranges are stored
// as a text snapshot; unit and method are informational.
type InvestigationTest struct {
	BaseModel
	CategoryID uuid.UUID             `gorm:"type:uuid;not null;index" json:"category_id"`
	Category   InvestigationCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`

	Name              string  `gorm:"type:varchar(150);not null" json:"name"`
	Code              string  `gorm:"type:varchar(30);uniqueIndex;not null" json:"code"`
	SampleType        string  `gorm:"type:varchar(80);not null" json:"sample_type"`  // e.g., "Venous Blood", "Urine", "Stool"
	Method            string  `gorm:"type:varchar(100)" json:"method"`               // e.g., "Automated Haematology Analyzer"
	Unit              string  `gorm:"type:varchar(50)" json:"unit"`                  // e.g., "g/dL", "mg/dL", "%"
	ReferenceRangeMale   string `gorm:"type:varchar(200)" json:"reference_range_male"`
	ReferenceRangeFemale string `gorm:"type:varchar(200)" json:"reference_range_female"`
	ReferenceRangeChild  string `gorm:"type:varchar(200)" json:"reference_range_child"`
	TurnaroundHours   int     `gorm:"not null;default:24" json:"turnaround_hours"`
	Cost              float64 `gorm:"type:decimal(10,2);default:0" json:"cost"`
	IsActive          bool    `gorm:"default:true" json:"is_active"`
}

func (InvestigationTest) TableName() string { return "investigation_tests" }

// ─── Order ───────────────────────────────────────────────────────────────────

// InvestigationOrder is the root state-machine entity. A single order can
// contain multiple tests (OrderItems). The order-level status advances when
// the overall workflow progresses (e.g., when all items are verified →
// RESULT_AVAILABLE; doctor marks reviewed → DOCTOR_REVIEWED).
type InvestigationOrder struct {
	BaseModel

	// Human-readable order number, e.g. LAB-2026-000001.
	OrderNo string `gorm:"type:varchar(30);uniqueIndex;not null" json:"order_no"`

	PatientID   uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient     Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// EncounterID and AdmissionID link the order to clinical context.
	// Both are optional — a lab order can be standalone.
	EncounterID  *uuid.UUID  `gorm:"type:uuid;index" json:"encounter_id,omitempty"`
	Encounter    *Encounter  `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`
	AdmissionID  *uuid.UUID  `gorm:"type:uuid;index" json:"admission_id,omitempty"`

	OrderedByUserID uuid.UUID `gorm:"type:uuid;not null;index" json:"ordered_by_user_id"`
	OrderedByUser   User      `gorm:"foreignKey:OrderedByUserID" json:"ordered_by_user,omitempty"`

	DepartmentID *uuid.UUID `gorm:"type:uuid;index" json:"department_id,omitempty"`

	Status   string `gorm:"type:varchar(30);not null;default:'ORDERED'" json:"status"`
	Priority string `gorm:"type:varchar(20);not null;default:'ROUTINE'" json:"priority"`

	ClinicalNotes string `gorm:"type:text" json:"clinical_notes"`

	// Cancellation tracking.
	CancelledByUserID *uuid.UUID `gorm:"type:uuid;index" json:"cancelled_by_user_id,omitempty"`
	CancelledByUser   *User      `gorm:"foreignKey:CancelledByUserID" json:"cancelled_by_user,omitempty"`
	CancelledAt       *time.Time `json:"cancelled_at,omitempty"`
	CancelReason      string     `gorm:"type:text" json:"cancel_reason,omitempty"`

	// Doctor review.
	ReviewedByUserID *uuid.UUID `gorm:"type:uuid;index" json:"reviewed_by_user_id,omitempty"`
	ReviewedByUser   *User      `gorm:"foreignKey:ReviewedByUserID" json:"reviewed_by_user,omitempty"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty"`
	DoctorRemarks    string     `gorm:"type:text" json:"doctor_remarks,omitempty"`

	Items  []InvestigationOrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	Sample *InvestigationSample     `gorm:"foreignKey:OrderID" json:"sample,omitempty"`
}

func (InvestigationOrder) TableName() string { return "investigation_orders" }

// ─── Order Item (per-test) ────────────────────────────────────────────────────

// InvestigationOrderItem represents a single test within an order. Each
// item has its own status/result so partial completion is supported.
type InvestigationOrderItem struct {
	BaseModel

	OrderID uuid.UUID          `gorm:"type:uuid;not null;index" json:"order_id"`
	TestID  uuid.UUID          `gorm:"type:uuid;not null;index" json:"test_id"`
	Test    InvestigationTest  `gorm:"foreignKey:TestID" json:"test,omitempty"`

	Status string `gorm:"type:varchar(30);not null;default:'PENDING'" json:"status"`

	// Result fields (filled when status = RESULT_ENTERED or VERIFIED).
	ResultValue string `gorm:"type:varchar(200)" json:"result_value,omitempty"` // numeric or qualitative
	ResultUnit  string `gorm:"type:varchar(50)" json:"result_unit,omitempty"`
	ResultText  string `gorm:"type:text" json:"result_text,omitempty"` // narrative / qualitative result
	ResultFlag  string `gorm:"type:varchar(20)" json:"result_flag,omitempty"` // NORMAL/LOW/HIGH/CRITICAL

	// Snapshot of reference range at time of result entry.
	ReferenceRangeSnapshot string `gorm:"type:varchar(200)" json:"reference_range_snapshot,omitempty"`

	Remarks string `gorm:"type:text" json:"remarks,omitempty"`

	ResultedByUserID *uuid.UUID `gorm:"type:uuid;index" json:"resulted_by_user_id,omitempty"`
	ResultedByUser   *User      `gorm:"foreignKey:ResultedByUserID" json:"resulted_by_user,omitempty"`
	ResultedAt       *time.Time `json:"resulted_at,omitempty"`

	VerifiedByUserID *uuid.UUID `gorm:"type:uuid;index" json:"verified_by_user_id,omitempty"`
	VerifiedByUser   *User      `gorm:"foreignKey:VerifiedByUserID" json:"verified_by_user,omitempty"`
	VerifiedAt       *time.Time `json:"verified_at,omitempty"`
}

func (InvestigationOrderItem) TableName() string { return "investigation_order_items" }

// ─── Sample ───────────────────────────────────────────────────────────────────

// InvestigationSample records the physical sample collected for an order.
type InvestigationSample struct {
	BaseModel

	OrderID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"order_id"`

	SampleType       string `gorm:"type:varchar(80);not null" json:"sample_type"`
	CollectionMethod string `gorm:"type:varchar(100)" json:"collection_method"`
	Barcode          string `gorm:"type:varchar(50)" json:"barcode,omitempty"`
	VolumeMl         float64 `gorm:"type:decimal(6,2)" json:"volume_ml,omitempty"`
	IsAdequate       bool   `gorm:"default:true" json:"is_adequate"`
	Notes            string `gorm:"type:text" json:"notes,omitempty"`

	CollectedByUserID uuid.UUID `gorm:"type:uuid;not null;index" json:"collected_by_user_id"`
	CollectedByUser   User      `gorm:"foreignKey:CollectedByUserID" json:"collected_by_user,omitempty"`
	CollectedAt       time.Time `gorm:"not null" json:"collected_at"`
}

func (InvestigationSample) TableName() string { return "investigation_samples" }

// ─── Order counter ────────────────────────────────────────────────────────────

// InvestigationOrderCounter tracks the last-issued order number per year
// (e.g., LAB-2026-000001). Uses the same row-lock pattern as
// TreatmentPlanCounter and AdmissionCounter.
type InvestigationOrderCounter struct {
	Year       int `gorm:"primaryKey"`
	LastNumber int `gorm:"not null;default:0"`
}

func (InvestigationOrderCounter) TableName() string { return "investigation_order_counters" }
