package public

import "github.com/gin-gonic/gin"

// RegisterRoutes mounts the unauthenticated /public/* website feeds.
// These are read-only and intentionally expose no sensitive fields.
func RegisterRoutes(group *gin.RouterGroup, h *Handler) {
	group.GET("/doctors", h.Doctors)
	group.GET("/doctors/:id/status", h.DoctorStatus)
	group.GET("/departments", h.Departments)
	group.GET("/procedure-types", h.ProcedureTypes)
}
