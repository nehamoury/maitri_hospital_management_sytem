package lab

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the lab Service.
type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func labCurrentUserID(c *gin.Context) (uuid.UUID, error) {
	raw, _ := c.Get("user_id")
	return uuid.Parse(raw.(string))
}

func labScope(c *gin.Context) *models.DataScope {
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

func labFail(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		utils.Fail(c, http.StatusNotFound, "record not found")
		return
	}
	if errors.Is(err, ErrInvalidTransition) {
		utils.Fail(c, http.StatusConflict, err.Error())
		return
	}
	utils.Fail(c, http.StatusInternalServerError, "lab operation failed")
}

// ─── Categories ───────────────────────────────────────────────────────────────

// ListCategories godoc
// @Summary      List investigation categories
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/categories [get]
func (h *Handler) ListCategories(c *gin.Context) {
	activeOnly := c.Query("active_only") != "false"
	cats, err := h.service.ListCategories(activeOnly)
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "categories fetched", cats)
}

// CreateCategory godoc
// @Summary      Create investigation category
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/categories [post]
func (h *Handler) CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	cat, err := h.service.CreateCategory(req)
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "category created", cat)
}

// UpdateCategory godoc
// @Summary      Update investigation category
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/categories/:id [put]
func (h *Handler) UpdateCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	cat, err := h.service.UpdateCategory(id, req)
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "category updated", cat)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ListTests godoc
// @Summary      List investigation tests
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/tests [get]
func (h *Handler) ListTests(c *gin.Context) {
	categoryID := c.Query("category_id")
	activeOnly := c.Query("active_only") != "false"
	tests, err := h.service.ListTests(categoryID, activeOnly)
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "tests fetched", tests)
}

// CreateTest godoc
// @Summary      Create investigation test
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/tests [post]
func (h *Handler) CreateTest(c *gin.Context) {
	var req CreateTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	test, err := h.service.CreateTest(req)
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "test created", test)
}

// UpdateTest godoc
// @Summary      Update investigation test
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/tests/:id [put]
func (h *Handler) UpdateTest(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	var req UpdateTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	test, err := h.service.UpdateTest(id, req)
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "test updated", test)
}

// ─── Orders ───────────────────────────────────────────────────────────────────

// ListOrders godoc
// @Summary      List lab orders
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders [get]
func (h *Handler) ListOrders(c *gin.Context) {
	f := ListOrdersFilter{
		PatientID:   c.Query("patient_id"),
		EncounterID: c.Query("encounter_id"),
		Status:      c.Query("status"),
		Priority:    c.Query("priority"),
	}
	if v := c.Query("from"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.From = t
		}
	}
	if v := c.Query("to"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.To = t.Add(24 * time.Hour)
		}
	}
	if p, err := strconv.Atoi(c.Query("page")); err == nil {
		f.Page = p
	}
	if ps, err := strconv.Atoi(c.Query("page_size")); err == nil {
		f.PageSize = ps
	}

	orders, total, err := h.service.ListOrders(f, labScope(c))
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "orders fetched", gin.H{
		"data":  orders,
		"total": total,
		"page":  f.Page,
	})
}

// CreateOrder godoc
// @Summary      Create a new lab order
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders [post]
func (h *Handler) CreateOrder(c *gin.Context) {
	userID, err := labCurrentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	order, err := h.service.CreateOrder(req, userID)
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "order created", order)
}

// GetOrder godoc
// @Summary      Get lab order detail
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id [get]
func (h *Handler) GetOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	order, err := h.service.GetOrder(id, labScope(c))
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order fetched", order)
}

// CancelOrder godoc
// @Summary      Cancel a lab order
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id/cancel [put]
func (h *Handler) CancelOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID, _ := labCurrentUserID(c)
	var req CancelOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.CancelOrder(id, userID, req, labScope(c)); err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order cancelled", nil)
}

// CollectSample godoc
// @Summary      Record sample collection → SAMPLE_COLLECTED
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id/collect [put]
func (h *Handler) CollectSample(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID, _ := labCurrentUserID(c)
	var req CollectSampleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.CollectSample(id, userID, req, labScope(c)); err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "sample collected", nil)
}

// MarkProcessing godoc
// @Summary      Mark order as PROCESSING
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id/process [put]
func (h *Handler) MarkProcessing(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.service.MarkProcessing(id, labScope(c)); err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order marked as processing", nil)
}

// EnterResults godoc
// @Summary      Enter test results (per-item)
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id/result [put]
func (h *Handler) EnterResults(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID, _ := labCurrentUserID(c)
	var req EnterResultsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.EnterResults(id, userID, req, labScope(c)); err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "results entered", nil)
}

// VerifyResults godoc
// @Summary      Verify results (lab supervisor)
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id/verify [put]
func (h *Handler) VerifyResults(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID, _ := labCurrentUserID(c)
	if err := h.service.VerifyResults(id, userID, labScope(c)); err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "results verified", nil)
}

// DoctorReview godoc
// @Summary      Doctor reviews result → DOCTOR_REVIEWED
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id/review [put]
func (h *Handler) DoctorReview(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	userID, _ := labCurrentUserID(c)
	var req DoctorReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.DoctorReview(id, userID, req, labScope(c)); err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order reviewed", nil)
}

// PrintReport godoc
// @Summary      Get printable HTML lab report
// @Tags         lab
// @Security     BearerAuth
// @Router       /lab/orders/:id/report [get]
func (h *Handler) PrintReport(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid id")
		return
	}
	html, err := h.service.PrintReport(id, labScope(c))
	if err != nil {
		labFail(c, err)
		return
	}
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, html)
}

// PatientOrders godoc
// @Summary      Get all lab orders for a patient (timeline)
// @Tags         lab
// @Security     BearerAuth
// @Router       /patients/:id/lab-orders [get]
func (h *Handler) PatientOrders(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	orders, err := h.service.PatientOrders(patientID, labScope(c))
	if err != nil {
		labFail(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "patient lab orders fetched", orders)
}
