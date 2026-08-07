package models

import "github.com/google/uuid"

// Diagnosis types.
const (
	DiagnosisPrimary     = "PRIMARY"
	DiagnosisComorbidity = "COMORBIDITY"
)

// Diagnosis is a diagnosis recorded during an encounter. A consultation
// can carry multiple diagnoses (one primary + comorbidities).
type Diagnosis struct {
	BaseModel
	EncounterID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"encounter_id"`
	Encounter      Encounter  `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`
	ConsultationID *uuid.UUID `gorm:"type:uuid;index" json:"consultation_id,omitempty"`

	Diagnosis     string `gorm:"type:varchar(255);not null" json:"diagnosis"`
	DiagnosisType string `gorm:"type:varchar(20);not null;default:'PRIMARY'" json:"diagnosis_type"`
	Notes         string `gorm:"type:text" json:"notes"`

	DoctorID uuid.UUID `gorm:"type:uuid;not null" json:"doctor_id"`
	Doctor   Doctor    `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`
}

func (Diagnosis) TableName() string {
	return "diagnoses"
}
