package referrals

import (
	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts referral endpoints. Creating requires
// referral.create (doctors); status updates require referral.update;
// viewing referrals requires referral.view.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware, scopeMW gin.HandlerFunc) {
	group := rg.Group("/referrals")
	group.Use(authMW.RequireAuth(), scopeMW)
	{
		group.POST("", permMW.RequirePermission(models.PermReferralCreate), handler.Create)
		group.GET("/incoming", permMW.RequirePermission(models.PermReferralView), handler.Incoming)
		group.GET("/:id", permMW.RequirePermission(models.PermReferralView), handler.Get)
		group.PATCH("/:id/status", permMW.RequirePermission(models.PermReferralUpdate), handler.UpdateStatus)
		group.POST("/:id/attachments", permMW.RequirePermission(models.PermReferralUpdate), handler.UploadAttachment)
		group.GET("/:id/attachments", permMW.RequirePermission(models.PermReferralView), handler.ListAttachments)
		group.GET("/:id/attachments/:attachmentId", permMW.RequirePermission(models.PermReferralView), handler.DownloadAttachment)
		group.DELETE("/:id/attachments/:attachmentId", permMW.RequirePermission(models.PermReferralUpdate), handler.DeleteAttachment)
	}
}
