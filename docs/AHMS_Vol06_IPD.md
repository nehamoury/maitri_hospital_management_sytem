# AHMS Volume 6 — IPD (In-Patient Department) Module

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

The IPD module manages the complete in-patient lifecycle: **admission → ward/bed assignment → daily nursing care → doctor rounds → treatment administration → discharge**. It extends the OPD patient journey (Vol 2) for patients requiring hospitalization.

### 1.2 Architecture Principle

```
One Patient → One UHID → One Active Admission → One Bed → Multiple Departments
```

A patient can have only **one active admission** at a time. Historical admissions are preserved for records.

### 1.3 Scope Boundaries

| In Scope | Out of Scope |
|----------|-------------|
| Admission workflow (emergency, planned, OPD-to-IPD) | OPD consultation workflows (Vol 2) |
| Bed management & ward allocation | Billing & payments (Vol 7) |
| Nursing care plans & vitals tracking | Panchakarma therapy sessions (Vol 4) |
| Doctor rounds & notes | Pharmacy dispensing (Vol 5) |
| Discharge summary generation | ICU/CCU specific workflows |
| Patient transfer between wards | Operating theatre management |
| Daily treatment orders | Insurance/TPA authorization |
| Attendant/guardian management | |
| Diet orders & meal tracking | |
| IPD-specific reports | |

### 1.4 Architecture Position

```
┌─────────────────────────────────────────────────────────┐
│                    AHMS System                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Patient  │  │   OPD    │  │        IPD           │  │
│  │ Registry │→ │ (Vol 2)  │→ │                      │  │
│  │ (Vol 2)  │  │          │  │  ┌────────────────┐  │  │
│  └──────────┘  └──────────┘  │  │   Admission    │  │  │
│       ↓                       │  └───────┬────────┘  │  │
│  ┌──────────┐                 │          ↓            │  │
│  │Encounter │→ Consultations │  ┌────────────────┐  │  │
│  │(Vol 3)   │                │  │ Bed Management │  │  │
│  └──────────┘                │  └───────┬────────┘  │  │
│                              │          ↓            │  │
│  ┌──────────┐                │  ┌────────────────┐  │  │
│  │Panchakar.│←→ Treatment   │  │ Nursing Care   │  │  │
│  │(Vol 4)   │  Orders       │  └───────┬────────┘  │  │
│  └──────────┘                │          ↓            │  │
│                              │  ┌────────────────┐  │  │
│  ┌──────────┐                │  │   Discharge    │  │  │
│  │Pharmacy  │←→ Medications │  │   Summary      │  │  │
│  │(Vol 5)   │                │  └────────────────┘  │  │
│  └──────────┘                └──────────────────────┘  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Billing  │  │ Reports  │  │     Audit Log        │  │
│  │ (Vol 7)  │  │ (Vol 8)  │  │                      │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Admission** | A patient's hospital stay, from check-in to discharge |
| **Ward** | A physical unit grouping beds (General, Semi-Private, Private, ICU) |
| **Bed** | A physical bed assigned to a patient during admission |
| **Bed Type** | Classification: General, Semi-Private, Private, Suite, ICU, NICU |
| **Admission Type** | Emergency, Planned (scheduled), OPD-to-IPD (convert) |
| **Doctor Round** | Daily physician visit to bedside with notes and orders |
| **Nursing Care Plan** | Structured care tasks assigned to nursing staff per shift |
| **Vitals** | Patient measurements: BP, pulse, temperature, SpO2, respiratory rate |
| **Treatment Order** | Doctor's指令 for medications, procedures, diet, activity |
| **Discharge Summary** | Comprehensive document summarizing the stay |
| **Attendant** | Family member or guardian staying with the patient |
| **Transfer** | Moving patient between beds/wards without discharge |
| **TPA** | Third-Party Administrator (insurance) — not in scope |

---

## 3. Data Models & Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│      Ward        │       │      Bed         │
│──────────────────│       │──────────────────│
│ id (PK, UUID)    │       │ id (PK, UUID)    │
│ name             │       │ ward_id (FK)     │
│ floor            │       │ bed_number       │
│ ward_type        │       │ bed_type         │
│ total_beds       │       │ status           │
│ is_active        │       │ rate_per_day     │
└──────────────────┘       │ is_active        │
                           └────────┬─────────┘
                                    │
                                    │ 1
                                    │
                                    │ *
                           ┌────────┴─────────┐
                           │    Admission     │
                           │──────────────────│
                           │ id (PK, UUID)    │
                           │ patient_id (FK)  │
                           │ admission_number │
                           │ admission_type   │
                           │ admission_date   │
                           │ expected_discharge│
                           │ actual_discharge │
                           │ status           │
                           │ admitting_doctor │
                           │ bed_id (FK)      │
                           │ diagnosis        │
                           │ chief_complaint  │
                           │ notes            │
                           │ discharged_by    │
                           │ discharge_summary│
                           │ created_by       │
                           └────────┬─────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              │ 1                   │ 1                   │ 1
              │                     │                     │
              │ *                   │ *                   │ *
     ┌────────┴─────────┐ ┌────────┴─────────┐ ┌────────┴─────────┐
     │  DoctorRound     │ │  NursingCarePlan │ │  TreatmentOrder  │
     │──────────────────│ │──────────────────│ │──────────────────│
     │ id (PK, UUID)    │ │ id (PK, UUID)    │ │ id (PK, UUID)    │
     │ admission_id(FK) │ │ admission_id(FK) │ │ admission_id(FK) │
     │ doctor_id (FK)   │ │ nurse_id (FK)    │ │ ordered_by (FK)  │
     │ round_date       │ │ shift            │ │ order_type       │
     │ notes            │ │ task_type        │ │ description      │
     │ vitals (JSONB)   │ │ description      │ │ frequency        │
     │ orders           │ │ status           │ │ start_date       │
     │ condition        │ │ completed_at     │ │ end_date         │
     └──────────────────┘ └──────────────────┘ │ status           │
                                               └──────────────────┘
     ┌──────────────────┐
     │    Attendant     │
     │──────────────────│
     │ id (PK, UUID)    │
     │ admission_id(FK) │
     │ name             │
     │ relationship     │
     │ phone            │
     │ id_proof         │
     │ is_primary       │
     └──────────────────┘
```

### 3.2 Model Definitions

#### Ward

```go
// internal/models/ipd.go

type Ward struct {
    BaseModel
    Name        string  `gorm:"size:100;not null;uniqueIndex" json:"name"`
    Floor       int     `gorm:"not null;default:1" json:"floor"`
    WardType    string  `gorm:"size:30;not null" json:"ward_type"` // GENERAL, SEMI_PRIVATE, PRIVATE, SUITE, ICU, NICU, MATERNITY
    TotalBeds   int     `gorm:"not null" json:"total_beds"`
    IsActive    bool    `gorm:"not null;default:true" json:"is_active"`

    Beds []Bed `gorm:"foreignKey:WardID" json:"beds,omitempty"`
}

func (Ward) TableName() string { return "wards" }
```

#### Bed

```go
type Bed struct {
    BaseModel
    WardID     uuid.UUID `gorm:"type:uuid;not null;index" json:"ward_id"`
    Ward       Ward      `gorm:"foreignKey:WardID" json:"ward,omitempty"`
    BedNumber  string    `gorm:"size:20;not null" json:"bed_number"`
    BedType    string    `gorm:"size:30;not null" json:"bed_type"` // GENERAL, SEMI_PRIVATE, PRIVATE, SUITE, ICU
    Status     string    `gorm:"size:20;not null;default:AVAILABLE" json:"status"` // AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, CLEANING
    RatePerDay float64   `gorm:"not null;default:0" json:"rate_per_day"`
    IsActive   bool      `gorm:"not null;default:true" json:"is_active"`

    // Relations
    CurrentAdmission *Admission `gorm:"foreignKey:BedID" json:"current_admission,omitempty"`
}

func (Bed) TableName() string { return "beds" }
```

**Bed Status Machine:**

```
AVAILABLE ──→ OCCUPIED ──→ CLEANING ──→ AVAILABLE
    │              │
    │              ├──→ MAINTENANCE ──→ AVAILABLE
    │              │
    │              └──→ AVAILABLE (on transfer out)
    │
    ├──→ RESERVED ──→ OCCUPIED
    │
    └──→ MAINTENANCE ──→ AVAILABLE
```

#### Admission

