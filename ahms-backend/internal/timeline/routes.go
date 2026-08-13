package timeline

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts GET /patients/{id}/timeline. Access requires the
// clinical.view permission (doctors, nurses, pharmacists, admins).
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	group := rg.Group("/patients")
	group.Use(authMW.RequireAuth())
	group.Use(scopeMW)
	{
		group.GET("/:id/timeline", permMW.RequirePermission(models.PermClinicalView), handler.Get)
	}
}
