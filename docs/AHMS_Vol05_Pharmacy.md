# AHMS Volume 5 — Pharmacy Module

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

The Pharmacy module manages the complete lifecycle of Ayurvedic medicines and consumable materials: **procurement → inventory storage → prescription dispensing → stock reconciliation → expiry management**. It serves as the central inventory hub for all clinical departments (OPD, IPD, Panchakarma).

### 1.2 Current Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Medicine model | ✅ Implemented | `internal/models/pharmacy.go` |
| InventoryTransaction model | ✅ Implemented | `internal/models/pharmacy.go` |
| Medicine CRUD (6 API endpoints) | ✅ Implemented | `internal/pharmacy/` |
| Stock adjustment | ✅ Implemented | `POST /medicines/:id/stock` |
| Prescription dispensing | ✅ Implemented | `POST /prescriptions/:id/dispense` |
| Pharmacy page (frontend) | ✅ Implemented | `src/pages/admin/Pharmacy.tsx` |
| Supplier management | ❌ Missing | New |
| Purchase orders | ❌ Missing | New |
| Batch tracking (multi-batch per medicine) | ❌ Missing | New |
| Expiry alerts & auto-disable | ❌ Missing | New |
| Medicine categories (Ayurvedic/Allopathic/Surgical) | ❌ Missing | New |
| Panchakarma material integration | ❌ Missing | New |
| Dispensing history view | ❌ Missing | New |
| Stock reports | ❌ Missing | New |
| Low-stock dashboard widget | ❌ Missing | New |
| Reorder management | ❌ Missing | New |

### 1.3 Scope Boundaries

| In Scope | Out of Scope |
|----------|-------------|
| Medicine master (CRUD, categorization) | Prescription creation (Vol 3) |
| Inventory management (stock, batches, expiry) | Billing/pricing (Vol 7) |
| Supplier management & purchase orders | Patient portal views (Vol 9) |
| Prescription dispensing workflow | Manufacturing/compounding |
| Stock reports & analytics | Controlled substance tracking |
| Low-stock & expiry alerts | Multi-location pharmacy |
| Panchakarma material requests | E-prescription integration |
| Material usage tracking | Insurance/TPA claims |

### 1.4 Architecture Position

```
┌─────────────────────────────────────────────────────────┐
│                    AHMS System                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Patient  │  │ Consult  │  │     PHARMACY         │  │
│  │ Registry │→ │ (Vol 3)  │→ │                      │  │
│  │ (Vol 2)  │  │          │  │  ┌────────────────┐  │  │
│  └──────────┘  └──────────┘  │  │ Medicine Master│  │  │
│       ↓                       │  └───────┬────────┘  │  │
│  ┌──────────┐                 │          ↓            │  │
│  │Encounter │→ Prescriptions │  ┌────────────────┐  │  │
│  │(Vol 3)   │                │  │   Dispensing   │  │  │
│  └──────────┘                │  └───────┬────────┘  │  │
│                              │          ↓            │  │
│  ┌──────────┐                │  ┌────────────────┐  │  │
│  │Panchakar.│→ Material Req │  │   Inventory    │  │  │
│  │(Vol 4)   │                │  │  (Stock/Batch) │  │  │
│  └──────────┘                │  └───────┬────────┘  │  │
│                              │          ↓            │  │
│  ┌──────────┐                │  ┌────────────────┐  │  │
│  │ Billing  │← Cost Data    │  │   Purchase     │  │  │
│  │ (Vol 7)  │                │  │   Orders       │  │  │
│  └──────────┘                │  └────────────────┘  │  │
│                              └──────────────────────┘  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Dashboard│  │ Reports  │  │     Audit Log        │  │
│  │ (Vol 8)  │  │ (Vol 8)  │  │                      │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Medicine** | A pharmaceutical product (herbal formulation, mineral preparation, or compound) stocked in the pharmacy |
| **Formulation** | Physical form: tablet, powder (churna), liquid (kvath), oil (taila), ghee, paste (lepa), capsule |
| **Batch** | A specific procurement lot of a medicine with unique batch number and expiry date |
| **SKU** | Stock Keeping Unit — unique combination of medicine + batch number |
| **Inventory Transaction** | Any stock movement: purchase, dispensing, return, adjustment, expiry write-off |
| **Dispensing** | Supplying medicines against a validated prescription |
| **Low Stock** | Medicine quantity below the configured threshold |
| **Near Expiry** | Medicine expiring within 3 months (configurable) |
| **Expired** | Medicine past its expiry date — must not be dispensed |
| **Supplier** | Vendor or manufacturer providing medicines to the hospital |
| **Purchase Order (PO)** | Formal procurement request to a supplier |
| **Material Request** | Internal request from Panchakarma/other departments for supplies |
| **Stock Reconciliation** | Process of verifying physical stock against system records |

---

## 3. Data Models & Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│    Supplier      │       │ MedicineCategory │
│──────────────────│       │──────────────────│
│ id (PK, UUID)    │       │ id (PK, UUID)    │
│ name             │       │ name             │
│ contact_person   │       │ description      │
│ phone            │       │ parent_id (FK)   │
│ email            │       │ is_active        │
│ address          │       └────────┬─────────┘
│ gst_number       │                │
│ is_active        │                │ 1
└────────┬─────────┘                │
         │                          │ *
         │ 1                    ┌───┴──────────┐
         │                      │   Medicine   │
         │ *                    │──────────────│
┌────────┴─────────┐            │ id (PK, UUID)│
│  PurchaseOrder   │            │ name         │
│──────────────────│            │ category_id  │
│ id (PK, UUID)    │            │ formulation  │
│ supplier_id (FK) │            │ unit         │
│ po_number        │←───────────│ batch_number │
│ order_date       │            │ expiry_date  │
│ expected_date    │            │ stock_qty    │
│ status           │            │ low_threshold│
│ total_amount     │            │ cost_price   │
│ notes            │            │ selling_price│
│ created_by (FK)  │            │ hsn_code     │
│ created_at       │            │ is_active    │
└────────┬─────────┘            └──────┬───────┘
         │                              │
         │ 1                            │ 1
         │                              │
         │ *                            │ *
┌────────┴─────────┐            ┌──────┴───────┐
│  POItem          │            │  InventoryTxn │
│──────────────────│            │──────────────│
│ id (PK, UUID)    │            │ id (PK, UUID)│
│ po_id (FK)       │            │ medicine_id  │
│ medicine_id (FK) │            │ type         │
│ quantity_ordered │            │ quantity     │
│ quantity_received│            │ balance_after│
│ unit_price       │            │ batch_number │
│ total_price      │            │ reference_id │
│ batch_number     │            │ notes        │
│ expiry_date      │            │ created_by   │
│ notes            │            │ created_at   │
└──────────────────┘            └──────────────┘
```

### 3.2 Model Definitions

#### Enhanced Medicine Model

```go
// internal/models/pharmacy.go — ENHANCED

type MedicineCategory struct {
    BaseModel
    Name        string  `gorm:"size:100;not null;uniqueIndex" json:"name"`
    Description string  `gorm:"type:text" json:"description"`
    ParentID    *uuid.UUID `gorm:"type:uuid;index" json:"parent_id"`
    Parent      *MedicineCategory `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
    Children    []MedicineCategory `gorm:"foreignKey:ParentID" json:"children,omitempty"`
    IsActive    bool    `gorm:"not null;default:true" json:"is_active"`
    SortOrder   int     `gorm:"not null;default:0" json:"sort_order"`
}

func (MedicineCategory) TableName() string { return "medicine_categories" }

type Medicine struct {
    BaseModel
    Name              string         `gorm:"type:varchar(200);not null;uniqueIndex" json:"name"`
    CategoryID        *uuid.UUID     `gorm:"type:uuid;index" json:"category_id"`
    Category          *MedicineCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
    Formulation       string         `gorm:"type:varchar(100)" json:"formulation"`
    Unit              string         `gorm:"type:varchar(20);not null" json:"unit"`
    BatchNumber       string         `gorm:"type:varchar(100)" json:"batch_number"`
    ExpiryDate        *time.Time     `json:"expiry_date"`
    StockQty          float64        `gorm:"not null;default:0" json:"stock_qty"`
    LowStockThreshold float64        `gorm:"not null;default:10" json:"low_stock_threshold"`
    CostPrice         float64        `gorm:"not null;default:0" json:"cost_price"`
    SellingPrice      float64        `gorm:"not null;default:0" json:"selling_price"`
    HSNCode           string         `gorm:"type:varchar(20)" json:"hsn_code"`
    Description       string         `gorm:"type:text" json:"description"`
    IsActive          bool           `gorm:"not null;default:true" json:"is_active"`

    // Relations
    InventoryTransactions []InventoryTransaction `gorm:"foreignKey:MedicineID" json:"-"`
}

