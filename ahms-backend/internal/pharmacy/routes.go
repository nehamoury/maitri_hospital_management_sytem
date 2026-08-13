package pharmacy

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts pharmacy endpoints. Medicine master + stock
// adjustments require inventory.manage (pharmacists); dispensing against a
// prescription requires pharmacy.dispense.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	group := rg.Group("/medicines")
	group.Use(authMW.RequireAuth(), scopeMW)
	{
		group.POST("", permMW.RequirePermission(models.PermPharmacyStock), handler.CreateMedicine)
		group.GET("", permMW.RequirePermission(models.PermPharmacyView), handler.ListMedicines)
		group.GET("/:id", permMW.RequirePermission(models.PermPharmacyView), handler.GetMedicine)
		group.PUT("/:id", permMW.RequirePermission(models.PermPharmacyStock), handler.UpdateMedicine)
		group.POST("/:id/stock", permMW.RequirePermission(models.PermPharmacyStock), handler.AdjustStock)
		group.POST("/:id/return", permMW.RequirePermission(models.PermPharmacyStock), handler.ReturnStock)
		group.GET("/:id/transactions", permMW.RequirePermission(models.PermPharmacyView), handler.ListTransactions)
	}

	rx := rg.Group("/prescriptions")
	rx.Use(authMW.RequireAuth(), scopeMW)
	{
		rx.POST("/:id/dispense", permMW.RequirePermission(models.PermPharmacyDispense), handler.Dispense)
	}
}
