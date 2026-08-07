# AHMS Volume 7 — Billing Module

> **Enterprise-Grade Ayurvedic Hospital Management System**
> **Backend:** Go 1.22 · Gin · GORM · PostgreSQL 16
> **Frontend:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Framer Motion 12

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [Terminology](#2-terminology)
3. [Data Models & Database Schema](#3-data-models--database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Pages & Components](#5-frontend-pages--components)
6. [RBAC & Permissions Matrix](#6-rbac--permissions-matrix)
7. [Business Logic & Workflows](#7-business-logic--workflows)
8. [Integration Points](#8-integration-points)
9. [Design System & UI Components](#9-design-system--ui-components)
10. [State Management & Data Flow](#10-state-management--data-flow)
11. [Error Handling & Edge Cases](#11-error-handling--edge-cases)
12. [Security Considerations](#12-security-considerations)
13. [Performance Optimization](#13-performance-optimization)
14. [Testing Strategy](#14-testing-strategy)
15. [Implementation Phases & Effort](#15-implementation-phases--effort)

---

## 1. Overview & Scope

### 1.1 Purpose

The Billing module manages the complete financial lifecycle: **service catalog → bill creation → payment collection → receipts → reports**. It serves as the central billing hub integrating with OPD, IPD, Pharmacy, and Panchakarma modules.

### 1.2 Current Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Bill model (Bill, BillItem, BillCounter) | ✅ Implemented | `internal/models/billing.go` |
| Payment model | ✅ Implemented | `internal/models/billing.go` |
| Bill CRUD (5 API endpoints) | ✅ Implemented | `internal/billing/` |
| Payment recording | ✅ Implemented | `POST /bills/:id/payments` |
| Bill number generation (atomic) | ✅ Implemented | `BILL-YYYY-NNNNNN` |
| Portal billing (read-only) | ✅ Implemented | `internal/portal/` |
| Admin Billing page | ✅ Implemented | `src/pages/admin/Billing.tsx` |
| Portal Bills page | ✅ Implemented | `src/pages/portal/PortalBills.tsx` |
| Service catalog | ❌ Missing | New |
| IPD billing integration | ❌ Missing | New |
| Auto-billing from clinical modules | ❌ Missing | New |
| Receipt generation (PDF) | ❌ Missing | New |
| Discount/coupon management | ❌ Missing | New |
| Partial payment tracking | ⚠️ Partial | Enhance existing |
| Refund processing | ❌ Missing | New |
| Billing reports | ❌ Missing | New |
| Insurance/TPA | ❌ Future | Deferred |

### 1.3 Scope Boundaries

| In Scope | Out of Scope |
|----------|-------------|
| OPD billing (consultation, procedures) | Insurance/TPA claims |
| IPD billing (bed charges, treatments) | E-revenue cycle management |
| Pharmacy billing | GST filing |
| Panchakarma billing | Accounting ledger |
| Service catalog management | Multi-hospital billing |
| Payment collection (cash, card, UPI, bank transfer) | Online payment gateway |
| Receipt generation | Salary/payroll |
| Discount management | |
| Refund processing | |
| Outstanding/due tracking | |
| Billing reports & analytics | |

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Bill** | A financial document listing services/medicines provided to a patient |
| **Bill Item** | A single line item on a bill (description, quantity, rate, amount) |
| **Payment** | A monetary transaction against a bill |
| **Service Catalog** | Master list of billable services with prices |
| **Service Category** | Classification: Consultation, Procedure, Investigation, Pharmacy, Room, Panchakarma |
| **Receipt** | Generated document confirming payment |
| **Due Amount** | Outstanding balance on a bill (Net Amount - Paid Amount) |
| **Advance** | Pre-payment received before services are rendered |
| **Refund** | Return of payment to patient |
| **Discount** | Reduction applied to bill total (percentage or flat) |
| **Settlement** | Final payment clearing all dues |
| **Outstanding** | All unpaid dues across bills for a patient |

---

## 3. Data Models & Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│ ServiceCategory  │       │  ServiceCatalog  │
│──────────────────│       │──────────────────│
│ id (PK, UUID)    │       │ id (PK, UUID)    │
│ name             │       │ category_id (FK) │
│ description      │       │ name             │
│ is_active        │       │ code             │
│ sort_order       │       │ description      │
└──────────────────┘       │ rate             │
                           │ unit             │
                           │ hsn_code         │
                           │ tax_rate         │
                           │ is_active        │
                           └────────┬─────────┘
                                    │
                                    │ 1
                                    │
                                    │ *
                           ┌────────┴─────────┐
                           │      Bill        │
                           │──────────────────│
                           │ id (PK, UUID)    │
                           │ bill_no          │
                           │ patient_id (FK)  │
                           │ encounter_id(FK) │
                           │ admission_id(FK) │
                           │ service_type     │
                           │ total_amount     │
                           │ discount         │
                           │ discount_type    │
                           │ tax_amount       │
                           │ net_amount       │
                           │ paid_amount      │
                           │ due_amount       │
                           │ payment_status   │
                           │ notes            │
                           │ billed_by (FK)   │
                           │ created_at       │
                           └────────┬─────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                     │ 1            │ 1            │ 1
                     │              │              │
                     │ *            │ *            │ *
            ┌────────┴────────┐ ┌──┴──────┐ ┌────┴──────┐
            │   BillItem      │ │ Payment │ │ Refund    │
            │─────────────────│ │─────────│ │───────────│
            │ id (PK, UUID)   │ │ id      │ │ id        │
            │ bill_id (FK)    │ │ bill_id │ │ bill_id   │
            │ service_id (FK) │ │ amount  │ │ amount    │
            │ description     │ │ method  │ │ reason    │
            │ quantity        │ │ ref_no  │ │ ref_no    │
            │ rate            │ │ received│ │ refunded  │
            │ amount          │ │ by (FK) │ │ by (FK)   │
            │ tax_rate        │ │ created │ │ created   │
            │ tax_amount      │ │         │ │           │
            │ discount        │ │         │ │           │
            │ service_type    │ │         │ │           │
            └─────────────────┘ └─────────┘ └───────────┘

┌──────────────────┐
│   DiscountRule   │
│──────────────────│
│ id (PK, UUID)    │
│ name             │
│ type (%, flat)   │
│ value            │
│ min_amount       │
│ max_uses         │
│ used_count       │
│ start_date       │
│ end_date         │
│ is_active        │
└──────────────────┘
```

### 3.2 Model Definitions

#### Enhanced Bill Model

```go
// internal/models/billing.go — ENHANCED

type Bill struct {
    BaseModel
    BillNo          string    `gorm:"size:30;uniqueIndex;not null" json:"bill_no"`
    PatientID       uuid.UUID `gorm:"type:uuid;not null;index" json:"patient_id"`
    Patient         Patient   `gorm:"foreignKey:PatientID" json:"patient,omitempty"`
    EncounterID     *uuid.UUID `gorm:"type:uuid;index" json:"encounter_id"`
    Encounter       *Encounter `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`
    AdmissionID     *uuid.UUID `gorm:"type:uuid;index" json:"admission_id"`
    Admission       *Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`
    ServiceType     string    `gorm:"size:20;not null;default:OPD" json:"service_type"` // OPD, IPD, PHARMACY, PANCHAKARMA
    TotalAmount     float64   `gorm:"type:decimal(10,2);not null;default:0" json:"total_amount"`
    Discount        float64   `gorm:"type:decimal(10,2);not null;default:0" json:"discount"`
    DiscountType    string    `gorm:"size:10;not null;default:FLAT" json:"discount_type"` // FLAT, PERCENTAGE
    DiscountRuleID  *uuid.UUID `gorm:"type:uuid" json:"discount_rule_id"`
    TaxAmount       float64   `gorm:"type:decimal(10,2);not null;default:0" json:"tax_amount"`
    NetAmount       float64   `gorm:"type:decimal(10,2);not null;default:0" json:"net_amount"`
    PaidAmount      float64   `gorm:"type:decimal(10,2);not null;default:0" json:"paid_amount"`
    DueAmount       float64   `gorm:"type:decimal(10,2);not null;default:0" json:"due_amount"`
    PaymentStatus   string    `gorm:"size:20;not null;default:UNPAID" json:"payment_status"` // UNPAID, PARTIAL, PAID, REFUNDED
    Notes           string    `gorm:"type:text" json:"notes"`
    BilledByUserID  uuid.UUID `gorm:"type:uuid;not null" json:"billed_by_user_id"`
    BilledBy        User      `gorm:"foreignKey:BilledByUserID" json:"billed_by,omitempty"`

    // Relations
    Items    []BillItem    `gorm:"foreignKey:BillID" json:"items,omitempty"`
    Payments []Payment     `gorm:"foreignKey:BillID" json:"payments,omitempty"`
    Refunds  []Refund      `gorm:"foreignKey:BillID" json:"refunds,omitempty"`
}

func (Bill) TableName() string { return "bills" }

type BillItem struct {
    BaseModel
    BillID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"bill_id"`
    ServiceID     *uuid.UUID `gorm:"type:uuid;index" json:"service_id"`
    Service       *ServiceCatalog `gorm:"foreignKey:ServiceID" json:"service,omitempty"`
    Description   string     `gorm:"size:255;not null" json:"description"`
    Quantity      int        `gorm:"not null;default:1" json:"quantity"`
    Rate          float64    `gorm:"type:decimal(10,2);not null" json:"rate"`
    Amount        float64    `gorm:"type:decimal(10,2);not null" json:"amount"`
    TaxRate       float64    `gorm:"type:decimal(5,2);not null;default:0" json:"tax_rate"`
    TaxAmount     float64    `gorm:"type:decimal(10,2);not null;default:0" json:"tax_amount"`
    Discount      float64    `gorm:"type:decimal(10,2);not null;default:0" json:"discount"`
    ServiceType   string     `gorm:"size:20;not null;default:OPD" json:"service_type"`
}

func (BillItem) TableName() string { return "bill_items" }

type Payment struct {
    BaseModel
    BillID          uuid.UUID `gorm:"type:uuid;not null;index" json:"bill_id"`
    Amount          float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
    Method          string    `gorm:"size:20;not null;default:CASH" json:"method"` // CASH, CARD, UPI, BANK_TRANSFER, ONLINE
    ReferenceNumber string    `gorm:"size:64" json:"reference_number"`
    ReceivedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"received_by_user_id"`
    ReceivedBy      User      `gorm:"foreignKey:ReceivedByUserID" json:"received_by,omitempty"`
    Notes           string    `gorm:"type:text" json:"notes"`
}

func (Payment) TableName() string { return "payments" }

type Refund struct {
    BaseModel
    BillID          uuid.UUID `gorm:"type:uuid;not null;index" json:"bill_id"`
    Amount          float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
    Reason          string    `gorm:"type:text;not null" json:"reason"`
    ReferenceNumber string    `gorm:"size:64" json:"reference_number"`
    RefundedByUserID uuid.UUID `gorm:"type:uuid;not null" json:"refunded_by_user_id"`
    RefundedBy      User      `gorm:"foreignKey:RefundedByUserID" json:"refunded_by,omitempty"`
    Status          string    `gorm:"size:20;not null;default:PENDING" json:"status"` // PENDING, APPROVED, PROCESSED, REJECTED
    ApprovedBy      *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
    Notes           string    `gorm:"type:text" json:"notes"`
}

func (Refund) TableName() string { return "refunds" }
```

#### Service Catalog

```go
type ServiceCategory struct {
    BaseModel
    Name        string  `gorm:"size:100;not null;uniqueIndex" json:"name"`
    Description string  `gorm:"type:text" json:"description"`
    IsActive    bool    `gorm:"not null;default:true" json:"is_active"`
    SortOrder   int     `gorm:"not null;default:0" json:"sort_order"`

    Services []ServiceCatalog `gorm:"foreignKey:CategoryID" json:"services,omitempty"`
}

func (ServiceCategory) TableName() string { return "service_categories" }

type ServiceCatalog struct {
    BaseModel
    CategoryID  uuid.UUID `gorm:"type:uuid;not null;index" json:"category_id"`
    Category    ServiceCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
    Name        string    `gorm:"size:200;not null" json:"name"`
    Code        string    `gorm:"size:20;uniqueIndex" json:"code"` // Short code for quick reference
    Description string    `gorm:"type:text" json:"description"`
    Rate        float64   `gorm:"type:decimal(10,2);not null" json:"rate"`
    Unit        string    `gorm:"size:20;not null;default:PIECE" json:"unit"` // PIECE, HOUR, SESSION, DAY, ML, GRAM
    HSNCode     string    `gorm:"size:20" json:"hsn_code"`
    TaxRate     float64   `gorm:"type:decimal(5,2);not null;default:0" json:"tax_rate"`
    IsActive    bool      `gorm:"not null;default:true" json:"is_active"`
}

func (ServiceCatalog) TableName() string { return "service_catalogs" }
```

#### Discount Rule

```go
type DiscountRule struct {
    BaseModel
    Name        string  `gorm:"size:100;not null" json:"name"`
    Type        string  `gorm:"size:10;not null" json:"type"` // FLAT, PERCENTAGE
    Value       float64 `gorm:"type:decimal(10,2);not null" json:"value"`
    MinAmount   float64 `gorm:"type:decimal(10,2);not null;default:0" json:"min_amount"`
    MaxDiscount float64 `gorm:"type:decimal(10,2);not null;default:0" json:"max_discount"` // Cap for percentage
    MaxUses     int     `gorm:"not null;default:0" json:"maxUses"` // 0 = unlimited
    UsedCount   int     `gorm:"not null;default:0" json:"used_count"`
    StartDate   *time.Time `json:"start_date"`
    EndDate     *time.Time `json:"end_date"`
    IsActive    bool    `gorm:"not null;default:true" json:"is_active"`
}

func (DiscountRule) TableName() string { return "discount_rules" }
```

#### Bill Counter (Existing — Enhanced)

```go
type BillCounter struct {
    Year       int `gorm:"primaryKey"`
    LastNumber int `gorm:"not null;default:0"`
}

func (BillCounter) TableName() string { return "bill_counters" }
```

### 3.3 Database Indexes

```sql
-- Service Categories
CREATE INDEX idx_service_categories_is_active ON service_categories(is_active);

-- Service Catalog
CREATE INDEX idx_service_catalogs_category_id ON service_catalogs(category_id);
CREATE INDEX idx_service_catalogs_code ON service_catalogs(code);
CREATE INDEX idx_service_catalogs_is_active ON service_catalogs(is_active);

-- Bills (existing + enhanced)
CREATE INDEX idx_bills_patient_id ON bills(patient_id);
CREATE INDEX idx_bills_encounter_id ON bills(encounter_id);
CREATE INDEX idx_bills_admission_id ON bills(admission_id);
CREATE INDEX idx_bills_payment_status ON bills(payment_status);
CREATE INDEX idx_bills_service_type ON bills(service_type);
CREATE INDEX idx_bills_bill_no ON bills(bill_no);
CREATE INDEX idx_bills_created_at ON bills(created_at DESC);

-- Bill Items
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_service_id ON bill_items(service_id);

-- Payments
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_payments_method ON payments(method);

-- Refunds
CREATE INDEX idx_refunds_bill_id ON refunds(bill_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- Discount Rules
CREATE INDEX idx_discount_rules_is_active ON discount_rules(is_active);
```

---

## 4. API Endpoints

All endpoints prefixed with `/api/v1`. Authentication required via Bearer token.

### 4.1 Service Catalog (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/billing/service-categories` | List service categories | Any authenticated |
| `POST` | `/billing/service-categories` | Create category | ADMIN |
| `PUT` | `/billing/service-categories/:id` | Update category | ADMIN |
| `DELETE` | `/billing/service-categories/:id` | Soft-delete category | ADMIN |
| `GET` | `/billing/services` | List all services (category, search filters) | Any authenticated |
| `GET` | `/billing/services/:id` | Get service detail | Any authenticated |
| `POST` | `/billing/services` | Create service | ADMIN |
| `PUT` | `/billing/services/:id` | Update service | ADMIN |
| `DELETE` | `/billing/services/:id` | Soft-delete service | ADMIN |

**Seed Service Categories:**

| Name | Services |
|------|----------|
| Consultation | OPD Consultation, Follow-up, Emergency Consultation |
| Investigations | Blood Test, Urine Analysis, X-Ray, USG, ECG |
| Procedures | Minor Surgery, Wound Dressing, Injection, IV Infusion |
| Room Charges | General Ward, Semi-Private, Private, Suite, ICU |
| Panchakarma | Abhyanga, Shirodhara, Basti, Nasya, Virechana |
| Pharmacy | (Auto-populated from Medicine master) |
| Diet | Diet Consultation, Special Diet |

**Service List Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "category": { "id": "uuid", "name": "Consultation" },
      "name": "OPD Consultation",
      "code": "CONS-OPD",
      "description": "General OPD consultation with physician",
      "rate": 500.00,
      "unit": "PIECE",
      "hsn_code": "998311",
      "tax_rate": 0,
      "is_active": true
    }
  ]
}
```

### 4.2 Bill Management (Enhanced)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/bills` | List bills (status, date, patient, service_type filters) | BILLING_STAFF, ADMIN |
| `GET` | `/bills/:id` | Get bill detail with items + payments | BILLING_STAFF, ADMIN |
| `GET` | `/bills/number/:bill_no` | Get bill by number | BILLING_STAFF, ADMIN |
| `POST` | `/bills` | Create bill with line items | BILLING_STAFF, ADMIN |
| `PUT` | `/bills/:id` | Update bill (UNPAID only) | BILLING_STAFF, ADMIN |
| `DELETE` | `/bills/:id` | Cancel bill (UNPAID only, soft-delete) | ADMIN |
| `GET` | `/bills/patient/:patientId` | Get all bills for a patient | BILLING_STAFF, DOCTOR, ADMIN |
| `GET` | `/bills/outstanding` | List all bills with due amounts | BILLING_STAFF, ADMIN |

**Enhanced Create Bill Request:**
```json
{
  "patient_id": "uuid",
  "encounter_id": "uuid",
  "admission_id": "uuid",
  "service_type": "OPD",
  "discount_type": "FLAT",
  "discount": 100.00,
  "notes": "Senior citizen discount applied",
  "items": [
    {
      "service_id": "uuid",
      "description": "OPD Consultation",
      "quantity": 1,
      "rate": 500.00,
      "tax_rate": 0,
      "service_type": "OPD"
    },
    {
      "service_id": "uuid",
      "description": "Blood Test - CBC",
      "quantity": 1,
      "rate": 350.00,
      "tax_rate": 0,
      "service_type": "INVESTIGATION"
    }
  ]
}
```

### 4.3 Payments (Enhanced)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/bills/:id/payments` | Record payment (cash, card, UPI, bank transfer) | BILLING_STAFF, ADMIN |
| `GET` | `/bills/:id/payments` | List all payments for a bill | BILLING_STAFF, ADMIN |
| `POST` | `/bills/:id/payments/split` | Record split payment (multiple methods) | BILLING_STAFF, ADMIN |

**Split Payment Request:**
```json
{
  "payments": [
    { "amount": 500.00, "method": "CASH", "reference": "" },
    { "amount": 300.00, "method": "UPI", "reference": "UPI-REF-12345" },
    { "amount": 200.00, "method": "CARD", "reference": "CARD-REF-67890" }
  ]
}
```

### 4.4 Refunds (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/bills/:id/refunds` | Request refund | BILLING_STAFF, ADMIN |
| `GET` | `/bills/:id/refunds` | List refunds for a bill | BILLING_STAFF, ADMIN |
| `PATCH` | `/bills/:id/refunds/:refundId/approve` | Approve refund | ADMIN |
| `PATCH` | `/bills/:id/refunds/:refundId/process` | Process approved refund | BILLING_STAFF, ADMIN |
| `GET` | `/billing/refunds` | List all refund requests | ADMIN |

**Refund Request:**
```json
{
  "amount": 200.00,
  "reason": "Service cancelled - duplicate billing",
  "reference_number": "REF-2026-001"
}
```

**Refund Status Machine:**
```
PENDING ──→ APPROVED ──→ PROCESSED
   │
   └──→ REJECTED
```

### 4.5 Discount Rules (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/billing/discounts` | List active discount rules | BILLING_STAFF, ADMIN |
| `POST` | `/billing/discounts` | Create discount rule | ADMIN |
| `PUT` | `/billing/discounts/:id` | Update discount rule | ADMIN |
| `DELETE` | `/billing/discounts/:id` | Deactivate discount rule | ADMIN |
| `POST` | `/billing/discounts/validate` | Validate and apply discount to amount | BILLING_STAFF, ADMIN |

**Validate Discount Request:**
```json
{
  "code": "SENIOR2026",
  "amount": 1500.00
}
```

**Validate Discount Response:**
```json
{
  "data": {
    "valid": true,
    "discount_type": "PERCENTAGE",
    "discount_value": 10,
    "min_amount_met": true,
    "max_uses_remaining": 45,
    "applied_discount": 150.00,
    "final_amount": 1350.00
  }
}
```

### 4.6 Auto-Billing Endpoints (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/billing/auto/consultation` | Auto-generate consultation bill from encounter | System/Auto |
| `POST` | `/billing/auto/ipd-daily` | Auto-generate daily IPD charges (bed, nursing) | System/Cron |
| `POST` | `/billing/auto/pharmacy` | Auto-generate bill from dispensed prescriptions | System/Auto |
| `POST` | `/billing/auto/panchakarma` | Auto-generate bill from completed PK sessions | System/Auto |

**Auto-Bill from Encounter:**
```json
{
  "encounter_id": "uuid",
  "patient_id": "uuid"
}
```

**Auto IPD Daily Charges:**
```json
{
  "admission_id": "uuid",
  "date": "2026-08-05"
}
```

### 4.7 Receipt & Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/bills/:id/receipt` | Generate/print receipt (HTML/PDF) | BILLING_STAFF, ADMIN |
| `GET` | `/billing/dashboard` | Billing KPIs (today's collection, outstanding) | BILLING_STAFF, ADMIN |
| `GET` | `/billing/reports/daily` | Daily collection report | BILLING_STAFF, ADMIN |
| `GET` | `/billing/reports/service-wise` | Service-wise revenue report | ADMIN |
| `GET` | `/billing/reports/patient-wise` | Patient-wise billing report | ADMIN |
| `GET` | `/billing/reports/outstanding` | Outstanding dues report | BILLING_STAFF, ADMIN |
| `GET` | `/billing/reports/discount` | Discount utilization report | ADMIN |
| `GET` | `/billing/reports/payment-method` | Payment method breakdown | ADMIN |
| `GET` | `/billing/reports/tax` | Tax collection report | ADMIN |

**Billing Dashboard Response:**
```json
{
  "data": {
    "today": {
      "total_bills": 24,
      "total_collected": 18500.00,
      "total_pending": 3200.00,
      "cash_collected": 8500.00,
      "card_collected": 4200.00,
      "upi_collected": 5800.00,
      "bills_created": 8,
      "payments_received": 16
    },
    "overall": {
      "total_revenue": 1245600.00,
      "total_collected": 987500.00,
      "total_outstanding": 258100.00,
      "overdue_count": 45,
      "overdue_amount": 123400.00
    },
    "recent_bills": [
      {
        "bill_no": "BILL-2026-000123",
        "patient": "Priya Sharma",
        "amount": 2800.00,
        "status": "PAID",
        "date": "2026-08-05T10:30:00Z"
      }
    ]
  }
}
```

---

## 5. Frontend Pages & Components

### 5.1 Admin Navigation Updates

**Modified sidebar** in `AdminLayout.tsx`:

```
BILLING (collapsible)
├── Dashboard        /admin/billing/dashboard
├── Bills            /admin/billing/bills
├── Services         /admin/billing/services
├── Discounts        /admin/billing/discounts
├── Refunds          /admin/billing/refunds
├── Outstanding      /admin/billing/outstanding
└── Reports          /admin/billing/reports
```

**Sidebar icon:** `Receipt` (existing) — unchanged.

### 5.2 Page Inventory

| Page | Route | Primary Role | Description |
|------|-------|-------------|-------------|
| BillingDashboard | `/admin/billing/dashboard` | Billing Staff, Admin | KPIs, today's collection, outstanding |
| BillList | `/admin/billing/bills` | Billing Staff, Admin | **Enhanced** existing page |
| BillDetail | `/admin/billing/bills/:id` | Billing Staff, Admin | Full bill detail + payments + refunds |
| ServiceCatalog | `/admin/billing/services` | Admin | Service master management |
| DiscountList | `/admin/billing/discounts` | Admin | Discount rule management |
| RefundList | `/admin/billing/refunds` | Admin | Refund request management |
| OutstandingList | `/admin/billing/outstanding` | Billing Staff | All bills with due amounts |
| BillingReports | `/admin/billing/reports` | Admin | Analytics and reports |
| ReceiptView | `/admin/billing/bills/:id/receipt` | Billing Staff | Print receipt view |

### 5.3 Page Specifications

#### 5.3.1 Billing Dashboard

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Billing Dashboard                          [Date: Today]  │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Today's │  Today's │ Outstanding│ Overdue │  Collection     │
│  Bills   │Collection│  Amount  │  Bills  │  Rate           │
│   24     │ ₹18,500  │ ₹2,58,100│   45    │  88.6%          │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │  Payment Methods Today  │  │  Today's Collection     │ │
│  │  (Pie Chart)            │  │  (Line Chart - 7 days)  │ │
│  │                         │  │                         │ │
│  │  💵 Cash: ₹8,500 (46%) │  │  Mon: ₹15,200           │ │
│  │  💳 Card: ₹4,200 (23%) │  │  Tue: ₹18,500           │ │
│  │  📱 UPI:  ₹5,800 (31%) │  │  Wed: ₹16,800           │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Recent Bills                                       │   │
│  │                                                     │   │
│  │  BILL-2026-000123 │ Priya S.   │ ₹2,800 │ ✅ PAID  │   │
│  │  BILL-2026-000124 │ Rajesh K.  │ ₹1,200 │ 🟡 PART │   │
│  │  BILL-2026-000125 │ Meena D.   │ ₹4,500 │ 🔴 UNPD │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quick Actions:                                             │
│  [+ New Bill]  [Record Payment]  [View Outstanding]        │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Enhanced Bill List

**Current page** (`Billing.tsx`, 280 lines) — upgrades needed:

| Current Feature | Enhancement |
|----------------|-------------|
| Bill No, Patient, Date, Net, Paid, Due, Status | Add Service Type, Admission #, Discount, Tax |
| Create Bill form (basic items) | Service catalog search/select, tax calculation, discount rules |
| Bill Detail modal (basic) | Tabbed: Items, Payments, Refunds, Receipt |
| Payment form | Split payment support, payment method icons |

**New table columns:**

| Column | Description |
|--------|-------------|
| Bill No | BILL-2026-000123 (click to detail) |
| Patient | Name + UHID |
| Service Type | OPD/IPD/PANCHAKARMA badge |
| Net Amount | ₹2,800.00 |
| Paid / Due | ₹2,800 / ₹0 (or ₹1,200 / ₹1,600) |
| Status | PAID (green), PARTIAL (amber), UNPAID (red) |
| Date | Admission/bill date |
| Actions | View, Pay, Print Receipt |

#### 5.3.3 Bill Detail (Tabbed)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    BILL-2026-000123                    [Print]     │
│  Patient: Priya Sharma (AHMS-2026-000123)                  │
│  Service: OPD  |  Date: Aug 5, 2026  |  Billed by: Admin   │
├─────────────────────────────────────────────────────────────┤
│  [Items] [Payments] [Refunds] [Receipt]                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Items Tab ──────────────────────────────────────────┐│
│  │ # │ Description          │ Qty │ Rate  │ Tax │ Amount  ││
│  │───┼──────────────────────┼─────┼───────┼─────┼─────────││
│  │ 1 │ OPD Consultation     │  1  │ ₹500  │  0% │  ₹500  ││
│  │ 2 │ Blood Test - CBC     │  1  │ ₹350  │  0% │  ₹350  ││
│  │ 3 │ Triphala Churna 100g │  2  │ ₹120  │  0% │  ₹240  ││
│  ├───┴──────────────────────┴─────┴───────┴─────┴─────────┤│
│  │                          Subtotal:     ₹1,090          ││
│  │                          Discount:     -₹90            ││
│  │                          Tax:          ₹0              ││
│  │                          ─────────────────────          ││
│  │                          Net Total:    ₹1,000          ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Payment Summary ────────────────────────────────────┐│
│  │  Total: ₹1,000  |  Paid: ₹1,000  |  Due: ₹0         ││
│  │  Status: ✅ PAID                                        ││
│  │                                                        ││
│  │  Payment History:                                       ││
│  │  Aug 5, 10:30 — ₹1,000 — CASH — Received by Admin     ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Record Payment]  [Request Refund]  [Print Receipt]       │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.4 Service Catalog Page

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Service Catalog                       [+ Add Service]     │
│  Filter: [All Categories ▼]  [Search: _____________]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Consultation ───────────────────────────────────────┐│
│  │ CONS-OPD  │ OPD Consultation        │ ₹500  │ Active  ││
│  │ CONS-FUP  │ Follow-up Consultation  │ ₹300  │ Active  ││
│  │ CONS-EMR  │ Emergency Consultation  │ ₹1000 │ Active  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Investigations ─────────────────────────────────────┐│
│  │ INV-CBC   │ Blood Test - CBC        │ ₹350  │ Active  ││
│  │ INV-UA    │ Urine Analysis          │ ₹200  │ Active  ││
│  │ INV-XR    │ X-Ray                   │ ₹500  │ Active  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Panchakarma ────────────────────────────────────────┐│
│  │ PK-ABH    │ Abhyanga (60 min)       │ ₹1500 │ Active  ││
│  │ PK-SHI    │ Shirodhara (45 min)     │ ₹2000 │ Active  ││
│  │ PK-BAS    │ Basti (30 min)          │ ₹1200 │ Active  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Room Charges ───────────────────────────────────────┐│
│  │ RM-GEN    │ General Ward / day      │ ₹500  │ Active  ││
│  │ RM-SPV    │ Semi-Private / day      │ ₹1000 │ Active  ││
│  │ RM-PRV    │ Private / day           │ ₹2000 │ Active  ││
│  │ RM-ICU    │ ICU / day               │ ₹5000 │ Active  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Reusable Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `BillSummary` | Financial summary card (Total/Paid/Due) | BillList, BillDetail, Dashboard |
| `PaymentMethodIcon` | Icon for CASH/CARD/UPI/BANK | Payment forms, history |
| `StatusBadge` | PAID/PARTIAL/UNPAID/REFUNDED badge | Everywhere bills shown |
| `ServiceSelector` | Searchable service catalog dropdown | BillCreate, BillEdit |
| `TaxCalculator` | Auto-calculate tax from rate + qty | BillCreate |
| `DiscountApplier` | Discount rule selector + validation | BillCreate |
| `PaymentForm` | Standard payment input form | BillDetail, POS |
| `SplitPaymentForm` | Multi-method payment form | BillDetail |
| `ReceiptTemplate` | Print-ready receipt layout | ReceiptView |
| `OutstandingCard` | Patient outstanding summary | PatientDetail, Dashboard |

---

## 6. RBAC & Permissions Matrix

### 6.1 New Permissions

```go
// internal/models/permission.go additions

// Billing (existing, enhanced)
PermissionBillingCreate  = "billing.create"  // EXISTS
PermissionBillingView    = "billing.view"    // EXISTS
PermissionBillingEdit    = "billing.edit"    // NEW
PermissionBillingDelete  = "billing.delete"  // NEW
PermissionBillingRefund  = "billing.refund"  // NEW
PermissionBillingReport  = "billing.report"  // NEW

// Service Catalog
PermissionServiceView    = "service.view"
PermissionServiceCreate  = "service.create"
PermissionServiceEdit    = "service.edit"
PermissionServiceDelete  = "service.delete"

// Discount Rules
PermissionDiscountView   = "discount.view"
PermissionDiscountCreate = "discount.create"
PermissionDiscountEdit   = "discount.edit"
PermissionDiscountDelete = "discount.delete"

// Auto-Billing
PermissionAutoBillingTrigger = "auto_billing.trigger"
```

### 6.2 Permission-to-Role Mapping

| Permission | ADMIN | BILLING_STAFF | DOCTOR | NURSE | RECEPTIONIST | PATIENT |
|------------|:-----:|:-------------:|:------:|:-----:|:------------:|:-------:|
| billing.create | ✓ | ✓ | — | — | ✓ | — |
| billing.view | ✓ | ✓ | ✓(own) | — | ✓ | ✓(own) |
| billing.edit | ✓ | ✓ | — | — | — | — |
| billing.delete | ✓ | — | — | — | — | — |
| billing.refund | ✓ | ✓ | — | — | — | — |
| billing.report | ✓ | ✓ | — | — | — | — |
| service.view | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| service.create | ✓ | — | — | — | — | — |
| service.edit | ✓ | — | — | — | — | — |
| service.delete | ✓ | — | — | — | — | — |
| discount.view | ✓ | ✓ | — | — | ✓ | — |
| discount.create | ✓ | — | — | — | — | — |
| discount.edit | ✓ | — | — | — | — | — |
| discount.delete | ✓ | — | — | — | — | — |
| auto_billing.trigger | ✓ | — | — | — | — | — |

---

## 7. Business Logic & Workflows

### 7.1 Bill Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                     BILL LIFECYCLE                             │
│                                                               │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐          │
│  │ Created  │──→│   Partial    │──→│    Paid      │          │
│  │ (UNPAID) │   │  (PARTIAL)   │   │   (PAID)     │          │
│  └────┬─────┘   └──────────────┘   └──────────────┘          │
│       │                                                       │
│       ├──→ Cancelled (UNPAID only)                           │
│       │                                                       │
│       └──→ Refunded (PAID → REFUNDED)                        │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Payment Application Logic

```go
func (r *Repository) ApplyPayment(billID uuid.UUID, amount float64, method, ref string, userID uuid.UUID) (*models.Bill, error) {
    // Begin transaction with row lock
    tx := r.db.Clauses(clause.Locking{Strength: "UPDATE"}).Begin()

    var bill models.Bill
    if err := tx.First(&bill, billID).Error; err != nil {
        tx.Rollback()
        return nil, err
    }

    // Calculate new amounts
    newPaid := bill.PaidAmount + amount
    if newPaid > bill.NetAmount {
        newPaid = bill.NetAmount // Cap at net amount
    }

    // Determine status
    var status string
    if newPaid >= bill.NetAmount {
        status = "PAID"
    } else if newPaid > 0 {
        status = "PARTIAL"
    } else {
        status = "UNPAID"
    }

    // Update bill
    bill.PaidAmount = newPaid
    bill.DueAmount = bill.NetAmount - newPaid
    bill.PaymentStatus = status
    tx.Save(&bill)

    // Create payment record
    payment := models.Payment{
        BillID:          billID,
        Amount:          amount,
        Method:          method,
        ReferenceNumber: ref,
        ReceivedByUserID: userID,
    }
    tx.Create(&payment)

    tx.Commit()

    return r.FindBillByID(billID)
}
```

### 7.3 Auto-Billing from Clinical Modules

#### OPD Auto-Bill (Consultation)

```go
func (s *Service) AutoBillConsultation(encounterID uuid.UUID, userID uuid.UUID) (*models.Bill, error) {
    encounter, _ := s.encounterRepo.FindByID(encounterID)

    // Fetch consultation service rate
    service, _ := s.serviceRepo.FindByCode("CONS-OPD")

    items := []models.BillItem{
        {
            Description: service.Name,
            Quantity:    1,
            Rate:        service.Rate,
            Amount:      service.Rate,
            ServiceType: "CONSULTATION",
            ServiceID:   &service.ID,
        },
    }

    return s.CreateBill(CreateBillRequest{
        PatientID:   encounter.PatientID.String(),
        EncounterID: encounterID.String(),
        Items:       items,
    }, userID)
}
```

#### IPD Daily Auto-Bill

```go
func (s *Service) AutoBillIPDDaily(admissionID uuid.UUID, date time.Time, userID uuid.UUID) error {
    admission, _ := s.admissionRepo.FindByID(admissionID)

    var items []models.BillItem

    // Room charges
    if admission.Bed != nil {
        roomService, _ := s.serviceRepo.FindByCode(getRoomCode(admission.Bed.BedType))
        items = append(items, models.BillItem{
            Description: fmt.Sprintf("Room charges - %s", admission.Bed.BedType),
            Quantity:    1,
            Rate:        roomService.Rate,
            Amount:      roomService.Ray,
            ServiceType: "ROOM",
        })
    }

    // Create bill
    bill, err := s.CreateBill(CreateBillRequest{
        PatientID:   admission.PatientID.String(),
        AdmissionID: admissionID.String(),
        ServiceType: "IPD",
        Items:       items,
    }, userID)

    return err
}
```

#### Panchakarma Auto-Bill

```go
func (s *Service) AutoBillPanchakarma(sessionID uuid.UUID, userID uuid.UUID) error {
    session, _ := s.pkRepo.GetSessionByID(sessionID)

    service, _ := s.serviceRepo.FindByName(session.TherapyType.Name)

    items := []models.BillItem{
        {
            Description: fmt.Sprintf("%s - Session #%d", session.TherapyType.Name, session.SessionNumber),
            Quantity:    1,
            Rate:        service.Rate,
            Amount:      service.Rate,
            ServiceType: "PANCHAKARMA",
            ServiceID:   &service.ID,
        },
    }

    // Include materials if any
    for _, mat := range session.Materials_ {
        items = append(items, models.BillItem{
            Description: mat.MaterialName,
            Quantity:    int(mat.QuantityUsed),
            Rate:        mat.OilML * 0.5, // Example pricing
            Amount:      float64(int(mat.QuantityUsed)) * mat.OilML * 0.5,
            ServiceType: "PHARMACY",
        })
    }

    bill, err := s.CreateBill(CreateBillRequest{
        PatientID:   session.Plan.PatientID.String(),
        EncounterID: session.Plan.EncounterID.String(),
        Items:       items,
    }, userID)

    return err
}
```

### 7.4 Receipt Generation

```go
func (s *Service) GenerateReceipt(billID uuid.UUID) (*ReceiptData, error) {
    bill, _ := s.repo.FindBillByID(billID)

    receipt := &ReceiptData{
        HospitalName: "AHMS Ayurvedic Hospital",
        Address:      "123 Health Street, Wellness City",
        Phone:        "+91-1234567890",
        BillNo:       bill.BillNo,
        Date:         bill.CreatedAt.Format("02 Jan 2006"),
        PatientName:  bill.Patient.FirstName + " " + bill.Patient.LastName,
        UHID:         bill.Patient.UHID,
        Items:        bill.Items,
        TotalAmount:  bill.TotalAmount,
        Discount:     bill.Discount,
        TaxAmount:    bill.TaxAmount,
        NetAmount:    bill.NetAmount,
        PaidAmount:   bill.PaidAmount,
        DueAmount:    bill.DueAmount,
        PaymentStatus: bill.PaymentStatus,
        Payments:     bill.Payments,
        BilledBy:     bill.BilledBy.FirstName + " " + bill.BilledBy.LastName,
    }

    return receipt, nil
}
```

---

## 8. Integration Points

### 8.1 OPD Consultation (Vol 3)

| Direction | Integration |
|-----------|------------|
| Consultation → Billing | Auto-create bill on consultation completion |
| Billing → Encounter | Link bill to encounter for audit trail |

### 8.2 IPD (Vol 6)

| Direction | Integration |
|-----------|------------|
| IPD → Billing | Daily room charges auto-generated |
| IPD → Billing | Treatment orders create billing items |
| IPD → Billing | Discharge triggers final bill |
| Billing → IPD | Outstanding dues flagged on discharge |

### 8.3 Pharmacy (Vol 5)

| Direction | Integration |
|-----------|------------|
| Pharmacy → Billing | Dispensing auto-creates bill items |
| Billing → Pharmacy | Medicine rates from service catalog |

### 8.4 Panchakarma (Vol 4)

| Direction | Integration |
|-----------|------------|
| Panchakarma → Billing | Completed sessions auto-billed |
| Billing → Panchakarma | Therapy rates from service catalog |

### 8.5 Patient Portal (Vol 9)

| Direction | Integration |
|-----------|------------|
| Portal → Billing | Patients view own bills and due amounts |
| Billing → Portal | Bill/payment data exposed via portal API |

### 8.6 Audit Trail (Vol 8)

| Event | Action |
|-------|--------|
| Bill created | `bill.create` |
| Payment received | `billing.payment` |
| Refund processed | `billing.refund` |
| Bill cancelled | `billing.cancel` |

---

## 9. Design System & UI Components

### 9.1 Color Tokens

```typescript
export const billingColors = {
  primary: '#0F766E',
  secondary: '#C8A14D',
  background: '#FAF8F2',

  // Payment status
  paid: '#059669',
  partial: '#F59E0B',
  unpaid: '#DC2626',
  refunded: '#6B7280',

  // Payment methods
  cash: '#059669',
  card: '#2563EB',
  upi: '#7C3AED',
  bankTransfer: '#F59E0B',
  online: '#EC4899',

  // Service types
  opd: '#2563EB',
  ipd: '#DC2626',
  pharmacy: '#059669',
  panchakarma: '#7C3AED',
  investigation: '#F59E0B',
  procedure: '#EC4899',

  // Financial
  revenue: '#059669',
  outstanding: '#F59E0B',
  overdue: '#DC2626',
  discount: '#7C3AED',
  tax: '#6B7280',
};
```

### 9.2 Component Specifications

#### StatusBadge

```
✅ PAID      (green background)
🟡 PARTIAL   (amber background)
🔴 UNPAID    (red background)
⚪ REFUNDED  (gray background)
```

#### BillSummary

```
┌─────────────────────────────────┐
│  Bill Summary                   │
│  ─────────────────────────      │
│  Subtotal:      ₹1,090.00      │
│  Discount:       -₹90.00       │
│  Tax:            ₹0.00         │
│  ─────────────────────────      │
│  Net Total:     ₹1,000.00      │
│  Paid:          ₹1,000.00      │
│  Due:              ₹0.00       │
│  ─────────────────────────      │
│  Status: ✅ PAID                │
└─────────────────────────────────┘
```

#### PaymentMethodIcon

```
💵 Cash    💳 Card    📱 UPI    🏦 Bank Transfer
```

---

## 10. State Management & Data Flow

### 10.1 React Query Keys

```typescript
export const billingKeys = {
  all: ['billing'] as const,
  serviceCategories: () => [...billingKeys.all, 'serviceCategories'] as const,
  services: () => [...billingKeys.all, 'services'] as const,
  service: (id: string) => [...billingKeys.services(), id] as const,
  bills: () => [...billingKeys.all, 'bills'] as const,
  bill: (id: string) => [...billingKeys.bills(), id] as const,
  billByNo: (no: string) => [...billingKeys.bills(), 'no', no] as const,
  patientBills: (patientId: string) => [...billingKeys.bills(), 'patient', patientId] as const,
  outstanding: () => [...billingKeys.bills(), 'outstanding'] as const,
  payments: (billId: string) => [...billingKeys.bill(billId), 'payments'] as const,
  refunds: (billId: string) => [...billingKeys.bill(billId), 'refunds'] as const,
  allRefunds: () => [...billingKeys.all, 'refunds'] as const,
  discounts: () => [...billingKeys.all, 'discounts'] as const,
  dashboard: () => [...billingKeys.all, 'dashboard'] as const,
  reports: () => [...billingKeys.all, 'reports'] as const,
};
```

### 10.2 API Service Layer

```typescript
// src/services/billingApi.ts

import api from '../lib/api';

export const billingApi = {
  // Service Categories
  getServiceCategories: () => api.get('/billing/service-categories'),
  createServiceCategory: (data: any) => api.post('/billing/service-categories', data),
  updateServiceCategory: (id: string, data: any) => api.put(`/billing/service-categories/${id}`, data),

  // Services
  getServices: (params?: any) => api.get('/billing/services', { params }),
  getService: (id: string) => api.get(`/billing/services/${id}`),
  createService: (data: any) => api.post('/billing/services', data),
  updateService: (id: string, data: any) => api.put(`/billing/services/${id}`, data),

  // Bills
  getBills: (params?: any) => api.get('/bills', { params }),
  getBill: (id: string) => api.get(`/bills/${id}`),
  getBillByNo: (billNo: string) => api.get(`/bills/number/${billNo}`),
  createBill: (data: any) => api.post('/bills', data),
  updateBill: (id: string, data: any) => api.put(`/bills/${id}`, data),
  cancelBill: (id: string) => api.delete(`/bills/${id}`),
  getPatientBills: (patientId: string) => api.get(`/bills/patient/${patientId}`),
  getOutstanding: () => api.get('/bills/outstanding'),

  // Payments
  addPayment: (billId: string, data: any) => api.post(`/bills/${billId}/payments`, data),
  getPayments: (billId: string) => api.get(`/bills/${billId}/payments`),
  addSplitPayment: (billId: string, data: any) => api.post(`/bills/${billId}/payments/split`, data),

  // Refunds
  requestRefund: (billId: string, data: any) => api.post(`/bills/${billId}/refunds`, data),
  getRefunds: (billId: string) => api.get(`/bills/${billId}/refunds`),
  approveRefund: (billId: string, refundId: string) => api.patch(`/bills/${billId}/refunds/${refundId}/approve`),
  processRefund: (billId: string, refundId: string) => api.patch(`/bills/${billId}/refunds/${refundId}/process`),
  getAllRefunds: () => api.get('/billing/refunds'),

  // Discounts
  getDiscounts: () => api.get('/billing/discounts'),
  createDiscount: (data: any) => api.post('/billing/discounts', data),
  updateDiscount: (id: string, data: any) => api.put(`/billing/discounts/${id}`, data),
  validateDiscount: (data: any) => api.post('/billing/discounts/validate', data),

  // Auto-Billing
  autoBillConsultation: (data: any) => api.post('/billing/auto/consultation', data),
  autoBillIPDDaily: (data: any) => api.post('/billing/auto/ipd-daily', data),
  autoBillPharmacy: (data: any) => api.post('/billing/auto/pharmacy', data),
  autoBillPanchakarma: (data: any) => api.post('/billing/auto/panchakarma', data),

  // Receipt & Reports
  getReceipt: (billId: string) => api.get(`/bills/${billId}/receipt`),
  getDashboard: () => api.get('/billing/dashboard'),
  getDailyReport: (params?: any) => api.get('/billing/reports/daily', { params }),
  getServiceWiseReport: (params?: any) => api.get('/billing/reports/service-wise', { params }),
  getPatientWiseReport: (params?: any) => api.get('/billing/reports/patient-wise', { params }),
  getOutstandingReport: (params?: any) => api.get('/billing/reports/outstanding', { params }),
  getDiscountReport: (params?: any) => api.get('/billing/reports/discount', { params }),
  getPaymentMethodReport: (params?: any) => api.get('/billing/reports/payment-method', { params }),
  getTaxReport: (params?: any) => api.get('/billing/reports/tax', { params }),
};
```

---

## 11. Error Handling & Edge Cases

### 11.1 Validation Rules

| Rule | Field | Error Code |
|------|-------|-----------|
| Patient ID required | patient_id | VALIDATION_ERROR |
| Items cannot be empty | items | VALIDATION_ERROR |
| Quantity must be > 0 | quantity | VALIDATION_ERROR |
| Rate must be >= 0 | rate | VALIDATION_ERROR |
| Payment amount must be > 0 | amount | VALIDATION_ERROR |
| Payment method valid | method | VALIDATION_ERROR |
| Discount cannot exceed net amount | discount | VALIDATION_ERROR |
| Refund amount cannot exceed paid amount | amount | VALIDATION_ERROR |

### 11.2 Business Rule Violations

| Scenario | Response | HTTP Code |
|----------|----------|-----------|
| Payment exceeds due amount | "Payment exceeds due amount" | 422 Unprocessable |
| Cancel bill with payments | "Cannot cancel: payments exist" | 422 Unprocessable |
| Refund on unpaid bill | "Cannot refund: bill is unpaid" | 422 Unprocessable |
| Duplicate bill number | "Bill number already exists" | 409 Conflict |
| Apply payment to cancelled bill | "Cannot pay: bill is cancelled" | 422 Unprocessable |
| Discount rule expired | "Discount code has expired" | 422 Unprocessable |
| Discount max uses exceeded | "Discount code usage limit reached" | 422 Unprocessable |

### 11.3 Edge Cases

| Case | Handling |
|------|----------|
| Bill with zero total | Allow (free service/documentation) |
| Payment of ₹0 | Reject with validation error |
| Multiple partial payments | Accumulate, update status per payment |
| Bill created for past encounter | Allow for retroactive billing |
| Refund processed but patient already paid | Mark as credit note, offset against future bills |
| Concurrent payments on same bill | Row-level locking prevents race conditions |
| Service rate changed after bill created | Bill retains original rate (historical accuracy) |

---

## 12. Security Considerations

### 12.1 Access Controls

- Billing staff can create bills and record payments
- Only admins can delete/cancel bills
- Refunds require admin approval
- Patients can only view own bills (portal)
- Payment receipts require authentication

### 12.2 Financial Data Integrity

- Row-level locking on payment operations (prevents double-payment)
- Atomic bill number generation (no duplicates)
- All monetary values stored as decimal(10,2) (no floating-point errors)
- CHECK constraints: amount >= 0, quantity > 0

### 12.3 Audit Trail

Every financial operation logged with:
- User ID (who performed action)
- Timestamp
- Before/after amounts
- Reference numbers (payment refs, refund refs)

---

## 13. Performance Optimization

### 13.1 Database Indexes

```sql
-- Bill list queries (most frequent)
CREATE INDEX idx_bills_patient_status ON bills(patient_id, payment_status);
CREATE INDEX idx_bills_date_status ON bills(created_at DESC, payment_status);
CREATE INDEX idx_bills_service_date ON bills(service_type, created_at DESC);

-- Outstanding queries
CREATE INDEX idx_bills_outstanding ON bills(due_amount)
WHERE due_amount > 0 AND payment_status != 'CANCELLED';

-- Payment queries
CREATE INDEX idx_payments_date ON payments(created_at DESC);
CREATE INDEX idx_payments_method_date ON payments(method, created_at DESC);
```

### 13.2 Caching

| Data | Cache Duration | Invalidation |
|------|---------------|-------------|
| Service catalog | 1 hour | On service CRUD |
| Discount rules | 1 hour | On discount CRUD |
| Dashboard stats | 2 minutes | On bill/payment creation |
| Outstanding total | 5 minutes | On payment/adjustment |

---

## 14. Testing Strategy

### 14.1 Backend Unit Tests

| Test | Scenario |
|------|----------|
| Bill creation | Correct total, tax, net calculation |
| Payment application | Status transitions UNPAID→PARTIAL→PAID |
| Bill number generation | Sequential, no duplicates, atomic |
| Discount validation | Percentage vs flat, min amount, expiry |
| Refund workflow | PENDING→APPROVED→PROCESSED |

### 14.2 Backend Integration Tests

| Test | Scenario |
|------|----------|
| Full billing flow | Create bill → Add items → Record payment → Verify status |
| Auto-billing from encounter | Encounter → Bill created with correct items |
| IPD daily charges | Admission → Daily bill auto-generated |
| Split payment | Cash + UPI → Both recorded, bill PAID |
| Refund processing | Request → Approve → Process → Verify refund |

### 14.3 QA Test Cases

| # | Module | Test Case | Expected | Priority |
|---|--------|-----------|----------|----------|
| 1 | Bill | Create bill with 3 items | Bill created, total correct | High |
| 2 | Payment | Record full payment | Status→PAID, due→0 | High |
| 3 | Payment | Record partial payment | Status→PARTIAL, due updated | High |
| 4 | Bill | Cancel unpaid bill | Status→CANCELLED | High |
| 5 | Refund | Request and process refund | Refund recorded, amount returned | Medium |
| 6 | Service | Add service to catalog | Service appears in list | Medium |
| 7 | Discount | Apply percentage discount | Correct amount deducted | Medium |
| 8 | Auto-Bill | Consultation auto-bill | Bill created with consultation item | Medium |
| 9 | Dashboard | View today's collection | Accurate amounts | Medium |
| 10 | Receipt | Generate receipt | All details accurate | Low |
| 11 | Report | View outstanding report | All due bills listed | Low |
| 12 | Split | Record split payment | Multiple methods, total correct | Low |

---

## 15. Implementation Phases & Effort

### 15.1 Gap Analysis Summary

| Component | Current State | Gap | Priority | Effort |
|-----------|--------------|-----|----------|--------|
| Service Catalog | ❌ Not created | Model + CRUD API + seed data + UI | High | 4 days |
| Enhanced Bill Model | ✅ Exists | Add admission_id, discount_type, tax_amount, refunds | High | 1 day |
| Bill CRUD (enhanced) | ✅ 5 endpoints | Add admission link, auto-billing, service search | High | 3 days |
| Payment (enhanced) | ✅ Exists | Add split payment, refunds | High | 3 days |
| Refund Model | ❌ Not created | Model + API + workflow + UI | High | 3 days |
| Discount Rules | ❌ Not created | Model + CRUD API + validation + UI | Medium | 3 days |
| Auto-Billing | ❌ Not created | Integration with Consultation, IPD, PK | Medium | 5 days |
| Receipt Generation | ❌ Not created | HTML/PDF receipt template | Medium | 2 days |
| Billing Dashboard | ❌ Not created | KPIs + charts + quick actions | Medium | 3 days |
| Enhanced Billing Page | ✅ Exists | Service catalog search, tax calc, discounts | Medium | 3 days |
| Reports (8 reports) | ❌ Not created | Daily, service-wise, patient-wise, etc. | Low | 5 days |
| Frontend navigation | Partial | Expand sidebar section | Low | 0.5 day |
| **TOTAL** | | | | **~35.5 days (7.1 weeks)** |

### 15.2 Sprint Breakdown

#### Sprint 12.1 — Service Catalog & Enhanced Bills (Week 1-2) — 10 days

| Task | Days | Owner |
|------|------|-------|
| ServiceCatalog + ServiceCategory models | 1 | Backend |
| Service Catalog CRUD API + seed data | 2 | Backend |
| Enhanced Bill model (add fields) | 0.5 | Backend |
| Bill CRUD enhancements (admission link, tax) | 2 | Backend |
| Discount Rule model + CRUD API | 2 | Backend |
| Discount validation logic | 1 | Backend |
| Backend unit tests | 1.5 | Backend |

**Deliverables:** Service catalog, enhanced billing, discount system.

#### Sprint 12.2 — Refunds & Auto-Billing (Week 3-4) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Refund model + workflow API | 2 | Backend |
| Split payment API | 1 | Backend |
| Auto-billing: Consultation integration | 2 | Backend |
| Auto-billing: IPD daily charges | 2 | Backend |
| Auto-billing: Panchakarma sessions | 1 | Backend |
| Receipt generation (HTML template) | 1 | Backend |
| Backend integration tests | 1 | Backend |

**Deliverables:** Refund workflow, auto-billing, receipts.

#### Sprint 12.3 — Frontend Core (Week 5-7) — 15 days

| Task | Days | Owner |
|------|------|-------|
| Frontend navigation + routes | 0.5 | Frontend |
| billingApi service layer | 0.5 | Frontend |
| Enhanced BillList page | 3 | Frontend |
| BillDetail page (tabbed) | 3 | Frontend |
| ServiceCatalog page | 2 | Frontend |
| DiscountList page | 1.5 | Frontend |
| RefundList page | 1.5 | Frontend |
| Split payment form | 1 | Frontend |
| Receipt view + print | 2 | Frontend |

**Deliverables:** All core billing pages functional.

#### Sprint 12.4 — Dashboard, Reports & Polish (Week 8) — 5 days

| Task | Days | Owner |
|------|------|-------|
| Billing Dashboard | 2 | Full-stack |
| Reports (8 reports) | 2 | Full-stack |
| E2E testing & bug fixes | 1 | QA |

**Deliverables:** Dashboard, reports, module ready for UAT.

### 15.3 Dependencies

| Dependency | Blocker? | Mitigation |
|------------|----------|-----------|
| Patient module (Vol 2) | No (existing) | Patient lookup already functional |
| Encounter module (Vol 3) | No (existing) | Encounter link already supported |
| Pharmacy module (Vol 5) | No | Auto-billing is additive |
| IPD module (Vol 6) | No | IPD daily charges are additive |
| Panchakarma module (Vol 4) | No | PK auto-billing is additive |

---

## Appendix A: Database Migration SQL

```sql
-- Service Categories
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Service Catalog
CREATE TABLE service_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES service_categories(id),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    rate DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'PIECE',
    hsn_code VARCHAR(20),
    tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced Bills (ALTER existing)
ALTER TABLE bills ADD COLUMN admission_id UUID REFERENCES admissions(id);
ALTER TABLE bills ADD COLUMN discount_type VARCHAR(10) NOT NULL DEFAULT 'FLAT';
ALTER TABLE bills ADD COLUMN discount_rule_id UUID REFERENCES discount_rules(id);
ALTER TABLE bills ADD COLUMN tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN notes TEXT;
ALTER TABLE bills ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Enhanced Bill Items (ALTER existing)
ALTER TABLE bill_items ADD COLUMN service_id UUID REFERENCES service_catalogs(id);
ALTER TABLE bill_items ADD COLUMN tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE bill_items ADD COLUMN tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE bill_items ADD COLUMN discount DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE bill_items ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Enhanced Payments (ALTER existing)
ALTER TABLE payments ADD COLUMN notes TEXT;
ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id),
    amount DOUBLE PRECISION NOT NULL,
    reason TEXT NOT NULL,
    reference_number VARCHAR(64),
    refunded_by_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Discount Rules
CREATE TABLE discount_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    min_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_discount DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_service_categories_is_active ON service_categories(is_active);
CREATE INDEX idx_service_catalogs_category_id ON service_catalogs(category_id);
CREATE INDEX idx_service_catalogs_code ON service_catalogs(code);
CREATE INDEX idx_service_catalogs_is_active ON service_catalogs(is_active);
CREATE INDEX idx_bills_admission_id ON bills(admission_id);
CREATE INDEX idx_bills_service_type ON bills(service_type);
CREATE INDEX idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX idx_bill_items_service_id ON bill_items(service_id);
CREATE INDEX idx_refunds_bill_id ON refunds(bill_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_discount_rules_is_active ON discount_rules(is_active);
```

---

## Appendix B: Seed Data

### Service Categories & Services

```go
var ServiceCategorySeeds = []ServiceCategorySeed{
    {
        Name: "Consultation",
        Services: []ServiceSeed{
            {Name: "OPD Consultation", Code: "CONS-OPD", Rate: 500, Unit: "PIECE"},
            {Name: "Follow-up Consultation", Code: "CONS-FUP", Rate: 300, Unit: "PIECE"},
            {Name: "Emergency Consultation", Code: "CONS-EMR", Rate: 1000, Unit: "PIECE"},
        },
    },
    {
        Name: "Investigations",
        Services: []ServiceSeed{
            {Name: "Blood Test - CBC", Code: "INV-CBC", Rate: 350, Unit: "PIECE"},
            {Name: "Urine Analysis", Code: "INV-UA", Rate: 200, Unit: "PIECE"},
            {Name: "X-Ray", Code: "INV-XR", Rate: 500, Unit: "PIECE"},
            {Name: "Ultrasound", Code: "INV-USG", Rate: 800, Unit: "PIECE"},
            {Name: "ECG", Code: "INV-ECG", Rate: 300, Unit: "PIECE"},
        },
    },
    {
        Name: "Procedures",
        Services: []ServiceSeed{
            {Name: "Minor Surgery", Code: "PROC-MS", Rate: 3000, Unit: "PIECE"},
            {Name: "Wound Dressing", Code: "PROC-WD", Rate: 200, Unit: "PIECE"},
            {Name: "Injection", Code: "PROC-INJ", Rate: 50, Unit: "PIECE"},
            {Name: "IV Infusion", Code: "PROC-IV", Rate: 300, Unit: "PIECE"},
        },
    },
    {
        Name: "Room Charges",
        Services: []ServiceSeed{
            {Name: "General Ward / day", Code: "RM-GEN", Rate: 500, Unit: "DAY"},
            {Name: "Semi-Private / day", Code: "RM-SPV", Rate: 1000, Unit: "DAY"},
            {Name: "Private / day", Code: "RM-PRV", Rate: 2000, Unit: "DAY"},
            {Name: "Suite / day", Code: "RM-SUI", Rate: 5000, Unit: "DAY"},
            {Name: "ICU / day", Code: "RM-ICU", Rate: 5000, Unit: "DAY"},
        },
    },
    {
        Name: "Panchakarma",
        Services: []ServiceSeed{
            {Name: "Abhyanga (60 min)", Code: "PK-ABH", Rate: 1500, Unit: "SESSION"},
            {Name: "Shirodhara (45 min)", Code: "PK-SHI", Rate: 2000, Unit: "SESSION"},
            {Name: "Basti (30 min)", Code: "PK-BAS", Rate: 1200, Unit: "SESSION"},
            {Name: "Nasya (20 min)", Code: "PK-NAS", Rate: 800, Unit: "SESSION"},
            {Name: "Virechana (30 min)", Code: "PK-VIR", Rate: 1000, Unit: "SESSION"},
            {Name: "Raktamokshana (30 min)", Code: "PK-RAK", Rate: 1500, Unit: "SESSION"},
        },
    },
}
```

---

*Volume 7 — Billing Module | Last Updated: 2026-08-05*
