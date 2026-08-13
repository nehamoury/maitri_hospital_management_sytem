package reports

import (
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// Route permissions
const (
	PermReportsView   = models.PermReportsView
	PermReportsExport = models.PermReportsExport
)

// Middleware interfaces that the reports module expects
type AuthMiddleware interface {
	RequireAuth() gin.HandlerFunc
}

type PermissionMiddleware interface {
	RequirePermission(permissionName string) gin.HandlerFunc
}

// RegisterRoutes wires the reports endpoints into the provided router group.
func RegisterRoutes(router *gin.RouterGroup, handler *Handler, auth AuthMiddleware, perm PermissionMiddleware) {
	reports := router.Group("/reports")
	reports.Use(auth.RequireAuth())

	// Data viewing endpoints (require reports.view)
	viewReports := reports.Group("")
	viewReports.Use(perm.RequirePermission(PermReportsView))
	{
		viewReports.GET("/summary", handler.GetSummary)
		viewReports.GET("/department-distribution", handler.GetDepartmentDistribution)
		viewReports.GET("/revenue", handler.GetRevenue)
		viewReports.GET("/pharmacy-dispensing", handler.GetPharmacyDispensing)
		viewReports.GET("/pharmacy-stock", handler.GetPharmacyStock)
		viewReports.GET("/doctors", handler.GetDoctors)
		viewReports.GET("/patients", handler.GetPatients)
		viewReports.GET("/panchakarma", handler.GetPanchakarma)
		viewReports.GET("/referrals", handler.GetReferrals)
	}

	// Export endpoint (requires reports.export)
	reports.GET("/export", perm.RequirePermission(PermReportsExport), handler.Export)
}
