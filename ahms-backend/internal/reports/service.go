package reports

import (
	"fmt"
	"strconv"
)

// Service composes report data from the repository and produces the flat
// tables used by both the JSON API and the export endpoints.
type Service interface {
	Summary(f Filters) (*SummaryReport, error)
	DepartmentDistribution(f Filters) (*DepartmentDistributionReport, error)
	Revenue(f Filters) (*RevenueReport, error)
	PharmacyDispensing(f Filters) (*PharmacyDispensingReport, error)
	PharmacyStock(expiryDays int) (*PharmacyStockReport, error)
	Doctors(f Filters) (*DoctorReport, error)
	Patients(f Filters) (*PatientReport, error)
	Panchakarma(f Filters) (*PanchakarmaReport, error)
	Referrals(f Filters) (*ReferralReport, error)
	Table(reportType string, f Filters) (*ReportTable, error)
}

type service struct {
	repo Repository
}

// NewService builds a reports Service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func fmtF(f Filters) (string, string) {
	return f.From.Format("2006-01-02"), f.To.Format("2006-01-02")
}

func (s *service) Summary(f Filters) (*SummaryReport, error) {
	from, to := fmtF(f)
	var sum SummaryReport
	sum.From, sum.To = from, to

	var err error
	if sum.OPDEncounters, err = s.repo.CountOPDEncounters(f); err != nil {
		return nil, err
	}
	if sum.CompletedOPD, err = s.repo.CountCompletedOPD(f); err != nil {
		return nil, err
	}
	if sum.IPDAdmissions, err = s.repo.CountIPDAdmissions(f); err != nil {
		return nil, err
	}
	if sum.CurrentIPD, err = s.repo.CountCurrentIPD(); err != nil {
		return nil, err
	}
	if sum.NewPatients, err = s.repo.CountNewPatients(f); err != nil {
		return nil, err
	}
	if sum.VisitingPatients, err = s.repo.CountVisitingPatients(f); err != nil {
		return nil, err
	}
	if sum.Appointments, err = s.repo.CountAppointments(f); err != nil {
		return nil, err
	}
	if sum.ReferralsCreated, err = s.repo.CountReferrals(f); err != nil {
		return nil, err
	}
	if sum.PendingReferrals, err = s.repo.CountPendingReferrals(f); err != nil {
		return nil, err
	}
	if sum.TreatmentPlans, err = s.repo.CountTreatmentPlans(f); err != nil {
		return nil, err
	}
	if sum.SessionsCompleted, err = s.repo.CountSessionsCompleted(f); err != nil {
		return nil, err
	}
	if sum.DispensedPrescriptions, err = s.repo.CountDispensedPrescriptions(f); err != nil {
		return nil, err
	}
	if sum.DietOrders, err = s.repo.CountDietOrders(f); err != nil {
		return nil, err
	}
	bt, err := s.repo.BillingTotals(f)
	if err != nil {
		return nil, err
	}
	sum.Bills = bt.Bills
	sum.TotalAmount = bt.Total
	sum.Discount = bt.Discount
	sum.NetAmount = bt.Net
	sum.PaidAmount = bt.Paid
	sum.DueAmount = bt.Due
	sum.BedTotal, sum.BedOccupied, _ = s.repo.BedOccupancy()

	cols := []string{"Metric", "Value"}
	rows := [][]string{
		{"OPD Encounters", itoa(sum.OPDEncounters)},
		{"Completed OPD", itoa(sum.CompletedOPD)},
		{"IPD Admissions", itoa(sum.IPDAdmissions)},
		{"Currently Admitted", itoa(sum.CurrentIPD)},
		{"New Patients", itoa(sum.NewPatients)},
		{"Visiting Patients", itoa(sum.VisitingPatients)},
		{"Appointments", itoa(sum.Appointments)},
		{"Referrals Created", itoa(sum.ReferralsCreated)},
		{"Pending Referrals", itoa(sum.PendingReferrals)},
		{"Treatment Plans", itoa(sum.TreatmentPlans)},
		{"Sessions Completed", itoa(sum.SessionsCompleted)},
		{"Prescriptions Dispensed", itoa(sum.DispensedPrescriptions)},
		{"Diet Orders", itoa(sum.DietOrders)},
		{"Bills", itoa(sum.Bills)},
		{"Total Amount", money(sum.TotalAmount)},
		{"Discount", money(sum.Discount)},
		{"Net Amount", money(sum.NetAmount)},
		{"Collected", money(sum.PaidAmount)},
		{"Outstanding", money(sum.DueAmount)},
		{"Beds Total", itoa(sum.BedTotal)},
		{"Beds Occupied", itoa(sum.BedOccupied)},
	}
	sum.Table = ReportTable{Title: fmt.Sprintf("Summary %s – %s", from, to), Columns: cols, Rows: rows}

	return &sum, nil
}