func (Medicine) TableName() string { return "medicines" }

// Computed fields
func (m *Medicine) IsLowStock() bool    { return m.StockQty <= m.LowStockThreshold }
func (m *Medicine) IsExpired() bool     { return m.ExpiryDate != nil && m.ExpiryDate.Before(time.Now()) }
func (m *Medicine) IsNearExpiry() bool  {
    if m.ExpiryDate == nil { return false }
    threeMonths := time.Now().AddDate(0, 3, 0)
    return m.ExpiryDate.After(time.Now()) && m.ExpiryDate.Before(threeMonths)
}
```

#### Supplier Model

```go
type Supplier struct {
    BaseModel
    Name           string  `gorm:"type:varchar(200);not null;uniqueIndex" json:"name"`
    ContactPerson  string  `gorm:"type:varchar(100)" json:"contact_person"`
    Phone          string  `gorm:"type:varchar(20)" json:"phone"`
    Email          string  `gorm:"type:varchar(200)" json:"email"`
    Address        string  `gorm:"type:text" json:"address"`
    GSTNumber      string  `gorm:"type:varchar(20)" json:"gst_number"`
    LicenseNumber  string  `gorm:"type:varchar(50)" json:"license_number"`
    PaymentTerms   string  `gorm:"type:varchar(100)" json:"payment_terms"` // NET30, NET60, ADVANCE
    IsActive       bool    `gorm:"not null;default:true" json:"is_active"`
    Notes          string  `gorm:"type:text" json:"notes"`

    // Relations
    PurchaseOrders []PurchaseOrder `gorm:"foreignKey:SupplierID" json:"-"`
}

func (Supplier) TableName() string { return "suppliers" }
```

#### Purchase Order Model

```go
type PurchaseOrder struct {
    BaseModel
    SupplierID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"supplier_id"`
    Supplier      Supplier   `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
    PONumber      string     `gorm:"type:varchar(50);uniqueIndex;not null" json:"po_number"`
    OrderDate     time.Time  `gorm:"type:date;not null" json:"order_date"`
    ExpectedDate  *time.Time `gorm:"type:date" json:"expected_date"`
    ReceivedDate  *time.Time `gorm:"type:date" json:"received_date"`
    Status        string     `gorm:"type:varchar(20);not null;default:DRAFT" json:"status"` // DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    TotalAmount   float64    `gorm:"not null;default:0" json:"total_amount"`
    Discount      float64    `gorm:"not null;default:0" json:"discount"`
    Tax           float64    `gorm:"not null;default:0" json:"tax"`
    GrandTotal    float64    `gorm:"not null;default:0" json:"grand_total"`
    Notes         string     `gorm:"type:text" json:"notes"`
    CreatedBy     uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`
    CreatedByUser User       `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`

    // Relations
    Items []POItem `gorm:"foreignKey:POID" json:"items,omitempty"`
}

func (PurchaseOrder) TableName() string { return "purchase_orders" }

type POItem struct {
    BaseModel
    POID              uuid.UUID  `gorm:"type:uuid;not null;index" json:"po_id"`
    MedicineID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"medicine_id"`
    Medicine          Medicine   `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
    QuantityOrdered   float64    `gorm:"not null" json:"quantity_ordered"`
    QuantityReceived  float64    `gorm:"not null;default:0" json:"quantity_received"`
    UnitPrice         float64    `gorm:"not null" json:"unit_price"`
    TotalPrice        float64    `gorm:"not null" json:"total_price"`
    BatchNumber       string     `gorm:"type:varchar(100)" json:"batch_number"`
    ExpiryDate        *time.Time `json:"expiry_date"`
    Notes             string     `gorm:"type:text" json:"notes"`
}

func (POItem) TableName() string { return "po_items" }
```

#### Material Request Model (Panchakarma Integration)

```go
type MaterialRequest struct {
    BaseModel
    RequesterID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"requester_id"`
    Requester      User       `gorm:"foreignKey:RequesterID" json:"requester,omitempty"`
    Department     string     `gorm:"type:varchar(50);not null" json:"department"` // PANCHAKARMA, IPD, OPD
    Status         string     `gorm:"type:varchar(20);not null;default:PENDING" json:"status"` // PENDING, APPROVED, DISPENSED, REJECTED
    Urgency        string     `gorm:"type:varchar(20);not null;default:NORMAL" json:"urgency"` // NORMAL, URGENT, EMERGENCY
    Notes          string     `gorm:"type:text" json:"notes"`
    ApprovedBy     *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
    ApprovedAt     *time.Time `json:"approved_at"`
    DispensedBy    *uuid.UUID `gorm:"type:uuid" json:"dispensed_by"`
    DispensedAt    *time.Time `json:"dispensed_at"`

    // Relations
    Items []MaterialRequestItem `gorm:"foreignKey:RequestID" json:"items,omitempty"`
}

func (MaterialRequest) TableName() string { return "material_requests" }

