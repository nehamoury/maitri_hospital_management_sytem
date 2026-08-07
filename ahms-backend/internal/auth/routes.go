package auth

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts every /auth/* endpoint on the given router group.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMiddleware *middleware.AuthMiddleware) {
	authGroup := rg.Group("/auth")
	{
		authGroup.POST("/login", handler.Login)
		authGroup.POST("/refresh", handler.Refresh)

		// Protected — requires a valid access token.
		authGroup.POST("/logout", authMiddleware.RequireAuth(), handler.Logout)
		authGroup.GET("/me", authMiddleware.RequireAuth(), handler.Me)
	}
}

// RegisterRoutesWithLimiter mounts every /auth/* endpoint with rate limiting on login/refresh.
func RegisterRoutesWithLimiter(rg *gin.RouterGroup, handler *Handler, authMiddleware *middleware.AuthMiddleware, loginLimiter *middleware.RateLimiter) {
	authGroup := rg.Group("/auth")
	{
		authGroup.POST("/login", loginLimiter.RateLimit(), handler.Login)
		authGroup.POST("/refresh", loginLimiter.RateLimit(), handler.Refresh)

		// Protected — requires a valid access token.
		authGroup.POST("/logout", authMiddleware.RequireAuth(), handler.Logout)
		authGroup.GET("/me", authMiddleware.RequireAuth(), handler.Me)
	}
}
