package timeline

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the timeline Service.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// Get godoc
// @Summary      Get a patient's longitudinal cross-department timeline
// @Description  Aggregates every encounter, consultation, diagnosis and prescription of the patient across all departments.
// @Tags         timeline
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Patient ID"
// @Success      200 {object} utils.APIResponse{data=TimelineResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /patients/{id}/timeline [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	timeline, err := h.service.GetPatientTimeline(id)
	if err != nil {
		if errors.Is(err, ErrPatientNotFound) {
			utils.Fail(c, http.StatusNotFound, "patient not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch timeline")
		return
	}
	utils.Success(c, http.StatusOK, "timeline fetched", timeline)
}
