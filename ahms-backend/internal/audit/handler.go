package audit

import (
	"net/http"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler exposes audit-log queries over HTTP.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// AuditLogResponse is the public shape of one audit entry.
type AuditLogResponse struct {
	ID         string `json:"id"`
	UserID     string `json:"user_id"`
	UserName   string `json:"user_name"`
	Action     string `json:"action"`
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	IPAddress  string `json:"ip_address"`
	CreatedAt  string `json:"created_at"`
}

func toAuditResponse(e *models.AuditLog) AuditLogResponse {
	return AuditLogResponse{
		ID:         e.ID.String(),
		UserID:     e.UserID.String(),
		UserName:   e.User.FullName,
		Action:     e.Action,
		EntityType: e.EntityType,
		EntityID:   e.EntityID,
		IPAddress:  e.IPAddress,
		CreatedAt:  e.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// List godoc
// @Summary      Query the audit trail
// @Description  Returns recent audit-log entries. Optional filters:
// @Description  ?entity=patient&id=<uuid>  entries for one record
// @Description  ?user=<uuid>               entries by one user
// @Description  Without filters, returns the most recent entries.
// @Tags         audit
// @Produce      json
// @Security     BearerAuth
// @Param        entity query string false "Entity type to filter (e.g. patient, referral, bill)"
// @Param        id query string false "Entity id to filter (requires entity)"
// @Param        user query string false "User id to filter by actor"
// @Success      200 {object} utils.APIResponse{data=[]AuditLogResponse}
// @Router       /audit-logs [get]
func (h *Handler) List(c *gin.Context) {
	entity := c.Query("entity")
	id := c.Query("id")
	user := c.Query("user")

	var logs []models.AuditLog
	var err error

	switch {
	case entity != "" && id != "":
		logs, err = h.service.ListByEntity(entity, id)
	case user != "":
		var userID uuid.UUID
		userID, err = uuid.Parse(user)
		if err != nil {
			utils.Fail(c, http.StatusBadRequest, "invalid user id")
			return
		}
		logs, err = h.service.ListByUser(userID)
	default:
		logs, err = h.service.ListAll(200)
	}

	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch audit logs")
		return
	}

	resp := make([]AuditLogResponse, 0, len(logs))
	for i := range logs {
		resp = append(resp, toAuditResponse(&logs[i]))
	}
	utils.Success(c, http.StatusOK, "audit logs fetched", resp)
}
