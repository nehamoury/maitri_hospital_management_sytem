package billing

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the billing Service.
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

func currentUserID(c *gin.Context) uuid.UUID {
	userIDStr, _ := c.Get("user_id")
	id, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		return uuid.Nil
	}
	return id
}

// CreateBill godoc
// @Summary      Create a bill with line items
// @Tags         billing
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateBillRequest true "Bill"
// @Success      201 {object} utils.APIResponse{data=BillResponse}
// @Router       /bills [post]
func (h *Handler) CreateBill(c *gin.Context) {
	var req CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	bill, err := h.service.CreateBill(req, currentUserID(c))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "bill created", toBillResponse(bill))
	if h.audit != nil {
		_ = h.audit.Log(c, "bill.create", "bill", bill.ID.String())
	}
}

// ListBills godoc
// @Summary      List bills
// @Tags         billing
// @Produce      json
// @Security     BearerAuth
// @Param        status query string false "Filter by payment status (UNPAID/PARTIAL/PAID)"
// @Param        query query string false "Search by bill number"
// @Param        patient_id query string false "Filter by patient ID"
// @Success      200 {object} utils.APIResponse{data=[]BillResponse}
// @Router       /bills [get]
func (h *Handler) ListBills(c *gin.Context) {
	if pid := c.Query("patient_id"); pid != "" {
		id, err := uuid.Parse(pid)
		if err != nil {
			utils.Fail(c, http.StatusBadRequest, "invalid patient_id")
			return
		}
		bills, err := h.service.ListBillsByPatient(id)
		if err != nil {
			utils.Fail(c, http.StatusInternalServerError, "failed to fetch bills")
			return
		}
		resp := make([]BillResponse, 0, len(bills))
		for i := range bills {
			resp = append(resp, toBillResponse(&bills[i]))
		}
		utils.Success(c, http.StatusOK, "bills fetched", resp)
		return
	}
	bills, err := h.service.ListBills(c.Query("status"), c.Query("query"))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch bills")
		return
	}
	resp := make([]BillResponse, 0, len(bills))
	for i := range bills {
		resp = append(resp, toBillResponse(&bills[i]))
	}
	utils.Success(c, http.StatusOK, "bills fetched", resp)
}

// GetBill godoc
// @Summary      Get a bill by id
// @Tags         billing
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Bill ID"
// @Success      200 {object} utils.APIResponse{data=BillResponse}
// @Router       /bills/{id} [get]
func (h *Handler) GetBill(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid bill id")
		return
	}
	bill, err := h.service.GetBill(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "bill not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch bill")
		return
	}
	utils.Success(c, http.StatusOK, "bill fetched", toBillResponse(bill))
}

// GetBillByNo godoc
// @Summary      Get a bill by its number (BILL-2026-000001)
// @Tags         billing
// @Produce      json
// @Security     BearerAuth
// @Param        bill_no path string true "Bill number"
// @Success      200 {object} utils.APIResponse{data=BillResponse}
// @Router       /bills/number/{bill_no} [get]
func (h *Handler) GetBillByNo(c *gin.Context) {
	bill, err := h.service.GetBillByNo(c.Param("bill_no"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "bill not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch bill")
		return
	}
	utils.Success(c, http.StatusOK, "bill fetched", toBillResponse(bill))
}

// AddPayment godoc
// @Summary      Record a payment against a bill
// @Tags         billing
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Bill ID"
// @Param        request body PaymentRequest true "Payment"
// @Success      200 {object} utils.APIResponse{data=BillResponse}
// @Router       /bills/{id}/payments [post]
func (h *Handler) AddPayment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid bill id")
		return
	}
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	bill, err := h.service.AddPayment(id, req, currentUserID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "bill not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "payment recorded", toBillResponse(bill))
	if h.audit != nil {
		_ = h.audit.Log(c, "billing.payment", "bill", id.String())
	}
}
