package treatments

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the treatment Service.
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

func currentUserID(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get("user_id")
	if !ok {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(v.(string))
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

// Create godoc
// @Summary      Create a treatment plan
// @Description  Doctor orders a course of a procedure (Panchakarma today, other categories later). Sessions are auto-scheduled from start date and frequency. A PKR number is auto-generated.
// @Tags         treatment
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreatePlanRequest true "Plan"
// @Success      201 {object} utils.APIResponse{data=PlanResponse}
// @Failure      400 {object} utils.APIResponse
// @Failure      404 {object} utils.APIResponse
// @Router       /treatment-plans [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}

	plan, err := h.service.CreatePlan(req, userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			utils.Fail(c, http.StatusNotFound, "patient, procedure type or therapist not found")
		case errors.Is(err, ErrInvalidState):
			utils.Fail(c, http.StatusConflict, err.Error())
		default:
			utils.Fail(c, http.StatusBadRequest, err.Error())
		}
		return
	}
	utils.Success(c, http.StatusCreated, "treatment plan created", toResponse(plan))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.plan_create", "treatment_plan", plan.ID.String())
	}
}

// List godoc
// @Summary      List treatment plans
// @Description  Filterable by status, patient, or patient search term.
// @Tags         treatment
// @Produce      json
// @Security     BearerAuth
// @Param        status query string false "Filter by plan status"
// @Param        patient_id query string false "Filter by patient id"
// @Param        search query string false "Search by patient name or UHID"
// @Success      200 {object} utils.APIResponse{data=[]PlanListItem}
// @Router       /treatment-plans [get]
func (h *Handler) List(c *gin.Context) {
	plans, err := h.service.ListPlans(ListFilter{
		Status:    c.Query("status"),
		PatientID: c.Query("patient_id"),
		Search:    c.Query("search"),
	})
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to list plans")
		return
	}
	resp := make([]PlanListItem, 0, len(plans))
	for i := range plans {
		resp = append(resp, toListItem(&plans[i]))
	}
	utils.Success(c, http.StatusOK, "treatment plans fetched", resp)
}

// Get godoc
// @Summary      Get a treatment plan with its sessions
// @Tags         treatment
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Plan ID"
// @Success      200 {object} utils.APIResponse{data=PlanResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /treatment-plans/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	plan, err := h.service.GetPlan(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "plan not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch plan")
		return
	}
	utils.Success(c, http.StatusOK, "plan fetched", toResponse(plan))
}

// Update godoc
// @Summary      Update a plan (before approval)
// @Description  Editable only while the plan is in PLANNED status.
// @Tags         treatment
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Plan ID"
// @Param        request body UpdatePlanRequest true "Fields to update"
// @Success      200 {object} utils.APIResponse{data=PlanResponse}
// @Failure      404 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /treatment-plans/{id} [patch]
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	var req UpdatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	plan, err := h.service.UpdatePlan(id, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			utils.Fail(c, http.StatusNotFound, "plan not found")
		case errors.Is(err, ErrInvalidState):
			utils.Fail(c, http.StatusConflict, "plan can only be edited before approval")
		default:
			utils.Fail(c, http.StatusBadRequest, err.Error())
		}
		return
	}
	utils.Success(c, http.StatusOK, "plan updated", toResponse(plan))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.plan_update", "treatment_plan", id.String())
	}
}

// Approve godoc
// @Summary      Approve a treatment plan
// @Description  Panchakarma doctor (or any approver) confirms the plan for execution.
// @Tags         treatment
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Plan ID"
// @Success      200 {object} utils.APIResponse{data=PlanResponse}
// @Failure      404 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /treatment-plans/{id}/approve [post]
func (h *Handler) Approve(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}
	plan, err := h.service.ApprovePlan(id, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "plan not found")
			return
		}
		utils.Fail(c, http.StatusConflict, "only PLANNED plans can be approved")
		return
	}
	utils.Success(c, http.StatusOK, "plan approved", toResponse(plan))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.plan_approve", "treatment_plan", id.String())
	}
}

// Cancel godoc
// @Summary      Cancel a treatment plan
// @Tags         treatment
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Plan ID"
// @Success      200 {object} utils.APIResponse{data=PlanResponse}
// @Failure      404 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /treatment-plans/{id}/cancel [post]
func (h *Handler) Cancel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}
	plan, err := h.service.CancelPlan(id, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "plan not found")
			return
		}
		utils.Fail(c, http.StatusConflict, "completed or cancelled plans cannot be cancelled")
		return
	}
	utils.Success(c, http.StatusOK, "plan cancelled", toResponse(plan))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.plan_cancel", "treatment_plan", id.String())
	}
}

