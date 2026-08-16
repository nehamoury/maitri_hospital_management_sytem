package ipd

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the IPD Service.
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

func currentUserID(c *gin.Context) (uuid.UUID, error) {
	raw, _ := c.Get("user_id")
	return uuid.Parse(raw.(string))
}

func invalidParam(c *gin.Context) {
	utils.Fail(c, http.StatusBadRequest, "invalid id parameter")
}

func serverErr(c *gin.Context, msg string, err error) {
	if errors.Is(err, ErrNotFound) {
		utils.Fail(c, http.StatusNotFound, "record not found")
		return
	}
	if errors.Is(err, ErrInvalidState) {
		utils.Fail(c, http.StatusConflict, "invalid state transition for this record")
		return
	}
	utils.Fail(c, http.StatusInternalServerError, msg)
}

func scopeFromContext(c *gin.Context) *models.DataScope {
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

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------

func toBedResponse(b *models.Bed) BedResponse {
	return BedResponse{
		ID:       b.ID.String(),
		WardID:   b.WardID.String(),
		WardName: b.Ward.Name,
		BedNo:    b.BedNo,
		BedType:  b.BedType,
		Status:   b.Status,
		IsActive: b.IsActive,
	}
}

func toWardResponse(w *models.Ward, withBeds bool) WardResponse {
	resp := WardResponse{
		ID:         w.ID.String(),
		Code:       w.Code,
		Name:       w.Name,
		Location:   w.Location,
		IsActive:   w.IsActive,
		TotalBeds:  len(w.Beds),
	}
	if w.DepartmentID != nil {
		did := w.DepartmentID.String()
		resp.DepartmentID = &did
	}
	if w.Department != nil {
		resp.DepartmentName = w.Department.Name
	}
	for i := range w.Beds {
		b := &w.Beds[i]
		switch b.Status {
		case models.BedAvailable:
			resp.AvailableBeds++
		case models.BedOccupied:
			resp.OccupiedBeds++
		case models.BedReserved:
			resp.ReservedBeds++
		case models.BedMaintenance:
			resp.MaintenanceBeds++
		}
		if withBeds {
			resp.Beds = append(resp.Beds, toBedResponse(b))
		}
	}
	return resp
}

func ageStr(p models.Patient) string {
	if p.Age > 0 {
		return strconv.Itoa(p.Age)
	}
	if p.DOB != nil {
		return strconv.Itoa(int(time.Since(*p.DOB).Hours() / 24 / 365))
	}
	return ""
}

func toAdmissionItem(a *models.Admission) AdmissionItemResponse {
	resp := AdmissionItemResponse{
		ID:            a.ID.String(),
		AdmissionNo:   a.AdmissionNo,
		PatientID:     a.PatientID.String(),
		UHID:          a.Patient.UHID,
		PatientName:   a.Patient.FullName,
		Gender:        a.Patient.Gender,
		Age:           ageStr(a.Patient),
		DepartmentID:  a.DepartmentID.String(),
		DepartmentName: a.Department.Name,
		DoctorID:      a.DoctorID.String(),
		DoctorName:    a.Doctor.User.FullName,
		AdmissionType: a.AdmissionType,
		AdmissionDate: a.AdmissionDate.Format("2006-01-02"),
		Reason:        a.Reason,
		Status:        a.Status,
		CreatedAt:     fmtTime(a.CreatedAt),
	}
	if a.Bed != nil {
		resp.BedID = a.BedID.String()
		resp.BedNo = a.Bed.BedNo
		resp.WardName = a.Bed.Ward.Name
	}
	return resp
}

func toNoteResponse(n *models.ProgressNote) NoteResponse {
	return NoteResponse{
		ID:         n.ID.String(),
		NoteType:   n.NoteType,
		Notes:      n.Notes,
		Shift:      n.Shift,
		Vitals:     n.Vitals,
		RecordedBy: n.RecordedBy.FullName,
		CreatedAt:  fmtTime(n.CreatedAt),
	}
}

func toOrderResponse(o *models.AdmissionOrder) OrderResponse {
	return OrderResponse{
		ID:          o.ID.String(),
		OrderType:   o.OrderType,
		Description: o.Description,
		Frequency:   o.Frequency,
		Quantity:    o.Quantity,
		Notes:       o.Notes,
		Status:      o.Status,
		OrderedBy:   o.OrderedBy.FullName,
		CreatedAt:   fmtTime(o.CreatedAt),
	}
}

func toDietResponse(d *models.DietOrder) DietResponse {
	return DietResponse{
		ID:           d.ID.String(),
		DietType:     d.DietType,
		Schedule:     d.Schedule,
		Instructions: d.Instructions,
		Status:       d.Status,
		OrderedBy:    d.OrderedBy.FullName,
		CreatedAt:    fmtTime(d.CreatedAt),
	}
}

func toBedHistoryResponse(h *models.AdmissionBed) BedHistoryResponse {
	resp := BedHistoryResponse{
		ID:        h.ID.String(),
		BedID:     h.BedID.String(),
		BedNo:     h.Bed.BedNo,
		WardName:  h.Bed.Ward.Name,
		FromDate:  fmtTime(h.FromDate),
		Reason:    h.Reason,
		ChangedBy: h.ChangedBy.FullName,
	}
	if h.ToDate != nil {
		resp.ToDate = fmtTime(*h.ToDate)
	}
	return resp
}

func toDischargeResponse(d *models.DischargeSummary) *DischargeResponse {
	if d == nil {
		return nil
	}
	return &DischargeResponse{
		DischargeType:        d.DischargeType,
		FinalDiagnosis:       d.FinalDiagnosis,
		TreatmentGiven:       d.TreatmentGiven,
		ProceduresDone:       d.ProceduresDone,
		MedicinesAtDischarge: d.MedicinesAtDischarge,
		FollowUpInstructions: d.FollowUpInstructions,
		FollowUpDate:         fmtDate(d.FollowUpDate),
		Summary:              d.Summary,
		DischargeNotes:       d.DischargeNotes,
	}
}

func toAdmissionResponse(a *models.Admission) AdmissionResponse {
	resp := AdmissionResponse{
		ID:                   a.ID.String(),
		AdmissionNo:          a.AdmissionNo,
		PatientID:            a.PatientID.String(),
		UHID:                 a.Patient.UHID,
		PatientName:          a.Patient.FullName,
		Gender:               a.Patient.Gender,
		Age:                  ageStr(a.Patient),
		DepartmentID:         a.DepartmentID.String(),
		DepartmentName:       a.Department.Name,
		DoctorID:             a.DoctorID.String(),
		DoctorName:           a.Doctor.User.FullName,
		AdmissionType:        a.AdmissionType,
		AdmissionDate:        a.AdmissionDate.Format("2006-01-02"),
		AdmissionTime:        a.AdmissionTime,
		Reason:               a.Reason,
		Diagnosis:            a.Diagnosis,
		Notes:                a.Notes,
		ExpectedDischargeDate: fmtDate(a.ExpectedDischargeDate),
		Status:               a.Status,
		AdmittedBy:           a.AdmittedBy.FullName,
		CreatedAt:            fmtTime(a.CreatedAt),
		Discharge:            toDischargeResponse(a.Discharge),
	}
	if a.Bed != nil {
		resp.BedID = a.BedID.String()
		resp.BedNo = a.Bed.BedNo
		resp.BedType = a.Bed.BedType
		resp.WardName = a.Bed.Ward.Name
	}
	if a.DischargedAt != nil {
		resp.DischargedAt = fmtTime(*a.DischargedAt)
	}
	if a.DischargedBy != nil {
		resp.DischargedBy = a.DischargedBy.FullName
	}
	// Preload slices may be nil; always emit [] rather than JSON null so
	// clients can rely on array shapes (see AdmissionDetail/PatientDetail).
	resp.NotesList = make([]NoteResponse, 0, len(a.ProgressNotes))
	resp.OrdersList = make([]OrderResponse, 0, len(a.Orders))
	resp.DietList = make([]DietResponse, 0, len(a.DietOrders))
	resp.BedHistory = make([]BedHistoryResponse, 0, len(a.BedHistory))
	for i := range a.ProgressNotes {
		resp.NotesList = append(resp.NotesList, toNoteResponse(&a.ProgressNotes[i]))
	}
	for i := range a.Orders {
		resp.OrdersList = append(resp.OrdersList, toOrderResponse(&a.Orders[i]))
	}
	for i := range a.DietOrders {
		resp.DietList = append(resp.DietList, toDietResponse(&a.DietOrders[i]))
	}
	for i := range a.BedHistory {
		resp.BedHistory = append(resp.BedHistory, toBedHistoryResponse(&a.BedHistory[i]))
	}
	return resp
}

// ---------------------------------------------------------------------------
// Wards & beds
// ---------------------------------------------------------------------------

// ListWards godoc
// @Summary      List wards with live bed statistics
// @Tags         ipd
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]WardResponse}
// @Router       /wards [get]
func (h *Handler) ListWards(c *gin.Context) {
	wards, err := h.service.ListWards()
	if err != nil {
		serverErr(c, "failed to fetch wards", err)
		return
	}
	resp := make([]WardResponse, 0, len(wards))
	for i := range wards {
		resp = append(resp, toWardResponse(&wards[i], true))
	}
	utils.Success(c, http.StatusOK, "wards fetched", resp)
}

