package portal

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the portal Service.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func patientIDFrom(c *gin.Context) uuid.UUID {
	id, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		return uuid.Nil
	}
	return id
}

// Login godoc
// @Summary      Patient login with UHID + mobile
// @Description  Issues a patient-scoped JWT. Patients have no password; the UHID + registered mobile number identify them.
// @Tags         portal
// @Accept       json
// @Produce      json
// @Param        request body PatientLoginRequest true "Credentials"
// @Success      200 {object} utils.APIResponse{data=LoginResponse}
// @Failure      401 {object} utils.APIResponse
// @Router       /portal/login [post]
func (h *Handler) Login(c *gin.Context) {
	var req PatientLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	result, err := h.service.Login(req.UHID, req.Mobile)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			utils.Fail(c, http.StatusUnauthorized, "invalid UHID or mobile number")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "login failed, please try again")
		return
	}
	utils.Success(c, http.StatusOK, "login successful", result)
}

// Profile godoc
// @Summary      Get the logged-in patient's profile
// @Tags         portal
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=ProfileResponse}
// @Router       /portal/profile [get]
func (h *Handler) Profile(c *gin.Context) {
	profile, err := h.service.Profile(patientIDFrom(c))
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "patient not found")
		return
	}
	utils.Success(c, http.StatusOK, "profile fetched", profile)
}

// Appointments godoc
// @Summary      List the patient's own appointments
// @Tags         portal
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]PortalAppointmentResponse}
// @Router       /portal/appointments [get]
func (h *Handler) Appointments(c *gin.Context) {
	list, err := h.service.Appointments(patientIDFrom(c))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch appointments")
		return
	}
	utils.Success(c, http.StatusOK, "appointments fetched", list)
}

// BookAppointment godoc
// @Summary      Book an appointment for yourself
// @Tags         portal
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body BookAppointmentRequest true "Appointment"
// @Success      201 {object} utils.APIResponse{data=PortalAppointmentResponse}
// @Failure      400 {object} utils.APIResponse
// @Router       /portal/appointments [post]
func (h *Handler) BookAppointment(c *gin.Context) {
	var req BookAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}
	appt, err := h.service.BookAppointment(patientIDFrom(c), req)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "appointment booked", appt)
}

// Prescriptions godoc
// @Summary      List the patient's own prescriptions (with dispensed status)
// @Tags         portal
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]PortalPrescriptionResponse}
// @Router       /portal/prescriptions [get]
func (h *Handler) Prescriptions(c *gin.Context) {
	list, err := h.service.Prescriptions(patientIDFrom(c))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch prescriptions")
		return
	}
	utils.Success(c, http.StatusOK, "prescriptions fetched", list)
}

// Bills godoc
// @Summary      List the patient's own bills with outstanding balance
// @Tags         portal
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]PortalBillResponse}
// @Router       /portal/bills [get]
func (h *Handler) Bills(c *gin.Context) {
	list, err := h.service.Bills(patientIDFrom(c))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch bills")
		return
	}
	utils.Success(c, http.StatusOK, "bills fetched", list)
}
