// Package users implements staff account CRUD. Unlike doctors (which
// provision a fixed DOCTOR login), this module creates and manages any
// staff user: receptionists, pharmacists, billing clerks, nurses,
// therapists, lab staff, admins — by choosing a role ID at creation time.
package users

// CreateUserRequest is the payload for POST /api/v1/users.
type CreateUserRequest struct {
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Email    string `json:"email" binding:"required,email"`
	Mobile   string `json:"mobile" binding:"required,min=10,max=15"`
	Password string `json:"password" binding:"required,min=8"`
	RoleID   string `json:"role_id" binding:"required,uuid"`
}

// UpdateUserRequest is the payload for PUT /api/v1/users/{id}.
// Password is optional; when provided it resets the login credential.
type UpdateUserRequest struct {
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Email    string `json:"email" binding:"required,email"`
	Mobile   string `json:"mobile" binding:"required,min=10,max=15"`
	RoleID   string `json:"role_id" binding:"required,uuid"`
	IsActive *bool  `json:"is_active" binding:"required"`
	Password string `json:"password" binding:"omitempty,min=8"`
}

// UserResponse is the public shape of a staff user. It never exposes the
// password hash or any audit metadata.
type UserResponse struct {
	ID              string `json:"id"`
	FullName        string `json:"full_name"`
	Email           string `json:"email"`
	Mobile          string `json:"mobile"`
	RoleID          string `json:"role_id"`
	RoleName        string `json:"role_name"`
	RoleDisplayName string `json:"role_display_name"`
	IsActive        bool   `json:"is_active"`
	CreatedAt       string `json:"created_at"`
}
