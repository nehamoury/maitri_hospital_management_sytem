// Package departments implements CRUD for hospital departments.
package departments

// CreateDepartmentRequest is the payload for POST /api/v1/departments.
type CreateDepartmentRequest struct {
	Code        string  `json:"code" binding:"omitempty,max=20"`
	Name        string  `json:"name" binding:"required,min=2,max=150"`
	Type        string  `json:"type" binding:"required"`
	Description string  `json:"description" binding:"max=1000"`
	DefaultFee  float64 `json:"default_fee" binding:"min=0"`
}

// UpdateDepartmentRequest is the payload for PUT /api/v1/departments/{id}.
type UpdateDepartmentRequest struct {
	Code        string  `json:"code" binding:"omitempty,max=20"`
	Name        string  `json:"name" binding:"required,min=2,max=150"`
	Type        string  `json:"type" binding:"required"`
	Description string  `json:"description" binding:"max=1000"`
	DefaultFee  float64 `json:"default_fee" binding:"min=0"`
	IsActive    *bool   `json:"is_active" binding:"required"`
}

// DepartmentResponse is the public shape of a department.
type DepartmentResponse struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Description string  `json:"description"`
	DefaultFee  float64 `json:"default_fee"`
	IsActive    bool    `json:"is_active"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}
