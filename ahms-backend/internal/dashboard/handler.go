package dashboard

import (
	"net/http"

	"github.com/ahms/backend/internal/models"
	"github.com/ahms/backend/internal/utils"
	"github.com/gin-gonic/gin"
)

// Handler wires HTTP requests to the dashboard Service.
type Handler struct {
	service Service
}

// NewHandler builds a Handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// GetSummary godoc
// @Summary      Get dashboard summary
// @Description  Today's patients, today's appointments, recent registrations, and department count.
// @Tags         dashboard
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} utils.APIResponse{data=SummaryResponse}
// @Router       /dashboard [get]
func (h *Handler) GetSummary(c *gin.Context) {
	var scope *models.DataScope
	if scopeVal, exists := c.Get("data_scope"); exists {
		scope = scopeVal.(*models.DataScope)
	}

	summary, err := h.service.GetSummary(scope)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, "failed to fetch dashboard summary")
		return
	}
	utils.Success(c, http.StatusOK, "dashboard summary fetched", summary)
}
