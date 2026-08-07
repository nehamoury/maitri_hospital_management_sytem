package models

import (
	"time"

	"github.com/google/uuid"
)

// Appointment statuses.
const (
	AppointmentScheduled = "SCHEDULED"
	AppointmentCompleted = "COMPLETED"
	AppointmentCancelled = "CANCELLED"
)

// Appointment represents a booked consultation slot. TokenNumber is a
// sequential number scoped to (DoctorID, AppointmentDate) — the first
// patient booked with a doctor on a given day gets token 1, the next
// gets token 2, and so on, which is how Indian OPDs display queue order.
type Appointment struct {
	BaseModel
	PatientID uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
	Patient   Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	DoctorID uuid.UUID `gorm:"type:uuid;not null;index" json:"doctor_id"`
	Doctor   Doctor    `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`

	AppointmentDate time.Time `gorm:"type:date;not null;index" json:"appointment_date"`
	TokenNumber     int       `gorm:"not null" json:"token_number"`
	Status          string    `gorm:"type:varchar(20);not null;default:'SCHEDULED'" json:"status"`
	Reason          string    `gorm:"type:text" json:"reason"`

	BookedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"booked_by_user_id"`
	BookedBy       User      `gorm:"foreignKey:BookedByUserID" json:"booked_by,omitempty"`
}

func (Appointment) TableName() string {
	return "appointments"
}
