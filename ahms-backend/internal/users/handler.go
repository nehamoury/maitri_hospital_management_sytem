package users

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the Users Service.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func toResponse(u *models.User) UserResponse {
	roleID := ""
	roleName := ""
	roleDisplay := ""
	if u.RoleID != uuid.Nil {
		roleID = u.RoleID.String()
		roleName = u.Role.Name
		roleDisplay = u.Role.DisplayName
	}
	return UserResponse{
		ID:              u.ID.String(),
		FullName:        u.FullName,
		Email:           u.Email,
		Mobile:          u.Mobile,
		RoleID:          roleID,
		RoleName:        roleName,
		RoleDisplayName: roleDisplay,
		IsActive:        u.IsActive,
		CreatedAt:       u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// List godoc
// @Summary      List staff users
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=[]UserResponse}
// @Router       /users [get]
func (h *Handler) List(c *gin.Context) {
	users, err := h.service.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch users")
		return
	}
	resp := make([]UserResponse, 0, len(users))
	for i := range users {
		resp = append(resp, toResponse(&users[i]))
	}
	utils.Success(c, http.StatusOK, "users fetched", resp)
}

// Get godoc
// @Summary      Get a staff user by id
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "User ID"
// @Success      200 {object} utils.APIResponse{data=UserResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /users/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}
	user, err := h.service.GetByID(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.Fail(c, http.StatusNotFound, "user not found")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch user")
		return
	}
	utils.Success(c, http.StatusOK, "user fetched", toResponse(user))
}

// Create godoc
// @Summary      Create a staff user (provisions their login account)
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateUserRequest true "User"
// @Success      201 {object} utils.APIResponse{data=UserResponse}
// @Failure      400 {object} utils.APIResponse
// @Failure      409 {object} utils.APIResponse
// @Router       /users [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	user, err := h.service.Create(req)
	if err != nil {
		switch {
		case errors.Is(err, ErrDuplicateEmail), errors.Is(err, ErrDuplicateMobile):
			utils.Fail(c, http.StatusConflict, err.Error())
		case errors.Is(err, ErrRoleNotFound):
			utils.Fail(c, http.StatusBadRequest, err.Error())
		default:
			utils.Fail(c, http.StatusBadRequest, err.Error())
		}
		return
	}
	utils.Success(c, http.StatusCreated, "user created", toResponse(user))
}

// Update godoc
// @Summary      Update a staff user
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "User ID"
// @Param        request body UpdateUserRequest true "User"
// @Success      200 {object} utils.APIResponse{data=UserResponse}
// @Failure      404 {object} utils.APIResponse
// @Router       /users/{id} [put]
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	user, err := h.service.Update(id, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			utils.Fail(c, http.StatusNotFound, "user not found")
		case errors.Is(err, ErrDuplicateEmail), errors.Is(err, ErrDuplicateMobile):
			utils.Fail(c, http.StatusConflict, err.Error())
		case errors.Is(err, ErrRoleNotFound):
			utils.Fail(c, http.StatusBadRequest, err.Error())
		default:
			utils.Fail(c, http.StatusBadRequest, err.Error())
		}
		return
	}
	utils.Success(c, http.StatusOK, "user updated", toResponse(user))
}

// Delete godoc
// @Summary      Deactivate a staff user login
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "User ID"
// @Success      200 {object} utils.APIResponse
// @Failure      404 {object} utils.APIResponse
// @Router       /users/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}

	actingUserIDRaw, _ := c.Get("user_id")
	actingUserID, err := uuid.Parse(actingUserIDRaw.(string))
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid session")
		return
	}

	if err := h.service.Delete(id, actingUserID); err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			utils.Fail(c, http.StatusNotFound, "user not found")
		case errors.Is(err, ErrSelfDelete):
			utils.Fail(c, http.StatusBadRequest, err.Error())
		case errors.Is(err, ErrCannotDeactivateSuperAdmin):
			utils.Fail(c, http.StatusBadRequest, err.Error())
		default:
			utils.Fail(c, http.StatusInternalServerError, "failed to deactivate user")
		}
		return
	}
	utils.Success(c, http.StatusOK, "user deactivated", nil)
}
