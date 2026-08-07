// Package audit records immutable audit-log entries for important system
// actions. Every meaningful event (patient view, clinical record, referral,
// dispensing, configuration change) should be logged here.
package audit

import (
	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Service records and queries audit-log entries.
type Service interface {
	Record(entry *models.AuditLog) error
	RecordAction(userID uuid.UUID, action, entityType, entityID, ip string, oldVal, newVal models.JSONB) error
	ListByEntity(entityType, entityID string) ([]models.AuditLog, error)
	ListByUser(userID uuid.UUID) ([]models.AuditLog, error)
	ListAll(limit int) ([]models.AuditLog, error)
}

type service struct {
	db *gorm.DB
}

// NewService builds an audit Service backed by GORM/PostgreSQL.
func NewService(db *gorm.DB) Service {
	return &service{db: db}
}

func (s *service) Record(entry *models.AuditLog) error {
	return s.db.Create(entry).Error
}

func (s *service) RecordAction(userID uuid.UUID, action, entityType, entityID, ip string, oldVal, newVal models.JSONB) error {
	return s.db.Create(&models.AuditLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		OldValue:   oldVal,
		NewValue:   newVal,
		IPAddress:  ip,
	}).Error
}

func (s *service) ListByEntity(entityType, entityID string) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	err := s.db.Preload("User").
		Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("created_at desc").
		Find(&logs).Error
	return logs, err
}

func (s *service) ListByUser(userID uuid.UUID) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	err := s.db.Preload("User").
		Where("user_id = ?", userID).
		Order("created_at desc").
		Find(&logs).Error
	return logs, err
}

func (s *service) ListAll(limit int) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	err := s.db.Preload("User").Order("created_at desc").Limit(limit).Find(&logs).Error
	return logs, err
}