```go
type Admission struct {
    BaseModel
    PatientID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"patient_id"`
    Patient           Patient    `gorm:"foreignKey:PatientID" json:"patient,omitempty"`
    AdmissionNumber   string     `gorm:"size:50;uniqueIndex;not null" json:"admission_number"`
    AdmissionType     string     `gorm:"size:20;not null" json:"admission_type"` // EMERGENCY, PLANNED, OPD_TO_IPD
    AdmissionDate     time.Time  `gorm:"not null" json:"admission_date"`
    ExpectedDischarge *time.Time `json:"expected_discharge"`
    ActualDischarge   *time.Time `json:"actual_discharge"`
    Status            string     `gorm:"size:20;not null;default:ACTIVE" json:"status"` // ACTIVE, DISCHARGED, TRANSFERRED, CANCELLED
    AdmittingDoctorID uuid.UUID  `gorm:"type:uuid;not null" json:"admitting_doctor_id"`
    AdmittingDoctor   User       `gorm:"foreignKey:AdmittingDoctorID" json:"admitting_doctor,omitempty"`
    BedID             *uuid.UUID `gorm:"type:uuid;index" json:"bed_id"`
    Bed               *Bed       `gorm:"foreignKey:BedID" json:"bed,omitempty"`
    EncounterID       *uuid.UUID `gorm:"type:uuid;index" json:"encounter_id"` // Link to OPD encounter if OPD-to-IPD
    Encounter         *Encounter `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`
    Diagnosis         string     `gorm:"type:text" json:"diagnosis"`
    ChiefComplaint    string     `gorm:"type:text" json:"chief_complaint"`
    Notes             string     `gorm:"type:text" json:"notes"`
    DischargedBy      *uuid.UUID `gorm:"type:uuid" json:"discharged_by"`
    DischargedByUser  *User      `gorm:"foreignKey:DischargedBy" json:"discharged_by_user,omitempty"`
    DischargeSummary  string     `gorm:"type:text" json:"discharge_summary"`
    CreatedBy         uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`
    CreatedByUser     User       `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`

    // Relations
    DoctorRounds    []DoctorRound    `gorm:"foreignKey:AdmissionID" json:"doctor_rounds,omitempty"`
    NursingCarePlans []NursingCarePlan `gorm:"foreignKey:AdmissionID" json:"nursing_care_plans,omitempty"`
    TreatmentOrders []TreatmentOrder `gorm:"foreignKey:AdmissionID" json:"treatment_orders,omitempty"`
    Attendants      []Attendant      `gorm:"foreignKey:AdmissionID" json:"attendants,omitempty"`
}

func (Admission) TableName() string { return "admissions" }
```

**Admission Number Format:** `IPD-YYYY-NNNNNN` (atomic counter, same pattern as UHID)

**Admission Status Machine:**

```
ACTIVE ──→ DISCHARGED
   │
   ├──→ TRANSFERRED (bed change only, admission stays ACTIVE)
   │
   └──→ CANCELLED (before patient arrives)
```

#### DoctorRound

```go
type DoctorRound struct {
    BaseModel
    AdmissionID uuid.UUID  `gorm:"type:uuid;not null;index" json:"admission_id"`
    Admission   Admission  `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`
    DoctorID    uuid.UUID  `gorm:"type:uuid;not null" json:"doctor_id"`
    Doctor      User       `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`
    RoundDate   time.Time  `gorm:"type:date;not null" json:"round_date"`
    RoundTime   string     `gorm:"size:5;not null" json:"round_time"` // HH:MM
    Notes       string     `gorm:"type:text" json:"notes"`
    Vitals      datatypes.JSON `gorm:"type:jsonb" json:"vitals"` // {bp, pulse, temp, spo2, resp_rate, weight}
    Condition   string     `gorm:"size:50" json:"condition"` // STABLE, IMPROVING, CRITICAL, DETERIORATING
    Orders      string     `gorm:"type:text" json:"orders"` // Free-text orders
    CreatedBy   uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`
}

func (DoctorRound) TableName() string { return "doctor_rounds" }
```

**Vitals JSONB Structure:**
```json
{
  "blood_pressure": "120/80",
  "pulse": 72,
  "temperature": 98.6,
  "spo2": 98,
  "respiratory_rate": 16,
  "weight_kg": 65.5,
  "blood_sugar": 95,
  "notes": "Patient comfortable, no distress"
}
```

#### NursingCarePlan

```go
type NursingCarePlan struct {
    BaseModel
    AdmissionID uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
    Admission   Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`
    NurseID     uuid.UUID `gorm:"type:uuid;not null" json:"nurse_id"`
    Nurse       User      `gorm:"foreignKey:NurseID" json:"nurse,omitempty"`
    Shift       string    `gorm:"size:10;not null" json:"shift"` // MORNING, EVENING, NIGHT
    TaskType    string    `gorm:"size:30;not null" json:"task_type"` // VITALS, MEDICATION, DRESSING, BATH, DIET, EXERCISE, OBSERVATION
    Description string    `gorm:"type:text" json:"description"`
    ScheduledTime string  `gorm:"size:5" json:"scheduled_time"` // HH:MM
    Status      string    `gorm:"size:20;not null;default:PENDING" json:"status"` // PENDING, IN_PROGRESS, COMPLETED, SKIPPED
    CompletedAt *time.Time `json:"completed_at"`
    Notes       string    `gorm:"type:text" json:"notes"`
    CreatedBy   uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`
}

func (NursingCarePlan) TableName() string { return "nursing_care_plans" }
```

#### TreatmentOrder

```go
type TreatmentOrder struct {
    BaseModel
    AdmissionID   uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
    Admission     Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`
    OrderedByID   uuid.UUID `gorm:"type:uuid;not null" json:"ordered_by_id"`
    OrderedBy     User      `gorm:"foreignKey:OrderedByID" json:"ordered_by,omitempty"`
    OrderType     string    `gorm:"size:30;not null" json:"order_type"` // MEDICATION, PROCEDURE, DIET, ACTIVITY, LAB, IMAGING
    Description   string    `gorm:"type:text" json:"description"`
    Frequency     string    `gorm:"size:50" json:"frequency"` // ONCE, DAILY, BID, TID, QID, PRN, WEEKLY
    StartDate     time.Time `gorm:"type:date;not null" json:"start_date"`
    EndDate       *time.Time `gorm:"type:date" json:"end_date"`
    Status        string    `gorm:"size:20;not null;default:ACTIVE" json:"status"` // ACTIVE, COMPLETED, CANCELLED, ON_HOLD
    DiscontinueReason string `gorm:"type:text" json:"discontinue_reason"`
    CreatedBy     uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`
}

func (TreatmentOrder) TableName() string { return "treatment_orders" }
```

#### Attendant

```go
type Attendant struct {
    BaseModel
    AdmissionID  uuid.UUID `gorm:"type:uuid;not null;index" json:"admission_id"`
    Admission    Admission `gorm:"foreignKey:AdmissionID" json:"admission,omitempty"`
    Name         string    `gorm:"size:100;not null" json:"name"`
    Relationship string    `gorm:"size:50;not null" json:"relationship"` // SPOUSE, PARENT, CHILD, SIBLING, OTHER
    Phone        string    `gorm:"size:20" json:"phone"`
    IDProofType  string    `gorm:"size:30" json:"id_proof_type"` // AADHAAR, PAN, PASSPORT, OTHER
    IDProofNumber string   `gorm:"size:50" json:"id_proof_number"`
    IsPrimary    bool      `gorm:"not null;default:false" json:"is_primary"`
    Notes        string    `gorm:"type:text" json:"notes"`
}

func (Attendant) TableName() string { return "attendants" }
```

### 3.3 Database Indexes

```sql
-- Wards
CREATE INDEX idx_wards_ward_type ON wards(ward_type);
CREATE INDEX idx_wards_is_active ON wards(is_active);

-- Beds
CREATE INDEX idx_beds_ward_id ON beds(ward_id);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_bed_type ON beds(bed_type);
CREATE INDEX idx_beds_ward_status ON beds(ward_id, status);

-- Admissions
CREATE INDEX idx_admissions_patient_id ON admissions(patient_id);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_admissions_admission_date ON admissions(admission_date DESC);
CREATE INDEX idx_admissions_bed_id ON admissions(bed_id) WHERE bed_id IS NOT NULL;
CREATE INDEX idx_admissions_admitting_doctor_id ON admissions(admitting_doctor_id);
CREATE INDEX idx_admissions_admission_number ON admissions(admission_number);
CREATE INDEX idx_admissions_patient_status ON admissions(patient_id, status);

-- Doctor Rounds
CREATE INDEX idx_doctor_rounds_admission_id ON doctor_rounds(admission_id);
CREATE INDEX idx_doctor_rounds_doctor_id ON doctor_rounds(doctor_id);
CREATE INDEX idx_doctor_rounds_round_date ON doctor_rounds(round_date DESC);

-- Nursing Care Plans
CREATE INDEX idx_nursing_care_plans_admission_id ON nursing_care_plans(admission_id);
CREATE INDEX idx_nursing_care_plans_nurse_id ON nursing_care_plans(nurse_id);
CREATE INDEX idx_nursing_care_plans_shift_status ON nursing_care_plans(shift, status);

-- Treatment Orders
CREATE INDEX idx_treatment_orders_admission_id ON treatment_orders(admission_id);
CREATE INDEX idx_treatment_orders_ordered_by_id ON treatment_orders(ordered_by_id);
CREATE INDEX idx_treatment_orders_order_type ON treatment_orders(order_type);
CREATE INDEX idx_treatment_orders_status ON treatment_orders(status);

