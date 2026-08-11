package auth

import (
	"errors"
	"net/http"

	"github.com/ahms/backend/internal/audit"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler wires HTTP requests to the auth Service.
type Handler struct {
	service Service
	audit   *audit.Recorder
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// SetAuditRecorder attaches the audit recorder used to log login events.
func (h *Handler) SetAuditRecorder(r *audit.Recorder) { h.audit = r }

// Login godoc
// @Summary      Log in with email and password
// @Description  Validates credentials and returns a JWT access + refresh token pair.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body LoginRequest true "Login credentials"
// @Success      200 {object} utils.APIResponse{data=LoginResponse}
// @Failure      400 {object} utils.APIResponse
// @Failure      401 {object} utils.APIResponse
// @Router       /auth/login [post]
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	result, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			utils.Fail(c, http.StatusUnauthorized, "invalid email or password")
			return
		}
		utils.Fail(c, http.StatusInternalServerError, "login failed, please try again")
		return
	}

	if h.audit != nil {
		if userID, perr := uuid.Parse(result.User.ID); perr == nil {
			_ = h.audit.LogWithUser(c, userID, "auth.login", "user", result.User.ID)
		}
	}

	utils.Success(c, http.StatusOK, "login successful", result)
}

// Refresh godoc
// @Summary      Exchange a refresh token for a new token pair
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body RefreshRequest true "Refresh token"
// @Success      200 {object} utils.APIResponse{data=LoginResponse}
// @Failure      401 {object} utils.APIResponse
// @Router       /auth/refresh [post]
func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	result, err := h.service.Refresh(req.RefreshToken)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	utils.Success(c, http.StatusOK, "token refreshed", result)
}

// Logout godoc
// @Summary      Log out the current session
// @Description  Stateless JWT logout: the client discards its tokens. This endpoint exists as a stable contract and audit point for future token-blacklisting (e.g. via Redis).
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse
// @Router       /auth/logout [post]
func (h *Handler) Logout(c *gin.Context) {
	header := c.GetHeader("Authorization")
	if header != "" && len(header) > 7 {
		token := header[7:]
		h.service.Logout(token)
	}
	utils.Success(c, http.StatusOK, "logged out successfully", nil)
}

// Me godoc
// @Summary      Get the currently authenticated user
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=UserResponse}
// @Router       /auth/me [get]
func (h *Handler) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")
	resp, err := h.service.CurrentUser(userID.(string))
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, "session no longer valid")
		return
	}

	utils.Success(c, http.StatusOK, "current user", resp)
}

// UpdateProfile godoc
// @Summary      Update the current user's profile
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body UpdateProfileRequest true "Profile"
// @Success      200 {object} utils.APIResponse{data=UserResponse}
// @Failure      400 {object} utils.APIResponse
// @Router       /auth/me [put]
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	resp, err := h.service.UpdateProfile(userID.(string), req)
	if err != nil {
		if errors.Is(err, ErrDuplicateEmail) {
			utils.Fail(c, http.StatusBadRequest, "email is already in use")
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			utils.Fail(c, http.StatusUnauthorized, "session no longer valid")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.Success(c, http.StatusOK, "profile updated", resp)
	if h.audit != nil {
		if id, perr := uuid.Parse(userID.(string)); perr == nil {
			_ = h.audit.LogWithUser(c, id, "auth.profile_update", "user", resp.ID)
		}
	}
}

// ChangePassword godoc
// @Summary      Change the current user's password
// @Description  Verifies the current password before applying the new one.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body ChangePasswordRequest true "Passwords"
// @Success      200 {object} utils.APIResponse
// @Failure      400 {object} utils.APIResponse
// @Router       /auth/change-password [post]
func (h *Handler) ChangePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	if err := h.service.ChangePassword(userID.(string), req.OldPassword, req.NewPassword); err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			utils.Fail(c, http.StatusBadRequest, "current password is incorrect")
			return
		}
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.Success(c, http.StatusOK, "password updated", nil)
	if h.audit != nil {
		if id, perr := uuid.Parse(userID.(string)); perr == nil {
			_ = h.audit.LogWithUser(c, id, "auth.password_change", "user", userID.(string))
		}
	}
}
