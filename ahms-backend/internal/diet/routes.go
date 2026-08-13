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
) {
	diet := router.Group("/diet")
	diet.Use(auth.RequireAuth())

	// Active and List Plans are open for anyone with read access (we check authentication)
	diet.GET("/plans/active", handler.GetActiveDietPlan)
	diet.GET("/plans", handler.ListDietPlans)

	// Prescribing & Canceling plans (requires diet.order)
	diet.POST("/plans", perm.RequirePermission(permDietOrder), handler.CreateDietPlan)
	diet.PUT("/plans/:id/cancel", perm.RequirePermission(permDietOrder), handler.CancelDietPlan)

	// Meal generation trigger (requires diet.manage)
	diet.POST("/generate-meals", perm.RequirePermission(permDietManage), handler.GenerateMeals)

	// Kitchen Operational sheet & delivery actions (requires diet.serve)
	diet.GET("/kitchen-sheet", perm.RequirePermission(permDietServe), handler.GetKitchenSheet)
	diet.PUT("/meals/:id/status", perm.RequirePermission(permDietServe), handler.UpdateMealStatus)
}
