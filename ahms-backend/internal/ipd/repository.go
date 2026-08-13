package ipd

import (
	"errors"
	"fmt"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrNotFound is returned when an id doesn't match any row.
var ErrNotFound = errors.New("record not found")

// ErrInvalidState is returned for illegal bed/admission transitions.
var ErrInvalidState = errors.New("invalid state transition")

// AdmissionFilter narrows the admission listing.
type AdmissionFilter struct {
	Status     string
	PatientID  string
	Department string
	Ward       string
	Search     string
}

// Authorizer abstracts the caller resolution for tests.
type Repository interface {
	// Wards & beds.
	ListWards() ([]models.Ward, error)
	FindWardByID(id uuid.UUID) (*models.Ward, error)
	CreateWard(w *models.Ward) error
	UpdateWard(w *models.Ward) error
	ListBeds(wardID *uuid.UUID, status string) ([]models.Bed, error)
	FindBedByID(id uuid.UUID) (*models.Bed, error)
	CreateBed(b *models.Bed) error
	UpdateBed(b *models.Bed) error

	// Admissions.
	NextAdmissionNumber(year int) (string, error)
	CreateAdmissionWithEncounter(a *models.Admission, alloc *models.AdmissionBed, enc *models.Encounter) error
	FindAdmissionByID(id uuid.UUID, scope *models.DataScope) (*models.Admission, error)
	ListAdmissions(f AdmissionFilter, scope *models.DataScope) ([]models.Admission, error)
	UpdateAdmission(a *models.Admission) error
	TransferBed(admissionID, newBedID uuid.UUID, reason string, userID uuid.UUID) error
	ReleaseBed(admissionID uuid.UUID) error
	Discharge(a *models.Admission, summary *models.DischargeSummary) error

	// Clinical chart.
	CreateNote(n *models.ProgressNote) error
	CreateOrder(o *models.AdmissionOrder) error
	FindOrderByID(id uuid.UUID) (*models.AdmissionOrder, error)
	UpdateOrder(o *models.AdmissionOrder) error
	CreateDiet(d *models.DietOrder) error

	// Occupancy.
	WardOccupancy() ([]WardOccupancyRow, error)

	// Foreign-key existence checks.
	PatientExists(id uuid.UUID) (bool, error)
	DepartmentExists(id uuid.UUID) (bool, error)
	FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error)
	FindDoctorByID(id uuid.UUID) (*models.Doctor, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a Repository backed by GORM.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func isNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}

func wrapErr(err error) error {
	if isNotFound(err) {
		return ErrNotFound
	}
	return err
}

// ---------------------------------------------------------------------------
// Wards & beds
// ---------------------------------------------------------------------------

func (r *repository) ListWards() ([]models.Ward, error) {
	var wards []models.Ward
	err := r.db.Preload("Department").
		Preload("Beds").
		Order("name asc").
		Find(&wards).Error
	return wards, err
}

func (r *repository) FindWardByID(id uuid.UUID) (*models.Ward, error) {
	var w models.Ward
	err := r.db.Preload("Department").Preload("Beds").
		First(&w, "id = ?", id).Error
	return &w, wrapErr(err)
}

func (r *repository) CreateWard(w *models.Ward) error {
	return r.db.Create(w).Error
}

func (r *repository) UpdateWard(w *models.Ward) error {
	return r.db.Save(w).Error
}

func (r *repository) ListBeds(wardID *uuid.UUID, status string) ([]models.Bed, error) {
	q := r.db.Preload("Ward").Order("bed_no asc")
	if wardID != nil {
		q = q.Where("ward_id = ?", *wardID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var beds []models.Bed
	err := q.Find(&beds).Error
	return beds, err
}

func (r *repository) FindBedByID(id uuid.UUID) (*models.Bed, error) {
	var b models.Bed
	err := r.db.Preload("Ward").First(&b, "id = ?", id).Error
	return &b, wrapErr(err)
}

func (r *repository) CreateBed(b *models.Bed) error {
	if b.Status == "" {
		b.Status = models.BedAvailable
	}
	if b.BedType == "" {
		b.BedType = models.BedTypeGeneral
	}
	return r.db.Create(b).Error
}

func (r *repository) UpdateBed(b *models.Bed) error {
	return r.db.Save(b).Error
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

// NextAdmissionNumber increments the yearly counter and returns the next
// IPD-YYYY-NNNNNN number atomically.
func (r *repository) NextAdmissionNumber(year int) (string, error) {
	var no string
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var counter models.AdmissionCounter
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			FirstOrCreate(&counter, models.AdmissionCounter{Year: year}).Error; err != nil {
			return err
		}
		counter.LastNumber++
		if err := tx.Save(&counter).Error; err != nil {
			return err
		}
		no = fmt.Sprintf("IPD-%d-%06d", year, counter.LastNumber)
		return nil
	})
	return no, err
}

// CreateAdmissionWithEncounter atomically: allocates the bed (when one is
// requested), inserts the admission, records the bed assignment history
// and creates the linked IPD-type encounter with its token number.
func (r *repository) CreateAdmissionWithEncounter(a *models.Admission, alloc *models.AdmissionBed, enc *models.Encounter) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if a.BedID != nil {
			var bed models.Bed
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				First(&bed, "id = ?", *a.BedID).Error; err != nil {
				return wrapErr(err)
			}
			if bed.Status != models.BedAvailable {
				return ErrInvalidState
			}
			bed.Status = models.BedOccupied
			if err := tx.Save(&bed).Error; err != nil {
				return err
			}
		}
		if err := tx.Create(a).Error; err != nil {
			return err
		}
		if alloc != nil {
			alloc.AdmissionID = a.ID
			if err := tx.Create(alloc).Error; err != nil {
				return err
			}
		}
		if enc != nil {
			if err := assignEncounterToken(tx, enc); err != nil {
				return err
			}
			enc.AdmissionID = &a.ID
			if err := tx.Create(enc).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// assignEncounterToken replicates the OPD token generation inside a
// transaction: next sequential token per (doctor, visit date).
func assignEncounterToken(tx *gorm.DB, e *models.Encounter) error {
	dayStart := time.Date(e.VisitDate.Year(), e.VisitDate.Month(), e.VisitDate.Day(), 0, 0, 0, 0, e.VisitDate.Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	var maxToken int
	if err := tx.Model(&models.Encounter{}).
		Select("COALESCE(MAX(token_number), 0)").
		Where("doctor_id = ? AND visit_date >= ? AND visit_date < ?", e.DoctorID, dayStart, dayEnd).
		Row().Scan(&maxToken); err != nil {
		return err
	}
	e.TokenNumber = maxToken + 1
	e.VisitDate = dayStart
	return nil
}

func (r *repository) FindAdmissionByID(id uuid.UUID, scope *models.DataScope) (*models.Admission, error) {
	var a models.Admission
	query := r.db.Preload("Patient").
		Preload("Department").
		Preload("Doctor.User").
		Preload("Bed.Ward").
		Preload("AdmittedBy").
		Preload("DischargedBy").
		Preload("ProgressNotes.RecordedBy").
		Preload("Orders.OrderedBy").
		Preload("DietOrders.OrderedBy").
		Preload("BedHistory.Bed.Ward").
		Preload("BedHistory.ChangedBy").
		Preload("Discharge").
		Where("id = ?", id)
	if scope != nil && scope.DoctorID != nil {
		// A doctor may only access admissions where they are the treating
		// doctor.
		query = query.Where("doctor_id = ?", *scope.DoctorID)
	}
	err := query.First(&a).Error
	return &a, wrapErr(err)
}

func (r *repository) ListAdmissions(f AdmissionFilter, scope *models.DataScope) ([]models.Admission, error) {
	q := r.db.Model(&models.Admission{}).
		Preload("Patient").
		Preload("Department").
		Preload("Doctor.User").
		Preload("Bed.Ward").
		Preload("Discharge").
		Order("created_at DESC").
		Limit(200)

	if scope != nil && scope.DoctorID != nil {
		q = q.Where("doctor_id = ?", *scope.DoctorID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.PatientID != "" {
		q = q.Where("patient_id = ?", f.PatientID)
	}
	if f.Department != "" {
		q = q.Where("department_id = ?", f.Department)
	}
	if f.Ward != "" {
		q = q.Joins("JOIN beds b ON b.id = admissions.bed_id").
			Where("b.ward_id = ?", f.Ward)
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where(
			"admission_no ILIKE ? OR EXISTS (SELECT 1 FROM patients p WHERE p.id = admissions.patient_id AND (p.full_name ILIKE ? OR p.uhid ILIKE ?))",
			like, like, like,
		)
	}
	var list []models.Admission
	err := q.Find(&list).Error
	return list, err
}

func (r *repository) UpdateAdmission(a *models.Admission) error {
	return r.db.Save(a).Error
}

// TransferBed moves an active admission to another available bed, closes
// the previous assignment, frees the old bed and occupies the new one.
func (r *repository) TransferBed(admissionID, newBedID uuid.UUID, reason string, userID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var a models.Admission
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&a, "id = ?", admissionID).Error; err != nil {
			return wrapErr(err)
		}
		if a.Status != models.AdmissionAdmitted {
			return ErrInvalidState
		}
		if a.BedID == nil {
			return ErrInvalidState
		}
		if *a.BedID == newBedID {
			return nil // no-op
		}

		var nb models.Bed
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&nb, "id = ?", newBedID).Error; err != nil {
			return wrapErr(err)
		}
		if nb.Status != models.BedAvailable {
			return ErrInvalidState
		}

		now := time.Now()

		if err := tx.Model(&models.AdmissionBed{}).
			Where("admission_id = ? AND to_date IS NULL", admissionID).
			Update("to_date", now).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Bed{}).
			Where("id = ?", *a.BedID).Update("status", models.BedAvailable).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Bed{}).
			Where("id = ?", newBedID).Update("status", models.BedOccupied).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Admission{}).
			Where("id = ?", admissionID).
			Updates(map[string]interface{}{
				"bed_id": newBedID,
				"status": models.AdmissionTransferred,
			}).Error; err != nil {
			return err
		}

		alloc := models.AdmissionBed{
			AdmissionID:     admissionID,
			BedID:           newBedID,
			FromDate:        now,
			Reason:          reason,
			ChangedByUserID: userID,
		}
		return tx.Create(&alloc).Error
	})
}

