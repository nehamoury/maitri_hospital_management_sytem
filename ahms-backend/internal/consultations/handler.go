package consultations

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the consultations Service.
type Handler struct {
	service Service
	audit   *audit.Recorder
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// SetAuditRecorder attaches the audit recorder used to log data changes.
func (h *Handler) SetAuditRecorder(r *audit.Recorder) { h.audit = r }

// Create godoc
// @Summary      Create a consultation for an encounter (doctor saves clinical record)
// @Tags         consultations
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        encounter_id path string true "Encounter ID"
// @Param        request body CreateConsultationRequest true "Consultation"
// @Success      201 {object} utils.APIResponse{data=ConsultationResponse}
// @Router       /encounters/{encounter_id}/consultation [post]
func (h *Handler) Create(c *gin.Context) {
	encounterID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid encounter id")
		return
	}

	var req CreateConsultationRequest
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

	consultation, err := h.service.Create(encounterID, req, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "encounter or doctor record not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "consultation saved", toResponse(consultation))
	if h.audit != nil {
		_ = h.audit.Log(c, "consultation.create", "consultation", consultation.ID.String())
	}
}

// GetByEncounter godoc
// @Summary      Get the consultation for an encounter
// @Tags         consultations
// @Produce      json
// @Security     BearerAuth
// @Param        encounter_id path string true "Encounter ID"
// @Success      200 {object} utils.APIResponse{data=ConsultationResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /encounters/{encounter_id}/consultation [get]
func (h *Handler) GetByEncounter(c *gin.Context) {
	encounterID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid encounter id")
		return
	}
	consultation, err := h.service.GetByEncounterID(encounterID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "no consultation found for this encounter")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch consultation")
		return
	}
	utils.Success(c, http.StatusOK, "consultation fetched", toResponse(consultation))
}

// Update godoc
// @Summary      Update a consultation (with diagnosis history retained via audit)
// @Tags         consultations
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Consultation ID"
// @Param        request body UpdateConsultationRequest true "Consultation"
// @Success      200 {object} utils.APIResponse{data=ConsultationResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /consultations/{id} [put]
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid consultation id")
		return
	}

	var req UpdateConsultationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	consultation, err := h.service.Update(id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "consultation not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "consultation updated", toResponse(consultation))
	if h.audit != nil {
		_ = h.audit.Log(c, "consultation.update", "consultation", id.String())
	}
}
