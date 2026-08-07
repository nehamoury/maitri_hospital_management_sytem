// Package uploads handles HTTP file uploads for AHMS (patient photos and,
// in future, documents). Files are stored under a local directory and
// served back via the /uploads static route. Only small images are
// accepted and every file is written to disk with a random UUID filename —
// the client's original filename is never used.
package uploads

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/ahms/backend/internal/middleware"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler serves the upload endpoints.
type Handler struct {
	dir      string
	maxBytes int64
}

// NewHandler builds an uploads Handler rooted at dir (e.g. "uploads").
func NewHandler(dir string) *Handler {
	return &Handler{dir: dir, maxBytes: 2 << 20} // 2 MB
}

// mimeExt maps allowed, detected image MIME types to file extensions.
// Extension is derived from the detected content, never the original name.
var mimeExt = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// Photo godoc
// @Summary      Upload a patient photo
// @Description  Accepts a multipart field "file" (JPG/PNG/WEBP, max 2MB). Returns the stored /uploads URL. The photo is saved to the patient in a later registration/update call.
// @Tags         uploads
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        file formData file true "Image file"
// @Success      201 {object} utils.APIResponse
// @Failure      400 {object} utils.APIResponse
// @Failure      413 {object} utils.APIResponse
// @Router       /uploads/patient-photo [post]
func (h *Handler) Photo(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "file field 'file' required")
		return
	}
	defer file.Close()

	// Read bounded by maxBytes+1 so we can reject anything larger than the cap.
	buf, err := io.ReadAll(io.LimitReader(file, h.maxBytes+1))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "failed to read file")
		return
	}
	if int64(len(buf)) > h.maxBytes {
		utils.Fail(c, http.StatusRequestEntityTooLarge, "file exceeds 2 MB limit")
		return
	}
	if len(buf) == 0 {
		utils.Fail(c, http.StatusBadRequest, "empty file")
		return
	}

	contentType := http.DetectContentType(buf)
	ext, ok := mimeExt[contentType]
	if !ok {
		utils.Fail(c, http.StatusBadRequest, "only JPG, PNG, or WEBP images are allowed")
		return
	}

	subdir := filepath.Join(h.dir, "patients")
	if err := os.MkdirAll(subdir, 0o750); err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}

	// Random UUID filename — never trust the client's filename.
	name := uuid.NewString() + ext
	path := filepath.Join(subdir, name)
	if err := os.WriteFile(path, buf, 0o640); err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to store file")
		return
	}

	utils.Success(c, http.StatusCreated, "photo uploaded", gin.H{
		"photo_url": "/uploads/patients/" + name,
	})
}

// RegisterRoutes mounts the upload endpoints guarded by auth + permission.
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler, authMW *middleware.AuthMiddleware, permMW *middleware.PermissionMiddleware) {
	group := rg.Group("/upload")
	group.Use(authMW.RequireAuth())
	{
		// Only users who can register a patient may upload a patient photo.
		group.POST("/patient-photo", permMW.RequirePermission(models.PermPatientCreate), handler.Photo)
	}
}

// EnsureTrimmed returns "uploads" if dir is empty.
func TrimOrDefault(dir string) string {
	trimmed := strings.TrimSpace(dir)
	if trimmed == "" {
		return "uploads"
	}
	return trimmed
}