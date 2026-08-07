package dashboard

import (
	"time"
	"github.com/ahms/backend/internal/models"
)

// Service assembles the dashboard summary from the repository's
// individual aggregate queries.
type Service interface {
	GetSummary(scope *models.DataScope) (*SummaryResponse, error)
}

type service struct {
	repo Repository
}

// NewService builds a Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetSummary(scope *models.DataScope) (*SummaryResponse, error) {
	now := time.Now()

	patientsToday, err := s.repo.CountPatientsRegisteredOn(now)
	if err != nil {
		return nil, err
	}
	appointmentsToday, err := s.repo.CountAppointmentsOn(now, scope)
	if err != nil {
		return nil, err
	}
	deptCount, err := s.repo.CountActiveDepartments()
	if err != nil {
		return nil, err
	}
	doctorCount, err := s.repo.CountActiveDoctors()
	if err != nil {
		return nil, err
	}
	recentPatients, err := s.repo.RecentPatients(10)
	if err != nil {
		return nil, err
	}
	todaysAppts, err := s.repo.AppointmentsOn(now, scope)
	if err != nil {
		return nil, err
	}

	recent := make([]RecentPatient, 0, len(recentPatients))
	for _, p := range recentPatients {
		recent = append(recent, RecentPatient{
			ID:        p.ID.String(),
			UHID:      p.UHID,
			FullName:  p.FullName,
			Mobile:    p.Mobile,
			CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	todayList := make([]TodayAppointment, 0, len(todaysAppts))
	for _, a := range todaysAppts {
		todayList = append(todayList, TodayAppointment{
			ID:          a.ID.String(),
			PatientName: a.Patient.FullName,
			DoctorName:  a.Doctor.User.FullName,
			TokenNumber: a.TokenNumber,
			Status:      a.Status,
		})
	}

	return &SummaryResponse{
		TodaysPatientsCount:     patientsToday,
		TodaysAppointmentsCount: appointmentsToday,
		DepartmentCount:         deptCount,
		ActiveDoctorsCount:      doctorCount,
		RecentRegistrations:     recent,
		TodaysAppointments:      todayList,
	}, nil
}
