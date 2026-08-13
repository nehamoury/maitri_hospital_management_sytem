package reports

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
)

// Handler wires HTTP requests to the reports Service.
type Handler struct {
	service Service
}

// NewHandler builds a reports Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// parseFilters reads the shared from/to/department/doctor query parameters.
// Defaults: from = today-30 days, to = today, department = all.
func parseFilters(c *gin.Context) (Filters, error) {
	f := Filters{
		From:         time.Now().AddDate(0, 0, -30),
		To:           time.Now(),
		DepartmentID: c.Query("department_id"),
		DoctorID:     c.Query("doctor_id"),
		GroupBy:      c.Query("group_by"),
		ExpiryDays:   30,
	}
	if v := c.Query("from"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			return f, err
		}
		f.From = t
	}
	if v := c.Query("to"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			return f, err
		}
		f.To = t
	}
	if v := c.Query("expiry_days"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n <= 0 {
			return f, errors.New("invalid expiry_days")
		}
		f.ExpiryDays = n
	}
	return f, nil
}

// GetSummary godoc
// @Summary      Report summary KPIs
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/summary [get]
func (h *Handler) GetSummary(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.Summary(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build summary report")
		return
	}
	utils.Success(c, http.StatusOK, "summary report fetched", r)
}

// GetDepartmentDistribution godoc
// @Summary      Department-wise distribution (OPD/IPD/Procedure/Dispensing/Diet)
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/department-distribution [get]
func (h *Handler) GetDepartmentDistribution(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.DepartmentDistribution(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build department distribution report")
		return
	}
	utils.Success(c, http.StatusOK, "department distribution report fetched", r)
}

// GetRevenue godoc
// @Summary      Billing / revenue report
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/revenue [get]
func (h *Handler) GetRevenue(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.Revenue(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build revenue report")
		return
	}
	utils.Success(c, http.StatusOK, "revenue report fetched", r)
}

// GetPharmacyDispensing godoc
// @Summary      Pharmacy dispensing report
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/pharmacy-dispensing [get]
func (h *Handler) GetPharmacyDispensing(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.PharmacyDispensing(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build pharmacy dispensing report")
		return
	}
	utils.Success(c, http.StatusOK, "pharmacy dispensing report fetched", r)
}

// GetPharmacyStock godoc
// @Summary      Pharmacy stock snapshot with alerts
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/pharmacy-stock [get]
func (h *Handler) GetPharmacyStock(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid expiry_days")
		return
	}
	r, err := h.service.PharmacyStock(f.ExpiryDays)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build pharmacy stock report")
		return
	}
	utils.Success(c, http.StatusOK, "pharmacy stock report fetched", r)
}

// GetDoctors godoc
// @Summary      Doctor-wise workload report
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/doctors [get]
func (h *Handler) GetDoctors(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.Doctors(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build doctor report")
		return
	}
	utils.Success(c, http.StatusOK, "doctor report fetched", r)
}

// GetPatients godoc
// @Summary      Patient statistics report
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/patients [get]
func (h *Handler) GetPatients(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.Patients(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build patient report")
		return
	}
	utils.Success(c, http.StatusOK, "patient report fetched", r)
}

// GetPanchakarma godoc
// @Summary      Panchakarma / treatment report
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/panchakarma [get]
func (h *Handler) GetPanchakarma(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.Panchakarma(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build Panchakarma report")
		return
	}
	utils.Success(c, http.StatusOK, "Panchakarma report fetched", r)
}

// GetReferrals godoc
// @Summary      Referral report
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/referrals [get]
func (h *Handler) GetReferrals(c *gin.Context) {
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	r, err := h.service.Referrals(f)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to build referral report")
		return
	}
	utils.Success(c, http.StatusOK, "referral report fetched", r)
}

// Export godoc
// @Summary      Export a report as CSV / Excel / print HTML
// @Description  query: report, format, from, to, department_id, group_by, expiry_days
// @Tags         reports
// @Security     BearerAuth
// @Router       /reports/export [get]
func (h *Handler) Export(c *gin.Context) {
	reportType := c.Query("report")
	format := c.Query("format")
	if reportType == "" {
		utils.Fail(c, http.StatusBadRequest, "report query parameter is required")
		return
	}
	if format == "" {
		format = "csv"
	}
	switch format {
	case "csv", "excel", "print", "pdf":
	default:
		utils.Fail(c, http.StatusBadRequest, "format must be csv, excel, pdf or print")
		return
	}
	f, err := parseFilters(c)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid date range")
		return
	}
	table, err := h.service.Table(reportType, f)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "unknown report type or failed to build table")
		return
	}
	if format == "print" {
		c.Data(http.StatusOK, "text/html; charset=utf-8", renderPrint(table))
		return
	}
	if err := writeExport(c.Writer, format, table); err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to render export")
	}
}
