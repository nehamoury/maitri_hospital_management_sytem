# AHMS Volume 4 — Panchakarma Module

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

Panchakarma is a **standalone clinical module** within AHMS dedicated to Ayurvedic detoxification and rejuvenation therapies. It is **not** a sub-feature of Consultation — it is an independent treatment pipeline with its own lifecycle: **Prescription → Treatment Plan → Session Scheduling → Session Execution → Progress Tracking → Completion**.

### 1.2 Scope Boundaries

| In Scope | Out of Scope |
|----------|-------------|
| Treatment plan creation & management | General consultation workflows (Vol 3) |
| Therapy session scheduling & execution | Pharmacy dispensing (Vol 5) |
| Therapist assignment & availability | IPD bed management (Vol 6) |
| Oil, herb & material tracking per session | Billing & payments (Vol 7) |
| Pre/post-procedure instructions | Patient portal views (Vol 9) |
| Progress tracking & outcome scoring | Diagnostic lab integration (future) |
| Treatment photography & body-map notes | |
| Panchakarma-specific dashboards | |

### 1.3 Architecture Position

```
┌─────────────────────────────────────────────────────────┐
│                    AHMS System                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Patient  │  │  OPD /   │  │    PANCHAKARMA       │  │
│  │ Registry │→ │ Consult  │→ │                      │  │
│  │ (Vol 2)  │  │ (Vol 3)  │  │  ┌────────────────┐  │  │
│  └──────────┘  └──────────┘  │  │ Treatment Plan │  │  │
│       ↓                       │  └───────┬────────┘  │  │
│  ┌──────────┐                 │          ↓            │  │
│  │ Referral │←─────────────── │  ┌────────────────┐  │  │
│  │ (Vol 3)  │                 │  │ Therapy Session│  │  │
│  └──────────┘                 │  └───────┬────────┘  │  │
│                               │          ↓            │  │
│  ┌──────────┐                 │  ┌────────────────┐  │  │
│  │ Pharmacy │←─────────────── │  │ Session Record │  │  │
│  │ (Vol 5)  │                 │  │  & Progress    │  │  │
│  └──────────┘                 │  └────────────────┘  │  │
│                               └──────────────────────┘  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Billing  │  │ Reports  │  │     Audit Log        │  │
│  │ (Vol 7)  │  │ (Vol 8)  │  │                      │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.4 User Roles Involved

| Role | Primary Interaction |
|------|-------------------|
| PANCHAKARMA_DOCTOR | Plans treatments, reviews progress, approves completion |
| PANCHAKARMA_THERAPIST | Executes sessions, logs observations, updates status |
| PANCHAKARMA_NURSE | Assists sessions, manages materials, tracks inventory |
| RECEPTIONIST | Schedules appointments, manages patient flow |
| PHARMACIST | Supplies herbs/oils, confirms material availability |
| ADMIN | Full CRUD, reports, configuration |
| PATIENT | Views own treatment plan & session history (portal) |

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Treatment Plan** | A prescribed course of Panchakarma therapies for a specific patient over a defined duration |
| **Therapy Session** | A single execution of one therapy (e.g., one Abhyanga session) |
| **Session Slot** | A scheduled time window for a therapy session |
| **Therapist** | A practitioner who performs hands-on Panchakarma therapies |
| **Therapy Type** | Classification of Panchakarma procedure (Abhyanga, Shirodhara, Basti, etc.) |
| **Purvakarma** | Preparatory procedures (Snehana, Swedana) |
| **Pradhankarma** | Main Panchakarma procedure |
| **Paschatkarma** | Post-procedure care (diet, rest, observation) |
| **Oil/Material** | Consumable items used during therapy sessions |
| **Outcome Score** | Standardized assessment of therapy effectiveness (1-10 scale) |
| **Session Status** | State machine: Scheduled → InProgress → Completed / Cancelled / NoShow |

---

## 3. Data Models & Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│  TreatmentPlan   │       │   TherapyType    │
│──────────────────│       │──────────────────│
│ id (PK, UUID)    │       │ id (PK, UUID)    │
│ patient_id (FK)  │       │ name             │
│ doctor_id (FK)   │       │ category         │
│ encounter_id(FK) │       │ duration_minutes │
│ department_id(FK)│       │ description      │
│ plan_name        │       │ contraindications│
│ status           │       │ is_active        │
│ start_date       │       └────────┬─────────┘
│ estimated_end    │                │
│ actual_end       │                │ 1
│ diagnosis_notes  │                │
│ treatment_goals  │                │
│ total_sessions   │                │
│ notes            │                │ *
│ created_by (FK)  │       ┌────────┴─────────┐
│ created_at       │       │  TreatmentSession │
│ updated_at       │       │──────────────────│
└────────┬─────────┘       │ id (PK, UUID)    │
         │                 │ plan_id (FK)     │
         │ 1               │ therapy_type_id  │
         │                 │ therapist_id(FK) │
         │ *               │ session_number   │
┌────────┴─────────┐       │ scheduled_date   │
│  SessionSchedule │       │ scheduled_time   │
│──────────────────│       │ duration_minutes │
│ id (PK, UUID)    │       │ status           │
│ session_id (FK)  │       │ actual_start     │
│ slot_date        │       │ actual_end       │
│ slot_time        │       │ pre_procedure    │
│ duration_minutes │       │ post_procedure   │
│ status           │       │ therapist_notes  │
│ notes            │       │ patient_feedback │
│ created_by (FK)  │       │ outcome_score    │
│ created_at       │       │ outcome_notes    │
└──────────────────┘       │ oil_used (JSONB) │
                           │ materials(JSONB) │
                           │ body_map (JSONB) │
                           │ photographs(JSONB)│
                           │ created_by (FK)  │
                           │ created_at       │
                           │ updated_at       │
                           └────────┬─────────┘
                                    │
                                    │ 1
                                    │
                                    │ *
                           ┌────────┴─────────┐
                           │  SessionMaterial │
                           │──────────────────│
                           │ id (PK, UUID)    │
                           │ session_id (FK)  │
                           │ medicine_id (FK) │
                           │ quantity_used    │
                           │ unit             │
                           │ oil_ml           │
                           │ notes            │
                           │ created_at       │
                           └──────────────────┘
```

### 3.2 Model Definitions

#### TherapyType

```go
// internal/models/panchakarma.go

type TherapyType struct {
    BaseModel
    Name             string         `gorm:"size:100;not null;uniqueIndex" json:"name"`
    Category         string         `gorm:"size:50;not null" json:"category"` // PURVAKARMA, PRADHANKARMA, PASCHATKARMA
    SanskritName     string         `gorm:"size:100" json:"sanskrit_name"`
    DurationMinutes  int            `gorm:"not null;default:30" json:"duration_minutes"`
    Description      string         `gorm:"type:text" json:"description"`
    Contraindications string        `gorm:"type:text" json:"contraindications"`
    Benefits         string         `gorm:"type:text" json:"benefits"`
    PreparationNotes string        `gorm:"type:text" json:"preparation_notes"`
    IsActive         bool           `gorm:"not null;default:true" json:"is_active"`
    SortOrder        int            `gorm:"not null;default:0" json:"sort_order"`
}
```

**Seed data** (9 standard Panchakarma therapies):

| Name | Category | Duration (min) | Sanskrit |
|------|----------|---------------|----------|
| Abhyanga | PRADHANKARMA | 60 | अभ्यंग |
| Shirodhara | PRADHANKARMA | 45 | शिरोधारा |
| Basti | PRADHANKARMA | 30 | बस्ति |
| Nasya | PRADHANKARMA | 20 | नस्य |
| Virechana | PRADHANKARMA | 30 | विरेचन |
| Raktamokshana | PRADHANKARMA | 30 | रक्तमोक्षण |
| Snehana | PURVAKARMA | 30 | स्नेहन |
| Swedana | PURVAKARMA | 20 | स्वेदन |
| Paschatkarma | PASCHATKARMA | 15 | पश्चात्कर्म |

#### TreatmentPlan

```go
type TreatmentPlan struct {
    BaseModel
    PatientID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"patient_id"`
    DoctorID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"doctor_id"`
    EncounterID    *uuid.UUID     `gorm:"type:uuid;index" json:"encounter_id"`
    DepartmentID   *uuid.UUID     `gorm:"type:uuid;index" json:"department_id"`
    PlanName       string         `gorm:"size:200;not null" json:"plan_name"`
    Status         string         `gorm:"size:20;not null;default:DRAFT" json:"status"` // DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
    StartDate      *time.Time     `json:"start_date"`
    EstimatedEnd   *time.Time     `json:"estimated_end"`
    ActualEnd      *time.Time     `json:"actual_end"`
    DiagnosisNotes string         `gorm:"type:text" json:"diagnosis_notes"`
    TreatmentGoals string         `gorm:"type:text" json:"treatment_goals"`
    TotalSessions  int            `gorm:"not null;default:0" json:"total_sessions"`
    CompletedCount int            `gorm:"not null;default:0" json:"completed_count"`
    Notes          string         `gorm:"type:text" json:"notes"`

    // Relations
    Patient    Patient         `gorm:"foreignKey:PatientID" json:"patient,omitempty"`
    Doctor     User            `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`
    Encounter  *Encounter      `gorm:"foreignKey:EncounterID" json:"encounter,omitempty"`
    Department *Department     `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
    Sessions   []TreatmentSession `gorm:"foreignKey:PlanID" json:"sessions,omitempty"`
}
```

**Status Machine:**

```
DRAFT ──→ ACTIVE ──→ COMPLETED
  │          │
  │          ├──→ PAUSED ──→ ACTIVE
  │          │
  │          └──→ CANCELLED
  │
  └──→ CANCELLED
