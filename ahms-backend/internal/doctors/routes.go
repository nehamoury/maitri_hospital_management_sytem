package doctors

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts every /doctors/* endpoint. Reads are open to any
// authenticated role; writes require the doctor.manage permission.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/doctors")
	group.Use(authMW.RequireAuth())
	{
		group.GET("", handler.List)
		group.GET("/:id", handler.Get)

		group.POST("", permMW.RequirePermission(models.PermDoctorCreate), handler.Create)
		group.PUT("/:id", permMW.RequirePermission(models.PermDoctorUpdate), handler.Update)
		group.DELETE("/:id", permMW.RequirePermission(models.PermDoctorDelete), handler.Delete)
	}
}
