package prescriptions

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the prescriptions Service.
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

// scopeFromContext extracts the DataScope injected by DataScopeMiddleware.
func scopeFromContext(c *gin.Context) *models.DataScope {
	if s, exists := c.Get("data_scope"); exists {
		if scope, ok := s.(*models.DataScope); ok {
			return scope
		}
	}
	return nil
}

// Create godoc
// @Summary      Create a prescription for an encounter
// @Description  Doctor writes medicines for an encounter. Status starts at PRESCRIBED.
// @Tags         prescriptions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Encounter ID"
// @Param        request body CreatePrescriptionRequest true "Prescription"
// @Success      201 {object} utils.APIResponse{data=PrescriptionResponse}
// @Router       /encounters/{id}/prescriptions [post]
func (h *Handler) Create(c *gin.Context) {
	encounterID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid encounter id")
		return
	}

	var req CreatePrescriptionRequest
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

	prescription, err := h.service.Create(encounterID, req, userID, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "encounter or doctor record not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "prescription created", toResponse(prescription))
	if h.audit != nil {
		_ = h.audit.Log(c, "prescription.create", "prescription", prescription.ID.String())
	}
}

// GetByEncounter godoc
// @Summary      Get the prescription for an encounter
// @Tags         prescriptions
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Encounter ID"
// @Success      200 {object} utils.APIResponse{data=PrescriptionResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /encounters/{id}/prescriptions [get]
func (h *Handler) GetByEncounter(c *gin.Context) {
	encounterID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid encounter id")
		return
	}
	prescription, err := h.service.GetByEncounterID(encounterID, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "no prescription found for this encounter")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch prescription")
		return
	}
	utils.Success(c, http.StatusOK, "prescription fetched", toResponse(prescription))
}

// Get godoc
// @Summary      Get a prescription by id
// @Tags         prescriptions
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Prescription ID"
// @Success      200 {object} utils.APIResponse{data=PrescriptionResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /prescriptions/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid prescription id")
		return
	}
	prescription, err := h.service.GetByID(id, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "prescription not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch prescription")
		return
	}
	utils.Success(c, http.StatusOK, "prescription fetched", toResponse(prescription))
}

// List godoc
// @Summary      List prescriptions for the pharmacy dispensing queue
// @Description  Returns the latest prescriptions optionally filtered by a
//               free-text search (patient name or UHID) and status.
// @Tags         prescriptions
// @Produce      json
// @Security     BearerAuth
// @Param        search query string false "Patient name or UHID"
// @Param        status query string false "PRESCRIBED / PARTIALLY_DISPENSED / DISPENSED"
// @Param        patient_id query string false "Filter by patient ID"
// @Success      200 {object} utils.APIResponse{data=[]PrescriptionListItem}
// @Router       /prescriptions [get]
func (h *Handler) List(c *gin.Context) {
	status := c.Query("status")
	if status != "" && status != models.PrescriptionPrescribed && status != models.PrescriptionPartiallyDispensed && status != models.PrescriptionDispensed {
		utils.Fail(c, http.StatusBadRequest, "invalid status filter")
		return
	}
	list, err := h.service.List(ListInput{
		Search:    strings.TrimSpace(c.Query("search")),
		Status:    status,
		PatientID: strings.TrimSpace(c.Query("patient_id")),
	}, scopeFromContext(c))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch prescriptions")
		return
	}
	resp := make([]PrescriptionListItem, 0, len(list))
	for i := range list {
		resp = append(resp, toListItem(&list[i]))
	}
	utils.Success(c, http.StatusOK, "prescriptions fetched", resp)
}

// Print godoc
// @Summary      Render a prescription as a printable HTML slip
// @Description  Returns a browser-printable HTML page with patient/doctor
//               details, medicine table and signature areas.
// @Tags         prescriptions
// @Produce      html
// @Security     BearerAuth
// @Param        id path string true "Prescription ID"
// @Success      200 {string} string "HTML document"
// @Failure      404 {object} utils.APIResponse
// @Router       /prescriptions/{id}/print [get]
func (h *Handler) Print(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid prescription id")
		return
	}

	p, err := h.service.GetByIDForPrint(id, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "prescription not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch prescription")
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, renderPrescriptionHTML(p))
	if h.audit != nil {
		_ = h.audit.Log(c, "prescription.print", "prescription", id.String())
	}
}