-- Attendants
CREATE INDEX idx_attendants_admission_id ON attendees(admission_id);
```

---

## 4. API Endpoints

All endpoints prefixed with `/api/v1`. Authentication required via Bearer token.

### 4.1 Wards & Beds

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ipd/wards` | List all wards with bed availability | Any authenticated |
| `GET` | `/ipd/wards/:id` | Get ward detail with beds | Any authenticated |
| `POST` | `/ipd/wards` | Create ward | ADMIN |
| `PUT` | `/ipd/wards/:id` | Update ward | ADMIN |
| `DELETE` | `/ipd/wards/:id` | Soft-delete ward | ADMIN |
| `GET` | `/ipd/beds` | List all beds (status, type, ward filters) | Any authenticated |
| `GET` | `/ipd/beds/:id` | Get bed detail with current/last patient | Any authenticated |
| `POST` | `/ipd/beds` | Create bed | ADMIN |
| `PUT` | `/ipd/beds/:id` | Update bed | ADMIN |
| `PATCH` | `/ipd/beds/:id/status` | Change bed status (maintenance, cleaning) | ADMIN, NURSE |
| `GET` | `/ipd/beds/availability` | Bed availability summary by ward/type | RECEPTIONIST, ADMIN |

**Ward List Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "General Ward A",
      "floor": 1,
      "ward_type": "GENERAL",
      "total_beds": 20,
      "available_beds": 5,
      "occupied_beds": 12,
      "reserved_beds": 2,
      "maintenance_beds": 1,
      "beds": [
        {
          "id": "uuid",
          "bed_number": "GWA-01",
          "bed_type": "GENERAL",
          "status": "OCCUPIED",
          "rate_per_day": 500,
          "current_patient": {
            "uhid": "AHMS-2026-000123",
            "first_name": "Priya",
            "last_name": "Sharma"
          }
        }
      ]
    }
  ]
}
```

### 4.2 Admissions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ipd/admissions` | List admissions (status, date, doctor filters) | DOCTOR, NURSE, RECEPTIONIST, ADMIN |
| `GET` | `/ipd/admissions/:id` | Get admission detail with full data | DOCTOR, NURSE, RECEPTIONIST, ADMIN |
| `POST` | `/ipd/admissions` | Create admission (emergency, planned, or OPD-to-IPD) | DOCTOR, RECEPTIONIST |
| `PUT` | `/ipd/admissions/:id` | Update admission details | DOCTOR, ADMIN |
| `PATCH` | `/ipd/admissions/:id/status` | Discharge / cancel admission | DOCTOR |
| `POST` | `/ipd/admissions/:id/transfer` | Transfer to different bed | DOCTOR, NURSE |
| `GET` | `/ipd/admissions/patient/:patientId` | Get admission history for a patient | DOCTOR, RECEPTIONIST, ADMIN |
| `GET` | `/ipd/admissions/active` | List all active admissions | DOCTOR, NURSE, ADMIN |
| `GET` | `/ipd/admissions/today` | Today's admissions and discharges | RECEPTIONIST, ADMIN |

**Create Admission Request (Emergency):**
```json
{
  "patient_id": "uuid",
  "admission_type": "EMERGENCY",
  "admission_date": "2026-08-05T14:30:00Z",
  "bed_id": "uuid",
  "admitting_doctor_id": "uuid",
  "diagnosis": "Acute appendicitis — requires immediate surgical intervention",
  "chief_complaint": "Severe abdominal pain, nausea, fever for 6 hours",
  "notes": "Patient arrived via emergency. Vitals stable. Consent obtained.",
  "attendants": [
    {
      "name": "Rajesh Sharma",
      "relationship": "SPOUSE",
      "phone": "+91-9876543211",
      "id_proof_type": "AADHAAR",
      "id_proof_number": "1234-5678-9012",
      "is_primary": true
    }
  ]
}
```

**Create Admission Request (OPD-to-IPD):**
```json
{
  "patient_id": "uuid",
  "admission_type": "OPD_TO_IPD",
  "encounter_id": "uuid",
  "admission_date": "2026-08-05T16:00:00Z",
  "bed_id": "uuid",
  "admitting_doctor_id": "uuid",
  "diagnosis": "Chronic bronchitis with acute exacerbation",
  "chief_complaint": "Worsening cough, difficulty breathing",
  "notes": "OPD patient admitted due to respiratory distress. Nebulization started."
}
```

**Discharge Request:**
```json
{
  "actual_discharge": "2026-08-08T10:00:00Z",
  "discharge_summary": "## Discharge Summary\n\n**Diagnosis:** Acute appendicitis\n**Procedure:** Laparoscopic appendectomy\n**Duration:** 3 days\n\n### Course:\nPatient presented with acute abdominal pain. Emergency appendectomy performed on Aug 5. Post-operative recovery uneventful. Wound clean, no signs of infection.\n\n### Discharge Medications:\n1. Tab. Amoxicillin 500mg TID x 5 days\n2. Tab. Paracetamamol 500mg PRN\n3. Syrup. Triphala kwath 15ml BID x 7 days\n\n### Instructions:\n- Light diet for 1 week\n- No heavy lifting for 2 weeks\n- Follow-up in 1 week\n- Report if fever, wound redness, or increased pain"
}
```

### 4.3 Doctor Rounds

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ipd/admissions/:id/rounds` | List rounds for admission | DOCTOR, NURSE, ADMIN |
| `GET` | `/ipd/admissions/:id/rounds/:roundId` | Get round detail | DOCTOR, NURSE, ADMIN |
| `POST` | `/ipd/admissions/:id/rounds` | Create doctor round | DOCTOR |
| `PUT` | `/ipd/admissions/:id/rounds/:roundId` | Update round | DOCTOR |
| `GET` | `/ipd/rounds/today` | Today's rounds (all doctors) | DOCTOR, ADMIN |

**Create Doctor Round Request:**
```json
{
  "round_date": "2026-08-06",
  "round_time": "08:30",
  "notes": "Post-op day 1. Patient ambulating, tolerating liquids. Wound clean and dry. Bowel sounds present. Switch to soft diet.",
  "vitals": {
    "blood_pressure": "118/76",
    "pulse": 76,
    "temperature": 98.4,
    "spo2": 98,
    "respiratory_rate": 16,
    "weight_kg": 65.0
  },
  "condition": "IMPROVING",
  "orders": "1. Soft diet\n2. Continue IV antibiotics\n3. Ambulate TID\n4. Discontinue catheter"
}
```

### 4.4 Nursing Care Plans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ipd/admissions/:id/nursing` | List nursing tasks for admission | NURSE, DOCTOR, ADMIN |
| `POST` | `/ipd/admissions/:id/nursing` | Create nursing task | DOCTOR, NURSE |
| `PUT` | `/ipd/admissions/:id/nursing/:taskId` | Update task | NURSE |
| `PATCH` | `/ipd/admissions/:id/nursing/:taskId/status` | Mark task status | NURSE |
| `GET` | `/ipd/nursing/today` | Today's tasks (all nurses, by shift) | NURSE, ADMIN |

**Create Nursing Task:**
```json
{
  "shift": "MORNING",
  "task_type": "VITALS",
  "description": "Record vitals: BP, pulse, temperature, SpO2",
  "scheduled_time": "07:00",
  "notes": "Record before morning medication"
}
```

### 4.5 Treatment Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ipd/admissions/:id/orders` | List treatment orders | DOCTOR, NURSE, PHARMACIST |
| `POST` | `/ipd/admissions/:id/orders` | Create treatment order | DOCTOR |
| `PUT` | `/ipd/admissions/:id/orders/:orderId` | Update order | DOCTOR |
| `PATCH` | `/ipd/admissions/:id/orders/:orderId/status` | Complete/cancel order | DOCTOR |
| `GET` | `/ipd/orders/pending` | Pending orders for pharmacy/nursing | NURSE, PHARMACIST |

**Create Treatment Order (Medication):**
```json
{
  "order_type": "MEDICATION",
  "description": "Tab. Ashwagandha 500mg — 1 tablet BID after food",
  "frequency": "BID",
  "start_date": "2026-08-05",
  "end_date": "2026-08-19",
  "notes": "Continue for 2 weeks post-discharge"
}
```

**Create Treatment Order (Diet):**
```json
{
  "order_type": "DIET",
  "description": "Soft diet. Khichdi, dal, steamed vegetables. No spicy food. Warm water only.",
  "frequency": "DAILY",
  "start_date": "2026-08-06",
  "notes": "Advance to regular diet if tolerated"
}
```

### 4.6 Attendants

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ipd/admissions/:id/attendants` | List attendants | DOCTOR, NURSE, RECEPTIONIST, ADMIN |
| `POST` | `/ipd/admissions/:id/attendants` | Add attendant | RECEPTIONIST, ADMIN |
| `PUT` | `/ipd/admissions/:id/attendants/:attendantId` | Update attendant | RECEPTIONIST, ADMIN |
| `DELETE` | `/ipd/admissions/:id/attendants/:attendantId` | Remove attendant | RECEPTIONIST, ADMIN |

### 4.7 IPD Dashboard & Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ipd/dashboard` | IPD KPIs (occupancy, admissions, discharges) | DOCTOR, NURSE, ADMIN |
| `GET` | `/ipd/reports/occupancy` | Bed occupancy report | ADMIN |
| `GET` | `/ipd/reports/length-of-stay` | Average length of stay by ward/doctor | ADMIN |
| `GET` | `/ipd/reports/admissions` | Admission statistics (date range) | ADMIN |
| `GET` | `/ipd/reports/discharges` | Discharge statistics | ADMIN |