type MaterialRequestItem struct {
    BaseModel
    RequestID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"request_id"`
    MedicineID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"medicine_id"`
    Medicine     Medicine   `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
    Quantity     float64    `gorm:"not null" json:"quantity"`
    Unit         string     `gorm:"type:varchar(20);not null" json:"unit"`
    Notes        string     `gorm:"type:text" json:"notes"`
}

func (MaterialRequestItem) TableName() string { return "material_request_items" }
```

### 3.3 Database Indexes

```sql
-- Medicine categories
CREATE INDEX idx_medicine_categories_parent_id ON medicine_categories(parent_id);

-- Medicine (existing + new)
CREATE INDEX idx_medicines_category_id ON medicines(category_id);
CREATE INDEX idx_medicines_formulation ON medicines(formulation);
CREATE INDEX idx_medicines_is_active ON medicines(is_active);
CREATE INDEX idx_medicines_expiry_date ON medicines(expiry_date);
CREATE INDEX idx_medicines_stock_qty ON medicines(stock_qty);

-- Suppliers
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- Purchase Orders
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);

-- PO Items
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_po_items_medicine_id ON po_items(medicine_id);

-- Material Requests
CREATE INDEX idx_material_requests_requester_id ON material_requests(requester_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_department ON material_requests(department);
CREATE INDEX idx_material_request_items_request_id ON material_request_items(request_id);
CREATE INDEX idx_material_request_items_medicine_id ON material_request_items(medicine_id);
```

---

## 4. API Endpoints

All endpoints prefixed with `/api/v1`. Authentication required via Bearer token.

### 4.1 Medicine Management (Enhanced — Existing)

| Method | Endpoint | Description | Auth | Status |
|--------|----------|-------------|------|--------|
| `GET` | `/medicines` | List medicines (search, filter by category, stock, expiry) | PHARMACIST, ADMIN | ✅ Exists |
| `GET` | `/medicines/:id` | Get medicine details | PHARMACIST, ADMIN | ✅ Exists |
| `POST` | `/medicines` | Create medicine | PHARMACIST, ADMIN | ✅ Exists |
| `PUT` | `/medicines/:id` | Update medicine | PHARMACIST, ADMIN | ✅ Exists |
| `DELETE` | `/medicines/:id` | Soft-delete medicine | ADMIN | ❌ New |
| `POST` | `/medicines/:id/stock` | Adjust stock (+/-) | PHARMACIST, ADMIN | ✅ Exists |

**Enhanced GET /medicines query parameters:**
- `search` — Fuzzy search on name, formulation, batch_number
- `category_id` — Filter by medicine category
- `low_stock` — true/false (existing)
- `near_expiry` — true/false (existing)
- `expired` — true/false (existing)
- `is_active` — true/false
- `sort_by` — name, stock_qty, expiry_date, created_at
- `sort_order` — asc, desc

**Enhanced Medicine Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Ashwagandha Churna",
      "category": { "id": "uuid", "name": "Herbal Powders" },
      "formulation": "Churna (Powder)",
      "unit": "GRAM",
      "batch_number": "ASH-2026-001",
      "expiry_date": "2028-06-30",
      "stock_qty": 500,
      "low_stock_threshold": 100,
      "cost_price": 2.50,
      "selling_price": 4.00,
      "hsn_code": "1211",
      "description": "Withania somnifera root powder",
      "is_active": true,
      "low_stock": false,
      "is_expired": false,
      "near_expiry": false,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### 4.2 Medicine Categories (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/pharmacy/categories` | List all medicine categories | PHARMACIST, ADMIN |
| `POST` | `/pharmacy/categories` | Create category | ADMIN |
| `PUT` | `/pharmacy/categories/:id` | Update category | ADMIN |
| `DELETE` | `/pharmacy/categories/:id` | Soft-delete category (set is_active=false) | ADMIN |

**Seed Categories:**
```
├── Herbal Preparations
│   ├── Herbal Powders (Churna)
│   ├── Herbal Tablets (Vati)
│   ├── Herbal Capsules
│   ├── Herbal Liquids (Kwath/Asava)
│   └── Herbal Oils (Taila)
├── Mineral Preparations
│   ├── Bhasma
│   ├── Rasa Aushadhi
│   └── Guggulu Preparations
├── Panchakarma Supplies
│   ├── Massage Oils
│   ├── Decoctions (Kwath)
│   ├── Medicated Ghee
│   └── Basti Materials
├── Surgical Supplies
│   ├── Dressing Materials
│   ├── Instruments
│   └── Consumables
└── General Medicine
    ├── Allopathic Tablets
    ├── Allopathic Syrups
    └── Allopathic Injections
```

### 4.3 Supplier Management (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/pharmacy/suppliers` | List suppliers (search, filter active) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/suppliers/:id` | Get supplier with PO history | ADMIN |
| `POST` | `/pharmacy/suppliers` | Create supplier | ADMIN |
| `PUT` | `/pharmacy/suppliers/:id` | Update supplier | ADMIN |
| `DELETE` | `/pharmacy/suppliers/:id` | Soft-delete supplier | ADMIN |

**Supplier Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Kerala Ayurveda Ltd",
      "contact_person": "Rajesh Menon",
      "phone": "+91-9876543210",
      "email": "rajesh@keralaayurveda.com",
      "address": "123 MG Road, Kochi, Kerala 682011",
      "gst_number": "32AABCK1234F1Z5",
      "license_number": "KL-AYU-2024-001",
      "payment_terms": "NET30",
      "is_active": true,
      "total_orders": 24,
      "total_value": 156000.00
    }
  ]
}
```

### 4.4 Purchase Orders (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/pharmacy/purchase-orders` | List POs (status, date range, supplier filters) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/purchase-orders/:id` | Get PO detail with items | PHARMACIST, ADMIN |
| `POST` | `/pharmacy/purchase-orders` | Create PO | PHARMACIST, ADMIN |
| `PUT` | `/pharmacy/purchase-orders/:id` | Update PO (DRAFT only) | PHARMACIST, ADMIN |
| `PATCH` | `/pharmacy/purchase-orders/:id/status` | Send, Receive, Cancel PO | PHARMACIST, ADMIN |
| `POST` | `/pharmacy/purchase-orders/:id/receive` | Receive items (partial or full) | PHARMACIST, ADMIN |

**Create PO Request:**
```json
{
  "supplier_id": "uuid",
  "order_date": "2026-08-05",
  "expected_date": "2026-08-15",
  "notes": "Monthly stock replenishment",
  "items": [
    {
      "medicine_id": "uuid",
      "quantity_ordered": 1000,
      "unit_price": 2.50,
      "batch_number": "ASH-2026-B002",
      "expiry_date": "2028-12-31"
    },
    {
      "medicine_id": "uuid",
      "quantity_ordered": 500,
      "unit_price": 8.00,
      "batch_number": "BRA-2026-B001",
      "expiry_date": "2028-06-30"
    }
  ]
}
```

**Receive PO Request:**
```json
{
  "items": [
    {
      "po_item_id": "uuid",
      "quantity_received": 1000,
      "batch_number": "ASH-2026-B002",
      "expiry_date": "2028-12-31"
    },
    {
      "po_item_id": "uuid",
      "quantity_received": 450,
      "batch_number": "BRA-2026-B001",
      "expiry_date": "2028-06-30",
      "notes": "50 units damaged in transit"
    }
  ]
}
```

**PO Status Machine:**
```
DRAFT ──→ SENT ──→ PARTIALLY_RECEIVED ──→ RECEIVED
  │           │                              ↑
  │           └──→ CANCELLED                 │
  │                                          │
  └──→ CANCELLED                             │
                                             │
                           (auto-complete when all items received)
```

### 4.5 Prescription Dispensing (Existing — Enhanced)

| Method | Endpoint | Description | Auth | Status |
|--------|----------|-------------|------|--------|
| `POST` | `/prescriptions/:id/dispense` | Dispense medicines against prescription | PHARMACIST | ✅ Exists |
| `GET` | `/prescriptions/:id/dispense/history` | Get dispensing history for a prescription | PHARMACIST, ADMIN | ❌ New |
| `GET` | `/pharmacy/dispensing` | List all dispensing records (date range, medicine filters) | PHARMACIST, ADMIN | ❌ New |

**Enhanced Dispense Request:**
```json
{
  "items": [
    {
      "prescription_item_id": "uuid",
      "medicine_id": "uuid",
      "quantity": 30,
      "batch_number": "ASH-2026-B001"
    }
  ],
  "notes": "Dispensed 30 tablets, 10-day supply"
}
```

### 4.6 Material Requests (New — Panchakarma Integration)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/pharmacy/material-requests` | List material requests (status, dept filters) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/material-requests/:id` | Get request detail with items | PHARMACIST, ADMIN |
| `POST` | `/pharmacy/material-requests` | Create material request | THERAPIST, NURSE, DOCTOR |
| `PATCH` | `/pharmacy/material-requests/:id/approve` | Approve request | PHARMACIST, ADMIN |
| `PATCH` | `/pharmacy/material-requests/:id/dispense` | Dispense approved request | PHARMACIST |
| `PATCH` | `/pharmacy/material-requests/:id/reject` | Reject request | PHARMACIST, ADMIN |

**Material Request Status Machine:**
```
PENDING ──→ APPROVED ──→ DISPENSED
   │
   └──→ REJECTED
```

### 4.7 Reports & Dashboard (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/pharmacy/dashboard` | Pharmacy KPIs (stock value, low stock count, expiring items) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/reports/stock` | Current stock report (all medicines) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/reports/dispensing` | Dispensing report (date range, medicine) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/reports/expiry` | Expiry report (expired + near expiry) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/reports/purchase` | Purchase report (date range, supplier) | PHARMACIST, ADMIN |
| `GET` | `/pharmacy/reports/valuation` | Stock valuation report | ADMIN |

**Pharmacy Dashboard Response:**
```json
{
  "data": {
    "total_medicines": 245,
    "total_stock_value": 345600.00,
    "low_stock_count": 12,
    "near_expiry_count": 8,
    "expired_count": 3,
    "pending_requests": 5,
    "pending_pos": 3,
    "today_dispensed": 67,
    "today_dispensed_value": 4520.00,
    "top_dispensed": [
      { "name": "Ashwagandha Churna", "quantity": 120, "value": 480.00 },
      { "name": "Brahmi Vati", "quantity": 90, "value": 720.00 }
    ],
    "low_stock_items": [
      { "name": "Shatavari Churna", "stock_qty": 15, "threshold": 50, "unit": "GRAM" }
    ],
    "expiring_soon": [
      { "name": "Triphala Churna", "expiry_date": "2026-10-15", "stock_qty": 200 }
    ]
  }
}
```

---

## 5. Frontend Pages & Components

### 5.1 Admin Navigation Updates

**Modified sidebar** in `AdminLayout.tsx`:

```
PHARMACY (collapsible)
├── Dashboard         /admin/pharmacy/dashboard
├── Medicines         /admin/pharmacy/medicines
├── Categories        /admin/pharmacy/categories
├── Suppliers         /admin/pharmacy/suppliers
├── Purchase Orders   /admin/pharmacy/purchase-orders
├── Dispensing        /admin/pharmacy/dispensing
├── Material Requests /admin/pharmacy/material-requests
└── Reports           /admin/pharmacy/reports
```

**Sidebar icon:** `Pill` (existing) — remains unchanged.

### 5.2 Page Inventory

