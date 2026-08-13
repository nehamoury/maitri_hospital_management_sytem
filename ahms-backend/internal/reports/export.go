package reports

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"html"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-pdf/fpdf"
)

// exportContentType returns the Content-Type and filename extension for a
// requested export format.
func exportContentType(format string) (ct string, ext string) {
	switch format {
	case "csv":
		return "text/csv", "csv"
	case "excel":
		return "application/vnd.ms-excel", "xls"
	case "pdf":
		return "application/pdf", "pdf"
	default:
		return "text/html; charset=utf-8", "html"
	}
}

// renderCSV serialises a report table as RFC 4180 CSV.
func renderCSV(t *ReportTable) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write(t.Columns); err != nil {
		return nil, err
	}
	for _, row := range t.Rows {
		if err := w.Write(row); err != nil {
			return nil, err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// renderExcel serialises a report table as SpreadsheetML 2003 XML, which
// Microsoft Excel opens natively without any third-party dependency.
func renderExcel(t *ReportTable) ([]byte, error) {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0"?>`)
	b.WriteString(`<?mso-application progid="Excel.Sheet"?>`)
	b.WriteString(`<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">`)
	b.WriteString(`<Worksheet ss:Name="Report"><Table>`)
	// Header row.
	b.WriteString(`<Row>`)
	for _, c := range t.Columns {
		b.WriteString(`<Cell><Data ss:Type="String">`)
		b.WriteString(html.EscapeString(c))
		b.WriteString(`</Data></Cell>`)
	}
	b.WriteString(`</Row>`)
	// Data rows.
	for _, row := range t.Rows {
		b.WriteString(`<Row>`)
		for _, cell := range row {
			ssType := "String"
			if _, err := strconv.ParseFloat(strings.ReplaceAll(cell, ",", ""), 64); err == nil && cell != "" {
				ssType = "Number"
			}
			b.WriteString(`<Cell><Data ss:Type="`)
			b.WriteString(ssType)
			b.WriteString(`">`)
			b.WriteString(html.EscapeString(cell))
			b.WriteString(`</Data></Cell>`)
		}
		b.WriteString(`</Row>`)
	}
	b.WriteString(`</Table></Worksheet></Workbook>`)
	return []byte(b.String()), nil
}

// renderPrint produces a standalone, print-friendly HTML page for the
// table. The browser's print dialog (Save as PDF) covers the PDF case.
func renderPrint(t *ReportTable) []byte {
	var b strings.Builder
	b.WriteString(`<!doctype html><html><head><meta charset="utf-8" /><title>`)
	b.WriteString(html.EscapeString(t.Title))
	b.WriteString(`</title><style>
		body{font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;margin:0;padding:24px}
		h1{font-size:18px;color:#0F766E;margin:0 0 4px}
		.sub{font-size:11px;color:#64748B;margin-bottom:16px}
		table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
		th{background:#0F766E;color:#fff;padding:6px 8px;text-align:left;font-size:11px;letter-spacing:0.5px}
		td{padding:5px 8px;border-bottom:1px solid #E2E8F0}
		tr:nth-child(even) td{background:#F8FAFC}
		tr:last-child td{font-weight:bold;border-top:2px solid #0F766E}
		.foot{margin-top:16px;text-align:center;font-size:10px;color:#94A3B8}
		@media print{body{padding:8px}}
		</style></head><body>
		<h1>`)
	b.WriteString(html.EscapeString(t.Title))
	b.WriteString(`</h1><div class="sub">Generated on `)
	b.WriteString(time.Now().Format("02 Jan 2006 15:04"))
	b.WriteString(`</div><table><thead><tr>`)
	for _, c := range t.Columns {
		b.WriteString(`<th>`)
		b.WriteString(html.EscapeString(c))
		b.WriteString(`</th>`)
	}
	b.WriteString(`</tr></thead><tbody>`)
	for _, row := range t.Rows {
		b.WriteString(`<tr>`)
		for _, cell := range row {
			b.WriteString(`<td>`)
			b.WriteString(html.EscapeString(cell))
			b.WriteString(`</td>`)
		}
		b.WriteString(`</tr>`)
	}
	b.WriteString(`</tbody></table><div class="foot">` + hospitalName + ` · AHMS</div></body></html>`)
	return []byte(b.String())
}

// renderPDF serialises a report table as a PDF document.
func renderPDF(t *ReportTable) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 15, 10)
	pdf.AddPage()

	// Title
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(190, 10, t.Title, "", 1, "C", false, 0, "")
	
	// Date generated
	pdf.SetFont("Arial", "I", 10)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(190, 10, "Generated on "+time.Now().Format("02 Jan 2006 15:04"), "", 1, "C", false, 0, "")
	pdf.Ln(5)

	// Determine column widths based on number of columns
	numCols := len(t.Columns)
	if numCols == 0 {
		numCols = 1
	}
	colWidth := 190.0 / float64(numCols)

	// Table Header
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(15, 118, 110) // AHMS teal
	pdf.SetTextColor(255, 255, 255)
	
	for _, col := range t.Columns {
		pdf.CellFormat(colWidth, 10, col, "1", 0, "L", true, 0, "")
	}
	pdf.Ln(-1)

	// Table Rows
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(0, 0, 0)
	
	for i, row := range t.Rows {
		// Alternate row color
		if i%2 == 0 {
			pdf.SetFillColor(248, 250, 252)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		
		// If it's the last row, make it bold (Total row)
		if i == len(t.Rows)-1 {
			pdf.SetFont("Arial", "B", 10)
		}

		// Calculate height for multi-line cells if needed (for simplicity, using fixed height here)
		lineHeight := 8.0
		for _, cell := range row {
			// Basic cell rendering. For robust PDF tables, we might need MultiCell, 
			// but for simple report tables, CellFormat is often sufficient.
			// Truncate long cells to prevent overflowing
			text := cell
			if len(text) > 40 {
				text = text[:37] + "..."
			}
			pdf.CellFormat(colWidth, lineHeight, text, "1", 0, "L", true, 0, "")
		}
		pdf.Ln(-1)
	}

	// Footer
	pdf.Ln(10)
	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(150, 150, 150)
	pdf.CellFormat(190, 10, hospitalName+" - AHMS", "", 0, "C", false, 0, "")

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// writeExport streams the rendered report with the right headers.
func writeExport(c http.ResponseWriter, format string, table *ReportTable) error {
	ct, ext := exportContentType(format)
	var data []byte
	var err error
	switch format {
	case "csv":
		data, err = renderCSV(table)
	case "excel":
		data, err = renderExcel(table)
	case "pdf":
		data, err = renderPDF(table)
	default:
		data = renderPrint(table)
	}
	if err != nil {
		return err
	}
	c.Header().Set("Content-Type", ct)
	slug := strings.ToLower(strings.ReplaceAll(table.Title, " ", "-"))
	filename := fmt.Sprintf("%s.%s", slug, ext)
	c.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	c.WriteHeader(http.StatusOK)
	_, err = c.Write(data)
	return err
}

const hospitalName = "Maitri College of Ayurvedic Medical & Research Institute, Anjora, Durg"
