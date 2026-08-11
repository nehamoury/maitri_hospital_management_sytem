package encounters

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/ahms/backend/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the encounters Service.
type Handler struct {
	service Service
	audit   *audit.Recorder
	wsHub   *websocket.Hub
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// SetAuditRecorder attaches the audit recorder used to log data changes.
func (h *Handler) SetAuditRecorder(r *audit.Recorder) { h.audit = r }

// SetWebSocketHub sets the websocket hub for broadcasting messages.
func (h *Handler) SetWebSocketHub(hub *websocket.Hub) { h.wsHub = hub }

// Create godoc
// @Summary      Create an OPD encounter (visit) with an auto token
// @Description  Reception creates a visit for an already-registered patient. Never creates a new patient.
// @Tags         encounters
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateEncounterRequest true "Encounter"
// @Success      201 {object} utils.APIResponse{data=EncounterResponse}
// @Router       /encounters [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreateEncounterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	createdBy, err := uuid.Parse(userID.(string))
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}

	encounter, err := h.service.Create(req, createdBy)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "encounter created", toResponse(encounter))
	if h.audit != nil {
		_ = h.audit.Log(c, "encounter.create", "encounter", encounter.ID.String())
	}
	if h.wsHub != nil {
		payload := map[string]interface{}{
			"type":         "encounter_created",
			"encounter_id": encounter.ID.String(),
			"status":       encounter.Status,
			"token_number": encounter.TokenNumber,
			"doctor_id":    encounter.DoctorID.String(),
		}
		if b, err := json.Marshal(payload); err == nil {
			h.wsHub.Broadcast(b)
		}
	}
}

// List godoc
// @Summary      List encounters with filters
// @Tags         encounters
// @Produce      json
// @Security     BearerAuth
// @Param        patient_id query string false "Filter by patient"
// @Param        department_id query string false "Filter by department"
// @Param        doctor_id query string false "Filter by doctor"
// @Param        status query string false "Filter by status"
// @Param        date query string false "Visit date (YYYY-MM-DD)"
// @Success      200 {object} utils.APIResponse{data=[]EncounterResponse}
// @Router       /encounters [get]
func (h *Handler) List(c *gin.Context) {
	var scope *models.DataScope
	if scopeVal, exists := c.Get("data_scope"); exists {
		scope = scopeVal.(*models.DataScope)
	}

	encounters, err := h.service.List(
		c.Query("patient_id"),
		c.Query("department_id"),
		c.Query("doctor_id"),
		c.Query("status"),
		c.Query("date"),
		scope,
	)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	resp := make([]EncounterResponse, 0, len(encounters))
	for i := range encounters {
		resp = append(resp, toResponse(&encounters[i]))
	}
	utils.Success(c, http.StatusOK, "encounters fetched", resp)
}

// Get godoc
// @Summary      Get an encounter by id
// @Tags         encounters
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Encounter ID"
// @Success      200 {object} utils.APIResponse{data=EncounterResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /encounters/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid encounter id")
		return
	}
	var scope *models.DataScope
	if scopeVal, exists := c.Get("data_scope"); exists {
		scope = scopeVal.(*models.DataScope)
	}

	encounter, err := h.service.GetByID(id, scope)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "encounter not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch encounter")
		return
	}
	utils.Success(c, http.StatusOK, "encounter fetched", toResponse(encounter))
}

// UpdateStatus godoc
// @Summary      Update an encounter's status
// @Tags         encounters
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Encounter ID"
// @Param        request body UpdateEncounterStatusRequest true "New status"
// @Success      200 {object} utils.APIResponse{data=EncounterResponse}
// @Router       /encounters/{id}/status [patch]
func (h *Handler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid encounter id")
		return
	}

	var req UpdateEncounterStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	encounter, err := h.service.UpdateStatus(id, req.Status)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "encounter not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "encounter status updated", toResponse(encounter))
	if h.audit != nil {
		_ = h.audit.Log(c, "encounter.update_status", "encounter", id.String())
	}
	if h.wsHub != nil {
		payload := map[string]interface{}{
			"type":         "encounter_updated",
			"encounter_id": encounter.ID.String(),
			"status":       encounter.Status,
			"token_number": encounter.TokenNumber,
			"doctor_id":    encounter.DoctorID.String(),
		}
		if b, err := json.Marshal(payload); err == nil {
			h.wsHub.Broadcast(b)
		}
	}
}
