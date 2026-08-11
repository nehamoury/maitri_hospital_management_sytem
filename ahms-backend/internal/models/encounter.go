package models

import (
	"time"

	"github.com/google/uuid"
)

// Encounter statuses for the OPD reception → consultation workflow.
const (
	EncounterRegistered     = "REGISTERED"
	EncounterWaiting        = "WAITING"
	EncounterInConsultation = "IN_CONSULTATION"
	EncounterCompleted      = "COMPLETED"
)

// Encounter visit types.
const (
	VisitTypeNew      = "NEW"
	VisitTypeFollowUp = "FOLLOW_UP"
)

// Encounter types.
const (
	EncounterTypeOPD = "OPD"
	EncounterTypeIPD = "IPD"
)

// Payment statuses.
const (
	PaymentUnpaid   = "UNPAID"
	PaymentPartial  = "PARTIAL"
	PaymentPaid     = "PAID"
)

// Encounter is the core entity of the Patient → Encounter → Clinical
// Records architecture. Each visit/consultation becomes a separate
// encounter, so the complete longitudinal history of a patient stays
// intact. New visits must never create a new patient record.
type Encounter struct {
	BaseModel
	PatientID uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient   Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	DepartmentID uuid.UUID  `gorm:"type:uuid;not null;index" json:"department_id"`
	Department   Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`

	DoctorID uuid.UUID `gorm:"type:uuid;not null;index" json:"doctor_id"`
	Doctor   Doctor    `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`

	EncounterType   string    `gorm:"type:varchar(10);not null;default:'OPD'" json:"encounter_type"`
	VisitType       string    `gorm:"type:varchar(20);not null;default:'NEW'" json:"visit_type"`
	VisitDate       time.Time `gorm:"type:date;not null;index" json:"visit_date"`
	TokenNumber     int       `gorm:"not null" json:"token_number"`
	Status          string    `gorm:"type:varchar(20);not null;default:'REGISTERED'" json:"status"`
	ConsultationFee float64   `gorm:"type:decimal(10,2);default:0" json:"consultation_fee"`
	PaymentStatus   string    `gorm:"type:varchar(20);not null;default:'UNPAID'" json:"payment_status"`

	// ReferralID links this encounter to the referral that produced it
	// (set when the receiving department starts its consultation).
	ReferralID *uuid.UUID `gorm:"type:uuid;index" json:"referral_id,omitempty"`

	CreatedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_user_id"`
	CreatedBy       User      `gorm:"foreignKey:CreatedByUserID" json:"created_by,omitempty"`

	Consultations []Consultation `gorm:"foreignKey:EncounterID" json:"consultations,omitempty"`
	Diagnoses     []Diagnosis    `gorm:"foreignKey:EncounterID" json:"diagnoses,omitempty"`
	Prescriptions []Prescription `gorm:"foreignKey:EncounterID" json:"prescriptions,omitempty"`
}

func (Encounter) TableName() string {
	return "encounters"
}
