package timeline

import (
	"github.com/google/uuid"
)

// Service contains timeline business logic.
type Service interface {
	GetPatientTimeline(patientID uuid.UUID) (TimelineResponse, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetPatientTimeline(patientID uuid.UUID) (TimelineResponse, error) {
	patient, err := s.repo.FindPatient(patientID)
	if err != nil {
		return TimelineResponse{}, err
	}
	encounters, err := s.repo.FindEncountersWithHistory(patientID)
	if err != nil {
		return TimelineResponse{}, err
	}
	plans, err := s.repo.FindTreatmentPlans(patientID)
	if err != nil {
		return TimelineResponse{}, err
	}
	return toResponse(patient, encounters, plans), nil
}
