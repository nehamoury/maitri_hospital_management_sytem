package encounters

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes wires the endpoints to the router.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMiddleware *middleware.AuthMiddleware, permMiddleware *middleware.PermissionMiddleware, scopeMiddleware gin.HandlerFunc) {
	group := rg.Group("/encounters")
	group.Use(authMiddleware.RequireAuth())
	group.Use(scopeMiddleware)
	{
		group.GET("", permMiddleware.RequirePermission(models.PermClinicalView), handler.List)
		group.GET("/:id", permMiddleware.RequirePermission(models.PermClinicalView), handler.Get)

		group.POST("", permMiddleware.RequirePermission(models.PermEncounterCreate), handler.Create)
		group.PATCH("/:id/status", permMiddleware.RequirePermission(models.PermEncounterUpdate), handler.UpdateStatus)
	}
}
