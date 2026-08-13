package reports

import (
	"database/sql"
	"time"

	"github.com/ahms/backend/internal/models"
	"gorm.io/gorm"
)

// Count is a simple aggregate row (id -> count) used across group-bys.
type Count struct {
	ID    string
	Count int64
}

// Repository is the data-access layer for reports.
type Repository interface {
	AllDepartments() ([]models.Department, error)

	CountOPDEncounters(f Filters) (int64, error)
	CountCompletedOPD(f Filters) (int64, error)
	CountIPDAdmissions(f Filters) (int64, error)
	CountCurrentIPD() (int64, error)
	CountNewPatients(f Filters) (int64, error)
	CountVisitingPatients(f Filters) (int64, error)
	CountAppointments(f Filters) (int64, error)
	CountReferrals(f Filters) (int64, error)
	CountPendingReferrals(f Filters) (int64, error)
	CountTreatmentPlans(f Filters) (int64, error)
	CountSessionsCompleted(f Filters) (int64, error)
	CountDispensedPrescriptions(f Filters) (int64, error)
	CountDietOrders(f Filters) (int64, error)

	OPDByDepartment(f Filters) (map[string]int64, error)
	IPDByDepartment(f Filters) (map[string]int64, error)
	ProceduresByDepartment(f Filters) (map[string]int64, error)
	DispensingByDepartment(f Filters) (map[string]int64, error)
	DietByDepartment(f Filters) (map[string]int64, error)

	BillingTotals(f Filters) (RevenueRow, error)
	RevenueByDay(f Filters) ([]RevenueRow, error)
	RevenueByService(f Filters) ([]RevenueRow, error)
	RevenueByDepartment(f Filters) ([]RevenueRow, error)

	DispensingItems(f Filters) ([]DispenseRow, int64, int64, error)
	StockSnapshot(expiryDays int) ([]StockRow, error)

	DoctorActivity(f Filters) ([]DoctorReportRow, error)

	GenderBreakdown(f Filters) ([]LabelCount, error)
	AgeBreakdown(f Filters) ([]LabelCount, error)

	PlanStatusBreakdown(f Filters) ([]LabelCount, error)
	SessionStatusBreakdown(f Filters) ([]LabelCount, error)
	ProceduresBreakdown(f Filters) ([]ProcedureCount, error)
	TherapistBreakdown(f Filters) ([]LabelCount, error)

	ReferralByStatus(f Filters) ([]LabelCount, error)
	ReferralByFromDepartment(f Filters) ([]DeptCount, error)
	ReferralByToDepartment(f Filters) ([]DeptCount, error)

	BedOccupancy() (total, occupied int64, err error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository builds a reports Repository.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// dayRange returns [start, end) boundaries for a date range so date and
// timestamp columns can share one comparison idiom. end is exclusive.
func dayRange(f Filters) (time.Time, time.Time) {
	from := f.From
	if from.IsZero() {
		from = time.Now().AddDate(0, 0, -30)
	}
	to := f.To
	if to.IsZero() {
		to = time.Now()
	}
	start := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, time.UTC)
	end := time.Date(to.Year(), to.Month(), to.Day()+1, 0, 0, 0, 0, time.UTC)
	return start, end
}

func (r *repository) scopeDepartment(q *gorm.DB, deptID string) *gorm.DB {
	if deptID != "" {
		return q.Where("department_id = ?", deptID)
	}
	return q
}

func (r *repository) countWhere(table, column string, f Filters) (int64, error) {
	start, end := dayRange(f)
	q := r.db.Table(table).Where(column+" >= ? AND "+column+" < ?", start, end)
	q = r.scopeDepartment(q, f.DepartmentID)
	var n int64
	err := q.Count(&n).Error
	return n, err
}

// groupByID runs `SELECT key, COUNT(*) FROM ... WHERE ... GROUP BY key`
// and returns a map key -> count.
func (r *repository) groupByID(q *gorm.DB, key string) (map[string]int64, error) {
	rows, err := q.Group(key).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int64{}
	for rows.Next() {
		var id string
		var n int64
		if err := rows.Scan(&id, &n); err != nil {
			return nil, err
		}
		out[id] = n
	}
	return out, rows.Err()
}

func (r *repository) AllDepartments() ([]models.Department, error) {
	var depts []models.Department
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&depts).Error
	return depts, err
}