| Page | Route | Primary Role | Description |
|------|-------|-------------|-------------|
| PharmacyDashboard | `/admin/pharmacy/dashboard` | Pharmacist, Admin | KPIs, alerts, quick actions |
| MedicineList | `/admin/pharmacy/medicines` | Pharmacist, Admin | **Enhanced** existing page |
| MedicineDetail | `/admin/pharmacy/medicines/:id` | Pharmacist, Admin | Full medicine detail + history |
| CategoryList | `/admin/pharmacy/categories` | Admin | Category tree management |
| SupplierList | `/admin/pharmacy/suppliers` | Admin | Supplier directory |
| SupplierDetail | `/admin/pharmacy/suppliers/:id` | Admin | Supplier profile + PO history |
| PurchaseOrderList | `/admin/pharmacy/purchase-orders` | Pharmacist, Admin | PO list with status filters |
| PurchaseOrderCreate | `/admin/pharmacy/purchase-orders/new` | Pharmacist | Create new PO |
| PurchaseOrderDetail | `/admin/pharmacy/purchase-orders/:id` | Pharmacist, Admin | PO detail + receive items |
| DispensingList | `/admin/pharmacy/dispensing` | Pharmacist | Dispensing history |
| MaterialRequestList | `/admin/pharmacy/material-requests` | Pharmacist, Admin | Material requests from departments |
| PharmacyReports | `/admin/pharmacy/reports` | Pharmacist, Admin | Stock, dispensing, expiry reports |

### 5.3 Page Specifications

#### 5.3.1 Pharmacy Dashboard

**Purpose:** Real-time overview of pharmacy operations.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Pharmacy Dashboard                          [Date: Today] │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Total   │  Stock   │ Low Stock│ Expiring │  Pending        │
│ Medicines│  Value   │  Items   │  (3 mo)  │  Requests       │
│   245    │ ₹3.45L   │   12     │    8     │    5            │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │  Low Stock Alert 🔴     │  │  Expiry Alert 🟡        │ │
│  │                         │  │                         │ │
│  │  Shatavari Churna   15g │  │  Triphala Churna  10/15│ │
│  │  Brahmi Vati        20t │  │  Dashamula Kwath  10/30│ │
│  │  Neem Capsule       25c │  │  Kumaryasava      11/15│ │
│  │  [View All →]           │  │  [View All →]          │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │  Today's Dispensing     │  │  Material Requests      │ │
│  │                         │  │                         │ │
│  │  Items dispensed: 67    │  │  ⏳ 3 Pending           │ │
│  │  Value: ₹4,520          │  │  ✅ 2 Approved          │ │
│  │  Prescriptions: 12      │  │  ❌ 1 Rejected          │ │
│  │  [View History →]       │  │  [View All →]           │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  Quick Actions:                                             │
│  [+ Add Medicine]  [New Purchase Order]  [View Reports]   │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Enhanced Medicine List (Existing Page Upgrades)

**Current page** (`Pharmacy.tsx`, 230 lines) — upgrades needed:

| Current Feature | Enhancement |
|----------------|-------------|
| Search by name | Add category filter dropdown |
| Filter tabs (All/Low/Near/Expired) | Add formulation filter, cost price display |
| Table: Name, Formulation, Batch, Expiry, Stock, Status | Add Category column, Cost Price, Selling Price |
| Actions: Adjust Stock | Add Edit, View History, Delete actions |
| Create form | Add Category selector, Cost/Selling Price fields, HSN code |

**New columns in the table:**

| Column | Description |
|--------|-------------|
| Category | Medicine category badge (color-coded) |
| Cost Price | ₹ per unit |
| Selling Price | ₹ per unit |
| Margin | Computed margin % |
| HSN Code | Tax classification |
| Last Updated | Timestamp |

#### 5.3.3 Medicine Detail Page (New)

**Purpose:** Complete medicine profile with transaction history.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Ashwagandha Churna                    [Edit]    │
│                                                             │
│  ┌─── Basic Info ───────────┐  ┌─── Stock Info ──────────┐│
│  │ Category: Herbal Powders │  │ Current Stock: 500 GRAM  ││
│  │ Formulation: Churna      │  │ Low Threshold: 100 GRAM  ││
│  │ Unit: GRAM               │  │ Status: ✅ Normal         ││
│  │ Batch: ASH-2026-B001     │  │ Cost: ₹2.50/unit         ││
│  │ Expiry: 2028-06-30       │  │ Selling: ₹4.00/unit      ││
│  │ HSN: 1211                │  │ Margin: 37.5%            ││
│  └──────────────────────────┘  └──────────────────────────┘│
│                                                             │
│  ┌─── Stock History ───────────────────────────────────────┐│
│  │ Date       │ Type     │ Qty   │ Balance │ Reference     ││
│  │ ───────────┼──────────┼───────┼─────────┼───────────── ││
│  │ 2026-08-05 │ DISPENSE │  -30  │   500   │ RX-2026-0045 ││
│  │ 2026-08-04 │ PURCHASE │ +200  │   530   │ PO-2026-012  ││
│  │ 2026-08-03 │ DISPENSE │  -20  │   330   │ RX-2026-0041 ││
│  │ 2026-08-01 │ ADJUST   │  +50  │   350   │ Stock count  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Dispensing History ──────────────────────────────────┐│
│  │ Date       │ Patient     │ Qty  │ Rx Number             ││
│  │ ───────────┼─────────────┼──────┼─────────────────────  ││
│  │ 2026-08-05 │ Priya S.    │ 30g  │ RX-2026-0045         ││
│  │ 2026-08-03 │ Rajesh K.   │ 20g  │ RX-2026-0041         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.4 Purchase Order Create/Edit

**Purpose:** Create formal procurement orders to suppliers.

**Form Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  New Purchase Order                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Supplier: [Kerala Ayurveda Ltd ▼]     PO Date: 2026-08-05 │
│  Expected: [2026-08-15]                Terms: NET30        │
│                                                             │
│  ┌─── Order Items ─────────────────────────────────────────┐│
│  │ # │ Medicine        │ Qty  │ Rate  │ Total   │ Batch    ││
│  │───┼─────────────────┼──────┼───────┼─────────┼─────────││
│  │ 1 │ Ashwagandha     │ 1000 │ ₹2.50 │ ₹2,500  │ ASH-B02 ││
│  │ 2 │ Brahmi Vati     │  500 │ ₹8.00 │ ₹4,000  │ BRA-B01 ││
│  │ 3 │ [Add Item]      │      │       │         │         ││
│  ├───┴─────────────────┴──────┴───────┴─────────┴─────────┤│
│  │                          Subtotal:        ₹6,500.00    ││
│  │                          Discount:          ₹0.00      ││
│  │                          Tax (18%):       ₹1,170.00    ││
│  │                          ──────────────────────────     ││
│  │                          Grand Total:     ₹7,670.00    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Notes: [Monthly stock replenishment for Panchakarma dept] │
│                                                             │
│  [Save as Draft]  [Send to Supplier]                       │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.5 Purchase Order Detail + Receive

**Purpose:** View PO and record received items.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    PO-2026-0012          Status: SENT              │
│                                                             │
│  ┌─── PO Info ───────────────┐  ┌─── Supplier ───────────┐│
│  │ PO Number: PO-2026-0012   │  │ Kerala Ayurveda Ltd     ││
│  │ Order Date: Aug 5, 2026   │  │ Rajesh Menon            ││
│  │ Expected: Aug 15, 2026    │  │ +91-9876543210          ││
│  │ Total: ₹7,670.00          │  │ NET30                   ││
│  └──────────────────────────┘  └──────────────────────────┘│
│                                                             │
│  ┌─── Items ───────────────────────────────────────────────┐│
│  │ # │ Medicine        │Ordered│Received│Pending│ Status   ││
│  │───┼─────────────────┼───────┼────────┼───────┼─────────││
│  │ 1 │ Ashwagandha     │ 1000  │    0   │ 1000  │ ⏳      ││
│  │ 2 │ Brahmi Vati     │  500  │    0   │  500  │ ⏳      ││
│  ├───┴─────────────────┴───────┴────────┴───────┴─────────┤│
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Receive Items ───────────────────────────────────────┐│
│  │ Item 1: Ashwagandha                                     ││
│  │   Received: [1000] Batch: [ASH-2026-B002]              ││
│  │   Expiry: [2028-12-31]                                  ││
│  │                                                         ││
│  │ Item 2: Brahmi Vati                                     ││
│  │   Received: [450] Batch: [BRA-2026-B001]               ││
│  │   Expiry: [2028-06-30]                                  ││
│  │   Notes: [50 units damaged in transit]                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Mark as Received]  [Partial Receive]  [Cancel PO]        │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.6 Material Request Page