// Complete godoc
// @Summary      Complete a treatment plan with final assessment
// @Description  All sessions must be completed/skipped before completion.
// @Tags         treatment
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Plan ID"
// @Param        request body CompletePlanRequest true "Final assessment"
// @Success      200 {object} utils.APIResponse{data=PlanResponse}
// @Failure      404 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /treatment-plans/{id}/complete [post]
func (h *Handler) Complete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	var req CompletePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}
	plan, err := h.service.CompletePlan(id, req, userID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			utils.Fail(c, http.StatusNotFound, "plan not found")
		case errors.Is(err, ErrInvalidState):
			utils.Fail(c, http.StatusConflict, "all sessions must be completed before completing the plan")
		default:
			utils.Fail(c, http.StatusBadRequest, err.Error())
		}
		return
	}
	utils.Success(c, http.StatusOK, "plan completed", toResponse(plan))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.plan_complete", "treatment_plan", id.String())
	}
}

// ProcedureTypes godoc
// @Summary      List active procedure types
// @Tags         treatment
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]ProcedureTypeResponse}
// @Router       /procedure-types [get]
func (h *Handler) ProcedureTypes(c *gin.Context) {
	types, err := h.service.ListProcedureTypes()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to list procedure types")
		return
	}
	resp := make([]ProcedureTypeResponse, 0, len(types))
	for i := range types {
		t := &types[i]
		resp = append(resp, ProcedureTypeResponse{
			ID:          t.ID.String(),
			Name:        t.Name,
			Category:    t.Category,
			Description: t.Description,
			IsActive:    t.IsActive,
		})
	}
	utils.Success(c, http.StatusOK, "procedure types fetched", resp)
}

// Therapists godoc
// @Summary      List therapists assignable to plans
// @Tags         treatment
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]TherapistResponse}
// @Router       /therapists [get]
func (h *Handler) Therapists(c *gin.Context) {
	users, err := h.service.ListTherapists()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to list therapists")
		return
	}
	resp := make([]TherapistResponse, 0, len(users))
	for i := range users {
		resp = append(resp, TherapistResponse{ID: users[i].ID.String(), FullName: users[i].FullName})
	}
	utils.Success(c, http.StatusOK, "therapists fetched", resp)
}

// TodaySessions godoc
// @Summary      Today's sessions for the logged-in therapist
// @Tags         treatment
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]PlanListItem}
// @Router       /treatment-sessions/today [get]
func (h *Handler) TodaySessions(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}
	plans, err := h.service.TodaySessions(userID)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch today's sessions")
		return
	}
	resp := make([]PlanListItem, 0, len(plans))
	for i := range plans {
		resp = append(resp, toListItem(&plans[i]))
	}
	utils.Success(c, http.StatusOK, "today's sessions fetched", resp)
}

// StartSession godoc
// @Summary      Start a session
// @Description  Begins a pending session; moves the plan to IN_PROGRESS.
// @Tags         treatment
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Session ID"
// @Param        request body StartSessionRequest true "Pre-session condition"
// @Success      200 {object} utils.APIResponse{data=SessionResponse}
// @Failure      404 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /treatment-sessions/{id}/start [post]
func (h *Handler) StartSession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid session id")
		return
	}
	var req StartSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}
	session, err := h.service.StartSession(id, req, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "session not found")
			return
		}
		utils.Fail(c, http.StatusConflict, "session cannot be started in its current state")
		return
	}
	utils.Success(c, http.StatusOK, "session started", toSessionResponse(session))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.session_start", "treatment_session", id.String())
	}
}

// CompleteSession godoc
// @Summary      Complete a session
// @Description  Records the post-session condition, complications and observations.
// @Tags         treatment
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Session ID"
// @Param        request body CompleteSessionRequest true "Post-session findings"
// @Success      200 {object} utils.APIResponse{data=SessionResponse}
// @Failure      404 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /treatment-sessions/{id}/complete [post]
func (h *Handler) CompleteSession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid session id")
		return
	}
	var req CompleteSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}
	session, err := h.service.CompleteSession(id, req, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "session not found")
			return
		}
		utils.Fail(c, http.StatusConflict, "only IN_PROGRESS sessions can be completed")
		return
	}
	utils.Success(c, http.StatusOK, "session completed", toSessionResponse(session))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.session_complete", "treatment_session", id.String())
	}
}

// SkipSession godoc
// @Summary      Skip a pending session
// @Tags         treatment
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Session ID"
// @Param        request body SkipSessionRequest true "Reason"
// @Success      200 {object} utils.APIResponse{data=SessionResponse}
// @Failure      404 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /treatment-sessions/{id}/skip [post]
func (h *Handler) SkipSession(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid session id")
		return
	}
	var req SkipSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		utils.Fail(c, http.StatusUnauthorized, "invalid user identity")
		return
	}
	session, err := h.service.SkipSession(id, req, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "session not found")
			return
		}
		utils.Fail(c, http.StatusConflict, "only PENDING sessions can be skipped")
		return
	}
	utils.Success(c, http.StatusOK, "session skipped", toSessionResponse(session))
	if h.audit != nil {
		_ = h.audit.Log(c, "treatment.session_skip", "treatment_session", id.String())
	}
}