```

#### TreatmentSession

```go
type TreatmentSession struct {
    BaseModel
    PlanID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"plan_id"`
    TherapyTypeID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"therapy_type_id"`
    TherapistID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"therapist_id"`
    SessionNumber  int            `gorm:"not null" json:"session_number"`
    ScheduledDate  time.Time      `gorm:"type:date;not null" json:"scheduled_date"`
    ScheduledTime  string         `gorm:"size:5;not null" json:"scheduled_time"` // HH:MM
    DurationMinutes int           `gorm:"not null;default:30" json:"duration_minutes"`
    Status         string         `gorm:"size:20;not null;default:SCHEDULED" json:"status"` // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
    ActualStart    *time.Time     `json:"actual_start"`
    ActualEnd      *time.Time     `json:"actual_end"`
    PreProcedure   string         `gorm:"type:text" json:"pre_procedure"` // Pre-procedure checklist/notes
    PostProcedure  string         `gorm:"type:text" json:"post_procedure"` // Post-procedure care notes
    TherapistNotes string         `gorm:"type:text" json:"therapist_notes"`
    PatientFeedback string        `gorm:"type:text" json:"patient_feedback"`
    OutcomeScore   *int           `json:"outcome_score"` // 1-10
    OutcomeNotes   string         `gorm:"type:text" json:"outcome_notes"`
    OilUsed        datatypes.JSON `gorm:"type:jsonb" json:"oil_used"` // [{name, ml, brand}]
    Materials      datatypes.JSON `gorm:"type:jsonb" json:"materials"` // [{name, quantity, unit}]
    BodyMap        datatypes.JSON `gorm:"type:jsonb" json:"body_map"` // [{region, condition, notes}]
    Photographs    datatypes.JSON `gorm:"type:jsonb" json:"photographs"` // [{url, caption, timestamp}]
    CancelledReason string        `gorm:"type:text" json:"cancelled_reason"`

    // Relations
    Plan       TreatmentPlan   `gorm:"foreignKey:PlanID" json:"plan,omitempty"`
    TherapyType TherapyType    `gorm:"foreignKey:TherapyTypeID" json:"therapy_type,omitempty"`
    Therapist  User            `gorm:"foreignKey:TherapistID" json:"therapist,omitempty"`
    Materials_ []SessionMaterial `gorm:"foreignKey:SessionID" json:"materials_detail,omitempty"`
}
```

**Session Status Machine:**

```
SCHEDULED ──→ IN_PROGRESS ──→ COMPLETED
    │              │
    │              └──→ CANCELLED
    │
    ├──→ CANCELLED
    │
    └──→ NO_SHOW
```

#### SessionMaterial

```go
type SessionMaterial struct {
    BaseModel
    SessionID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"session_id"`
    MedicineID   *uuid.UUID `gorm:"type:uuid;index" json:"medicine_id"` // FK to pharmacy.medicines
    MaterialName string     `gorm:"size:200;not null" json:"material_name"`
    QuantityUsed float64    `gorm:"not null;default:0" json:"quantity_used"`
    Unit         string     `gorm:"size:20;not null" json:"unit"` // ML, GRAM, PIECE, TABLET
    OilML        float64    `gorm:"not null;default:0" json:"oil_ml"`
    Notes        string     `gorm:"type:text" json:"notes"`

    Session TreatmentSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
    Medicine *Medicine       `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
}
```

### 3.3 Database Indexes

```sql
-- TreatmentPlan
CREATE INDEX idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_doctor_id ON treatment_plans(doctor_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX idx_treatment_plans_encounter_id ON treatment_plans(encounter_id);

-- TreatmentSession
CREATE INDEX idx_treatment_sessions_plan_id ON treatment_sessions(plan_id);
CREATE INDEX idx_treatment_sessions_therapist_id ON treatment_sessions(therapist_id);
CREATE INDEX idx_treatment_sessions_therapy_type_id ON treatment_sessions(therapy_type_id);
CREATE INDEX idx_treatment_sessions_scheduled_date ON treatment_sessions(scheduled_date);
CREATE INDEX idx_treatment_sessions_status ON treatment_sessions(status);
CREATE INDEX idx_treatment_sessions_scheduled_date_status ON treatment_sessions(scheduled_date, status);

-- SessionMaterial
CREATE INDEX idx_session_materials_session_id ON session_materials(session_id);
CREATE INDEX idx_session_materials_medicine_id ON session_materials(medicine_id);
```

### 3.4 GORM AutoMigrate

```go
// In cmd/api/main.go — existing pattern
db.AutoMigrate(
    &models.TherapyType{},
    &models.TreatmentPlan{},
    &models.TreatmentSession{},
    &models.SessionMaterial{},
)
```

---

## 4. API Endpoints

All endpoints prefixed with `/api/v1`. Authentication required via Bearer token.

### 4.1 Therapy Types

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/panchakarma/therapy-types` | List all therapy types (paginated, filterable) | Any authenticated |
| `GET` | `/panchakarma/therapy-types/:id` | Get therapy type details | Any authenticated |
| `POST` | `/panchakarma/therapy-types` | Create therapy type | ADMIN |
| `PUT` | `/panchakarma/therapy-types/:id` | Update therapy type | ADMIN |
| `DELETE` | `/panchakarma/therapy-types/:id` | Soft-delete therapy type (set is_active=false) | ADMIN |

**Query Parameters:**
- `category` — Filter by PURVAKARMA / PRADHANKARMA / PASCHATKARMA
- `is_active` — Filter by active status (default: true)
- `search` — Fuzzy search on name/sanskrit_name

### 4.2 Treatment Plans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/panchakarma/plans` | List treatment plans (paginated, filtered) | PANCHAKARMA_DOCTOR, ADMIN |
| `GET` | `/panchakarma/plans/:id` | Get plan with sessions | PANCHAKARMA_DOCTOR, THERAPIST, ADMIN |
| `POST` | `/panchakarma/plans` | Create treatment plan | PANCHAKARMA_DOCTOR |
| `PUT` | `/panchakarma/plans/:id` | Update plan details | PANCHAKARMA_DOCTOR |
| `PATCH` | `/panchakarma/plans/:id/status` | Change plan status (activate, pause, complete, cancel) | PANCHAKARMA_DOCTOR |
| `GET` | `/panchakarma/plans/:id/sessions` | Get all sessions for a plan | PANCHAKARMA_DOCTOR, THERAPIST, ADMIN |
| `GET` | `/panchakarma/plans/patient/:patientId` | Get all plans for a patient | PANCHAKARMA_DOCTOR, RECEPTIONIST, ADMIN |

**Create Plan Request:**
```json
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "encounter_id": "uuid",
  "department_id": "uuid",
  "plan_name": "7-Day Detox - Abhyanga & Shirodhara",
  "start_date": "2026-08-10",
  "estimated_end": "2026-08-16",
  "diagnosis_notes": "Vata imbalance, chronic stress, insomnia",
  "treatment_goals": "Reduce Vata, improve sleep quality, detoxify ama",
  "total_sessions": 14,
  "notes": "Patient prefers morning sessions",
  "sessions": [
    {
      "therapy_type_id": "uuid",
      "session_number": 1,
      "scheduled_date": "2026-08-10",
      "scheduled_time": "08:00",
      "duration_minutes": 60,
      "therapist_id": "uuid"
    },
    {
      "therapy_type_id": "uuid",
      "session_number": 2,
      "scheduled_date": "2026-08-10",
      "scheduled_time": "10:00",
      "duration_minutes": 45,
      "therapist_id": "uuid"
    }
  ]
}
```

**Plan List Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "plan_name": "7-Day Detox - Abhyanga & Shirodhara",
      "patient": {
        "id": "uuid",
        "first_name": "Priya",
        "last_name": "Sharma",
        "uhid": "AHMS-2026-000123"
      },
      "doctor": {
        "id": "uuid",
        "first_name": "Dr. Anand",
        "last_name": "Vaidya"
      },
      "status": "ACTIVE",
      "start_date": "2026-08-10",
      "estimated_end": "2026-08-16",
      "total_sessions": 14,
      "completed_count": 5,
      "sessions": [
        {
          "id": "uuid",
          "therapy_type": { "name": "Abhyanga", "category": "PRADHANKARMA" },
          "therapist": { "first_name": "Kavitha", "last_name": "R" },
          "session_number": 1,
          "scheduled_date": "2026-08-10",
          "scheduled_time": "08:00",
          "status": "COMPLETED",
          "outcome_score": 8
        }
      ],
      "created_at": "2026-08-09T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

### 4.3 Treatment Sessions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/panchakarma/sessions` | List sessions (date range, therapist, status filters) | PANCHAKARMA_DOCTOR, THERAPIST, ADMIN |
| `GET` | `/panchakarma/sessions/:id` | Get session detail with materials | PANCHAKARMA_DOCTOR, THERAPIST, ADMIN |
| `POST` | `/panchakarma/sessions` | Create a single session (add to plan) | PANCHAKARMA_DOCTOR |
| `PUT` | `/panchakarma/sessions/:id` | Update session details | PANCHAKARMA_DOCTOR, THERAPIST |
| `PATCH` | `/panchakarma/sessions/:id/status` | Start, complete, cancel, mark no-show | PANCHAKARMA_DOCTOR, THERAPIST |
| `PATCH` | `/panchakarma/sessions/:id/notes` | Add/update therapist notes and observations | THERAPIST |
| `PATCH` | `/panchakarma/sessions/:id/outcome` | Record outcome score and feedback | PANCHAKARMA_DOCTOR |
| `GET` | `/panchakarma/sessions/therapist/:therapistId` | Get sessions for a specific therapist | THERAPIST, ADMIN |
| `GET` | `/panchakarma/sessions/today` | Get today's sessions (all therapists) | PANCHAKARMA_DOCTOR, THERAPIST, ADMIN |
| `GET` | `/panchakarma/sessions/calendar` | Calendar view data (month/week) | PANCHAKARMA_DOCTOR, THERAPIST, RECEPTIONIST, ADMIN |

**Start Session Request:**
```json
{
  "pre_procedure": "Patient has applied Tila taila. No adverse reactions observed. BP: 120/80. Pulse: Vata type.",
  "materials": [
    {
      "material_name": "Tila Taila",
      "oil_ml": 200,
      "quantity_used": 200,
      "unit": "ML"
    },
    {
      "material_name": "Cotton towels",
      "quantity_used": 3,
      "unit": "PIECE"
    }
  ]
}
```

**Complete Session Request:**
```json
{
  "post_procedure": "Patient rested for 15 minutes post-Abhyanga. Warm water bath provided. No discomfort reported.",
  "therapist_notes": "Oil absorption was excellent. Patient reported feeling deeply relaxed. Slight tenderness in lumbar region noted.",
  "patient_feedback": "Felt very relaxed. Sleep improved last night. Mild headache after session.",
  "outcome_score": 8,
  "outcome_notes": "Good response to Abhyanga. Continue for 3 more sessions.",
  "photographs": [
    {
      "url": "/uploads/sessions/uuid-pre.jpg",
      "caption": "Pre-Abhyanga skin condition",
      "timestamp": "2026-08-10T08:00:00Z"
    },
    {
      "url": "/uploads/sessions/uuid-post.jpg",
      "caption": "Post-Abhyanga skin condition",
      "timestamp": "2026-08-10T09:05:00Z"
    }
  ],
  "body_map": [
    {
      "region": "lumbar",
      "condition": "mild_tenderness",
      "notes": "Slight tenderness on palpation"
    }
  ]
}
```

**Session Calendar Response:**
```json
{
  "data": [
    {
      "date": "2026-08-10",
      "sessions": [
        {
          "id": "uuid",
          "time": "08:00",
          "duration_minutes": 60,
          "therapy_type": { "name": "Abhyanga" },
          "patient": { "first_name": "Priya", "uhid": "AHMS-2026-000123" },
          "therapist": { "first_name": "Kavitha" },
          "status": "COMPLETED",
          "room": "PK Room 1"
        }
      ],
      "total_sessions": 8,
      "completed": 6,
      "upcoming": 2
    }
  ]
}
```

### 4.4 Therapists

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/panchakarma/therapists` | List active Panchakarma therapists | Any authenticated |
| `GET` | `/panchakarma/therapists/:id` | Get therapist profile with schedule | PANCHAKARMA_DOCTOR, ADMIN |
| `GET` | `/panchakarma/therapists/:id/schedule` | Get therapist's session schedule (date range) | PANCHAKARMA_DOCTOR, THERAPIST, ADMIN |
| `GET` | `/panchakarma/therapists/:id/stats` | Therapist performance stats (sessions, outcomes) | PANCHAKARMA_DOCTOR, ADMIN |
| `PUT` | `/panchakarma/therapists/:id/availability` | Update therapist availability | ADMIN |

### 4.5 Materials & Oil Tracking

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/panchakarma/materials/usage` | Material usage report (date range) | PANCHAKARMA_DOCTOR, ADMIN |
| `GET` | `/panchakarma/materials/low-stock` | Materials that need restocking (links to Pharmacy) | PANCHAKARMA_NURSE, ADMIN |
| `POST` `/panchakarma/materials/request` | Request material from Pharmacy | THERAPIST, NURSE |
| `GET` | `/panchakarma/materials/patient/:patientId` | Materials used for a specific patient | PANCHAKARMA_DOCTOR, ADMIN |

### 4.6 Reports & Dashboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/panchakarma/dashboard` | Panchakarma KPIs (today's sessions, utilization, outcomes) | PANCHAKARMA_DOCTOR, ADMIN |
| `GET` | `/panchakarma/reports/outcomes` | Treatment outcome analysis (date range, therapy type) | PANCHAKARMA_DOCTOR, ADMIN |
| `GET` | `/panchakarma/reports/utilization` | Room/therapist utilization report | ADMIN |
| `GET` | `/panchakarma/reports/patient-progress/:patientId` | Patient's full treatment journey | PANCHAKARMA_DOCTOR |

---

## 5. Frontend Pages & Components

### 5.1 Admin Navigation

**New sidebar section** in `AdminLayout.tsx`:

```
PANCHAKARMA (collapsible)
├── Dashboard       /admin/panchakarma/dashboard
├── Treatment Plans  /admin/panchakarma/plans
├── Sessions        /admin/panchakarma/sessions
├── Calendar        /admin/panchakarma/calendar
├── Therapists      /admin/panchakarma/therapists
├── Therapy Types   /admin/panchakarma/therapy-types
└── Reports         /admin/panchakarma/reports
```

**Sidebar icon:** `Sprout` from Lucide (represents natural healing/detox).

### 5.2 Page Inventory

| Page | Route | Primary Role | Description |
|------|-------|-------------|-------------|
| PanchakarmaDashboard | `/admin/panchakarma/dashboard` | Doctor, Admin | Today's sessions, KPIs, quick actions |
| TreatmentPlanList | `/admin/panchakarma/plans` | Doctor, Admin | Searchable list of all treatment plans |
| TreatmentPlanCreate | `/admin/panchakarma/plans/new` | Doctor | Create new plan with session scheduling |
| TreatmentPlanDetail | `/admin/panchakarma/plans/:id` | Doctor, Therapist | Plan detail with session timeline |
| SessionList | `/admin/panchakarma/sessions` | Doctor, Therapist | All sessions (filterable by date/therapist/status) |
| SessionDetail | `/admin/panchakarma/sessions/:id` | Therapist | Single session view with notes/materials |
| SessionCalendar | `/admin/panchakarma/calendar` | All PK staff | Calendar/grid view of sessions |
| TherapistList | `/admin/panchakarma/therapists` | Doctor, Admin | Therapist directory with availability |
| TherapistDetail | `/admin/panchakarma/therapists/:id` | Doctor, Admin | Therapist profile, schedule, stats |
| TherapyTypeList | `/admin/panchakarma/therapy-types` | Admin | Manage therapy type master data |
| PanchakarmaReports | `/admin/panchakarma/reports` | Doctor, Admin | Outcome & utilization reports |

### 5.3 Page Specifications

#### 5.3.1 Panchakarma Dashboard

**Purpose:** At-a-glance view for Panchakarma department head and therapists.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Panchakarma Dashboard                        [Date: Today]│
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Today's │  Active  │ Completed│  Avg     │  Therapist      │
│ Sessions │  Plans   │ (Week)   │ Outcome  │  Utilization    │
│    12    │    8     │    34    │   7.8    │     72%         │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Today's Sessions Timeline                          │   │
│  │                                                     │   │
│  │  08:00 ██████████████ Abhyanga - Priya S. ✓ DONE   │   │
│  │  08:30 ░░░░░░░░░░░░░░ Basti - Rajesh K.  🔄 NOW   │   │
│  │  09:00 ░░░░░░░░░░░░░░ Shirodhara - Amit P. ⏳     │   │
│  │  10:00 ░░░░░░░░░░░░░░ Nasya - Meena D.   ⏳       │   │
│  │  ...                                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │  Therapy Distribution│  │  This Week's Outcomes    │   │
│  │  (Pie Chart)         │  │  (Bar Chart)             │   │
│  │  Abhyanga: 35%       │  │  Mon: 7.2  Tue: 7.5     │   │
│  │  Shirodhara: 25%     │  │  Wed: 7.8  Thu: 8.1     │   │
│  │  Basti: 20%          │  │  Fri: 7.9  Sat: 7.6     │   │
│  │  Others: 20%         │  │  Sun: -                  │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  Quick Actions:                                             │
│  [+ New Plan]  [Schedule Session]  [View Calendar]         │
└─────────────────────────────────────────────────────────────┘
```

**KPI Cards:**
- Today's Sessions (count, with completed/in-progress/upcoming breakdown)
- Active Treatment Plans
- Completed Sessions (this week)
- Average Outcome Score (last 30 days)
- Therapist Utilization % (today)

#### 5.3.2 Treatment Plan List

**Purpose:** Browse, search, and filter all treatment plans.

**Features:**
- Search bar: patient name, UHID, plan name
- Status filter tabs: All | Active | Draft | Paused | Completed | Cancelled
- Sortable columns: Patient, Doctor, Start Date, Status, Progress
- Row actions: View, Edit (if DRAFT), Activate, Pause, Complete
- Progress bar showing completed/total sessions

**Table Columns:**

| Column | Description |
|--------|-------------|
| Patient | Name + UHID (avatar + text) |
| Plan Name | Plan title |
| Doctor | Assigned Panchakarma doctor |
| Start Date | Treatment start |
| Duration | Start → Estimated End |
| Progress | ████████░░ 8/14 sessions |
| Status | Colored badge (ACTIVE=green, DRAFT=gray, etc.) |
| Actions | View / Edit / Status Change |

#### 5.3.3 Treatment Plan Create/Edit

**Purpose:** Create a comprehensive treatment plan with inline session scheduling.

**Form Sections:**

1. **Patient Selection** (search by name/UHID, shows patient summary)
2. **Doctor Assignment** (pre-filled if creating from encounter)
3. **Plan Details** (name, diagnosis notes, treatment goals, notes)
4. **Schedule** (start date, estimated end date)
5. **Session Builder** (interactive table to add therapy sessions)

**Session Builder:**
```
┌─────────────────────────────────────────────────────────────┐
│  Session Builder                                    [Clear] │
├────┬────────────┬──────┬────────┬──────┬──────────┬────────┤
│ #  │ Therapy    │ Date │ Time   │ Dur. │ Therapist│ Action │
├────┼────────────┼──────┼────────┼──────┼──────────┼────────┤
│ 1  │ Abhyanga   │8/10  │ 08:00  │ 60m  │ Kavitha  │ ✎  🗑  │
│ 2  │ Shirodhara │8/10  │ 10:00  │ 45m  │ Kavitha  │ ✎  🗑  │
│ 3  │ Basti      │8/11  │ 08:00  │ 30m  │ Ramesh   │ ✎  🗑  │
│ 4  │ Abhyanga   │8/11  │ 10:00  │ 60m  │ Kavitha  │ ✎  🗑  │
├────┴────────────┴──────┴────────┴──────┴──────────┴────────┤
│  [+ Add Session]  [+ Bulk Generate (pattern)]              │
│                                                             │
│  Summary: 4 sessions over 2 days                            │
│  Estimated cost: ₹4,800 (based on therapy rates)            │
└─────────────────────────────────────────────────────────────┘
```

**Bulk Generate:** Allows creating recurring sessions by pattern:
- Therapy Type: Abhyanga
- Frequency: Daily
- Time: 08:00
- Therapist: Kavitha
- Duration: 7 days → auto-generates 7 sessions

#### 5.3.4 Treatment Plan Detail

**Purpose:** View complete plan with all sessions in timeline + progress tracking.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Treatment Plan: 7-Day Detox                      │
│                                                             │
│  ┌─── Patient Info ──────┐  ┌─── Plan Summary ───────────┐│
│  │ Priya Sharma           │  │ Status: ACTIVE             ││
│  │ UHID: AHMS-2026-000123│  │ Started: Aug 10, 2026      ││
│  │ Age: 35  F             │  │ Est. End: Aug 16, 2026     ││
│  │ Vata Prakriti          │  │ Progress: ████████░░ 57%   ││
│  └───────────────────────┘  └────────────────────────────┘│
│                                                             │
│  ┌─── Treatment Goals ────────────────────────────────────┐│
│  │ • Reduce Vata aggravation                              ││
│  │ • Improve sleep quality (target: 7+ hours)             ││
│  │ • Detoxify accumulated ama                             ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Session Timeline ───────────────────────────────────┐│
│  │                                                         ││
│  │  Day 1 - Aug 10 ✓                                     ││
│  │  ├── 08:00 Abhyanga (60m) — Kavitha — Score: 8/10 ✓   ││
│  │  └── 10:00 Shirodhara (45m) — Kavitha — Score: 7/10 ✓ ││
│  │                                                         ││
│  │  Day 2 - Aug 11 ✓                                     ││
│  │  ├── 08:00 Basti (30m) — Ramesh — Score: 7/10 ✓       ││
│  │  └── 10:00 Abhyanga (60m) — Kavitha — Score: 9/10 ✓   ││
│  │                                                         ││
│  │  Day 3 - Aug 12 🔄                                    ││
│  │  ├── 08:00 Nasya (20m) — Kavitha — IN PROGRESS        ││
│  │  └── 10:00 Swedana (20m) — Ramesh — SCHEDULED          ││
│  │                                                         ││
│  │  ... (more days)                                        ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Edit Plan]  [Add Session]  [Pause Plan]  [Complete Plan] │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.5 Session Detail

**Purpose:** Full session view for therapist to execute and record observations.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Session #3 — Basti                            │
│  Status: IN_PROGRESS                        [Complete] [Cancel]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Patient ──────────┐  ┌─── Session Info ────────────┐│
│  │ Priya Sharma          │  │ Therapy: Basti              ││
│  │ UHID: AHMS-2026-000123│  │ Scheduled: Aug 12, 08:00   ││
│  │ Allergies: None       │  │ Duration: 30 min           ││
│  │ Contraindications:    │  │ Therapist: Ramesh           ││
│  │  - Active skin inf.   │  │ Room: PK Room 2            ││
│  └───────────────────────┘  └────────────────────────────┘│
│                                                             │
│  ┌─── Pre-Procedure Checklist ────────────────────────────┐│
│  │ [✓] Patient informed about procedure                   ││
│  │ [✓] Vital signs recorded (BP: 118/76, Pulse: 72)      ││
│  │ [✓] Allergy check completed                           ││
│  │ [✓] Medication reconciliation done                    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Materials Used ─────────────────────────────────────┐│
│  │ Material          Qty     Unit    Notes                ││
│  │ ─────────────────────────────────────────              ││
│  │ Dashmool Kwath   200     ML      Warm                 ││
│  │ Sesame Oil        50     ML                          ││
│  │ Cotton bandage    2      PIECE                       ││
│  │ [+] Add Material                                       ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Body Map ───────────────────────────────────────────┐│
│  │ [Interactive body diagram - click to annotate regions] ││
│  │ Lumbar: mild tenderness (pre-existing)                 ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Therapist Notes ────────────────────────────────────┐│
│  │ [Text area for session observations]                   ││
│  │ Patient tolerated procedure well. Good Basti           ││
│  │ retention time (~25 minutes). Mild cramping            ││
│  │ reported at 10-minute mark, resolved spontaneously.    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Photographs ────────────────────────────────────────┐│
│  │ [📷] Pre-procedure    [📷] Post-procedure              ││
│  │ [Upload Photo]       [Upload Photo]                    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Outcome ────────────────────────────────────────────┐│
│  │ Score: [●●●●●●●○○○] 7/10                              ││
│  │ Patient Feedback: [text area]                          ││
│  │ Doctor Review: [text area]                             ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.6 Session Calendar

**Purpose:** Visual calendar view of all Panchakarma sessions.

**Views:**
- **Week View:** Columns = Days, Rows = Time slots (06:00–20:00)
- **Month View:** Day cells with session count badges
- **Day View:** Detailed hourly schedule per therapist/room

**Week View Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Aug 2026 →    Week of Aug 10    [Week] [Month] [Day]  │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│  Time    │  Mon 10  │  Tue 11  │  Wed 12  │  Thu 13  ...  │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  08:00   │ ████████ │ ████████ │ ░░░░░░░░ │ ░░░░░░░░       │
│          │ Abhyanga │ Basti    │ Nasya    │ Abhyanga       │
│          │ Priya S. │ Priya S. │ Priya S. │ Rajesh K.     │
│          │ Kavitha✓ │ Ramesh ✓ │ Kavitha🔄│ Kavitha⏳      │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  10:00   │ ████████ │ ████████ │ ░░░░░░░░ │ ░░░░░░░░       │
│          │ Shirodhara│ Abhyanga│ Swedana  │ Shirodhara     │
│          │ Priya S. │ Priya S. │ Priya S. │ Meena D.      │
│          │ Kavitha✓ │ Kavitha✓ │ Ramesh⏳ │ Kavitha⏳      │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│  14:00   │ ████████ │ ░░░░░░░░ │ ████████ │ ░░░░░░░░       │
│          │ Basti    │ Nasya    │ Abhyanga │ Basti          │
│          │ Rajesh K.│ Amit P.  │ Meena D. │ Priya S.      │
│          │ Ramesh ✓ │ Kavitha🔄│ Ramesh⏳ │ Ramesh⏳       │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

**Color coding:**
- 🟢 Green: Completed
- 🔵 Blue: In Progress
- 🟡 Yellow: Scheduled
- 🔴 Red: Cancelled/No Show
- ⚪ Gray: Draft

### 5.4 Reusable Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `SessionCard` | Compact card for session in lists/grids | Calendar, Dashboard, SessionList |
| `SessionTimeline` | Vertical timeline of sessions in a plan | PlanDetail |
| `TherapyBadge` | Colored badge with therapy icon + name | Everywhere sessions shown |
| `OutcomeScore` | Visual score indicator (1-10, colored) | SessionDetail, Reports |
| `MaterialTable` | Editable table of materials used | SessionDetail |
| `BodyMap` | Interactive body diagram with region annotations | SessionDetail |
| `TreatmentProgress` | Progress bar with completed/total count | PlanList, PlanDetail |
| `TherapistAvatar` | Avatar with name + availability indicator | Calendar, TherapistList |
| `OilVolumeIndicator` | Visual gauge of oil used (ml) | SessionDetail, Reports |

---

## 6. RBAC & Permissions Matrix

### 6.1 New Permissions

```go
// Permission constants (added to internal/models/permission.go)

// Panchakarma Treatment Plans
PermissionPanchakarmaPlanView    = "panchakarma.plan.view"
PermissionPanchakarmaPlanCreate  = "panchakarma.plan.create"
PermissionPanchakarmaPlanEdit    = "panchakarma.plan.edit"
PermissionPanchakarmaPlanDelete  = "panchakarma.plan.delete"
PermissionPanchakarmaPlanApprove = "panchakarma.plan.approve"

// Panchakarma Sessions
PermissionPanchakarmaSessionView    = "panchakarma.session.view"
PermissionPanchakarmaSessionCreate  = "panchakarma.session.create"
PermissionPanchakarmaSessionEdit    = "panchakarma.session.edit"
PermissionPanchakarmaSessionDelete  = "panchakarma.session.delete"
PermissionPanchakarmaSessionStart   = "panchakarma.session.start"
PermissionPanchakarmaSessionComplete= "panchakarma.session.complete"
PermissionPanchakarmaSessionCancel  = "panchakarma.session.cancel"

// Panchakarma Therapists
PermissionPanchakarmaTherapistView    = "panchakarma.therapist.view"
PermissionPanchakarmaTherapistAssign  = "panchakarma.therapist.assign"
PermissionPanchakarmaTherapistManage  = "panchakarma.therapist.manage"

// Panchakarma Materials
PermissionPanchakarmaMaterialView    = "panchakarma.material.view"
PermissionPanchakarmaMaterialRequest = "panchakarma.material.request"
PermissionPanchakarmaMaterialTrack   = "panchakarma.material.track"

// Panchakarma Reports
PermissionPanchakarmaReportView     = "panchakarma.report.view"
PermissionPanchakarmaReportExport   = "panchakarma.report.export"
PermissionPanchakarmaDashboardView  = "panchakarma.dashboard.view"
```

### 6.2 Permission-to-Role Mapping

| Permission | ADMIN | PK_DOCTOR | PK_THERAPIST | PK_NURSE | RECEPTIONIST | PHARMACIST |
|------------|:-----:|:---------:|:------------:|:--------:|:------------:|:----------:|
| plan.view | ✓ | ✓ | ✓(own) | ✓(assigned) | ✓ | — |
| plan.create | ✓ | ✓ | — | — | — | — |
| plan.edit | ✓ | ✓ | — | — | — | — |
| plan.delete | ✓ | ✓ | — | — | — | — |
| plan.approve | ✓ | ✓ | — | — | — | — |
| session.view | ✓ | ✓ | ✓(own) | ✓(assigned) | ✓ | — |
| session.create | ✓ | ✓ | — | — | — | — |
| session.edit | ✓ | ✓ | ✓(own) | ✓(assigned) | — | — |
| session.delete | ✓ | ✓ | — | — | — | — |
| session.start | ✓ | ✓ | ✓(own) | — | — | — |
| session.complete | ✓ | ✓ | ✓(own) | — | — | — |
| session.cancel | ✓ | ✓ | — | — | — | — |
| therapist.view | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| therapist.assign | ✓ | ✓ | — | — | — | — |
| therapist.manage | ✓ | — | — | — | — | — |
| material.view | ✓ | ✓ | ✓(assigned) | ✓ | — | ✓ |
| material.request | ✓ | ✓ | ✓ | ✓ | — | — |
| material.track | ✓ | — | — | ✓ | — | ✓ |
| report.view | ✓ | ✓ | — | — | — | — |
| report.export | ✓ | ✓ | — | — | — | — |
| dashboard.view | ✓ | ✓ | ✓ | ✓ | ✓ | — |

### 6.3 Seed Permission Registration

```go
// In internal/database/database.go SeedPermissions()

// Panchakarma Treatment Plans
{Name: "panchakarma.plan.view", Module: "panchakarma", Action: "view", Description: "View treatment plans"},
{Name: "panchakarma.plan.create", Module: "panchakarma", Action: "create", Description: "Create treatment plans"},
{Name: "panchakarma.plan.edit", Module: "panchakarma", Action: "edit", Description: "Edit treatment plans"},
{Name: "panchakarma.plan.delete", Module: "panchakarma", Action: "delete", Description: "Delete treatment plans"},
{Name: "panchakarma.plan.approve", Module: "panchakarma", Action: "approve", Description: "Approve treatment plans"},

// Panchakarma Sessions
{Name: "panchakarma.session.view", Module: "panchakarma", Action: "view", Description: "View therapy sessions"},
{Name: "panchakarma.session.create", Module: "panchakarma", Action: "create", Description: "Create therapy sessions"},
{Name: "panchakarma.session.edit", Module: "panchakarma", Action: "edit", Description: "Edit therapy sessions"},
{Name: "panchakarma.session.delete", Module: "panchakarma", Action: "delete", Description: "Delete therapy sessions"},
{Name: "panchakarma.session.start", Module: "panchakarma", Action: "start", Description: "Start therapy sessions"},
{Name: "panchakarma.session.complete", Module: "panchakarma", Action: "complete", Description: "Complete therapy sessions"},
{Name: "panchakarma.session.cancel", Module: "panchakarma", Action: "cancel", Description: "Cancel therapy sessions"},

// Panchakarma Therapists
{Name: "panchakarma.therapist.view", Module: "panchakarma", Action: "view", Description: "View therapists"},
{Name: "panchakarma.therapist.assign", Module: "panchakarma", Action: "assign", Description: "Assign therapists to sessions"},
{Name: "panchakarma.therapist.manage", Module: "panchakarma", Action: "manage", Description: "Manage therapist profiles"},

// Panchakarma Materials
{Name: "panchakarma.material.view", Module: "panchakarma", Action: "view", Description: "View material usage"},
{Name: "panchakarma.material.request", Module: "panchakarma", Action: "request", Description: "Request materials from pharmacy"},
{Name: "panchakarma.material.track", Module: "panchakarma", Action: "track", Description: "Track material inventory"},

// Panchakarma Reports
{Name: "panchakarma.report.view", Module: "panchakarma", Action: "view", Description: "View Panchakarma reports"},
{Name: "panchakarma.report.export", Module: "panchakarma", Action: "export", Description: "Export Panchakarma reports"},
{Name: "panchakarma.dashboard.view", Module: "panchakarma", Action: "view", Description: "View Panchakarma dashboard"},
```

### 6.4 Role Permission Grants

```go
// In SeedRoles() — PANCHAKARMA_DOCTOR
Permissions: []string{
    // Clinical
    "patients.view",
    "appointments.manage",
    "consultations.view",
    "consultations.create",
    "encounters.manage",
    "diagnosis.create",
    "referrals.create",
    // Panchakarma
    "panchakarma.plan.view", "panchakarma.plan.create", "panchakarma.plan.edit", "panchakarma.plan.delete", "panchakarma.plan.approve",
    "panchakarma.session.view", "panchakarma.session.create", "panchakarma.session.edit", "panchakarma.session.delete",
    "panchakarma.session.start", "panchakarma.session.complete", "panchakarma.session.cancel",
    "panchakarma.therapist.view", "panchakarma.therapist.assign",
    "panchakarma.material.view", "panchakarma.material.request",
    "panchakarma.report.view", "panchakarma.report.export", "panchakarma.dashboard.view",
    "dashboard.view",
},

// PANCHAKARMA_THERAPIST
Permissions: []string{
    "patients.view",
    "encounters.view",
    "panchakarma.plan.view",
    "panchakarma.session.view", "panchakarma.session.edit",
    "panchakarma.session.start", "panchakarma.session.complete",
    "panchakarma.therapist.view",
    "panchakarma.material.view", "panchakarma.material.request",
    "panchakarma.dashboard.view",
},

// PANCHAKARMA_NURSE
Permissions: []string{
    "patients.view",
    "panchakarma.plan.view",
    "panchakarma.session.view",
    "panchakarma.material.view", "panchakarma.material.request", "panchakarma.material.track",
    "panchakarma.dashboard.view",
},
```

---

## 7. Business Logic & Workflows

### 7.1 Treatment Plan Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    PLAN LIFECYCLE                              │
│                                                               │
│  ┌─────────┐    ┌─────────┐    ┌──────────────┐              │
│  │  Draft  │───→│ Active  │───→│  Completed   │              │
│  └────┬────┘    └────┬────┘    └──────────────┘              │
│       │              │                                        │
│       │              ├──→ Paused ──→ Active                   │
│       │              │                                        │
│       │              └──→ Cancelled                           │
│       │                                                       │
│       └──→ Cancelled                                          │
└──────────────────────────────────────────────────────────────┘
```

**Status transition rules:**

| From | To | Condition | Actor |
|------|----|-----------|-------|
| DRAFT | ACTIVE | Start date reached or manual activation | Doctor |
| DRAFT | CANCELLED | Plan no longer needed | Doctor |
| ACTIVE | PAUSED | Temporary hold (patient illness, travel) | Doctor |
| ACTIVE | COMPLETED | All sessions finished or goals met | Doctor |
| ACTIVE | CANCELLED | Treatment abandoned | Doctor |
| PAUSED | ACTIVE | Resume treatment | Doctor |

### 7.2 Session Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                   SESSION LIFECYCLE                            │
│                                                               │
│  ┌───────────┐   ┌──────────────┐   ┌─────────────┐          │
│  │ Scheduled │──→│ In Progress  │──→│  Completed  │          │
│  └─────┬─────┘   └──────┬───────┘   └─────────────┘          │
│        │                │                                     │
│        ├──→ Cancelled   └──→ Cancelled                        │
│        │                                                     │
│        └──→ No Show                                          │
└──────────────────────────────────────────────────────────────┘
```

**Session transition rules:**

| From | To | Condition | Actor |
|------|----|-----------|-------|
| SCHEDULED | IN_PROGRESS | Therapist starts procedure | Therapist/Doctor |
| SCHEDULED | CANCELLED | Patient cancels or contraindication | Doctor/Therapist |
| SCHEDULED | NO_SHOW | Patient doesn't arrive | Auto (after 30 min) or Therapist |
| IN_PROGRESS | COMPLETED | Procedure finished | Therapist/Doctor |
| IN_PROGRESS | CANCELLED | Adverse reaction, patient distress | Doctor |

### 7.3 Auto-Cancellation Rule

Sessions remaining in `SCHEDULED` status for more than 30 minutes past `scheduled_time + duration_minutes` are automatically marked as `NO_SHOW`. A cron job runs every 15 minutes:

```go
// internal/panchakarma/cron.go

func (s *Service) AutoMarkNoShows() {
    threshold := time.Now().Add(-30 * time.Minute)
    s.repo.UpdateSessionStatusByCondition(
        "SCHEDULED",
        "NO_SHOW",
        "scheduled_date <= ? AND scheduled_time < ?",
        threshold.Date(), threshold.Format("15:04"),
    )
}
```

### 7.4 Material Tracking Workflow

```
┌──────────────────────────────────────────────────────────────┐
│              MATERIAL TRACKING WORKFLOW                        │
│                                                               │
│  1. Therapist records materials used during session           │
│     └─→ SessionMaterial records created                      │
│                                                               │
│  2. If medicine_id linked:                                    │
│     └─→ Pharmacy inventory decremented (soft reservation)     │
│     └─→ Low-stock alert if below threshold                   │
│                                                               │
│  3. If standalone material (no medicine_id):                  │
│     └─→ Tracked in oil_used JSONB field                       │
│     └─→ Aggregated in material usage reports                 │
│                                                               │
│  4. End of day:                                               │
│     └─→ Material usage summary generated                     │
│     └─→ Stock reconciliation with Pharmacy                   │
└──────────────────────────────────────────────────────────────┘
```

### 7.5 Outcome Scoring Algorithm

The outcome score (1-10) combines:

| Factor | Weight | Source |
|--------|--------|--------|
| Patient self-assessment | 40% | patient_feedback (parsed) |
| Therapist observation | 30% | therapist_notes (parsed) |
| Clinical indicators | 30% | Body map changes, vital signs |

**Score interpretation:**

| Score | Interpretation | Action |
|-------|---------------|--------|
| 1-3 | Poor response | Review treatment plan, consider modification |
| 4-5 | Mild improvement | Continue, monitor closely |
| 6-7 | Moderate improvement | Continue as planned |
| 8-9 | Good response | Continue, consider extending if beneficial |
| 10 | Excellent response | Document as case study, consider discharge |

### 7.6 Conflict Detection

When scheduling a session, the system checks:

1. **Therapist conflict:** No overlapping sessions for the same therapist
2. **Room conflict:** If room tracking enabled, no double-booking
3. **Patient conflict:** Patient doesn't have another session at the same time
4. **Contraindication check:** Therapy type vs patient conditions

```go
func (s *Service) CheckSchedulingConflicts(session *models.TreatmentSession) []Conflict {
    var conflicts []Conflict

    // Therapist availability
    if s.repo.HasOverlappingSession(session.TherapistID, session.ScheduledDate,
        session.ScheduledTime, session.DurationMinutes, session.ID) {
        conflicts = append(conflicts, Conflict{
            Type:    "THERAPIST_UNAVAILABLE",
            Message: "Therapist has another session at this time",
        })
    }

    // Patient availability
    if s.repo.HasPatientConflict(session.Plan.PatientID, session.ScheduledDate,
        session.ScheduledTime, session.DurationMinutes, session.ID) {
        conflicts = append(conflicts, Conflict{
            Type:    "PATIENT_CONFLICT",
            Message: "Patient has another session scheduled at this time",
        })
    }

    return conflicts
}
```

### 7.7 Plan Auto-Completion

When the last session in a plan is completed, the plan status automatically transitions to `COMPLETED`:

```go
func (s *Service) OnSessionCompleted(sessionID uuid.UUID) error {
    session, _ := s.repo.GetSessionByID(sessionID)
    plan, _ := s.repo.GetPlanByID(session.PlanID)

    plan.CompletedCount++

    if plan.CompletedCount >= plan.TotalSessions {
        plan.Status = "COMPLETED"
        now := time.Now()
        plan.ActualEnd = &now
    }

    return s.repo.UpdatePlan(plan)
}
```

---

## 8. Integration Points

### 8.1 Patient Module (Vol 2)

| Integration | Direction | Details |
|-------------|-----------|---------|
| Patient lookup | Panchakarma → Patient | Search by UHID/name for plan creation |
| Patient history | Panchakarma → Patient | View patient demographics, allergies, conditions |
| UHID display | Bidirectional | Treatment plans display patient UHID |

### 8.2 Consultation / OPD (Vol 3)

| Integration | Direction | Details |
|-------------|-----------|---------|
| Encounter linking | Consultation → Panchakarma | Treatment plan links to encounter_id |
| Prescription trigger | Consultation → Panchakarma | Doctor prescribes Panchakarma in consultation → creates plan draft |
| Diagnosis notes | Bidirectional | Plan inherits diagnosis from encounter |

### 8.3 Pharmacy (Vol 5)

| Integration | Direction | Details |
|-------------|-----------|---------|
| Material lookup | Panchakarma → Pharmacy | Fetch available herbs/oils/medicines |
| Stock deduction | Panchakarma → Pharmacy | Session material usage decrements inventory |
| Low-stock alerts | Pharmacy → Panchakarma | Alert when materials run low |
| Material request | Panchakarma → Pharmacy | Formal request workflow for supplies |

**Pharmacy API Calls:**

```go
// Request from Panchakarma to Pharmacy
POST /api/v1/pharmacy/materials/request
{
    "requester_id": "therapist_uuid",
    "items": [
        { "medicine_id": "uuid", "quantity": 500, "unit": "ML" }
    ],
    "reason": "Weekly Abhyanga supply replenishment",
    " urgency": "normal"
}
```

### 8.4 Billing (Vol 7)

| Integration | Direction | Details |
|-------------|-----------|---------|
| Session charges | Panchakarma → Billing | Each completed session generates billing line item |
| Therapy rates | Billing → Panchakarma | Therapy type pricing for cost estimation |
| Package pricing | Bidirectional | Multi-session packages with discounted rates |

**Billing Integration Endpoint:**

```go
// Auto-generate bill items for completed sessions
POST /api/v1/billing/items/auto-generate
{
    "source": "panchakarma",
    "session_ids": ["uuid1", "uuid2"],
    "patient_id": "uuid",
    "encounter_id": "uuid"
}
```

### 8.5 Referral (Vol 3)

| Integration | Direction | Details |
|-------------|-----------|---------|
| Referral → Plan | Referral → Panchakarma | Referral can trigger treatment plan creation |
| Source tracking | Panchakarma → Referral | Plan tracks referral source |

### 8.6 Audit Trail (Vol 8)

| Integration | Direction | Details |
|-------------|-----------|---------|
| Plan CRUD | Panchakarma → Audit | All plan create/update/delete logged |
| Session status | Panchakarma → Audit | All status transitions logged |
| Material usage | Panchakarma → Audit | Material consumption tracked |

---

## 9. Design System & UI Components

### 9.1 Color Tokens

```typescript
// tokens.ts additions

export const panchakarmaColors = {
  primary: '#0F766E',      // Teal - main PK color
  secondary: '#C8A14D',    // Gold - therapy highlights
  background: '#FAF8F2',   // Ivory
  surface: '#FFFFFF',

  // Status colors
  draft: '#6B7280',         // Gray
  active: '#059669',        // Emerald
  paused: '#D97706',        // Amber
  completed: '#0F766E',     // Teal
  cancelled: '#DC2626',     // Red

  // Session status
  scheduled: '#2563EB',     // Blue
  inProgress: '#0F766E',    // Teal (pulsing)
  sessionCompleted: '#059669', // Emerald
  noShow: '#9333EA',        // Purple

  // Therapy type colors
  abhyanga: '#0F766E',
  shirodhara: '#2563EB',
  basti: '#7C3AED',
  nasya: '#EC4899',
  virechana: '#F59E0B',
  raktamokshana: '#DC2626',
  snehana: '#059669',
  swedana: '#EA580C',
  paschatkarma: '#6B7280',

  // Outcome score
  scorePoor: '#DC2626',     // 1-3
  scoreMild: '#F59E0B',    // 4-5
  scoreModerate: '#2563EB', // 6-7
  scoreGood: '#059669',     // 8-9
  scoreExcellent: '#7C3AED', // 10
};
```

### 9.2 Typography

```typescript
export const panchakarmaTypography = {
  planTitle: 'text-xl font-semibold text-slate-800',
  sessionTime: 'text-lg font-mono font-bold text-teal-700',
  therapyName: 'text-sm font-medium text-slate-700',
  patientName: 'text-sm font-semibold text-slate-900',
  scoreValue: 'text-2xl font-bold',
  statusBadge: 'text-xs font-semibold uppercase tracking-wide',
  notesText: 'text-sm text-slate-600 leading-relaxed',
};
```

### 9.3 Spacing & Layout

```typescript
export const panchakarmaSpacing = {
  cardPadding: 'p-4',
  sectionGap: 'gap-6',
  gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  calendarCell: 'min-h-[120px]',
  sessionCard: 'h-32',
};
```

### 9.4 Component Specifications

#### SessionCard

```
┌─────────────────────────────┐
│ 🔵 Abhyanga        08:00   │  ← therapy type color dot + name + time
│─────────────────────────────│
│ Priya Sharma               │  ← patient name
│ AHMS-2026-000123           │  ← UHID (muted)
│─────────────────────────────│
│ Kavitha R.    [COMPLETED]  │  ← therapist + status badge
└─────────────────────────────┘
```

**States:** Default, Hover (shadow increase), Active (ring-2 ring-teal), Completed (green border-left)

#### TherapyBadge

```
┌──────────────────┐
│ 🌿 Abhyanga     │  ← icon + name, colored background
└──────────────────┘
```

Background color derived from therapy type color mapping.

#### OutcomeScore

```
Score: 8/10
[████████░░] 80%

Color: emerald (scoreGood)
```

Gradient fill from red (left) to emerald (right), marker position = score/10.

---

## 10. State Management & Data Flow

### 10.1 Frontend State Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React State Flow                        │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │  Global   │    │  Page    │    │  Component       │  │
│  │  State    │    │  State   │    │  State           │  │
│  │          │    │          │    │                  │  │
│  │ AuthCtx  │    │ useQuery │    │ useState/useRef  │  │
│  │ ThemeCtx │    │ useMutate│    │ local form state │  │
│  └────┬─────┘    └────┬─────┘    └────────┬─────────┘  │
│       │               │                    │             │
│       └───────────────┼────────────────────┘             │
│                       ↓                                  │
│              ┌─────────────────┐                         │
│              │   api.ts (Axios)│                         │
│              │   Interceptors  │                         │
│              └────────┬────────┘                         │
│                       ↓                                  │
│              ┌─────────────────┐                         │
│              │  Backend API    │                         │
│              │  /panchakarma/* │                         │
│              └─────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### 10.2 React Query Keys

```typescript
export const panchakarmaKeys = {
  all: ['panchakarma'] as const,
  therapyTypes: () => [...panchakarmaKeys.all, 'therapyTypes'] as const,
  therapyType: (id: string) => [...panchakarmaKeys.therapyTypes(), id] as const,
  plans: () => [...panchakarmaKeys.all, 'plans'] as const,
  plan: (id: string) => [...panchakarmaKeys.plans(), id] as const,
  planSessions: (planId: string) => [...panchakarmaKeys.plan(planId), 'sessions'] as const,
  sessions: () => [...panchakarmaKeys.all, 'sessions'] as const,
  session: (id: string) => [...panchakarmaKeys.sessions(), id] as const,
  todaySessions: () => [...panchakarmaKeys.sessions(), 'today'] as const,
  calendar: (dateRange: string) => [...panchakarmaKeys.sessions(), 'calendar', dateRange] as const,
  therapists: () => [...panchakarmaKeys.all, 'therapists'] as const,
  therapist: (id: string) => [...panchakarmaKeys.therapists(), id] as const,
  dashboard: () => [...panchakarmaKeys.all, 'dashboard'] as const,
  materials: () => [...panchakarmaKeys.all, 'materials'] as const,
  reports: () => [...panchakarmaKeys.all, 'reports'] as const,
};
```

### 10.3 API Service Layer

```typescript
// src/services/panchakarmaApi.ts

import api from '../lib/api';

export const panchakarmaApi = {
  // Therapy Types
  getTherapyTypes: (params?: any) => api.get('/panchakarma/therapy-types', { params }),
  getTherapyType: (id: string) => api.get(`/panchakarma/therapy-types/${id}`),
  createTherapyType: (data: any) => api.post('/panchakarma/therapy-types', data),
  updateTherapyType: (id: string, data: any) => api.put(`/panchakarma/therapy-types/${id}`, data),

  // Treatment Plans
  getPlans: (params?: any) => api.get('/panchakarma/plans', { params }),
  getPlan: (id: string) => api.get(`/panchakarma/plans/${id}`),
  createPlan: (data: any) => api.post('/panchakarma/plans', data),
  updatePlan: (id: string, data: any) => api.put(`/panchakarma/plans/${id}`, data),
  updatePlanStatus: (id: string, status: string) => api.patch(`/panchakarma/plans/${id}/status`, { status }),
  getPatientPlans: (patientId: string) => api.get(`/panchakarma/plans/patient/${patientId}`),

  // Sessions
  getSessions: (params?: any) => api.get('/panchakarma/sessions', { params }),
  getSession: (id: string) => api.get(`/panchakarma/sessions/${id}`),
  createSession: (data: any) => api.post('/panchakarma/sessions', data),
  updateSession: (id: string, data: any) => api.put(`/panchakarma/sessions/${id}`, data),
  updateSessionStatus: (id: string, status: string, data?: any) => api.patch(`/panchakarma/sessions/${id}/status`, { status, ...data }),
  updateSessionNotes: (id: string, data: any) => api.patch(`/panchakarma/sessions/${id}/notes`, data),
  updateSessionOutcome: (id: string, data: any) => api.patch(`/panchakarma/sessions/${id}/outcome`, data),
  getTodaySessions: () => api.get('/panchakarma/sessions/today'),
  getTherapistSessions: (therapistId: string, params?: any) => api.get(`/panchakarma/sessions/therapist/${therapistId}`, { params }),
  getCalendarData: (params: any) => api.get('/panchakarma/sessions/calendar', { params }),

  // Therapists
  getTherapists: (params?: any) => api.get('/panchakarma/therapists', { params }),
  getTherapist: (id: string) => api.get(`/panchakarma/therapists/${id}`),
  getTherapistSchedule: (id: string, params: any) => api.get(`/panchakarma/therapists/${id}/schedule`, { params }),
  getTherapistStats: (id: string) => api.get(`/panchakarma/therapists/${id}/stats`),

  // Materials
  getMaterialUsage: (params?: any) => api.get('/panchakarma/materials/usage', { params }),
  getLowStock: () => api.get('/panchakarma/materials/low-stock'),
  requestMaterial: (data: any) => api.post('/panchakarma/materials/request', data),

  // Dashboard & Reports
  getDashboard: () => api.get('/panchakarma/dashboard'),
  getOutcomeReports: (params?: any) => api.get('/panchakarma/reports/outcomes', { params }),
  getUtilizationReports: (params?: any) => api.get('/panchakarma/reports/utilization', { params }),
  getPatientProgress: (patientId: string) => api.get(`/panchakarma/reports/patient-progress/${patientId}`),
};
```

### 10.4 Backend Handler Pattern

```go
// internal/panchakarma/handler.go — follows existing handler pattern

type Handler struct {
    service *Service
}

func NewHandler(service *Service) *Handler {
    return &Handler{service: service}
}

// GET /panchakarma/plans
func (h *Handler) ListPlans(c *gin.Context) {
    var req ListPlansRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid query parameters", err)
        return
    }

    plans, total, err := h.service.ListPlans(c.Request.Context(), &req)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch plans", err)
        return
    }

    utils.SuccessResponse(c, plans, utils.Pagination{
        Page:       req.Page,
        PerPage:    req.PerPage,
        Total:      total,
        TotalPages: int(math.Ceil(float64(total) / float64(req.PerPage))),
    })
}
```

---

## 11. Error Handling & Edge Cases

### 11.1 Validation Rules

| Rule | Field | Error Code |
|------|-------|-----------|
| Plan name required, 3-200 chars | plan_name | VALIDATION_ERROR |
| Start date must be today or future (for new plans) | start_date | VALIDATION_ERROR |
| Estimated end must be after start | estimated_end | VALIDATION_ERROR |
| Total sessions must be > 0 | total_sessions | VALIDATION_ERROR |
| Session number must be unique within plan | session_number | DUPLICATE_SESSION |
| Scheduled time must be within operating hours (06:00-20:00) | scheduled_time | VALIDATION_ERROR |
| Duration must be 5-480 minutes | duration_minutes | VALIDATION_ERROR |
| Outcome score must be 1-10 if provided | outcome_score | VALIDATION_ERROR |
| Therapist must have PANCHAKARMA_THERAPIST role | therapist_id | INVALID_THERAPIST |
| Therapy type must exist and be active | therapy_type_id | INVALID_THERAPY_TYPE |
| Cannot complete session without starting | status | INVALID_STATUS_TRANSITION |

### 11.2 Business Rule Violations

| Scenario | Response | HTTP Code |
|----------|----------|-----------|
| Schedule session on existing therapist slot | "Therapist already has a session at this time" | 409 Conflict |
| Complete plan with incomplete sessions | "Cannot complete plan: X sessions remaining" | 422 Unprocessable |
| Cancel plan with in-progress sessions | "Must complete or cancel in-progress sessions first" | 422 Unprocessable |
| Material request exceeding stock | "Insufficient stock: requested X, available Y" | 409 Conflict |
| Delete therapy type with active sessions | "Cannot delete: X active sessions use this therapy type" | 409 Conflict |

### 11.3 Edge Cases

| Case | Handling |
|------|----------|
| Patient discharged mid-treatment | Auto-cancel remaining sessions, mark plan CANCELLED with reason |
| Therapist unavailable (sick leave) | Show conflict warning, suggest alternative therapist |
| Session extends beyond operating hours | Warn but allow (overtime tracking) |
| Plan created with past start date | Allow for documentation purposes (retroactive plans) |
| Multiple plans for same patient active | Allow but warn ("Patient has X active plans") |
| Session rescheduled multiple times | Track reschedule count, flag for review if > 3 |
| Bulk session creation with conflicts | Create non-conflicting sessions, report conflicts separately |
| Network failure during session completion | Retry with optimistic locking, prevent duplicate completion |

### 11.4 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "SCHEDULING_CONFLICT",
    "message": "Therapist already has a session scheduled at this time",
    "details": {
      "therapist_id": "uuid",
      "conflicting_session_id": "uuid",
      "conflicting_time": "2026-08-10T08:00:00Z"
    }
  }
}
```

