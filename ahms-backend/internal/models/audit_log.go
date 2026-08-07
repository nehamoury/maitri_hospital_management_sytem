package models

import "github.com/google/uuid"

// AuditLog is an immutable record of an important system action. For
// healthcare software every meaningful event — viewing a patient,
// creating a diagnosis, dispensing medicines, changing configuration —
// is stored here to support auditability. Clinical records must never be
// silently edited; corrections retain their history via these logs.
type AuditLog struct {
	BaseModel
	UserID     uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User       User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action     string    `gorm:"type:varchar(100);not null;index" json:"action"`
	EntityType string    `gorm:"type:varchar(100);not null;index" json:"entity_type"`
	EntityID   string    `gorm:"type:varchar(64);index" json:"entity_id"`

	OldValue JSONB `gorm:"type:jsonb" json:"old_value,omitempty"`
	NewValue JSONB `gorm:"type:jsonb" json:"new_value,omitempty"`

	IPAddress string `gorm:"type:varchar(64)" json:"ip_address"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}
