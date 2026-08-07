package middleware

import (
	"net/http"
	"strings"

	"github.com/ahms/backend/internal/config"
	"github.com/gin-gonic/gin"
)

func SecurityHeaders(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate")

		if cfg.IsProduction() {
			c.Header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
			c.Header("Content-Security-Policy", "default-src 'self'")
		}

		c.Next()
	}
}

func BodySizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}

func SwaggerProtection(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.IsProduction() && strings.HasPrefix(c.Request.URL.Path, "/swagger") {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		c.Next()
	}
}
