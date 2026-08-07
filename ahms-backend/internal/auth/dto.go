// Package auth implements login, logout, and JWT-based session issuance.
package auth

// LoginRequest is the payload for POST /api/v1/auth/login.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// RefreshRequest is the payload for POST /api/v1/auth/refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// UserResponse is the safe, public-facing shape of a user returned by
// auth endpoints (never includes the password hash).
type UserResponse struct {
	ID          string   `json:"id"`
	FullName    string   `json:"full_name"`
	Email       string   `json:"email"`
	Mobile      string   `json:"mobile"`
	RoleName    string   `json:"role_name"`
	Permissions []string `json:"permissions"`
}

// LoginResponse is returned on successful login/refresh.
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int          `json:"expires_in_seconds"`
	User         UserResponse `json:"user"`
}