---

## 12. Security Considerations

### 12.1 Data Access Controls

- Therapists can only view/edit their own sessions
- Patients (portal) can only view their own treatment plans
- Material requests require authentication
- All mutations logged to audit trail

### 12.2 Input Sanitization

- All text fields HTML-escaped before storage
- Photographs validated for file type (jpg, png, webp) and size (max 5MB)
- Body map JSONB validated against schema
- Notes fields stripped of script tags

### 12.3 Photograph Handling

- Uploaded to `/uploads/sessions/` with UUID filenames
- Access-controlled: only authenticated users with plan access
- EXIF data stripped for patient privacy
- Patient consent required before upload

### 12.4 Rate Limiting

- Material request endpoints: 10 requests/minute per user
- Dashboard/report endpoints: 30 requests/minute per user
- Session status updates: 20 requests/minute per user

### 12.5 Soft Delete

- Treatment plans: soft-delete only (set status=CANCELLED)
- Therapy types: soft-delete (set is_active=false), never hard-delete
- Sessions: soft-delete only, preserve audit trail
- Session materials: cascaded soft-delete with session

---

## 13. Performance Optimization

### 13.1 Database Query Optimization

```go
// Eager loading for plan list (avoid N+1)
func (r *Repository) ListPlans(req *ListPlansRequest) ([]TreatmentPlan, int64, error) {
    var plans []TreatmentPlan
    var total int64

    query := r.db.Model(&models.TreatmentPlan{}).
        Preload("Patient").
        Preload("Doctor").
        Preload("Sessions", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, plan_id, therapy_type_id, therapist_id, session_number, scheduled_date, status, outcome_score")
        }).
        Preload("Sessions.TherapyType").
        Preload("Sessions.Therapist")

    // Apply filters
    if req.Status != "" {
        query = query.Where("status = ?", req.Status)
    }
    if req.PatientID != "" {
        query = query.Where("patient_id = ?", req.PatientID)
    }
    if req.Search != "" {
        query = query.Where("plan_name ILIKE ? OR patient.first_name ILIKE ?",
            "%"+req.Search+"%", "%"+req.Search+"%")
    }

    query.Count(&total)
    query.Offset((req.Page - 1) * req.PerPage).Limit(req.PerPage).Find(&plans)

    return plans, total, nil
}
```

