package middleware

import (
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DataScopeMiddleware resolves contextual authorization constraints like
// DoctorID for the logged-in user and injects a models.DataScope into
// the Gin context. This ensures the database is queried only once per request.
func DataScopeMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleNameVal, exists := c.Get("role_name")
		if !exists {
			c.Next()
			return
		}

		roleName := roleNameVal.(string)
		scope := &models.DataScope{
			Role: roleName,
		}

		if roleName == models.RoleDoctor || roleName == "PANCHAKARMA_DOCTOR" {
			userIDVal, exists := c.Get("user_id")
			if exists {
				userID, err := uuid.Parse(userIDVal.(string))
				if err == nil {
					var docID uuid.UUID
					err := db.Table("doctors").Where("user_id = ? AND deleted_at IS NULL", userID).Select("id").Scan(&docID).Error
					if err == nil && docID != uuid.Nil {
						scope.DoctorID = &docID
					}
				}
			}
		}

		c.Set("data_scope", scope)
		c.Next()
	}
}