func (r *repository) CountOPDEncounters(f Filters) (int64, error) {
	start, end := dayRange(f)
	q := r.db.Model(&models.Encounter{}).
		Where("encounter_type = ? AND visit_date >= ? AND visit_date < ?", models.EncounterTypeOPD, start, end)
	return r.countHelper(r.scopeDepartment(q, f.DepartmentID))
}

func (r *repository) CountCompletedOPD(f Filters) (int64, error) {
	start, end := dayRange(f)
	q := r.db.Model(&models.Encounter{}).
		Where("encounter_type = ? AND status = ? AND visit_date >= ? AND visit_date < ?",
			models.EncounterTypeOPD, models.EncounterCompleted, start, end)
	return r.countHelper(r.scopeDepartment(q, f.DepartmentID))
}

func (r *repository) CountIPDAdmissions(f Filters) (int64, error) {
	start, end := dayRange(f)
	q := r.db.Model(&models.Admission{}).
		Where("admission_date >= ? AND admission_date < ?", start, end)
	return r.countHelper(r.scopeDepartment(q, f.DepartmentID))
}

func (r *repository) countHelper(q *gorm.DB) (int64, error) {
	var n int64
	err := q.Count(&n).Error
	return n, err
}

func (r *repository) CountCurrentIPD() (int64, error) {
	var n int64
	err := r.db.Model(&models.Admission{}).
		Where("status IN ?", []string{models.AdmissionAdmitted, models.AdmissionTransferred}).
		Count(&n).Error
	return n, err
}

func (r *repository) CountNewPatients(f Filters) (int64, error) {
	return r.countWhere("patients", "created_at", f)
}

func (r *repository) CountVisitingPatients(f Filters) (int64, error) {
	start, end := dayRange(f)
	var n int64
	err := r.db.Model(&models.Encounter{}).
		Where("visit_date >= ? AND visit_date < ?", start, end).
		Distinct("patient_id").
		Count(&n).Error
	return n, err
}

func (r *repository) CountAppointments(f Filters) (int64, error) {
	start, end := dayRange(f)
	var n int64
	err := r.db.Model(&models.Appointment{}).
		Where("appointment_date >= ? AND appointment_date < ?", start, end).
		Count(&n).Error
	return n, err
}

func (r *repository) CountReferrals(f Filters) (int64, error) {
	return r.countWhere("referrals", "created_at", f)
}

func (r *repository) CountPendingReferrals(f Filters) (int64, error) {
	start, end := dayRange(f)
	var n int64
	err := r.db.Model(&models.Referral{}).
		Where("created_at >= ? AND created_at < ? AND status IN ?", start, end,
			[]string{models.ReferralCreated, models.ReferralReceived, models.ReferralAccepted, models.ReferralConsultationStarted}).
		Count(&n).Error
	return n, err
}

func (r *repository) CountTreatmentPlans(f Filters) (int64, error) {
	return r.countWhere("treatment_plans", "created_at", f)
}

func (r *repository) CountSessionsCompleted(f Filters) (int64, error) {
	start, end := dayRange(f)
	var n int64
	err := r.db.Model(&models.TreatmentSession{}).
		Where("status = ? AND session_date >= ? AND session_date < ?", models.SessionCompleted, start, end).
		Count(&n).Error
	return n, err
}

func (r *repository) CountDispensedPrescriptions(f Filters) (int64, error) {
	start, end := dayRange(f)
	q := r.db.Model(&models.Prescription{}).
		Where("status IN ? AND created_at >= ? AND created_at < ?",
			[]string{models.PrescriptionPartiallyDispensed, models.PrescriptionDispensed}, start, end)
	q = r.scopeDepartment(q, f.DepartmentID)
	return r.countHelper(q)
}

func (r *repository) CountDietOrders(f Filters) (int64, error) {
	start, end := dayRange(f)
	q := r.db.Table("diet_orders").
		Joins("JOIN admissions a ON a.id = diet_orders.admission_id").
		Where("diet_orders.deleted_at IS NULL AND diet_orders.created_at >= ? AND diet_orders.created_at < ?", start, end)
	if f.DepartmentID != "" {
		q = q.Where("a.department_id = ?", f.DepartmentID)
	}
	return r.countHelper(q)
}