### 13.2 Caching Strategy

| Data | Cache Duration | Invalidation |
|------|---------------|-------------|
| Therapy types | 1 hour | On create/update |
| Therapist list | 5 minutes | On availability change |
| Dashboard stats | 2 minutes | On session status change |
| Calendar data | 1 minute | Real-time via WebSocket (future) |

### 13.3 Pagination

All list endpoints support cursor-based pagination for large datasets:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### 13.4 Index Coverage

Critical query patterns covered by composite indexes:

```sql
-- Therapist schedule lookup (most frequent query)
CREATE INDEX idx_sessions_therapist_date_status
ON treatment_sessions(therapist_id, scheduled_date, status);

-- Patient plan lookup
CREATE INDEX idx_plans_patient_status
ON treatment_plans(patient_id, status);

-- Today's sessions
CREATE INDEX idx_sessions_date_status
ON treatment_sessions(scheduled_date, status);
```

---

## 14. Testing Strategy

### 14.1 Backend Unit Tests

| Test File | Coverage |
|-----------|---------|
| `internal/panchakarma/service_test.go` | Plan lifecycle transitions, session status machine, conflict detection |
| `internal/panchakarma/repository_test.go` | CRUD operations, query filters, pagination |
| `internal/panchakarma/handler_test.go` | HTTP request/response, auth, validation |

