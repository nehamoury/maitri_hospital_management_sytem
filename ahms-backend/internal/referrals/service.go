package referrals

import (
	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains referral business logic.
type Service interface {
	Create(req CreateReferralRequest, referredByUserID uuid.UUID) (*models.Referral, error)
	Incoming(departmentID string, userID uuid.UUID, scope *models.DataScope) ([]models.Referral, error)
	GetByID(id uuid.UUID, scope *models.DataScope) (*models.Referral, error)
	UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Referral, error)
	AttachFile(referralID uuid.UUID, fileName, filePath, fileType string, fileSize int64, userID uuid.UUID, scope *models.DataScope) (*models.ReferralAttachment, error)
	ListAttachments(referralID uuid.UUID, scope *models.DataScope) ([]models.ReferralAttachment, error)
	GetAttachment(id uuid.UUID, scope *models.DataScope) (*models.ReferralAttachment, error)
	DeleteAttachment(id uuid.UUID, scope *models.DataScope) error
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(req CreateReferralRequest, referredByUserID uuid.UUID) (*models.Referral, error) {
	patientID, err := uuid.Parse(req.PatientID)
	if err != nil {
		return nil, err
	}
	sourceEncounterID, err := uuid.Parse(req.SourceEncounterID)
	if err != nil {
		return nil, err
	}
	toDepartmentID, err := uuid.Parse(req.ToDepartmentID)
	if err != nil {
		return nil, err
	}

	// The source encounter's department is the referring department.
	enc, err := s.repo.FindEncounterWithHistory(sourceEncounterID)
	if err != nil {
		return nil, err
	}

	priority := req.Priority
	if priority == "" {
		priority = models.ReferralPriorityRoutine
	}

	var preferredDoctorID *uuid.UUID
	if req.PreferredDoctorID != "" {
		id, err := uuid.Parse(req.PreferredDoctorID)
		if err != nil {
			return nil, err
		}
		preferredDoctorID = &id
	}

	referral := &models.Referral{
		PatientID:            patientID,
		SourceEncounterID:    sourceEncounterID,
		FromDepartmentID:     enc.DepartmentID,
		ToDepartmentID:       toDepartmentID,
		PreferredDoctorID:    preferredDoctorID,
		Reason:               req.Reason,
		ClinicalNotes:        req.ClinicalNotes,
		Priority:             priority,
		RecommendedTreatment: req.RecommendedTreatment,
		Diagnosis:            req.Diagnosis,
		ReferredByUserID:     referredByUserID,
	}

	if err := s.repo.CreateWithNumber(referral); err != nil {
		return nil, err
	}
	return s.repo.FindByID(referral.ID, nil)
}

// Incoming returns referrals for the destination department. When the
// caller is a doctor and no explicit department_id is given, the doctor's
// own department is used so the dashboard is scoped automatically. Users
// without a doctor record (and without an explicit department_id) get an
// empty list rather than an error.
func (s *service) Incoming(departmentID string, userID uuid.UUID, scope *models.DataScope) ([]models.Referral, error) {
	var toDept uuid.UUID
	if departmentID != "" {
		id, err := uuid.Parse(departmentID)
		if err != nil {
			return nil, err
		}
		toDept = id
	} else {
		doctor, err := s.repo.FindDoctorByUserID(userID)
		if err != nil {
			return []models.Referral{}, nil
		}
		toDept = doctor.DepartmentID
	}

	statuses := []string{
		models.ReferralCreated,
		models.ReferralReceived,
		models.ReferralAccepted,
		models.ReferralConsultationStarted,
	}
	return s.repo.FindIncoming(toDept, statuses, scope)
}

func (s *service) GetByID(id uuid.UUID, scope *models.DataScope) (*models.Referral, error) {
	return s.repo.FindByID(id, scope)
}

func (s *service) UpdateStatus(id uuid.UUID, status string, scope *models.DataScope) (*models.Referral, error) {
	return s.repo.UpdateStatus(id, status, scope)
}

func (s *service) AttachFile(referralID uuid.UUID, fileName, filePath, fileType string, fileSize int64, userID uuid.UUID, scope *models.DataScope) (*models.ReferralAttachment, error) {
	if _, err := s.repo.FindByID(referralID, scope); err != nil {
		return nil, err
	}
	att := &models.ReferralAttachment{
		ReferralID:       referralID,
		FileName:         fileName,
		FilePath:         filePath,
		FileType:         fileType,
		FileSize:         fileSize,
		UploadedByUserID: userID,
	}
	if err := s.repo.AttachFile(att); err != nil {
		return nil, err
	}
	return att, nil
}

func (s *service) ListAttachments(referralID uuid.UUID, scope *models.DataScope) ([]models.ReferralAttachment, error) {
	return s.repo.FindAttachmentsByReferralID(referralID, scope)
}

func (s *service) DeleteAttachment(id uuid.UUID, scope *models.DataScope) error {
	return s.repo.DeleteAttachment(id, scope)
}

func (s *service) GetAttachment(id uuid.UUID, scope *models.DataScope) (*models.ReferralAttachment, error) {
	return s.repo.FindAttachmentByID(id, scope)
}
