package patientdocs

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// docUploadDir is the storage subdirectory under the configured upload
// root where patient documents are written.
const docUploadDir = "patient_docs"

// docMaxBytes caps a single patient document at 10 MB.
const docMaxBytes int64 = 10 << 20

// docMimeExt maps allowed, detected MIME types to file extensions.
// Extension is derived from the detected content, never the original name.
var docMimeExt = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"application/pdf": ".pdf",
}

// Handler wires HTTP requests to the patient-documents Service.
type Handler struct {
	service   Service
	audit     *audit.Recorder
	uploadDir string
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// SetAuditRecorder attaches the audit recorder used to log data changes.
func (h *Handler) SetAuditRecorder(r *audit.Recorder) { h.audit = r }

// SetUploadDir sets the base directory used to persist patient documents.
func (h *Handler) SetUploadDir(dir string) { h.uploadDir = dir }

func currentUserID(c *gin.Context) uuid.UUID {
	userIDStr, _ := c.Get("user_id")
	id, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		return uuid.Nil
	}
	return id
}

func uploadedByName(u string) string {
	if u == "" {
		return "Unknown"
	}
	return u
}

// scopeFromContext extracts the DataScope injected by DataScopeMiddleware.
func scopeFromContext(c *gin.Context) *models.DataScope {
	if s, exists := c.Get("data_scope"); exists {
		if scope, ok := s.(*models.DataScope); ok {
			return scope
		}
	}
	return nil
}

// UploadDocument godoc
// @Summary      Attach a document to a patient record
// @Description  Accepts a multipart field "file" (JPG/PNG/WEBP/PDF, max 10 MB) plus optional "doc_type" and "notes". Returns the stored document metadata.
// @Tags         patient-documents
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        id       path string true "Patient ID"
// @Param        file     formData file true "Document file"
// @Param        doc_type formData string false "Document type (e.g. REPORT, ID_PROOF, CONSENT)"
// @Param        notes    formData string false "Optional notes"
// @Success      201      {object} utils.APIResponse{data=DocumentResponse}
// @Router       /patients/{id}/documents [post]
func (h *Handler) Upload(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "file field 'file' required")
		return
	}
	defer file.Close()

	buf, err := io.ReadAll(io.LimitReader(file, docMaxBytes+1))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "failed to read file")
		return
	}
	if int64(len(buf)) > docMaxBytes {
		utils.Fail(c, http.StatusRequestEntityTooLarge, "file exceeds 10 MB limit")
		return
	}
	if len(buf) == 0 {
		utils.Fail(c, http.StatusBadRequest, "empty file")
		return
	}

	contentType := http.DetectContentType(buf)
	ext, ok := docMimeExt[contentType]
	if !ok {
		utils.Fail(c, http.StatusBadRequest, "only JPG, PNG, WEBP, or PDF files are allowed")
		return
	}

	subdir := filepath.Join(h.uploadDir, docUploadDir)
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

	userID := currentUserID(c)
	if userID == uuid.Nil {
		os.Remove(path)
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}

	doc, err := h.service.Add(patientID, header.Filename, "/uploads/"+docUploadDir+"/"+name, contentType, int64(len(buf)), c.PostForm("doc_type"), c.PostForm("notes"), userID)
	if err != nil {
		os.Remove(path)
		utils.Fail(c, http.StatusInternalServerError, "failed to record document")
		return
	}
	
	// Refetch to populate UploadedBy
	loadedDoc, err := h.service.Get(doc.ID, scopeFromContext(c))
	if err == nil {
		doc = loadedDoc
	}

	utils.Success(c, http.StatusCreated, "document uploaded", toResponse(doc, uploadedByName(doc.UploadedBy.FullName)))
	if h.audit != nil {
		_ = h.audit.Log(c, "patient.document", "patient", patientID.String())
	}
}

// List godoc
// @Summary      List a patient's documents
// @Tags         patient-documents
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Patient ID"
// @Success      200 {object} utils.APIResponse{data=[]DocumentResponse}
// @Router       /patients/{id}/documents [get]
func (h *Handler) List(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	list, err := h.service.List(patientID, scopeFromContext(c))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to list documents")
		return
	}
	resp := make([]DocumentResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toResponse(&list[i], uploadedByName(list[i].UploadedBy.FullName)))
	}
	utils.Success(c, http.StatusOK, "documents fetched", resp)
}

// Download godoc
// @Summary      Download a patient document
// @Tags         patient-documents
// @Produce      application/octet-stream
// @Security     BearerAuth
// @Param        id         path string true "Patient ID"
// @Param        documentId path string true "Document ID"
// @Success      200
// @Router       /patients/{id}/documents/{documentId} [get]
func (h *Handler) Download(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	docID, err := uuid.Parse(c.Param("documentId"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid document id")
		return
	}
	doc, err := h.service.Get(docID, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "document not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to load document")
		return
	}
	if doc.PatientID != patientID {
		utils.Fail(c, http.StatusForbidden, "document does not belong to this patient")
		return
	}
	if h.uploadDir == "" {
		utils.Fail(c, http.StatusNotFound, "document storage not configured")
		return
	}
	path := filepath.Join(h.uploadDir, docUploadDir, filepath.Base(doc.FilePath))
	c.FileAttachment(path, doc.FileName)
}

// Delete godoc
// @Summary      Remove a document from a patient record
// @Tags         patient-documents
// @Produce      json
// @Security     BearerAuth
// @Param        id         path string true "Patient ID"
// @Param        documentId path string true "Document ID"
// @Success      200 {object} utils.APIResponse
// @Router       /patients/{id}/documents/{documentId} [delete]
func (h *Handler) Delete(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	docID, err := uuid.Parse(c.Param("documentId"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid document id")
		return
	}
	doc, err := h.service.Get(docID, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "document not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to load document")
		return
	}
	if doc.PatientID != patientID {
		utils.Fail(c, http.StatusForbidden, "document does not belong to this patient")
		return
	}
	if err := h.service.Delete(docID, scopeFromContext(c)); err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to delete document")
		return
	}
	if h.uploadDir != "" {
		_ = os.Remove(filepath.Join(h.uploadDir, docUploadDir, filepath.Base(doc.FilePath)))
	}
	utils.Success(c, http.StatusOK, "document deleted", nil)
	if h.audit != nil {
		_ = h.audit.Log(c, "patient.document_delete", "patient", doc.PatientID.String())
	}
}
