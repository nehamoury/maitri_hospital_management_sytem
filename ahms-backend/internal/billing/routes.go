package billing

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts billing endpoints. Creating bills and recording
// payments requires billing.create; viewing requires billing.view.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/bills")
	group.Use(authMW.RequireAuth())
	{
		group.POST("", permMW.RequirePermission(models.PermBillingCreate), handler.CreateBill)
		group.GET("", permMW.RequirePermission(models.PermBillingView), handler.ListBills)
		group.GET("/number/:bill_no", permMW.RequirePermission(models.PermBillingView), handler.GetBillByNo)
		group.GET("/:id", permMW.RequirePermission(models.PermBillingView), handler.GetBill)
		group.POST("/:id/payments", permMW.RequirePermission(models.PermBillingPayment), handler.AddPayment)
	}
}
