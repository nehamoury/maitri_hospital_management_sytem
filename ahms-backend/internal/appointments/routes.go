package appointments

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts every /appointments/* endpoint. Booking is
// restricted to front-desk roles via patient.create; status updates via
// appointment.update (front desk + doctors); reads via appointment.view.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	group := rg.Group("/appointments")
	group.Use(authMW.RequireAuth())
	group.Use(scopeMW)
	{
		group.GET("", permMW.RequirePermission(models.PermAppointmentView), handler.List)
		group.GET("/:id", permMW.RequirePermission(models.PermAppointmentView), handler.Get)

		group.POST("", permMW.RequirePermission(models.PermAppointmentCreate), handler.Create)
		group.PUT("/:id/status", permMW.RequirePermission(models.PermAppointmentUpdate), handler.UpdateStatus)
	}
}
