package diet

import (
	"errors"
	"net/http"
	"time"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service Service
	audit   *audit.Recorder
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) SetAuditRecorder(r *audit.Recorder) {
	h.audit = r
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func dietCurrentUserID(c *gin.Context) (uuid.UUID, error) {
	raw, _ := c.Get("user_id")
	return uuid.Parse(raw.(string))
}

func dietScope(c *gin.Context) *models.DataScope {
	raw, ok := c.Get("data_scope")
	if !ok {
		return nil
	}
	scope, ok := raw.(*models.DataScope)
	if !ok {
		return nil
	}
	return scope
}

func dietFail(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		utils.Fail(c, http.StatusNotFound, "diet plan or meal order not found")
		return
	}
	if errors.Is(err, ErrInvalidTransition) {
		utils.Fail(c, http.StatusConflict, err.Error())
		return
	}
	if errors.Is(err, ErrDuplicateMeal) {
		utils.Fail(c, http.StatusConflict, err.Error())
		return
	}
	if errors.Is(err, ErrNoActiveDietPlan) {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, ErrInvalidMealType) {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Fail(c, http.StatusInternalServerError, "diet operation failed")
}

// ─── Diet Plans ───────────────────────────────────────────────────────────────

// CreateDietPlan godoc
// @Summary      Prescribe a diet plan for an admitted patient
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/plans [post]
func (h *Handler) CreateDietPlan(c *gin.Context) {
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req CreateDietPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	plan, err := h.service.CreateDietPlan(req, userID, dietScope(c))
	if err != nil {
		dietFail(c, err)
		return
	}

	// Audit Logging
	if h.audit != nil {
		h.audit.Log(c, "DIET_PLAN_CREATED", "DietPlan", plan.ID.String())
	}

	utils.Success(c, http.StatusCreated, "diet plan prescribed", plan)
}

// GetActiveDietPlan godoc
// @Summary      Get currently active diet plan for an admission
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/plans/active [get]
func (h *Handler) GetActiveDietPlan(c *gin.Context) {
	admID, err := uuid.Parse(c.Query("admission_id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid admission_id")
		return
	}

	plan, err := h.service.GetActiveDietPlan(admID, dietScope(c))
	if err != nil {
		dietFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "active diet plan fetched", plan)
}

// ListDietPlans godoc
// @Summary      List all historical diet plans for an admission
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/plans [get]
func (h *Handler) ListDietPlans(c *gin.Context) {
	admID, err := uuid.Parse(c.Query("admission_id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid admission_id")
		return
	}

	plans, err := h.service.ListDietPlans(admID, dietScope(c))
	if err != nil {
		dietFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "diet plans history fetched", plans)
}

// CancelDietPlan godoc
// @Summary      Deactivate / cancel a diet plan
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/plans/:id/cancel [put]
func (h *Handler) CancelDietPlan(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req CancelDietPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CancelDietPlan(id, userID, req, dietScope(c)); err != nil {
		dietFail(c, err)
		return
	}

	// Audit Logging
	if h.audit != nil {
		h.audit.Log(c, "DIET_PLAN_CANCELLED", "DietPlan", id.String())
	}

	utils.Success(c, http.StatusOK, "diet plan cancelled", nil)
}

// UpdateDietPlan godoc
// @Summary      Update an existing diet plan
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/plans/:id [put]
func (h *Handler) UpdateDietPlan(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req UpdateDietPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	plan, err := h.service.UpdateDietPlan(id, req, userID, dietScope(c))
	if err != nil {
		dietFail(c, err)
		return
	}

	if h.audit != nil {
		h.audit.Log(c, "DIET_PLAN_UPDATED", "DietPlan", id.String())
	}
	utils.Success(c, http.StatusOK, "diet plan updated", plan)
}

// RenewDietPlan godoc
// @Summary      Extend the end date of an active diet plan
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/plans/:id/renew [post]
func (h *Handler) RenewDietPlan(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid plan id")
		return
	}
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req RenewDietPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	plan, err := h.service.RenewDietPlan(id, req, userID, dietScope(c))
	if err != nil {
		dietFail(c, err)
		return
	}

	if h.audit != nil {
		h.audit.Log(c, "DIET_PLAN_RENEWED", "DietPlan", id.String())
	}
	utils.Success(c, http.StatusOK, "diet plan renewed", plan)
}

// ─── Meal Generation & Kitchen Sheet ──────────────────────────────────────────

// GenerateMeals godoc
// @Summary      Generate meal orders daily for active admissions
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/generate-meals [post]
func (h *Handler) GenerateMeals(c *gin.Context) {
	var body struct {
		Date string `json:"date"` // YYYY-MM-DD (optional, defaults to today)
	}
	c.ShouldBindJSON(&body)

	targetDate := time.Now()
	if body.Date != "" {
		if t, err := time.Parse("2006-01-02", body.Date); err == nil {
			targetDate = t
		}
	}

	count, err := h.service.GenerateDailyMeals(targetDate)
	if err != nil {
		dietFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "daily meal orders generated", gin.H{"count": count})
}

