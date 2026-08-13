package consultations

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts consultation endpoints. Creating/updating a
// consultation is restricted to clinical roles via permission checks.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	group := rg.Group("")
	group.Use(authMW.RequireAuth())
	group.Use(scopeMW)
	{
		group.GET("/encounters/:id/consultation", permMW.RequirePermission(models.PermClinicalView), handler.GetByEncounter)
		group.POST("/encounters/:id/consultation", permMW.RequirePermission(models.PermConsultationCreate), handler.Create)
		group.PUT("/consultations/:id", permMW.RequirePermission(models.PermConsultationUpdate), handler.Update)
	}
}