**Purpose:** View and process material requests from Panchakarma and other departments.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Material Requests                     [New Request]       │
├──────────┬──────────┬──────────┬───────────────────────────┤
│  Pending │ Approved │ Dispensed│  Rejected                  │
│    5     │    3     │    12    │    1                       │
├──────────┴──────────┴──────────┴───────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Request #MR-2026-0023                    ⏳ PENDING  │   │
│  │ From: Kavitha R. (Panchakarma)          Urgency: 🔴 │   │
│  │ Date: Aug 5, 2026 2:30 PM              URGENT      │   │
│  │                                                     │   │
│  │ Items:                                              │   │
│  │   • Tila Taila — 500 ML (Stock: 2000 ML)          │   │
│  │   • Dashmool Kwath — 200 ML (Stock: 800 ML)       │   │
│  │   • Cotton bandages — 20 PIECE (Stock: 100)        │   │
│  │                                                     │   │
│  │ [Approve] [Reject]                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Request #MR-2026-0022                    ✅ APPROVED │   │
│  │ From: Ramesh P. (Panchakarma)          Urgency: 🟡  │   │
│  │ Date: Aug 4, 2026 10:00 AM            NORMAL       │   │
│  │                                                     │   │
│  │ Items:                                              │   │
│  │   • Sesame Oil — 300 ML (Stock: 1500 ML)           │   │
│  │   • [Dispense]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Reusable Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `MedicineCard` | Compact medicine info card | Dashboard, Search results |
| `StockBadge` | Color-coded stock level indicator | MedicineList, Dashboard |
| `ExpiryBadge` | Expiry status badge (OK/Near/Expired) | MedicineList, Reports |
| `POStatusBadge` | Purchase order status indicator | POList, PODetail |
| `RequestStatusBadge` | Material request status | MaterialRequestList |
| `QuantityInput` | Stepper input with unit label | Create forms |
| `BatchSelector` | Dropdown showing available batches | Dispensing, Receive forms |
| `PriceDisplay` | Formatted price with currency symbol | All financial displays |
| `TransactionTimeline` | Chronological stock movement view | MedicineDetail |

---

## 6. RBAC & Permissions Matrix

### 6.1 New Permissions

```go
// internal/models/permission.go additions

// Medicine Management
PermissionMedicineView    = "medicine.view"
PermissionMedicineCreate  = "medicine.create"
PermissionMedicineEdit    = "medicine.edit"
PermissionMedicineDelete  = "medicine.delete"
PermissionMedicineStockAdjust = "medicine.stock.adjust"

// Pharmacy Dispensing
PermissionPharmacyDispense = "pharmacy.dispense"  // EXISTS
PermissionPharmacyDispenseHistory = "pharmacy.dispense.history"

// Supplier Management
PermissionSupplierView    = "supplier.view"
PermissionSupplierCreate  = "supplier.create"
PermissionSupplierEdit    = "supplier.edit"
PermissionSupplierDelete  = "supplier.delete"

// Purchase Orders
PermissionPOView    = "purchase_order.view"
PermissionPOCreate  = "purchase_order.create"
PermissionPOEdit    = "purchase_order.edit"
PermissionPOReceive = "purchase_order.receive"
PermissionPOCancel  = "purchase_order.cancel"

// Material Requests
PermissionMaterialRequestView    = "material_request.view"
PermissionMaterialRequestCreate  = "material_request.create"
PermissionMaterialRequestApprove = "material_request.approve"
PermissionMaterialRequestDispense = "material_request.dispense"
PermissionMaterialRequestReject  = "material_request.reject"

// Pharmacy Reports
PermissionPharmacyReportView   = "pharmacy.report.view"
PermissionPharmacyReportExport = "pharmacy.report.export"
PermissionPharmacyDashboardView = "pharmacy.dashboard.view"
```

### 6.2 Permission-to-Role Mapping

| Permission | ADMIN | PHARMACIST | PK_DOCTOR | PK_THERAPIST | PK_NURSE | RECEPTIONIST |
|------------|:-----:|:----------:|:---------:|:------------:|:--------:|:------------:|
| medicine.view | ✓ | ✓ | — | — | — | — |
| medicine.create | ✓ | ✓ | — | — | — | — |
| medicine.edit | ✓ | ✓ | — | — | — | — |
| medicine.delete | ✓ | — | — | — | — | — |
| medicine.stock.adjust | ✓ | ✓ | — | — | — | — |
| pharmacy.dispense | ✓ | ✓ | — | — | — | — |
| pharmacy.dispense.history | ✓ | ✓ | — | — | — | — |
| supplier.view | ✓ | ✓ | — | — | — | — |
| supplier.create | ✓ | — | — | — | — | — |
| supplier.edit | ✓ | — | — | — | — | — |
| supplier.delete | ✓ | — | — | — | — | — |
| purchase_order.view | ✓ | ✓ | — | — | — | — |
| purchase_order.create | ✓ | ✓ | — | — | — | — |
| purchase_order.edit | ✓ | ✓ | — | — | — | — |
| purchase_order.receive | ✓ | ✓ | — | — | — | — |
| purchase_order.cancel | ✓ | ✓ | — | — | — | — |
| material_request.view | ✓ | ✓ | ✓(own) | ✓(own) | ✓(own) | — |
| material_request.create | ✓ | — | ✓ | ✓ | ✓ | — |
| material_request.approve | ✓ | ✓ | — | — | — | — |
| material_request.dispense | ✓ | ✓ | — | — | — | — |
| material_request.reject | ✓ | ✓ | — | — | — | — |
| pharmacy.report.view | ✓ | ✓ | — | — | — | — |
| pharmacy.report.export | ✓ | ✓ | — | — | — | — |
| pharmacy.dashboard.view | ✓ | ✓ | — | — | — | — |

---

## 7. Business Logic & Workflows

### 7.1 Stock Movement Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                   STOCK MOVEMENT                              │
│                                                               │
│  Stock increases:                                             │
│    ├── Purchase receipt (PO receiving)                        │
│    ├── Stock adjustment (+)                                   │
│    ├── Return from patient                                    │
│    └── Initial opening stock                                  │
│                                                               │
│  Stock decreases:                                             │
│    ├── Prescription dispensing                                │
│    ├── Material request fulfillment (Panchakarma)            │
│    ├── Stock adjustment (-)                                   │
│    ├── Expiry write-off                                       │
│    └── Damaged goods write-off                                │
│                                                               │
│  Every movement → InventoryTransaction record                 │
│  Atomic operations with row-level locking (FOR UPDATE)       │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Dispensing Workflow

```
Prescription Created (Vol 3)
        │
        ↓
┌─────────────────┐
│ Pharmacist views │
│ pending Rx       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐     ┌──────────────────┐
│ Verify patient  │────→│ Check medicine   │
│ identity        │     │ availability     │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │                  Available?
         │                  /        \
         │                Yes         No
         │                │           │
         ↓                ↓           ↓
┌─────────────────┐  ┌────────┐  ┌────────────┐
│ Select batch    │  │Dispense│  │ Notify     │
│ (FIFO: expiry)  │  │        │  │ shortage   │
└────────┬────────┘  └────────┘  └────────────┘
         │
         ↓
┌─────────────────┐
│ Confirm dispense│
│ Deduct stock    │
│ Log transaction │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Update Rx status│
│ DISPENSED /     │
│ PARTIALLY_      │
│ DISPENSED       │
└─────────────────┘
```

### 7.3 FIFO Dispensing Logic

When dispensing, the system automatically selects the batch with the **earliest expiry date** (First In, First Out):

```go
func (r *Repository) SelectBatchForDispensing(medicineID uuid.UUID, quantity float64) (*models.Medicine, error) {
    var medicine models.Medicine
    err := r.db.Where("id = ? AND stock_qty >= ? AND is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())",
        medicineID, quantity).
        Order("expiry_date ASC NULLS LAST").
        First(&medicine).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrInsufficientStock
        }
        return nil, err
    }
    return &medicine, nil
}
```

### 7.4 Purchase Order Receiving

Partial receiving supported — each PO item can be received independently:

```go
func (s *Service) ReceivePOItem(poID uuid.UUID, itemID uuid.UUID, quantity float64, batchNumber string, expiryDate *time.Time) error {
    // 1. Validate PO status is SENT or PARTIALLY_RECEIVED
    // 2. Validate quantity doesn't exceed remaining
    // 3. Update POItem.quantity_received
    // 4. Create/update Medicine record (upsert by batch_number)
    // 5. Create PURCHASE inventory transaction
    // 6. Check if all items received → auto-complete PO
    // 7. Trigger low-stock recalculation
}
```

