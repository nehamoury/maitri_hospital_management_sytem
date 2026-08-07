package departments

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the departments Service.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func toResponse(d *models.Department) DepartmentResponse {
	return DepartmentResponse{
		ID:          d.ID.String(),
		Code:        d.Code,
		Name:        d.Name,
		Type:        d.Type,
		Description: d.Description,
		DefaultFee:  d.DefaultFee,
		IsActive:    d.IsActive,
		CreatedAt:   d.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   d.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// List godoc
// @Summary      List all departments
// @Tags         departments
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]DepartmentResponse}
// @Router       /departments [get]
func (h *Handler) List(c *gin.Context) {
	depts, err := h.service.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch departments")
		return
	}
	resp := make([]DepartmentResponse, 0, len(depts))
	for i := range depts {
		resp = append(resp, toResponse(&depts[i]))
	}
	utils.Success(c, http.StatusOK, "departments fetched", resp)
}

// Get godoc
// @Summary      Get a single department by id
// @Tags         departments
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Department ID"
// @Success      200 {object} utils.APIResponse{data=DepartmentResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /departments/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid department id")
		return
	}
	dept, err := h.service.GetByID(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "department not found")
		return
	}
	utils.Success(c, http.StatusOK, "department fetched", toResponse(dept))
}

// Create godoc
// @Summary      Create a department
// @Tags         departments
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateDepartmentRequest true "Department"
// @Success      201 {object} utils.APIResponse{data=DepartmentResponse}
// @Failure      400 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /departments [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	dept, err := h.service.Create(req)
	if err != nil {
		if errors.Is(err, ErrInvalidType) {
			utils.Fail(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrDuplicateName) {
			utils.Fail(c, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, ErrDuplicateCode) {
			utils.Fail(c, http.StatusConflict, err.Error())
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to create department")
		return
	}
	utils.Success(c, http.StatusCreated, "department created", toResponse(dept))
}

// Update godoc
// @Summary      Update a department
// @Tags         departments
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Department ID"
// @Param        request body UpdateDepartmentRequest true "Department"
// @Success      200 {object} utils.APIResponse{data=DepartmentResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /departments/{id} [put]
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid department id")
		return
	}

	var req UpdateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	dept, err := h.service.Update(id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "department not found")
			return
		}
		if errors.Is(err, ErrInvalidType) {
			utils.Fail(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrDuplicateName) {
			utils.Fail(c, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, ErrDuplicateCode) {
			utils.Fail(c, http.StatusConflict, err.Error())
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to update department")
		return
	}
	utils.Success(c, http.StatusOK, "department updated", toResponse(dept))
}

// Delete godoc
// @Summary      Delete a department
// @Tags         departments
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Department ID"
// @Success      200 {object} utils.APIResponse
// @Failure      404 {object} utils.APIResponse
// @Router       /departments/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid department id")
		return
	}
	if err := h.service.Delete(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "department not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to delete department")
		return
	}
	utils.Success(c, http.StatusOK, "department deleted", nil)
}
