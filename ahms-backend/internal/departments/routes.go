package departments

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts every /departments/* endpoint. Reads are open to
// any authenticated role (receptionists/doctors need the list too);
// writes require the department.manage permission (Super/Hospital Admin).
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/departments")
	group.Use(authMW.RequireAuth())
	{
		group.GET("", handler.List)
		group.GET("/:id", handler.Get)

		group.POST("", permMW.RequirePermission(models.PermDepartmentCreate), handler.Create)
		group.PUT("/:id", permMW.RequirePermission(models.PermDepartmentUpdate), handler.Update)
		group.DELETE("/:id", permMW.RequirePermission(models.PermDepartmentDelete), handler.Delete)
	}
}
