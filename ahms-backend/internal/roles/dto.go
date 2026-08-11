// Package roles implements role and permission management: listing the
// role catalog (with their assigned permissions) and adjusting the
// permission set of a role. It is the only module that can change what
// staff can do, so its writes are gated behind the role.manage permission
// (seeded exclusively to SUPER_ADMIN).
package roles

// RoleResponse is the public shape of a role with its permission set.
type RoleResponse struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	DisplayName string          `json:"display_name"`
	Description string          `json:"description"`
	Permissions []PermissionRef `json:"permissions"`
}

// PermissionRef is a lightweight permission entry inside a role.
type PermissionRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// PermissionResponse is the full permission catalog entry used on the
// roles editing screen.
type PermissionResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Selected    bool   `json:"selected,omitempty"`
}

// UpdateRolePermissionsRequest lists the permission names that the role
// should hold after the update (replaces the whole set).
type UpdateRolePermissionsRequest struct {
	Permissions []string `json:"permissions" binding:"required,dive,required"`
}