// OPDByDepartment groups OPD encounters per department.
func (r *repository) OPDByDepartment(f Filters) (map[string]int64, error) {
	start, end := dayRange(f)
	q := r.db.Table("encounters").
		Select("department_id, COUNT(*) AS n").
		Where("deleted_at IS NULL AND encounter_type = ? AND visit_date >= ? AND visit_date < ?", models.EncounterTypeOPD, start, end)
	return r.groupByID(q, "department_id")
}

func (r *repository) IPDByDepartment(f Filters) (map[string]int64, error) {
	start, end := dayRange(f)
	q := r.db.Table("admissions").
		Select("department_id, COUNT(*) AS n").
		Where("deleted_at IS NULL AND admission_date >= ? AND admission_date < ?", start, end)
	return r.groupByID(q, "department_id")
}

func (r *repository) ProceduresByDepartment(f Filters) (map[string]int64, error) {
	start, end := dayRange(f)
	q := r.db.Table("treatment_plans").
		Select("d.department_id, COUNT(*) AS n").
		Joins("JOIN doctors d ON d.id = treatment_plans.doctor_id").
		Where("treatment_plans.deleted_at IS NULL AND treatment_plans.created_at >= ? AND treatment_plans.created_at < ?", start, end)
	return r.groupByID(q, "d.department_id")
}

func (r *repository) DispensingByDepartment(f Filters) (map[string]int64, error) {
	start, end := dayRange(f)
	q := r.db.Table("prescriptions").
		Select("e.department_id, COUNT(*) AS n").
		Joins("JOIN encounters e ON e.id = prescriptions.encounter_id").
		Where("prescriptions.deleted_at IS NULL AND prescriptions.status IN ? AND prescriptions.created_at >= ? AND prescriptions.created_at < ?",
			[]string{models.PrescriptionPartiallyDispensed, models.PrescriptionDispensed}, start, end)
	return r.groupByID(q, "e.department_id")
}

func (r *repository) DietByDepartment(f Filters) (map[string]int64, error) {
	start, end := dayRange(f)
	q := r.db.Table("diet_orders").
		Select("a.department_id, COUNT(*) AS n").
		Joins("JOIN admissions a ON a.id = diet_orders.admission_id").
		Where("diet_orders.deleted_at IS NULL AND diet_orders.created_at >= ? AND diet_orders.created_at < ?", start, end)
	return r.groupByID(q, "a.department_id")
}

// BillingTotals sums the whole bill ledger in the range.
func (r *repository) BillingTotals(f Filters) (RevenueRow, error) {
	start, end := dayRange(f)
	var row RevenueRow
	err := r.db.Raw(`SELECT COUNT(*) AS bills, COALESCE(SUM(total_amount),0) AS total,
		COALESCE(SUM(discount),0) AS discount, COALESCE(SUM(net_amount),0) AS net,
		COALESCE(SUM(paid_amount),0) AS paid, COALESCE(SUM(due_amount),0) AS due
		FROM bills WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?`, start, end).
		Scan(&row).Error
	row.Key = "Total"
	return row, err
}


func (r *repository) RevenueByDay(f Filters) ([]RevenueRow, error) {
	start, end := dayRange(f)
	var rows []RevenueRow
	err := r.db.Raw(`SELECT TO_CHAR(b.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS key,
		COUNT(*) AS bills, COALESCE(SUM(b.total_amount),0) AS total,
		COALESCE(SUM(b.discount),0) AS discount, COALESCE(SUM(b.net_amount),0) AS net,
		COALESCE(SUM(b.paid_amount),0) AS paid, COALESCE(SUM(b.due_amount),0) AS due
		FROM bills b WHERE b.deleted_at IS NULL AND b.created_at >= ? AND b.created_at < ?
		GROUP BY 1 ORDER BY 1`, start, end).Scan(&rows).Error
	return rows, err
}