// GetWard godoc
// @Summary      Get a ward with its beds
// @Security     BearerAuth
// @Param        id path string true "Ward ID"
// @Router       /wards/{id} [get]
func (h *Handler) GetWard(c *gin.Context) {
	w, err := h.service.GetWard(c.Param("id"))
	if err != nil {
		serverErr(c, "failed to fetch ward", err)
		return
	}
	utils.Success(c, http.StatusOK, "ward fetched", toWardResponse(w, true))
}

// CreateWard godoc
// @Summary      Create a ward
// @Security     BearerAuth
// @Router       /wards [post]
func (h *Handler) CreateWard(c *gin.Context) {
	var req WardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	w, err := h.service.CreateWard(req)
	if err != nil {
		serverErr(c, "failed to create ward", err)
		return
	}
	utils.Success(c, http.StatusCreated, "ward created", toWardResponse(w, false))
	h.logAudit(c, "ward.create", "ward", w.ID.String())
}

// UpdateWard godoc
// @Summary      Update a ward
// @Security     BearerAuth
// @Param        id path string true "Ward ID"
// @Router       /wards/{id} [put]
func (h *Handler) UpdateWard(c *gin.Context) {
	var req WardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	w, err := h.service.UpdateWard(c.Param("id"), req)
	if err != nil {
		serverErr(c, "failed to update ward", err)
		return
	}
	utils.Success(c, http.StatusOK, "ward updated", toWardResponse(w, false))
	h.logAudit(c, "ward.update", "ward", w.ID.String())
}