// ReleaseBed closes the admission's current bed assignment and frees the
// bed. Used when an admission is cancelled before materialising.
func (r *repository) ReleaseBed(admissionID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var a models.Admission
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&a, "id = ?", admissionID).Error; err != nil {
			return wrapErr(err)
		}
		if a.BedID == nil {
			return nil
		}
		now := time.Now()
		if err := tx.Model(&models.AdmissionBed{}).
			Where("admission_id = ? AND to_date IS NULL", admissionID).
			Update("to_date", now).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Bed{}).
			Where("id = ?", *a.BedID).Update("status", models.BedAvailable).Error; err != nil {
			return err
		}
		return nil
	})
}

// Discharge persists the discharge summary, advances the admission to
// DISCHARGED, closes the current bed assignment and frees the bed.
func (r *repository) Discharge(a *models.Admission, summary *models.DischargeSummary) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(summary).Error; err != nil {
			return err
		}
		if err := tx.Save(a).Error; err != nil {
			return err
		}
		now := time.Now()
		if err := tx.Model(&models.AdmissionBed{}).
			Where("admission_id = ? AND to_date IS NULL", a.ID).
			Update("to_date", now).Error; err != nil {
			return err
		}
		if a.BedID != nil {
			if err := tx.Model(&models.Bed{}).
				Where("id = ?", *a.BedID).Update("status", models.BedAvailable).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ---------------------------------------------------------------------------
// Clinical chart
// ---------------------------------------------------------------------------

func (r *repository) CreateNote(n *models.ProgressNote) error {
	return r.db.Create(n).Error
}

func (r *repository) CreateOrder(o *models.AdmissionOrder) error {
	return r.db.Create(o).Error
}

func (r *repository) FindOrderByID(id uuid.UUID) (*models.AdmissionOrder, error) {
	var o models.AdmissionOrder
	err := r.db.Preload("OrderedBy").First(&o, "id = ?", id).Error
	return &o, wrapErr(err)
}

func (r *repository) UpdateOrder(o *models.AdmissionOrder) error {
	return r.db.Save(o).Error
}

func (r *repository) CreateDiet(d *models.DietOrder) error {
	return r.db.Create(d).Error
}

// ---------------------------------------------------------------------------
// Occupancy
// ---------------------------------------------------------------------------

func (r *repository) WardOccupancy() ([]WardOccupancyRow, error) {
	type agg struct {
		WardID        string
		WardName      string
		Total         int
		Available     int
		Occupied      int
		Reserved      int
		Maintenance   int
	}
	var rows []agg
	err := r.db.Raw(`
		SELECT w.id AS ward_id, w.name AS ward_name,
			   COUNT(b.id) AS total,
			   COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') AS available,
			   COUNT(b.id) FILTER (WHERE b.status = 'OCCUPIED') AS occupied,
			   COUNT(b.id) FILTER (WHERE b.status = 'RESERVED') AS reserved,
			   COUNT(b.id) FILTER (WHERE b.status = 'MAINTENANCE') AS maintenance
		FROM wards w
		LEFT JOIN beds b ON b.ward_id = w.id AND b.deleted_at IS NULL
		WHERE w.deleted_at IS NULL
		GROUP BY w.id, w.name
		ORDER BY w.name ASC
	`).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]WardOccupancyRow, 0, len(rows))
	for _, rr := range rows {
		out = append(out, WardOccupancyRow{
			WardID:          rr.WardID,
			WardName:        rr.WardName,
			TotalBeds:       rr.Total,
			AvailableBeds:   rr.Available,
			OccupiedBeds:    rr.Occupied,
			ReservedBeds:    rr.Reserved,
			MaintenanceBeds: rr.Maintenance,
		})
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Existence checks
// ---------------------------------------------------------------------------

func (r *repository) PatientExists(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Patient{}).Where("id = ? AND is_active = true", id).Count(&count).Error
	return count > 0, err
}

func (r *repository) DepartmentExists(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Department{}).Where("id = ? AND is_active = true", id).Count(&count).Error
	return count > 0, err
}

func (r *repository) FindDoctorByUserID(userID uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").First(&doctor, "user_id = ?", userID).Error
	return &doctor, wrapErr(err)
}

func (r *repository) FindDoctorByID(id uuid.UUID) (*models.Doctor, error) {
	var doctor models.Doctor
	err := r.db.Preload("User").First(&doctor, "id = ?", id).Error
	return &doctor, wrapErr(err)
}