package models

import "github.com/google/uuid"

// Doctor represents a doctor's professional record. Every Doctor has a
// linked User account (role=DOCTOR) so they can log in; the Doctor row
// holds the professional/clinical fields that don't belong on User.
type Doctor struct {
	BaseModel
	UserID uuid.UUID `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	User   User      `gorm:"foreignKey:UserID" json:"user,omitempty"`

	DepartmentID uuid.UUID  `gorm:"type:uuid;not null" json:"department_id"`
	Department   Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`

	Specialization  string  `gorm:"type:varchar(150);not null" json:"specialization"`
	Qualification   string  `gorm:"type:varchar(150)" json:"qualification"`
	ExperienceYears int     `gorm:"default:0" json:"experience_years"`
	ConsultationFee float64 `gorm:"type:decimal(10,2);default:0" json:"consultation_fee"`
	ImageUrl        string  `gorm:"type:varchar(500)" json:"image_url"`
	IsActive        bool    `gorm:"default:true" json:"is_active"`
}

func (Doctor) TableName() string {
	return "doctors"
}
