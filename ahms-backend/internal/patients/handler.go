package patients

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the patients Service.
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

func toResponse(p *models.Patient) PatientResponse {
	dob := ""
	if p.DOB != nil {
		dob = p.DOB.Format("2006-01-02")
	}
	return PatientResponse{
		ID:   p.ID.String(),
		UHID: p.UHID,

		FullName: p.FullName,
		Gender:   p.Gender,
		DOB:      dob,
		Age:      p.Age,

		Mobile:          p.Mobile,
		AlternateMobile: p.AlternateMobile,
		Email:           p.Email,
		BloodGroup:      p.BloodGroup,
		MaritalStatus:   p.MaritalStatus,
		Occupation:      p.Occupation,
		PhotoURL:        p.PhotoURL,

		Address:  p.Address,
		City:     p.City,
		State:    p.State,
		District: p.District,
		Pincode:  p.Pincode,
		Country:  p.Country,

		EmergencyContactName:     p.EmergencyContactName,
		EmergencyContactRelation: p.EmergencyContactRelation,
		EmergencyContact:         p.EmergencyContact,
		EmergencyContactAddress:  p.EmergencyContactAddress,

		HeightCm:          p.HeightCm,
		WeightKg:          p.WeightKg,
		BMI:               p.BMI,
		BloodPressure:     p.BloodPressure,
		Pulse:             p.Pulse,
		Sugar:             p.Sugar,
		Allergies:         p.Allergies,
		ChronicDiseases:   p.ChronicDiseases,
		CurrentMedication: p.CurrentMedication,

		RegistrationType: p.RegistrationType,
		ReferredBy:       p.ReferredBy,
		Branch:           p.Branch,
		Remarks:          p.Remarks,

		IsActive:  p.IsActive,
		CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// List godoc
// @Summary      List / search patients
// @Description  Optional ?search= matches full name, mobile, or UHID.
// @Tags         patients
// @Produce      json
// @Security     BearerAuth
// @Param        search query string false "Search term"
// @Success      200 {object} utils.APIResponse{data=[]PatientResponse}
// @Router       /patients [get]
func (h *Handler) List(c *gin.Context) {
	search := c.Query("search")
	patientsList, err := h.service.List(search)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch patients")
		return
	}
	resp := make([]PatientResponse, 0, len(patientsList))
	for i := range patientsList {
		resp = append(resp, toResponse(&patientsList[i]))
	}
	utils.Success(c, http.StatusOK, "patients fetched", resp)
}

// Get godoc
// @Summary      Get a patient by id
// @Tags         patients
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Patient ID"
// @Success      200 {object} utils.APIResponse{data=PatientResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /patients/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	patient, err := h.service.GetByID(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "patient not found")
		return
	}
	utils.Success(c, http.StatusOK, "patient fetched", toResponse(patient))
}

// Create godoc
// @Summary      Register a new patient (auto-generates UHID)
// @Description  If a patient already exists with the same mobile and force=false, responds 409 with the existing matches so the receptionist can confirm before re-submitting with force=true.
// @Tags         patients
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreatePatientRequest true "Patient"
// @Success      201 {object} utils.APIResponse{data=PatientResponse}
// @Failure      400 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse{data=DuplicateMobileResponse}
// @Router       /patients [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreatePatientRequest
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

	patient, duplicates, err := h.service.Create(req, userID)
	if err != nil {
		if errors.Is(err, ErrDuplicateMobile) {
			dupResp := make([]PatientResponse, 0, len(duplicates))
			for i := range duplicates {
				dupResp = append(dupResp, toResponse(&duplicates[i]))
			}
			c.JSON(http.StatusConflict, utils.APIResponse{
				Success: false,
				Error:   "duplicate mobile number detected",
				Data: DuplicateMobileResponse{
					Message:          "One or more patients already exist with this mobile number. Resubmit with force=true to register anyway.",
					ExistingPatients: dupResp,
				},
			})
			return
		}
		utils.Fail(c, http.StatusBadRequest, "failed to register patient: "+err.Error())
		return
	}

	utils.Success(c, http.StatusCreated, "patient registered", toResponse(patient))
	if h.audit != nil {
		_ = h.audit.Log(c, "patient.create", "patient", patient.ID.String())
	}
}

// Update godoc
// @Summary      Update a patient
// @Tags         patients
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Patient ID"
// @Param        request body UpdatePatientRequest true "Patient"
// @Success      200 {object} utils.APIResponse{data=PatientResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /patients/{id} [put]
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}

	var req UpdatePatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	patient, err := h.service.Update(id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "patient not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, "failed to update patient: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "patient updated", toResponse(patient))
	if h.audit != nil {
		_ = h.audit.Log(c, "patient.update", "patient", id.String())
	}
}

// Delete godoc
// @Summary      Delete (deactivate) a patient
// @Tags         patients
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Patient ID"
// @Success      200 {object} utils.APIResponse
// @Failure      404 {object} utils.APIResponse
// @Router       /patients/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	if err := h.service.Delete(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "patient not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to delete patient")
		return
	}
	utils.Success(c, http.StatusOK, "patient deleted", nil)
}
