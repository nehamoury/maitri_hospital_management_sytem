package appointments

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

// Handler wires HTTP requests to the appointments Service.
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

func toResponse(a *models.Appointment) AppointmentResponse {
	return AppointmentResponse{
		ID:              a.ID.String(),
		PatientID:       a.PatientID.String(),
		PatientName:     a.Patient.FullName,
		PatientUHID:     a.Patient.UHID,
		DoctorID:        a.DoctorID.String(),
		DoctorName:      a.Doctor.User.FullName,
		AppointmentDate: a.AppointmentDate.Format("2006-01-02"),
		TokenNumber:     a.TokenNumber,
		Status:          a.Status,
		Reason:          a.Reason,
		CreatedAt:       a.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// List godoc
// @Summary      List appointments (optionally filter by doctor, patient, date)
// @Tags         appointments
// @Produce      json
// @Security     BearerAuth
// @Param        doctor_id query string false "Doctor ID"
// @Param        patient_id query string false "Patient ID"
// @Param        date query string false "Date (YYYY-MM-DD)"
// @Success      200 {object} utils.APIResponse{data=[]AppointmentResponse}
// @Router       /appointments [get]
func (h *Handler) List(c *gin.Context) {
	var doctorID, patientID *uuid.UUID
	var date *time.Time

	if v := c.Query("doctor_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			utils.Fail(c, http.StatusBadRequest, "invalid doctor_id")
			return
		}
		doctorID = &id
	}
	if v := c.Query("patient_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			utils.Fail(c, http.StatusBadRequest, "invalid patient_id")
			return
		}
		patientID = &id
	}
	if v := c.Query("date"); v != "" {
		d, err := time.Parse("2006-01-02", v)
		if err != nil {
			utils.Fail(c, http.StatusBadRequest, "invalid date, expected YYYY-MM-DD")
			return
		}
		date = &d
	}

	appts, err := h.service.List(doctorID, patientID, date)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch appointments")
		return
	}
	resp := make([]AppointmentResponse, 0, len(appts))
	for i := range appts {
		resp = append(resp, toResponse(&appts[i]))
	}
	utils.Success(c, http.StatusOK, "appointments fetched", resp)
}

// Get godoc
// @Summary      Get an appointment by id
// @Tags         appointments
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Appointment ID"
// @Success      200 {object} utils.APIResponse{data=AppointmentResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /appointments/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid appointment id")
		return
	}
	appt, err := h.service.GetByID(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "appointment not found")
		return
	}
	utils.Success(c, http.StatusOK, "appointment fetched", toResponse(appt))
}

// Create godoc
// @Summary      Book an appointment (auto-generates the queue token number)
// @Tags         appointments
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateAppointmentRequest true "Appointment"
// @Success      201 {object} utils.APIResponse{data=AppointmentResponse}
// @Failure      400 {object} utils.APIResponse
// @Router       /appointments [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreateAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	userIDRaw, _ := c.Get("user_id")
	userID, err := uuid.Parse(userIDRaw.(string))
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}

	appt, err := h.service.Book(req, userID)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "failed to book appointment: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "appointment booked", toResponse(appt))
	if h.audit != nil {
		_ = h.audit.Log(c, "appointment.create", "appointment", appt.ID.String())
	}
}

// UpdateStatus godoc
// @Summary      Update an appointment's status
// @Tags         appointments
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Appointment ID"
// @Param        request body UpdateAppointmentStatusRequest true "Status"
// @Success      200 {object} utils.APIResponse{data=AppointmentResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /appointments/{id}/status [put]
func (h *Handler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid appointment id")
		return
	}

	var req UpdateAppointmentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	appt, err := h.service.UpdateStatus(id, req.Status)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "appointment not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to update appointment status")
		return
	}
	utils.Success(c, http.StatusOK, "appointment status updated", toResponse(appt))
}

// PublicCreate handles POST /api/v1/public/appointments (no auth required).
func (h *Handler) PublicCreate(c *gin.Context) {
	var req PublicAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	appt, err := h.service.PublicBook(req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "failed to book appointment: "+err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "appointment booked", toResponse(appt))
}
