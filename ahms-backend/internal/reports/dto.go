// Package reports implements backend-side aggregations for the hospital's
// operational reports: departmental distribution (OPD/IPD/Procedure/
// Dispensing/Diet), revenue, pharmacy, doctor, patient, Panchakarma and
// referral statistics, plus export to CSV, Excel (SpreadsheetML) and a
// print-friendly HTML view.
//
// All aggregation happens in the backend so the same data feeds the
// dashboard, reports page and exports.
package reports

import "time"

// Filters are the common query parameters for every report.
type Filters struct {
	From         time.Time
	To           time.Time
	DepartmentID string
	DoctorID     string
	GroupBy      string // revenue grouping: day | department | service
	ExpiryDays   int    // stock report horizon for near-expiry
}

// ReportTable is the flat, column/row representation of any report. The
// frontend renders it as a grid and the export endpoints render it as
// CSV / Excel / print HTML.
type ReportTable struct {
	Title   string   `json:"title"`
	Columns []string `json:"columns"`
	Rows    [][]string `json:"rows"`
}

// LabelCount is a name/count pair used for breakdowns and charts.
type LabelCount struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

// SummaryReport is the headline KPI snapshot for a date range.
type SummaryReport struct {
	From string `json:"from"`
	To   string `json:"to"`

	OPDEncounters          int64   `json:"opd_encounters"`
	CompletedOPD           int64   `json:"completed_opd"`
	IPDAdmissions          int64   `json:"ipd_admissions"`
	CurrentIPD             int64   `json:"current_ipd"`
	NewPatients            int64   `json:"new_patients"`
	VisitingPatients       int64   `json:"visiting_patients"`
	Appointments           int64   `json:"appointments"`
	ReferralsCreated       int64   `json:"referrals_created"`
	PendingReferrals       int64   `json:"pending_referrals"`
	TreatmentPlans         int64   `json:"treatment_plans"`
	SessionsCompleted      int64   `json:"sessions_completed"`
	DispensedPrescriptions int64   `json:"dispensed_prescriptions"`
	DietOrders             int64   `json:"diet_orders"`
	Bills                  int64   `json:"bills"`
	TotalAmount            float64 `json:"total_amount"`
	Discount               float64 `json:"discount"`
	NetAmount              float64 `json:"net_amount"`
	PaidAmount             float64 `json:"paid_amount"`
	DueAmount              float64 `json:"due_amount"`
	BedTotal               int64   `json:"bed_total"`
	BedOccupied            int64   `json:"bed_occupied"`
	Table                  ReportTable `json:"table"`
}

// DepartmentRow is one line of the department-distribution matrix.
type DepartmentRow struct {
	DepartmentID   string `json:"department_id"`
	DepartmentCode string `json:"department_code"`
	DepartmentName string `json:"department_name"`
	OPD            int64  `json:"opd"`
	IPD            int64  `json:"ipd"`
	Procedures     int64  `json:"procedures"`
	Dispensing     int64  `json:"dispensing"`
	Diet           int64  `json:"diet"`
}

// DepartmentDistributionReport is the live version of the paper
// "Department-wise distribution" sheet.
type DepartmentDistributionReport struct {
	From   string          `json:"from"`
	To     string          `json:"to"`
	Rows   []DepartmentRow `json:"rows"`
	Totals DepartmentRow   `json:"totals"`
	Table  ReportTable     `json:"table"`
}

// RevenueRow is one grouped line of the revenue report (by day,
// department, or service type).
type RevenueRow struct {
	Key      string  `json:"key"`
	Bills    int64   `json:"bills"`
	Total    float64 `json:"total"`
	Discount float64 `json:"discount"`
	Net      float64 `json:"net"`
	Paid     float64 `json:"paid"`
	Due      float64 `json:"due"`
}

// RevenueReport aggregates bills by the requested group.
type RevenueReport struct {
	From    string       `json:"from"`
	To      string       `json:"to"`
	GroupBy string       `json:"group_by"`
	Rows    []RevenueRow `json:"rows"`
	Totals  RevenueRow   `json:"totals"`
	Table   ReportTable  `json:"table"`
}

// DispenseRow is one dispensed prescription line item in the range.
type DispenseRow struct {
	Date          string `json:"date"`
	Medicine      string `json:"medicine"`
	Formulation   string `json:"formulation"`
	PatientID     string `json:"patient_id"`
	PatientName   string `json:"patient_name"`
	Department    string `json:"department"`
	Quantity      int    `json:"quantity"`
	DispensedQty  int    `json:"dispensed_qty"`
	Status        string `json:"status"`
}