**IPD Dashboard Response:**
```json
{
  "data": {
    "total_beds": 120,
    "occupied_beds": 87,
    "occupancy_rate": 72.5,
    "available_beds": 28,
    "today_admissions": 8,
    "today_discharges": 5,
    "pending_discharges": 3,
    "average_length_ofStay": 4.2,
    "critical_patients": 6,
    "wards": [
      {
        "name": "General Ward A",
        "total": 20,
        "occupied": 18,
        "available": 2,
        "occupancy": 90
      },
      {
        "name": "Private Ward",
        "total": 10,
        "occupied": 6,
        "available": 4,
        "occupancy": 60
      }
    ],
    "recent_admissions": [
      {
        "patient": { "uhid": "AHMS-2026-000130", "name": "Amit Patel" },
        "admission_type": "EMERGENCY",
        "ward": "ICU",
        "bed": "ICU-03",
        "doctor": "Dr. Suresh Kumar",
        "admitted": "2026-08-05T10:30:00Z"
      }
    ]
  }
}
```

---

## 5. Frontend Pages & Components

### 5.1 Admin Navigation

**New sidebar section** in `AdminLayout.tsx`:

```
IPD (collapsible)
├── Dashboard        /admin/ipd/dashboard
├── Admissions       /admin/ipd/admissions
├── Bed Management   /admin/ipd/beds
├── Doctor Rounds    /admin/ipd/rounds
├── Nursing Care     /admin/ipd/nursing
├── Treatment Orders /admin/ipd/orders
└── Reports          /admin/ipd/reports
```

**Sidebar icon:** `Hospital` from Lucide.

### 5.2 Page Inventory

| Page | Route | Primary Role | Description |
|------|-------|-------------|-------------|
| IPDDashboard | `/admin/ipd/dashboard` | All IPD staff | Occupancy, admissions, discharges KPIs |
| AdmissionList | `/admin/ipd/admissions` | Doctor, Nurse, Receptionist | All admissions with status filters |
| AdmissionCreate | `/admin/ipd/admissions/new` | Doctor, Receptionist | New admission form |
| AdmissionDetail | `/admin/ipd/admissions/:id` | All IPD staff | Full admission detail with tabs |
| BedManagement | `/admin/ipd/beds` | Receptionist, Admin | Bed grid with status, assignment |
| DoctorRounds | `/admin/ipd/rounds` | Doctor | Today's rounds list |
| NursingCare | `/admin/ipd/nursing` | Nurse | Today's tasks by shift |
| TreatmentOrders | `/admin/ipd/orders` | Doctor, Nurse | Order entry and tracking |
| AdmissionReports | `/admin/ipd/reports` | Admin | Statistics and analytics |

### 5.3 Page Specifications

#### 5.3.1 IPD Dashboard

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  IPD Dashboard                              [Date: Today]  │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Total   │ Occupied │ Available│ Today's  │  Today's        │
│  Beds    │ Beds     │ Beds     │ Admits   │  Discharges     │
│   120    │   87     │   28     │    8     │    5            │
│          │ (72.5%)  │          │          │                  │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ward-wise Occupancy (Horizontal Bar Chart)         │   │
│  │                                                     │   │
│  │  General A  ██████████████████████████░░░  90% (18/20)│ │
│  │  General B  ████████████████████░░░░░░░░  75% (15/20)│ │
│  │  Semi-Priv  ████████████████████████████░  95% (19/20)│ │
│  │  Private    ████████████████░░░░░░░░░░░░  60% (6/10) │ │
│  │  ICU        █████████████████████████░░░  83% (5/6)  │ │
│  │  Suite      ████████████████░░░░░░░░░░░░  50% (2/4)  │ │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │  Recent Admissions   │  │  Pending Discharges      │   │
│  │                      │  │                          │   │
│  │  🔴 Amit P. ICU-03   │  │  Priya S. — Ready        │   │
│  │  🟡 Meena D. GWA-12  │  │  Rajesh K. — Awaiting Rx │   │
│  │  🟢 Raju M. GWB-05  │  │  Sunita P. — Summary TBD │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  Quick Actions:                                             │
│  [+ New Admission]  [View Beds]  [Today's Rounds]         │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Admission List

**Features:**
- Filter tabs: All | Active | Today's Admits | Today's Discharges | Pending Discharges
- Search by patient name/UHID/admission number
- Sort by admission date, patient name, doctor, ward

**Table Columns:**

| Column | Description |
|--------|-------------|
| Admission # | IPD-2026-000123 |
| Patient | Name + UHID (avatar + text) |
| Type | EMERGENCY (red), PLANNED (blue), OPD→IPD (amber) |
| Doctor | Admitting physician |
| Ward/Bed | Ward name + Bed number |
| Admitted | Date/time |
| LOS | Length of stay (days) |
| Status | ACTIVE (green), DISCHARGED (gray) |
| Actions | View, Discharge (if active) |

#### 5.3.3 Admission Detail (Tabbed)

**Tab Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Admission IPD-2026-000123                        │
│  Patient: Priya Sharma (AHMS-2026-000123)                  │
│  Status: ACTIVE  |  Ward: Private  |  Bed: PRV-02          │
│  Admitted: Aug 5, 2026  |  Doctor: Dr. Anand Vaidya        │
├─────────────────────────────────────────────────────────────┤
│  [Overview] [Rounds] [Nursing] [Orders] [Attendants]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Overview Tab ───────────────────────────────────────┐│
│  │                                                        ││
│  │  Chief Complaint: Severe abdominal pain, nausea        ││
│  │  Diagnosis: Acute appendicitis                         ││
│  │                                                        ││
│  │  ┌─── Latest Vitals (from last round) ──────────────┐ ││
│  │  │ BP: 118/76  Pulse: 72  Temp: 98.4°F              │ ││
│  │  │ SpO2: 98%   Resp: 16   Weight: 65 kg             │ ││
│  │  └──────────────────────────────────────────────────┘ ││
│  │                                                        ││
│  │  ┌─── Active Orders ─────────────────────────────────┐││
│  │  │ 💊 Tab. Amoxicillin 500mg TID                     │││
│  │  │ 💊 Tab. Paracetamol 500mg PRN                     │││
│  │  │ 🍽️ Soft diet                                       │││
│  │  │ 🏃 Ambulate TID                                    │││
│  │  └──────────────────────────────────────────────────┘ ││
│  │                                                        ││
│  │  ┌─── Attendants ───────────────────────────────────┐ ││
│  │  │ 👤 Rajesh Sharma (Spouse) +91-9876543211         │ ││
│  │  └──────────────────────────────────────────────────┘ ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Discharge Patient]  [Transfer Bed]  [Add Order]         │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.4 Bed Management

