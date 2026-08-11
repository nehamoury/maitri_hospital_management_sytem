package models

import "github.com/google/uuid"

// Referral statuses. A referral moves from CREATED to RECEIVED when the
// destination department acknowledges it, ACCEPTED when a doctor picks it
// up, CONSULTATION_STARTED when the receiving consultation begins and
// COMPLETED when it concludes. REJECTED / CANCELLED cover exceptions.
const (
	ReferralCreated             = "CREATED"
	ReferralReceived            = "RECEIVED"
	ReferralAccepted            = "ACCEPTED"
	ReferralConsultationStarted = "CONSULTATION_STARTED"
	ReferralCompleted           = "COMPLETED"
	ReferralRejected            = "REJECTED"
	ReferralCancelled           = "CANCELLED"
)

// Referral priorities.
const (
	ReferralPriorityRoutine   = "ROUTINE"
	ReferralPriorityUrgent    = "URGENT"
	ReferralPriorityEmergency = "EMERGENCY"
)

// Referral links two encounters: the source encounter (where the doctor
// decided to refer) and, once the destination starts its consultation, a
// new destination encounter (linked via Encounter.ReferralID). The
// receiving doctor sees the source history through this record.
type Referral struct {
	BaseModel
	ReferralNo string `gorm:"type:varchar(30);uniqueIndex;not null" json:"referral_no"`

	PatientID uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient   Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	SourceEncounterID uuid.UUID `gorm:"type:uuid;not null;index" json:"source_encounter_id"`
	SourceEncounter   Encounter `gorm:"foreignKey:SourceEncounterID" json:"source_encounter,omitempty"`

	FromDepartmentID uuid.UUID  `gorm:"type:uuid;not null;index" json:"from_department_id"`
	FromDepartment   Department `gorm:"foreignKey:FromDepartmentID" json:"from_department,omitempty"`

	ToDepartmentID uuid.UUID  `gorm:"type:uuid;not null;index" json:"to_department_id"`
	ToDepartment   Department `gorm:"foreignKey:ToDepartmentID" json:"to_department,omitempty"`

	PreferredDoctorID *uuid.UUID `gorm:"type:uuid;index" json:"preferred_doctor_id,omitempty"`
	PreferredDoctor   *Doctor    `gorm:"foreignKey:PreferredDoctorID" json:"preferred_doctor,omitempty"`

	Reason               string `gorm:"type:text;not null" json:"reason"`
	ClinicalNotes        string `gorm:"type:text" json:"clinical_notes"`
	Priority             string `gorm:"type:varchar(20);not null;default:'ROUTINE'" json:"priority"`
	RecommendedTreatment string `gorm:"type:text" json:"recommended_treatment"`
	Diagnosis            string `gorm:"type:varchar(255)" json:"diagnosis"`

	Status string `gorm:"type:varchar(30);not null;default:'CREATED'" json:"status"`

	ReferredByUserID uuid.UUID `gorm:"type:uuid;not null" json:"referred_by_user_id"`
	ReferredBy       User      `gorm:"foreignKey:ReferredByUserID" json:"referred_by,omitempty"`

	Attachments []ReferralAttachment `gorm:"foreignKey:ReferralID" json:"attachments,omitempty"`
}

func (Referral) TableName() string {
	return "referrals"
}

// ReferralAttachment is a file (report, image, document) attached to a
// referral. Files are stored on local disk and served through the /uploads
// static route; the DB row keeps the metadata and linkage to the referral.
type ReferralAttachment struct {
	BaseModel
	ReferralID       uuid.UUID `gorm:"type:uuid;not null;index" json:"referral_id"`
	Referral         Referral  `gorm:"foreignKey:ReferralID" json:"referral,omitempty"`
	FileName         string    `gorm:"type:varchar(255);not null" json:"file_name"`
	FilePath         string    `gorm:"type:varchar(500);not null" json:"file_path"`
	FileType         string    `gorm:"type:varchar(100)" json:"file_type"`
	FileSize         int64     `json:"file_size"`
	UploadedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"uploaded_by_user_id"`
	UploadedBy       User      `gorm:"foreignKey:UploadedByUserID" json:"uploaded_by,omitempty"`
}

func (ReferralAttachment) TableName() string {
	return "referral_attachments"
}

// ReferralCounter tracks the last-issued referral sequence per year so
// numbers look like REF-2026-000001. A single row per year is row-locked
// and incremented inside the transaction that creates the referral.
type ReferralCounter struct {
	Year       int `gorm:"primaryKey"`
	LastNumber int `gorm:"not null;default:0"`
}

func (ReferralCounter) TableName() string {
	return "referral_counters"
}
