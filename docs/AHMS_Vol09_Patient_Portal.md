# AHMS Volume 9 — Patient Portal Module

> **Enterprise-Grade Ayurvedic Hospital Management System**
> **Backend:** Go 1.22 · Gin · GORM · PostgreSQL 16
> **Frontend:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Framer Motion 12

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Pages](#5-frontend-pages)
6. [RBAC & Permissions](#6-rbac--permissions)
7. [Business Logic](#7-business-logic)
8. [Security](#8-security)
9. [Implementation Phases & Effort](#9-implementation-phases--effort)

---

## 1. Overview & Scope

### 1.1 Purpose

The Patient Portal provides patients with self-service access to their medical records, billing, appointments, and treatment information. It is a **separate, read-only interface** from the admin system with its own authentication flow.

### 1.2 Current Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Portal login (JWT) | ✅ Implemented | `internal/portal/` |
| Patient profile | ✅ Implemented | `GET /portal/profile` |
| Portal bills | ✅ Implemented | `GET /portal/bills` |
| Portal appointments | ✅ Implemented | `GET /portal/appointments` |
| Portal prescriptions | ✅ Implemented | `GET /portal/prescriptions` |
| Portal referrals | ✅ Implemented | `GET /portal/referrals` |
| Portal home dashboard | ✅ Implemented | `src/pages/portal/PortalHome.tsx` |
| Patient registration (self-service) | ❌ Missing | New |
| Appointment booking | ❌ Missing | New |
| Treatment plan view | ❌ Missing | New |
| Session history | ❌ Missing | New |
| Lab results view | ❌ Missing | New |
| Notifications | ❌ Missing | New |
| Profile edit | ❌ Missing | New |

### 1.3 Scope

| In Scope | Out Scope |
|----------|----------|
| Patient self-registration | Clinical documentation |
| Appointment booking (OPD) | Prescription modification |
| Medical records viewing | Billing modifications |
| Bill viewing & due payment | Administrative functions |
| Treatment plan tracking | Staff management |
| Panchakarma session history | Pharmacy operations |
| Profile management | |
| Notifications & reminders | |

### 1.4 Authentication Architecture

```
Patient Portal                          Admin Portal
─────────────                          ─────────────
POST /auth/patient/login               POST /auth/login
→ Returns: access_token (patient JWT)  → Returns: access_token (admin JWT)
→ Stored in: localStorage[ahms_portal_token] → Stored in localStorage[ahms_token]
→ Uses: portalApi (Axios instance)    → Uses: api (Axios instance)
```

---

## 2. Architecture

### 2.1 Portal Module Structure

```
backend/
├── internal/
│   └── portal/
│       ├── dto.go          ✅ Implemented
│       ├── handler.go      ✅ Implemented
│       ├── repository.go   ✅ Implemented
│       ├── routes.go       ✅ Implemented
│       └── service.go      ✅ Implemented
│
frontend/
└── src/
    └── pages/
        └── portal/
            ├── PatientLogin.tsx     ✅ Implemented
            ├── PortalHome.tsx       ✅ Implemented
            ├── PortalProfile.tsx    ✅ Implemented
            ├── PortalBills.tsx      ✅ Implemented
            ├── PortalAppointments.tsx ✅ Implemented
            ├── PortalPrescriptions.tsx ✅ Implemented
            └── PortalReferrals.tsx  ✅ Implemented
```

### 2.2 Portal Routes (Existing)

```
/api/v1/portal/
├── POST   /login              → PatientLogin
├── GET    /profile            → PortalProfile
├── GET    /bills              → PortalBills
├── GET    /appointments       → PortalAppointments
├── GET    /prescriptions      → PortalPrescriptions
├── GET    /referrals          → PortalReferrals
```

---

## 3. Data Models

### 3.1 Portal-Specific Models

The portal module doesn't define its own database models — it reads from existing models via the portal repository. The portal DTOs transform existing models into patient-friendly responses.

### 3.2 Portal DTOs (Existing)

```go
// internal/portal/dto.go

type PortalLoginRequest struct {
    UHID     string `json:"uhid" binding:"required"`
    Password string `json:"password" binding:"required"`
}

type PortalLoginResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    Patient      PatientProfile `json:"patient"`
}

type PatientProfile struct {
    ID            uuid.UUID `json:"id"`
    UHID          string    `json:"uhid"`
    FirstName     string    `json:"first_name"`
    LastName      string    `json:"last_name"`
    DateOfBirth   string    `json:"date_of_birth"`
    Gender        string    `json:"gender"`
    Phone         string    `json:"phone"`
    Email         string    `json:"email"`
    BloodGroup    string    `json:"blood_group"`
    Address       string    `json:"address"`
    City          string    `json:"city"`
    State         string    `json:"state"`
    Allergies     string    `json:"allergies"`
    Conditions    string    `json:"conditions"`
}

type PortalBillResponse struct {
    ID            uuid.UUID              `json:"id"`
    BillNo        string                 `json:"bill_no"`
    Date          string                 `json:"date"`
    TotalAmount   float64                `json:"total_amount"`
    Discount      float64                `json:"discount"`
    NetAmount     float64                `json:"net_amount"`
    PaidAmount    float64                `json:"paid_amount"`
    DueAmount     float64                `json:"due_amount"`
    PaymentStatus string                 `json:"payment_status"`
    Items         []PortalBillItemResponse `json:"items"`
    Payments      []PortalPaymentResponse  `json:"payments"`
}

type PortalAppointmentResponse struct {
    ID           uuid.UUID `json:"id"`
    Date         string    `json:"date"`
    Time         string    `json:"time"`
    DoctorName   string    `json:"doctor_name"`
    Department   string    `json:"department"`
    Status       string    `json:"status"`
    TokenNumber  int       `json:"token_number"`
    Type         string    `json:"type"`
    Notes        string    `json:"notes"`
}

type PortalPrescriptionResponse struct {
    ID          uuid.UUID `json:"id"`
    Date        string    `json:"date"`
    DoctorName  string    `json:"doctor_name"`
    Diagnosis   string    `json:"diagnosis"`
    Notes       string    `json:"notes"`
    Items       []PortalPrescriptionItemResponse `json:"items"`
}

type PortalReferralResponse struct {
    ID             uuid.UUID `json:"id"`
    ReferralNumber string    `json:"referral_number"`
    Date           string    `json:"date"`
    FromDoctor     string    `json:"from_doctor"`
    ToDoctor       string    `json:"to_doctor"`
    Reason         string    `json:"reason"`
    Status         string    `json:"status"`
    Notes          string    `json:"notes"`
}
```

---

## 4. API Endpoints (Enhanced)

### 4.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/portal/login` | Patient login (UHID + password) | None |
| `POST` | `/portal/refresh` | Refresh access token | Refresh token |
| `POST` | `/portal/logout` | Logout (invalidate token) | Patient JWT |

### 4.2 Patient Self-Registration (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/portal/register` | New patient self-registration | None |
| `POST` | `/portal/register/verify` | Verify OTP/email for registration | None |

**Self-Registration Request:**
```json
{
  "first_name": "Amit",
  "last_name": "Patel",
  "date_of_birth": "1990-05-15",
  "gender": "MALE",
  "phone": "+91-9876543210",
  "email": "amit.patel@email.com",
  "blood_group": "B+",
  "address": "456 Health Lane",
  "city": "Mumbai",
  "state": "Maharashtra",
  "id_proof_type": "AADHAAR",
  "id_proof_number": "1234-5678-9012",
  "password": "SecurePass123!",
  "confirm_password": "SecurePass123!"
}
```

### 4.3 Appointment Booking (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/portal/doctors` | List available doctors | Patient JWT |
| `GET` | `/portal/doctors/:id/availability` | Doctor's available slots | Patient JWT |
| `POST` | `/portal/appointments` | Book appointment | Patient JWT |
| `DELETE` | `/portal/appointments/:id` | Cancel appointment | Patient JWT |

**Book Appointment Request:**
```json
{
  "doctor_id": "uuid",
  "date": "2026-08-10",
  "time": "10:00",
  "type": "OPD",
  "notes": "Follow-up for skin condition"
}
```

### 4.4 Treatment Plans (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/portal/treatment-plans` | List patient's treatment plans | Patient JWT |
| `GET` | `/portal/treatment-plans/:id` | Get plan detail with sessions | Patient JWT |

### 4.5 Panchakarma Sessions (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/portal/sessions` | List patient's PK sessions | Patient JWT |
| `GET` | `/portal/sessions/:id` | Get session detail | Patient JWT |

### 4.6 Admissions (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/portal/admissions` | List patient's admission history | Patient JWT |
| `GET` | `/portal/admissions/:id` | Get admission detail (discharge summary) | Patient JWT |

### 4.7 Profile Management (Enhanced)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/portal/profile` | Get patient profile | Patient JWT |
| `PUT` | `/portal/profile` | Update profile (phone, email, address) | Patient JWT |
| `PUT` | `/portal/profile/password` | Change password | Patient JWT |
| `POST` | `/portal/profile/photo` | Upload profile photo | Patient JWT |

### 4.8 Notifications (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/portal/notifications` | List notifications | Patient JWT |
| `PATCH` | `/portal/notifications/:id/read` | Mark as read | Patient JWT |
| `PATCH` | `/portal/notifications/read-all` | Mark all as read | Patient JWT |

### 4.9 Existing Endpoints (No Changes)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/portal/profile` | Patient profile |
| `GET` | `/portal/bills` | Patient's bills |
| `GET` | `/portal/appointments` | Patient's appointments |
| `GET` | `/portal/prescriptions` | Patient's prescriptions |
| `GET` | `/portal/referrals` | Patient's referrals |

---

## 5. Frontend Pages

### 5.1 Portal Navigation

```
PATIENT PORTAL (PublicLayout)
├── Home           /portal
├── My Profile     /portal/profile
├── Appointments   /portal/appointments
├── Medical Records
│   ├── Prescriptions  /portal/prescriptions
│   ├── Referrals      /portal/referrals
│   ├── Treatment Plans /portal/treatment-plans
│   └── Admissions     /portal/admissions
├── Bills          /portal/bills
├── Notifications  /portal/notifications
└── Settings       /portal/settings
```

### 5.2 Page Specifications

#### 5.2.1 Portal Home (Enhanced)

**Current page** (`PortalHome.tsx`, 209 lines) — enhancements:

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome back, Priya! 👋                                    │
│  UHID: AHMS-2026-000123                                     │
├──────────┬──────────┬──────────┬───────────────────────────┤
│  Active  │  Pending │  Due     │  Upcoming                 │
│  Plans   │  Appts   │  Amount  │  Session                  │
│    1     │    2     │ ₹2,500   │  Tomorrow 10:00 AM        │
├──────────┴──────────┴──────────┴───────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │  Upcoming Appointments  │  │  Recent Bills           │ │
│  │                         │  │                         │ │
│  │  Aug 10 — Dr. Anand     │  │  BILL-001 — ₹1,500 ✅  │ │
│  │  Follow-up consultation │  │  BILL-002 — ₹2,500 🟡  │ │
│  │  [Cancel]               │  │  [Pay Now]              │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Quick Actions                                       │   │
│  │                                                     │   │
│  │  [📅 Book Appointment]  [💊 View Prescriptions]    │   │
│  │  [🧾 View Bills]        [📋 Treatment Plans]       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.2 Appointment Booking (New)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Book Appointment                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Select Department                                  │
│  [General Medicine] [Dermatology] [Panchakarma] [IPD]      │
│                                                             │
│  Step 2: Select Doctor                                      │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Dr. Anand Vaidya│  │ Dr. Suresh Kumar│                  │
│  │ General Medicine│  │ Dermatology     │                  │
│  │ ⭐ 4.8 (120)    │  │ ⭐ 4.6 (95)     │                  │
│  │ Next: Aug 10    │  │ Next: Aug 12    │                  │
│  │ [Select]        │  │ [Select]        │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  Step 3: Select Date & Time                                 │
│  ┌─── August 2026 ───────────────────────────────────────┐│
│  │  Mon   Tue   Wed   Thu   Fri   Sat   Sun              ││
│  │                          1     2     3                 ││
│  │  4     5     6     7     8     9    10 ← Selected     ││
│  │  11   12    13    14    15    16    17                 ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Available Slots for Aug 10:                                │
│  08:00 ✓  08:30 ✓  09:00 ✓  09:30 ✗  10:00 ✓  10:30 ✗   │
│  11:00 ✓  11:30 ✓  14:00 ✓  14:30 ✓  15:00 ✓  15:30 ✗   │
│                                                             │
│  Selected: Aug 10, 2026 — 10:00 AM                         │
│                                                             │
│  Notes: [Follow-up for skin condition_____________]        │
│                                                             │
│  [Confirm Booking]                                          │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.3 Treatment Plans View (New)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Treatment Plan: 7-Day Detox                      │
│  Doctor: Dr. Anand Vaidya                                   │
│  Status: ACTIVE  |  Started: Aug 10, 2026                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Progress: ████████░░░░░░░░ 57% (8/14 sessions)            │
│                                                             │
│  ┌─── Session History ─────────────────────────────────────┐│
│  │                                                         ││
│  │  ✅ Day 1 - Aug 10                                     ││
│  │  ├── Abhyanga (60m) — Score: 8/10 — Kavitha            ││
│  │  └── Shirodhara (45m) — Score: 7/10 — Kavitha          ││
│  │                                                         ││
│  │  ✅ Day 2 - Aug 11                                     ││
│  │  ├── Basti (30m) — Score: 7/10 — Ramesh                ││
│  │  └── Abhyanga (60m) — Score: 9/10 — Kavitha            ││
│  │                                                         ││
│  │  🔄 Day 3 - Aug 12 (Today)                            ││
│  │  ├── Nasya (20m) — 10:00 AM — Kavitha                  ││
│  │  └── Swedana (20m) — 11:00 AM — Ramesh                 ││
│  │                                                         ││
│  │  ⏳ Day 4 - Aug 13                                     ││
│  │  ├── Abhyanga (60m) — 08:00 AM                         ││
│  │  └── Shirodhara (45m) — 10:00 AM                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── Progress Notes ──────────────────────────────────────┐│
│  │  Doctor: "Patient responding well to Abhyanga.          ││
│  │  Sleep quality improved. Continue for 4 more days."     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Reusable Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `PortalSidebar` | Patient portal navigation | All portal pages |
| `PortalHeader` | Patient info + logout | All portal pages |
| `AppointmentCard` | Compact appointment display | Home, Appointments |
| `BillCard` | Bill summary card | Home, Bills |
| `SessionCard` | PK session summary | TreatmentPlans |
| `MedicalRecordCard` | Generic record card | Prescriptions, Referrals |
| `SlotPicker` | Available time slot selector | AppointmentBooking |
| `CalendarPicker` | Date selection calendar | AppointmentBooking |
| `NotificationBell` | Notification count badge | Header |
| `TreatmentProgress` | Progress bar for plans | TreatmentPlans |

---

## 6. RBAC & Permissions

### 6.1 Portal Role

The portal uses a single `PATIENT` role with these effective permissions:

| Permission | Access |
|------------|--------|
| Own profile (read/edit) | ✓ |
| Own bills (read) | ✓ |
| Own appointments (CRUD) | ✓ |
| Own prescriptions (read) | ✓ |
| Own referrals (read) | ✓ |
| Own treatment plans (read) | ✓ |
| Own sessions (read) | ✓ |
| Own admissions (read) | ✓ |
| Notifications (read) | ✓ |

### 6.2 Portal vs Admin Separation

- Portal JWT tokens are **separate** from admin tokens
- Portal tokens stored in `ahms_portal_token` (not `ahms_token`)
- Portal API uses `portalApi` axios instance
- Patient can only access own data (enforced by patient_id from JWT)

---

## 7. Business Logic

### 7.1 Patient Self-Registration Flow

```
Patient visits /register
        │
        ↓
┌──────────────────┐
│ Fill registration│
│ form             │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ OTP sent to phone│
│ / email          │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Verify OTP       │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Account created  │
│ UHID generated   │
│ Password hashed  │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Auto-login       │
│ Redirect to home │
└──────────────────┘
```

### 7.2 Appointment Booking Logic

```go
func (s *Service) BookAppointment(patientID uuid.UUID, req BookAppointmentRequest) error {
    // 1. Validate doctor exists and is active
    doctor, err := s.doctorRepo.FindByID(req.DoctorID)
    if err != nil || !doctor.IsActive {
        return ErrDoctorNotFound
    }

    // 2. Validate slot is available
    if s.appointmentRepo.IsSlotBooked(req.DoctorID, req.Date, req.Time) {
        return ErrSlotNotAvailable
    }

    // 3. Check patient doesn't have overlapping appointment
    if s.appointmentRepo.HasPatientConflict(patientID, req.Date, req.Time) {
        return ErrPatientConflict
    }

    // 4. Generate token number
    token, _ := s.appointmentRepo.NextTokenNumber(req.DoctorID, req.Date)

    // 5. Create appointment
    appointment := models.Appointment{
        PatientID:    patientID,
        DoctorID:     req.DoctorID,
        Date:         req.Date,
        Time:         req.Time,
        TokenNumber:  token,
        Type:         req.Type,
        Status:       "SCHEDULED",
        Notes:        req.Notes,
        CreatedBy:    patientID,
    }

    return s.appointmentRepo.Create(&appointment)
}
```

### 7.3 Notification Generation

| Event | Notification |
|-------|-------------|
| Appointment booked | "Your appointment with Dr. [Name] is confirmed for [Date] at [Time]" |
| Appointment cancelled | "Your appointment with Dr. [Name] on [Date] has been cancelled" |
| Bill created | "A new bill (BILL-[No]) has been generated. Amount: ₹[Amount]" |
| Payment received | "Payment of ₹[Amount] received. Thank you!" |
| Prescription ready | "Your prescription is ready. View it in Medical Records." |
| Discharge | "You have been discharged. View your discharge summary." |
| Session reminder | "Reminder: Your [Therapy] session is scheduled for tomorrow at [Time]" |

---

## 8. Security

### 8.1 Portal-Specific Security

| Control | Implementation |
|---------|---------------|
| Separate JWT secret | Portal uses different signing key than admin |
| Patient data isolation | JWT contains patient_id, all queries filter by it |
| Rate limiting | Login: 5 attempts/minute, API: 60 requests/minute |
| Password policy | Min 8 chars, 1 uppercase, 1 number, 1 special char |
| Session timeout | Access token expires in 15 min, refresh in 7 days |
| XSS prevention | All output HTML-escaped |
| CSRF protection | SameSite cookie + token-based auth |

### 8.2 Data Access Rules

- Patient can only view own data (enforced at service layer)
- No write access to clinical data (read-only for records)
- Appointment booking is the only write operation (besides profile)
- Bill viewing is read-only; no payment processing via portal (future)

---

## 9. Implementation Phases & Effort

### 9.1 Gap Analysis

| Component | Current State | Gap | Priority | Effort |
|-----------|--------------|-----|----------|--------|
| Self-registration | ❌ Missing | Registration flow + OTP + UHID generation | High | 4 days |
| Appointment booking | ❌ Missing | Slot management + booking + cancellation | High | 5 days |
| Treatment plans view | ❌ Missing | API + UI for patient-facing plans | Medium | 3 days |
| PK sessions view | ❌ Missing | API + UI for patient sessions | Medium | 2 days |
| Admissions view | ❌ Missing | API + UI for patient admissions | Medium | 2 days |
| Profile edit | ❌ Missing | Edit phone, email, address | Medium | 1 day |
| Password change | ❌ Missing | Old password + new password flow | Medium | 1 day |
| Notifications | ❌ Missing | Notification model + API + UI | Low | 3 days |
| Enhanced portal home | ✅ Exists | Add treatment plans, notifications widgets | Low | 1 day |
| **TOTAL** | | | | **~22 days (4.4 weeks)** |

### 9.2 Sprint Breakdown

#### Sprint 14.1 — Registration & Booking (Week 1-2) — 10 days

| Task | Days | Owner |
|------|------|-------|
| Self-registration API (UHID generation, OTP) | 2 | Backend |
| Appointment booking API (slot management) | 3 | Backend |
| Treatment plans + sessions + admissions read APIs | 2 | Backend |
| Profile edit + password change APIs | 1 | Backend |
| Frontend: Registration page | 2 | Frontend |

**Deliverables:** Self-registration, appointment booking, read APIs.

#### Sprint 14.2 — Portal UI (Week 3-4) — 12 days

| Task | Days | Owner |
|------|------|-------|
| Frontend: Appointment booking page | 3 | Frontend |
| Frontend: Treatment plans view | 2 | Frontend |
| Frontend: PK sessions view | 2 | Frontend |
| Frontend: Admissions view | 1 | Frontend |
| Frontend: Profile edit page | 1 | Frontend |
| Frontend: Notifications | 2 | Frontend |
| E2E testing & polish | 1 | QA |

**Deliverables:** All portal pages, module ready for UAT.

### 9.3 Dependencies

| Dependency | Blocker? | Mitigation |
|------------|----------|-----------|
| Patient module (Vol 2) | No (existing) | UHID generation already functional |
| Appointment module (Vol 3) | No (existing) | Slot management already functional |
| Panchakarma module (Vol 4) | No | Treatment plans are read-only |
| OTP service (SMS gateway) | Yes | Use mock OTP for dev, integrate Twilio for prod |

---

*Volume 9 — Patient Portal Module | Last Updated: 2026-08-05*
