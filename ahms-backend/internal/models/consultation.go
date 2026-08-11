package models

import (
	"time"

	"github.com/google/uuid"
)

// Consultation is the clinical record a doctor creates during an
// encounter. Ayurvedic assessment fields are stored as JSONB
// (ayurveda_fields) so they remain configurable per department rather
// than mandatory columns for every consultation.
type Consultation struct {
	BaseModel
	EncounterID uuid.UUID `gorm:"type:uuid;not null;index" json:"encounter_id"`
	Encounter   Encounter `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`

	DoctorID uuid.UUID `gorm:"type:uuid;not null" json:"doctor_id"`
	Doctor   Doctor    `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`

	ChiefComplaints string `gorm:"type:text" json:"chief_complaints"`
	History         string `gorm:"type:text" json:"history"`
	Examination     string `gorm:"type:text" json:"examination"`
	ClinicalNotes   string `gorm:"type:text" json:"clinical_notes"`
	TreatmentPlan   string `gorm:"type:text" json:"treatment_plan"`
	DietPathya      string `gorm:"type:text" json:"diet_pathya"`
	DietApathya     string `gorm:"type:text" json:"diet_apathya"`

	// AyurvedaFields holds configurable assessment keys such as prakriti,
	// vikriti, dosha, agni, nadi, mala, mutra, jihva, nidra and the
	// Ashtavidha/Dashavidha pariksha results.
	AyurvedaFields JSONB `gorm:"type:jsonb" json:"ayurveda_fields"`

	// Typed Ayurvedic scalar assessments. These mirror the "ayurveda_fields"
	// JSONB map so the clinical record is queryable and the API contract is
	// explicit. The map continues to carry the nested ashtavidha/dashavidha
	// assessments.
	Prakriti string `gorm:"type:varchar(120)" json:"prakriti"`
	Vikriti  string `gorm:"type:varchar(120)" json:"vikriti"`
	Dosha    string `gorm:"type:varchar(120)" json:"dosha"`
	Agni     string `gorm:"type:varchar(120)" json:"agni"`
	Nadi     string `gorm:"type:varchar(120)" json:"nadi"`
	Mala     string `gorm:"type:varchar(120)" json:"mala"`
	Mutra    string `gorm:"type:varchar(120)" json:"mutra"`
	Jihva    string `gorm:"type:varchar(120)" json:"jihva"`
	Nidra    string `gorm:"type:varchar(120)" json:"nidra"`

	FollowUpDate *time.Time `json:"follow_up_date"`

	Diagnoses []Diagnosis `gorm:"foreignKey:ConsultationID" json:"diagnoses,omitempty"`
}

func (Consultation) TableName() string {
	return "consultations"
}