### 7.5 Expiry Management

**Daily cron job** (runs at 06:00):

```go
func (s *Service) CheckExpiryAlerts() (*ExpiryAlert, error) {
    alert := &ExpiryAlert{}

    // Expired medicines
    s.db.Where("expiry_date <= NOW() AND is_active = true").
        Find(&alert.ExpiredMedicines)

    // Near expiry (3 months)
    threeMonths := time.Now().AddDate(0, 3, 0)
    s.db.Where("expiry_date > NOW() AND expiry_date <= ? AND is_active = true", threeMonths).
        Find(&alert.NearExpiryMedicines)

    // Auto-disable expired medicines
    s.db.Model(&models.Medicine{}).
        Where("expiry_date <= NOW() AND is_active = true").
        Update("is_active", false)

    return alert, nil
}
```

### 7.6 Low Stock Alerts

```go
func (s *Service) CheckLowStockAlerts() ([]LowStockItem, error) {
    var items []LowStockItem
    s.db.Raw(`
        SELECT name, stock_qty, low_stock_threshold, unit,
               ROUND((stock_qty / NULLIF(low_stock_threshold, 0)) * 100) as percentage
        FROM medicines
        WHERE stock_qty <= low_stock_threshold
          AND is_active = true
        ORDER BY (stock_qty / NULLIF(low_stock_threshold, 0)) ASC
    `).Scan(&items)
    return items, nil
}
```

### 7.7 Stock Reconciliation

Weekly reconciliation process:

1. Generate expected stock report from system
2. Pharmacist performs physical count
3. Discrepancies flagged for investigation
4. Adjustment transactions created with notes
5. Audit trail maintained

---

## 8. Integration Points

### 8.1 Prescription Dispensing (Vol 3)

| Direction | Integration |
|-----------|------------|
| Prescription → Pharmacy | Pharmacy reads prescription items, validates, dispenses |
| Pharmacy → Prescription | Updates prescription status (DISPENSED/PARTIALLY_DISPENSED) |
| Pharmacy → Encounter | Records dispensing encounter for audit |

### 8.2 Panchakarma Material Requests (Vol 4)

| Direction | Integration |
|-----------|------------|
| Panchakarma → Pharmacy | Material requests for herbs/oils |
| Pharmacy → Panchakarma | Approval/dispensing notifications |
| Pharmacy → Panchakarma Dashboard | Low-stock alerts for PK materials |

### 8.3 Billing (Vol 7)

| Direction | Integration |
|-----------|------------|
| Pharmacy → Billing | Medicine cost data for billing line items |
| Billing → Pharmacy | Dispensing triggers billing item creation |
| Pharmacy → Billing | Cost price for margin calculations |

### 8.4 Audit Trail (Vol 8)

| Event | Audit Action |
|-------|-------------|
| Medicine CRUD | `medicine.create`, `medicine.update`, `medicine.delete` |
| Stock adjustment | `inventory.adjust` |
| Dispensing | `pharmacy.dispense` |
| PO creation | `purchase_order.create` |
| PO receiving | `purchase_order.receive` |
| Material request | `material_request.approve`, `material_request.dispense` |

---

## 9. Design System & UI Components

### 9.1 Color Tokens

```typescript
export const pharmacyColors = {
  primary: '#0F766E',      // Teal
  secondary: '#C8A14D',    // Gold
  background: '#FAF8F2',   // Ivory

  // Stock status
  stockNormal: '#059669',   // Emerald
  stockLow: '#F59E0B',      // Amber
  stockCritical: '#DC2626', // Red
  stockOut: '#9333EA',      // Purple

  // Expiry status
  expiryOk: '#059669',      // Emerald
  expiryNear: '#F59E0B',    // Amber
  expiryExpired: '#DC2626', // Red

  // PO status
  poDraft: '#6B7280',       // Gray
  poSent: '#2563EB',        // Blue
  poPartial: '#F59E0B',     // Amber
  poReceived: '#059669',    // Emerald
  poCancelled: '#DC2626',   // Red

  // Material request status
  requestPending: '#F59E0B',  // Amber
  requestApproved: '#2563EB', // Blue
  requestDispensed: '#059669',// Emerald
  requestRejected: '#DC2626', // Red

  // Urgency
  urgencyNormal: '#059669',
  urgencyUrgent: '#F59E0B',
  urgencyEmergency: '#DC2626',
};
```

### 9.2 Component Specifications

#### StockBadge

```
Stock: 500 GRAM ✅ Normal
Stock: 15 GRAM  ⚠️ Low
Stock: 0 GRAM   🔴 Out of Stock
```

#### ExpiryBadge

```
Exp: 2028-06-30 ✅
Exp: 2026-10-15 ⚠️ Near Expiry
Exp: 2026-06-30 ❌ Expired
```

#### MedicineCard (Dashboard widget)

```
┌─────────────────────────────────┐
│ Ashwagandha Churna              │
│ Herbal Powders · GRAM           │
├─────────────────────────────────┤
│ Stock: 500 GRAM    [✅ Normal]  │
│ Exp: 2028-06-30    [✅ OK]      │
│ ₹4.00/unit                     │
└─────────────────────────────────┘
```

---

## 10. State Management & Data Flow

### 10.1 React Query Keys

```typescript
export const pharmacyKeys = {
  all: ['pharmacy'] as const,
  medicines: () => [...pharmacyKeys.all, 'medicines'] as const,
  medicine: (id: string) => [...pharmacyKeys.medicines(), id] as const,
  categories: () => [...pharmacyKeys.all, 'categories'] as const,
  suppliers: () => [...pharmacyKeys.all, 'suppliers'] as const,
  supplier: (id: string) => [...pharmacyKeys.suppliers(), id] as const,
  purchaseOrders: () => [...pharmacyKeys.all, 'purchaseOrders'] as const,
  purchaseOrder: (id: string) => [...pharmacyKeys.purchaseOrders(), id] as const,
  dispensing: () => [...pharmacyKeys.all, 'dispensing'] as const,
  materialRequests: () => [...pharmacyKeys.all, 'materialRequests'] as const,
  dashboard: () => [...pharmacyKeys.all, 'dashboard'] as const,
  reports: () => [...pharmacyKeys.all, 'reports'] as const,
};
```

### 10.2 API Service Layer