// GetKitchenSheet godoc
// @Summary      Get list of meal orders (Kitchen staff view)
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/kitchen-sheet [get]
func (h *Handler) GetKitchenSheet(c *gin.Context) {
	f := KitchenSheetFilter{
		WardID:   c.Query("ward_id"),
		MealType: c.Query("meal_type"),
	}
	if d := c.Query("date"); d != "" {
		if t, err := time.Parse("2006-01-02", d); err == nil {
			f.ScheduledDate = t
		}
	} else {
		f.ScheduledDate = time.Now()
	}

	sheet, err := h.service.GetKitchenSheet(f)
	if err != nil {
		dietFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "kitchen sheet fetched", sheet)
}

// UpdateMealStatus godoc
// @Summary      Update preparation or serving status of a meal order
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/meals/:id/status [put]
func (h *Handler) UpdateMealStatus(c *gin.Context) {
	mealID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid meal id")
		return
	}
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req UpdateMealStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.UpdateMealStatus(mealID, userID, req); err != nil {
		dietFail(c, err)
		return
	}

	// Audit Logging
	if h.audit != nil {
		var action string
		switch req.Status {
		case models.MealStatusPreparing:
			action = "MEAL_PREPARING"
		case models.MealStatusReady:
			action = "MEAL_READY"
		case models.MealStatusServed:
			action = "MEAL_SERVED"
		case models.MealStatusHeld:
			action = "MEAL_HELD"
		case models.MealStatusPending:
			action = "MEAL_REOPENED"
		}
		if action != "" {
			h.audit.Log(c, action, "MealOrder", mealID.String())
		}
	}

	utils.Success(c, http.StatusOK, "meal status updated", nil)
}

// CreateManualMeal godoc
// @Summary      Manually add a single meal order (kitchen)
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/meals [post]
func (h *Handler) CreateManualMeal(c *gin.Context) {
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req CreateManualMealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	meal, err := h.service.CreateManualMeal(req, userID)
	if err != nil {
		dietFail(c, err)
		return
	}

	if h.audit != nil {
		h.audit.Log(c, "MEAL_MANUALLY_CREATED", "MealOrder", meal.ID.String())
	}
	utils.Success(c, http.StatusCreated, "meal order created", meal)
}

// CancelMeal godoc
// @Summary      Soft-cancel a pending meal order with a reason
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/meals/:id/cancel [put]
func (h *Handler) CancelMeal(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid meal id")
		return
	}
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req CancelMealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CancelMeal(id, userID, req); err != nil {
		dietFail(c, err)
		return
	}

	if h.audit != nil {
		h.audit.Log(c, "MEAL_CANCELLED", "MealOrder", id.String())
	}
	utils.Success(c, http.StatusOK, "meal order cancelled", nil)
}

// GetWardsForKitchen godoc
// @Summary      List wards currently hosting active admissions (kitchen filter)
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/ward-list [get]
func (h *Handler) GetWardsForKitchen(c *gin.Context) {
	wards, err := h.service.GetWardsForKitchen()
	if err != nil {
		dietFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "wards fetched", wards)
}

// GetKitchenAdmissions godoc
// @Summary      List admissions eligible for manual meal ordering
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/admissions [get]
func (h *Handler) GetKitchenAdmissions(c *gin.Context) {
	admissions, err := h.service.GetKitchenAdmissions()
	if err != nil {
		dietFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "admissions fetched", admissions)
}

// ─── Diet Templates ───────────────────────────────────────────────────────────

// ListDietTemplates godoc
// @Summary      List diet templates (prefill masters)
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/templates [get]
func (h *Handler) ListDietTemplates(c *gin.Context) {
	activeOnly := c.Query("active") == "true" || c.Query("active_only") == "true"
	templates, err := h.service.ListDietTemplates(activeOnly)
	if err != nil {
		dietFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "diet templates fetched", templates)
}

// CreateDietTemplate godoc
// @Summary      Create a diet template
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/templates [post]
func (h *Handler) CreateDietTemplate(c *gin.Context) {
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req CreateDietTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	template, err := h.service.CreateDietTemplate(req, userID)
	if err != nil {
		dietFail(c, err)
		return
	}

	if h.audit != nil {
		h.audit.Log(c, "DIET_TEMPLATE_CREATED", "DietTemplate", template.ID.String())
	}
	utils.Success(c, http.StatusCreated, "diet template created", template)
}

// UpdateDietTemplate godoc
// @Summary      Update a diet template
// @Tags         diet
// @Security     BearerAuth
// @Router       /diet/templates/:id [put]
func (h *Handler) UpdateDietTemplate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid template id")
		return
	}
	userID, err := dietCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req UpdateDietTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	template, err := h.service.UpdateDietTemplate(id, req, userID)
	if err != nil {
		dietFail(c, err)
		return
	}

	if h.audit != nil {
		h.audit.Log(c, "DIET_TEMPLATE_UPDATED", "DietTemplate", id.String())
	}
	utils.Success(c, http.StatusOK, "diet template updated", template)
}
