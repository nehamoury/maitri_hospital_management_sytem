package patients

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the patients Service.
type Handler struct {
	service   Service
	audit     *audit.Recorder
	uploadDir string
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// SetAuditRecorder attaches the audit recorder used to log data changes.
func (h *Handler) SetAuditRecorder(r *audit.Recorder) { h.audit = r }

// SetUploadDir sets the base directory used to persist patient photos.
func (h *Handler) SetUploadDir(dir string) { h.uploadDir = dir }

// toResponse builds a PatientResponse with sensitive government/other
// identifiers masked. Registration/administration roles get the unmasked
// form via toResponseWithIDs.
func toResponse(p *models.Patient) PatientResponse {
	return toResponseWithIDs(p, false)
}

// toResponseWithIDs builds a PatientResponse, exposing full government/
// other identifiers only when expose is true (see Handler.canExposeIDs).
func toResponseWithIDs(p *models.Patient, expose bool) PatientResponse {
	dob := ""
	if p.DOB != nil {
		dob = p.DOB.Format("2006-01-02")
	}
	resp := PatientResponse{
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

	// Government/other identifiers: only the type is never sensitive; the
	// numbers are masked unless the caller may expose them.
	resp.OtherIDType = p.OtherIDType
	if expose {
		resp.AadhaarNo = p.AadhaarNo
		resp.PanNo = p.PanNo
		resp.AbhaID = p.AbhaID
		resp.OtherIDNumber = p.OtherIDNumber
	} else {
		resp.AadhaarNo = maskSensitiveID(p.AadhaarNo)
		resp.PanNo = maskSensitiveID(p.PanNo)
		resp.AbhaID = maskSensitiveID(p.AbhaID)
		resp.OtherIDNumber = maskSensitiveID(p.OtherIDNumber)
	}
	return resp
}

// maskSensitiveID keeps only the last four characters of an identifier,
// e.g. "123412341234" -> "****1234". Empty values stay empty.
func maskSensitiveID(s string) string {
	if len(s) <= 4 {
		if s == "" {
			return ""
		}
		return "****"
	}
	return "****" + s[len(s)-4:]
}

// canExposeIDs reports whether the caller may see unmasked government/
// other identifiers. Only front-desk registration and administration
// roles are trusted with the full values; clinical and other staff get
// masked numbers.
func (h *Handler) canExposeIDs(c *gin.Context) bool {
	role, _ := c.Get("role_name")
	return role == models.RoleSuperAdmin || role == models.RoleHospitalAdmin || role == models.RoleReceptionist
}

// scopeFromContext extracts the DataScope injected by DataScopeMiddleware.
func scopeFromContext(c *gin.Context) *models.DataScope {
	if s, exists := c.Get("data_scope"); exists {
		if scope, ok := s.(*models.DataScope); ok {
			return scope
		}
	}
	return nil
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
	patientsList, err := h.service.List(search, scopeFromContext(c))
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch patients")
		return
	}
	resp := make([]PatientResponse, 0, len(patientsList))
	expose := h.canExposeIDs(c)
	for i := range patientsList {
		resp = append(resp, toResponseWithIDs(&patientsList[i], expose))
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
	patient, err := h.service.GetByID(id, scopeFromContext(c))
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "patient not found")
		return
	}
	utils.Success(c, http.StatusOK, "patient fetched", toResponseWithIDs(patient, h.canExposeIDs(c)))
}

// Photo godoc
// @Summary      Get a patient's photo
// @Description  Streams the patient photo with authorization. Photos are
//               never served from a public static path.
// @Tags         patients
// @Produce      image/*
// @Security     BearerAuth
// @Param        id path string true "Patient ID"
// @Success      200
// @Failure      404 {object} utils.APIResponse
// @Router       /patients/{id}/photo [get]
func (h *Handler) Photo(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid patient id")
		return
	}
	patient, err := h.service.GetByID(id, scopeFromContext(c))
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "patient not found")
		return
	}
	if patient.PhotoURL == "" || h.uploadDir == "" {
		utils.Fail(c, http.StatusNotFound, "photo not found")
		return
	}
	path := filepath.Join(h.uploadDir, "patients", filepath.Base(patient.PhotoURL))
	if _, err := os.Stat(path); err != nil {
		utils.Fail(c, http.StatusNotFound, "photo not found")
		return
	}
	c.Header("Cache-Control", "private, max-age=3600")
	c.File(path)
}

// Create godoc
// @Summary      Register a new patient (auto-generates UHID)
// @Description  If a patient already exists with the same mobile and force=false, responds 409 with the existing matches so the receptionist can confirm before re-submitting with force=true. When the registration carries no DOB, the name + age rule fires as a 409 warning instead of a hard rejection (force=true still registers).
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
		if errors.Is(err, ErrDuplicateMobile) || errors.Is(err, ErrDuplicateWarning) {
			dupResp := make([]PatientResponse, 0, len(duplicates))
			expose := h.canExposeIDs(c)
			for i := range duplicates {
				dupResp = append(dupResp, toResponseWithIDs(&duplicates[i], expose))
			}
			if errors.Is(err, ErrDuplicateWarning) {
				c.JSON(http.StatusConflict, utils.APIResponse{
					Success: false,
					Error:   "possible duplicate match (name + age)",
					Data: DuplicateMobileResponse{
						Message:          "This registration has no date of birth, so it cannot be matched on name + DOB. It matches existing patient(s) by name + age — verify below and resubmit with force=true only if this is genuinely a different person.",
						ExistingPatients: dupResp,
					},
				})
				return
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

	utils.Success(c, http.StatusCreated, "patient registered", toResponseWithIDs(patient, h.canExposeIDs(c)))
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

	patient, err := h.service.Update(id, req, scopeFromContext(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "patient not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, "failed to update patient: "+err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "patient updated", toResponseWithIDs(patient, h.canExposeIDs(c)))
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
	if err := h.service.Delete(id, scopeFromContext(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "patient not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to delete patient")
		return
	}
	utils.Success(c, http.StatusOK, "patient deleted", nil)
}