func (r *repository) RevenueByService(f Filters) ([]RevenueRow, error) {
	start, end := dayRange(f)
	var rows []RevenueRow
	err := r.db.Raw(`SELECT bi.service_type AS key, COUNT(*) AS bills,
		COALESCE(SUM(bi.amount),0) AS total, 0 AS discount, COALESCE(SUM(bi.amount),0) AS net,
		0 AS paid, 0 AS due
		FROM bill_items bi
		JOIN bills b ON b.id = bi.bill_id
		WHERE b.deleted_at IS NULL AND b.created_at >= ? AND b.created_at < ?
		GROUP BY 1 ORDER BY 1`, start, end).Scan(&rows).Error
	return rows, err
}

func (r *repository) RevenueByDepartment(f Filters) ([]RevenueRow, error) {
	start, end := dayRange(f)
	var rows []RevenueRow
	err := r.db.Raw(`SELECT COALESCE(d.name, 'Walk-in / Unlinked') AS key, COUNT(*) AS bills,
		COALESCE(SUM(b.total_amount),0) AS total, COALESCE(SUM(b.discount),0) AS discount,
		COALESCE(SUM(b.net_amount),0) AS net, COALESCE(SUM(b.paid_amount),0) AS paid,
		COALESCE(SUM(b.due_amount),0) AS due
		FROM bills b
		LEFT JOIN encounters e ON e.id = b.encounter_id
		LEFT JOIN departments d ON d.id = e.department_id
		WHERE b.deleted_at IS NULL AND b.created_at >= ? AND b.created_at < ?
		GROUP BY 1 ORDER BY 1`, start, end).Scan(&rows).Error
	return rows, err
}

// DispensingItems lists dispensed prescription line items in the range.
func (r *repository) DispensingItems(f Filters) ([]DispenseRow, int64, int64, error) {
	start, end := dayRange(f)
	q := r.db.Table("prescription_items pi").
		Select(`pi.created_at AS date, pi.medicine, pi.formulation, e.patient_id,
			COALESCE(pat.full_name,'') AS patient_name, COALESCE(d.name,'') AS department,
			pi.quantity, pi.dispensed_qty, p.status`).
		Joins("JOIN prescriptions p ON p.id = pi.prescription_id").
		Joins("JOIN encounters e ON e.id = p.encounter_id").
		Joins("LEFT JOIN departments d ON d.id = e.department_id").
		Joins("LEFT JOIN patients pat ON pat.id = e.patient_id").
		Where("pi.deleted_at IS NULL AND pi.dispensed_qty > 0 AND pi.created_at >= ? AND pi.created_at < ?", start, end).
		Order("pi.created_at DESC")
	if f.DepartmentID != "" {
		q = q.Where("e.department_id = ?", f.DepartmentID)
	}
	var rows []DispenseRow
	if err := q.Scan(&rows).Error; err != nil {
		return nil, 0, 0, err
	}
	var items, qty int64
	for _, rw := range rows {
		items++
		qty += int64(rw.DispensedQty)
	}
	return rows, items, qty, nil
}

// StockSnapshot loads every medicine with its current alert status.
func (r *repository) StockSnapshot(expiryDays int) ([]StockRow, error) {
	if expiryDays <= 0 {
		expiryDays = 30
	}
	now := time.Now()

	var meds []models.Medicine
	if err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&meds).Error; err != nil {
		return nil, err
	}
	out := make([]StockRow, 0, len(meds))
	for i := range meds {
		m := &meds[i]
		row := StockRow{
			MedicineID:  m.ID.String(),
			Name:        m.Name,
			Formulation: m.Formulation,
			Unit:        m.Unit,
			BatchNumber: m.BatchNumber,
			StockQty:    m.StockQty,
			Threshold:   m.LowStockThreshold,
			Status:      "OK",
		}
		if m.ExpiryDate != nil {
			row.ExpiryDate = m.ExpiryDate.Format("2006-01-02")
			days := int(m.ExpiryDate.Sub(now).Hours() / 24)
			if m.ExpiryDate.Before(now) {
				row.Status = "EXPIRED"
			} else if days <= expiryDays {
				row.Status = "NEAR_EXPIRY"
				row.DaysToExpiry = &days
			}
		}
		if row.Status == "OK" {
			if m.StockQty <= 0 {
				row.Status = "OUT_OF_STOCK"
			} else if m.StockQty <= m.LowStockThreshold {
				row.Status = "LOW"
			}
		}
		out = append(out, row)
	}
	return out, nil
}

