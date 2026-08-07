# AHMS Volume 10 — Appendices

> **Enterprise-Grade Ayurvedic Hospital Management System**
> **Backend:** Go 1.22 · Gin · GORM · PostgreSQL 16
> **Frontend:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Framer Motion 12

---

## Appendix A: API Standards & Conventions

### A.1 URL Structure

```
/api/v1/{resource}              — Collection (GET list, POST create)
/api/v1/{resource}/:id          — Single resource (GET, PUT, DELETE)
/api/v1/{resource}/:id/{sub}    — Sub-resource (GET, POST)
/api/v1/{resource}/:id/{sub}/:subId — Sub-resource single (GET, PUT, DELETE)
```

### A.2 HTTP Methods

| Method | Purpose | Idempotent | Request Body |
|--------|---------|-----------|-------------|
| `GET` | Read resource(s) | Yes | No |
| `POST` | Create resource | No | Yes |
| `PUT` | Full update | Yes | Yes |
| `PATCH` | Partial update | Yes | Yes |
| `DELETE` | Soft-delete | Yes | No |

### A.3 Response Format

**Success (single resource):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Success (list with pagination):**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### A.4 Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, state conflict) |
| 422 | Unprocessable Entity (business rule violation) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

### A.5 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| DUPLICATE_ENTRY | 409 | Unique constraint violation |
| INSUFFICIENT_STOCK | 409 | Pharmacy stock insufficient |
| SCHEDULING_CONFLICT | 409 | Time slot conflict |
| PATIENT_ALREADY_ADMITTED | 409 | Patient has active admission |
| BED_NOT_AVAILABLE | 409 | Bed is not available |
| INVALID_STATUS_TRANSITION | 422 | Invalid state machine transition |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |

### A.6 Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 20, max: 100) |
| `search` | string | Fuzzy search text |
| `sort_by` | string | Sort field |
| `sort_order` | string | `asc` or `desc` |
| `start_date` | string | Filter start date (YYYY-MM-DD) |
| `end_date` | string | Filter end date (YYYY-MM-DD) |
| `status` | string | Filter by status |
| `department` | string | Filter by department |

---

## Appendix B: UI Standards & Design System

### B.1 Design Tokens

```typescript
// Complete design token set

export const designTokens = {
  // Colors
  colors: {
    primary: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0F766E',  // PRIMARY
      700: '#0D6960',
      800: '#115E59',
      900: '#134E4A',
    },
    accent: {
      50: '#FDF8ED',
      100: '#F9EDD0',
      200: '#F0D89D',
      300: '#E5C06A',
      400: '#D4A84D',
      500: '#C8A14D',  // GOLD ACCENT
      600: '#B8912E',
      700: '#9A7A25',
      800: '#7C6320',
      900: '#5E4C1A',
    },
    background: '#FAF8F2',  // IVORY
    surface: '#FFFFFF',
    text: {
      primary: '#1E293B',
      secondary: '#475569',
      muted: '#94A3B8',
    },
    border: '#E2E8F0',
  },

  // Typography
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  // Border radius
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};
```

### B.2 Component Patterns

#### Page Header
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-slate-900">Page Title</h1>
    <p className="text-sm text-slate-500 mt-1">Page description</p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline">Secondary Action</Button>
    <Button variant="primary">Primary Action</Button>
  </div>
</div>
```

#### Card
```tsx
<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
  <h3 className="text-lg font-semibold text-slate-800 mb-4">Card Title</h3>
  {/* Content */}
</div>
```

#### Data Table
```tsx
<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-slate-50">
      <tr>
        <th className="px-4 py-3 text-left font-medium text-slate-600">Column</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Status Badge
```tsx
const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-teal-100 text-teal-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

<span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
  {status}
</span>
```

### B.3 Responsive Breakpoints

| Breakpoint | Width | Columns |
|------------|-------|---------|
| `sm` | 640px | 1 |
| `md` | 768px | 2 |
| `lg` | 1024px | 3 |
| `xl` | 1280px | 4 |
| `2xl` | 1536px | 5 |

### B.4 Animation Standards

```typescript
export const animations = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.2 },
  },

  // Card hover
  cardHover: {
    whileHover: { scale: 1.02 },
    transition: { duration: 0.15 },
  },

  // Modal
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  // List items
  listItem: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.15 },
  },
};
```

---

## Appendix C: Database Schema Reference

### C.1 Complete Table List

