// Package patients implements patient registration, editing, and search,
// including automatic UHID generation and duplicate-mobile detection.
package patients

// CreatePatientRequest is the payload for POST /api/v1/patients.
// Force=true bypasses the duplicate-mobile warning (used when the
// receptionist has confirmed it's a genuinely different person, e.g. a
// family member sharing a phone).
type CreatePatientRequest struct {
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Gender   string `json:"gender" binding:"required,oneof=MALE FEMALE OTHER"`
	DOB      string `json:"dob" binding:"omitempty,datetime=2006-01-02"`
	Age      int    `json:"age" binding:"gte=0,lte=150"`
	Mobile   string `json:"mobile" binding:"required,min=10,max=15"`

	AlternateMobile string `json:"alternate_mobile" binding:"omitempty,min=10,max=15"`
	Email           string `json:"email" binding:"omitempty,email"`
	BloodGroup      string `json:"blood_group" binding:"max=5"`
	MaritalStatus   string `json:"marital_status" binding:"max=20"`
	Occupation      string `json:"occupation" binding:"max=100"`
	PhotoURL        string `json:"photo_url" binding:"max=500"`

	Address  string `json:"address" binding:"max=500"`
	City     string `json:"city" binding:"max=100"`
	State    string `json:"state" binding:"max=100"`
	District string `json:"district" binding:"max=100"`
	Pincode  string `json:"pincode" binding:"omitempty,max=10"`
	Country  string `json:"country" binding:"max=100"`

	EmergencyContactName     string `json:"emergency_contact_name" binding:"max=150"`
	EmergencyContactRelation string `json:"emergency_contact_relation" binding:"max=50"`
	EmergencyContact         string `json:"emergency_contact" binding:"omitempty,max=15"`
	EmergencyContactAddress  string `json:"emergency_contact_address" binding:"max=500"`

	HeightCm          float64 `json:"height_cm" binding:"omitempty,gte=30,lte=250"`
	WeightKg          float64 `json:"weight_kg" binding:"omitempty,gte=1,lte=300"`
	BloodPressure     string  `json:"blood_pressure" binding:"max=20"`
	Pulse             string  `json:"pulse" binding:"max=20"`
	Sugar             string  `json:"sugar" binding:"max=20"`
	Allergies         string  `json:"allergies"`
	ChronicDiseases   string  `json:"chronic_diseases"`
	CurrentMedication string  `json:"current_medication"`

	RegistrationType string `json:"registration_type" binding:"omitempty,oneof=WALK_IN ONLINE REFERRAL"`
	ReferredBy       string `json:"referred_by" binding:"max=150"`
	Branch           string `json:"branch" binding:"max=100"`
	Remarks          string `json:"remarks"`

	Force bool `json:"force"`
}

// UpdatePatientRequest is the payload for PUT /api/v1/patients/{id}.
type UpdatePatientRequest struct {
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Gender   string `json:"gender" binding:"required,oneof=MALE FEMALE OTHER"`
	DOB      string `json:"dob" binding:"omitempty,datetime=2006-01-02"`
	Age      int    `json:"age" binding:"gte=0,lte=150"`
	Mobile   string `json:"mobile" binding:"required,min=10,max=15"`

	AlternateMobile string `json:"alternate_mobile" binding:"omitempty,min=10,max=15"`
	Email           string `json:"email" binding:"omitempty,email"`
	BloodGroup      string `json:"blood_group" binding:"max=5"`
	MaritalStatus   string `json:"marital_status" binding:"max=20"`
	Occupation      string `json:"occupation" binding:"max=100"`
	PhotoURL        string `json:"photo_url" binding:"max=500"`

	Address  string `json:"address" binding:"max=500"`
	City     string `json:"city" binding:"max=100"`
	State    string `json:"state" binding:"max=100"`
	District string `json:"district" binding:"max=100"`
	Pincode  string `json:"pincode" binding:"omitempty,max=10"`
	Country  string `json:"country" binding:"max=100"`

	EmergencyContactName     string `json:"emergency_contact_name" binding:"max=150"`
	EmergencyContactRelation string `json:"emergency_contact_relation" binding:"max=50"`
	EmergencyContact         string `json:"emergency_contact" binding:"omitempty,max=15"`
	EmergencyContactAddress  string `json:"emergency_contact_address" binding:"max=500"`

	HeightCm          float64 `json:"height_cm" binding:"omitempty,gte=30,lte=250"`
	WeightKg          float64 `json:"weight_kg" binding:"omitempty,gte=1,lte=300"`
	BloodPressure     string  `json:"blood_pressure" binding:"max=20"`
	Pulse             string  `json:"pulse" binding:"max=20"`
	Sugar             string  `json:"sugar" binding:"max=20"`
	Allergies         string  `json:"allergies"`
	ChronicDiseases   string  `json:"chronic_diseases"`
	CurrentMedication string  `json:"current_medication"`

	RegistrationType string `json:"registration_type" binding:"omitempty,oneof=WALK_IN ONLINE REFERRAL"`
	ReferredBy       string `json:"referred_by" binding:"max=150"`
	Branch           string `json:"branch" binding:"max=100"`
	Remarks          string `json:"remarks"`

	IsActive *bool `json:"is_active" binding:"required"`
}

// PatientResponse is the public shape of a patient record.
type PatientResponse struct {
	ID   string `json:"id"`
	UHID string `json:"uhid"`

	FullName string `json:"full_name"`
	Gender   string `json:"gender"`
	DOB      string `json:"dob,omitempty"`
	Age      int    `json:"age"`

	Mobile          string `json:"mobile"`
	AlternateMobile string `json:"alternate_mobile"`
	Email           string `json:"email"`
	BloodGroup      string `json:"blood_group"`
	MaritalStatus   string `json:"marital_status"`
	Occupation      string `json:"occupation"`
	PhotoURL        string `json:"photo_url"`

	Address  string `json:"address"`
	City     string `json:"city"`
	State    string `json:"state"`
	District string `json:"district"`
	Pincode  string `json:"pincode"`
	Country  string `json:"country"`

	EmergencyContactName     string `json:"emergency_contact_name"`
	EmergencyContactRelation string `json:"emergency_contact_relation"`
	EmergencyContact         string `json:"emergency_contact"`
	EmergencyContactAddress  string `json:"emergency_contact_address"`

	HeightCm          float64 `json:"height_cm"`
	WeightKg          float64 `json:"weight_kg"`
	BMI               float64 `json:"bmi"`
	BloodPressure     string  `json:"blood_pressure"`
	Pulse             string  `json:"pulse"`
	Sugar             string  `json:"sugar"`
	Allergies         string  `json:"allergies"`
	ChronicDiseases   string  `json:"chronic_diseases"`
	CurrentMedication string  `json:"current_medication"`

	RegistrationType string `json:"registration_type"`
	ReferredBy       string `json:"referred_by"`
	Branch           string `json:"branch"`
	Remarks          string `json:"remarks"`

	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

// DuplicateMobileResponse is returned (HTTP 409) when Force=false and one
// or more existing patients already share the given mobile number.
type DuplicateMobileResponse struct {
	Message          string            `json:"message"`
	ExistingPatients []PatientResponse `json:"existing_patients"`
}
