package portal

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts the patient portal endpoints. Login is public;
// everything else requires a PATIENT-scoped token.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware) {
	rg.POST("/portal/login", handler.Login)

	group := rg.Group("/portal")
	group.Use(authMW.RequireAuth(), middleware.RequireRoles("PATIENT"))
	{
		group.GET("/profile", handler.Profile)
		group.GET("/appointments", handler.Appointments)
		group.POST("/appointments", handler.BookAppointment)
		group.GET("/prescriptions", handler.Prescriptions)
		group.GET("/bills", handler.Bills)
	}
}

// RegisterRoutesWithLimiter mounts patient portal endpoints with rate limiting on login.
func RegisterRoutesWithLimiter(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, loginLimiter *middleware.RateLimiter) {
	rg.POST("/portal/login", loginLimiter.RateLimit(), handler.Login)

	group := rg.Group("/portal")
	group.Use(authMW.RequireAuth(), middleware.RequireRoles("PATIENT"))
	{
		group.GET("/profile", handler.Profile)
		group.GET("/appointments", handler.Appointments)
		group.POST("/appointments", handler.BookAppointment)
		group.GET("/prescriptions", handler.Prescriptions)
		group.GET("/bills", handler.Bills)
	}
}