func (s *service) DepartmentDistribution(f Filters) (*DepartmentDistributionReport, error) {
	from, to := fmtF(f)
	depts, err := s.repo.AllDepartments()
	if err != nil {
		return nil, err
	}
	opd, err := s.repo.OPDByDepartment(f)
	if err != nil {
		return nil, err
	}
	ipd, err := s.repo.IPDByDepartment(f)
	if err != nil {
		return nil, err
	}
	proc, err := s.repo.ProceduresByDepartment(f)
	if err != nil {
		return nil, err
	}
	disp, err := s.repo.DispensingByDepartment(f)
	if err != nil {
		return nil, err
	}
	diet, err := s.repo.DietByDepartment(f)
	if err != nil {
		return nil, err
	}

	report := &DepartmentDistributionReport{From: from, To: to}
	var tot DepartmentRow
	tot.DepartmentName = "Total"
	for i := range depts {
		d := &depts[i]
		id := d.ID.String()
		row := DepartmentRow{
			DepartmentID:   id,
			DepartmentCode: d.Code,
			DepartmentName: d.Name,
			OPD:            opd[id],
			IPD:            ipd[id],
			Procedures:     proc[id],
			Dispensing:     disp[id],
			Diet:           diet[id],
		}
		report.Rows = append(report.Rows, row)
		tot.OPD += row.OPD
		tot.IPD += row.IPD
		tot.Procedures += row.Procedures
		tot.Dispensing += row.Dispensing
		tot.Diet += row.Diet
	}
	report.Totals = tot

	cols := []string{"Department", "OPD", "IPD", "Procedure", "Dispensing", "Diet"}
	rows := make([][]string, 0, len(report.Rows)+1)
	for _, rw := range report.Rows {
		rows = append(rows, []string{
			rw.DepartmentName + " (" + rw.DepartmentCode + ")",
			itoa(rw.OPD), itoa(rw.IPD), itoa(rw.Procedures), itoa(rw.Dispensing), itoa(rw.Diet),
		})
	}
	rows = append(rows, []string{
		"Total", itoa(tot.OPD), itoa(tot.IPD), itoa(tot.Procedures), itoa(tot.Dispensing), itoa(tot.Diet),
	})
	report.Table = ReportTable{Title: fmt.Sprintf("Department Distribution %s – %s", from, to), Columns: cols, Rows: rows}
	return report, nil
}

func (s *service) Revenue(f Filters) (*RevenueReport, error) {
	from, to := fmtF(f)
	if f.GroupBy == "" {
		f.GroupBy = "day"
	}
	report := &RevenueReport{From: from, To: to, GroupBy: f.GroupBy}

	var rows []RevenueRow
	var err error
	switch f.GroupBy {
	case "department":
		rows, err = s.repo.RevenueByDepartment(f)
	case "service":
		rows, err = s.repo.RevenueByService(f)
	default:
		rows, err = s.repo.RevenueByDay(f)
		f.GroupBy = "day"
	}
	if err != nil {
		return nil, err
	}
	report.Rows = rows

	total, err := s.repo.BillingTotals(f)
	if err != nil {
		return nil, err
	}
	total.Key = "Total"
	report.Totals = total

	cols := []string{"Group", "Bills", "Total", "Discount", "Net", "Collected", "Due"}
	rt := make([][]string, 0, len(rows)+1)
	for _, rw := range rows {
		rt = append(rt, []string{
			rw.Key, itoa(rw.Bills), money(rw.Total), money(rw.Discount), money(rw.Net), money(rw.Paid), money(rw.Due),
		})
	}
	rt = append(rt, []string{
		"Total", itoa(total.Bills), money(total.Total), money(total.Discount), money(total.Net), money(total.Paid), money(total.Due),
	})
	report.Table = ReportTable{Title: fmt.Sprintf("Revenue by %s %s – %s", f.GroupBy, from, to), Columns: cols, Rows: rt}
	return report, nil
}

