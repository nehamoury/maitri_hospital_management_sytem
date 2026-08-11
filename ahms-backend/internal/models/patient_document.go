package models

import "github.com/google/uuid"

// PatientDocument is a clinical or administrative record attached to a
// patient file (investigation report, ID proof, consent form, discharge
// summary, etc.). The physical file lives under the shared uploads
// directory; FilePath holds the /uploads/... URL served statically.
type PatientDocument struct {
	BaseModel
	PatientID uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient   Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	DocType string `gorm:"type:varchar(60);not null;default:'OTHER'" json:"doc_type"`
	Notes   string `gorm:"type:varchar(300)" json:"notes,omitempty"`

	FileName string `gorm:"type:varchar(255);not null" json:"file_name"`
	FilePath string `gorm:"type:varchar(500);not null" json:"file_path"`
	FileType string `gorm:"type:varchar(100)" json:"file_type"`
	FileSize int64  `json:"file_size"`

	UploadedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"uploaded_by_user_id"`
	UploadedBy       User      `gorm:"foreignKey:UploadedByUserID" json:"uploaded_by,omitempty"`
}

func (PatientDocument) TableName() string {
	return "patient_documents"
}