### 14.2 Backend Integration Tests

| Test | Scenario |
|------|----------|
| Plan creation flow | Create plan → Add sessions → Activate → Complete sessions → Auto-complete plan |
| Conflict detection | Double-book therapist → Expect 409 |
| Material tracking | Complete session → Verify pharmacy stock deduction |
| Auto no-show | Wait past threshold → Verify session marked NO_SHOW |

### 14.3 Frontend Component Tests

| Component | Test |
|-----------|------|
| `SessionCard` | Renders correctly in all status states |
| `TreatmentProgress` | Progress bar accuracy at various completion percentages |
| `OutcomeScore` | Score color mapping correct |
| `BodyMap` | Region click handlers, annotation display |
| `SessionCalendar` | Week/month view rendering, navigation |

### 14.4 E2E Test Scenarios

1. **Complete treatment flow:** Create patient → Create plan → Schedule sessions → Execute sessions → Record outcomes → Complete plan
2. **Therapist conflict:** Attempt to book overlapping sessions → Verify conflict message
3. **Material workflow:** Session completed → Check material usage → Request pharmacy restock
4. **Report generation:** Navigate to reports → Filter by date range → Export to PDF

### 14.5 QA Test Cases

| # | Module | Test Case | Expected | Priority |
|---|--------|-----------|----------|----------|
| 1 | Plan | Create plan with 5 sessions | Plan created with DRAFT status | High |
| 2 | Plan | Activate plan | Status changes to ACTIVE | High |
| 3 | Plan | Complete plan with incomplete sessions | Error: sessions remaining | High |
| 4 | Session | Schedule session for unavailable therapist | Conflict error | High |
| 5 | Session | Start session | Status → IN_PROGRESS, actual_start recorded | High |
| 6 | Session | Complete session with materials | Session completed, materials logged | High |
| 7 | Session | Mark session NO_SHOW | Status → NO_SHOW | Medium |
| 8 | Calendar | View week calendar | Sessions displayed in time slots | Medium |
| 9 | Dashboard | View today's sessions | Correct count and status breakdown | Medium |
| 10 | Materials | Request material from pharmacy | Request created, pharmacy notified | Medium |
| 11 | Reports | View outcome report by therapy type | Aggregated scores displayed | Low |
| 12 | Therapist | View therapist schedule | Sessions for date range displayed | Low |

