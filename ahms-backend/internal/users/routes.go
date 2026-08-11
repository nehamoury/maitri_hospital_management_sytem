package users

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts every /users/* endpoint. Reads are open to any
// authenticated role holding user.view; writes require the granular
// user.create/user.update/user.delete permissions (seeded to SUPER_ADMIN
// and HOSPITAL_ADMIN).
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/users")
	group.Use(authMW.RequireAuth())
	{
		group.GET("", permMW.RequirePermission(models.PermUserView), handler.List)
		group.GET("/:id", permMW.RequirePermission(models.PermUserView), handler.Get)
		group.POST("", permMW.RequirePermission(models.PermUserCreate), handler.Create)
		group.PUT("/:id", permMW.RequirePermission(models.PermUserUpdate), handler.Update)
		group.DELETE("/:id", permMW.RequirePermission(models.PermUserDelete), handler.Delete)
	}
}