// DoctorActivity aggregates workload per doctor via the encounter axis.
func (r *repository) DoctorActivity(f Filters) ([]DoctorReportRow, error) {
	start, end := dayRange(f)
	deptClause := ""
	args := []interface{}{start, end, start, end, start, end, start, end, start, end, true}
	if f.DepartmentID != "" {
		deptClause = " AND d.department_id = ?"
		args = append(args, f.DepartmentID)
	}
	rows, err := r.db.Raw(`SELECT d.id AS doctor_id, COALESCE(u.full_name,'') AS doctor,
		COALESCE(dep.name,'') AS department,
		COUNT(DISTINCT e.id) AS encounters,
		COUNT(DISTINCT c.id) AS consultations,
		COUNT(DISTINCT p.id) AS prescriptions,
		COUNT(DISTINCT ref.id) AS referrals,
		COUNT(DISTINCT tp.id) AS treatment_plans
		FROM doctors d
		JOIN users u ON u.id = d.user_id
		LEFT JOIN departments dep ON dep.id = d.department_id
		LEFT JOIN encounters e ON e.doctor_id = d.id AND e.deleted_at IS NULL
			AND e.visit_date >= ? AND e.visit_date < ?
		LEFT JOIN consultations c ON c.doctor_id = d.id AND c.deleted_at IS NULL
			AND c.created_at >= ? AND c.created_at < ?
		LEFT JOIN prescriptions p ON p.doctor_id = d.id AND p.deleted_at IS NULL
			AND p.created_at >= ? AND p.created_at < ?
		LEFT JOIN referrals ref ON ref.referred_by_user_id = u.id AND ref.deleted_at IS NULL
			AND ref.created_at >= ? AND ref.created_at < ?
		LEFT JOIN treatment_plans tp ON tp.doctor_id = d.id AND tp.deleted_at IS NULL
			AND tp.created_at >= ? AND tp.created_at < ?
		WHERE d.deleted_at IS NULL AND d.is_active = ?`+deptClause+`
		GROUP BY d.id, u.full_name, dep.name
		ORDER BY encounters DESC`, args...).
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DoctorReportRow
	for rows.Next() {
		var row DoctorReportRow
		if err := rows.Scan(&row.DoctorID, &row.Doctor, &row.Department,
			&row.Encounters, &row.Consultations, &row.Prescriptions,
			&row.Referrals, &row.TreatmentPlans); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}



func (r *repository) GenderBreakdown(f Filters) ([]LabelCount, error) {
	start, end := dayRange(f)
	rows, err := r.db.Raw(`SELECT COALESCE(NULLIF(gender,''),'UNKNOWN') AS label, COUNT(*) AS count
		FROM patients WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
		GROUP BY 1 ORDER BY count DESC`, start, end).Rows()
	return r.scanLabelCounts(rows, err)
}

func (r *repository) AgeBreakdown(f Filters) ([]LabelCount, error) {
	start, end := dayRange(f)
	rows, err := r.db.Raw(`SELECT CASE
			WHEN age < 6 THEN '0-5'
			WHEN age < 15 THEN '6-14'
			WHEN age < 31 THEN '15-30'
			WHEN age < 51 THEN '31-50'
			WHEN age < 71 THEN '51-70'
			ELSE '70+'
			END AS label, COUNT(*) AS count
		FROM patients WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
		GROUP BY 1`, start, end).Rows()
	return r.scanLabelCounts(rows, err)
}

func (r *repository) PlanStatusBreakdown(f Filters) ([]LabelCount, error) {
	start, end := dayRange(f)
	rows, err := r.db.Raw(`SELECT status AS label, COUNT(*) AS count
		FROM treatment_plans WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
		GROUP BY 1`, start, end).Rows()
	return r.scanLabelCounts(rows, err)
}

func (r *repository) SessionStatusBreakdown(f Filters) ([]LabelCount, error) {
	start, end := dayRange(f)
	rows, err := r.db.Raw(`SELECT status AS label, COUNT(*) AS count
		FROM treatment_sessions WHERE deleted_at IS NULL AND session_date >= ? AND session_date < ?
		GROUP BY 1`, start, end).Rows()
	return r.scanLabelCounts(rows, err)
}

func (r *repository) ProceduresBreakdown(f Filters) ([]ProcedureCount, error) {
	start, end := dayRange(f)
	rows, err := r.db.Raw(`SELECT COALESCE(pt.name,'Other') AS procedure_name,
		COUNT(DISTINCT tp.id) AS plans,
		COALESCE(SUM(tp.planned_sessions),0) AS planned_sessions,
		COALESCE(SUM(CASE WHEN ts.status = 'COMPLETED' THEN 1 ELSE 0 END),0) AS completed_sessions
		FROM treatment_plans tp
		LEFT JOIN procedure_types pt ON pt.id = tp.procedure_type_id
		LEFT JOIN treatment_sessions ts ON ts.plan_id = tp.id AND ts.deleted_at IS NULL
		WHERE tp.deleted_at IS NULL AND tp.created_at >= ? AND tp.created_at < ?
		GROUP BY 1 ORDER BY plans DESC`, start, end).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ProcedureCount
	for rows.Next() {
		var pc ProcedureCount
		if err := rows.Scan(&pc.ProcedureName, &pc.Plans, &pc.PlannedSessions, &pc.CompletedSessions); err != nil {
			return nil, err
		}
		out = append(out, pc)
	}
	return out, rows.Err()
}

func (r *repository) TherapistBreakdown(f Filters) ([]LabelCount, error) {
	start, end := dayRange(f)
	rows, err := r.db.Raw(`SELECT COALESCE(u.full_name,'Unassigned') AS label, COUNT(*) AS count
		FROM treatment_sessions ts
		LEFT JOIN users u ON u.id = ts.therapist_user_id
		WHERE ts.deleted_at IS NULL AND ts.session_date >= ? AND ts.session_date < ?
		GROUP BY 1 ORDER BY count DESC`, start, end).Rows()
	return r.scanLabelCounts(rows, err)
}

func (r *repository) ReferralByStatus(f Filters) ([]LabelCount, error) {
	start, end := dayRange(f)
	rows, err := r.db.Raw(`SELECT status AS label, COUNT(*) AS count
		FROM referrals WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
		GROUP BY 1`, start, end).Rows()
	return r.scanLabelCounts(rows, err)
}

func (r *repository) scanLabelCounts(rows *sql.Rows, err error) ([]LabelCount, error) {
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []LabelCount
	for rows.Next() {
		var lc LabelCount
		if err := rows.Scan(&lc.Label, &lc.Count); err != nil {
			return nil, err
		}
		out = append(out, lc)
	}
	return out, rows.Err()
}

func (r *repository) ReferralByFromDepartment(f Filters) ([]DeptCount, error) {
	return r.referralDepts(f, "FROM")
}

func (r *repository) ReferralByToDepartment(f Filters) ([]DeptCount, error) {
	return r.referralDepts(f, "TO")
}

func (r *repository) referralDepts(f Filters, dir string) ([]DeptCount, error) {
	start, end := dayRange(f)
	join := "departments d ON d.id = r.from_department_id"
	if dir == "TO" {
		join = "departments d ON d.id = r.to_department_id"
	}
	rows, err := r.db.Raw(`SELECT COALESCE(d.name,'Unknown') AS department, COUNT(*) AS count
		FROM referrals r JOIN `+join+`
		WHERE r.deleted_at IS NULL AND r.created_at >= ? AND r.created_at < ?
		GROUP BY 1 ORDER BY count DESC`, start, end).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DeptCount
	for rows.Next() {
		var dc DeptCount
		if err := rows.Scan(&dc.Department, &dc.Count); err != nil {
			return nil, err
		}
		out = append(out, dc)
	}
	return out, rows.Err()
}

// BedOccupancy returns total and currently-occupied beds.
func (r *repository) BedOccupancy() (total, occupied int64, err error) {
	if err := r.db.Model(&models.Bed{}).Count(&total).Error; err != nil {
		return 0, 0, err
	}
	err = r.db.Model(&models.Bed{}).
		Where("status = ?", models.BedOccupied).
		Count(&occupied).Error
	return total, occupied, err
}

var _ Repository = (*repository)(nil)