**Visual Grid Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Bed Management                                             │
│  Filter: [All Wards ▼]  [All Status ▼]  [All Types ▼]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── General Ward A (Floor 1) ──── 90% Occupied ────────┐│
│  │  [GWA-01] [GWA-02] [GWA-03] [GWA-04] [GWA-05]        ││
│  │  🟢 AVAIL  🔴 OCC.  🔴 OCC.  🟡 RESV  🔴 OCC.        ││
│  │                                                         ││
│  │  [GWA-06] [GWA-07] [GWA-08] [GWA-09] [GWA-10]        ││
│  │  🔴 OCC.  🔴 OCC.  ⚪ MAINT 🔴 OCC.  🔴 OCC.         ││
│  │                                                         ││
│  │  [GWA-11] [GWA-12] [GWA-13] [GWA-14] [GWA-15]        ││
│  │  🔴 OCC.  🔴 OCC.  🟢 AVAIL  🔴 OCC.  🔴 OCC.        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── ICU (Floor 3) ──── 83% Occupied ───────────────────┐│
│  │  [ICU-01] [ICU-02] [ICU-03] [ICU-04] [ICU-05] [ICU-06]││
│  │  🔴 OCC.  🔴 OCC.  🔴 OCC.  🔴 OCC.  🔴 OCC.  🟢AVAIL││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Legend: 🟢 Available  🔴 Occupied  🟡 Reserved             │
│          ⚪ Maintenance  🔵 Cleaning                        │
└─────────────────────────────────────────────────────────────┘
```

**Bed Click Modal:**
```
┌─────────────────────────────────┐
│  Bed GWA-03 — OCCUPIED         │
│  Type: General  |  Rate: ₹500/day│
│                                 │
│  Patient: Rajesh Kumar          │
│  UHID: AHMS-2026-000089        │
│  Admitted: Aug 3, 2026          │
│  Doctor: Dr. Suresh Kumar      │
│  LOS: 2 days                    │
│                                 │
│  [Transfer]  [View Admission]   │
│  [Mark as Cleaning]             │
└─────────────────────────────────┘
```

#### 5.3.5 Doctor Rounds Page

**Purpose:** Doctor's daily workflow for patient rounds.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Doctor Rounds — Aug 6, 2026                               │
│  Doctor: Dr. Anand Vaidya                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Patients (12 admissions)                                │
│                                                             │
│  ┌─── Round Cards ────────────────────────────────────────┐│
│  │                                                        ││
│  │  ┌──────────────────┐  ┌──────────────────┐          ││
│  │  │ 🟢 Priya Sharma  │  │ 🟡 Rajesh Kumar  │          ││
│  │  │ PRV-02           │  │ GWA-03           │          ││
│  │  │ LOS: 2 days      │  │ LOS: 3 days      │          ││
│  │  │ Last: Stable     │  │ Last: Improving   │          ││
│  │  │ [Start Round]    │  │ [Start Round]    │          ││
│  │  └──────────────────┘  └──────────────────┘          ││
│  │                                                        ││
│  │  ┌──────────────────┐  ┌──────────────────┐          ││
│  │  │ 🔴 Amit Patel    │  │ 🟢 Meena Devi    │          ││
│  │  │ ICU-03           │  │ GWA-12           │          ││
│  │  │ LOS: 1 day       │  │ LOS: 5 days      │          ││
│  │  │ Last: Critical   │  │ Last: Stable     │          ││
│  │  │ [Start Round]    │  │ [Start Round]    │          ││
│  │  └──────────────────┘  └──────────────────┘          ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Completed Today: 3/12 rounds                               │
│  [██████████░░░░░░░░░░] 25%                                │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.6 Nursing Care Page

**Purpose:** Shift-wise task management for nurses.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Nursing Care — Aug 6, 2026                                 │
│  Shift: [Morning ▼]  Nurse: Kavitha R.                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Tasks (18 patients, 54 tasks)                          │
│  Completed: 12/54 (22%)                                    │
│  [████████░░░░░░░░░░░░]                                    │
│                                                             │
│  ┌─── Task List by Patient ───────────────────────────────┐│
│  │                                                        ││
│  │  📋 Priya Sharma (PRV-02)                             ││
│  │  ├── [✓] 07:00 Vitals — BP, pulse, temp, SpO2         ││
│  │  ├── [ ] 08:00 Medication — Amoxicillin 500mg         ││
│  │  ├── [ ] 09:00 Bath assistance                         ││
│  │  └── [ ] 12:00 Diet — Serve soft lunch                 ││
│  │                                                        ││
│  │  📋 Rajesh Kumar (GWA-03)                             ││
│  │  ├── [✓] 07:00 Vitals                                 ││
│  │  ├── [✓] 08:00 Medication — Triphala kwath            ││
│  │  ├── [ ] 10:00 Dressing change                         ││
│  │  └── [ ] 12:00 Diet — Serve lunch                      ││
│  │                                                        ││
│  │  📋 Amit Patel (ICU-03)                               ││
│  │  ├── [ ] 07:00 Vitals (continuous monitoring)          ││
│  │  ├── [ ] 08:00 Medication — IV antibiotics             ││
│  │  ├── [ ] 09:00 Position change                         ││
│  │  └── [ ] 10:00 Catheter care                           ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Reusable Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `AdmissionCard` | Compact admission info | Dashboard, Lists |
| `BedGrid` | Visual bed layout grid | BedManagement |
| `BedCell` | Single bed status cell | BedGrid |
| `VitalsDisplay` | Vitals with trend indicators | Rounds, AdmissionDetail |
| `RoundCard` | Doctor round entry card | RoundsList |
| `NursingTaskCard` | Nursing task with checkbox | NursingCare |
| `OrderCard` | Treatment order display | OrdersList, AdmissionDetail |
| `AttendantCard` | Attendant info card | AdmissionDetail |
| `DischargeSummaryEditor` | Rich text editor for discharge summary | AdmissionDetail |
| `TransferModal` | Bed transfer form | BedManagement, AdmissionDetail |
| `OccupancyChart` | Ward occupancy bar chart | Dashboard |
| `ShiftSelector` | Morning/Evening/Night toggle | NursingCare |

---

## 6. RBAC & Permissions Matrix

### 6.1 New Permissions

```go
// internal/models/permission.go additions

// IPD Admissions
PermissionIPDAdmissionView    = "ipd.admission.view"
PermissionIPDAdmissionCreate  = "ipd.admission.create"
PermissionIPDAdmissionEdit    = "ipd.admission.edit"
PermissionIPDAdmissionDischarge = "ipd.admission.discharge"
PermissionIPDAdmissionTransfer = "ipd.admission.transfer"
PermissionIPDAdmissionCancel  = "ipd.admission.cancel"

// IPD Beds
PermissionIPDBedView    = "ipd.bed.view"
PermissionIPDBedManage  = "ipd.bed.manage"
PermissionIPDBedAssign  = "ipd.bed.assign"

// IPD Doctor Rounds
PermissionIPDRoundView    = "ipd.round.view"
PermissionIPDRoundCreate  = "ipd.round.create"
PermissionIPDRoundEdit    = "ipd.round.edit"

// IPD Nursing Care
PermissionIPDNursingView    = "ipd.nursing.view"
PermissionIPDNursingCreate  = "ipd.nursing.create"
PermissionIPDNursingEdit    = "ipd.nursing.edit"
PermissionIPDNursingComplete = "ipd.nursing.complete"

// IPD Treatment Orders
PermissionIPDOrderView    = "ipd.order.view"
PermissionIPDOrderCreate  = "ipd.order.create"
PermissionIPDOrderEdit    = "ipd.order.edit"
PermissionIPDOrderCancel  = "ipd.order.cancel"

// IPD Attendants
PermissionIPDAttendantView    = "ipd.attendant.view"
PermissionIPDAttendantCreate  = "ipd.attendant.create"
PermissionIPDAttendantEdit    = "ipd.attendant.edit"
PermissionIPDAttendantDelete  = "ipd.attendant.delete"

// IPD Reports
PermissionIPDReportView     = "ipd.report.view"
PermissionIPDReportExport   = "ipd.report.export"
PermissionIPDDashboardView  = "ipd.dashboard.view"
```

### 6.2 Permission-to-Role Mapping

| Permission | ADMIN | DOCTOR | NURSE | RECEPTIONIST | PHARMACIST |
|------------|:-----:|:------:|:-----:|:------------:|:----------:|
| admission.view | ✓ | ✓(own) | ✓(assigned) | ✓ | — |
| admission.create | ✓ | ✓ | — | ✓ | — |
| admission.edit | ✓ | ✓(own) | — | — | — |
| admission.discharge | ✓ | ✓(own) | — | — | — |
| admission.transfer | ✓ | ✓(own) | ✓(assigned) | — | — |
| admission.cancel | ✓ | ✓(own) | — | — | — |
| bed.view | ✓ | ✓ | ✓ | ✓ | — |
| bed.manage | ✓ | — | — | ✓ | — |
| bed.assign | ✓ | ✓ | — | ✓ | — |
| round.view | ✓ | ✓(own) | ✓(assigned) | — | — |
| round.create | ✓ | ✓(own) | — | — | — |
| round.edit | ✓ | ✓(own) | — | — | — |
| nursing.view | ✓ | ✓(assigned) | ✓(own) | — | — |
| nursing.create | ✓ | ✓ | ✓ | — | — |
| nursing.edit | ✓ | — | ✓(own) | — | — |
| nursing.complete | ✓ | — | ✓(own) | — | — |
| order.view | ✓ | ✓(own) | ✓(assigned) | — | ✓ |
| order.create | ✓ | ✓(own) | — | — | — |
| order.edit | ✓ | ✓(own) | — | — | — |
| order.cancel | ✓ | ✓(own) | — | — | — |
| attendant.view | ✓ | ✓(own) | ✓(assigned) | ✓ | — |
| attendant.create | ✓ | ✓ | — | ✓ | — |
| attendant.edit | ✓ | ✓ | — | ✓ | — |
| attendant.delete | ✓ | — | — | ✓ | — |
| report.view | ✓ | ✓ | — | — | — |
| report.export | ✓ | ✓ | — | — | — |
| dashboard.view | ✓ | ✓ | ✓ | ✓ | — |

---

## 7. Business Logic & Workflows

### 7.1 Admission Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                   ADMISSION LIFECYCLE                          │
│                                                               │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐          │
│  │ Created  │──→│   Active     │──→│  Discharged  │          │
│  └────┬─────┘   └──────┬───────┘   └──────────────┘          │
│       │                │                                      │
│       │                ├──→ Transferred (bed change)          │
│       │                │                                      │
│       └──→ Cancelled   └──→ Cancelled (before arrival)       │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 OPD-to-IPD Conversion Flow

```
OPD Patient → Doctor recommends admission
        │
        ↓
