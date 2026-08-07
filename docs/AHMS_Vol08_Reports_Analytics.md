# AHMS Volume 8 — Reports & Analytics Module

> **Enterprise-Grade Ayurvedic Hospital Management System**
> **Backend:** Go 1.22 · Gin · GORM · PostgreSQL 16
> **Frontend:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Framer Motion 12

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [Report Categories](#2-report-categories)
3. [Data Models](#3-data-models)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Pages](#5-frontend-pages)
6. [RBAC & Permissions](#6-rbac--permissions)
7. [Report Specifications](#7-report-specifications)
8. [Design System](#8-design-system)
9. [State Management](#9-state-management)
10. [Implementation Phases & Effort](#10-implementation-phases--effort)

---

## 1. Overview & Scope

### 1.1 Purpose

The Reports & Analytics module is an **aggregation layer** that queries data across all clinical and operational modules to generate actionable insights. It provides dashboards, tabular reports, charts, and export capabilities.

### 1.2 Architecture Principle

Reports are **read-only projections** of data from other modules. This module does not own data — it aggregates from:

- Patient Registry (Vol 2)
- OPD/Consultation (Vol 3)
- EMR/Referral (Vol 3)
- Panchakarma (Vol 4)
- Pharmacy (Vol 5)
- IPD (Vol 6)
- Billing (Vol 7)
- Audit Trail (existing)

### 1.3 Scope

| In Scope | Out Scope |
|----------|----------|
| Department-wise analytics | Real-time monitoring |
| Patient analytics (demographics, visit patterns) | Predictive analytics |
| Financial reports (revenue, collection, outstanding) | ML/AI recommendations |
| Clinical reports (outcomes, referrals) | External BI tool integration |
| Pharmacy reports (stock, dispensing, expiry) | |
| IPD reports (occupancy, LOS, discharge) | |
| Panchakarma reports (outcomes, utilization) | |
| Audit trail reports | |
| Export to PDF/CSV/Excel | |

---

## 2. Report Categories

### 2.1 Category Matrix

| Category | Department | Key Reports | Frequency |
|----------|-----------|-------------|-----------|
| **Operational** | All | Dashboard, occupancy, utilization | Daily |
| **Patient** | OPD/IPD | Demographics, visit patterns, outcomes | Weekly |
| **Financial** | Billing | Revenue, collection, outstanding, tax | Daily/Weekly |
| **Pharmacy** | Pharmacy | Stock, dispensing, expiry, purchase | Daily/Weekly |
| **Clinical** | Consultation | Diagnoses, prescriptions, referrals | Weekly |
| **IPD** | IPD | Admissions, discharges, LOS, beds | Daily |
| **Panchakarma** | Panchakarma | Outcomes, utilization, therapist perf | Weekly |
| **Audit** | Admin | User activity, data changes | On-demand |

### 2.2 Report List

| # | Report | Module | Description |
|---|--------|--------|-------------|
| 1 | Hospital Dashboard | Aggregated | Real-time hospital KPIs |
| 2 | Patient Demographics | Patient | Age, gender, locality distribution |
| 3 | OPD Visit Analytics | OPD | Visit trends, peak hours, doctor workload |
| 4 | Referral Analytics | Referral | Referral sources, conversion rates |
| 5 | Revenue Summary | Billing | Daily/weekly/monthly revenue |
| 6 | Collection Report | Billing | Collected vs outstanding |
| 7 | Outstanding Dues | Billing | All unpaid bills, aging analysis |
| 8 | Service-wise Revenue | Billing | Revenue by service category |
| 9 | Payment Method Analysis | Billing | Cash/card/UPI breakdown |
| 10 | Tax Collection | Billing | GST/tax collected |
| 11 | Discount Utilization | Billing | Discount usage and impact |
| 12 | Medicine Stock Report | Pharmacy | Current stock levels |
| 13 | Dispensing Report | Pharmacy | Medicines dispensed, quantities |
| 14 | Expiry Report | Pharmacy | Expired and near-expiry medicines |
| 15 | Purchase Report | Pharmacy | Procurement history and costs |
| 16 | Low Stock Alert | Pharmacy | Medicines below threshold |
| 17 | IPD Occupancy | IPD | Bed occupancy by ward |
| 18 | Admission Statistics | IPD | Admissions, discharges, LOS |
| 19 | Doctor Rounds Compliance | IPD | Rounds completed vs scheduled |
| 20 | Nursing Task Completion | IPD | Task completion rates by shift |
| 21 | PK Treatment Outcomes | Panchakarma | Outcome scores by therapy type |
| 22 | PK Utilization | Panchakarma | Therapist and room utilization |
| 23 | PK Material Usage | Panchakarma | Herbs/oils consumed |
| 24 | User Activity Audit | Audit | Login history, action logs |
| 25 | Doctor Performance | Aggregated | Consultations, outcomes, referrals |

---

## 3. Data Models

### 3.1 Report Query Model

```go
// internal/reports/dto.go

type ReportQuery struct {
    StartDate  string `form:"start_date" binding:"required"` // YYYY-MM-DD
    EndDate    string `form:"end_date" binding:"required"`
    Department string `form:"department"`                     // Filter by department
    DoctorID   string `form:"doctor_id"`                     // Filter by doctor
    WardType   string `form:"ward_type"`                     // Filter by ward type
    GroupBy    string `form:"group_by"`                      // day, week, month
    Page       int    `form:"page" binding:"omitempty,min=1"`
    PerPage    int    `form:"per_page" binding:"omitempty,min=1,max=100"`
}

type DateRange struct {
    StartDate time.Time
    EndDate   time.Time
}
```

### 3.2 Dashboard Model

```go
type DashboardData struct {
    // OPD
    TotalPatients     int64   `json:"total_patients"`
    TodayOPDVisits    int64   `json:"today_opd_visits"`
    WeeklyOPDVisits   int64   `json:"weekly_opd_visits"`
    ActiveDoctors     int64   `json:"active_doctors"`

    // IPD
    TotalBeds         int     `json:"total_beds"`
    OccupiedBeds      int     `json:"occupied_beds"`
    OccupancyRate     float64 `json:"occupancy_rate"`
    TodayAdmissions   int64   `json:"today_admissions"`
    TodayDischarges   int64   `json:"today_discharges"`

    // Billing
    TodayRevenue      float64 `json:"today_revenue"`
    TodayCollection   float64 `json:"today_collection"`
    TotalOutstanding  float64 `json:"total_outstanding"`
    MonthlyRevenue    float64 `json:"monthly_revenue"`

    // Pharmacy
    LowStockCount     int64   `json:"low_stock_count"`
    ExpiringCount     int64   `json:"expiring_count"`

    // Panchakarma
    TodayPKSessions   int64   `json:"today_pk_sessions"`
    AvgOutcomeScore   float64 `json:"avg_outcome_score"`

    // Referrals
    TodayReferrals    int64   `json:"today_referrals"`
    WeeklyReferrals   int64   `json:"weekly_referrals"`
}
```

### 3.3 Report Response Model

```go
type ReportResponse struct {
    Title       string      `json:"title"`
    Description string      `json:"description"`
    GeneratedAt time.Time   `json:"generated_at"`
    Query       ReportQuery `json:"query"`
    Data        interface{} `json:"data"`      // Varies by report type
    Summary     *Summary    `json:"summary,omitempty"`
    Pagination  *Pagination `json:"pagination,omitempty"`
}

type Summary struct {
    Total    int64              `json:"total"`
    ByGroup  map[string]float64 `json:"by_group,omitempty"`
    TopItems []TopItem          `json:"top_items,omitempty"`
}

type TopItem struct {
    Name   string  `json:"name"`
    Value  float64 `json:"value"`
    Count  int64   `json:"count"`
}
```

---

## 4. API Endpoints

All endpoints prefixed with `/api/v1`. Authentication required. Reports are grouped under `/reports`.

### 4.1 Dashboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/dashboard` | Hospital-wide dashboard KPIs | Any authenticated |
| `GET` | `/reports/dashboard/opd` | OPD-specific dashboard | DOCTOR, RECEPTIONIST, ADMIN |
| `GET` | `/reports/dashboard/ipd` | IPD-specific dashboard | DOCTOR, NURSE, ADMIN |
| `GET` | `/reports/dashboard/pharmacy` | Pharmacy dashboard | PHARMACIST, ADMIN |
| `GET` | `/reports/dashboard/panchakarma` | Panchakarma dashboard | PK_DOCTOR, ADMIN |
| `GET` | `/reports/dashboard/billing` | Billing dashboard | BILLING_STAFF, ADMIN |

### 4.2 Patient Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/patients/demographics` | Age, gender, locality distribution | DOCTOR, ADMIN |
| `GET` | `/reports/patients/visit-patterns` | Visit frequency, peak hours, trends | RECEPTIONIST, ADMIN |
| `GET` | `/reports/patients/outcomes` | Clinical outcomes analysis | DOCTOR, ADMIN |

### 4.3 OPD Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/opd/daily` | Daily OPD summary | RECEPTIONIST, ADMIN |
| `GET` | `/reports/opd/doctor-workload` | Consultations per doctor | ADMIN |
| `GET` | `/reports/opd/diagnoses` | Top diagnoses | DOCTOR, ADMIN |

### 4.4 Financial Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/billing/revenue` | Revenue summary (daily/weekly/monthly) | BILLING_STAFF, ADMIN |
| `GET` | `/reports/billing/collection` | Collection vs target | BILLING_STAFF, ADMIN |
| `GET` | `/reports/billing/outstanding` | Outstanding dues with aging | BILLING_STAFF, ADMIN |
| `GET` | `/reports/billing/service-wise` | Revenue by service category | ADMIN |
| `GET` | `/reports/billing/payment-method` | Payment method breakdown | ADMIN |
| `GET` | `/reports/billing/tax` | Tax collection report | ADMIN |
| `GET` | `/reports/billing/discount` | Discount utilization | ADMIN |
| `GET` | `/reports/billing/patient-wise` | Per-patient billing | ADMIN |

### 4.5 Pharmacy Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/pharmacy/stock` | Current stock levels | PHARMACIST, ADMIN |
| `GET` | `/reports/pharmacy/dispensing` | Dispensing history & patterns | PHARMACIST, ADMIN |
| `GET` | `/reports/pharmacy/expiry` | Expired & near-expiry medicines | PHARMACIST, ADMIN |
| `GET` | `/reports/pharmacy/purchase` | Purchase history | ADMIN |
| `GET` | `/reports/pharmacy/valuation` | Stock valuation | ADMIN |
| `GET` | `/reports/pharmacy/low-stock` | Low stock items | PHARMACIST, ADMIN |

### 4.6 IPD Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/ipd/occupancy` | Bed occupancy by ward/type | ADMIN |
| `GET` | `/reports/ipd/admissions` | Admission statistics | ADMIN |
| `GET` | `/reports/ipd/length-of-stay` | Average LOS by ward/doctor | ADMIN |
| `GET` | `/reports/ipd/discharge` | Discharge statistics | ADMIN |
| `GET` | `/reports/ipd/rounds-compliance` | Doctor rounds completion | ADMIN |
| `GET` | `/reports/ipd/nursing-completion` | Nursing task completion rates | ADMIN |

### 4.7 Panchakarma Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/panchakarma/outcomes` | Treatment outcome analysis | PK_DOCTOR, ADMIN |
| `GET` | `/reports/panchakarma/utilization` | Therapist & room utilization | ADMIN |
| `GET` | `/reports/panchakarma/material-usage` | Oil/herb consumption | PK_DOCTOR, ADMIN |
| `GET` | `/reports/panchakarma/therapist-performance` | Per-therapist metrics | PK_DOCTOR, ADMIN |

### 4.8 Audit Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/audit/user-activity` | User login & action history | ADMIN |
| `GET` | `/reports/audit/data-changes` | Data modification audit trail | ADMIN |

### 4.9 Export

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/reports/export/:reportId` | Export report as CSV/PDF | Any authenticated |

**Export Query Parameters:**
- `format` — csv, pdf, xlsx
- All report-specific filters

---

## 5. Frontend Pages

### 5.1 Admin Navigation

**New sidebar section** in `AdminLayout.tsx`:

```
REPORTS (collapsible)
├── Dashboard          /admin/reports/dashboard
├── Patient Reports    /admin/reports/patients
├── OPD Reports        /admin/reports/opd
├── Financial Reports  /admin/reports/financial
├── Pharmacy Reports   /admin/reports/pharmacy
├── IPD Reports        /admin/reports/ipd
├── PK Reports         /admin/reports/panchakarma
├── Audit Reports      /admin/reports/audit
└── Custom Reports     /admin/reports/custom
```

**Sidebar icon:** `BarChart3` from Lucide.

### 5.2 Page Specifications

#### 5.2.1 Reports Dashboard

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Reports Dashboard                                          │
│  Date Range: [Aug 1] — [Aug 5, 2026]  [Apply]  [Export]   │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Total   │  Today's │ Revenue  │ Occupancy│  PK Sessions    │
│ Patients │  Visits  │ (Month)  │  Rate    │  (Week)         │
│  2,450   │    48    │ ₹3.45L   │  72.5%   │    34           │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Revenue vs Collection (Line Chart - 30 days)       │   │
│  │                                                     │   │
│  │  ₹15K ┤ ╭─╮  ╭──╮     ╭──╮  ╭───╮                │   │
│  │  ₹10K ┤╯   ╰─╯  ╰──╮╭╯  ╰──╯    ╰╮              │   │
│  │  ₹5K  ┤              ╰╯             ╰─             │   │
│  │       └──────────────────────────────────────       │   │
│  │       Aug 1    Aug 2    Aug 3    Aug 4    Aug 5    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │  Department-wise     │  │  Top Diagnoses           │   │
│  │  Patient Distribution│  │                          │   │
│  │  (Donut Chart)       │  │  1. Vata Disorders  34% │   │
│  │                      │  │  2. Skin Conditions 22%  │   │
│  │  OPD: 55%            │  │  3. Digestive Issues 18% │   │
│  │  IPD: 15%            │  │  4. Stress/Anxiety  15% │   │
│  │  PK:  25%            │  │  5. Musculoskeletal  11% │   │
│  │  Portal: 5%          │  │                          │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Quick Report Links                                  │   │
│  │                                                     │   │
│  │  [Revenue Summary] [Stock Report] [Admissions]     │   │
│  │  [Outstanding Dues] [PK Outcomes] [Audit Log]      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.2 Financial Report Page

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Financial Reports                                          │
│  [Revenue] [Collection] [Outstanding] [Service] [Tax]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Revenue Summary — Aug 1-5, 2026                           │
│                                                             │
│  ┌─── Summary Cards ──────────────────────────────────────┐│
│  │  Total Revenue  │  Collected  │  Outstanding  │  Tax   ││
│  │  ₹3,45,600     │  ₹2,87,500  │  ₹58,100     │ ₹0    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Daily Breakdown ────────────────────────────────────┐│
│  │ Date     │ Bills │ Revenue  │ Collected │ Outstanding ││
│  │──────────┼───────┼──────────┼───────────┼─────────────││
│  │ Aug 5    │  24   │ ₹45,200  │ ₹38,500   │ ₹6,700     ││
│  │ Aug 4    │  31   │ ₹52,800  │ ₹48,200   │ ₹4,600     ││
│  │ Aug 3    │  28   │ ₹41,500  │ ₹39,800   │ ₹1,700     ││
│  │ Aug 2    │  22   │ ₹38,600  │ ₹35,100   │ ₹3,500     ││
│  │ Aug 1    │  19   │ ₹32,200  │ ₹28,400   │ ₹3,800     ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Export CSV]  [Export PDF]  [Print Report]                │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.3 Pharmacy Reports Page

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Pharmacy Reports                                           │
│  [Stock] [Dispensing] [Expiry] [Purchase] [Low Stock]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Expiry Report                                              │
│  Filter: [All Categories ▼]  [Status: All ▼]              │
│                                                             │
│  ┌─── Summary ────────────────────────────────────────────┐│
│  │  Expired: 3 items    │  Near Expiry: 8 items          ││
│  │  Value at risk: ₹12,400                                ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Expired Medicines ──────────────────────────────────┐│
│  │ Name           │ Batch    │ Exp Date  │ Stock │ Value  ││
│  │────────────────┼──────────┼───────────┼───────┼────────││
│  │ Triphala       │ TRI-023  │ 2026-06-30│  200  │ ₹2,400 ││
│  │ Dashamula      │ DAS-012  │ 2026-07-15│  100  │ ₹4,500 ││
│  │ Kumaryasava    │ KUM-008  │ 2026-07-30│   50  │ ₹5,500 ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Near Expiry (3 months) ─────────────────────────────┐│
│  │ Name           │ Batch    │ Exp Date  │ Stock │ Value  ││
│  │────────────────┼──────────┼───────────┼───────┼────────││
│  │ Brahmi Vati    │ BRA-045  │ 2026-10-15│  300  │ ₹3,600 ││
│  │ Ashwagandha    │ ASH-031  │ 2026-11-30│  500  │ ₹2,500 ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Export CSV]  [Export PDF]                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Report Component Inventory

| Component | Description | Used In |
|-----------|-------------|---------|
| `DateRangePicker` | Start/end date selection | All report pages |
| `ReportFilters` | Department, doctor, ward filters | All report pages |
| `ReportTable` | Sortable, filterable data table | All report pages |
| `LineChart` | Revenue, visit trends | Dashboard, Financial |
| `BarChart` | Department comparison, utilization | Dashboard, IPD, PK |
| `DonutChart` | Distribution analysis | Dashboard, Patient |
| `PieChart` | Payment methods, diagnoses | Financial, OPD |
| `AreaChart` | Trend analysis | Dashboard |
| `ExportButton` | CSV/PDF/XLSX export | All report pages |
| `KPI_Card` | Metric card with trend indicator | Dashboard |
| `SummaryRow` | Aggregated totals row | All tables |
| `AgingBuckets` | Outstanding aging (0-30, 31-60, 61-90, 90+) | Outstanding report |
| `HeatmapGrid` | Bed occupancy heatmap | IPD Occupancy |
| `TherapistRadar` | Therapist performance radar chart | PK Reports |

---

## 6. RBAC & Permissions

### 6.1 Permissions

```go
// Report permissions
PermissionReportDashboardView  = "report.dashboard.view"
PermissionReportPatientView    = "report.patient.view"
PermissionReportOPDView        = "report.opd.view"
PermissionReportFinancialView  = "report.financial.view"
PermissionReportPharmacyView   = "report.pharmacy.view"
PermissionReportIPDView        = "report.ipd.view"
PermissionReportPKView         = "report.pk.view"
PermissionReportAuditView      = "report.audit.view"
PermissionReportExport         = "report.export"
```

### 6.2 Role-Permission Matrix

| Permission | ADMIN | DOCTOR | NURSE | BILLING | PHARMACIST | PK_DOCTOR | RECEPTIONIST |
|------------|:-----:|:------:|:-----:|:-------:|:----------:|:---------:|:------------:|
| report.dashboard.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| report.patient.view | ✓ | ✓ | — | — | — | — | ✓ |
| report.opd.view | ✓ | ✓ | — | — | — | — | ✓ |
| report.financial.view | ✓ | — | — | ✓ | — | — | — |
| report.pharmacy.view | ✓ | — | — | — | ✓ | — | — |
| report.ipd.view | ✓ | ✓ | ✓ | — | — | — | — |
| report.pk.view | ✓ | ✓ | — | — | — | ✓ | — |
| report.audit.view | ✓ | — | — | — | — | — | — |
| report.export | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |

---

## 7. Report Specifications

### 7.1 Revenue Summary Report

**Query:**
```sql
SELECT
    DATE(b.created_at) as date,
    COUNT(DISTINCT b.id) as bill_count,
    SUM(b.total_amount) as total_revenue,
    SUM(b.paid_amount) as collected,
    SUM(b.due_amount) as outstanding
FROM bills b
WHERE b.created_at BETWEEN ? AND ?
  AND b.payment_status != 'CANCELLED'
GROUP BY DATE(b.created_at)
ORDER BY date DESC;
```

### 7.2 Outstanding Aging Report

**Aging Buckets:**

| Bucket | Description |
|--------|-------------|
| 0-30 days | Recently due |
| 31-60 days | Overdue |
| 61-90 days | Delinquent |
| 90+ days | Bad debt risk |

```sql
SELECT
    CASE
        WHEN AGE(NOW(), b.created_at) <= INTERVAL '30 days' THEN '0-30'
        WHEN AGE(NOW(), b.created_at) <= INTERVAL '60 days' THEN '31-60'
        WHEN AGE(NOW(), b.created_at) <= INTERVAL '90 days' THEN '61-90'
        ELSE '90+'
    END as aging_bucket,
    COUNT(*) as bill_count,
    SUM(b.due_amount) as total_due
FROM bills b
WHERE b.due_amount > 0 AND b.payment_status != 'CANCELLED'
GROUP BY aging_bucket
ORDER BY aging_bucket;
```

### 7.3 Bed Occupancy Report

```sql
SELECT
    w.name as ward_name,
    w.ward_type,
    w.total_beds,
    COUNT(CASE WHEN b.status = 'OCCUPIED' THEN 1 END) as occupied,
    COUNT(CASE WHEN b.status = 'AVAILABLE' THEN 1 END) as available,
    ROUND(COUNT(CASE WHEN b.status = 'OCCUPIED' THEN 1 END)::DECIMAL / w.total_beds * 100, 1) as occupancy_rate
FROM wards w
JOIN beds b ON b.ward_id = w.id
WHERE w.is_active = true
GROUP BY w.id, w.name, w.ward_type, w.total_beds
ORDER BY w.name;
```

### 7.4 Doctor Performance Report

```sql
SELECT
    u.id,
    u.first_name || ' ' || u.last_name as doctor_name,
    COUNT(DISTINCT e.id) as total_consultations,
    COUNT(DISTINCT r.id) as total_referrals,
    AVG(pk.outcome_score) as avg_outcome_score,
    COUNT(DISTINCT a.id) as total_admissions
FROM users u
LEFT JOIN encounters e ON e.doctor_id = u.id AND e.created_at BETWEEN ? AND ?
LEFT JOIN referrals r ON r.referring_doctor_id = u.id AND r.created_at BETWEEN ? AND ?
LEFT JOIN treatment_plans tp ON tp.doctor_id = u.id
LEFT JOIN treatment_sessions pk ON pk.plan_id = tp.id
LEFT JOIN admissions a ON a.admitting_doctor_id = u.id AND a.created_at BETWEEN ? AND ?
WHERE u.role_id IN (SELECT id FROM roles WHERE name IN ('DOCTOR', 'PANCHAKARMA_DOCTOR'))
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_consultations DESC;
```

### 7.5 PK Treatment Outcomes

```sql
SELECT
    tt.name as therapy_type,
    COUNT(ts.id) as total_sessions,
    AVG(ts.outcome_score) as avg_score,
    MIN(ts.outcome_score) as min_score,
    MAX(ts.outcome_score) as max_score,
    COUNT(CASE WHEN ts.outcome_score >= 7 THEN 1 END) as good_outcomes,
    ROUND(COUNT(CASE WHEN ts.outcome_score >= 7 THEN 1 END)::DECIMAL / COUNT(ts.id) * 100, 1) as good_rate
FROM treatment_sessions ts
JOIN therapy_types tt ON tt.id = ts.therapy_type_id
WHERE ts.status = 'COMPLETED'
  AND ts.scheduled_date BETWEEN ? AND ?
GROUP BY tt.id, tt.name
ORDER BY avg_score DESC;
```

---

## 8. Design System

### 8.1 Chart Colors

```typescript
export const reportColors = {
  primary: ['#0F766E', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4'],
  financial: ['#059669', '#10B981', '#34D399', '#6EE7B7'],
  warning: ['#F59E0B', '#FBBF24', '#FCD34D'],
  danger: ['#DC2626', '#EF4444', '#F87171'],
  chart: ['#0F766E', '#C8A14D', '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#6B7280'],
};
```

### 8.2 Component Styling

```typescript
export const reportStyles = {
  card: 'bg-white rounded-xl shadow-sm border border-slate-200 p-6',
  header: 'text-lg font-semibold text-slate-800 mb-4',
  subheader: 'text-sm font-medium text-slate-600 mb-2',
  table: 'w-full text-sm text-left',
  tableHeader: 'bg-slate-50 text-slate-600 font-medium',
  tableRow: 'border-b border-slate-100 hover:bg-slate-50',
  kpiCard: 'bg-white rounded-xl shadow-sm border border-slate-200 p-4',
  kpiValue: 'text-2xl font-bold text-slate-900',
  kpiLabel: 'text-sm text-slate-500',
  kpiTrend: 'text-xs font-medium',
  trendUp: 'text-emerald-600',
  trendDown: 'text-red-600',
};
```

---

## 9. State Management

### 9.1 React Query Keys

```typescript
export const reportsKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportsKeys.all, 'dashboard'] as const,
  dashboardModule: (module: string) => [...reportsKeys.dashboard(), module] as const,
  patients: () => [...reportsKeys.all, 'patients'] as const,
  opd: () => [...reportsKeys.all, 'opd'] as const,
  financial: () => [...reportsKeys.all, 'financial'] as const,
  financialReport: (type: string, params: any) => [...reportsKeys.financial(), type, params] as const,
  pharmacy: () => [...reportsKeys.all, 'pharmacy'] as const,
  ipd: () => [...reportsKeys.all, 'ipd'] as const,
  panchakarma: () => [...reportsKeys.all, 'panchakarma'] as const,
  audit: () => [...reportsKeys.all, 'audit'] as const,
};
```

### 9.2 API Service Layer

```typescript
// src/services/reportsApi.ts

import api from '../lib/api';

export const reportsApi = {
  // Dashboard
  getDashboard: () => api.get('/reports/dashboard'),
  getOPDDashboard: () => api.get('/reports/dashboard/opd'),
  getIPDDashboard: () => api.get('/reports/dashboard/ipd'),
  getPharmacyDashboard: () => api.get('/reports/dashboard/pharmacy'),
  getPKDashboard: () => api.get('/reports/dashboard/panchakarma'),
  getBillingDashboard: () => api.get('/reports/dashboard/billing'),

  // Patient Reports
  getPatientDemographics: (params: any) => api.get('/reports/patients/demographics', { params }),
  getVisitPatterns: (params: any) => api.get('/reports/patients/visit-patterns', { params }),

  // OPD Reports
  getOPDDaily: (params: any) => api.get('/reports/opd/daily', { params }),
  getDoctorWorkload: (params: any) => api.get('/reports/opd/doctor-workload', { params }),

  // Financial Reports
  getRevenue: (params: any) => api.get('/reports/billing/revenue', { params }),
  getCollection: (params: any) => api.get('/reports/billing/collection', { params }),
  getOutstanding: (params: any) => api.get('/reports/billing/outstanding', { params }),
  getServiceWise: (params: any) => api.get('/reports/billing/service-wise', { params }),
  getPaymentMethod: (params: any) => api.get('/reports/billing/payment-method', { params }),
  getTaxReport: (params: any) => api.get('/reports/billing/tax', { params }),
  getDiscountReport: (params: any) => api.get('/reports/billing/discount', { params }),

  // Pharmacy Reports
  getStockReport: (params: any) => api.get('/reports/pharmacy/stock', { params }),
  getDispensingReport: (params: any) => api.get('/reports/pharmacy/dispensing', { params }),
  getExpiryReport: (params: any) => api.get('/reports/pharmacy/expiry', { params }),
  getPurchaseReport: (params: any) => api.get('/reports/pharmacy/purchase', { params }),
  getValuationReport: () => api.get('/reports/pharmacy/valuation'),

  // IPD Reports
  getOccupancy: (params: any) => api.get('/reports/ipd/occupancy', { params }),
  getAdmissions: (params: any) => api.get('/reports/ipd/admissions', { params }),
  getLOS: (params: any) => api.get('/reports/ipd/length-of-stay', { params }),

  // Panchakarma Reports
  getPKOutcomes: (params: any) => api.get('/reports/panchakarma/outcomes', { params }),
  getPKUtilization: (params: any) => api.get('/reports/panchakarma/utilization', { params }),
  getPKMaterialUsage: (params: any) => api.get('/reports/panchakarma/material-usage', { params }),

  // Audit Reports
  getUserActivity: (params: any) => api.get('/reports/audit/user-activity', { params }),

  // Export
  exportReport: (reportId: string, format: string) =>
    api.get(`/reports/export/${reportId}`, { params: { format }, responseType: 'blob' }),
};
```

---

## 10. Implementation Phases & Effort

### 10.1 Gap Analysis Summary

| Component | Current State | Gap | Priority | Effort |
|-----------|--------------|-----|----------|--------|
| Report backend module | ❌ Not created | Module structure, DTOs, query builders | High | 5 days |
| Dashboard API | ❌ Not created | Aggregate queries for all dashboards | High | 4 days |
| Financial reports | ❌ Not created | Revenue, collection, outstanding, tax | High | 4 days |
| Pharmacy reports | ❌ Not created | Stock, dispensing, expiry, purchase | High | 3 days |
| IPD reports | ❌ Not created | Occupancy, admissions, LOS, rounds | High | 3 days |
| PK reports | ❌ Not created | Outcomes, utilization, materials | Medium | 3 days |
| Patient/OPD reports | ❌ Not created | Demographics, visit patterns | Medium | 3 days |
| Audit reports | ❌ Not created | User activity, data changes | Medium | 2 days |
| Report frontend pages | ❌ Not created | 9 report pages + dashboard | High | 10 days |
| Export (CSV/PDF) | ❌ Not created | Export engine | Medium | 3 days |
| Chart components | ❌ Not created | Line, bar, pie, donut, area charts | Medium | 3 days |
| Frontend navigation | ❌ Not added | Sidebar section + routes | Low | 0.5 day |
| **TOTAL** | | | | **~43.5 days (8.7 weeks)** |

### 10.2 Sprint Breakdown

#### Sprint 13.1 — Backend Reports Engine (Week 1-3) — 15 days

| Task | Days | Owner |
|------|------|-------|
| Report module structure (dto.go, handler.go, service.go, repository.go) | 1 | Backend |
| Dashboard aggregate queries | 3 | Backend |
| Financial reports (7 reports) | 4 | Backend |
| Pharmacy reports (5 reports) | 3 | Backend |
| IPD reports (5 reports) | 2 | Backend |
| PK + Patient + OPD reports | 2 | Backend |

**Deliverables:** All backend report APIs functional.

#### Sprint 13.2 — Frontend Reports (Week 4-6) — 15 days

| Task | Days | Owner |
|------|------|-------|
| Frontend navigation + routes | 0.5 | Frontend |
| reportsApi service layer | 0.5 | Frontend |
| Date range picker + filter components | 1 | Frontend |
| Charts library integration (Recharts) | 1 | Frontend |
| Reports Dashboard page | 3 | Frontend |
| Financial reports pages (3 pages) | 3 | Frontend |
| Pharmacy + IPD + PK reports (3 pages) | 3 | Frontend |
| Audit reports page | 1 | Frontend |
| Export functionality | 2 | Frontend |

**Deliverables:** All report pages with charts and export.

#### Sprint 13.3 — Polish & Optimization (Week 7) — 5 days

| Task | Days | Owner |
|------|------|-------|
| Report performance optimization (caching) | 1 | Backend |
| PDF report generation | 2 | Backend |
| E2E testing & bug fixes | 2 | QA |

**Deliverables:** Performance optimized, PDF export, ready for UAT.

### 10.3 Dependencies

| Dependency | Blocker? | Mitigation |
|------------|----------|-----------|
| All other modules (Vol 2-7) | Partial | Reports are read-only; can mock data initially |
| Recharts library | No | Install via npm |
| PDF generation library (go-pdf or wkhtmltopdf) | No | Choose and integrate |

---

## Appendix A: Recommended Libraries

### Frontend

| Library | Purpose | Version |
|---------|---------|---------|
| `recharts` | Charts (line, bar, pie, area) | ^2.12 |
| `date-fns` | Date formatting/manipulation | ^3.6 |
| `papaparse` | CSV export | ^5.4 |
| `jspdf` + `jspdf-autotable` | PDF generation | ^2.5 |
| `file-saver` | File download helper | ^2.0 |

### Backend

| Library | Purpose | Version |
|---------|---------|---------|
| `github.com/jung-kurt/gofpdf` | PDF generation | ^1.16 |
| `github.com/gocarina/gocsv` | CSV export | ^0.23 |

---

*Volume 8 — Reports & Analytics Module | Last Updated: 2026-08-05*
