package models

import (
	"time"

	"github.com/google/uuid"
)

// Patient represents a registered patient. UHID (Unique Hospital ID) is
// system-generated on creation and never changes.
type Patient struct {
	BaseModel
	UHID string `gorm:"type:varchar(30);uniqueIndex;not null" json:"uhid"`

	FullName string     `gorm:"type:varchar(150);not null" json:"full_name"`
	Gender   string     `gorm:"type:varchar(10);not null" json:"gender"` // MALE, FEMALE, OTHER
	DOB      *time.Time `json:"dob"`
	Age      int        `json:"age"`

	Mobile           string `gorm:"type:varchar(15);index;not null" json:"mobile"`
	AlternateMobile  string `gorm:"type:varchar(15)" json:"alternate_mobile"`
	Email            string `gorm:"type:varchar(150)" json:"email"`
	BloodGroup       string `gorm:"type:varchar(5)" json:"blood_group"`
	MaritalStatus    string `gorm:"type:varchar(20)" json:"marital_status"`
	Occupation       string `gorm:"type:varchar(100)" json:"occupation"`
	PhotoURL         string `gorm:"type:varchar(500)" json:"photo_url"`

	Address  string `gorm:"type:text" json:"address"`
	City     string `gorm:"type:varchar(100)" json:"city"`
	State    string `gorm:"type:varchar(100)" json:"state"`
	District string `gorm:"type:varchar(100)" json:"district"`
	Pincode  string `gorm:"type:varchar(10)" json:"pincode"`
	Country  string `gorm:"type:varchar(100)" json:"country"`

	EmergencyContactName     string `gorm:"type:varchar(150)" json:"emergency_contact_name"`
	EmergencyContactRelation string `gorm:"type:varchar(50)" json:"emergency_contact_relation"`
	EmergencyContact         string `gorm:"type:varchar(15)" json:"emergency_contact"`
	EmergencyContactAddress  string `gorm:"type:text" json:"emergency_contact_address"`

	// Government / other identifiers. Sensitive: these are returned fully
	// only to registration/administration roles; every other caller gets
	// masked values (see patients handler toResponseWithIDs).
	AadhaarNo     string `gorm:"type:varchar(12);index" json:"aadhaar_no"`
	PanNo         string `gorm:"type:varchar(10)" json:"pan_no"`
	AbhaID        string `gorm:"type:varchar(50)" json:"abha_id"`
	OtherIDType   string `gorm:"type:varchar(50)" json:"other_id_type"`
	OtherIDNumber string `gorm:"type:varchar(50)" json:"other_id_number"`

	HeightCm          float64 `gorm:"type:decimal(5,1)" json:"height_cm"`
	WeightKg          float64 `gorm:"type:decimal(5,1)" json:"weight_kg"`
	BMI               float64 `gorm:"type:decimal(4,1)" json:"bmi"`
	BloodPressure     string  `gorm:"type:varchar(20)" json:"blood_pressure"`
	Pulse             string  `gorm:"type:varchar(20)" json:"pulse"`
	Sugar             string  `gorm:"type:varchar(20)" json:"sugar"`
	Allergies         string  `gorm:"type:text" json:"allergies"`
	ChronicDiseases   string  `gorm:"type:text" json:"chronic_diseases"`
	CurrentMedication string  `gorm:"type:text" json:"current_medication"`

	RegistrationType string `gorm:"type:varchar(20);not null;default:WALK_IN" json:"registration_type"`
	ReferredBy       string `gorm:"type:varchar(150)" json:"referred_by"`
	Branch           string `gorm:"type:varchar(100)" json:"branch"`
	Remarks          string `gorm:"type:text" json:"remarks"`

	RegisteredByUserID uuid.UUID `gorm:"type:uuid;not null" json:"registered_by_user_id"`
	RegisteredBy       User      `gorm:"foreignKey:RegisteredByUserID" json:"registered_by,omitempty"`

	IsActive bool `gorm:"default:true" json:"is_active"`
}

// Registration types for the patients.registration_type column.
const (
	RegistrationTypeWalkIn   = "WALK_IN"
	RegistrationTypeOnline   = "ONLINE"
	RegistrationTypeReferral = "REFERRAL"
)

func (Patient) TableName() string {
	return "patients"
}

// UHIDCounter tracks the last-issued sequence number per year, so UHIDs
// look like AHMS-2026-000001, AHMS-2026-000002, ... A single row per
// year is locked (SELECT ... FOR UPDATE) and incremented atomically
// inside the same transaction that creates the Patient, guaranteeing no
// two patients ever receive the same UHID even under concurrent requests.
type UHIDCounter struct {
	Year       int `gorm:"primaryKey"`
	LastNumber int `gorm:"not null;default:0"`
}

func (UHIDCounter) TableName() string {
	return "uhid_counters"
}
