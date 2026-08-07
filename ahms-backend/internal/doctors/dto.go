// Package doctors implements CRUD for doctor records. Creating a doctor
// also provisions a linked login account (role=DOCTOR).
package doctors

// CreateDoctorRequest is the payload for POST /api/v1/doctors.
type CreateDoctorRequest struct {
	FullName        string  `json:"full_name" binding:"required,min=2,max=150"`
	Email           string  `json:"email" binding:"required,email"`
	Mobile          string  `json:"mobile" binding:"required,min=10,max=15"`
	Password        string  `json:"password" binding:"required,min=8"`
	DepartmentID    string  `json:"department_id" binding:"required,uuid"`
	Specialization  string  `json:"specialization" binding:"required,min=2,max=150"`
	Qualification   string  `json:"qualification" binding:"max=150"`
	ExperienceYears int     `json:"experience_years" binding:"gte=0"`
	ConsultationFee float64 `json:"consultation_fee" binding:"gte=0"`
}

// UpdateDoctorRequest is the payload for PUT /api/v1/doctors/{id}.
// Login credentials are not editable here — that belongs to a future
// account-management module.
type UpdateDoctorRequest struct {
	FullName        string  `json:"full_name" binding:"required,min=2,max=150"`
	Mobile          string  `json:"mobile" binding:"required,min=10,max=15"`
	DepartmentID    string  `json:"department_id" binding:"required,uuid"`
	Specialization  string  `json:"specialization" binding:"required,min=2,max=150"`
	Qualification   string  `json:"qualification" binding:"max=150"`
	ExperienceYears int     `json:"experience_years" binding:"gte=0"`
	ConsultationFee float64 `json:"consultation_fee" binding:"gte=0"`
	IsActive        *bool   `json:"is_active" binding:"required"`
}

// DoctorResponse is the public shape of a doctor record.
type DoctorResponse struct {
	ID              string  `json:"id"`
	FullName        string  `json:"full_name"`
	Email           string  `json:"email"`
	Mobile          string  `json:"mobile"`
	DepartmentID    string  `json:"department_id"`
	DepartmentName  string  `json:"department_name"`
	Specialization  string  `json:"specialization"`
	Qualification   string  `json:"qualification"`
	ExperienceYears int     `json:"experience_years"`
	ConsultationFee float64 `json:"consultation_fee"`
	IsActive        bool    `json:"is_active"`
	CreatedAt       string  `json:"created_at"`
}
