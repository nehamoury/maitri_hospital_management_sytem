package audit

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Recorder writes audit entries from an HTTP request context, extracting
// the authenticated user and client IP so handlers only supply the semantic
// details (action, entity type, entity id).
type Recorder struct {
	svc Service
}

// NewRecorder builds a Recorder around a Service.
func NewRecorder(svc Service) *Recorder {
	return &Recorder{svc: svc}
}

// Log records a single audit entry. It is intentionally best-effort: the
// caller can ignore the error and the audit failure will never break the
// primary operation.
func (r *Recorder) Log(c *gin.Context, action, entityType, entityID string) error {
	if r == nil || r.svc == nil {
		return nil
	}
	userID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		return err
	}
	return r.svc.RecordAction(userID, action, entityType, entityID, c.ClientIP(), nil, nil)
}

// LogWithUser records an entry for an explicitly-provided user (e.g. the
// login endpoint, where no session exists yet).
func (r *Recorder) LogWithUser(c *gin.Context, userID uuid.UUID, action, entityType, entityID string) error {
	if r == nil || r.svc == nil {
		return nil
	}
	return r.svc.RecordAction(userID, action, entityType, entityID, c.ClientIP(), nil, nil)
}
