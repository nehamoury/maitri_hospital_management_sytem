package roles

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the roles Service.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func toRoleResponse(r *models.Role) RoleResponse {
	perms := make([]PermissionRef, 0, len(r.Permissions))
	for i := range r.Permissions {
		perms = append(perms, PermissionRef{ID: r.Permissions[i].ID.String(), Name: r.Permissions[i].Name})
	}
	return RoleResponse{
		ID:          r.ID.String(),
		Name:        r.Name,
		DisplayName: r.DisplayName,
		Description: r.Description,
		Permissions: perms,
	}
}

// List godoc
// @Summary      List roles with their permission sets
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]RoleResponse}
// @Router       /roles [get]
func (h *Handler) List(c *gin.Context) {
	roles, err := h.service.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch roles")
		return
	}
	resp := make([]RoleResponse, 0, len(roles))
	for i := range roles {
		resp = append(resp, toRoleResponse(&roles[i]))
	}
	utils.Success(c, http.StatusOK, "roles fetched", resp)
}

// Permissions godoc
// @Summary      List the full permission catalog (with selection flags by role)
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Param        role_id query string false "Role ID to mark selected permissions"
// @Success      200 {object} utils.APIResponse{data=[]PermissionResponse}
// @Router       /roles/permissions [get]
func (h *Handler) Permissions(c *gin.Context) {
	catalog, err := h.service.Permissions()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch permissions")
		return
	}

	selected := map[string]bool{}
	if rid := c.Query("role_id"); rid != "" {
		roleID, err := uuid.Parse(rid)
		if err == nil {
			if role, err := h.service.GetByID(roleID); err == nil {
				for i := range role.Permissions {
					selected[role.Permissions[i].Name] = true
				}
			}
		}
	}

	resp := make([]PermissionResponse, 0, len(catalog))
	for i := range catalog {
		resp = append(resp, PermissionResponse{
			ID:          catalog[i].ID.String(),
			Name:        catalog[i].Name,
			Description: catalog[i].Description,
			Selected:    selected[catalog[i].Name],
		})
	}
	utils.Success(c, http.StatusOK, "permissions fetched", resp)
}

// UpdatePermissions godoc
// @Summary      Replace a role's permission set
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Role ID"
// @Param        request body UpdateRolePermissionsRequest true "Permission names"
// @Success      200 {object} utils.APIResponse{data=RoleResponse}
// @Failure      400 {object} utils.APIResponse
// @Failure      404 {object} utils.APIResponse
// @Router       /roles/{id}/permissions [put]
func (h *Handler) UpdatePermissions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid role id")
		return
	}

	var req UpdateRolePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	role, err := h.service.UpdatePermissions(id, req.Permissions)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			utils.Fail(c, http.StatusNotFound, "role not found")
		case errors.Is(err, ErrInvalidPermission):
			utils.Fail(c, http.StatusBadRequest, err.Error())
		default:
			utils.Fail(c, http.StatusInternalServerError, "failed to update role permissions")
		}
		return
	}
	utils.Success(c, http.StatusOK, "role permissions updated", toRoleResponse(role))
}