---

## 15. Implementation Phases & Effort

### 15.1 Gap Analysis Summary

| Component | Current State | Gap | Priority | Effort |
|-----------|--------------|-----|----------|--------|
| TherapyType model & seed | Seed data only (9 types in DB) | Full CRUD + API + UI | High | 3 days |
| TreatmentPlan model | ❌ Not created | Model + Migration + CRUD API + UI | High | 8 days |
| TreatmentSession model | ❌ Not created | Model + Migration + API + UI | High | 10 days |
| SessionMaterial model | ❌ Not created | Model + Migration + API | High | 3 days |
| Plan lifecycle management | ❌ Not created | Status transitions + business rules | High | 3 days |
| Session lifecycle management | ❌ Not created | Status machine + conflict detection | High | 4 days |
| Therapist management | ❌ Not created | List + schedule + availability + stats | Medium | 4 days |
| Material tracking | ❌ Not created | Usage tracking + pharmacy integration | Medium | 3 days |
| Calendar view | ❌ Not created | Week/month/day views | Medium | 5 days |
| Dashboard | ❌ Not created | KPIs + today's view + charts | Medium | 3 days |
| RBAC (permissions + role grants) | Role seeded, no permissions | 22 new permissions + role grants | High | 2 days |
| Body map component | ❌ Not created | Interactive body diagram | Low | 4 days |
| Reports | ❌ Not created | Outcome + utilization reports | Low | 4 days |
| Frontend navigation | ❌ Not added | Sidebar section + routes | Medium | 1 day |
| **TOTAL** | | | | **~57 days (11.4 weeks)** |

