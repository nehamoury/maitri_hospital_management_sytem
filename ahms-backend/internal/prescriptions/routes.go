package prescriptions

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts prescription endpoints. Writing requires
// prescription.create (doctors); status updates require pharmacy.dispense
// (pharmacist marks dispensing progress); reads require prescription.view.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	group := rg.Group("")
	group.Use(authMW.RequireAuth())
	group.Use(scopeMW)
	{
		group.GET("/encounters/:id/prescriptions", permMW.RequirePermission(models.PermPrescriptionView), handler.GetByEncounter)
		group.POST("/encounters/:id/prescriptions", permMW.RequirePermission(models.PermPrescriptionCreate), handler.Create)

		group.GET("/prescriptions", permMW.RequirePermission(models.PermPharmacyDispense), handler.List)
		group.GET("/prescriptions/:id", permMW.RequirePermission(models.PermPrescriptionView), handler.Get)
		group.GET("/prescriptions/:id/print", permMW.RequirePermission(models.PermPrescriptionPrint), handler.Print)
		group.PATCH("/prescriptions/:id/status", permMW.RequirePermission(models.PermPharmacyDispense), handler.UpdateStatus)
	}
}
