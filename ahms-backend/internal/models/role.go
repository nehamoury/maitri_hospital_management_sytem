package models

// Role name constants. These are the system roles. They are stored
// as rows in the `roles` table (seeded on startup) and referenced by
// users via RoleID, rather than hardcoded as an enum, so new roles can
// be added later without a schema migration.
const (
	RoleSuperAdmin        = "SUPER_ADMIN"
	RoleHospitalAdmin     = "HOSPITAL_ADMIN"
	RoleReceptionist      = "RECEPTIONIST"
	RoleDoctor            = "DOCTOR"
	RoleNurse             = "NURSE"
	RolePanchakarmaDoctor = "PANCHAKARMA_DOCTOR"
	RoleTherapist         = "THERAPIST"
	RolePharmacist        = "PHARMACIST"
	RoleBillingAccounts   = "BILLING_ACCOUNTS"
	RoleWardStaff         = "WARD_STAFF"
	RoleDietKitchen       = "DIET_KITCHEN"
	RoleLabStaff          = "LAB_STAFF"
	RolePatient           = "PATIENT"
)

// Role represents an access-control role assigned to users.
type Role struct {
	BaseModel
	Name        string `gorm:"type:varchar(50);uniqueIndex;not null" json:"name"`
	DisplayName string `gorm:"type:varchar(100);not null" json:"display_name"`
	Description string `gorm:"type:text" json:"description"`

	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
}

// TableName pins the table name explicitly so it never changes if the
// struct name changes.
func (Role) TableName() string {
	return "roles"
}