### 15.2 Sprint Breakdown

#### Sprint 9.1 — Foundation (Week 1-2) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Create `internal/models/panchakarma.go` (all 4 models) | 1 | Backend |
| GORM AutoMigrate + seed permissions | 1 | Backend |
| TherapyType CRUD (API + handler + repository) | 2 | Backend |
| TreatmentPlan CRUD (API + handler + repository) | 3 | Backend |
| TreatmentSession CRUD (API + handler + repository) | 3 | Backend |

**Deliverables:** All backend models, migrations, and CRUD endpoints functional.

#### Sprint 9.2 — Business Logic (Week 3-4) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Plan lifecycle state machine | 2 | Backend |
| Session lifecycle state machine | 2 | Backend |
| Conflict detection (therapist/patient) | 2 | Backend |
| Material tracking + pharmacy integration | 2 | Backend |
| Auto no-show cron job | 1 | Backend |
| Backend integration tests | 1 | Backend |

**Deliverables:** All business rules, integrations, and backend tests passing.

#### Sprint 9.3 — Frontend Core (Week 5-7) — 15 days

| Task | Days | Owner |
|------|------|-------|
| Frontend navigation + route setup | 1 | Frontend |
| panchakarmaApi service layer | 1 | Frontend |
| TreatmentPlanList page | 3 | Frontend |
| TreatmentPlanCreate/Edit page | 4 | Frontend |
| TreatmentPlanDetail page | 3 | Frontend |
| SessionList page | 2 | Frontend |
| SessionDetail page | 3 | Frontend |