// ListBeds godoc
// @Summary      List beds (filter by ward_id and status)
// @Security     BearerAuth
// @Param        ward_id query string false "Ward ID"
// @Param        status query string false "AVAILABLE|OCCUPIED|RESERVED|MAINTENANCE"
// @Router       /beds [get]
func (h *Handler) ListBeds(c *gin.Context) {
	beds, err := h.service.ListBeds(c.Query("ward_id"), c.Query("status"))
	if err != nil {
		serverErr(c, "failed to fetch beds", err)
		return
	}
	resp := make([]BedResponse, 0, len(beds))
	for i := range beds {
		resp = append(resp, toBedResponse(&beds[i]))
	}
	utils.Success(c, http.StatusOK, "beds fetched", resp)
}

// CreateBed godoc
// @Summary      Create a bed
// @Security     BearerAuth
// @Router       /beds [post]
func (h *Handler) CreateBed(c *gin.Context) {
	var req BedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	b, err := h.service.CreateBed(req)
	if err != nil {
		serverErr(c, "failed to create bed", err)
		return
	}
	utils.Success(c, http.StatusCreated, "bed created", toBedResponse(b))
	h.logAudit(c, "bed.create", "bed", b.ID.String())
}

// UpdateBed godoc
// @Summary      Update a bed
// @Security     BearerAuth
// @Param        id path string true "Bed ID"
// @Router       /beds/{id} [put]
func (h *Handler) UpdateBed(c *gin.Context) {
	var req BedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	b, err := h.service.UpdateBed(c.Param("id"), req)
	if err != nil {
		serverErr(c, "failed to update bed", err)
		return
	}
	utils.Success(c, http.StatusOK, "bed updated", toBedResponse(b))
	h.logAudit(c, "bed.update", "bed", b.ID.String())
}

