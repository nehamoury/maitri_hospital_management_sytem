package audit

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts audit-log query endpoints. Requires audit.view
// (restricted to admin roles).
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/audit-logs")
	group.Use(authMW.RequireAuth())
	{
		group.GET("", permMW.RequirePermission(models.PermAuditView), handler.List)
	}
}