// PharmacyDispensingReport lists what was actually given out.
type PharmacyDispensingReport struct {
	From       string       `json:"from"`
	To         string       `json:"to"`
	TotalItems int64        `json:"total_items"`
	TotalQty   int64        `json:"total_qty"`
	Rows       []DispenseRow `json:"rows"`
	Table      ReportTable  `json:"table"`
}

// StockRow is the current status of one medicine.
type StockRow struct {
	MedicineID string  `json:"medicine_id"`
	Name       string  `json:"name"`
	Formulation string `json:"formulation"`
	Unit       string  `json:"unit"`
	BatchNumber string `json:"batch_number"`
	StockQty   float64 `json:"stock_qty"`
	Threshold  float64 `json:"low_stock_threshold"`
	ExpiryDate string  `json:"expiry_date,omitempty"`
	DaysToExpiry *int  `json:"days_to_expiry,omitempty"`
	Status     string  `json:"status"`
}

// PharmacyStockReport is the current stock snapshot with alerts.
type PharmacyStockReport struct {
	Total    int       `json:"total"`
	Low      int       `json:"low"`
	OutOfStock int     `json:"out_of_stock"`
	NearExpiry int     `json:"near_expiry"`
	Expired  int       `json:"expired"`
	Rows     []StockRow `json:"rows"`
	Table    ReportTable `json:"table"`
}

// DoctorReportRow aggregates clinical activity per doctor.
type DoctorReportRow struct {
	DoctorID      string `json:"doctor_id"`
	Doctor        string `json:"doctor"`
	Department    string `json:"department"`
	Encounters    int64  `json:"encounters"`
	Consultations int64  `json:"consultations"`
	Prescriptions int64  `json:"prescriptions"`
	Referrals     int64  `json:"referrals"`
	TreatmentPlans int64 `json:"treatment_plans"`
}

// DoctorReport is the doctor-wise workload summary.
type DoctorReport struct {
	From  string           `json:"from"`
	To    string           `json:"to"`
	Rows  []DoctorReportRow `json:"rows"`
	Total DoctorReportRow   `json:"total"`
	Table ReportTable       `json:"table"`
}

// PatientReport covers registrations and demographics for the range.
type PatientReport struct {
	From              string       `json:"from"`
	To                string       `json:"to"`
	NewRegistrations  int64        `json:"new_registrations"`
	VisitingPatients  int64        `json:"visiting_patients"`
	GenderBreakdown   []LabelCount `json:"gender_breakdown"`
	AgeBreakdown      []LabelCount `json:"age_breakdown"`
	Table             ReportTable  `json:"table"`
}

// ProcedureCount is a procedure's plan/session summary.
type ProcedureCount struct {
	ProcedureName string `json:"procedure_name"`
	Plans         int64  `json:"plans"`
	PlannedSessions int64 `json:"planned_sessions"`
	CompletedSessions int64 `json:"completed_sessions"`
}

// PanchakarmaReport covers treatment plans and sessions.
type PanchakarmaReport struct {
	From              string          `json:"from"`
	To                string          `json:"to"`
	PlansCreated      int64           `json:"plans_created"`
	SessionsCompleted int64           `json:"sessions_completed"`
	PlanStatus        []LabelCount    `json:"plan_status"`
	SessionStatus     []LabelCount    `json:"session_status"`
	ByProcedure       []ProcedureCount `json:"by_procedure"`
	ByTherapist       []LabelCount    `json:"by_therapist"`
	Table             ReportTable     `json:"table"`
}

// DeptCount is a department name/count pair.
type DeptCount struct {
	Department string `json:"department"`
	Count      int64  `json:"count"`
}

// ReferralReport covers referral volume, status and flows.
type ReferralReport struct {
	From            string       `json:"from"`
	To              string       `json:"to"`
	Created         int64        `json:"created"`
	Pending         int64        `json:"pending"`
	Completed       int64        `json:"completed"`
	ByStatus        []LabelCount `json:"by_status"`
	ByFromDepartment []DeptCount `json:"by_from_department"`
	ByToDepartment  []DeptCount  `json:"by_to_department"`
	Table           ReportTable  `json:"table"`
}
