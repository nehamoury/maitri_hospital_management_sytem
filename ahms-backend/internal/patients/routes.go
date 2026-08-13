package patients

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts every /patients/* endpoint. Viewing requires
// patient.view; registration and edits require their respective
// permissions (front-desk roles).
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/patients")
	group.Use(authMW.RequireAuth())
	{
		group.GET("", permMW.RequirePermission(models.PermPatientView), handler.List)
		group.GET("/:id", permMW.RequirePermission(models.PermPatientView), handler.Get)
		group.GET("/:id/photo", permMW.RequirePermission(models.PermPatientView), handler.Photo)

		group.POST("", permMW.RequirePermission(models.PermPatientCreate), handler.Create)
		group.PUT("/:id", permMW.RequirePermission(models.PermPatientUpdate), handler.Update)
		group.DELETE("/:id", permMW.RequirePermission(models.PermPatientDelete), handler.Delete)
	}
}