func (s *service) PharmacyDispensing(f Filters) (*PharmacyDispensingReport, error) {
	from, to := fmtF(f)
	rows, items, qty, err := s.repo.DispensingItems(f)
	if err != nil {
		return nil, err
	}
	report := &PharmacyDispensingReport{From: from, To: to, TotalItems: items, TotalQty: qty, Rows: rows}
	cols := []string{"Date", "Medicine", "Formulation", "Patient", "Department", "Qty", "Dispensed", "Status"}
	rt := make([][]string, 0, len(rows))
	for _, rw := range rows {
		rt = append(rt, []string{
			rw.Date, rw.Medicine, rw.Formulation, rw.PatientName, rw.Department,
			itoa(int64(rw.Quantity)), itoa(int64(rw.DispensedQty)), rw.Status,
		})
	}
	report.Table = ReportTable{Title: fmt.Sprintf("Pharmacy Dispensing %s – %s", from, to), Columns: cols, Rows: rt}
	return report, nil
}

func (s *service) PharmacyStock(expiryDays int) (*PharmacyStockReport, error) {
	rows, err := s.repo.StockSnapshot(expiryDays)
	if err != nil {
		return nil, err
	}
	report := &PharmacyStockReport{Total: len(rows)}
	for i := range rows {
		switch rows[i].Status {
		case "LOW":
			report.Low++
		case "OUT_OF_STOCK":
			report.OutOfStock++
		case "NEAR_EXPIRY":
			report.NearExpiry++
		case "EXPIRED":
			report.Expired++
		}
	}
	report.Rows = rows
	cols := []string{"Medicine", "Formulation", "Unit", "Batch", "Stock", "Threshold", "Expiry", "Status"}
	rt := make([][]string, 0, len(rows))
	for _, rw := range rows {
		rt = append(rt, []string{
			rw.Name, rw.Formulation, rw.Unit, rw.BatchNumber,
			ftoa(rw.StockQty), ftoa(rw.Threshold), rw.ExpiryDate, rw.Status,
		})
	}
	report.Table = ReportTable{Title: "Pharmacy Stock Snapshot", Columns: cols, Rows: rt}
	return report, nil
}

func (s *service) Doctors(f Filters) (*DoctorReport, error) {
	from, to := fmtF(f)
	rows, err := s.repo.DoctorActivity(f)
	if err != nil {
		return nil, err
	}
	report := &DoctorReport{From: from, To: to, Rows: rows}
	for i := range rows {
		report.Total.Encounters += rows[i].Encounters
		report.Total.Consultations += rows[i].Consultations
		report.Total.Prescriptions += rows[i].Prescriptions
		report.Total.Referrals += rows[i].Referrals
		report.Total.TreatmentPlans += rows[i].TreatmentPlans
	}
	report.Total.Doctor = "Total"
	cols := []string{"Doctor", "Department", "Encounters", "Consultations", "Prescriptions", "Referrals", "Treatment Plans"}
	rt := make([][]string, 0, len(rows)+1)
	for _, rw := range rows {
		rt = append(rt, []string{
			rw.Doctor, rw.Department, itoa(rw.Encounters), itoa(rw.Consultations),
			itoa(rw.Prescriptions), itoa(rw.Referrals), itoa(rw.TreatmentPlans),
		})
	}
	rt = append(rt, []string{"Total", "", itoa(report.Total.Encounters), itoa(report.Total.Consultations),
		itoa(report.Total.Prescriptions), itoa(report.Total.Referrals), itoa(report.Total.TreatmentPlans)})
	report.Table = ReportTable{Title: fmt.Sprintf("Doctor-wise Workload %s – %s", from, to), Columns: cols, Rows: rt}
	return report, nil
}

func (s *service) Patients(f Filters) (*PatientReport, error) {
	from, to := fmtF(f)
	report := &PatientReport{From: from, To: to}
	var err error
	if report.NewRegistrations, err = s.repo.CountNewPatients(f); err != nil {
		return nil, err
	}
	if report.VisitingPatients, err = s.repo.CountVisitingPatients(f); err != nil {
		return nil, err
	}
	if report.GenderBreakdown, err = s.repo.GenderBreakdown(f); err != nil {
		return nil, err
	}
	if report.AgeBreakdown, err = s.repo.AgeBreakdown(f); err != nil {
		return nil, err
	}

	cols := []string{"Category", "Value"}
	rt := [][]string{{"New Registrations", itoa(report.NewRegistrations)}, {"Visiting Patients", itoa(report.VisitingPatients)}}
	for _, g := range report.GenderBreakdown {
		rt = append(rt, []string{"Gender: " + g.Label, itoa(g.Count)})
	}
	for _, a := range report.AgeBreakdown {
		rt = append(rt, []string{"Age " + a.Label, itoa(a.Count)})
	}
	report.Table = ReportTable{Title: fmt.Sprintf("Patient Statistics %s – %s", from, to), Columns: cols, Rows: rt}
	return report, nil
}