**Deliverables:** All core CRUD pages functional.

#### Sprint 9.4 — Advanced UI (Week 8-10) — 15 days

| Task | Days | Owner |
|------|------|-------|
| SessionCalendar (week/month/day views) | 5 | Frontend |
| PanchakarmaDashboard | 3 | Frontend |
| TherapistList + TherapistDetail | 3 | Frontend |
| TherapyTypeList (admin CRUD) | 2 | Frontend |
| Body map component | 4 | Frontend |

**Deliverables:** Calendar, dashboard, and advanced UI components.

#### Sprint 9.5 — Reports & Polish (Week 11-12) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Outcome reports | 3 | Full-stack |
| Utilization reports | 2 | Full-stack |
| Material usage reports | 2 | Full-stack |
| E2E testing & bug fixes | 3 | QA |

**Deliverables:** Reports, testing complete, module ready for UAT.

### 15.3 Dependencies

| Dependency | Blocker? | Mitigation |
|------------|----------|-----------|
| Pharmacy module (Vol 5) | Partial | Material tracking works standalone; pharmacy integration is additive |
| Billing module (Vol 7) | No | Session charges can be added retroactively |
| Patient module (Vol 2) | No (existing) | Patient lookup already functional |
| Consultation module (Vol 3) | No (existing) | Encounter linking already supported |

---

## Appendix A: Database Migration SQL

```sql
-- Therapy Types
CREATE TABLE therapy_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    sanskrit_name VARCHAR(100),
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    contraindications TEXT,
    benefits TEXT,
    preparation_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Treatment Plans
CREATE TABLE treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    encounter_id UUID REFERENCES encounters(id),
    department_id UUID REFERENCES departments(id),
    plan_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    start_date DATE,
    estimated_end DATE,
    actual_end DATE,
    diagnosis_notes TEXT,
    treatment_goals TEXT,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    completed_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Treatment Sessions
CREATE TABLE treatment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(id),
    therapy_type_id UUID NOT NULL REFERENCES therapy_types(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    session_number INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(5) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    pre_procedure TEXT,
    post_procedure TEXT,
    therapist_notes TEXT,
    patient_feedback TEXT,
    outcome_score INTEGER CHECK (outcome_score >= 1 AND outcome_score <= 10),
    outcome_notes TEXT,
    oil_used JSONB DEFAULT '[]',
    materials JSONB DEFAULT '[]',
    body_map JSONB DEFAULT '[]',
    photographs JSONB DEFAULT '[]',
    cancelled_reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Session Materials
CREATE TABLE session_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES treatment_sessions(id),
    medicine_id UUID REFERENCES medicines(id),
    material_name VARCHAR(200) NOT NULL,
    quantity_used DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    oil_ml DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_therapy_types_category ON therapy_types(category);
CREATE INDEX idx_therapy_types_is_active ON therapy_types(is_active);

CREATE INDEX idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_doctor_id ON treatment_plans(doctor_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX idx_treatment_plans_encounter_id ON treatment_plans(encounter_id);

CREATE INDEX idx_treatment_sessions_plan_id ON treatment_sessions(plan_id);
CREATE INDEX idx_treatment_sessions_therapist_id ON treatment_sessions(therapist_id);
CREATE INDEX idx_treatment_sessions_therapy_type_id ON treatment_sessions(therapy_type_id);
CREATE INDEX idx_treatment_sessions_scheduled_date ON treatment_sessions(scheduled_date);
CREATE INDEX idx_treatment_sessions_status ON treatment_sessions(status);
CREATE INDEX idx_treatment_sessions_therapist_date_status ON treatment_sessions(therapist_id, scheduled_date, status);

CREATE INDEX idx_session_materials_session_id ON session_materials(session_id);
CREATE INDEX idx_session_materials_medicine_id ON session_materials(medicine_id);
```

---

## Appendix B: Seed Data

### Therapy Types

```go
var TherapyTypeSeeds = []models.TherapyType{
    {Name: "Abhyanga", Category: "PRADHANKARMA", SanskritName: "अभ्यंग", DurationMinutes: 60, Description: "Full body therapeutic oil massage with warm herbal oils", SortOrder: 1},
    {Name: "Shirodhara", Category: "PRADHANKARMA", SanskritName: "शिरोधारा", DurationMinutes: 45, Description: "Continuous flow of warm medicated oil on forehead", SortOrder: 2},
    {Name: "Basti", Category: "PRADHANKARMA", SanskritName: "बस्ति", DurationMinutes: 30, Description: "Medicated enema therapy for Vata disorders", SortOrder: 3},
    {Name: "Nasya", Category: "PRADHANKARMA", SanskritName: "नस्य", DurationMinutes: 20, Description: "Nasal administration of herbal oils/medicines", SortOrder: 4},
    {Name: "Virechana", Category: "PRADHANKARMA", SanskritName: "विरेचन", DurationMinutes: 30, Description: "Therapeutic purgation for Pitta disorders", SortOrder: 5},
    {Name: "Raktamokshana", Category: "PRADHANKARMA", SanskritName: "रक्तमोक्षण", DurationMinutes: 30, Description: "Blood purification therapy using leeches or needle pricking", SortOrder: 6},
    {Name: "Snehana", Category: "PURVAKARMA", SanskritName: "स्नेहन", DurationMinutes: 30, Description: "Internal oleation with medicated ghee/oil", SortOrder: 7},
    {Name: "Swedana", Category: "PURVAKARMA", SanskritName: "स्वेदन", DurationMinutes: 20, Description: "Fomentation/sudation therapy to induce sweating", SortOrder: 8},
    {Name: "Paschatkarma", Category: "PASCHATKARMA", SanskritName: "पश्चात्कर्म", DurationMinutes: 15, Description: "Post-procedure care including diet and rest instructions", SortOrder: 9},
}
```

---

*Volume 4 — Panchakarma Module | Last Updated: 2026-08-05*
