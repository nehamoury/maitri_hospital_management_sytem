# AHMS Volume 11 — UI Reference Library

> **Enterprise-Grade Ayurvedic Hospital Management System**
> **Backend:** Go 1.22 · Gin · GORM · PostgreSQL 16
> **Frontend:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Framer Motion 12

---

## Table of Contents

1. [Page Structure Standard](#1-page-structure-standard)
2. [Responsive Layout System](#2-responsive-layout-system)
3. [Page States](#3-page-states)
4. [Role-wise Dashboards](#4-role-wise-dashboards)
5. [Page Templates](#5-page-templates)
6. [Navigation Flow](#6-navigation-flow)
7. [UX Rules](#7-ux-rules)
8. [UI Wireframes](#8-ui-wireframes)
9. [Animation Library](#9-animation-library)
10. [Icon Usage Guide](#10-icon-usage-guide)

---

## 1. Page Structure Standard

Every admin page **MUST** follow this 11-point structure:

### 1.1 The 11-Point Page Framework

```
1. PAGE GOAL        → "What this page achieves in one sentence"
2. SIDEBAR          → Active menu item, icon, badge count
3. TOPBAR           → Title, breadcrumbs, action buttons
4. FILTERS          → Search, dropdowns, date pickers, status tabs
5. KPI CARDS        → Summary metrics (4-5 cards max)
6. DATA TABLE       → Sortable, filterable, paginated
7. CHARTS           → Visual analytics (optional, if applicable)
8. DETAIL DRAWER    → Slide-in panel for row detail view
9. CRUD MODALS      → Create/Edit forms in modal or drawer
10. ACTIONS         → Row-level (View, Edit, Delete) + Bulk actions
11. PERMISSIONS     → RBAC matrix for this page
```

### 1.2 Page Goal Template

Every page spec starts with:

```
Page Goal: [One sentence describing what this page achieves]
User Story: As a [ROLE], I want to [ACTION] so that [OUTCOME].
```

### 1.3 Sidebar Specification

```
Expanded (Desktop ≥1280px):  Full labels + icons, 240px width
Collapsed (Tablet 768-1279px): Icons only, 64px width
Hidden (Mobile <768px):       Bottom navigation bar
```

### 1.4 Topbar Elements

```
Hamburger menu (mobile/tablet) | Page title (h1) | Breadcrumbs (desktop)
Notification bell with count | User avatar + dropdown
```

---

## 2. Responsive Layout System

### 2.1 Breakpoint Definitions

| Breakpoint | Width | Label | Sidebar | Content Grid |
|------------|-------|-------|---------|-------------|
| `xs` | <640px | Mobile | Bottom nav | 1 column |
| `sm` | 640-767px | Mobile L | Bottom nav | 1 column |
| `md` | 768-1023px | Tablet | Icon sidebar (64px) | 2 columns |
| `lg` | 1024-1279px | Tablet L | Icon sidebar (64px) | 2-3 columns |
| `xl` | 1280-1535px | Desktop | Full sidebar (240px) | 3-4 columns |
| `2xl` | >=1536px | Desktop L | Full sidebar (240px) | 4-5 columns |

### 2.2 Layout Grids

```
DESKTOP (xl+)
┌──────┬────────────────────────────────────────┐
│      │  Topbar                                │
│  S   ├────────────────────────────────────────┤
│  I   │  Content Area                          │
│  D   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  E   │  │ KPI  │ │ KPI  │ │ KPI  │ │ KPI  │  │
│  B   │  └──────┘ └──────┘ └──────┘ └──────┘  │
│  A   │  ┌────────────────────────────────────┐│
│  R   │  │           Table                    ││
│  240 │  │                                    ││
│  px  │  └────────────────────────────────────┘│
└──────┴────────────────────────────────────────┘

TABLET (md-lg)
┌────┬─────────────────────────────────────────┐
│    │  Topbar                                 │
│icons├─────────────────────────────────────────┤
│ 64 │  Content Area                           │
│ px │  ┌──────────────┐ ┌──────────────┐     │
│    │  │    KPI       │ │    KPI       │     │
│    │  └──────────────┘ └──────────────┘     │
│    │  ┌──────────────────────────────────┐   │
│    │  │           Table                  │   │
│    │  └──────────────────────────────────┘   │
└────┴─────────────────────────────────────────┘

MOBILE (xs-sm)
┌──────────────────────────────────────────────┐
│  Hamburger  Page Title            Bell  User │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │              KPI (stacked)           │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │         Table (scrollable)           │   │
│  └──────────────────────────────────────┘   │
├──────────────────────────────────────────────┤
│  Home     List     Add     Clinical  Profile │
│  🏠       📋       ➕       💊        👤     │
└──────────────────────────────────────────────┘
```

### 2.3 Responsive CSS Classes

```tsx
// KPI Cards: 4 cols -> 2 cols -> 1 col
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Table: horizontal scroll on mobile
<div className="overflow-x-auto">
  <table className="w-full min-w-[640px]">...</table>
</div>

// Sidebar: show/hide based on breakpoint
<aside className="hidden lg:block w-60">...</aside>      {/* Desktop */}
<aside className="hidden md:block w-16">...</aside>       {/* Tablet */}
<nav className="md:hidden fixed bottom-0">...</nav>       {/* Mobile */}

// Content padding
<main className="p-4 md:p-6 lg:p-8">...</main>
```

---

## 3. Page States

### 3.1 Loading State (Skeleton)

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ ████████ │ │ ████████ │ │ ████████ │ │ ████████ │      │
│  │ ████████ │ │ ████████ │ │ ████████ │ │ ████████ │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████│   │
│  │ ████████████████████████████████████████████████████│   │
│  │ ████████████████████████████████████████████████████│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                      ┌─────────┐                            │
│                      │   📋    │                            │
│                      └─────────┘                            │
│                   No Records Found                          │
│            No records match your filters                    │
│               [+ Create New Record]                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Error State

```
┌─────────────────────────────────────────────────────────────┐
│                      ┌─────────┐                            │
│                      │   ⚠️    │                            │
│                      └─────────┘                            │
│                   Something went wrong                       │
│              Failed to load data                            │
│                  [🔄 Try Again]                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Success State (Toast)

```
┌─────────────────────────────────────────────────────────────┐
│  ✅  Record created successfully!                           │
│      Treatment plan for Priya Sharma saved.                 │
│                                          [Dismiss]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Role-wise Dashboards

### 4.1 Doctor Dashboard

```
Page Goal: View today's clinical workload and quick patient actions
User Story: As a Doctor, I want to see my patients and pending tasks so that I can prioritize my day.

Widgets:
  KPI Cards:
    - Today's Patients (12)
    - Pending Consultations (3)
    - Today's Referrals (2)
    - Follow-ups Due (4)
    - PK Sessions (2) [if PK Doctor]

  Charts:
    - Consultation Trend (Line - 7 days)
    - Referral Trend (Line - 7 days)

  Tables:
    - Waiting Queue (Token, Patient, Time, Status)
    - Upcoming Patients (Time, Name, Type, Notes)

  Quick Actions:
    - [New Consultation]
    - [Refer Patient]
    - [Create Follow-up]
```

### 4.2 Receptionist Dashboard

```
Page Goal: Manage today's patient flow and bed availability
User Story: As a Receptionist, I want to see appointments and bed status so that I can manage patient flow.

Widgets:
  KPI Cards:
    - Today's Appointments (24)
    - Waiting Queue (8)
    - Tokens Issued (16)
    - Beds Available (28)
    - Today's Revenue (₹18,500)

  Charts:
    - Appointment Timeline (Bar - hourly today)

  Tables:
    - Waiting Queue (Token, Patient, Doctor, Time)
    - Bed Availability (Ward, Total, Available, Occupied)

  Quick Actions:
    - [Register Patient]
    - [Book Appointment]
    - [Check Beds]
```

### 4.3 Pharmacist Dashboard

```
Page Goal: Track prescriptions and inventory status
User Story: As a Pharmacist, I want to see pending prescriptions and stock alerts so that I can dispense efficiently.

Widgets:
  KPI Cards:
    - Pending Prescriptions (15)
    - Today's Dispensed (67)
    - Low Stock Items (12)
    - Expiring Soon (8)
    - Stock Value (₹3.45L)

  Charts:
    - Dispensing Trend (Line - 7 days)
    - Category Distribution (Pie)

  Tables:
    - Low Stock Alert (Name, Stock, Threshold, Status)
    - Expiring Soon (Name, Batch, Expiry, Stock)
    - Pending Prescriptions (Doctor, Count, Oldest)

  Quick Actions:
    - [Dispense Rx]
    - [Receive Stock]
    - [View Reports]
```

### 4.4 Nurse Dashboard

```
Page Goal: Track ward tasks and patient vitals
User Story: As a Nurse, I want to see my assigned tasks and patient status so that I can provide timely care.

Widgets:
  KPI Cards:
    - My Patients (18)
    - Pending Tasks (42)
    - Completed Today (12)
    - Bed Status (87/120)
    - Diet Pending (8)

  Charts:
    - Task Completion (Progress bar per shift)

  Tables:
    - Ward Overview (Ward, Total Beds, Occupied, Available)
    - Vitals Due (Time, Patients Count, Status)

  Quick Actions:
    - [View Tasks]
    - [Administer Medications]
    - [Record Vitals]
```

### 4.5 PK Therapist Dashboard

```
Page Goal: Track today's therapy sessions and materials
User Story: As a PK Therapist, I want to see my session schedule so that I can prepare for each patient.

Widgets:
  KPI Cards:
    - Today's Sessions (6)
    - Completed Today (2)
    - Upcoming Tomorrow (4)
    - Material Requests (1)
    - Avg Score (7.8/10)

  Charts:
    - Session Timeline (Horizontal bar - today)

  Tables:
    - Today's Sessions (Time, Therapy, Patient, Status)

  Quick Actions:
    - [Start Session]
    - [Complete Session]
    - [View Patient]
```

### 4.6 Billing Staff Dashboard

```
Page Goal: Track collections and outstanding dues
User Story: As a Billing Staff, I want to see today's collection and pending payments so that I can manage finances.

Widgets:
  KPI Cards:
    - Today's Bills (24)
    - Today's Collection (₹18,500)
    - Outstanding (₹2,58,100)
    - Overdue Bills (45)
    - Collection Rate (88.6%)

  Charts:
    - Payment Methods (Pie - today)
    - Collection Trend (Line - 7 days)

  Tables:
    - Recent Bills (Bill No, Patient, Amount, Status)
    - Overdue (Bill No, Patient, Due, Days)

  Quick Actions:
    - [New Bill]
    - [Record Payment]
    - [View Outstanding]
```

### 4.7 Admin Dashboard

```
Page Goal: Hospital-wide operational overview
User Story: As an Admin, I want to see all department KPIs so that I can monitor hospital operations.

Widgets:
  KPI Cards:
    - Total Patients (2,450)
    - Today's Visits (48)
    - Monthly Revenue (₹3.45L)
    - Occupancy Rate (72.5%)
    - Staff Online (12)

  Charts:
    - Revenue vs Collection (Line - 30 days)
    - Department Activity (Bar)
    - Patient Distribution (Donut)

  Tables:
    - Department Summary (Dept, Visits, Revenue, Status)
    - Recent Activity (Action, User, Time)

  Quick Actions:
    - [Register Patient]
    - [New Appointment]
    - [View Reports]
```

---

## 5. Page Templates

### 5.1 List Page Template

```
┌─────────────────────────────────────────────────────────────┐
│ [Active Sidebar Item]  │  Page Title          [+ Add New]  │
│                       │  Home > Module > List  [Export]     │
├───────────────────────┴─────────────────────────────────────┤
│ [Search________] [Status▼] [Date Range] [More Filters]     │
├─────────────────────────────────────────────────────────────┤
│ [Total: 156]  [Active: 89]  [Pending: 12]  [Inactive: 55] │
├─────────────────────────────────────────────────────────────┤
│ ┌────┬──────────┬──────────┬──────────┬──────────┬───────┐ │
│ │ #  │ Name     │ Status   │ Date     │ Amount   │ Acts  │ │
│ ├────┼──────────┼──────────┼──────────┼──────────┼───────┤ │
│ │ 1  │ Item 1   │ Active   │ Aug 5    │ ₹1,500   │ ✎ 👁  │ │
│ │ 2  │ Item 2   │ Pending  │ Aug 4    │ ₹2,300   │ ✎ 👁  │ │
│ │ 3  │ Item 3   │ Active   │ Aug 3    │ ₹800     │ ✎ 👁  │ │
│ └────┴──────────┴──────────┴──────────┴──────────┴───────┘ │
│ Page 1 of 8        [← Prev] [1] [2] [3] ... [8] [Next →]  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Detail Page Template

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back    [Resource Name]              [Edit]  [More ▼]    │
│           ID: RES-2026-001   Status: ✅ Active              │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [History] [Related] [Notes]                     │
│ ─────────────────────────────────────                      │
│                                                             │
│ ┌─── Tab Content ──────────────────────────────────────┐   │
│ │                                                      │   │
│ │  (Varies by tab type)                                │   │
│ │                                                      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─── Related Items ────────────────────────────────────┐   │
│ │  Sub-table of related records                        │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Form Page Template

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back    [Create/Edit Form]           [Cancel]      [Save]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─── Section: Basic Info ──────────────────────────────┐   │
│ │  Field 1: [________]     Field 2: [________]         │   │
│ │  Field 3: [________]     Field 4: [▼ Select]         │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─── Section: Details ─────────────────────────────────┐   │
│ │  Field 5: [________]     Field 6: [________]         │   │
│ │  Field 7: [Text Area                              ]  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─── Section: Items (Dynamic) ─────────────────────────┐   │
│ │  # │ Item     │ Qty  │ Rate  │ Amount  │ Action      │   │
│ │  1 │ ________ │ ___  │ ___   │ ______  │ 🗑          │   │
│ │  [+ Add Item]                                        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Total: ₹X,XXX    Discount: -₹XXX    Net: ₹X,XXX          │
│                                                             │
│ [Cancel]                                              [Save]│
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Calendar View Template

```
┌─────────────────────────────────────────────────────────────┐
│ ← Aug 2026 →   Week of Aug 5   [Week] [Month] [Day]      │
│ Filter: [All Staff ▼]  [All Types ▼]                       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐       │
│ │   Mon   │   Tue   │   Wed   │   Thu   │   Fri   │       │
│ ├─────────┼─────────┼─────────┼─────────┼─────────┤       │
│ │ 08:00   │         │         │         │         │       │
│ │ ████    │         │         │         │         │       │
│ │ Patient │         │         │         │         │       │
│ ├─────────┤         │         │         │         │       │
│ │ 10:00   │         │         │         │         │       │
│ │ ░░░░    │         │         │         │         │       │
│ │ Patient │         │         │         │         │       │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘       │
│                                                             │
│ Legend: Green=Completed Blue=InProgress Yellow=Scheduled     │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Dashboard Template

```
┌─────────────────────────────────────────────────────────────┐
│ [Dashboard Title]                         [Date]  [Export] │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  KPI 1   │  KPI 2   │  KPI 3   │  KPI 4   │  KPI 5         │
│  Value   │  Value   │  Value   │  Value   │  Value          │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PRIMARY CHART (Full width)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │  SECONDARY CHART     │  │  TERTIARY CHART          │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DATA TABLE (Recent items)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quick Actions: [Action 1]  [Action 2]  [Action 3]         │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Navigation Flow

### 6.1 End-to-End Patient Journey

```
Website (Public)
    ↓
Patient Self-Registration
    ↓
Appointment Booking
    ↓
Reception: Token Generated
    ↓
Doctor: Consultation
    ├── Prescription → Pharmacy Dispensing
    ├── Investigation → Lab Results
    ├── Referral → Specialist Consultation
    └── Follow-up → New Appointment
    ↓
EMR: Records Updated
    ↓
Billing: Bill Generated
    ↓
Pharmacy: Medicine Dispensed
    ↓
Patient Portal: Records Viewable
```

### 6.2 IPD Flow

```
Doctor Recommends Admission
    ↓
Reception: Bed Allocated
    ↓
Admission Created
    ├── Nursing Care Plan
    ├── Treatment Orders
    └── Daily Doctor Rounds
    ↓
Treatment Execution
    ├── Medications (Pharmacy)
    ├── Procedures (IPD Nursing)
    └── Panchakarma (if referred)
    ↓
Discharge
    ├── Discharge Summary
    ├── Final Billing
    ├── Medications Dispensed
    └── Follow-up Scheduled
    ↓
Patient Portal: Records Accessible
```

### 6.3 Panchakarma Flow

```
Doctor Consultation
    ↓
Referral to Panchakarma
    ↓
PK Doctor: Treatment Plan Created
    ↓
Sessions Scheduled
    ↓
Therapist: Sessions Executed
    ├── Pre-procedure Checklist
    ├── Main Procedure
    ├── Post-procedure Notes
    └── Materials Tracked
    ↓
Progress Tracked
    ├── Outcome Scores
    ├── Patient Feedback
    └── Doctor Review
    ↓
Plan Completion
    ↓
Billing: Sessions Billed
    ↓
Portal: Patient Views History
```

### 6.4 Pharmacy Flow

```
Doctor Creates Prescription
    ↓
Prescription Sent to Pharmacy
    ↓
Pharmacist Views Pending Rx
    ↓
Verifies Patient + Medicine
    ↓
Selects Batch (FIFO)
    ↓
Dispenses Medicine
    ├── Stock Deducted
    ├── Transaction Logged
    └── Rx Status Updated
    ↓
Billing: Medicine Charged
    ↓
Patient: Views on Portal
```

---

## 7. UX Rules

### 7.1 Receptionist UX Rules

```
Rule: Maximum 3 clicks to register a patient
Flow: [+ Register] → Fill Form → [Save] → UHID Generated

Rule: Token visible at all times
Design: Large token number displayed on screen

Rule: Bed availability at a glance
Design: Color-coded grid (Green=Available, Red=Occupied)
```

### 7.2 Doctor UX Rules

```
Rule: Patient timeline always visible
Design: Sidebar shows recent patients with timeline icon

Rule: One-click prescription
Flow: [Patient] → [Prescribe] → Quick form → [Submit]

Rule: Referral in 2 clicks
Flow: [Patient] → [Refer] → Select dept/doctor → [Submit]
```

### 7.3 Pharmacist UX Rules

```
Rule: Barcode scan first
Flow: [Scan] → Patient/Medicine identified → Dispense

Rule: Stock visible on hover
Design: Hover over medicine shows current stock level

Rule: Expiry highlighted in red
Design: Any medicine near/expired shows red badge
```

### 7.4 Nurse UX Rules

```
Rule: Shift-based task view
Design: Default to current shift, toggle to others

Rule: One-tap task completion
Flow: [Task] → [Complete] → Done (no extra steps)

Rule: Vitals entry optimized
Design: Large number inputs, pre-filled with last values
```

### 7.5 Billing Staff UX Rules

```
Rule: Invoice → Payment → Receipt → Print (4-step flow)
Design: Linear progress indicator through steps

Rule: Due amount always visible
Design: Red badge on任何 page showing outstanding

Rule: Payment methods as large buttons
Design: Cash/Card/UPI/Bank as clickable cards, not dropdown
```

### 7.6 PK Therapist UX Rules

```
Rule: Current session prominent
Design: Large card showing active session with timer

Rule: Materials pre-populated
Design: Therapy type auto-fills common materials

Rule: Outcome score as slider
Design: 1-10 slider with color gradient (red→green)
```

### 7.7 Patient Portal UX Rules

```
Rule: 2 taps to book appointment
Flow: [Book] → Select Doctor/Date/Time → [Confirm]

Rule: Bills visible on home screen
Design: Due amount always shown on dashboard

Rule: Treatment progress visual
Design: Progress bar with completed/total sessions
```

---

## 8. UI Wireframes

### 8.1 Patient List Page (Wireframe)

```
+-----------------------------------------------------------------------+
| SIDEBAR        | TOPBAR: Patient List          [+ Register Patient]   |
|                |         Home > Patients         [Export] [Filter]    |
| 👥 Patients ◀  |-----------------------------------------------------|
| 📅 Appointments| [Search patients___] [Status▼] [Gender▼] [Age▼]    |
| 💊 Prescriptions|----------------------------------------------------|
| 🔄 Referrals  | Total: 2,450  |  Active: 2,100  |  Inactive: 350   |
| 🏥 IPD        |-----------------------------------------------------|
| 💰 Billing    | #  | UHID          | Name       | Phone  | Status  |
| 📊 Reports    |----|---------------|------------|--------|---------|
| ⚙️ Settings   | 1  | AHMS-2026-001 | Priya S.   | 98765  | Active  |
|                | 2  | AHMS-2026-002 | Rajesh K.  | 98764  | Active  |
|                | 3  | AHMS-2026-003 | Meena D.   | 98763  | Inactive|
|                | 4  | AHMS-2026-004 | Amit P.    | 98762  | Active  |
|                |----|---------------|------------|--------|---------|
|                | Page 1 of 123    [← Prev] [1][2][3]...[123] [Next→]|
+-----------------------------------------------------------------------+
```

### 8.2 Doctor Dashboard (Wireframe)

```
+-----------------------------------------------------------------------+
| SIDEBAR        | TOPBAR: Dr. Anand Vaidya     Aug 5, 2026  🔔 👤    |
|                |-----------------------------------------------------|
| 🏠 Dashboard ◀ | [Today's] [Pending] [Referrals] [FollowUp] [PK]   |
| 👥 Patients    |-----------------------------------------------------|
| 📅 Appointments|  12        3         2          4        2         |
| 💊 Prescriptions| Patients  Consults  Refers    FollowUp  Sessions  |
| 🔄 Referrals  |-----------------------------------------------------|
| 🏥 IPD        | Consultation Trend (Line Chart - 7 days)            |
| 📊 Reports    |-----------------------------------------------------|
|                | Waiting Queue        | Upcoming Patients            |
|                | Token#3 Priya S. 🔴  | 10:00 Rajesh K.             |
|                | Token#4 Amit P.  🟡  | 10:30 Meena D.              |
|                | Token#5 Sunita P. 🟢 | 11:00 Ravi M.               |
|                |-----------------------------------------------------|
|                | [+ New Consultation] [Refer Patient] [Follow-up]   |
+-----------------------------------------------------------------------+
```

### 8.3 Pharmacy Dispensing (Wireframe)

```
+-----------------------------------------------------------------------+
| SIDEBAR        | TOPBAR: Dispensing                [Scan Barcode]    |
|                |-----------------------------------------------------|
| 💊 Pharmacy ◀  | Pending Rx: 15  |  Dispensed Today: 67  |  Low: 12|
| 📦 Inventory   |-----------------------------------------------------|
| 📋 Orders      | # | Doctor   | Patient  | Items | Rx No    | Act  |
| 📊 Reports     |---|----------|----------|-------|----------|------|
|                | 1 | Dr. Anand| Priya S. | 3     | RX-0045  | Disp |
|                | 2 | Dr. Anand| Rajesh K.| 2     | RX-0046  | Disp |
|                | 3 | Dr. Suresh| Meena D.| 1     | RX-0047  | Disp |
|                |---|----------|----------|-------|----------|------|
|                | [Select Rx] → Verify → Select Batch → Dispense     |
+-----------------------------------------------------------------------+
```

---

## 9. Animation Library

### 9.1 Page Transitions

```tsx
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.2, ease: "easeInOut" }
};
```

### 9.2 Card Hover

```tsx
const cardHover = {
  whileHover: { scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  transition: { duration: 0.15 }
};
```

### 9.3 Modal Entrance

```tsx
const modalAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15 }
};
```

### 9.4 List Item Stagger

```tsx
const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const listItem = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
};
```

### 9.5 Toast Notification

```tsx
const toastAnimation = {
  initial: { opacity: 0, y: 50, x: 50 },
  animate: { opacity: 1, y: 0, x: 0 },
  exit: { opacity: 0, y: 50 },
  transition: { type: "spring", damping: 20 }
};
```

### 9.6 Skeleton Pulse

```tsx
const skeletonPulse = {
  animate: { opacity: [0.5, 1, 0.5] },
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
};
```

---

## 10. Icon Usage Guide

### 10.1 Module Icons

| Module | Icon | Lucide Name |
|--------|------|-------------|
| Dashboard | 🏠 | `Home` |
| Patients | 👥 | `Users` |
| Appointments | 📅 | `Calendar` |
| Consultations | 🩺 | `Stethoscope` |
| Prescriptions | 💊 | `Pill` |
| Referrals | 🔄 | `ArrowRightLeft` |
| EMR | 📋 | `FileText` |
| Panchakarma | 🌿 | `Sprout` |
| Pharmacy | 💊 | `Pill` |
| IPD | 🏥 | `Hospital` |
| Billing | 🧾 | `Receipt` |
| Reports | 📊 | `BarChart3` |
| Settings | ⚙️ | `Settings` |

### 10.2 Status Icons

| Status | Icon | Color | Lucide Name |
|--------|------|-------|-------------|
| Active/Success | ✅ | Emerald | `CheckCircle` |
| Pending/Warning | ⚠️ | Amber | `AlertCircle` |
| Error/Cancelled | ❌ | Red | `XCircle` |
| In Progress | 🔄 | Blue | `Loader` |
| Scheduled | 📅 | Slate | `Clock` |
| Completed | ✅ | Teal | `Check` |

### 10.3 Action Icons

| Action | Icon | Lucide Name |
|--------|------|-------------|
| View | 👁 | `Eye` |
| Edit | ✎ | `Pencil` |
| Delete | 🗑 | `Trash2` |
| Add | ➕ | `Plus` |
| Search | 🔍 | `Search` |
| Filter | 🔽 | `Filter` |
| Export | 📥 | `Download` |
| Print | 🖨 | `Printer` |
| Refresh | 🔄 | `RefreshCw` |
| Close | ✕ | `X` |
| Back | ← | `ArrowLeft` |
| Forward | → | `ArrowRight` |
| Expand | ▼ | `ChevronDown` |
| Collapse | ▲ | `ChevronUp` |

---

*Volume 11 — UI Reference Library | Last Updated: 2026-08-05*
