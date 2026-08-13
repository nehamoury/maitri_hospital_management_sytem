package pharmacy

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the pharmacy Service.
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

func pharmacyScope(c *gin.Context) *models.DataScope {
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

// CreateMedicine godoc
// @Summary      Create a medicine (stock master)
// @Tags         pharmacy
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateMedicineRequest true "Medicine"
// @Success      201 {object} utils.APIResponse{data=MedicineResponse}
// @Router       /medicines [post]
func (h *Handler) CreateMedicine(c *gin.Context) {
	var req CreateMedicineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	m, err := h.service.CreateMedicine(req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "medicine created", toMedicineResponse(m))
}

// ListMedicines godoc
// @Summary      List medicines (optionally low-stock only)
// @Tags         pharmacy
// @Produce      json
// @Security     BearerAuth
// @Param        search query string false "Search by name/formulation"
// @Param        low_stock query bool false "Only medicines at or below threshold"
// @Success      200 {object} utils.APIResponse{data=[]MedicineResponse}
// @Router       /medicines [get]
func (h *Handler) ListMedicines(c *gin.Context) {
	lowStock := c.Query("low_stock") == "true"
	outOfStock := c.Query("out_of_stock") == "true"
	nearExpiry := c.Query("near_expiry") == "true"
	expired := c.Query("expired") == "true"
	list, err := h.service.ListMedicines(c.Query("search"), lowStock, outOfStock, nearExpiry, expired)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch medicines")
		return
	}
	resp := make([]MedicineResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toMedicineResponse(&list[i]))
	}
	utils.Success(c, http.StatusOK, "medicines fetched", resp)
}

// GetMedicine godoc
// @Summary      Get a medicine by id
// @Tags         pharmacy
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Medicine ID"
// @Success      200 {object} utils.APIResponse{data=MedicineResponse}
// @Router       /medicines/{id} [get]
func (h *Handler) GetMedicine(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid medicine id")
		return
	}
	m, err := h.service.GetMedicine(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "medicine not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch medicine")
		return
	}
	utils.Success(c, http.StatusOK, "medicine fetched", toMedicineResponse(m))
}

// UpdateMedicine godoc
// @Summary      Update a medicine
// @Tags         pharmacy
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Medicine ID"
// @Param        request body UpdateMedicineRequest true "Medicine"
// @Success      200 {object} utils.APIResponse{data=MedicineResponse}
// @Router       /medicines/{id} [put]
func (h *Handler) UpdateMedicine(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid medicine id")
		return
	}
	var req UpdateMedicineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	m, err := h.service.UpdateMedicine(id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "medicine not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "medicine updated", toMedicineResponse(m))
}

// AdjustStock godoc
// @Summary      Adjust medicine stock (purchase / adjustment)
// @Tags         pharmacy
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Medicine ID"
// @Param        request body StockAdjustRequest true "Stock adjustment"
// @Success      200 {object} utils.APIResponse{data=MedicineResponse}
// @Router       /medicines/{id}/stock [post]
func (h *Handler) AdjustStock(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid medicine id")
		return
	}
	var req StockAdjustRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userIDStr, _ := c.Get("user_id")
	userID, _ := uuid.Parse(userIDStr.(string))
	m, err := h.service.AdjustStock(id, req, userID)
	if err != nil {
		if errors.Is(err, ErrInsufficientStock) {
			utils.Fail(c, http.StatusConflict, "stock cannot go negative")
			return
		}
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "medicine not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "stock adjusted", toMedicineResponse(m))
	if h.audit != nil {
		_ = h.audit.Log(c, "inventory.adjust", "medicine", id.String())
	}
}

// ReturnStock godoc
// @Summary      Record returned stock against a medicine
// @Description  Adds returned medicine back to stock and logs a RETURN inventory transaction.
// @Tags         pharmacy
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Medicine ID"
// @Param        request body ReturnStockRequest true "Returned stock"
// @Success      200 {object} utils.APIResponse{data=MedicineResponse}
// @Router       /medicines/{id}/return [post]
func (h *Handler) ReturnStock(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid medicine id")
		return
	}
	var req ReturnStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userIDStr, _ := c.Get("user_id")
	userID, _ := uuid.Parse(userIDStr.(string))
	m, err := h.service.ReturnStock(id, req, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "medicine not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "returned stock recorded", toMedicineResponse(m))
	if h.audit != nil {
		_ = h.audit.Log(c, "inventory.return", "medicine", id.String())
	}
}

// ListTransactions godoc
// @Summary      List a medicine's stock-movement history
// @Tags         pharmacy
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Medicine ID"
// @Success      200 {object} utils.APIResponse{data=[]InventoryTransactionResponse}
// @Router       /medicines/{id}/transactions [get]
func (h *Handler) ListTransactions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid medicine id")
		return
	}
	list, err := h.service.ListTransactions(id)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch transactions")
		return
	}
	resp := make([]InventoryTransactionResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toTxResponse(&list[i]))
	}
	utils.Success(c, http.StatusOK, "transactions fetched", resp)
}

// Dispense godoc
// @Summary      Dispense medicines against a prescription
// @Description  Records actual dispensing, decrements stock, updates prescription status.
// @Tags         pharmacy
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Prescription ID"
// @Param        request body DispenseRequest true "Dispense details"
// @Success      200 {object} utils.APIResponse{data=PrescriptionResponse}
// @Router       /prescriptions/{id}/dispense [post]
func (h *Handler) Dispense(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid prescription id")
		return
	}
	var req DispenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userIDStr, _ := c.Get("user_id")
	userID, _ := uuid.Parse(userIDStr.(string))

	rx, err := h.service.Dispense(id, req, userID, pharmacyScope(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "prescription not found")
			return
		}
		if errors.Is(err, ErrInsufficientStock) {
			utils.Fail(c, http.StatusConflict, "insufficient medicine stock")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "medicines dispensed", toPrescriptionResponse(rx))
	if h.audit != nil {
		_ = h.audit.Log(c, "pharmacy.dispense", "prescription", id.String())
	}
}
