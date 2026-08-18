package diet

import (
	"context"
	"log"
	"strconv"
	"strings"
	"time"
)

// Scheduler automatically generates daily meal orders at a fixed hospital
// local time (Asia/Kolkata). It is safe to restart at any hour: the
// duplicate guard on (admission_id, scheduled_date, meal_type) makes a late
// startup or a re-run harmless. Distributed deployments with multiple
// backend replicas should gate the scheduler behind a leader lock before
// enabling it everywhere.
type Scheduler struct {
	service Service
	enabled bool
	genTime time.Duration // time-of-day offset from midnight (Asia/Kolkata)
	loc     *time.Location
	lastRun *time.Time // most recent generation date (Asia/Kolkata)
}

// NewScheduler builds the meal scheduler. enabled mirrors MEAL_AUTO_GEN
// (default true); genTime mirrors MEAL_GEN_TIME ("HH:MM", Asia/Kolkata,
// default "05:00").
func NewScheduler(service Service, enabled bool, genTime string) *Scheduler {
	s := &Scheduler{service: service, enabled: enabled, loc: kolkataLocation()}
	if hh, mm, ok := parseGenTime(genTime); ok {
		s.genTime = time.Duration(hh)*time.Hour + time.Duration(mm)*time.Minute
	} else {
		log.Printf("scheduler: invalid MEAL_GEN_TIME %q, falling back to 05:00", genTime)
		s.genTime = 5 * time.Hour
	}
	return s
}

func parseGenTime(s string) (int, int, bool) {
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, 0, false
	}
	hh, err1 := strconv.Atoi(parts[0])
	mm, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil || hh < 0 || hh > 23 || mm < 0 || mm > 59 {
		return 0, 0, false
	}
	return hh, mm, true
}

// Run starts the scheduler. It checks every 30 seconds whether the daily
// generation time (Asia/Kolkata) has been crossed today and, if so, runs
// exactly once per day. A startup after the daily time triggers an immediate
// catch-up run (idempotent via the duplicate guard).
func (s *Scheduler) Run(ctx context.Context) {
	if !s.enabled {
		log.Println("scheduler: MEAL_AUTO_GEN disabled, automatic meal generation off")
		return
	}
	log.Printf("scheduler: automatic meal generation enabled, daily time %s Asia/Kolkata", s.genTime.String())

	s.runOnceIfDue(time.Now())
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case now := <-ticker.C:
			s.runOnceIfDue(now)
		case <-ctx.Done():
			log.Println("scheduler: stopped")
			return
		}
	}
}

func (s *Scheduler) runOnceIfDue(now time.Time) {
	nowIST := now.In(s.loc)
	target := time.Date(nowIST.Year(), nowIST.Month(), nowIST.Day(), 0, 0, 0, 0, s.loc).Add(s.genTime)
	if nowIST.Before(target) {
		return
	}
	if s.lastRun != nil && s.lastRun.Year() == nowIST.Year() && s.lastRun.YearDay() == nowIST.YearDay() {
		return
	}
	s.lastRun = &nowIST
	count, err := s.service.GenerateDailyMeals(nowIST)
	if err != nil {
		log.Printf("scheduler: daily meal generation failed: %v", err)
		return
	}
	log.Printf("scheduler: generated %d meal orders for %s", count, nowIST.Format("2006-01-02"))
}
