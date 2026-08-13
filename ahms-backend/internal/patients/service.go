package patients

import (
	"errors"
	"math"
	"time"

	"github.com/ahms/backend/internal/models"
	"github.com/google/uuid"
)

// ErrDuplicateMobile signals that existing patients already match the
// new registration (same mobile, alternate mobile, email, name+mobile, or
// name+DOB) and the caller did not pass force=true.
var ErrDuplicateMobile = errors.New("one or more existing patients match this registration (mobile, alternate mobile, email, or name + DOB)")

// Service contains patient business logic.
type Service interface {
	Create(req CreatePatientRequest, registeredByUserID uuid.UUID) (*models.Patient, []models.Patient, error)
	List(search string, scope *models.DataScope) ([]models.Patient, error)
	GetByID(id uuid.UUID, scope *models.DataScope) (*models.Patient, error)
	Update(id uuid.UUID, req UpdatePatientRequest, scope *models.DataScope) (*models.Patient, error)
	Delete(id uuid.UUID, scope *models.DataScope) error
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// Create returns (createdPatient, nil, nil) on success, or
// (nil, existingDuplicates, ErrDuplicateMobile) when duplicates are
// found and Force was not set — the handler turns that into a 409 with
// the existing records so the receptionist can decide.
func (s *service) Create(req CreatePatientRequest, registeredByUserID uuid.UUID) (*models.Patient, []models.Patient, error) {
	var dob *time.Time
	if req.DOB != "" {
		parsed, err := time.Parse("2006-01-02", req.DOB)
		if err != nil {
			return nil, nil, err
		}
		dob = &parsed
	}

	if !req.Force {
		existing, err := s.repo.FindDuplicates(req.Mobile, req.AlternateMobile, req.Email, req.FullName, dob)
		if err != nil {
			return nil, nil, err
		}
		if len(existing) > 0 {
			return nil, existing, ErrDuplicateMobile
		}
	}

	age := req.Age
	if dob != nil {
		// Age is auto-derived from DOB whenever a DOB is supplied.
		age = ageFromDOB(*dob)
	}

	registrationType := req.RegistrationType
	if registrationType == "" {
		registrationType = models.RegistrationTypeWalkIn
	}

	patient := &models.Patient{
		FullName:         req.FullName,
		Gender:           req.Gender,
		DOB:              dob,
		Age:              age,
		Mobile:           req.Mobile,
		AlternateMobile:  req.AlternateMobile,
		Email:            req.Email,
		BloodGroup:       req.BloodGroup,
		MaritalStatus:    req.MaritalStatus,
		Occupation:       req.Occupation,
		PhotoURL:         req.PhotoURL,
		Address:          req.Address,
		City:             req.City,
		State:            req.State,
		District:         req.District,
		Pincode:          req.Pincode,
		Country:          req.Country,
		EmergencyContactName:     req.EmergencyContactName,
		EmergencyContactRelation: req.EmergencyContactRelation,
		EmergencyContact:         req.EmergencyContact,
		EmergencyContactAddress:  req.EmergencyContactAddress,
		HeightCm:          req.HeightCm,
		WeightKg:          req.WeightKg,
		BMI:               computeBMI(req.HeightCm, req.WeightKg),
		BloodPressure:     req.BloodPressure,
		Pulse:             req.Pulse,
		Sugar:             req.Sugar,
		Allergies:         req.Allergies,
		ChronicDiseases:   req.ChronicDiseases,
		CurrentMedication: req.CurrentMedication,
		RegistrationType:  registrationType,
		ReferredBy:        req.ReferredBy,
		Branch:            req.Branch,
		Remarks:           req.Remarks,
		RegisteredByUserID: registeredByUserID,
		IsActive:           true,
	}

	if err := s.repo.CreateWithUHID(patient); err != nil {
		return nil, nil, err
	}
	return patient, nil, nil
}

func (s *service) List(search string, scope *models.DataScope) ([]models.Patient, error) {
	return s.repo.FindAll(search, scope)
}

func (s *service) GetByID(id uuid.UUID, scope *models.DataScope) (*models.Patient, error) {
	return s.repo.FindByID(id, scope)
}

func (s *service) Update(id uuid.UUID, req UpdatePatientRequest, scope *models.DataScope) (*models.Patient, error) {
	patient, err := s.repo.FindByID(id, scope)
	if err != nil {
		return nil, err
	}

	var dob *time.Time
	if req.DOB != "" {
		parsed, err := time.Parse("2006-01-02", req.DOB)
		if err != nil {
			return nil, err
		}
		dob = &parsed
	}

	age := req.Age
	if dob != nil {
		age = ageFromDOB(*dob)
	}

	registrationType := req.RegistrationType
	if registrationType == "" {
		registrationType = models.RegistrationTypeWalkIn
	}

	patient.FullName = req.FullName
	patient.Gender = req.Gender
	patient.DOB = dob
	patient.Age = age
	patient.Mobile = req.Mobile
	patient.AlternateMobile = req.AlternateMobile
	patient.Email = req.Email
	patient.BloodGroup = req.BloodGroup
	patient.MaritalStatus = req.MaritalStatus
	patient.Occupation = req.Occupation
	patient.PhotoURL = req.PhotoURL
	patient.Address = req.Address
	patient.City = req.City
	patient.State = req.State
	patient.District = req.District
	patient.Pincode = req.Pincode
	patient.Country = req.Country
	patient.EmergencyContactName = req.EmergencyContactName
	patient.EmergencyContactRelation = req.EmergencyContactRelation
	patient.EmergencyContact = req.EmergencyContact
	patient.EmergencyContactAddress = req.EmergencyContactAddress
	patient.HeightCm = req.HeightCm
	patient.WeightKg = req.WeightKg
	patient.BMI = computeBMI(req.HeightCm, req.WeightKg)
	patient.BloodPressure = req.BloodPressure
	patient.Pulse = req.Pulse
	patient.Sugar = req.Sugar
	patient.Allergies = req.Allergies
	patient.ChronicDiseases = req.ChronicDiseases
	patient.CurrentMedication = req.CurrentMedication
	patient.RegistrationType = registrationType
	patient.ReferredBy = req.ReferredBy
	patient.Branch = req.Branch
	patient.Remarks = req.Remarks
	if req.IsActive != nil {
		patient.IsActive = *req.IsActive
	}

	if err := s.repo.Update(patient); err != nil {
		return nil, err
	}
	return patient, nil
}

func (s *service) Delete(id uuid.UUID, scope *models.DataScope) error {
	return s.repo.Delete(id, scope)
}

// ageFromDOB computes the patient's age in whole years from their birth
// date, using calendar month/day comparison so leap-day birthdays resolve
// correctly.
func ageFromDOB(dob time.Time) int {
	now := time.Now()
	years := now.Year() - dob.Year()
	if now.Month() < dob.Month() || (now.Month() == dob.Month() && now.Day() < dob.Day()) {
		years--
	}
	if years < 0 {
		return 0
	}
	return years
}

// computeBMI returns the BMI rounded to one decimal place when both height
// (cm) and weight (kg) are provided and valid; otherwise 0.
func computeBMI(heightCm, weightKg float64) float64 {
	if heightCm <= 0 || weightKg <= 0 {
		return 0
	}
	hm := heightCm / 100
	bmi := weightKg / (hm * hm)
	return math.Round(bmi*10) / 10
}
