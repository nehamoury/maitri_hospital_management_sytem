package lab

import (
	"fmt"
	"html"
	"strings"
	"time"

	"github.com/ahms/backend/internal/models"
)

const hospitalNameLab = "Maitri College of Ayurvedic Medical & Research Institute, Anjora, Durg"

// renderLabReport generates a print-friendly standalone HTML page for a lab order.
func renderLabReport(order *models.InvestigationOrder) string {
	var b strings.Builder

	patientName := order.Patient.FullName
	patientUHID := order.Patient.UHID
	orderedBy := order.OrderedByUser.FullName
	reviewedBy := ""
	reviewedAt := ""
	if order.ReviewedByUser != nil {
		reviewedBy = order.ReviewedByUser.FullName
	}
	if order.ReviewedAt != nil {
		reviewedAt = order.ReviewedAt.Format("02 Jan 2006 15:04")
	}

	b.WriteString(`<!doctype html><html><head><meta charset="utf-8">`)
	b.WriteString(`<title>Lab Report — ` + html.EscapeString(order.OrderNo) + `</title>`)
	b.WriteString(`<style>
		*{box-sizing:border-box;margin:0;padding:0}
		body{font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;padding:24px;font-size:13px}
		.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0F766E}
		.hospital-name{font-size:15px;font-weight:700;color:#0F766E}
		.hospital-sub{font-size:11px;color:#64748B;margin-top:2px}
		.order-info{text-align:right;font-size:11px;color:#475569}
		.order-no{font-size:16px;font-weight:700;color:#0F172A}
		.patient-box{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
		.patient-field label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#64748B}
		.patient-field p{font-size:13px;font-weight:600;color:#0F172A;margin-top:2px}
		.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#0F766E;margin:16px 0 8px}
		table{width:100%;border-collapse:collapse;font-size:12px}
		th{background:#0F766E;color:#fff;padding:7px 10px;text-align:left;font-size:11px;letter-spacing:0.3px}
		td{padding:7px 10px;border-bottom:1px solid #E2E8F0;vertical-align:top}
		tr:nth-child(even) td{background:#F8FAFC}
		.flag-HIGH,.flag-CRITICAL{color:#DC2626;font-weight:700}
		.flag-LOW{color:#D97706;font-weight:700}
		.flag-NORMAL{color:#16A34A}
		.status-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px}
		.badge-RESULT_AVAILABLE,.badge-DOCTOR_REVIEWED{background:#DCFCE7;color:#15803D}
		.badge-ORDERED{background:#EFF6FF;color:#1D4ED8}
		.badge-SAMPLE_COLLECTED{background:#FEF9C3;color:#854D0E}
		.badge-PROCESSING{background:#FFF7ED;color:#C2410C}
		.review-box{margin-top:16px;padding:12px;background:#FFFBEB;border-left:3px solid #F59E0B;border-radius:4px}
		.review-box h4{font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
		.footer{margin-top:24px;padding-top:12px;border-top:1px solid #E2E8F0;text-align:center;font-size:10px;color:#94A3B8}
		@media print{body{padding:8px}.no-print{display:none}}
	</style></head><body>`)

	// Header
	b.WriteString(`<div class="header">`)
	b.WriteString(`<div><div class="hospital-name">` + html.EscapeString(hospitalNameLab) + `</div>`)
	b.WriteString(`<div class="hospital-sub">NABH Accredited Ayurvedic Hospital</div></div>`)
	b.WriteString(`<div class="order-info">`)
	b.WriteString(`<div class="order-no">` + html.EscapeString(order.OrderNo) + `</div>`)
	b.WriteString(fmt.Sprintf(`<div>Date: %s</div>`, order.CreatedAt.Format("02 Jan 2006")))
	b.WriteString(fmt.Sprintf(`<div>Ordered by: %s</div>`, html.EscapeString(orderedBy)))
	b.WriteString(fmt.Sprintf(`<div>Priority: <strong>%s</strong></div>`, html.EscapeString(order.Priority)))
	b.WriteString(`</div></div>`)

	// Patient info box
	b.WriteString(`<div class="patient-box">`)
	b.WriteString(infoField("Patient Name", patientName))
	b.WriteString(infoField("UHID", patientUHID))
	b.WriteString(infoFieldHTML("Status", `<span class="status-badge badge-`+html.EscapeString(order.Status)+`">`+html.EscapeString(order.Status)+`</span>`))
	b.WriteString(`</div>`)

	if order.ClinicalNotes != "" {
		b.WriteString(`<div style="margin-bottom:12px;font-size:12px"><strong>Clinical Notes:</strong> ` + html.EscapeString(order.ClinicalNotes) + `</div>`)
	}

	// Sample info
	if order.Sample != nil {
		b.WriteString(`<div class="section-title">Sample Details</div>`)
		b.WriteString(`<div class="patient-box">`)
		b.WriteString(infoField("Sample Type", order.Sample.SampleType))
		b.WriteString(infoField("Collection Method", order.Sample.CollectionMethod))
		b.WriteString(infoField("Barcode", order.Sample.Barcode))
		b.WriteString(infoField("Collected By", order.Sample.CollectedByUser.FullName))
		b.WriteString(infoField("Collected At", order.Sample.CollectedAt.Format("02 Jan 2006 15:04")))
		b.WriteString(infoField("Adequate", func() string {
			if order.Sample.IsAdequate {
				return "Yes"
			}
			return "No"
		}()))
		b.WriteString(`</div>`)
	}

	// Results table
	b.WriteString(`<div class="section-title">Test Results</div>`)
	b.WriteString(`<table><thead><tr>`)
	b.WriteString(`<th>Test</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th><th>Remarks</th><th>Status</th>`)
	b.WriteString(`</tr></thead><tbody>`)

	for _, item := range order.Items {
		testName := item.Test.Name
		testCode := item.Test.Code
		flagClass := "flag-NORMAL"
		if item.ResultFlag != "" {
			flagClass = "flag-" + item.ResultFlag
		}
		b.WriteString(`<tr>`)
		b.WriteString(fmt.Sprintf(`<td><strong>%s</strong><br><span style="color:#94A3B8;font-size:10px">%s</span></td>`,
			html.EscapeString(testName), html.EscapeString(testCode)))
		b.WriteString(fmt.Sprintf(`<td class="%s"><strong>%s</strong></td>`, flagClass, html.EscapeString(item.ResultValue)))
		b.WriteString(fmt.Sprintf(`<td>%s</td>`, html.EscapeString(item.ResultUnit)))
		b.WriteString(fmt.Sprintf(`<td>%s</td>`, html.EscapeString(item.ReferenceRangeSnapshot)))
		b.WriteString(fmt.Sprintf(`<td class="%s">%s</td>`, flagClass, html.EscapeString(item.ResultFlag)))
		b.WriteString(fmt.Sprintf(`<td>%s</td>`, html.EscapeString(item.Remarks)))
		b.WriteString(fmt.Sprintf(`<td>%s</td>`, html.EscapeString(item.Status)))
		b.WriteString(`</tr>`)
		if item.ResultText != "" {
			b.WriteString(fmt.Sprintf(`<tr><td colspan="7" style="color:#475569;font-style:italic;font-size:11px;padding:4px 10px">%s</td></tr>`,
				html.EscapeString(item.ResultText)))
		}
	}
	b.WriteString(`</tbody></table>`)

	// Doctor review box
	if order.DoctorRemarks != "" {
		b.WriteString(`<div class="review-box">`)
		b.WriteString(`<h4>Doctor's Remarks</h4>`)
		b.WriteString(fmt.Sprintf(`<p>%s</p>`, html.EscapeString(order.DoctorRemarks)))
		if reviewedBy != "" {
			b.WriteString(fmt.Sprintf(`<p style="margin-top:6px;font-size:11px;color:#78350F">— %s, %s</p>`,
				html.EscapeString(reviewedBy), html.EscapeString(reviewedAt)))
		}
		b.WriteString(`</div>`)
	}

	// Footer
	b.WriteString(fmt.Sprintf(`<div class="footer">%s — Generated on %s</div>`,
		html.EscapeString(hospitalNameLab), time.Now().Format("02 Jan 2006 15:04")))

	b.WriteString(`</body></html>`)
	return b.String()
}

func infoField(label, value string) string {
	// Values carry free-text patient/staff input (names, notes, barcodes) and
	// must be escaped before being interpolated into the report HTML.
	return fmt.Sprintf(`<div class="patient-field"><label>%s</label><p>%s</p></div>`,
		html.EscapeString(label), html.EscapeString(value))
}

// infoFieldHTML is like infoField but takes a pre-escaped, trusted HTML
// fragment for the value (used only for the status badge, whose dynamic
// parts are escaped by the caller).
func infoFieldHTML(label, value string) string {
	return fmt.Sprintf(`<div class="patient-field"><label>%s</label><p>%s</p></div>`,
		html.EscapeString(label), value)
}
