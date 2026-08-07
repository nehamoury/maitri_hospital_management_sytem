# AHMS — Volume 2: Patient & OPD

> **Maitri Ayurveda Hospital Management System**
> Enterprise Product Specification — Volume 2

---

## Table of Contents

1. [Patient Registration](#1-patient-registration)
2. [UHID Generation](#2-uhid-generation)
3. [Duplicate Detection](#3-duplicate-detection)
4. [Patient List & Search](#4-patient-list--search)
5. [Patient Detail & Timeline](#5-patient-detail--timeline)
6. [Appointment Booking](#6-appointment-booking)
7. [OPD Workflow](#7-opd-workflow)
8. [Encounter Management](#8-encounter-management)
9. [Queue Management](#9-queue-management)
10. [Token Management](#10-token-management)
11. [Public Appointment Booking](#11-public-appointment-booking)
12. [Gap Analysis](#12-gap-analysis)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [Developer Checklist](#14-developer-checklist)
15. [Future Enhancements](#15-future-enhancements)

---

# 1. Patient Registration

## 1.1 Purpose

Register new patients with auto-generated UHID, capture demographics, and detect potential duplicates before creating the record.

## 1.2 UI Objective

Fast, efficient registration form that a receptionist can complete in under 2 minutes. Duplicate detection prevents accidental re-registration.

## 1.3 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Register Patient                             [+ New Patient]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Patient Details                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  Full Name *              Gender *                   │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐   │   │
│  │  │                     │  │  MALE ▼              │   │   │
│  │  └─────────────────────┘  └─────────────────────┘   │   │
│  │                                                      │   │
│  │  Date of Birth             Age                       │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐   │   │
│  │  │  YYYY-MM-DD         │  │  0                   │   │   │
│  │  └─────────────────────┘  └─────────────────────┘   │   │
│  │                                                      │   │
│  │  Mobile *                 Blood Group                │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐   │   │
│  │  │  9999999999         │  │  A+ ▼                │   │   │
│  │  └─────────────────────┘  └─────────────────────┘   │   │
│  │                                                      │   │
│  │  Email                    Emergency Contact          │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐   │   │
│  │  │                     │  │                     │   │   │
│  │  └─────────────────────┘  └─────────────────────┘   │   │
│  │                                                      │   │
│  │  Address                                            │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │                                             │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  ☐ Force register (override duplicate warning)      │   │
│  │                                                      │   │
│  │  [    Register Patient    ]  [    Reset    ]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ Duplicate Warning (if mobile matches existing)         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Possible duplicate found:                           │   │
│  │  • Rajesh Kumar (AHMS-2026-000042) — 9876543210     │   │
│  │  • Force register if this is a new patient           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 1.4 Layout Structure

- Page header: "Register Patient" + subtitle
- Single card with form
- 2-column grid for compact fields (name/gender, DOB/age, mobile/blood group)
- Full-width for address
- Duplicate warning banner (conditionally shown)
- Action buttons at bottom

## 1.5 UI Prompt

```
Design a premium enterprise Patient Registration page for an Ayurvedic hospital.

Requirements:
- Clean white card with subtle shadow on ivory background (#FAF8F2)
- Page title in Poppins bold, subtitle in Inter muted
- Form fields use floating labels with teal focus ring
- Gender and Blood Group as styled select dropdowns
- Duplicate warning in amber banner with patient list
- Register button: teal gradient with shadow
- Reset button: secondary outline
- Mobile number field has instant duplicate check on blur
- DOB field auto-calculates Age field
- Responsive: 2 columns on desktop, single column on mobile
- Loading state: button shows spinner during submission
- Error state: red banner at top of form
```

## 1.6 Fields

| # | Field | Type | Required | Max Length | Default | Validation | Notes |
|---|-------|------|----------|-----------|---------|-----------|-------|
| 1 | Full Name | string | Yes | 150 | — | `min=2, max=150` | Patient's full name |
| 2 | Gender | enum | Yes | — | MALE | `oneof=MALE FEMALE OTHER` | Dropdown |
| 3 | Date of Birth | date | No | — | — | `datetime=2006-01-02` | Auto-calculates Age |
| 4 | Age | int | No | — | 0 | `gte=0, lte=150` | Auto from DOB or manual |
| 5 | Mobile | string | Yes | 15 | — | `min=10, max=15` | Triggers duplicate check |
| 6 | Email | email | No | 150 | — | `email` | Optional |
| 7 | Address | text | No | 500 | — | `max=500` | Free text |
| 8 | Blood Group | enum | No | 5 | — | — | A+, A-, B+, B-, O+, O-, AB+, AB- |
| 9 | Emergency Contact | string | No | 15 | — | `max=15` | Phone number |
| 10 | Force | boolean | No | — | false | — | Bypass duplicate warning |

## 1.7 Validation

### Frontend (Zod Schema)

```typescript
const patientSchema = z.object({
  full_name: z.string().min(2).max(150),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().optional().refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val)),
  age: z.number().min(0).max(150),
  mobile: z.string().min(10).max(15),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500),
  blood_group: z.string().max(5),
  emergency_contact: z.string().max(15),
  force: z.boolean(),
})
```

### Backend (Gin Binding)

```go
type CreatePatientRequest struct {
    FullName         string `json:"full_name" binding:"required,min=2,max=150"`
    Gender           string `json:"gender" binding:"required,oneof=MALE FEMALE OTHER"`
    DOB              string `json:"dob" binding:"omitempty,datetime=2006-01-02"`
    Age              int    `json:"age" binding:"gte=0,lte=150"`
    Mobile           string `json:"mobile" binding:"required,min=10,max=15"`
    Email            string `json:"email" binding:"omitempty,email"`
    Address          string `json:"address" binding:"max=500"`
    BloodGroup       string `json:"blood_group" binding:"max=5"`
    EmergencyContact string `json:"emergency_contact" binding:"max=15"`
    Force            bool   `json:"force"`
}
```

### Error Responses

| Code | Condition | Message |
|------|-----------|---------|
| 400 | Missing required field | `invalid request payload: ...` |
| 400 | Invalid gender | `invalid request payload: ...` |
| 400 | Invalid DOB format | `invalid request payload: ...` |
| 409 | Duplicate mobile (Force=false) | `duplicate mobile number detected` |
| 500 | DB error | `failed to register patient` |

## 1.8 Workflow

```
Receptionist opens "Register Patient" page
    ↓
Fills required fields (Name, Gender, Mobile)
    ↓
Optional: fills DOB, Age auto-calculates
    ↓
Optional: fills Email, Address, Blood Group, Emergency Contact
    ↓
Clicks "Register Patient"
    ↓
Frontend validates (Zod)
    ↓
POST /api/v1/patients
    ↓
Backend validates (Gin binding)
    ↓
Repository checks duplicate mobile (if Force=false)
    ↓
If duplicate found → 409 with existing patients list
    ↓
Frontend shows duplicate warning banner
    ↓
Receptionist reviews → Either:
    a) Clicks "Force Register" → re-submits with force=true
    b) Cancels → searches for existing patient
    ↓
If unique or force=true:
    ↓
UHID generated (AHMS-YYYY-NNNNNN)
    ↓
Patient record created
    ↓
Audit log: patient.create
    ↓
Response 201 with patient ID + UHID
    ↓
Frontend redirects to patient detail page
```

## 1.9 Role Permissions

| Role | View | Create | Edit | Delete | Export | Print |
|------|:----:|:------:|:----:|:------:|:------:|:-----:|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hospital Admin | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| Receptionist | ✅ | ✅ | ✅ | — | — | ✅ |
| Doctor | ✅ | — | — | — | — | — |
| Pharmacist | ✅ | — | — | — | — | — |
| Billing | ✅ | — | — | — | — | — |
| Patient (Portal) | ✅ (own) | — | — | — | — | — |

## 1.10 API Mapping

### Register Patient

```
POST /api/v1/patients
Permission: patient.create

Request:
{
  "full_name": "Rajesh Kumar",
  "gender": "MALE",
  "dob": "1985-06-15",
  "age": 41,
  "mobile": "9876543210",
  "email": "rajesh@email.com",
  "address": "123 Main St, Delhi",
  "blood_group": "O+",
  "emergency_contact": "9876543211",
  "force": false
}

Response 201:
{
  "success": true,
  "message": "patient registered",
  "data": {
    "id": "uuid",
    "uhid": "AHMS-2026-000042",
    "full_name": "Rajesh Kumar",
    "gender": "MALE",
    "dob": "1985-06-15",
    "age": 41,
    "mobile": "9876543210",
    "email": "rajesh@email.com",
    "address": "123 Main St, Delhi",
    "blood_group": "O+",
    "emergency_contact": "9876543211",
    "is_active": true,
    "created_at": "2026-08-05T10:00:00Z"
  }
}

Response 409 (Duplicate):
{
  "success": false,
  "message": "duplicate mobile number detected",
  "existing_patients": [
    {
      "id": "uuid",
      "uhid": "AHMS-2026-000015",
      "full_name": "Rajesh Kumar",
      "gender": "MALE",
      "mobile": "9876543210"
    }
  ]
}
```

### Get Patient

```
GET /api/v1/patients/:id
Permission: patient.view

Response 200:
{
  "success": true,
  "data": { ... }
}
```

### Update Patient

```
PUT /api/v1/patients/:id
Permission: patient.edit

Request: {
  "full_name": "Rajesh Kumar",
  "gender": "MALE",
  "mobile": "9876543210",
  "is_active": true
}
```

### Delete Patient

```
DELETE /api/v1/patients/:id
Permission: patient.edit

Response 200:
{
  "success": true,
  "message": "patient deleted"
}
```

## 1.11 Database Mapping

```
Table: patients

Columns:
  id                  UUID        PRIMARY KEY
  uhid                VARCHAR(30) UNIQUE NOT NULL
  full_name           VARCHAR(150) NOT NULL
  gender              VARCHAR(10) NOT NULL
  dob                 TIMESTAMPTZ
  age                 INTEGER
  mobile              VARCHAR(15) NOT NULL
  email               VARCHAR(150)
  address             TEXT
  blood_group         VARCHAR(5)
  emergency_contact   VARCHAR(15)
  registered_by_user_id UUID NOT NULL
  is_active           BOOLEAN DEFAULT true
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
  deleted_at          TIMESTAMPTZ

Indexes:
  PRIMARY KEY (id)
  UNIQUE (uhid)
  idx_patients_mobile (mobile)
  idx_patients_full_name (full_name)
  idx_patients_deleted_at (deleted_at)

Relations:
  patients → belongs_to → users (via registered_by_user_id)
  patients → has_many → encounters
  patients → has_many → appointments
  patients → has_many → bills

Cascade Rules:
  Soft delete preserves all relationships
  Cannot delete patient with active encounters
```

### UHID Counter Table

```
Table: uhid_counters

Columns:
  year        INTEGER PRIMARY KEY
  last_number INTEGER NOT NULL DEFAULT 0

Usage:
  Row-locked (SELECT ... FOR UPDATE) during patient creation
  Guarantees no duplicate UHIDs under concurrent requests
  Format: AHMS-2026-000001, AHMS-2026-000002, ...
```

---

# 2. UHID Generation

## 2.1 Purpose

Auto-generate unique hospital IDs for each patient. UHID is the primary identifier used across all modules.

## 2.2 Format

```
AHMS-YYYY-NNNNNN

AHMS  → Hospital prefix (configurable)
YYYY  → Calendar year (2026)
NNNNNN → 6-digit sequential number (000001, 000002, ...)

Examples:
  AHMS-2026-000001
  AHMS-2026-000042
  AHMS-2026-001234
```

## 2.3 Generation Logic

```go
func (r *repository) CreateWithUHID(p *models.Patient) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        year := time.Now().Year()

        // Lock the counter row for this year
        var counter models.UHIDCounter
        err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            FirstOrCreate(&counter, models.UHIDCounter{Year: year}).Error
        if err != nil {
            return err
        }

        // Increment
        counter.LastNumber++
        if err := tx.Save(&counter).Error; err != nil {
            return err
        }

        // Generate UHID
        p.UHID = fmt.Sprintf("AHMS-%d-%06d", year, counter.LastNumber)

        // Create patient
        return tx.Create(p).Error
    })
}
```

## 2.4 Concurrency Safety

- Counter row is locked with `SELECT ... FOR UPDATE`
- Transaction ensures atomicity
- No two patients can receive the same UHID even under concurrent requests
- Counter resets each calendar year

## 2.5 Gap Analysis

```
Current Implementation:
  - UHID format: AHMS-YYYY-NNNNNN
  - Atomic generation with row locking
  - Year-based counter

Gap:
  - Prefix "AHMS" is hardcoded
  - No configurable prefix per hospital
  - No UHID reprint/label generation
  - No UHID barcode/QR code

Required Changes:
  - Make prefix configurable via Hospital Master
  - Add UHID label print functionality
  - Add barcode/QR generation

Priority: P2 (Should Fix)
Estimated Effort: 2 days
```

---

# 3. Duplicate Detection

## 3.1 Purpose

Prevent accidental duplicate patient registrations by detecting matching mobile numbers before creating a new record.

## 3.2 Detection Logic

```
Patient submits registration form
    ↓
Backend extracts mobile number
    ↓
Queries: SELECT * FROM patients WHERE mobile = ? AND is_active = true
    ↓
If results found AND force=false:
    → Return 409 with existing patients list
    → Frontend shows duplicate warning
    ↓
If no results OR force=true:
    → Proceed with registration
```

## 3.3 User Experience

### First Attempt (Force=false)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Possible Duplicate Detected                             │
│                                                             │
│  A patient with mobile number 9876543210 already exists:   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤 Rajesh Kumar                                     │   │
│  │     UHID: AHMS-2026-000015                          │   │
│  │     Mobile: 9876543210                               │   │
│  │     Registered: 2026-01-15                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ View Existing Patient ]  [ Force Register as New ]      │
└─────────────────────────────────────────────────────────────┘
```

### Force Registration

When receptionist confirms it's a different person (e.g., family member sharing phone):

1. Clicks "Force Register as New"
2. Form resubmits with `force: true`
3. Backend skips duplicate check
4. New patient created with same mobile

## 3.3 Gap Analysis

```
Current Implementation:
  - Mobile number duplicate detection
  - Force flag to override
  - Shows existing patients in 409 response

Gap:
  - No name similarity detection
  - No Aadhar/ID proof validation
  - No family member linking
  - No duplicate merge capability

Required Changes:
  - Add name similarity fuzzy matching
  - Add Aadhar field for identity verification
  - Add family member linking
  - Add duplicate merge tool for admin

Priority: P2 (Should Fix)
Estimated Effort: 3-4 days
```

---

# 4. Patient List & Search

## 4.1 Purpose

Search, filter, and browse all registered patients with quick access to profiles.

## 4.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Patients                               [+ Register Patient]│
├─────────────────────────────────────────────────────────────┤
│  🔍 Search by name, UHID, or mobile...     Filter ▼  Sort ▼│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Showing 1-20 of 1,234 patients                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  UHID          Name            Mobile      Status     │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  AHMS-2026..   Rajesh Kumar    987654..    ✅ Active  │ │
│  │  AHMS-2026..   Priya Singh     987654..    ✅ Active  │ │
│  │  AHMS-2026..   Amit Patel      987654..    ✅ Active  │ │
│  │  AHMS-2026..   Sunita Devi     987654..    ❌ Inactive│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ← Previous   Page 1 of 62   Next →                        │
└─────────────────────────────────────────────────────────────┘
```

## 4.3 Search Capabilities

| Search By | Method | Example |
|-----------|--------|---------|
| Name | ILIKE (case-insensitive) | `?search=rajesh` |
| UHID | Exact match | `?search=AHMS-2026-000042` |
| Mobile | Exact match | `?search=9876543210` |

## 4.4 API Mapping

```
GET /api/v1/patients?search=rajesh&page=1&per_page=20
Permission: patient.view

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "uhid": "AHMS-2026-000042",
      "full_name": "Rajesh Kumar",
      "gender": "MALE",
      "mobile": "9876543210",
      "is_active": true,
      "created_at": "2026-08-05T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1234,
    "total_pages": 62
  }
}
```

## 4.5 Gap Analysis

```
Current Implementation:
  - Search by name, UHID, mobile
  - Basic list view

Gap:
  - No pagination
  - No advanced filters (gender, age, blood group, department)
  - No sort options
  - No export to Excel
  - No patient count by status

Required Changes:
  - Add pagination (page/per_page query params)
  - Add filter UI (dropdowns for gender, blood group, status)
  - Add sort dropdown (name, date, UHID)
  - Add export button (Excel/PDF)
  - Add summary stats above list

Priority: P2 (Should Fix)
Estimated Effort: 3-4 days
```

---

# 5. Patient Detail & Timeline

## 5.1 Purpose

View complete patient profile with unified clinical history across all departments.

## 5.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Patients                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤 Rajesh Kumar                    AHMS-2026-000042│   │
│  │  MALE • 41 years • O+ • 9876543210                  │   │
│  │  rajesh@email.com • 123 Main St, Delhi              │   │
│  │                                                      │   │
│  │  [ Edit Profile ]  [ Book Appointment ]  [ Refer ]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Clinical Timeline                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  📅 2026-08-05 — Kaya Chikitsa — Dr. Priya         │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Chief Complaint: Amlapitta                  │    │   │
│  │  │  Diagnosis: Hyperacidity (PRIMARY)           │    │   │
│  │  │  Prescription: Avipattikara Churna           │    │   │
│  │  │  Status: COMPLETED                           │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  📅 2026-07-20 — Panchkarma — Dr. Amit             │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Referral from: Kaya Chikitsa                │    │   │
│  │  │  Treatment: Virechana                        │    │   │
│  │  │  Sessions: 3 completed                       │    │   │
│  │  │  Status: COMPLETED                           │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  📅 2026-06-10 — Kaya Chikitsa — Dr. Priya         │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Chief Complaint: Amlapitta (follow-up)      │    │   │
│  │  │  Diagnosis: Hyperacidity (FOLLOW_UP)         │    │   │
│  │  │  Status: COMPLETED                           │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 5.3 Timeline Data Structure

```json
{
  "patient_id": "uuid",
  "uhid": "AHMS-2026-000042",
  "patient_name": "Rajesh Kumar",
  "gender": "MALE",
  "age": 41,
  "mobile": "9876543210",
  "encounters": [
    {
      "encounter_id": "uuid",
      "visit_date": "2026-08-05",
      "department_id": "uuid",
      "department_name": "Kaya Chikitsa",
      "doctor_id": "uuid",
      "doctor_name": "Dr. Priya",
      "visit_type": "NEW",
      "token_number": 5,
      "status": "COMPLETED",
      "referral_id": null,
      "diagnoses": [
        {
          "diagnosis": "Hyperacidity",
          "diagnosis_type": "PRIMARY",
          "notes": ""
        }
      ],
      "consultations": [
        {
          "consultation_id": "uuid",
          "chief_complaints": "Amlapitta",
          "history": "Patient reports burning sensation...",
          "examination": "Tongue coated, pulse tikshna",
          "clinical_notes": "Pitta aggravation observed",
          "treatment_plan": "Shodhana + Shamana",
          "diet_pathya": "Avoid spicy food",
          "diet_apathya": "No fermented food",
          "ayurveda_fields": {
            "prakriti": "Pitta",
            "vikriti": "Pitta",
            "dosha": "Pitta",
            "agni": "Tikshna",
            "nadi": "Tikshna"
          },
          "follow_up_date": "2026-09-05",
          "diagnoses": [...],
          "created_at": "2026-08-05T10:30:00Z"
        }
      ],
      "prescriptions": [
        {
          "prescription_id": "uuid",
          "status": "DISPENSED",
          "notes": "After food",
          "items": [
            {
              "medicine": "Avipattikara Churna",
              "formulation": "Churna",
              "dose": "3g",
              "frequency": "BD",
              "duration": "30 days",
              "quantity": 3,
              "anupana": "Warm water",
              "route": "oral",
              "dispensed_qty": 3
            }
          ],
          "created_at": "2026-08-05T10:45:00Z"
        }
      ]
    }
  ]
}
```

## 5.4 API Mapping

```
GET /api/v1/patients/:id/timeline
Permission: clinical.view

Response 200:
{
  "success": true,
  "data": {
    "patient_id": "uuid",
    "uhid": "AHMS-2026-000042",
    "patient_name": "Rajesh Kumar",
    "encounters": [...]
  }
}
```

---

# 6. Appointment Booking

## 6.1 Purpose

Schedule patient appointments with doctors, auto-generate token numbers, and manage appointment status.

## 6.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Appointments                            [+ Book Appointment]│
├─────────────────────────────────────────────────────────────┤
│  📅 Today: August 5, 2026          Filter: All Status ▼     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Token   Patient         Doctor          Time  Status │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  #1      Rajesh Kumar    Dr. Priya       9:00  ✅ Done│ │
│  │  #2      Priya Singh     Dr. Amit        9:30  🔄 Wait│ │
│  │  #3      Amit Patel      Dr. Priya      10:00  🔄 Wait│ │
│  │  #4      Sunita Devi     Dr. Sharma     10:30  📅 Sched│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Book New Appointment                                │   │
│  │  Patient: [Search patient...]  Doctor: [Select ▼]   │   │
│  │  Date: [2026-08-05]  Reason: [____________]         │   │
│  │  [ Book Appointment ]                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 6.3 Fields

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Patient | select/search | Yes | FK → patients.id |
| 2 | Doctor | select | Yes | FK → doctors.id |
| 3 | Appointment Date | date | Yes | Format: YYYY-MM-DD |
| 4 | Reason | text | No | Max 500 chars |
| 5 | Token Number | int | Auto | Auto-generated per doctor+date |
| 6 | Status | enum | Auto | SCHEDULED, COMPLETED, CANCELLED |

## 6.4 Token Generation Logic

```go
func (r *repository) CreateWithToken(appt *models.Appointment) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        // Lock doctor row
        var doctor models.Doctor
        tx.Clauses(clause.Locking{Strength: "UPDATE"}).
            First(&doctor, "id = ?", appt.DoctorID)

        // Find max token for this doctor+date
        dayStart := time.Date(...)
        dayEnd := dayStart.Add(24 * time.Hour)

        var maxToken int
        tx.Model(&models.Appointment{}).
            Select("COALESCE(MAX(token_number), 0)").
            Where("doctor_id = ? AND appointment_date >= ? AND appointment_date < ? AND status != ?",
                appt.DoctorID, dayStart, dayEnd, "CANCELLED").
            Row().Scan(&maxToken)

        appt.TokenNumber = maxToken + 1
        appt.Status = "SCHEDULED"

        return tx.Create(appt).Error
    })
}
```

## 6.5 Status Workflow

```
SCHEDULED → COMPLETED (after consultation)
SCHEDULED → CANCELLED (by patient or staff)
```

## 6.6 API Mapping

### Book Appointment

```
POST /api/v1/appointments
Permission: patient.create

Request:
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "appointment_date": "2026-08-05",
  "reason": "Follow-up for Amlapitta"
}

Response 201:
{
  "success": true,
  "message": "appointment booked",
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "patient_name": "Rajesh Kumar",
    "patient_uhid": "AHMS-2026-000042",
    "doctor_id": "uuid",
    "doctor_name": "Dr. Priya",
    "appointment_date": "2026-08-05",
    "token_number": 5,
    "status": "SCHEDULED",
    "reason": "Follow-up for Amlapitta"
  }
}
```

### Update Status

```
PUT /api/v1/appointments/:id/status
Permission: appointment.update

Request:
{
  "status": "COMPLETED"
}
```

## 6.7 Gap Analysis

```
Current Implementation:
  - Basic appointment booking
  - Auto token generation
  - Status update (SCHEDULED/COMPLETED/CANCELLED)

Gap:
  - No time slot selection
  - No doctor availability check
  - No appointment reminder
  - No cancellation reason
  - No walk-in vs scheduled distinction
  - No appointment history per patient

Required Changes:
  - Add time slot picker
  - Add doctor availability API
  - Add reminder system (SMS/email)
  - Add cancellation reason field
  - Add walk-in flag
  - Add appointment history tab on patient detail

Priority: P2 (Should Fix)
Estimated Effort: 4-5 days
```

---

# 7. OPD Workflow

## 7.1 Purpose

Manage the complete Outpatient Department workflow from registration to consultation completion.

## 7.2 Workflow States

```
┌──────────┐    ┌──────────┐    ┌────────────────┐    ┌──────────┐
│REGISTERED│ →  │ WAITING  │ →  │ IN_CONSULTATION│ →  │COMPLETED │
└──────────┘    └──────────┘    └────────────────┘    └──────────┘
     │               │                │                     │
     │               │                │                     │
     ▼               ▼                ▼                     ▼
  Token #        Queue View      Doctor Starts         Encounter
  Generated      Shows Patient   Consultation          Closed
```

## 7.3 State Descriptions

| State | Description | Transition |
|-------|-------------|-----------|
| `REGISTERED` | Patient checked in, token generated | → WAITING |
| `WAITING` | Patient in queue, waiting for doctor | → IN_CONSULTATION |
| `IN_CONSULTATION` | Doctor actively consulting | → COMPLETED |
| `COMPLETED` | Consultation finished, encounter closed | Terminal |

## 7.4 OPD Dashboard View

```
┌─────────────────────────────────────────────────────────────┐
│  OPD Queue — Kaya Chikitsa — August 5, 2026                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │  📋 Waiting   │ │  🔄 In Consult│ │  ✅ Completed │       │
│  │     8        │ │     2        │ │     36       │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│  Waiting Queue:                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  #3  Priya Singh     Dr. Amit     9:30   [Start]   │   │
│  │  #4  Amit Patel      Dr. Priya   10:00   [Start]   │   │
│  │  #5  Sunita Devi     Dr. Sharma  10:30   [Start]   │   │
│  │  #6  Mohan Lal       Dr. Priya   11:00   [Start]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  In Consultation:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  #1  Rajesh Kumar    Dr. Priya    9:00   [Complete]│   │
│  │  #2  Geeta Devi      Dr. Amit     9:30   [Complete]│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 7.5 Encounter Creation

When receptionist creates an encounter:

1. Search/select existing patient (by UHID or name)
2. Select department
3. Select doctor (filtered by department)
4. Choose encounter type (OPD/IPD)
5. Choose visit type (NEW/FOLLOW_UP)
6. Set consultation fee
7. System generates token number
8. Encounter status: REGISTERED

## 7.6 API Mapping

### Create Encounter

```
POST /api/v1/encounters
Permission: encounter.create

Request:
{
  "patient_id": "uuid",
  "department_id": "uuid",
  "doctor_id": "uuid",
  "encounter_type": "OPD",
  "visit_type": "NEW",
  "visit_date": "2026-08-05",
  "consultation_fee": 500
}

Response 201:
{
  "success": true,
  "message": "encounter created",
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "uhid": "AHMS-2026-000042",
    "patient_name": "Rajesh Kumar",
    "department_id": "uuid",
    "department_name": "Kaya Chikitsa",
    "doctor_id": "uuid",
    "doctor_name": "Dr. Priya",
    "encounter_type": "OPD",
    "visit_type": "NEW",
    "visit_date": "2026-08-05",
    "token_number": 5,
    "status": "REGISTERED",
    "consultation_fee": 500,
    "payment_status": "UNPAID",
    "consultations": [],
    "diagnoses": [],
    "prescriptions": []
  }
}
```

### Update Encounter Status

```
PATCH /api/v1/encounters/:id/status
Permission: encounter.update

Request:
{
  "status": "IN_CONSULTATION"
}
```

### List Encounters

```
GET /api/v1/encounters?status=WAITING&department_id=uuid
Permission: clinical.view

Response 200:
{
  "success": true,
  "data": [...]
}
```

---

# 8. Encounter Management

## 8.1 Purpose

Track each patient visit as a separate encounter, linked to a department and doctor.

## 8.2 Fields

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Patient | select | Yes | FK → patients.id |
| 2 | Department | select | Yes | FK → departments.id |
| 3 | Doctor | select | Yes | FK → doctors.id |
| 4 | Encounter Type | enum | No | OPD (default), IPD |
| 5 | Visit Type | enum | No | NEW (default), FOLLOW_UP |
| 6 | Visit Date | date | No | Default: today |
| 7 | Token Number | int | Auto | Per doctor+date |
| 8 | Consultation Fee | decimal | No | From department default |
| 9 | Status | enum | Auto | REGISTERED → COMPLETED |
| 10 | Payment Status | enum | Auto | UNPAID, PAID |
| 11 | Referral ID | uuid | No | If created from referral |

## 8.3 Encounter Response (Enhanced)

The encounter detail endpoint now includes full clinical data:

```json
{
  "id": "uuid",
  "uhid": "AHMS-2026-000042",
  "patient_name": "Rajesh Kumar",
  "department_name": "Kaya Chikitsa",
  "doctor_name": "Dr. Priya",
  "encounter_type": "OPD",
  "visit_type": "NEW",
  "status": "COMPLETED",
  "consultations": [
    {
      "consultation_id": "uuid",
      "chief_complaints": "Amlapitta",
      "history": "Burning sensation since 2 weeks",
      "examination": "Tongue coated, pulse tikshna",
      "clinical_notes": "Pitta aggravation",
      "treatment_plan": "Shodhana + Shamana",
      "diet_pathya": "Avoid spicy food",
      "diet_apathya": "No fermented food",
      "ayurveda_fields": { "prakriti": "Pitta", "vikriti": "Pitta" },
      "diagnoses": [
        { "diagnosis": "Hyperacidity", "diagnosis_type": "PRIMARY" }
      ]
    }
  ],
  "diagnoses": [
    { "diagnosis": "Hyperacidity", "diagnosis_type": "PRIMARY" }
  ],
  "prescriptions": [
    {
      "prescription_id": "uuid",
      "status": "DISPENSED",
      "items": [
        {
          "medicine": "Avipattikara Churna",
          "formulation": "Churna",
          "dose": "3g",
          "frequency": "BD",
          "dispensed_qty": 3
        }
      ]
    }
  ]
}
```

---

# 9. Queue Management

## 9.1 Purpose

Real-time view of patient queue for each doctor/department.

## 9.2 Queue States

| State | Icon | Color | Description |
|-------|------|-------|-------------|
| REGISTERED | 📋 | Blue | Just checked in |
| WAITING | ⏳ | Amber | In queue, waiting |
| IN_CONSULTATION | 🔄 | Green | With doctor now |
| COMPLETED | ✅ | Green (dim) | Done |

## 9.3 Queue Display

```
┌─────────────────────────────────────────────────────────────┐
│  Queue — Dr. Priya — Kaya Chikitsa                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Currently Consulting:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  #2  Priya Singh     Amlapitta    Since 9:32 AM    │   │
│  │  ⏱️  15 minutes elapsed                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Next in Queue:                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  #3  Amit Patel      Follow-up    Token #3          │   │
│  │  #4  Sunita Devi     New case     Token #4          │   │
│  │  #5  Mohan Lal       Follow-up    Token #5          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Completed Today: 12                                        │
│  Average Wait: 18 minutes                                   │
│  Average Consultation: 12 minutes                           │
└─────────────────────────────────────────────────────────────┘
```

## 9.3 Gap Analysis

```
Current Implementation:
  - Encounter list with status filter
  - Basic status transitions

Gap:
  - No real-time queue view
  - No estimated wait time
  - No average consultation time
  - No queue reordering
  - No priority queue (emergency cases)
  - No SMS notification when turn arrives

Required Changes:
  - Real-time queue component (WebSocket or polling)
  - Wait time calculation
  - Priority queue support
  - Patient notification system

Priority: P2 (Should Fix)
Estimated Effort: 5-6 days
```

---

# 10. Token Management

## 10.1 Purpose

Auto-generate sequential token numbers per doctor per day for OPD queue management.

## 10.2 Token Format

```
Token #1, Token #2, Token #3, ...
```

- Resets daily
- Per doctor (each doctor has separate sequence)
- Skips cancelled appointments
- Atomic generation with row locking

## 10.3 Token Display

```
┌─────────────────────────────────┐
│  TOKEN                          │
│                                 │
│     #5                          │
│                                 │
│  Dr. Priya Sharma               │
│  Kaya Chikitsa                  │
│  Date: August 5, 2026           │
│  Time: 10:30 AM                 │
│                                 │
│  Please wait for your turn      │
└─────────────────────────────────┘
```

## 10.4 Gap Analysis

```
Current Implementation:
  - Auto token per doctor+date
  - Atomic with row locking

Gap:
  - No printable token slip
  - No token display screen (waiting area)
  - No estimated wait time per token
  - No token history per patient

Required Changes:
  - Token slip print (thermal printer format)
  - Waiting area display screen
  - Wait time estimation
  - Token history on patient profile

Priority: P3 (Nice to Have)
Estimated Effort: 3-4 days
```

---

# 11. Public Appointment Booking

## 11.1 Purpose

Allow patients to book appointments from the hospital website without logging in.

## 11.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Book an Appointment                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Your Details                                        │   │
│  │  Full Name: [________________]                      │   │
│  │  Mobile:    [________________]                      │   │
│  │  Email:     [________________]                      │   │
│  │                                                      │   │
│  │  Appointment Details                                 │   │
│  │  Doctor:   [Select Doctor ▼]                        │   │
│  │  Date:     [YYYY-MM-DD]                             │   │
│  │  Reason:   [________________]                       │   │
│  │                                                      │   │
│  │  [ Book Appointment ]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ✅ Appointment booked successfully!                        │
│  Your token number is #8 with Dr. Priya on Aug 5.          │
│  Please arrive 15 minutes before your appointment.         │
└─────────────────────────────────────────────────────────────┘
```

## 11.3 API Mapping

```
POST /api/v1/public/appointments
Permission: None (public)

Request:
{
  "full_name": "Rajesh Kumar",
  "mobile": "9876543210",
  "email": "rajesh@email.com",
  "doctor_id": "uuid",
  "appointment_date": "2026-08-05",
  "reason": "Follow-up"
}

Response 201:
{
  "success": true,
  "message": "appointment booked",
  "data": {
    "token_number": 8,
    "doctor_name": "Dr. Priya",
    "appointment_date": "2026-08-05"
  }
}
```

## 11.4 Auto Patient Creation

If the mobile number doesn't match an existing patient, the system automatically creates a new patient record:

```go
func (r *repository) FindOrCreatePatient(name, mobile, email string) (*models.Patient, error) {
    // Try to find existing patient
    var patient models.Patient
    err := r.db.Where("mobile = ? AND is_active = ?", mobile, true).First(&patient).Error
    if err == nil {
        return &patient, nil
    }

    // Create new patient
    patient = models.Patient{
        FullName: name,
        Mobile:   mobile,
        Email:    email,
        Gender:   "OTHER", // Default for public bookings
    }
    err = r.CreateWithUHID(&patient)
    return &patient, err
}
```

---

# 12. Gap Analysis Summary

## 12.1 Patient Module

| Gap | Priority | Effort |
|-----|----------|--------|
| Missing fields: Father Name, Aadhar, Occupation, Marital Status | P2 | 2 days |
| No pagination on patient list | P2 | 1 day |
| No advanced filters | P2 | 2 days |
| No export to Excel | P2 | 1 day |
| No duplicate merge tool | P3 | 3 days |
| No family member linking | P3 | 2 days |
| UHID prefix not configurable | P2 | 1 day |
| No UHID label print | P3 | 2 days |

## 12.2 Appointment Module

| Gap | Priority | Effort |
|-----|----------|--------|
| No time slot selection | P2 | 2 days |
| No doctor availability check | P2 | 2 days |
| No appointment reminders | P2 | 3 days |
| No cancellation reason | P3 | 1 day |
| No walk-in distinction | P3 | 1 day |

## 12.3 OPD Workflow

| Gap | Priority | Effort |
|-----|----------|--------|
| No real-time queue view | P2 | 5 days |
| No estimated wait time | P2 | 2 days |
| No priority queue | P3 | 2 days |
| No token slip print | P3 | 2 days |
| No waiting area display | P3 | 3 days |
| No patient notification | P2 | 3 days |

---

# 13. Acceptance Criteria

## 13.1 Patient Registration

- [ ] Patient registered with auto-generated UHID
- [ ] Duplicate mobile detection works (409 response)
- [ ] Force registration bypasses duplicate check
- [ ] All required fields validated
- [ ] Audit log created on registration
- [ ] Redirect to patient detail after registration

## 13.2 Patient List

- [ ] Search works by name, UHID, mobile
- [ ] Pagination works correctly
- [ ] Responsive on all breakpoints
- [ ] Click row navigates to patient detail

## 13.3 Patient Timeline

- [ ] All encounters listed chronologically
- [ ] Consultations, diagnoses, prescriptions shown
- [ ] Department and doctor names displayed
- [ ] Ayurveda fields displayed
- [ ] Referral links work correctly

## 13.4 Appointments

- [ ] Token number auto-generated per doctor+date
- [ ] Token sequence skips cancelled appointments
- [ ] Status update works (SCHEDULED/COMPLETED/CANCELLED)
- [ ] Concurrent bookings don't create duplicate tokens

## 13.5 OPD Workflow

- [ ] Encounter creation works with all fields
- [ ] Status transitions work correctly
- [ ] Queue view shows correct patient list
- [ ] Doctor can start/complete consultation

## 13.6 Public Booking

- [ ] Public can book without login
- [ ] Auto patient creation works
- [ ] Token number returned in response
- [ ] Rate limiting prevents abuse

---

# 14. Developer Checklist

## Backend

- [ ] Patient CRUD endpoints work
- [ ] UHID generation is atomic
- [ ] Duplicate detection works
- [ ] Appointment token generation is atomic
- [ ] Encounter status transitions validated
- [ ] Timeline endpoint returns complete data
- [ ] Public appointment endpoint works
- [ ] Audit logs created for all mutations

## Frontend

- [ ] Patient registration form validates
- [ ] Duplicate warning displays correctly
- [ ] Patient list searches and filters
- [ ] Patient timeline loads completely
- [ ] Appointment booking works
- [ ] Encounter creation works
- [ ] Status updates reflected in UI
- [ ] Responsive on all breakpoints

## Testing

- [ ] Concurrent UHID generation tested
- [ ] Duplicate detection edge cases
- [ ] Token generation under load
- [ ] Status transition validation
- [ ] Timeline data completeness

## Security

- [ ] Patient data access controlled by permissions
- [ ] Public endpoint rate limited
- [ ] No SQL injection in search
- [ ] Input validation on all fields

---

# 15. Future Enhancements

## 15.1 Patient Module

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Patient photo upload | P2 | 2 days |
| Family member linking | P3 | 3 days |
| Patient import from CSV | P3 | 2 days |
| Patient merge tool | P3 | 3 days |
| Patient tags/labels | P3 | 2 days |
| Insurance details | P3 | 2 days |

## 15.2 Appointment Module

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Recurring appointments | P2 | 3 days |
| Appointment reminders (SMS) | P2 | 3 days |
| Online cancellation | P2 | 2 days |
| Wait list management | P3 | 2 days |
| Appointment analytics | P2 | 2 days |

## 15.3 OPD Workflow

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Real-time queue (WebSocket) | P2 | 5 days |
| Waiting area display screen | P3 | 3 days |
| Token slip thermal print | P3 | 2 days |
| Patient SMS on turn | P2 | 2 days |
| Consultation timer | P3 | 1 day |
| Queue reordering | P3 | 2 days |

---

*End of Volume 2 — Patient & OPD*