func (s *service) Panchakarma(f Filters) (*PanchakarmaReport, error) {
	from, to := fmtF(f)
	report := &PanchakarmaReport{From: from, To: to}
	var err error
	if report.PlansCreated, err = s.repo.CountTreatmentPlans(f); err != nil {
		return nil, err
	}
	if report.SessionsCompleted, err = s.repo.CountSessionsCompleted(f); err != nil {
		return nil, err
	}
	if report.PlanStatus, err = s.repo.PlanStatusBreakdown(f); err != nil {
		return nil, err
	}
	if report.SessionStatus, err = s.repo.SessionStatusBreakdown(f); err != nil {
		return nil, err
	}
	if report.ByProcedure, err = s.repo.ProceduresBreakdown(f); err != nil {
		return nil, err
	}
	if report.ByTherapist, err = s.repo.TherapistBreakdown(f); err != nil {
		return nil, err
	}

	cols := []string{"Procedure", "Plans", "Planned Sessions", "Completed Sessions"}
	rt := make([][]string, 0, len(report.ByProcedure)+1)
	for _, p := range report.ByProcedure {
		rt = append(rt, []string{p.ProcedureName, itoa(p.Plans), itoa(p.PlannedSessions), itoa(p.CompletedSessions)})
	}
	rt = append(rt, []string{"Total", itoa(report.PlansCreated), "", itoa(report.SessionsCompleted)})
	report.Table = ReportTable{Title: fmt.Sprintf("Panchakarma Report %s – %s", from, to), Columns: cols, Rows: rt}
	return report, nil
}

func (s *service) Referrals(f Filters) (*ReferralReport, error) {
	from, to := fmtF(f)
	report := &ReferralReport{From: from, To: to}
	var err error
	if report.Created, err = s.repo.CountReferrals(f); err != nil {
		return nil, err
	}
	if report.Pending, err = s.repo.CountPendingReferrals(f); err != nil {
		return nil, err
	}
	if report.ByStatus, err = s.repo.ReferralByStatus(f); err != nil {
		return nil, err
	}
	if report.ByFromDepartment, err = s.repo.ReferralByFromDepartment(f); err != nil {
		return nil, err
	}
	if report.ByToDepartment, err = s.repo.ReferralByToDepartment(f); err != nil {
		return nil, err
	}
	for _, st := range report.ByStatus {
		if st.Label == "COMPLETED" {
			report.Completed = st.Count
		}
	}

	cols := []string{"Status", "Count"}
	rt := make([][]string, 0, len(report.ByStatus)+1)
	for _, st := range report.ByStatus {
		rt = append(rt, []string{st.Label, itoa(st.Count)})
	}
	rt = append(rt, []string{"Pending", itoa(report.Pending)})
	report.Table = ReportTable{Title: fmt.Sprintf("Referral Report %s – %s", from, to), Columns: cols, Rows: rt}
	return report, nil
}

// Table resolves a report type into its flat export table.
func (s *service) Table(reportType string, f Filters) (*ReportTable, error) {
	switch reportType {
	case "summary":
		r, err := s.Summary(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "department-distribution":
		r, err := s.DepartmentDistribution(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "revenue":
		r, err := s.Revenue(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "pharmacy-dispensing":
		r, err := s.PharmacyDispensing(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "pharmacy-stock":
		r, err := s.PharmacyStock(f.ExpiryDays)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "doctors":
		r, err := s.Doctors(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "patients":
		r, err := s.Patients(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "panchakarma":
		r, err := s.Panchakarma(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	case "referrals":
		r, err := s.Referrals(f)
		if err != nil {
			return nil, err
		}
		return &r.Table, nil
	default:
		return nil, fmt.Errorf("unknown report type: %s", reportType)
	}
}

func itoa(n int64) string {
	return strconv.FormatInt(n, 10)
}

func money(n float64) string {
	return fmt.Sprintf("%.2f", n)
}

func ftoa(n float64) string {
	return fmt.Sprintf("%g", n)
}
