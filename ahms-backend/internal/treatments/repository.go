package treatments

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrNotFound is returned when an id doesn't match any row.
var ErrNotFound = errors.New("record not found")

// ErrInvalidState is returned for illegal plan/session state transitions.
var ErrInvalidState = errors.New("invalid state transition")

// ListFilter narrows the plan listing.
type ListFilter struct {
	Status    string
	PatientID string
	Search    string
}

// Repository is the data-access layer for the treatment engine.
type Repository interface {
	CreatePlanWithSessions(plan *models.TreatmentPlan, sessions []models.TreatmentSession) error
	FindPlanByID(id uuid.UUID) (*models.TreatmentPlan, error)
	ListPlans(filter ListFilter) ([]models.TreatmentPlan, error)
	UpdatePlan(plan *models.TreatmentPlan) error
	NextPlanNumber(year int) (string, error)
	FindSessionByID(id uuid.UUID) (*models.TreatmentSession, error)
	UpdateSession(session *models.TreatmentSession) error
	TodaySessions(therapistUserID uuid.UUID) ([]models.TreatmentPlan, error)
	PatientExists(id uuid.UUID) (bool, error)
	EncounterExists(id uuid.UUID) (bool, error)
	FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error)
	FindDoctorByID(id uuid.UUID) (*models.Doctor, error)
	ProcedureTypeExists(id uuid.UUID) (bool, error)
	TherapistExists(userID uuid.UUID) (bool, error)
	CountCompletedSessions(planID uuid.UUID) (int, error)
	ListProcedureTypes() ([]models.ProcedureType, error)
	ListTherapists() ([]models.User, error)

	// UpdatePendingSessionsTherapist bulk-updates the therapist on all PENDING
	// sessions of the plan that have NOT been individually overridden.
	UpdatePendingSessionsTherapist(planID uuid.UUID, therapistID *uuid.UUID) error

	// ReassignPlanTherapistTx updates the plan's therapist and all eligible
	// pending sessions in a single database transaction.
	ReassignPlanTherapistTx(plan *models.TreatmentPlan, therapistID *uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreatePlanWithSessions(plan *models.TreatmentPlan, sessions []models.TreatmentSession) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(plan).Error; err != nil {
			return err
		}
		for i := range sessions {
			sessions[i].PlanID = plan.ID
			if err := tx.Create(&sessions[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) FindPlanByID(id uuid.UUID) (*models.TreatmentPlan, error) {
	var p models.TreatmentPlan
	err := r.db.Preload("Patient").
		Preload("ProcedureType").
		Preload("Doctor.User").
		Preload("AssignedTherapistUser").
		Preload("ApprovedByUser").
		Preload("CompletedByUser").
		Preload("Sessions.TherapistUser").
		First(&p, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (r *repository) ListPlans(filter ListFilter) ([]models.TreatmentPlan, error) {
	var list []models.TreatmentPlan
	q := r.db.Model(&models.TreatmentPlan{}).
		Preload("Patient").
		Preload("ProcedureType").
		Preload("Doctor.User").
		Preload("AssignedTherapistUser").
		Preload("Sessions")
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.PatientID != "" {
		q = q.Where("patient_id = ?", filter.PatientID)
	}
	if filter.Search != "" {
		like := "%" + filter.Search + "%"
		q = q.Where(
			"EXISTS (SELECT 1 FROM patients p WHERE p.id = treatment_plans.patient_id AND (p.full_name ILIKE ? OR p.uh_id ILIKE ?))",
			like, like,
		)
	}
	if err := q.Order("created_at DESC").Limit(100).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) UpdatePlan(plan *models.TreatmentPlan) error {
	return r.db.Save(plan).Error
}

// NextPlanNumber increments the yearly counter and returns the next
// PKR-YYYY-NNNNNN number atomically.
func (r *repository) NextPlanNumber(year int) (string, error) {
	var no string
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var counter models.TreatmentPlanCounter
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			FirstOrCreate(&counter, models.TreatmentPlanCounter{Year: year}).Error; err != nil {
			return err
		}
		counter.LastNumber++
		if err := tx.Save(&counter).Error; err != nil {
			return err
		}
		no = fmt.Sprintf("PKR-%d-%06d", year, counter.LastNumber)
		return nil
	})
	return no, err
}

func (r *repository) FindSessionByID(id uuid.UUID) (*models.TreatmentSession, error) {
	var s models.TreatmentSession
	err := r.db.Preload("Plan.ProcedureType").
		Preload("Plan.Patient").
		Preload("TherapistUser").
		First(&s, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &s, err
}

func (r *repository) UpdateSession(session *models.TreatmentSession) error {
	return r.db.Save(session).Error
}

// TodaySessions returns plans that have at least one session scheduled for
// today assigned to the given therapist, so the therapist sees a concise
// daily queue.
func (r *repository) TodaySessions(therapistUserID uuid.UUID) ([]models.TreatmentPlan, error) {
	today := time.Now().Format("2006-01-02")
	var plans []models.TreatmentPlan
	err := r.db.Preload("Patient").
		Preload("ProcedureType").
		Preload("Doctor.User").
		Preload("AssignedTherapistUser").
		Preload("Sessions", "session_date = ?", today).
		Where("status IN ?", []string{models.TreatmentApproved, models.TreatmentInProgress}).
		Where("EXISTS (SELECT 1 FROM treatment_sessions ts WHERE ts.plan_id = treatment_plans.id AND ts.session_date = ? AND ts.therapist_user_id = ?)", today, therapistUserID).
		Order("created_at ASC").
		Find(&plans).Error
	return plans, err
}

func (r *repository) PatientExists(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Patient{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *repository) EncounterExists(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Encounter{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *repository) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").First(&doctor, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doctor, err
}

func (r *repository) FindDoctorByID(id uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").First(&doctor, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doctor, err
}

func (r *repository) ProcedureTypeExists(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.ProcedureType{}).Where("id = ? AND is_active = true", id).Count(&count).Error
	return count > 0, err
}

func (r *repository) TherapistExists(userID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.User{}).
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("users.id = ? AND roles.name = ? AND users.is_active = true", userID, models.RoleTherapist).
		Count(&count).Error
	return count > 0, err
}

func (r *repository) CountCompletedSessions(planID uuid.UUID) (int, error) {
	var count int64
	err := r.db.Model(&models.TreatmentSession{}).
		Where("plan_id = ? AND status IN ?", planID, []string{models.SessionCompleted, models.SessionSkipped}).
		Count(&count).Error
	return int(count), err
}

func (r *repository) ListProcedureTypes() ([]models.ProcedureType, error) {
	var types []models.ProcedureType
	err := r.db.Where("is_active = true").Order("category asc, name asc").Find(&types).Error
	return types, err
}

func (r *repository) ListTherapists() ([]models.User, error) {
	var users []models.User
	err := r.db.Joins("JOIN roles ON roles.id = users.role_id").
		Where("roles.name = ? AND users.is_active = true", models.RoleTherapist).
		Order("users.full_name asc").
		Find(&users).Error
	return users, err
}

func (r *repository) UpdatePendingSessionsTherapist(planID uuid.UUID, therapistID *uuid.UUID) error {
	return r.db.Model(&models.TreatmentSession{}).
		Where("plan_id = ? AND status = ? AND therapist_overridden = false", planID, models.SessionPending).
		Update("therapist_user_id", therapistID).Error
}

func (r *repository) ReassignPlanTherapistTx(plan *models.TreatmentPlan, therapistID *uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(plan).Update("assigned_therapist_user_id", therapistID).Error; err != nil {
			return err
		}
		return tx.Model(&models.TreatmentSession{}).
			Where("plan_id = ? AND status = ? AND therapist_overridden = false", plan.ID, models.SessionPending).
			Update("therapist_user_id", therapistID).Error
	})
}
