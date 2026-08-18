package diet

import (
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

const (
	permDietOrder  = models.PermDietOrder
	permDietManage = models.PermDietManage
	permDietServe  = models.PermDietServe
)

type AuthMiddleware interface {
	RequireAuth() gin.HandlerFunc
}

type PermissionMiddleware interface {
	RequirePermission(permissionName string) gin.HandlerFunc
}

func RegisterRoutes(
	router *gin.RouterGroup,
	handler *Handler,
	auth AuthMiddleware,
	perm PermissionMiddleware,
	scopeMW gin.HandlerFunc,
) {
	diet := router.Group("/diet")
	diet.Use(auth.RequireAuth(), scopeMW)

	// Active and List Plans are open for anyone with read access (we check authentication)
	diet.GET("/plans/active", handler.GetActiveDietPlan)
	diet.GET("/plans", handler.ListDietPlans)

	// Prescribing, editing & cancelling plans (requires diet.order)
	diet.POST("/plans", perm.RequirePermission(permDietOrder), handler.CreateDietPlan)
	diet.PUT("/plans/:id", perm.RequirePermission(permDietOrder), handler.UpdateDietPlan)
	diet.POST("/plans/:id/renew", perm.RequirePermission(permDietOrder), handler.RenewDietPlan)
	diet.PUT("/plans/:id/cancel", perm.RequirePermission(permDietOrder), handler.CancelDietPlan)

	// Diet template masters (diet.serve: read; diet.manage: write)
	diet.GET("/templates", perm.RequirePermission(permDietServe), handler.ListDietTemplates)
	diet.POST("/templates", perm.RequirePermission(permDietManage), handler.CreateDietTemplate)
	diet.PUT("/templates/:id", perm.RequirePermission(permDietManage), handler.UpdateDietTemplate)

	// Meal generation trigger (requires diet.manage)
	diet.POST("/generate-meals", perm.RequirePermission(permDietManage), handler.GenerateMeals)

	// Kitchen Operational sheet & delivery actions (requires diet.serve)
	diet.GET("/kitchen-sheet", perm.RequirePermission(permDietServe), handler.GetKitchenSheet)
	diet.PUT("/meals/:id/status", perm.RequirePermission(permDietServe), handler.UpdateMealStatus)
	diet.POST("/meals", perm.RequirePermission(permDietServe), handler.CreateManualMeal)
	diet.PUT("/meals/:id/cancel", perm.RequirePermission(permDietServe), handler.CancelMeal)
	diet.GET("/ward-list", perm.RequirePermission(permDietServe), handler.GetWardsForKitchen)
	diet.GET("/admissions", perm.RequirePermission(permDietServe), handler.GetKitchenAdmissions)
}
