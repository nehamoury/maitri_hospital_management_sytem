package models

import "github.com/google/uuid"

// DietTemplate is a reusable Ayurvedic diet master that a prescriber can
// prefill a DietPlan from (diet_type + pathya + apathya + notes). Templates
// are curated diet masters, managed by roles holding diet.manage and read
// by kitchen (diet.serve) and prescribers (diet.order).
type DietTemplate struct {
	BaseModel
	Name                string `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Pathya              string `gorm:"type:text" json:"pathya"`              // Recommended foods/do's
	Apathya             string `gorm:"type:text" json:"apathya"`             // Restricted foods/dont's
	SpecialInstructions string `gorm:"type:text" json:"special_instructions"`
	IsActive            bool   `gorm:"default:true;index" json:"is_active"`

	CreatedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_user_id"`
	CreatedByUser   User      `gorm:"foreignKey:CreatedByUserID" json:"created_by_user,omitempty"`
}

func (DietTemplate) TableName() string { return "diet_templates" }