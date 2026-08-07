package treatments

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts the treatment engine endpoints. Plan lifecycle
// operations require treatment.create/update/approve/complete; session
// execution requires treatment.session; viewing requires treatment.view.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("")
	group.Use(authMW.RequireAuth())
	{
		// Reference data
		group.GET("/procedure-types", permMW.RequirePermission(models.PermTreatmentView), handler.ProcedureTypes)
		group.GET("/therapists", permMW.RequirePermission(models.PermTreatmentView), handler.Therapists)

		// Plans
		group.POST("/treatment-plans", permMW.RequirePermission(models.PermTreatmentCreate), handler.Create)
		group.GET("/treatment-plans", permMW.RequirePermission(models.PermTreatmentView), handler.List)
		group.GET("/treatment-plans/:id", permMW.RequirePermission(models.PermTreatmentView), handler.Get)
		group.PATCH("/treatment-plans/:id", permMW.RequirePermission(models.PermTreatmentUpdate), handler.Update)
		group.POST("/treatment-plans/:id/approve", permMW.RequirePermission(models.PermTreatmentApprove), handler.Approve)
		group.POST("/treatment-plans/:id/cancel", permMW.RequirePermission(models.PermTreatmentUpdate), handler.Cancel)
		group.POST("/treatment-plans/:id/complete", permMW.RequirePermission(models.PermTreatmentComplete), handler.Complete)

		// Sessions
		group.GET("/treatment-sessions/today", permMW.RequirePermission(models.PermTreatmentSession), handler.TodaySessions)
		group.POST("/treatment-sessions/:id/start", permMW.RequirePermission(models.PermTreatmentSession), handler.StartSession)
		group.POST("/treatment-sessions/:id/complete", permMW.RequirePermission(models.PermTreatmentSession), handler.CompleteSession)
		group.POST("/treatment-sessions/:id/skip", permMW.RequirePermission(models.PermTreatmentSession), handler.SkipSession)
	}
}
