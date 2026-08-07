// Package utils contains small, dependency-light helpers shared across
// every feature module: HTTP response shaping, password hashing, and JWT
// issuing/parsing.
package utils

import "github.com/gin-gonic/gin"

// APIResponse is the single envelope shape returned by every AHMS
// endpoint, so frontend clients can rely on one parsing path.
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Success writes a 2xx JSON response with the given HTTP status, message
// and payload.
func Success(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(status, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Fail writes an error JSON response with the given HTTP status and
// error message.
func Fail(c *gin.Context, status int, errMsg string) {
	c.JSON(status, APIResponse{
		Success: false,
		Error:   errMsg,
	})
}
