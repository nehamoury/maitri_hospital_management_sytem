package referrals

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the referrals Service.
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