// SetBedStatus godoc
// @Summary      Set a bed's status (available/reserved/maintenance)
// @Security     BearerAuth
// @Param        id path string true "Bed ID"
// @Router       /beds/{id}/status [put]
func (h *Handler) SetBedStatus(c *gin.Context) {
	var req BedStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	b, err := h.service.SetBedStatus(c.Param("id"), req.Status)
	if err != nil {
		serverErr(c, "failed to update bed status", err)
		return
	}
	utils.Success(c, http.StatusOK, "bed status updated", toBedResponse(b))
	h.logAudit(c, "bed.status", "bed", b.ID.String())
}

// WardOccupancy godoc
// @Summary      Ward-wise bed occupancy snapshot
// @Security     BearerAuth
// @Router       /wards/occupancy [get]
func (h *Handler) WardOccupancy(c *gin.Context) {
	rows, err := h.service.WardOccupancy()
	if err != nil {
		serverErr(c, "failed to fetch occupancy", err)
		return
	}
	utils.Success(c, http.StatusOK, "occupancy fetched", rows)
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

// ListAdmissions godoc
// @Summary      List admissions (filter by status/patient/department/ward/search)
// @Security     BearerAuth
// @Param        status query string false "ADMITTED|TRANSFERRED|DISCHARGED|CANCELLED"
// @Param        patient_id query string false "Patient ID"
// @Param        department_id query string false "Department ID"
// @Param        ward_id query string false "Ward ID"
// @Param        q query string false "Search admission no / patient name / UHID"
// @Router       /admissions [get]
func (h *Handler) ListAdmissions(c *gin.Context) {
	f := AdmissionFilter{
		Status:     c.Query("status"),
		PatientID:  c.Query("patient_id"),
		Department: c.Query("department_id"),
		Ward:       c.Query("ward_id"),
		Search:     c.Query("q"),
	}
	list, err := h.service.ListAdmissions(f, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to fetch admissions", err)
		return
	}
	resp := make([]AdmissionItemResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toAdmissionItem(&list[i]))
	}
	utils.Success(c, http.StatusOK, "admissions fetched", resp)
}

// GetAdmission godoc
// @Summary      Get an admission with its full IPD chart
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Router       /admissions/{id} [get]
func (h *Handler) GetAdmission(c *gin.Context) {
	a, err := h.service.GetAdmission(c.Param("id"), scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to fetch admission", err)
		return
	}
	utils.Success(c, http.StatusOK, "admission fetched", toAdmissionResponse(a))
}

// Admit godoc
// @Summary      Admit a patient to IPD (auto-generates admission number + IPD encounter)
// @Security     BearerAuth
// @Router       /admissions [post]
func (h *Handler) Admit(c *gin.Context) {
	var req AdmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, err := currentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}
	a, err := h.service.Admit(req, userID)
	if err != nil {
		serverErr(c, "failed to admit patient", err)
		return
	}
	utils.Success(c, http.StatusCreated, "patient admitted", toAdmissionResponse(a))
	h.logAudit(c, "admission.create", "admission", a.ID.String())
}

