package doctors

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the doctors Service.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func toResponse(d *models.Doctor) DoctorResponse {
	return DoctorResponse{
		ID:              d.ID.String(),
		FullName:        d.User.FullName,
		Email:           d.User.Email,
		Mobile:          d.User.Mobile,
		DepartmentID:    d.DepartmentID.String(),
		DepartmentName:  d.Department.Name,
		Specialization:  d.Specialization,
		Qualification:   d.Qualification,
		ExperienceYears: d.ExperienceYears,
		ConsultationFee: d.ConsultationFee,
		ImageUrl:        d.ImageUrl,
		IsActive:        d.IsActive,
		CreatedAt:       d.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// List godoc
// @Summary      List all doctors
// @Tags         doctors
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]DoctorResponse}
// @Router       /doctors [get]
func (h *Handler) List(c *gin.Context) {
	doctors, err := h.service.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch doctors")
		return
	}
	resp := make([]DoctorResponse, 0, len(doctors))
	for i := range doctors {
		resp = append(resp, toResponse(&doctors[i]))
	}
	utils.Success(c, http.StatusOK, "doctors fetched", resp)
}

// Get godoc
// @Summary      Get a doctor by id
// @Tags         doctors
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Doctor ID"
// @Success      200 {object} utils.APIResponse{data=DoctorResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /doctors/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid doctor id")
		return
	}
	doctor, err := h.service.GetByID(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "doctor not found")
		return
	}
	utils.Success(c, http.StatusOK, "doctor fetched", toResponse(doctor))
}

// Create godoc
// @Summary      Create a doctor (also provisions their login account)
// @Tags         doctors
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateDoctorRequest true "Doctor"
// @Success      201 {object} utils.APIResponse{data=DoctorResponse}
// @Failure      400 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /doctors [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreateDoctorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	doctor, err := h.service.Create(req)
	if err != nil {
		switch {
		case errors.Is(err, ErrDuplicateEmail), errors.Is(err, ErrDuplicateMobile):
			utils.Fail(c, http.StatusConflict, err.Error())
		default:
			utils.Fail(c, http.StatusBadRequest, err.Error())
		}
		return
	}
	utils.Success(c, http.StatusCreated, "doctor created", toResponse(doctor))
}

// Update godoc
// @Summary      Update a doctor
// @Tags         doctors
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Doctor ID"
// @Param        request body UpdateDoctorRequest true "Doctor"
// @Success      200 {object} utils.APIResponse{data=DoctorResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /doctors/{id} [put]
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid doctor id")
		return
	}

	var req UpdateDoctorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	doctor, err := h.service.Update(id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "doctor not found")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "doctor updated", toResponse(doctor))
}

// Delete godoc
// @Summary      Delete (deactivate) a doctor
// @Tags         doctors
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Doctor ID"
// @Success      200 {object} utils.APIResponse
// @Failure      404 {object} utils.APIResponse
// @Router       /doctors/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid doctor id")
		return
	}
	if err := h.service.Delete(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "doctor not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to delete doctor")
		return
	}
	utils.Success(c, http.StatusOK, "doctor deleted", nil)
}
