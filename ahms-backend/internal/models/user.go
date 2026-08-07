package models

import "github.com/google/uuid"

// User represents an account that can log into AHMS. A user always has
// exactly one Role. Doctors also have a corresponding row in the
// `doctors` table (linked via Doctor.UserID) added in the doctors module.
type User struct {
	BaseModel
	FullName     string `gorm:"type:varchar(150);not null" json:"full_name"`
	Email        string `gorm:"type:varchar(150);uniqueIndex;not null" json:"email"`
	Mobile       string `gorm:"type:varchar(15);uniqueIndex;not null" json:"mobile"`
	PasswordHash string `gorm:"type:varchar(255);not null" json:"-"`
	IsActive     bool   `gorm:"default:true" json:"is_active"`

	RoleID uuid.UUID `gorm:"type:uuid;not null" json:"role_id"`
	Role   Role      `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

func (User) TableName() string {
	return "users"
}