```typescript
// src/services/pharmacyApi.ts

import api from '../lib/api';

export const pharmacyApi = {
  // Medicines
  getMedicines: (params?: any) => api.get('/medicines', { params }),
  getMedicine: (id: string) => api.get(`/medicines/${id}`),
  createMedicine: (data: any) => api.post('/medicines', data),
  updateMedicine: (id: string, data: any) => api.put(`/medicines/${id}`, data),
  deleteMedicine: (id: string) => api.delete(`/medicines/${id}`),
  adjustStock: (id: string, data: any) => api.post(`/medicines/${id}/stock`, data),

  // Categories
  getCategories: () => api.get('/pharmacy/categories'),
  createCategory: (data: any) => api.post('/pharmacy/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/pharmacy/categories/${id}`, data),

  // Suppliers
  getSuppliers: (params?: any) => api.get('/pharmacy/suppliers', { params }),
  getSupplier: (id: string) => api.get(`/pharmacy/suppliers/${id}`),
  createSupplier: (data: any) => api.post('/pharmacy/suppliers', data),
  updateSupplier: (id: string, data: any) => api.put(`/pharmacy/suppliers/${id}`, data),

  // Purchase Orders
  getPurchaseOrders: (params?: any) => api.get('/pharmacy/purchase-orders', { params }),
  getPurchaseOrder: (id: string) => api.get(`/pharmacy/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => api.post('/pharmacy/purchase-orders', data),
  updatePurchaseOrder: (id: string, data: any) => api.put(`/pharmacy/purchase-orders/${id}`, data),
  updatePOStatus: (id: string, status: string) => api.patch(`/pharmacy/purchase-orders/${id}/status`, { status }),
  receivePO: (id: string, data: any) => api.post(`/pharmacy/purchase-orders/${id}/receive`, data),

  // Dispensing
  dispense: (prescriptionId: string, data: any) => api.post(`/prescriptions/${prescriptionId}/dispense`, data),
  getDispensingHistory: (params?: any) => api.get('/pharmacy/dispensing', { params }),

  // Material Requests
  getMaterialRequests: (params?: any) => api.get('/pharmacy/material-requests', { params }),
  getMaterialRequest: (id: string) => api.get(`/pharmacy/material-requests/${id}`),
  createMaterialRequest: (data: any) => api.post('/pharmacy/material-requests', data),
  approveRequest: (id: string) => api.patch(`/pharmacy/material-requests/${id}/approve`),
  dispenseRequest: (id: string, data?: any) => api.patch(`/pharmacy/material-requests/${id}/dispense`, data),
  rejectRequest: (id: string, reason?: string) => api.patch(`/pharmacy/material-requests/${id}/reject`, { reason }),

  // Dashboard & Reports
  getDashboard: () => api.get('/pharmacy/dashboard'),
  getStockReport: (params?: any) => api.get('/pharmacy/reports/stock', { params }),
  getDispensingReport: (params?: any) => api.get('/pharmacy/reports/dispensing', { params }),
  getExpiryReport: (params?: any) => api.get('/pharmacy/reports/expiry', { params }),
  getPurchaseReport: (params?: any) => api.get('/pharmacy/reports/purchase', { params }),
  getValuationReport: () => api.get('/pharmacy/reports/valuation'),
};
```

---

## 11. Error Handling & Edge Cases

### 11.1 Validation Rules

| Rule | Field | Error Code |
|------|-------|-----------|
| Medicine name required, 2-200 chars, unique | name | VALIDATION_ERROR |
| Unit required (GRAM, TABLET, ML, CAPSULE, PIECE) | unit | VALIDATION_ERROR |
| Stock quantity cannot be negative | stock_qty | VALIDATION_ERROR |
| Batch number required for dispensing | batch_number | VALIDATION_ERROR |
| Expiry date must be future for new medicines | expiry_date | VALIDATION_ERROR |
| PO supplier must exist and be active | supplier_id | INVALID_SUPPLIER |
| PO items cannot be empty | items | VALIDATION_ERROR |
| Receive quantity cannot exceed ordered quantity | quantity_received | VALIDATION_ERROR |
| Material request items cannot be empty | items | VALIDATION_ERROR |

### 11.2 Business Rule Violations

| Scenario | Response | HTTP Code |
|----------|----------|-----------|
| Dispense with insufficient stock | "Insufficient stock: available X, requested Y" | 409 Conflict |
| Dispense expired medicine | "Cannot dispense expired medicine" | 422 Unprocessable |
| Receive more than ordered | "Cannot receive more than ordered quantity" | 422 Unprocessable |
| Cancel PO with received items | "Cannot cancel: items already received" | 422 Unprocessable |
| Delete medicine with transactions | "Cannot delete: medicine has transaction history" | 409 Conflict |
| Create duplicate medicine name | "Medicine with this name already exists" | 409 Conflict |

### 11.3 Edge Cases

| Case | Handling |
|------|----------|
| Concurrent dispensing (race condition) | Row-level locking (FOR UPDATE) prevents double-spend |
| Batch number changed during receive | Accept new batch number, create new medicine record |
| Medicine with no expiry date | Allow — some Ayurvedic formulations don't expire |
| Zero-quantity stock adjustment | Reject with validation error |
| Dispense partial prescription | Mark as PARTIALLY_DISPENSED, allow re-dispense |
| Material request for out-of-stock item | Reject with "Insufficient stock" message |
| PO received after expected date | Allow, flag as "LATE" in reports |
| Medicine with same name, different batch | Current model supports single batch per medicine; extend to multi-batch in future |

---

## 12. Security Considerations

### 12.1 Access Controls

- Only PHARMACIST and ADMIN can dispense medicines
- Only ADMIN can manage suppliers and categories
- Stock adjustments require audit trail with user ID
- Material requests restricted to clinical roles

### 12.2 Audit Trail

Every stock movement logged with:
- User ID (who performed action)
- Timestamp
- Before/after stock quantities
- Reference (prescription ID, PO ID, request ID)

### 12.3 Data Integrity

- Row-level locking on stock operations (prevents double-dispense)
- Transaction wrapping for multi-step operations
- CHECK constraints: stock_qty >= 0, quantity > 0
- Soft deletes preserve historical data

### 12.4 Expired Medicine Safety

- Expired medicines auto-disabled daily
- Dispensing endpoint validates expiry before allowing
- Expired medicines flagged in red across all views
- Cannot create PO for expired medicines

---

## 13. Performance Optimization

### 13.1 Database Indexes

Critical query patterns:

```sql
-- Medicine search (most frequent)
CREATE INDEX idx_medicines_name_trgm ON medicines USING gin(name gin_trgm_ops);
CREATE INDEX idx_medicines_formulation_trgm ON medicines USING gin(formulation gin_trgm_ops);

-- Stock queries
CREATE INDEX idx_medicines_low_stock ON medicines(stock_qty, low_stock_threshold)
WHERE is_active = true;

-- Expiry queries
CREATE INDEX idx_medicines_expiry ON medicines(expiry_date)
WHERE is_active = true AND expiry_date IS NOT NULL;

-- PO queries
CREATE INDEX idx_po_supplier_status ON purchase_orders(supplier_id, status);
CREATE INDEX idx_po_order_date ON purchase_orders(order_date DESC);

-- Dispensing queries
CREATE INDEX idx_inventory_medicine_type ON inventory_transactions(medicine_id, type);
CREATE INDEX idx_inventory_reference ON inventory_transactions(reference_id);
```

### 13.2 Caching

| Data | Cache Duration | Invalidation |
|------|---------------|-------------|
| Medicine categories | 1 hour | On category CRUD |
| Supplier list | 5 minutes | On supplier CRUD |
| Dashboard stats | 2 minutes | On stock change |
| Low stock alerts | 5 minutes | On dispensing |

### 13.3 Query Optimization

```go
// Medicine list with category preload (avoid N+1)
func (r *Repository) FindAllMedicines(req MedicineListRequest) ([]models.Medicine, int64, error) {
    var medicines []models.Medicine
    var total int64

    query := r.db.Model(&models.Medicine{}).Preload("Category")

    if req.Search != "" {
        query = query.Where("name ILIKE ? OR formulation ILIKE ?",
            "%"+req.Search+"%", "%"+req.Search+"%")
    }
    if req.CategoryID != "" {
        query = query.Where("category_id = ?", req.CategoryID)
    }
    if req.LowStock {
        query = query.Where("stock_qty <= low_stock_threshold")
    }

    query.Count(&total)
    query.Order("name ASC").Offset((req.Page - 1) * req.PerPage).Limit(req.PerPage).Find(&medicines)

    return medicines, total, nil
}
```

---

## 14. Testing Strategy

### 14.1 Backend Unit Tests (Existing + New)

| Test File | Coverage |
|-----------|---------|
| `service_test.go` | ✅ Exists — 7 test cases |
| `service_test.go` (enhanced) | Add: PO receiving, material request workflow, expiry check |
| `repository_test.go` | Add: Batch selection, stock reconciliation queries |

### 14.2 Backend Integration Tests

| Test | Scenario |
|------|----------|
| Full dispensing flow | Prescription → Verify stock → Dispense → Check transaction |
| Concurrent dispensing | Two pharmacists dispense same medicine simultaneously → Only one succeeds |
| PO receive flow | Create PO → Receive items → Verify stock increase → Auto-complete PO |
| Material request flow | Request → Approve → Dispense → Verify stock deduction |
| Expiry automation | Set medicine expiry to past date → Run cron → Verify auto-disabled |
| Low stock alert | Dispense below threshold → Verify alert generated |

### 14.3 Frontend Component Tests

| Component | Test |
|-----------|------|
| `StockBadge` | Renders correct color for Normal/Low/Critical/Out |
| `ExpiryBadge` | Renders correct status for OK/Near/Expired |
| `MedicineCard` | Displays all fields correctly |
| `POStatusBadge` | Status color mapping |
| `QuantityInput` | Handles +/- correctly, respects min/max |

### 14.4 QA Test Cases

| # | Module | Test Case | Expected | Priority |
|---|--------|-----------|----------|----------|
| 1 | Medicine | Create medicine with all fields | Medicine created, appears in list | High |
| 2 | Medicine | Search by name | Filtered results displayed | High |
| 3 | Medicine | Adjust stock (+) | Stock increases, transaction logged | High |
| 4 | Medicine | Adjust stock (-) below zero | Error: insufficient stock | High |
| 5 | Dispensing | Dispense against prescription | Stock deducted, Rx status updated | High |
| 6 | Dispensing | Dispense with insufficient stock | Error: insufficient stock | High |
| 7 | PO | Create PO with items | PO created in DRAFT status | High |
| 8 | PO | Receive PO items | Stock increases, PO status updates | High |
| 9 | Material Request | Create and approve request | Status transitions correctly | Medium |
| 10 | Expiry | View expiry report | Near-expiry and expired items listed | Medium |
| 11 | Dashboard | View pharmacy KPIs | All metrics accurate | Medium |
| 12 | Category | Create nested category | Category tree displays correctly | Low |

---

## 15. Implementation Phases & Effort

### 15.1 Gap Analysis Summary

| Component | Current State | Gap | Priority | Effort |
|-----------|--------------|-----|----------|--------|
| Medicine model (enhanced) | ✅ Exists | Add category_id, cost/selling price, HSN, description | High | 1 day |
| MedicineCategory model | ❌ Not created | Model + CRUD API + UI + seed data | High | 3 days |
| Medicine CRUD (enhanced) | ✅ 6 endpoints exist | Add category filter, soft delete, enhanced search | High | 2 days |
| Supplier model | ❌ Not created | Model + CRUD API + UI | High | 3 days |
| Purchase Order model | ❌ Not created | Model + API + UI + workflow | High | 5 days |
| Material Request model | ❌ Not created | Model + API + UI + workflow | High | 4 days |
| Dispensing (enhanced) | ✅ Exists | Add batch selection, dispensing history view | Medium | 2 days |
| Pharmacy Dashboard | ❌ Not created | KPIs + alerts + quick actions | Medium | 3 days |
| Medicine Detail page | ❌ Not created | Full profile + transaction history | Medium | 2 days |
| Reports (5 reports) | ❌ Not created | Stock, dispensing, expiry, purchase, valuation | Medium | 5 days |
| Low-stock/expiry alerts | ❌ Not created | Cron job + dashboard alerts | Medium | 2 days |
| Frontend navigation | Partial | Expand sidebar section | Low | 0.5 day |
| **TOTAL** | | | | **~32.5 days (6.5 weeks)** |

### 15.2 Sprint Breakdown

#### Sprint 10.1 — Medicine Enhancement & Categories (Week 1) — 5 days

| Task | Days | Owner |
|------|------|-------|
| Enhance Medicine model (add fields) | 0.5 | Backend |
| MedicineCategory model + CRUD API | 1.5 | Backend |
| Category seed data | 0.5 | Backend |
| Enhanced Medicine list (category filter, soft delete) | 1.5 | Backend |
| Frontend: MedicineList upgrades | 1 | Frontend |

**Deliverables:** Enhanced medicine model, category CRUD, improved medicine list.

#### Sprint 10.2 — Suppliers & Purchase Orders (Week 2-3) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Supplier model + CRUD API | 2 | Backend |
| Purchase Order model + CRUD API | 3 | Backend |
| PO receiving workflow | 2 | Backend |
| Backend integration tests | 1 | Backend |
| Frontend: SupplierList + SupplierDetail | 2 | Frontend |

**Deliverables:** Supplier management, PO creation and receiving.

#### Sprint 10.3 — Material Requests & Dispensing (Week 4-5) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Material Request model + API | 2 | Backend |
| Request workflow (approve/dispense/reject) | 2 | Backend |
| Enhanced dispensing (batch selection, history) | 2 | Backend |
| Expiry/low-stock cron jobs | 1 | Backend |
| Frontend: MaterialRequestList | 1.5 | Frontend |
| Frontend: DispensingList | 1.5 | Frontend |

**Deliverables:** Material request workflow, enhanced dispensing, alert system.

#### Sprint 10.4 — Dashboard, Reports & Polish (Week 6) — 7.5 days

| Task | Days | Owner |
|------|------|-------|
| Pharmacy Dashboard API + UI | 2 | Full-stack |
| MedicineDetail page | 2 | Frontend |
| Reports (5 reports) | 3 | Full-stack |
| E2E testing & bug fixes | 0.5 | QA |

**Deliverables:** Dashboard, all reports, module ready for UAT.

### 15.3 Dependencies

| Dependency | Blocker? | Mitigation |
|------------|----------|-----------|
| Prescription module (Vol 3) | No (existing) | Dispensing endpoint already functional |
| Panchakarma module (Vol 4) | No | Material requests are additive |
| Billing module (Vol 7) | No | Cost data can be provided independently |
| Audit trail (existing) | No (existing) | Audit recorder already wired |

---

## Appendix A: Database Migration SQL

```sql
-- Medicine Categories
CREATE TABLE medicine_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES medicine_categories(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced Medicine Table (ALTER existing)
ALTER TABLE medicines ADD COLUMN category_id UUID REFERENCES medicine_categories(id);
ALTER TABLE medicines ADD COLUMN cost_price DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE medicines ADD COLUMN selling_price DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE medicines ADD COLUMN hsn_code VARCHAR(20);
ALTER TABLE medicines ADD COLUMN description TEXT;
ALTER TABLE medicines ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(200),
    address TEXT,
    gst_number VARCHAR(20),
    license_number VARCHAR(50),
    payment_terms VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    received_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount DOUBLE PRECISION NOT NULL DEFAULT 0,
    tax DOUBLE PRECISION NOT NULL DEFAULT 0,
    grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- PO Items
CREATE TABLE po_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id),
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    quantity_ordered DOUBLE PRECISION NOT NULL,
    quantity_received DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit_price DOUBLE PRECISION NOT NULL,
    total_price DOUBLE PRECISION NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Material Requests
CREATE TABLE material_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id),
    department VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    urgency VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    dispensed_by UUID REFERENCES users(id),
    dispensed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Material Request Items
CREATE TABLE material_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES material_requests(id),
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    quantity DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_medicine_categories_parent_id ON medicine_categories(parent_id);
CREATE INDEX idx_medicines_category_id ON medicines(category_id);
CREATE INDEX idx_medicines_expiry_date ON medicines(expiry_date) WHERE is_active = true;
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date DESC);
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_po_items_medicine_id ON po_items(medicine_id);
CREATE INDEX idx_material_requests_requester_id ON material_requests(requester_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_department ON material_requests(department);
CREATE INDEX idx_material_request_items_request_id ON material_request_items(request_id);
```

---

## Appendix B: Seed Data

### Medicine Categories

```go
var MedicineCategorySeeds = []models.MedicineCategory{
    {Name: "Herbal Preparations", SortOrder: 1},
    {Name: "Herbal Powders (Churna)", ParentName: "Herbal Preparations", SortOrder: 1},
    {Name: "Herbal Tablets (Vati)", ParentName: "Herbal Preparations", SortOrder: 2},
    {Name: "Herbal Capsules", ParentName: "Herbal Preparations", SortOrder: 3},
    {Name: "Herbal Liquids (Kwath/Asava)", ParentName: "Herbal Preparations", SortOrder: 4},
    {Name: "Herbal Oils (Taila)", ParentName: "Herbal Preparations", SortOrder: 5},
    {Name: "Mineral Preparations", SortOrder: 2},
    {Name: "Bhasma", ParentName: "Mineral Preparations", SortOrder: 1},
    {Name: "Rasa Aushadhi", ParentName: "Mineral Preparations", SortOrder: 2},
    {Name: "Guggulu Preparations", ParentName: "Mineral Preparations", SortOrder: 3},
    {Name: "Panchakarma Supplies", SortOrder: 3},
    {Name: "Massage Oils", ParentName: "Panchakarma Supplies", SortOrder: 1},
    {Name: "Decoctions (Kwath)", ParentName: "Panchakarma Supplies", SortOrder: 2},
    {Name: "Medicated Ghee", ParentName: "Panchakarma Supplies", SortOrder: 3},
    {Name: "Basti Materials", ParentName: "Panchakarma Supplies", SortOrder: 4},
    {Name: "Surgical Supplies", SortOrder: 4},
    {Name: "Dressing Materials", ParentName: "Surgical Supplies", SortOrder: 1},
    {Name: "Instruments", ParentName: "Surgical Supplies", SortOrder: 2},
    {Name: "Consumables", ParentName: "Surgical Supplies", SortOrder: 3},
    {Name: "General Medicine", SortOrder: 5},
    {Name: "Allopathic Tablets", ParentName: "General Medicine", SortOrder: 1},
    {Name: "Allopathic Syrups", ParentName: "General Medicine", SortOrder: 2},
    {Name: "Allopathic Injections", ParentName: "General Medicine", SortOrder: 3},
}
```

---

*Volume 5 — Pharmacy Module | Last Updated: 2026-08-05*