┌──────────────────┐
│ Create Admission │
│ Type: OPD_TO_IPD │
│ Link encounter   │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Assign Bed       │
│ (availability    │
│  check)          │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Transfer OPD     │
│ encounter to     │
│ admission record │
└──────────────────┘
```

### 7.3 Bed Assignment Logic

```go
func (s *Service) AssignBed(admissionID uuid.UUID, bedID uuid.UUID) error {
    // 1. Validate bed exists and is AVAILABLE
    bed, err := s.bedRepo.GetByID(bedID)
    if err != nil || bed.Status != "AVAILABLE" {
        return ErrBedNotAvailable
    }

    // 2. Validate patient has no active admission
    if s.admissionRepo.HasActiveAdmission(patientID) {
        return ErrPatientAlreadyAdmitted
    }

    // 3. Begin transaction
    tx := s.db.Begin()

    // 4. Update bed status → OCCUPIED
    bed.Status = "OCCUPIED"
    tx.Save(&bed)

    // 5. Link bed to admission
    admission.BedID = &bedID
    tx.Save(&admission)

    // 6. Audit log
    tx.Commit()
    return nil
}
```

### 7.4 Discharge Workflow

```
Doctor initiates discharge
        │
        ↓
┌──────────────────┐
│ Complete pending │
│ nursing tasks    │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Settle pharmacy  │
│ (dispense        │
│  discharge Rx)   │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Write discharge  │
│ summary          │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Update admission │
│ Status: DISCHARGED│
│ Bed: → AVAILABLE │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Trigger billing  │
│ finalization     │
└──────────────────┘
```

### 7.5 Nursing Task Auto-Generation

When a new admission is created, nursing care tasks are auto-generated based on ward type:

```go
func (s *Service) GenerateDefaultNursingTasks(admissionID uuid.UUID, wardType string) {
    baseTasks := []NursingCarePlan{
        {TaskType: "VITALS", Description: "Record vitals: BP, pulse, temperature, SpO2", ScheduledTime: "07:00"},
        {TaskType: "VITALS", Description: "Record vitals: BP, pulse, temperature, SpO2", ScheduledTime: "19:00"},
        {TaskType: "DIET", Description: "Serve meals per diet order", ScheduledTime: "08:00"},
        {TaskType: "DIET", Description: "Serve lunch per diet order", ScheduledTime: "12:30"},
        {TaskType: "DIET", Description: "Serve dinner per diet order", ScheduledTime: "19:00"},
        {TaskType: "MEDICATION", Description: "Administer medications per treatment orders", ScheduledTime: "08:00"},
        {TaskType: "MEDICATION", Description: "Administer medications per treatment orders", ScheduledTime: "20:00"},
        {TaskType: "OBSERVATION", Description: "General observation and patient comfort check", ScheduledTime: "10:00"},
        {TaskType: "BATH", Description: "Assist with bathing and hygiene", ScheduledTime: "09:00"},
    }

    // ICU gets additional tasks
    if wardType == "ICU" {
        baseTasks = append(baseTasks,
            NursingCarePlan{TaskType: "VITALS", Description: "Continuous monitoring check", ScheduledTime: "01:00"},
            NursingCarePlan{TaskType: "VITALS", Description: "Continuous monitoring check", ScheduledTime: "05:00"},
            NursingCarePlan{TaskType: "OBSERVATION", Description: "Turn and position patient", ScheduledTime: "02:00"},
        )
    }

    for i := range baseTasks {
        baseTasks[i].AdmissionID = admissionID
        baseTasks[i].Shift = getShift(baseTasks[i].ScheduledTime)
    }
    s.nursingRepo.BatchCreate(baseTasks)
}
```

### 7.6 Admission Number Generation

```go
func (r *Repository) GenerateAdmissionNumber() (string, error) {
    year := time.Now().Year()
    prefix := fmt.Sprintf("IPD-%d-", year)

    // Atomic counter with row locking
    var counter struct {
        Count int
    }
    r.db.Raw("SELECT nextval('admission_counter_%d') as count", year).Scan(&counter)

    return fmt.Sprintf("%s%06d", prefix, counter.Count), nil
}
```

---

## 8. Integration Points

### 8.1 Patient Module (Vol 2)

| Direction | Integration |
|-----------|------------|
| IPD → Patient | Patient lookup by UHID |
| Patient → IPD | Admission history in patient timeline |
| IPD → Patient | Update patient status (ADMITTED) |

### 8.2 Consultation / OPD (Vol 3)

| Direction | Integration |
|-----------|------------|
| OPD → IPD | OPD-to-IPD conversion links encounter |
| IPD → Consultation | IPD creates encounters for daily rounds |
| IPD → Referral | IPD can create referrals to specialists |

### 8.3 Panchakarma (Vol 4)

| Direction | Integration |
|-----------|------------|
| IPD → Panchakarma | Treatment orders trigger PK sessions |
| Panchakarma → IPD | Session results feed back to nursing notes |

### 8.4 Pharmacy (Vol 5)

| Direction | Integration |
|-----------|------------|
| IPD → Pharmacy | Treatment orders (medications) sent to pharmacy |
| Pharmacy → IPD | Dispensing confirmation |
| IPD → Pharmacy | Discharge prescriptions |

### 8.5 Billing (Vol 7)

| Direction | Integration |
|-----------|------------|
| IPD → Billing | Admission triggers billing record |
| IPD → Billing | Daily bed charges auto-generated |
| IPD → Billing | Treatment orders create billing line items |
| IPD → Billing | Discharge finalizes billing |

---

## 9. Design System & UI Components

### 9.1 Color Tokens

```typescript
export const ipdColors = {
  primary: '#0F766E',
  secondary: '#C8A14D',
  background: '#FAF8F2',

  // Admission types
  emergency: '#DC2626',
  planned: '#2563EB',
  opdToIpd: '#D97706',

  // Bed statuses
  bedAvailable: '#059669',
  bedOccupied: '#DC2626',
  bedReserved: '#F59E0B',
  bedMaintenance: '#6B7280',
  bedCleaning: '#2563EB',

  // Condition
  conditionStable: '#059669',
  conditionImproving: '#2563EB',
  conditionCritical: '#DC2626',
  conditionDeteriorating: '#F59E0B',

  // Nursing shifts
  shiftMorning: '#F59E0B',
  shiftEvening: '#2563EB',
  shiftNight: '#6B7280',

  // Task status
  taskPending: '#6B7280',
  taskInProgress: '#2563EB',
  taskCompleted: '#059669',
  taskSkipped: '#DC2626',
};
```

### 9.2 Component Specifications

#### BedCell

```
┌──────────────┐
│ GWA-03       │  ← Bed number
│ 🔴 Occupied  │  ← Status badge (color-coded)
│ Rajesh K.    │  ← Patient name (if occupied)
│ Day 3        │  ← LOS
└──────────────┘
```

#### VitalsDisplay

```
┌─────────────────────────────────────────┐
│  Vitals — Aug 6, 08:30    [Trend ↗️]   │
│                                         │
│  BP     Pulse   Temp    SpO2   Resp    │
│  118/76  72     98.4°F  98%    16      │
│  ✅Normal ✅    ✅Normal ✅    ✅Normal  │
│                                         │
│  Weight: 65 kg  |  Blood Sugar: 95     │
└─────────────────────────────────────────┘
```

#### AdmissionCard

```
┌──────────────────────────────────────┐
│ IPD-2026-000123    🟡 EMERGENCY      │
│──────────────────────────────────────│
│ Priya Sharma (AHMS-2026-000123)     │
│ Dr. Anand Vaidya                     │
│ Private Ward · PRV-02               │
│ Admitted: Aug 5, 2026 · Day 2       │
│ [View Details →]                     │
└──────────────────────────────────────┘
```

---

## 10. State Management & Data Flow

### 10.1 React Query Keys

```typescript
export const ipdKeys = {
  all: ['ipd'] as const,
  wards: () => [...ipdKeys.all, 'wards'] as const,
  beds: () => [...ipdKeys.all, 'beds'] as const,
  bedAvailability: () => [...ipdKeys.beds(), 'availability'] as const,
  admissions: () => [...ipdKeys.all, 'admissions'] as const,
  admission: (id: string) => [...ipdKeys.admissions(), id] as const,
  activeAdmissions: () => [...ipdKeys.admissions(), 'active'] as const,
  todayAdmissions: () => [...ipdKeys.admissions(), 'today'] as const,
  rounds: (admissionId: string) => [...ipdKeys.admission(admissionId), 'rounds'] as const,
  todayRounds: () => [...ipdKeys.all, 'rounds', 'today'] as const,
  nursing: (admissionId: string) => [...ipdKeys.admission(admissionId), 'nursing'] as const,
  todayNursing: () => [...ipdKeys.all, 'nursing', 'today'] as const,
  orders: (admissionId: string) => [...ipdKeys.admission(admissionId), 'orders'] as const,
  attendants: (admissionId: string) => [...ipdKeys.admission(admissionId), 'attendants'] as const,
  dashboard: () => [...ipdKeys.all, 'dashboard'] as const,
  reports: () => [...ipdKeys.all, 'reports'] as const,
};
```

### 10.2 API Service Layer

```typescript
// src/services/ipdApi.ts

import api from '../lib/api';

