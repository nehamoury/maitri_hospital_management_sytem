package roles

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts the role-management endpoints. Reading the role
// catalog is open to any authenticated role holding user.view (staff
// screens need to render the role dropdown); mutating a role's permission
// set and reading the permission catalog require the role.manage
// permission (seeded exclusively to SUPER_ADMIN).
//
// The permission catalog lives at a top-level /permissions route (not
// under /roles) because Gin's router rejects mixing a static segment with
// a parameter segment on the same node.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/roles")
	group.Use(authMW.RequireAuth())
	{
		group.GET("", permMW.RequirePermission(models.PermUserView), handler.List)
		group.PUT("/:id/permissions", permMW.RequirePermission(models.PermRoleManage), handler.UpdatePermissions)
	}

	rg.GET("/permissions", authMW.RequireAuth(), permMW.RequirePermission(models.PermRoleManage), handler.Permissions)
}