| # | Table | Module | Description |
|---|-------|--------|-------------|
| 1 | `users` | Auth | System users (doctors, nurses, staff) |
| 2 | `roles` | Auth | Role definitions (13 roles) |
| 3 | `permissions` | Auth | Permission definitions (26+ permissions) |
| 4 | `role_permissions` | Auth | Role-permission mapping |
| 5 | `user_roles` | Auth | User-role assignment |
| 6 | `token_blacklist` | Auth | Invalidated JWT tokens |
| 7 | `patients` | Patient | Patient registry with UHID |
| 8 | `departments` | Department | Hospital departments |
| 9 | `doctors` | Doctor | Doctor profiles |
| 10 | `appointments` | Appointment | OPD appointments |
| 11 | `encounters` | Encounter | Patient visits/encounters |
| 12 | `consultations` | Consultation | Clinical consultations |
| 13 | `diagnoses` | Diagnosis | Patient diagnoses |
| 14 | `prescriptions` | Prescription | Prescriptions |
| 15 | `prescription_items` | Prescription | Prescription line items |
| 16 | `referrals` | Referral | Inter-department referrals |
| 17 | `medicines` | Pharmacy | Medicine master |
| 18 | `inventory_transactions` | Pharmacy | Stock movements |
| 19 | `medicine_categories` | Pharmacy | Medicine categories |
| 20 | `suppliers` | Pharmacy | Medicine suppliers |
| 21 | `purchase_orders` | Pharmacy | Procurement orders |
| 22 | `po_items` | Pharmacy | PO line items |
| 23 | `material_requests` | Pharmacy | Department material requests |
| 24 | `material_request_items` | Pharmacy | Request line items |
| 25 | `bills` | Billing | Financial bills |
| 26 | `bill_items` | Billing | Bill line items |
| 27 | `payments` | Billing | Payment records |
| 28 | `refunds` | Billing | Refund records |
| 29 | `bill_counters` | Billing | Atomic bill number generation |
| 30 | `service_categories` | Billing | Service categories |
| 31 | `service_catalogs` | Billing | Billable services |
| 32 | `discount_rules` | Billing | Discount rules |
| 33 | `therapy_types` | Panchakarma | Therapy type master |
| 34 | `treatment_plans` | Panchakarma | PK treatment plans |
| 35 | `treatment_sessions` | Panchakarma | PK therapy sessions |
| 36 | `session_materials` | Panchakarma | Materials used per session |
| 37 | `wards` | IPD | Hospital wards |
| 38 | `beds` | IPD | Hospital beds |
| 39 | `admissions` | IPD | Patient admissions |
| 40 | `doctor_rounds` | IPD | Doctor round notes |
| 41 | `nursing_care_plans` | IPD | Nursing tasks |
| 42 | `treatment_orders` | IPD | Doctor treatment orders |
| 43 | `attendants` | IPD | Patient attendants |
| 44 | `audit_log` | Audit | System audit trail |

### C.2 UUID Primary Keys

All tables use UUID v4 primary keys generated via `gen_random_uuid()` in PostgreSQL. This ensures:
- No sequential ID guessing
- Distributed ID generation
- No collision risk

### C.3 Soft Deletes

All major entities use GORM soft deletes via `deleted_at TIMESTAMP WITH TIME ZONE`:
- Records are never hard-deleted
- Queries automatically filter `WHERE deleted_at IS NULL`
- Historical data preserved for audit trail

---

## Appendix D: Glossary

| Term | Definition |
|------|-----------|
| **AHMS** | Ayurvedic Hospital Management System |
| **UHID** | Unique Hospital Identification Number (format: `AHMS-YYYY-NNNNNN`) |
| **OPD** | Out-Patient Department |
| **IPD** | In-Patient Department |
| **EMR** | Electronic Medical Records |
| **PK** | Panchakarma |
| **Vata, Pitta, Kapha** | Three doshas in Ayurveda |
| **Prakriti** | Body constitution type in Ayurveda |
| **Ama** | Toxins in Ayurveda |
| **Churna** | Herbal powder formulation |
| **Taila** | Medicated oil |
| **Kwath** | Herbal decoction |
| **Basti** | Medicated enema therapy |
| **Abhyanga** | Full body oil massage |
| **Shirodhara** | Forehead oil pouring therapy |
| **Nasya** | Nasal administration of medicine |
| **Virechana** | Therapeutic purgation |
| **Raktamokshana** | Bloodletting therapy |
| **Snehana** | Oleation therapy |
| **Swedana** | Sudation/fomentation therapy |
| **JWT** | JSON Web Token |
| **RBAC** | Role-Based Access Control |
| **CRUD** | Create, Read, Update, Delete |
| **FIFO** | First In, First Out (inventory management) |
| **POS** | Point of Sale |
| **TPA** | Third-Party Administrator (insurance) |
| **HSN** | Harmonized System of Nomenclature (tax classification) |
| **GST** | Goods and Services Tax |

---

## Appendix E: Module Dependency Map