// renderPrescriptionHTML builds the printable HTML slip for a prescription.
func renderPrescriptionHTML(p *models.Prescription) string {
	enc := p.Encounter
	patient := enc.Patient
	department := enc.Department
	doctor := p.Doctor
	doctorUser := doctor.User

	dateStr := ""
	if !p.CreatedAt.IsZero() {
		dateStr = p.CreatedAt.Format("02 Jan 2006")
	}

	var rows strings.Builder
	for _, it := range p.Items {
		fmt.Fprintf(&rows, `<tr>
			<td>%s</td>
			<td>%s</td>
			<td>%s</td>
			<td>%s</td>
			<td>%s</td>
			<td>%d</td>
			<td>%s</td>
		</tr>`,
			htmlEscape(it.Medicine),
			htmlEscape(it.Formulation),
			htmlEscape(it.Dose),
			htmlEscape(it.Frequency+" "+it.Duration),
			htmlEscape(it.Route),
			it.Quantity,
			htmlEscape(it.Anupana),
		)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Prescription</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0}
  .hdr{border-bottom:3px double #333;padding-bottom:8px;text-align:center}
  .hdr h1{margin:0;font-size:20px}
  .hdr .sub{font-size:12px;color:#555}
  .meta{width:100%%;margin:14px 0;font-size:13px}
  .meta td{padding:3px 0}
  .meta .lbl{font-weight:bold;width:120px}
  table.items{width:100%%;border-collapse:collapse;font-size:12px;margin-top:8px}
  table.items th,table.items td{border:1px solid #888;padding:6px 8px;text-align:left}
  table.items th{background:#eee}
  .status{margin:12px 0;padding:8px 10px;border:1px solid #999;font-size:13px}
  .sig{margin-top:40px}
  .sig td{width:50%%;padding-top:6px}
  .sig .line{border-top:1px solid #333;width:220px;display:inline-block;font-size:13px}
  .foot{margin-top:40px;border-top:1px solid #999;font-size:12px;color:#555;text-align:center}
  @media print{@page{margin:12mm}}
</style>
</head>
<body>
  <div class="hdr">
    <h1>Maitri College of Ayurvedic Medical &amp; Research Institute</h1>
    <div class="sub">Ayurvedic Hospital &amp; Research Centre (Anjora, Durg, C.G.)</div>
    <strong>Prescription</strong>
  </div>

  <table class="meta">
    <tr><td class="lbl">Prescription ID</td><td>%s</td><td class="lbl">Date</td><td>%s</td></tr>
    <tr><td class="lbl">Patient</td><td>%s</td><td class="lbl">UHID</td><td>%s</td></tr>
    <tr><td class="lbl">Age / Sex</td><td>%d yrs / %s</td><td class="lbl">Department</td><td>%s</td></tr>
    <tr><td class="lbl">Doctor</td><td>%s</td><td class="lbl">Qualification</td><td>%s</td></tr>
  </table>

  <div class="status">Prescription Status: <strong>%s</strong></div>

  <table>
    <thead>
      <tr><th>S</th><th>Medicine</th><th>Formulation</th><th>Dose</th><th>Freq / Duration</th><th>Qty</th><th>Anupana</th></tr>
    </thead>
    <tbody>%s</tbody>
  </table>

  <div class="sig">
    <div style="float:right;text-align:center"><span class="line">Doctor&rsquo;s Signature</span></div>
    <div style="clear:both"></div>
  </div>

  <div class="foot">This is a computer-generated prescription. &mdash; Generated %s</div>
</body>
</html>`,
		htmlEscape(p.ID.String()),
		dateStr,
		htmlEscape(patient.FullName),
		htmlEscape(patient.UHID),
		patient.Age,
		htmlEscape(patient.Gender),
		htmlEscape(department.Name),
		htmlEscape(doctorUser.FullName),
		htmlEscape(doctor.Qualification),
		htmlEscape(p.Status),
		rows.String(),
		time.Now().Format("02 Jan 2006 15:04"),
	)
}

// htmlEscape escapes characters for safe embedding into HTML.
func htmlEscape(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&#34;", "'", "&#39;")
	return r.Replace(s)
}

// UpdateStatus godoc
// @Summary      Update prescription status (dispensing progress)
// @Description  Marks PRESCRIBED → PARTIALLY_DISPENSED → DISPENSED.
// @Tags         prescriptions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Prescription ID"
// @Param        request body UpdatePrescriptionStatusRequest true "New status"
// @Success      200 {object} utils.APIResponse{data=PrescriptionResponse}
// @Router       /prescriptions/{id}/status [patch]
func (h *Handler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid prescription id")
		return
	}

	var req UpdatePrescriptionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	prescription, err := h.service.UpdateStatus(id, req.Status, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "prescription not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "prescription status updated", toResponse(prescription))
	if h.audit != nil {
		_ = h.audit.Log(c, "prescription.update_status", "prescription", id.String())
	}
}