// UpdateAdmission godoc
// @Summary      Update admission details or cancel an admission
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Router       /admissions/{id} [put]
func (h *Handler) UpdateAdmission(c *gin.Context) {
	var req UpdateAdmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, err := currentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}
	a, err := h.service.UpdateAdmission(c.Param("id"), req, userID, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to update admission", err)
		return
	}
	utils.Success(c, http.StatusOK, "admission updated", toAdmissionResponse(a))
	h.logAudit(c, "admission.update", "admission", a.ID.String())
}

// TransferBed godoc
// @Summary      Transfer an admission to another bed
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Router       /admissions/{id}/transfer [post]
func (h *Handler) TransferBed(c *gin.Context) {
	var req TransferBedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, err := currentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}
	a, err := h.service.TransferBed(c.Param("id"), req, userID, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to transfer bed", err)
		return
	}
	utils.Success(c, http.StatusOK, "bed transferred", toAdmissionResponse(a))
	h.logAudit(c, "admission.transfer", "admission", a.ID.String())
}

// AddNote godoc
// @Summary      Add a progress note (assessment/round/nurse/vital)
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Router       /admissions/{id}/notes [post]
func (h *Handler) AddNote(c *gin.Context) {
	var req NoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, err := currentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}
	n, err := h.service.AddNote(c.Param("id"), req, userID, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to add note", err)
		return
	}
	utils.Success(c, http.StatusCreated, "note added", toNoteResponse(n))
	h.logAudit(c, "note.create", "admission", c.Param("id"))
}

// AddOrder godoc
// @Summary      Add a clinical order (medicine/treatment/investigation)
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Router       /admissions/{id}/orders [post]
func (h *Handler) AddOrder(c *gin.Context) {
	var req OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, err := currentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}
	o, err := h.service.AddOrder(c.Param("id"), req, userID, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to add order", err)
		return
	}
	utils.Success(c, http.StatusCreated, "order added", toOrderResponse(o))
	h.logAudit(c, "order.create", "admission", c.Param("id"))
}

// UpdateOrderStatus godoc
// @Summary      Update a clinical order's status
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Param        oid path string true "Order ID"
// @Router       /admissions/{id}/orders/{oid}/status [put]
func (h *Handler) UpdateOrderStatus(c *gin.Context) {
	var req OrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	o, err := h.service.UpdateOrderStatus(c.Param("id"), c.Param("oid"), req, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to update order", err)
		return
	}
	utils.Success(c, http.StatusOK, "order updated", toOrderResponse(o))
	h.logAudit(c, "order.update", "admission", c.Param("id"))
}

// AddDiet godoc
// @Summary      Add a diet order for an admission
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Router       /admissions/{id}/diet [post]
func (h *Handler) AddDiet(c *gin.Context) {
	var req DietRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, err := currentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}
	d, err := h.service.AddDiet(c.Param("id"), req, userID, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to add diet order", err)
		return
	}
	utils.Success(c, http.StatusCreated, "diet order added", toDietResponse(d))
	h.logAudit(c, "diet.create", "admission", c.Param("id"))
}

// Discharge godoc
// @Summary      Discharge an admission (writes summary + releases the bed)
// @Security     BearerAuth
// @Param        id path string true "Admission ID"
// @Router       /admissions/{id}/discharge [post]
func (h *Handler) Discharge(c *gin.Context) {
	var req DischargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	userID, err := currentUserID(c)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}
	a, err := h.service.Discharge(c.Param("id"), req, userID, scopeFromContext(c))
	if err != nil {
		serverErr(c, "failed to discharge patient", err)
		return
	}
	utils.Success(c, http.StatusOK, "patient discharged", toAdmissionResponse(a))
	h.logAudit(c, "admission.discharge", "admission", a.ID.String())
}

func (h *Handler) logAudit(c *gin.Context, action, entityType, entityID string) {
	if h.audit != nil {
		_ = h.audit.Log(c, action, entityType, entityID)
	}
}