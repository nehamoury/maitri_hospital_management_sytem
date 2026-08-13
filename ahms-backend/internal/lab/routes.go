package lab

import (
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// Local aliases for cleaner route registration.
const (
	permLabView    = models.PermLabView
	permLabOrder   = models.PermLabOrder
	permLabCollect = models.PermLabCollect
	permLabResult  = models.PermLabResult
	permLabVerify  = models.PermLabVerify
	permLabReview  = models.PermLabReview
	permLabManage  = models.PermLabManage
)

// AuthMiddleware interface that the lab module expects.
type AuthMiddleware interface {
	RequireAuth() gin.HandlerFunc
}

// PermissionMiddleware interface that the lab module expects.
type PermissionMiddleware interface {
	RequirePermission(permissionName string) gin.HandlerFunc
}

// RegisterRoutes wires lab endpoints into the provided router group.
func RegisterRoutes(
	router *gin.RouterGroup,
	handler *Handler,
	auth AuthMiddleware,
	perm PermissionMiddleware,
) {
	lab := router.Group("/lab")
	lab.Use(auth.RequireAuth())

	// ── View (lab.view) ──────────────────────────────────────────────────────
	view := lab.Group("")
	view.Use(perm.RequirePermission(permLabView))
	{
		view.GET("/categories", handler.ListCategories)
		view.GET("/tests", handler.ListTests)
		view.GET("/orders", handler.ListOrders)
		view.GET("/orders/:id", handler.GetOrder)
		view.GET("/orders/:id/report", handler.PrintReport)
	}

	// ── Order (lab.order) ────────────────────────────────────────────────────
	lab.POST("/orders", perm.RequirePermission(permLabOrder), handler.CreateOrder)
	lab.PUT("/orders/:id/cancel", perm.RequirePermission(permLabOrder), handler.CancelOrder)

	// ── Sample collection (lab.collect) ─────────────────────────────────────
	lab.PUT("/orders/:id/collect", perm.RequirePermission(permLabCollect), handler.CollectSample)
	lab.PUT("/orders/:id/process", perm.RequirePermission(permLabCollect), handler.MarkProcessing)

	// ── Result entry (lab.result) ────────────────────────────────────────────
	lab.PUT("/orders/:id/result", perm.RequirePermission(permLabResult), handler.EnterResults)

	// ── Verify (lab.verify) ──────────────────────────────────────────────────
	lab.PUT("/orders/:id/verify", perm.RequirePermission(permLabVerify), handler.VerifyResults)

	// ── Doctor review (lab.review) ───────────────────────────────────────────
	lab.PUT("/orders/:id/review", perm.RequirePermission(permLabReview), handler.DoctorReview)

	// ── Test Master management (lab.manage) ──────────────────────────────────
	manage := lab.Group("")
	manage.Use(perm.RequirePermission(permLabManage))
	{
		manage.POST("/categories", handler.CreateCategory)
		manage.PUT("/categories/:id", handler.UpdateCategory)
		manage.POST("/tests", handler.CreateTest)
		manage.PUT("/tests/:id", handler.UpdateTest)
	}

	// ── Patient timeline (registered on /patients/:id/lab-orders) ────────────
	router.GET("/patients/:id/lab-orders",
		auth.RequireAuth(),
		perm.RequirePermission(permLabView),
		handler.PatientOrders,
	)
}
