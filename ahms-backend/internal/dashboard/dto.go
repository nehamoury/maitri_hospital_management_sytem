// Package dashboard aggregates read-only summary data for the landing
// dashboard screen: today's patients, today's appointments, recent
// registrations, and department count.
package dashboard

// RecentPatient is a compact patient shape for the "recent
// registrations" dashboard widget.
type RecentPatient struct {
	ID        string `json:"id"`
	UHID      string `json:"uhid"`
	FullName  string `json:"full_name"`
	Mobile    string `json:"mobile"`
	CreatedAt string `json:"created_at"`
}

// TodayAppointment is a compact appointment shape for the "today's
// appointments" dashboard widget.
type TodayAppointment struct {
	ID          string `json:"id"`
	PatientName string `json:"patient_name"`
	DoctorName  string `json:"doctor_name"`
	TokenNumber int    `json:"token_number"`
	Status      string `json:"status"`
}

// SummaryResponse is the payload returned by GET /api/v1/dashboard.
type SummaryResponse struct {
	TodaysPatientsCount     int64              `json:"todays_patients_count"`
	TodaysAppointmentsCount int64              `json:"todays_appointments_count"`
	DepartmentCount         int64              `json:"department_count"`
	ActiveDoctorsCount      int64              `json:"active_doctors_count"`
	RecentRegistrations     []RecentPatient    `json:"recent_registrations"`
	TodaysAppointments      []TodayAppointment `json:"todays_appointments"`
}
