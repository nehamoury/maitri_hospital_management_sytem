package patientdocs

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts the patient-document endpoints. Uploading and
// deleting require patient.update; listing and downloading require
// patient.view.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	group := rg.Group("/patients/:id/documents")
	group.Use(authMW.RequireAuth())
	group.Use(scopeMW)
	{
		group.GET("", permMW.RequirePermission(models.PermPatientView), handler.List)
		group.POST("", permMW.RequirePermission(models.PermPatientUpdate), handler.Upload)
		group.GET("/:documentId", permMW.RequirePermission(models.PermPatientView), handler.Download)
		group.DELETE("/:documentId", permMW.RequirePermission(models.PermPatientUpdate), handler.Delete)
	}
}
