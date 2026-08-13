// Package middleware contains Gin middleware shared across all feature
// modules: JWT authentication, role-based authorization, and CORS.
package middleware

import (
	"net/http"
	"strings"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT access tokens on protected routes.
type AuthMiddleware struct {
	jwtManager *utils.JWTManager
	blacklist  *TokenBlacklist
}

// NewAuthMiddleware builds an AuthMiddleware.
func NewAuthMiddleware(jwtManager *utils.JWTManager, blacklist *TokenBlacklist) *AuthMiddleware {
	return &AuthMiddleware{jwtManager: jwtManager, blacklist: blacklist}
}

// RequireAuth parses the "Authorization: Bearer <token>" header, verifies
// it is a valid, non-expired access token, and stores the user's id,
// email, and role name on the Gin context for downstream handlers.
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			utils.Fail(c, http.StatusUnauthorized, "missing Authorization header")
			c.Abort()
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			utils.Fail(c, http.StatusUnauthorized, "Authorization header must be in the form: Bearer <token>")
			c.Abort()
			return
		}

		claims, err := m.jwtManager.Parse(parts[1])
		if err != nil {
			utils.Fail(c, http.StatusUnauthorized, "invalid or expired token")
			c.Abort()
			return
		}
		if claims.TokenType != "access" {
			utils.Fail(c, http.StatusUnauthorized, "refresh tokens cannot be used to access this resource")
			c.Abort()
			return
		}
		if m.blacklist.IsBlacklisted(parts[1]) {
			utils.Fail(c, http.StatusUnauthorized, "token has been revoked")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID.String())
		c.Set("email", claims.Email)
		c.Set("role_name", claims.RoleName)

		c.Next()
	}
}

// RequireRoles authorizes only the given role names. Must be used after
// RequireAuth() in the middleware chain.
func RequireRoles(allowedRoles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedRoles))
	for _, r := range allowedRoles {
		allowed[r] = struct{}{}
	}

	return func(c *gin.Context) {
		roleName, exists := c.Get("role_name")
		if !exists {
			utils.Fail(c, http.StatusForbidden, "role information missing from request context")
			c.Abort()
			return
		}
		if _, ok := allowed[roleName.(string)]; !ok {
			utils.Fail(c, http.StatusForbidden, "you do not have permission to perform this action")
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireStaff blocks patient-role tokens from the generic staff API. It
// must run after RequireAuth() on every group a patient must not reach.
// Public routes (no token) carry no role_name and pass through untouched,
// so this is safe on groups that also mount public endpoints.
func RequireStaff() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role_name")
		if !exists {
			c.Next()
			return
		}
		if roleVal.(string) == models.RolePatient {
			utils.Fail(c, http.StatusForbidden, "patient accounts cannot access staff endpoints")
			c.Abort()
			return
		}
		c.Next()
	}
}
