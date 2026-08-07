package middleware

import (
	"net/http"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PermissionMiddleware enforces action-based permissions (e.g.
// "patient.view", "prescription.create") loaded from the role_permissions
// join table. It must be used after RequireAuth in the middleware chain.
type PermissionMiddleware struct {
	db *gorm.DB
}

// NewPermissionMiddleware builds a PermissionMiddleware.
func NewPermissionMiddleware(db *gorm.DB) *PermissionMiddleware {
	return &PermissionMiddleware{db: db}
}

// RequirePermission returns a guard that permits the request only when
// the current user's role holds the named permission.
func (m *PermissionMiddleware) RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr, exists := c.Get("user_id")
		if !exists {
			utils.Fail(c, http.StatusUnauthorized, "authentication required")
			c.Abort()
			return
		}
		userID, err := uuid.Parse(userIDStr.(string))
		if err != nil {
			utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
			c.Abort()
			return
		}

		var user models.User
		if err := m.db.Preload("Role.Permissions").First(&user, "id = ?", userID).Error; err != nil {
			utils.Fail(c, http.StatusForbidden, "you do not have permission to perform this action")
			c.Abort()
			return
		}

		for _, p := range user.Role.Permissions {
			if p.Name == permission {
				c.Next()
				return
			}
		}
		utils.Fail(c, http.StatusForbidden, "you do not have permission to perform this action")
		c.Abort()
	}
}
