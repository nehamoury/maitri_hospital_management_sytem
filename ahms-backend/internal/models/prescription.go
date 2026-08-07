package models

import "github.com/google/uuid"

// Prescription statuses. The distinction between prescribed and dispensed
// matters because later doctors must know what was ordered versus what the
// patient actually received from the pharmacy.
const (
	PrescriptionPrescribed         = "PRESCRIBED"
	PrescriptionPartiallyDispensed = "PARTIALLY_DISPENSED"
	PrescriptionDispensed          = "DISPENSED"
)

// Prescription is a doctor's order of medicines during a consultation.
type Prescription struct {
	BaseModel
	EncounterID uuid.UUID          `gorm:"type:uuid;not null;index" json:"encounter_id"`
	Encounter   Encounter          `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`
	DoctorID    uuid.UUID          `gorm:"type:uuid;not null" json:"doctor_id"`
	Doctor      Doctor             `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`
	Status      string             `gorm:"type:varchar(20);not null;default:'PRESCRIBED'" json:"status"`
	Notes       string             `gorm:"type:text" json:"notes"`
	Items       []PrescriptionItem `gorm:"foreignKey:PrescriptionID" json:"items,omitempty"`
}

func (Prescription) TableName() string {
	return "prescriptions"
}

// PrescriptionItem is a single medicine line in a prescription.
type PrescriptionItem struct {
	BaseModel
	PrescriptionID uuid.UUID    `gorm:"type:uuid;not null;index" json:"prescription_id"`
	Prescription   Prescription `gorm:"foreignKey:PrescriptionID" json:"prescription,omitempty"`

	Medicine     string `gorm:"type:varchar(200);not null" json:"medicine"`
	Formulation  string `gorm:"type:varchar(100)" json:"formulation"` // e.g. Vati, Churna, Kwath, Taila
	Dose         string `gorm:"type:varchar(100)" json:"dose"`
	Frequency    string `gorm:"type:varchar(100)" json:"frequency"`
	Duration     string `gorm:"type:varchar(100)" json:"duration"`
	Quantity     int    `gorm:"default:0" json:"quantity"`
	Anupana      string `gorm:"type:varchar(100)" json:"anupana"`
	Route        string `gorm:"type:varchar(50)" json:"route"`
	Instructions string `gorm:"type:text" json:"instructions"`

	DispensedQty int `gorm:"default:0" json:"dispensed_qty"`
}

func (PrescriptionItem) TableName() string {
	return "prescription_items"
}
