package prescriptions

import (
	"errors"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ListInput carries optional filters for listing prescriptions for the
// pharmacy dispensing queue: a free-text search (patient name or UHID) and
// an optional status filter (PRESCRIBED / PARTIALLY_DISPENSED / DISPENSED).
type ListInput struct {
	Search    string
	Status    string
	PatientID string
}

// ErrNotFound is returned when a prescription/encounter id doesn't match.
var ErrNotFound = errors.New("prescription not found")

// Repository is the data-access layer for prescriptions.
type Repository interface {
	FindByEncounterID(encounterID uuid.UUID) (*models.Prescription, error)
	FindByID(id uuid.UUID) (*models.Prescription, error)
	FindByIDForPrint(id uuid.UUID) (*models.Prescription, error)
	List(in ListInput) ([]models.Prescription, error)
	CreateWithItems(p *models.Prescription, items []models.PrescriptionItem) error
	UpdateStatus(id uuid.UUID, status string) (*models.Prescription, error)
	FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error)
	EncounterExists(id uuid.UUID) (bool, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM/PostgreSQL.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) FindByEncounterID(encounterID uuid.UUID) (*models.Prescription, error) {
	var p models.Prescription
	err := r.db.Preload("Doctor.User").Preload("Items").
		First(&p, "encounter_id = ?", encounterID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (r *repository) FindByID(id uuid.UUID) (*models.Prescription, error) {
	var p models.Prescription
	err := r.db.Preload("Doctor.User").Preload("Items").
		First(&p, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

// FindByIDForPrint loads a prescription with everything the printable
// slip needs: patient, department, doctor and each medicine line.
func (r *repository) FindByIDForPrint(id uuid.UUID) (*models.Prescription, error) {
	var p models.Prescription
	err := r.db.
		Preload("Encounter.Patient").
		Preload("Encounter.Department").
		Preload("Encounter.Doctor.User").
		Preload("Doctor.User").
		Preload("Items").
		First(&p, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (r *repository) CreateWithItems(p *models.Prescription, items []models.PrescriptionItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(p).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].PrescriptionID = p.ID
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// List returns prescriptions for the pharmacy dispensing queue, newest
// first. Optional search matches patient full name or UHID; optional status
// narrows to PRESCRIBED / PARTIALLY_DISPENSED / DISPENSED.
func (r *repository) List(in ListInput) ([]models.Prescription, error) {
	var list []models.Prescription
	q := r.db.Model(&models.Prescription{}).
		Preload("Encounter.Patient").
		Preload("Doctor.User").
		Preload("Items")
	if in.Status != "" {
		q = q.Where("status = ?", in.Status)
	}
	if in.PatientID != "" {
		q = q.Where(
			"EXISTS (SELECT 1 FROM encounters e WHERE e.id = prescriptions.encounter_id AND e.patient_id = ?)",
			in.PatientID,
		)
	}
	if in.Search != "" {
		like := "%" + in.Search + "%"
		q = q.Where(
			"EXISTS (SELECT 1 FROM encounters e JOIN patients p ON p.id = e.patient_id WHERE e.id = prescriptions.encounter_id AND (p.full_name ILIKE ? OR p.uh_id ILIKE ?))",
			like, like,
		)
	}
	if err := q.Order("created_at DESC").Limit(100).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *repository) UpdateStatus(id uuid.UUID, status string) (*models.Prescription, error) {
	result := r.db.Model(&models.Prescription{}).Where("id = ?", id).Update("status", status)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.FindByID(id)
}

func (r *repository) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").First(&doctor, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &doctor, err
}

func (r *repository) EncounterExists(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Encounter{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}
