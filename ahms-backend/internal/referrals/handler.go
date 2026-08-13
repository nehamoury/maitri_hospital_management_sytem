package referrals

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// referralUploadDir is the storage subdirectory under the configured upload
// root where referral attachments are written.
const referralUploadDir = "referrals"

// referralMaxBytes caps a single referral attachment at 10 MB.
const referralMaxBytes int64 = 10 << 20

// referralMimeExt maps allowed, detected MIME types to file extensions.
var referralMimeExt = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"application/pdf": ".pdf",
}

// Handler wires HTTP requests to the referrals Service.
type Handler struct {
	service  Service
	audit    *audit.Recorder
	uploadDir string
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// SetAuditRecorder attaches the audit recorder used to log data changes.
func (h *Handler) SetAuditRecorder(r *audit.Recorder) { h.audit = r }

// SetUploadDir sets the base directory used to persist referral attachments.
func (h *Handler) SetUploadDir(dir string) { h.uploadDir = dir }

// Create godoc
// @Summary      Create an inter-department referral
// @Description  The referring doctor sends the patient to another department. A REF number is auto-generated.
// @Tags         referrals
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateReferralRequest true "Referral"
// @Success      201 {object} utils.APIResponse{data=ReferralResponse}
// @Router       /referrals [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreateReferralRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	userIDStr, _ := c.Get("user_id")
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}

	referral, err := h.service.Create(req, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "encounter, patient or department not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "referral created", toResponse(referral))
	if h.audit != nil {
		_ = h.audit.Log(c, "referral.create", "referral", referral.ID.String())
	}
}

// Incoming godoc
// @Summary      List incoming referrals for a department
// @Description  Dashboard for the receiving department. If department_id is omitted, the caller's own department is used.
// @Tags         referrals
// @Produce      json
// @Security     BearerAuth
// @Param        department_id query string false "Receiving department (defaults to caller's department)"
// @Success      200 {object} utils.APIResponse{data=[]ReferralItemResponse}
// @Router       /referrals/incoming [get]
func (h *Handler) Incoming(c *gin.Context) {
	userIDStr, _ := c.Get("user_id")
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}

	list, err := h.service.Incoming(c.Query("department_id"), userID)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	resp := make([]ReferralItemResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toItemResponse(&list[i]))
	}
	utils.Success(c, http.StatusOK, "incoming referrals fetched", resp)
}

// Get godoc
// @Summary      Get a referral with the source clinical history
// @Description  The receiving doctor sees the previous consultation, diagnosis, prescription and dispensing status.
// @Tags         referrals
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Referral ID"
// @Success      200 {object} utils.APIResponse{data=ReferralResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /referrals/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid referral id")
		return
	}
	referral, err := h.service.GetByID(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "referral not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch referral")
		return
	}
	utils.Success(c, http.StatusOK, "referral fetched", toResponse(referral))
}

// UpdateStatus godoc
// @Summary      Update a referral's status
// @Tags         referrals
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Referral ID"
// @Param        request body UpdateReferralStatusRequest true "New status"
// @Success      200 {object} utils.APIResponse{data=ReferralResponse}
// @Router       /referrals/{id}/status [patch]
func (h *Handler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid referral id")
		return
	}

	var req UpdateReferralStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	referral, err := h.service.UpdateStatus(id, req.Status)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "referral not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "referral status updated", toResponse(referral))
	if h.audit != nil {
		_ = h.audit.Log(c, "referral.update_status", "referral", id.String())
	}
}