export const ipdApi = {
  // Wards & Beds
  getWards: () => api.get('/ipd/wards'),
  getWard: (id: string) => api.get(`/ipd/wards/${id}`),
  createWard: (data: any) => api.post('/ipd/wards', data),
  updateWard: (id: string, data: any) => api.put(`/ipd/wards/${id}`, data),
  getBeds: (params?: any) => api.get('/ipd/beds', { params }),
  getBed: (id: string) => api.get(`/ipd/beds/${id}`),
  createBed: (data: any) => api.post('/ipd/beds', data),
  updateBed: (id: string, data: any) => api.put(`/ipd/beds/${id}`, data),
  updateBedStatus: (id: string, status: string) => api.patch(`/ipd/beds/${id}/status`, { status }),
  getBedAvailability: (params?: any) => api.get('/ipd/beds/availability', { params }),

  // Admissions
  getAdmissions: (params?: any) => api.get('/ipd/admissions', { params }),
  getAdmission: (id: string) => api.get(`/ipd/admissions/${id}`),
  createAdmission: (data: any) => api.post('/ipd/admissions', data),
  updateAdmission: (id: string, data: any) => api.put(`/ipd/admissions/${id}`, data),
  dischargeAdmission: (id: string, data: any) => api.patch(`/ipd/admissions/${id}/status`, { status: 'DISCHARGED', ...data }),
  transferBed: (id: string, data: any) => api.post(`/ipd/admissions/${id}/transfer`, data),
  getActiveAdmissions: () => api.get('/ipd/admissions/active'),
  getTodayAdmissions: () => api.get('/ipd/admissions/today'),

  // Doctor Rounds
  getRounds: (admissionId: string) => api.get(`/ipd/admissions/${admissionId}/rounds`),
  createRound: (admissionId: string, data: any) => api.post(`/ipd/admissions/${admissionId}/rounds`, data),
  updateRound: (admissionId: string, roundId: string, data: any) => api.put(`/ipd/admissions/${admissionId}/rounds/${roundId}`, data),
  getTodayRounds: () => api.get('/ipd/rounds/today'),

  // Nursing Care
  getNursingTasks: (admissionId: string) => api.get(`/ipd/admissions/${admissionId}/nursing`),
  createNursingTask: (admissionId: string, data: any) => api.post(`/ipd/admissions/${admissionId}/nursing`, data),
  updateNursingTask: (admissionId: string, taskId: string, data: any) => api.put(`/ipd/admissions/${admissionId}/nursing/${taskId}`, data),
  completeNursingTask: (admissionId: string, taskId: string) => api.patch(`/ipd/admissions/${admissionId}/nursing/${taskId}/status`, { status: 'COMPLETED' }),
  getTodayNursing: (shift?: string) => api.get('/ipd/nursing/today', { params: { shift } }),

  // Treatment Orders
  getOrders: (admissionId: string) => api.get(`/ipd/admissions/${admissionId}/orders`),
  createOrder: (admissionId: string, data: any) => api.post(`/ipd/admissions/${admissionId}/orders`, data),
  updateOrder: (admissionId: string, orderId: string, data: any) => api.put(`/ipd/admissions/${admissionId}/orders/${orderId}`, data),
  cancelOrder: (admissionId: string, orderId: string, reason: string) => api.patch(`/ipd/admissions/${admissionId}/orders/${orderId}/status`, { status: 'CANCELLED', reason }),
  getPendingOrders: () => api.get('/ipd/orders/pending'),

  // Attendants
  getAttendants: (admissionId: string) => api.get(`/ipd/admissions/${admissionId}/attendants`),
  createAttendant: (admissionId: string, data: any) => api.post(`/ipd/admissions/${admissionId}/attendants`, data),
  updateAttendant: (admissionId: string, attendantId: string, data: any) => api.put(`/ipd/admissions/${admissionId}/attendants/${attendantId}`, data),
  deleteAttendant: (admissionId: string, attendantId: string) => api.delete(`/ipd/admissions/${admissionId}/attendants/${attendantId}`),

  // Dashboard & Reports
  getDashboard: () => api.get('/ipd/dashboard'),
  getOccupancyReport: (params?: any) => api.get('/ipd/reports/occupancy', { params }),
  getLOSReport: (params?: any) => api.get('/ipd/reports/length-of-stay', { params }),
  getAdmissionReport: (params?: any) => api.get('/ipd/reports/admissions', { params }),
  getDischargeReport: (params?: any) => api.get('/ipd/reports/discharges', { params }),
};
```

---

## 11. Error Handling & Edge Cases

### 11.1 Validation Rules

| Rule | Field | Error Code |
|------|-------|-----------|
| Admission number unique | admission_number | DUPLICATE_ADMISSION |
| Patient cannot have 2 active admissions | patient_id | PATIENT_ALREADY_ADMITTED |
| Bed must be AVAILABLE for assignment | bed_id | BED_NOT_AVAILABLE |
| Admission date cannot be in future | admission_date | VALIDATION_ERROR |
| Discharge date must be after admission | actual_discharge | VALIDATION_ERROR |
| Round date cannot be before admission | round_date | VALIDATION_ERROR |
| Attendant phone format valid | phone | VALIDATION_ERROR |
| Discharge summary required for discharge | discharge_summary | VALIDATION_ERROR |

### 11.2 Business Rule Violations

| Scenario | Response | HTTP Code |
|----------|----------|-----------|
| Admit to occupied bed | "Bed is already occupied" | 409 Conflict |
| Admit patient with active admission | "Patient already has an active admission" | 409 Conflict |
| Discharge with pending critical orders | "Cannot discharge: critical orders pending" | 422 Unprocessable |
| Transfer to non-existent bed | "Target bed not found" | 404 Not Found |
| Cancel admission after patient arrived | "Cannot cancel: patient already admitted" | 422 Unprocessable |
| Create round before admission date | "Round date cannot be before admission" | 422 Unprocessable |

### 11.3 Edge Cases

| Case | Handling |
|------|----------|
| Emergency admission without bed | Allow admission with bed_id=null, prompt bed assignment |
| Patient leaves AMA (Against Medical Advice) | Discharge with special status, document in summary |
| Patient dies during admission | Special discharge status, mandatory summary |
| Bed maintenance during occupied | Prevent — must transfer first |
| Multiple attendants marked primary | Auto-unset previous primary when new one set |
| Nursing tasks auto-generated on admission | Tasks created for current and next 3 shifts |
| Doctor rounds on admission day | At least one round expected within 24 hours |

---

## 12. Security Considerations

### 12.1 Data Access Controls

- Doctors see only their own patients
- Nurses see only patients in their assigned ward
- Receptionists can view all but not clinical details
- Attendants only visible to admission staff
- Discharge summaries require doctor authentication

### 12.2 Audit Trail

| Event | Action |
|-------|--------|
| Admission created | `ipd.admission.create` |
| Bed assigned | `ipd.bed.assign` |
| Round created | `ipd.round.create` |
| Order created | `ipd.order.create` |
| Discharge | `ipd.admission.discharge` |
| Transfer | `ipd.admission.transfer` |

---

## 13. Performance Optimization

### 13.1 Database Indexes

Critical query patterns:

```sql
-- Active admissions (most frequent dashboard query)
CREATE INDEX idx_admissions_active ON admissions(status, admission_date DESC)
WHERE status = 'ACTIVE';

-- Bed availability
CREATE INDEX idx_beds_available ON beds(ward_id, status)
WHERE status = 'AVAILABLE' AND is_active = true;

-- Today's rounds
CREATE INDEX idx_rounds_today ON doctor_rounds(doctor_id, round_date DESC);

-- Nursing tasks by shift
CREATE INDEX idx_nursing_shift ON nursing_care_plans(shift, status)
WHERE status != 'COMPLETED';

