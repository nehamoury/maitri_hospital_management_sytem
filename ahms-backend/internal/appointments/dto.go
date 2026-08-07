// Package appointments implements appointment booking with automatic,
// per-doctor-per-day token number generation.
package appointments

// CreateAppointmentRequest is the payload for POST /api/v1/appointments.
type CreateAppointmentRequest struct {
	PatientID       string `json:"patient_id" binding:"required,uuid"`
	DoctorID        string `json:"doctor_id" binding:"required,uuid"`
	AppointmentDate string `json:"appointment_date" binding:"required,datetime=2006-01-02"`
	Reason          string `json:"reason" binding:"max=500"`
}

// PublicAppointmentRequest is the payload for POST /api/v1/public/appointments.
type PublicAppointmentRequest struct {
	FullName        string `json:"full_name" binding:"required,max=200"`
	Mobile          string `json:"mobile" binding:"required,max=15"`
	Email           string `json:"email" binding:"max=200"`
	DoctorID        string `json:"doctor_id" binding:"required,uuid"`
	AppointmentDate string `json:"appointment_date" binding:"required,datetime=2006-01-02"`
	Reason          string `json:"reason" binding:"max=500"`
}

// UpdateAppointmentStatusRequest is the payload for
// PUT /api/v1/appointments/{id}/status.
type UpdateAppointmentStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=SCHEDULED COMPLETED CANCELLED"`
}

// AppointmentResponse is the public shape of an appointment.
type AppointmentResponse struct {
	ID              string `json:"id"`
	PatientID       string `json:"patient_id"`
	PatientName     string `json:"patient_name"`
	PatientUHID     string `json:"patient_uhid"`
	DoctorID        string `json:"doctor_id"`
	DoctorName      string `json:"doctor_name"`
	AppointmentDate string `json:"appointment_date"`
	TokenNumber     int    `json:"token_number"`
	Status          string `json:"status"`
	Reason          string `json:"reason"`
	CreatedAt       string `json:"created_at"`
}
