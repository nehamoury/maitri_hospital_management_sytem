package ipd

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts every IPD endpoint. Ward/bed master routes require
// ward permissions; admissions require the admission permission set; the
// clinical chart (notes/orders/diet) is guarded per action.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	wardGroup := rg.Group("/wards")
	wardGroup.Use(authMW.RequireAuth())
	{
		wardGroup.GET("", permMW.RequirePermission(models.PermWardView), handler.ListWards)
		wardGroup.GET("/occupancy", permMW.RequirePermission(models.PermWardView), handler.WardOccupancy)
		wardGroup.GET("/:id", permMW.RequirePermission(models.PermWardView), handler.GetWard)
		wardGroup.POST("", permMW.RequirePermission(models.PermWardManage), handler.CreateWard)
		wardGroup.PUT("/:id", permMW.RequirePermission(models.PermWardManage), handler.UpdateWard)
	}

	bedGroup := rg.Group("/beds")
	bedGroup.Use(authMW.RequireAuth())
	{
		bedGroup.GET("", permMW.RequirePermission(models.PermWardView), handler.ListBeds)
		bedGroup.POST("", permMW.RequirePermission(models.PermWardManage), handler.CreateBed)
		bedGroup.PUT("/:id", permMW.RequirePermission(models.PermWardManage), handler.UpdateBed)
		bedGroup.PUT("/:id/status", permMW.RequirePermission(models.PermWardManage), handler.SetBedStatus)
	}

	admGroup := rg.Group("/admissions")
	admGroup.Use(authMW.RequireAuth())
	{
		admGroup.GET("", permMW.RequirePermission(models.PermAdmissionView), handler.ListAdmissions)
		admGroup.POST("", permMW.RequirePermission(models.PermAdmissionCreate), handler.Admit)
		admGroup.GET("/:id", permMW.RequirePermission(models.PermAdmissionView), handler.GetAdmission)
		admGroup.PUT("/:id", permMW.RequirePermission(models.PermAdmissionUpdate), handler.UpdateAdmission)
		admGroup.POST("/:id/transfer", permMW.RequirePermission(models.PermAdmissionUpdate), handler.TransferBed)
		admGroup.POST("/:id/notes", permMW.RequirePermission(models.PermNoteCreate), handler.AddNote)
		admGroup.POST("/:id/orders", permMW.RequirePermission(models.PermNoteCreate), handler.AddOrder)
		admGroup.PUT("/:id/orders/:oid/status", permMW.RequirePermission(models.PermNoteCreate), handler.UpdateOrderStatus)
		admGroup.POST("/:id/diet", permMW.RequirePermission(models.PermDietCreate), handler.AddDiet)
		admGroup.POST("/:id/discharge", permMW.RequirePermission(models.PermAdmissionDischarge), handler.Discharge)
	}
}