-- Patient admission history
CREATE INDEX idx_admissions_patient_history ON admissions(patient_id, admission_date DESC);
```

### 13.2 Caching

| Data | Cache Duration | Invalidation |
|------|---------------|-------------|
| Ward/bed configuration | 1 hour | On ward/bed CRUD |
| Bed availability | 1 minute | On admission/transfer/discharge |
| Dashboard stats | 2 minutes | On status change |
| Active admissions list | 1 minute | On admission status change |

### 13.3 Query Optimization

```go
// Active admissions with preloads (avoid N+1)
func (r *Repository) ListActiveAdmissions() ([]models.Admission, error) {
    var admissions []models.Admission
    err := r.db.
        Where("status = ?", "ACTIVE").
        Preload("Patient").
        Preload("AdmittingDoctor").
        Preload("Bed.Ward").
        Preload("Attendants").
        Order("admission_date DESC").
        Find(&admissions).Error
    return admissions, err
}
```

---

## 14. Testing Strategy

### 14.1 Backend Unit Tests

| Test | Scenario |
|------|----------|
| Admission number generation | Sequential, no duplicates |
| Bed assignment | Valid bed, patient not already admitted |
| Bed status transitions | AVAILABLE→OCCUPIED→CLEANING→AVAILABLE |
| Discharge workflow | Complete tasks, update status, free bed |
| Nursing task auto-generation | Correct tasks based on ward type |
| Round creation | Date validation, vitals recording |

### 14.2 Backend Integration Tests

| Test | Scenario |
|------|----------|
| Full admission flow | Create → Assign bed → Rounds → Discharge |
| OPD-to-IPD conversion | OPD encounter linked to admission |
| Transfer flow | Transfer bed → Old bed freed → New bed occupied |
| Concurrent bed assignment | Two users assign same bed → One succeeds |
| Discharge with pending tasks | Warning issued, tasks auto-completed |

### 14.3 QA Test Cases

| # | Module | Test Case | Expected | Priority |
|---|--------|-----------|----------|----------|
| 1 | Admission | Emergency admission without bed | Admission created with bed=null | High |
| 2 | Admission | Assign bed to admitted patient | Bed status→OCCUPIED, admission linked | High |
| 3 | Admission | Discharge patient | Status→DISCHARGED, bed→AVAILABLE | High |
| 4 | Bed | View bed grid | Correct status colors, patient info | High |
| 5 | Bed | Transfer patient | Old bed freed, new bed occupied | High |
| 6 | Round | Create doctor round | Vitals recorded, notes saved | Medium |
| 7 | Nursing | View shift tasks | Correct tasks for selected shift | Medium |
| 8 | Nursing | Complete task | Status→COMPLETED, timestamp saved | Medium |
| 9 | Order | Create medication order | Order appears in pending list | Medium |
| 10 | Dashboard | View occupancy | Accurate bed counts per ward | Medium |
| 11 | Attendant | Add primary attendant | Previous primary unset | Low |
| 12 | Reports | View LOS report | Average calculated correctly | Low |

---

## 15. Implementation Phases & Effort

### 15.1 Gap Analysis Summary

| Component | Current State | Gap | Priority | Effort |
|-----------|--------------|-----|----------|--------|
| Ward/Bed models | ❌ Not created | Models + CRUD API + UI | High | 5 days |
| Admission model | ❌ Not created | Model + API + workflow | High | 5 days |
| Doctor Rounds | ❌ Not created | Model + API + UI | High | 4 days |
| Nursing Care | ❌ Not created | Model + API + UI | High | 4 days |
| Treatment Orders | ❌ Not created | Model + API + UI | High | 3 days |
| Attendants | ❌ Not created | Model + CRUD API | Medium | 2 days |
| IPD Dashboard | ❌ Not created | KPIs + occupancy chart | Medium | 3 days |
| Bed Management UI | ❌ Not created | Visual grid + assignment | Medium | 5 days |
| Discharge Summary | ❌ Not created | Editor + workflow | Medium | 3 days |
| Reports (4 reports) | ❌ Not created | Occupancy, LOS, admissions, discharges | Low | 4 days |
| Frontend navigation | ❌ Not added | Sidebar section + routes | Low | 0.5 day |
| **TOTAL** | | | | **~38.5 days (7.7 weeks)** |

### 15.2 Sprint Breakdown

#### Sprint 11.1 — Foundation (Week 1-2) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Ward + Bed models + migration | 1 | Backend |
| Ward + Bed CRUD API | 2 | Backend |
| Admission model + migration | 1 | Backend |
| Admission CRUD + bed assignment API | 3 | Backend |
| Admission number generation | 1 | Backend |
| Backend unit tests | 2 | Backend |

**Deliverables:** Ward/bed management, admission CRUD, bed assignment.

#### Sprint 11.2 — Clinical Features (Week 3-4) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Doctor Rounds API | 2 | Backend |
| Nursing Care API | 2 | Backend |
| Treatment Orders API | 2 | Backend |
| Attendants API | 1 | Backend |
| Discharge workflow | 2 | Backend |
| Backend integration tests | 1 | Backend |

**Deliverables:** All clinical features, discharge workflow.

#### Sprint 11.3 — Frontend Core (Week 5-7) — 15 days

| Task | Days | Owner |
|------|------|-------|
| Frontend navigation + routes | 0.5 | Frontend |
| ipdApi service layer | 0.5 | Frontend |
| Ward/Bed management page (visual grid) | 4 | Frontend |
| Admission list + create form | 3 | Frontend |
| Admission detail (tabbed) | 4 | Frontend |
| Doctor Rounds page | 2 | Frontend |
| Nursing Care page | 2 | Frontend |

**Deliverables:** All core CRUD pages functional.

#### Sprint 11.4 — Dashboard, Reports & Polish (Week 8-9) — 8.5 days

| Task | Days | Owner |
|------|------|-------|
| IPD Dashboard | 2 | Full-stack |
| Treatment Orders page | 1.5 | Frontend |
| Discharge Summary editor | 2 | Frontend |
| Reports (4 reports) | 2 | Full-stack |
| E2E testing & bug fixes | 1 | QA |

**Deliverables:** Dashboard, reports, module ready for UAT.

### 15.3 Dependencies

| Dependency | Blocker? | Mitigation |
|------------|----------|-----------|
| Patient module (Vol 2) | No (existing) | Patient lookup already functional |
| Consultation module (Vol 3) | No (existing) | Encounter linking already supported |
| Pharmacy module (Vol 5) | No | Medication orders are independent |
| Billing module (Vol 7) | No | IPD billing can be added retroactively |

---

## Appendix A: Database Migration SQL

```sql
-- Wards
CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    floor INTEGER NOT NULL DEFAULT 1,
    ward_type VARCHAR(30) NOT NULL,
    total_beds INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Beds
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID NOT NULL REFERENCES wards(id),
    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    rate_per_day DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(ward_id, bed_number)
);

-- Admissions
CREATE TABLE admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    admission_type VARCHAR(20) NOT NULL,
    admission_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_discharge DATE,
    actual_discharge TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    admitting_doctor_id UUID NOT NULL REFERENCES users(id),
    bed_id UUID REFERENCES beds(id),
    encounter_id UUID REFERENCES encounters(id),
    diagnosis TEXT,
    chief_complaint TEXT,
    notes TEXT,
    discharged_by UUID REFERENCES users(id),
    discharge_summary TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Doctor Rounds
CREATE TABLE doctor_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    round_date DATE NOT NULL,
    round_time VARCHAR(5) NOT NULL,
    notes TEXT,
    vitals JSONB DEFAULT '{}',
    condition VARCHAR(50),
    orders TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Nursing Care Plans
CREATE TABLE nursing_care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id),
    nurse_id UUID NOT NULL REFERENCES users(id),
    shift VARCHAR(10) NOT NULL,
    task_type VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    scheduled_time VARCHAR(5),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Treatment Orders
CREATE TABLE treatment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id),
    ordered_by_id UUID NOT NULL REFERENCES users(id),
    order_type VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    frequency VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    discontinue_reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Attendants
CREATE TABLE attendants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id),
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    id_proof_type VARCHAR(30),
    id_proof_number VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_wards_ward_type ON wards(ward_type);
CREATE INDEX idx_beds_ward_id ON beds(ward_id);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_ward_status ON beds(ward_id, status);
CREATE INDEX idx_admissions_patient_id ON admissions(patient_id);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_admissions_admission_date ON admissions(admission_date DESC);
CREATE INDEX idx_admissions_bed_id ON admissions(bed_id) WHERE bed_id IS NOT NULL;
CREATE INDEX idx_admissions_admission_number ON admissions(admission_number);
CREATE INDEX idx_admissions_patient_status ON admissions(patient_id, status);
CREATE INDEX idx_doctor_rounds_admission_id ON doctor_rounds(admission_id);
CREATE INDEX idx_doctor_rounds_doctor_id ON doctor_rounds(doctor_id);
CREATE INDEX idx_doctor_rounds_round_date ON doctor_rounds(round_date DESC);
CREATE INDEX idx_nursing_care_plans_admission_id ON nursing_care_plans(admission_id);
CREATE INDEX idx_nursing_care_plans_nurse_id ON nursing_care_plans(nurse_id);
CREATE INDEX idx_nursing_care_plans_shift_status ON nursing_care_plans(shift, status);
CREATE INDEX idx_treatment_orders_admission_id ON treatment_orders(admission_id);
CREATE INDEX idx_treatment_orders_ordered_by_id ON treatment_orders(ordered_by_id);
CREATE INDEX idx_treatment_orders_order_type ON treatment_orders(order_type);
CREATE INDEX idx_treatment_orders_status ON treatment_orders(status);
CREATE INDEX idx_attendants_admission_id ON attendants(admission_id);
```

---

## Appendix B: Seed Data

### Wards

```go
var WardSeeds = []models.Ward{
    {Name: "General Ward A", Floor: 1, WardType: "GENERAL", TotalBeds: 20},
    {Name: "General Ward B", Floor: 1, WardType: "GENERAL", TotalBeds: 20},
    {Name: "Semi-Private Ward", Floor: 2, WardType: "SEMI_PRIVATE", TotalBeds: 20},
    {Name: "Private Ward", Floor: 2, WardType: "PRIVATE", TotalBeds: 10},
    {Name: "Suite Ward", Floor: 3, WardType: "SUITE", TotalBeds: 4},
    {Name: "ICU", Floor: 3, WardType: "ICU", TotalBeds: 6},
    {Name: "Maternity Ward", Floor: 2, WardType: "MATERNITY", TotalBeds: 10},
}
```

---

*Volume 6 — IPD (In-Patient Department) Module | Last Updated: 2026-08-05*
