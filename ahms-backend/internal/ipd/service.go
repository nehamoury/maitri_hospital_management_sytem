package ipd

import (
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// Service contains the IPD business logic.
type Service interface {
	// Wards & beds.
	ListWards() ([]models.Ward, error)
	GetWard(id string) (*models.Ward, error)
	CreateWard(req WardRequest) (*models.Ward, error)
	UpdateWard(id string, req WardRequest) (*models.Ward, error)
	ListBeds(wardID, status string) ([]models.Bed, error)
	CreateBed(req BedRequest) (*models.Bed, error)
	UpdateBed(id string, req BedRequest) (*models.Bed, error)
	SetBedStatus(id, status string) (*models.Bed, error)

	// Admissions.
	ListAdmissions(f AdmissionFilter, scope *models.DataScope) ([]models.Admission, error)
	GetAdmission(id string, scope *models.DataScope) (*models.Admission, error)
	Admit(req AdmitRequest, admittedByUserID uuid.UUID) (*models.Admission, error)
	UpdateAdmission(id string, req UpdateAdmissionRequest, userID uuid.UUID, scope *models.DataScope) (*models.Admission, error)
	TransferBed(id string, req TransferBedRequest, userID uuid.UUID, scope *models.DataScope) (*models.Admission, error)

	// Clinical chart.
	AddNote(id string, req NoteRequest, userID uuid.UUID, scope *models.DataScope) (*models.ProgressNote, error)
	AddOrder(id string, req OrderRequest, userID uuid.UUID, scope *models.DataScope) (*models.AdmissionOrder, error)
	UpdateOrderStatus(admissionID, orderID string, req OrderStatusRequest, scope *models.DataScope) (*models.AdmissionOrder, error)
	AddDiet(id string, req DietRequest, userID uuid.UUID, scope *models.DataScope) (*models.DietOrder, error)

	// Discharge.
	Discharge(id string, req DischargeRequest, userID uuid.UUID, scope *models.DataScope) (*models.Admission, error)

	// Occupancy.
	WardOccupancy() ([]WardOccupancyRow, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

// ---------------------------------------------------------------------------
// Wards & beds
// ---------------------------------------------------------------------------

func (s *service) ListWards() ([]models.Ward, error) {
	return s.repo.ListWards()
}

func (s *service) GetWard(id string) (*models.Ward, error) {
	wardID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	return s.repo.FindWardByID(wardID)
}

func (s *service) CreateWard(req WardRequest) (*models.Ward, error) {
	ward := &models.Ward{
		Code:     req.Code,
		Name:     req.Name,
		Location: req.Location,
		IsActive: true,
	}
	if req.IsActive != nil {
		ward.IsActive = *req.IsActive
	}
	if req.DepartmentID != "" {
		did, err := parseUUID(req.DepartmentID)
		if err != nil {
			return nil, err
		}
		ok, err := s.repo.DepartmentExists(did)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, ErrNotFound
		}
		ward.DepartmentID = &did
	}
	if err := s.repo.CreateWard(ward); err != nil {
		return nil, err
	}
	return s.repo.FindWardByID(ward.ID)
}

func (s *service) UpdateWard(id string, req WardRequest) (*models.Ward, error) {
	wardID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	w, err := s.repo.FindWardByID(wardID)
	if err != nil {
		return nil, err
	}
	if req.Code != "" {
		w.Code = req.Code
	}
	if req.Name != "" {
		w.Name = req.Name
	}
	if req.Location != "" {
		w.Location = req.Location
	}
	if req.IsActive != nil {
		w.IsActive = *req.IsActive
	}
	if req.DepartmentID != "" {
		did, err := parseUUID(req.DepartmentID)
		if err != nil {
			return nil, err
		}
		ok, err := s.repo.DepartmentExists(did)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, ErrNotFound
		}
		w.DepartmentID = &did
	}
	if err := s.repo.UpdateWard(w); err != nil {
		return nil, err
	}
	return s.repo.FindWardByID(w.ID)
}

func (s *service) ListBeds(wardID, status string) ([]models.Bed, error) {
	var wid *uuid.UUID
	if wardID != "" {
		id, err := parseUUID(wardID)
		if err != nil {
			return nil, err
		}
		wid = &id
	}
	return s.repo.ListBeds(wid, status)
}

func (s *service) CreateBed(req BedRequest) (*models.Bed, error) {
	wardID, err := parseUUID(req.WardID)
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.FindWardByID(wardID); err != nil {
		return nil, err
	}
	bed := &models.Bed{
		WardID:   wardID,
		BedNo:    req.BedNo,
		BedType:  req.BedType,
		Status:   req.Status,
		IsActive: true,
	}
	if req.IsActive != nil {
		bed.IsActive = *req.IsActive
	}
	if err := s.repo.CreateBed(bed); err != nil {
		return nil, err
	}
	return s.repo.FindBedByID(bed.ID)
}

func (s *service) UpdateBed(id string, req BedRequest) (*models.Bed, error) {
	bedID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	b, err := s.repo.FindBedByID(bedID)
	if err != nil {
		return nil, err
	}
	if req.WardID != "" {
		wardID, err := parseUUID(req.WardID)
		if err != nil {
			return nil, err
		}
		if _, err := s.repo.FindWardByID(wardID); err != nil {
			return nil, err
		}
		b.WardID = wardID
	}
	if req.BedNo != "" {
		b.BedNo = req.BedNo
	}
	if req.BedType != "" {
		b.BedType = req.BedType
	}
	if req.Status != "" {
		b.Status = req.Status
	}
	if req.IsActive != nil {
		b.IsActive = *req.IsActive
	}
	if err := s.repo.UpdateBed(b); err != nil {
		return nil, err
	}
	return s.repo.FindBedByID(b.ID)
}

func (s *service) SetBedStatus(id, status string) (*models.Bed, error) {
	bedID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	b, err := s.repo.FindBedByID(bedID)
	if err != nil {
		return nil, err
	}
	// A bed held by an active admission cannot be marked available.
	if b.Status == models.BedOccupied && status != models.BedOccupied {
		return nil, ErrInvalidState
	}
	b.Status = status
	if err := s.repo.UpdateBed(b); err != nil {
		return nil, err
	}
	return s.repo.FindBedByID(b.ID)
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

func (s *service) ListAdmissions(f AdmissionFilter, scope *models.DataScope) ([]models.Admission, error) {
	return s.repo.ListAdmissions(f, scope)
}

func (s *service) GetAdmission(id string, scope *models.DataScope) (*models.Admission, error) {
	admissionID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	return s.repo.FindAdmissionByID(admissionID, scope)
}

func (s *service) Admit(req AdmitRequest, admittedByUserID uuid.UUID) (*models.Admission, error) {
	patientID, err := parseUUID(req.PatientID)
	if err != nil {
		return nil, err
	}
	departmentID, err := parseUUID(req.DepartmentID)
	if err != nil {
		return nil, err
	}
	doctorID, err := parseUUID(req.DoctorID)
	if err != nil {
		return nil, err
	}

	if ok, err := s.repo.PatientExists(patientID); err != nil {
		return nil, err
	} else if !ok {
		return nil, ErrNotFound
	}
	if ok, err := s.repo.DepartmentExists(departmentID); err != nil {
		return nil, err
	} else if !ok {
		return nil, ErrNotFound
	}
	if _, err := s.repo.FindDoctorByID(doctorID); err != nil {
		return nil, err
	}

	var bedID *uuid.UUID
	if req.BedID != "" {
		id, err := parseUUID(req.BedID)
		if err != nil {
			return nil, err
		}
		if _, err := s.repo.FindBedByID(id); err != nil {
			return nil, err
		}
		bedID = &id
	}

	admissionDate := time.Now()
	if req.AdmissionDate != "" {
		d, err := time.Parse("2006-01-02", req.AdmissionDate)
		if err != nil {
			return nil, err
		}
		admissionDate = d
	}

	admissionType := req.AdmissionType
	if admissionType == "" {
		admissionType = models.AdmissionTypePlanned
	}

	var expected *time.Time
	if req.ExpectedDischargeDate != "" {
		d, err := time.Parse("2006-01-02", req.ExpectedDischargeDate)
		if err != nil {
			return nil, err
		}
		expected = &d
	}

	year := time.Now().Year()
	no, err := s.repo.NextAdmissionNumber(year)
	if err != nil {
		return nil, err
	}

	a := &models.Admission{
		AdmissionNo:           no,
		PatientID:             patientID,
		DepartmentID:          departmentID,
		DoctorID:              doctorID,
		BedID:                 bedID,
		AdmissionType:         admissionType,
		AdmissionDate:         admissionDate,
		AdmissionTime:         req.AdmissionTime,
		Reason:                req.Reason,
		Diagnosis:             req.Diagnosis,
		Notes:                 req.Notes,
		ExpectedDischargeDate: expected,
		Status:                models.AdmissionAdmitted,
		AdmittedByUserID:      admittedByUserID,
	}

	var alloc *models.AdmissionBed
	if bedID != nil {
		alloc = &models.AdmissionBed{
			BedID:           *bedID,
			FromDate:        admissionDate,
			ChangedByUserID: admittedByUserID,
		}
	}

	enc := &models.Encounter{
		PatientID:       patientID,
		DepartmentID:    departmentID,
		DoctorID:        doctorID,
		EncounterType:   models.EncounterTypeIPD,
		VisitType:       models.VisitTypeNew,
		VisitDate:       admissionDate,
		Status:          models.EncounterRegistered,
		PaymentStatus:   models.PaymentUnpaid,
		CreatedByUserID: admittedByUserID,
	}

	if err := s.repo.CreateAdmissionWithEncounter(a, alloc, enc); err != nil {
		return nil, err
	}
	return s.repo.FindAdmissionByID(a.ID, nil)
}

func (s *service) UpdateAdmission(id string, req UpdateAdmissionRequest, userID uuid.UUID, scope *models.DataScope) (*models.Admission, error) {
	admissionID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	a, err := s.repo.FindAdmissionByID(admissionID, scope)
	if err != nil {
		return nil, err
	}

	if req.Status != "" && req.Status != a.Status {
		switch req.Status {
		case models.AdmissionCancelled:
			if a.Status == models.AdmissionDischarged || a.Status == models.AdmissionCancelled {
				return nil, ErrInvalidState
			}
			if err := s.repo.ReleaseBed(a.ID); err != nil {
				return nil, err
			}
			a.Status = models.AdmissionCancelled
		case models.AdmissionAdmitted:
			a.Status = models.AdmissionAdmitted
		default:
			return nil, ErrInvalidState
		}
	}

	if req.DepartmentID != "" {
		did, err := parseUUID(req.DepartmentID)
		if err != nil {
			return nil, err
		}
		if ok, err := s.repo.DepartmentExists(did); err != nil {
			return nil, err
		} else if !ok {
			return nil, ErrNotFound
		}
		a.DepartmentID = did
	}
	if req.DoctorID != "" {
		docID, err := parseUUID(req.DoctorID)
		if err != nil {
			return nil, err
		}
		if _, err := s.repo.FindDoctorByID(docID); err != nil {
			return nil, err
		}
		a.DoctorID = docID
	}
	if req.AdmissionType != "" {
		a.AdmissionType = req.AdmissionType
	}
	if req.Reason != "" {
		a.Reason = req.Reason
	}
	if req.Diagnosis != "" {
		a.Diagnosis = req.Diagnosis
	}
	if req.Notes != "" {
		a.Notes = req.Notes
	}
	if req.ExpectedDischargeDate != "" {
		d, err := time.Parse("2006-01-02", req.ExpectedDischargeDate)
		if err != nil {
			return nil, err
		}
		a.ExpectedDischargeDate = &d
	}

	if err := s.repo.UpdateAdmission(a); err != nil {
		return nil, err
	}
	return s.repo.FindAdmissionByID(a.ID, scope)
}

func (s *service) TransferBed(id string, req TransferBedRequest, userID uuid.UUID, scope *models.DataScope) (*models.Admission, error) {
	admissionID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	newBedID, err := parseUUID(req.BedID)
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.FindAdmissionByID(admissionID, scope); err != nil {
		return nil, err
	}
	if err := s.repo.TransferBed(admissionID, newBedID, req.Reason, userID); err != nil {
		return nil, err
	}
	return s.repo.FindAdmissionByID(admissionID, scope)
}

// ---------------------------------------------------------------------------
// Clinical chart
// ---------------------------------------------------------------------------

func (s *service) requireActiveAdmission(id string, scope *models.DataScope) (*models.Admission, error) {
	admissionID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	a, err := s.repo.FindAdmissionByID(admissionID, scope)
	if err != nil {
		return nil, err
	}
	if a.Status != models.AdmissionAdmitted && a.Status != models.AdmissionTransferred {
		return nil, ErrInvalidState
	}
	return a, nil
}

func (s *service) AddNote(id string, req NoteRequest, userID uuid.UUID, scope *models.DataScope) (*models.ProgressNote, error) {
	admissionID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	a, err := s.repo.FindAdmissionByID(admissionID, scope)
	if err != nil {
		return nil, err
	}
	n := &models.ProgressNote{
		AdmissionID:      a.ID,
		NoteType:         req.NoteType,
		Notes:            req.Notes,
		Shift:            req.Shift,
		Vitals:           req.Vitals,
		RecordedByUserID: userID,
	}
	if err := s.repo.CreateNote(n); err != nil {
		return nil, err
	}
	return n, nil
}

func (s *service) AddOrder(id string, req OrderRequest, userID uuid.UUID, scope *models.DataScope) (*models.AdmissionOrder, error) {
	admissionID, err := parseUUID(id)
	if err != nil {
		return nil, err
	}
	a, err := s.repo.FindAdmissionByID(admissionID, scope)
	if err != nil {
		return nil, err
	}
	status := req.Status
	if status == "" {
		status = models.OrderOrdered
	}
	o := &models.AdmissionOrder{
		AdmissionID:    a.ID,
		OrderType:      req.OrderType,
		Description:    req.Description,
		Frequency:      req.Frequency,
		Quantity:       req.Quantity,
		Notes:          req.Notes,
		Status:         status,
		OrderedByUserID: userID,
	}
	if err := s.repo.CreateOrder(o); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *service) UpdateOrderStatus(admissionID, orderID string, req OrderStatusRequest, scope *models.DataScope) (*models.AdmissionOrder, error) {
	uid, err := parseUUID(admissionID)
	if err != nil {
		return nil, err
	}
	a, err := s.repo.FindAdmissionByID(uid, scope)
	if err != nil {
		return nil, err
	}
	oid, err := parseUUID(orderID)
	if err != nil {
		return nil, err
	}
	o, err := s.repo.FindOrderByID(oid)
	if err != nil {
		return nil, err
	}
	if o.AdmissionID != a.ID {
		return nil, ErrNotFound
	}
	o.Status = req.Status
	if err := s.repo.UpdateOrder(o); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *service) AddDiet(id string, req DietRequest, userID uuid.UUID, scope *models.DataScope) (*models.DietOrder, error) {
	a, err := s.requireActiveAdmission(id, scope)
	if err != nil {
		return nil, err
	}
	status := req.Status
	if status == "" {
		status = models.DietOrdered
	}
	d := &models.DietOrder{
		AdmissionID:      a.ID,
		DietType:         req.DietType,
		Schedule:         req.Schedule,
		Instructions:     req.Instructions,
		Status:           status,
		OrderedByUserID:  userID,
	}
	if err := s.repo.CreateDiet(d); err != nil {
		return nil, err
	}
	return d, nil
}

// ---------------------------------------------------------------------------
// Discharge
// ---------------------------------------------------------------------------

func (s *service) Discharge(id string, req DischargeRequest, userID uuid.UUID, scope *models.DataScope) (*models.Admission, error) {
	a, err := s.requireActiveAdmission(id, scope)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	dischargeDate := now
	if req.DischargeDate != "" {
		d, err := time.Parse("2006-01-02", req.DischargeDate)
		if err != nil {
			return nil, err
		}
		dischargeDate = d
	}

	var followUp *time.Time
	if req.FollowUpDate != "" {
		d, err := time.Parse("2006-01-02", req.FollowUpDate)
		if err != nil {
			return nil, err
		}
		followUp = &d
	}

	summary := &models.DischargeSummary{
		AdmissionID:           a.ID,
		DischargeType:         req.DischargeType,
		FinalDiagnosis:        req.FinalDiagnosis,
		TreatmentGiven:        req.TreatmentGiven,
		ProceduresDone:        req.ProceduresDone,
		MedicinesAtDischarge:  req.MedicinesAtDischarge,
		FollowUpInstructions:  req.FollowUpInstructions,
		FollowUpDate:          followUp,
		Summary:               req.Summary,
		DischargeNotes:        req.DischargeNotes,
	}

	a.Status = models.AdmissionDischarged
	a.DischargedAt = &dischargeDate
	a.DischargedByUserID = &userID

	if err := s.repo.Discharge(a, summary); err != nil {
		return nil, err
	}
	return s.repo.FindAdmissionByID(a.ID, scope)
}

// ---------------------------------------------------------------------------
// Occupancy
// ---------------------------------------------------------------------------

func (s *service) WardOccupancy() ([]WardOccupancyRow, error) {
	return s.repo.WardOccupancy()
}