// UploadAttachment godoc
// @Summary      Attach a file to a referral
// @Description  Accepts a multipart field "file" (JPG/PNG/WEBP/PDF, max 10 MB). Returns the stored attachment metadata.
// @Tags         referrals
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        id   path string true "Referral ID"
// @Param        file formData file true "Attachment file"
// @Success      201  {object} utils.APIResponse{data=AttachmentResponse}
// @Router       /referrals/{id}/attachments [post]
func (h *Handler) UploadAttachment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid referral id")
		return
	}
	if _, err := h.service.GetByID(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "referral not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to load referral")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "file field 'file' required")
		return
	}
	defer file.Close()

	buf, err := io.ReadAll(io.LimitReader(file, referralMaxBytes+1))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "failed to read file")
		return
	}
	if int64(len(buf)) > referralMaxBytes {
		utils.Fail(c, http.StatusRequestEntityTooLarge, "file exceeds 10 MB limit")
		return
	}
	if len(buf) == 0 {
		utils.Fail(c, http.StatusBadRequest, "empty file")
		return
	}

	contentType := http.DetectContentType(buf)
	ext, ok := referralMimeExt[contentType]
	if !ok {
		utils.Fail(c, http.StatusBadRequest, "only JPG, PNG, WEBP, or PDF files are allowed")
		return
	}

	subdir := filepath.Join(h.uploadDir, referralUploadDir)
	if err := os.MkdirAll(subdir, 0o750); err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}

	name := uuid.NewString() + ext
	path := filepath.Join(subdir, name)
	if err := os.WriteFile(path, buf, 0o640); err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to store file")
		return
	}

	userIDStr, _ := c.Get("user_id")
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		os.Remove(path)
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}

	att, err := h.service.AttachFile(id, header.Filename, "/uploads/"+referralUploadDir+"/"+name, contentType, int64(len(buf)), userID)
	if err != nil {
		os.Remove(path)
		utils.Fail(c, http.StatusInternalServerError, "failed to record attachment")
		return
	}
	utils.Success(c, http.StatusCreated, "attachment uploaded", toAttachmentResponse(att, ""))
	if h.audit != nil {
		_ = h.audit.Log(c, "referral.attachment", "referral", id.String())
	}
}

// ListAttachments godoc
// @Summary      List a referral's attachments
// @Tags         referrals
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Referral ID"
// @Success      200 {object} utils.APIResponse{data=[]AttachmentResponse}
// @Router       /referrals/{id}/attachments [get]
func (h *Handler) ListAttachments(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid referral id")
		return
	}
	list, err := h.service.ListAttachments(id)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to list attachments")
		return
	}
	resp := make([]AttachmentResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toAttachmentResponse(&list[i], list[i].UploadedBy.FullName))
	}
	utils.Success(c, http.StatusOK, "attachments fetched", resp)
}

// DownloadAttachment godoc
// @Summary      Download a referral attachment
// @Tags         referrals
// @Produce      application/octet-stream
// @Security     BearerAuth
// @Param        id           path string true "Referral ID"
// @Param        attachmentId path string true "Attachment ID"
// @Success      200
// @Router       /referrals/{id}/attachments/{attachmentId} [get]
func (h *Handler) DownloadAttachment(c *gin.Context) {
	referralID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid referral id")
		return
	}
	attID, err := uuid.Parse(c.Param("attachmentId"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid attachment id")
		return
	}
	att, err := h.service.GetAttachment(attID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "attachment not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to load attachment")
		return
	}
	if att.ReferralID != referralID {
		utils.Fail(c, http.StatusForbidden, "attachment does not belong to this referral")
		return
	}
	if h.uploadDir == "" {
		utils.Fail(c, http.StatusNotFound, "attachment storage not configured")
		return
	}
	path := filepath.Join(h.uploadDir, referralUploadDir, filepath.Base(att.FilePath))
	c.FileAttachment(path, att.FileName)
}

// DeleteAttachment godoc
// @Summary      Remove an attachment from a referral
// @Tags         referrals
// @Produce      json
// @Security     BearerAuth
// @Param        id           path string true "Referral ID"
// @Param        attachmentId path string true "Attachment ID"
// @Success      200 {object} utils.APIResponse
// @Router       /referrals/{id}/attachments/{attachmentId} [delete]
func (h *Handler) DeleteAttachment(c *gin.Context) {
	referralID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid referral id")
		return
	}
	attID, err := uuid.Parse(c.Param("attachmentId"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid attachment id")
		return
	}
	att, err := h.service.GetAttachment(attID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "attachment not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to load attachment")
		return
	}
	if att.ReferralID != referralID {
		utils.Fail(c, http.StatusForbidden, "attachment does not belong to this referral")
		return
	}
	if err := h.service.DeleteAttachment(attID); err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to delete attachment")
		return
	}
	if h.uploadDir != "" {
		name := filepath.Base(att.FilePath)
		_ = os.Remove(filepath.Join(h.uploadDir, referralUploadDir, name))
	}
	utils.Success(c, http.StatusOK, "attachment deleted", nil)
	if h.audit != nil {
		_ = h.audit.Log(c, "referral.attachment_delete", "referral", att.ReferralID.String())
	}
}
