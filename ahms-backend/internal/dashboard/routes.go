package dashboard

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts GET /dashboard.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMiddleware *middleware.AuthMiddleware, permMiddleware *middleware.PermissionMiddleware, scopeMiddleware gin.HandlerFunc) {
	group := rg.Group("/dashboard")
	group.Use(authMiddleware.RequireAuth())
	group.Use(scopeMiddleware)

	group.GET("", permMiddleware.RequirePermission(models.PermDashboardView), handler.GetSummary)
}