```
Vol 0: Project Overview
  └── Foundation for all modules

Vol 1: Foundation, Design System & RBAC
  └── Depends on: Vol 0
  └── Required by: All other volumes

Vol 2: Patient & OPD
  └── Depends on: Vol 1 (Auth, RBAC)
  └── Required by: Vol 3, 4, 5, 6, 7, 9

Vol 3: EMR & Referral
  └── Depends on: Vol 1, Vol 2
  └── Required by: Vol 4, 6, 7, 9

Vol 4: Panchakarma
  └── Depends on: Vol 1, Vol 2, Vol 3
  └── Required by: Vol 5, 7, 9

Vol 5: Pharmacy
  └── Depends on: Vol 1, Vol 3
  └── Required by: Vol 4, 6, 7

Vol 6: IPD
  └── Depends on: Vol 1, Vol 2, Vol 3
  └── Required by: Vol 5, 7, 9

Vol 7: Billing
  └── Depends on: Vol 1, Vol 2, Vol 3, Vol 5
  └── Required by: Vol 9

Vol 8: Reports & Analytics
  └── Depends on: Vol 1-7 (reads from all modules)

Vol 9: Patient Portal
  └── Depends on: Vol 1, Vol 2, Vol 3, Vol 4, Vol 6, Vol 7

Vol 10: Appendices
  └── Reference document (no dependencies)
```

### Implementation Order

```
Phase 1 (Foundation):     Vol 0 → Vol 1 → Vol 2
Phase 2 (Clinical):       Vol 3 → Vol 5
Phase 3 (Specialized):    Vol 4 → Vol 6
Phase 4 (Financial):      Vol 7
Phase 5 (Intelligence):   Vol 8
Phase 6 (Patient-facing): Vol 9
Phase 7 (Documentation):  Vol 10
```

---

## Appendix F: Future Enhancements (Backlog)

| # | Enhancement | Priority | Effort |
|---|------------|----------|--------|
| 1 | Real-time WebSocket notifications | High | 5 days |
| 2 | Multi-language support (Hindi, Kannada, Tamil) | High | 10 days |
| 3 | SMS integration (appointment reminders, OTP) | High | 3 days |
| 4 | Email integration (bills, reports) | Medium | 3 days |
| 5 | Online payment gateway (Razorpay) | Medium | 5 days |
| 6 | Insurance/TPA integration | Medium | 15 days |
| 7 | Barcode/QR code for patients, medicines | Medium | 3 days |
| 8 | Biometric authentication | Low | 5 days |
| 9 | Mobile app (React Native) | Medium | 30 days |
| 10 | AI-powered diagnosis suggestions | Low | 20 days |
| 11 | IoT integration (bed sensors, vitals monitors) | Low | 15 days |
| 12 | Multi-hospital support | Low | 20 days |
| 13 | Advanced analytics dashboard | Medium | 10 days |
| 14 | Telemedicine integration | Medium | 15 days |
| 15 | Inventory auto-reorder | Low | 5 days |

---

## Appendix G: Development Environment Setup

### G.1 Backend

```bash
# Prerequisites
Go 1.22+, Docker, PostgreSQL 16 (via Docker)

# Setup
cd ahms-backend
go mod download
docker-compose up -d postgres
go run cmd/api/main.go

# Server runs on: http://localhost:8080
# API prefix: /api/v1
```

### G.2 Frontend

```bash
# Prerequisites
Node.js 20+, npm 10+

# Setup
cd ahms-frontend
npm install
npm run dev

# Dev server runs on: http://localhost:5173
# Proxies /api to localhost:8080
```

### G.3 Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ahms
      POSTGRES_USER: ahms
      POSTGRES_PASSWORD: ahms_secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Appendix H: Complete Volume Index

| Vol | Title | Pages (Est.) | Status |
|-----|-------|-------------|--------|
| 0 | Project Overview | 30 | ✅ Complete |
| 1 | Foundation, Design System & RBAC | 50 | ✅ Complete |
| 2 | Patient & OPD | 45 | ✅ Complete |
| 3 | EMR & Referral | 40 | ✅ Complete |
| 4 | Panchakarma | 55 | ✅ Complete |
| 5 | Pharmacy | 50 | ✅ Complete |
| 6 | IPD (In-Patient Department) | 55 | ✅ Complete |
| 7 | Billing | 50 | ✅ Complete |
| 8 | Reports & Analytics | 35 | ✅ Complete |
| 9 | Patient Portal | 30 | ✅ Complete |
| 10 | Appendices | 25 | ✅ Complete |
| **Total** | | **~465 pages** | **All Complete** |

---

*Volume 10 — Appendices | Last Updated: 2026-08-05*
