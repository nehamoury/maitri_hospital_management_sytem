package models

// DepartmentType enumerates the supported department classifications.
// A department carries a single primary type.
const (
	DepartmentTypeOPD        = "OPD"
	DepartmentTypeProcedure  = "Procedure"
	DepartmentTypeWellness   = "Wellness"
	DepartmentTypeClinical   = "Clinical"
	DepartmentTypePharmacy   = "Pharmacy"
	DepartmentTypeEmergency  = "Emergency"
)

// ValidDepartmentTypes is the allow-list used for request validation.
var ValidDepartmentTypes = map[string]bool{
	DepartmentTypeOPD:       true,
	DepartmentTypeProcedure: true,
	DepartmentTypeWellness:  true,
	DepartmentTypeClinical:  true,
	DepartmentTypePharmacy:  true,
	DepartmentTypeEmergency: true,
}

// Department represents a hospital department (e.g. Panchakarma,
// Kayachikitsa, Shalya Tantra). Code/Type/DefaultFee form the Department
// Master; IsActive is the Status.
type Department struct {
	BaseModel
	Code        string  `gorm:"type:varchar(20);uniqueIndex" json:"code"`
	Name        string  `gorm:"type:varchar(150);uniqueIndex;not null" json:"name"`
	Type        string  `gorm:"type:varchar(30);not null;default:'OPD'" json:"type"`
	Description string  `gorm:"type:text" json:"description"`
	DefaultFee  float64 `gorm:"type:numeric(10,2);default:0" json:"default_fee"`
	IsActive    bool    `gorm:"default:true" json:"is_active"`
}

func (Department) TableName() string {
	return "departments"
}
