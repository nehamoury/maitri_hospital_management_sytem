# AHMS — Volume 0: Project Overview

> **Maitri Ayurveda Hospital Management System**
> Enterprise Product Specification — Volume 0

---

## Table of Contents

1. [Vision](#1-vision)
2. [Scope](#2-scope)
3. [User Journey](#3-user-journey)
4. [Modules](#4-modules)
5. [Development Phases](#5-development-phases)
6. [Folder Structure](#6-folder-structure)
7. [Coding Standards](#7-coding-standards)
8. [Naming Conventions](#8-naming-conventions)
9. [Git Workflow](#9-git-workflow)
10. [Branch Strategy](#10-branch-strategy)
11. [UI Design Principles](#11-ui-design-principles)

---

## 1. Vision

### 1.1 Problem Statement

Ayurvedic hospitals currently manage patient records, appointments, prescriptions, billing, and inter-department referrals using fragmented systems — paper files, spreadsheets, or generic hospital software that does not understand Ayurvedic clinical workflows (Prakriti, Vikriti, Dosha analysis, Panchakarma procedures, Diet Pathya/Apathya).

### 1.2 Solution

A centralized Hospital Management System purpose-built for Ayurvedic hospitals that covers:

- One Patient → One UHID → Multiple Visits → Multiple Departments → Unified Clinical History
- Inter-department referrals with full clinical context transfer
- Ayurvedic-specific clinical records (Prakriti, Vikriti, Dosha, Agni, Nadi)
- Panchakarma treatment planning and session tracking
- Medicine dispensing with inventory integration
- Diet management aligned with Ayurvedic principles
- Complete billing with GST support
- Patient self-service portal

### 1.3 Target Users

| User Type | Description |
|-----------|-------------|
| Hospital Administrators | Full system control, reporting, configuration |
| Doctors | Clinical consultations, prescriptions, referrals |
| Panchakarma Doctors | Treatment planning, session oversight |
| Therapists | Treatment delivery, session recording |
| Receptionists | Patient registration, appointment booking, OPD queue |
| Pharmacists | Medicine dispensing, inventory management |
| Billing Staff | Invoice generation, payment collection |
| Nurses | IPD vitals, nursing notes |
| Ward Staff | Bed management, ward operations |
| Lab Staff | Investigation processing |
| Diet/Kitchen Staff | Diet preparation, meal delivery |
| Patients | Self-service portal for appointments, records, bills |

### 1.4 Design Principles

1. **Ayurveda-First** — Every clinical feature understands Ayurvedic terminology and workflows
2. **Unified History** — A patient's complete clinical journey is always accessible across departments
3. **Role-Based** — Every user sees exactly what they need, nothing more
4. **Production-Grade** — JWT auth, RBAC, audit logging, rate limiting, security headers
5. **Responsive** — Works on desktop, tablet, and mobile devices
6. **API-First** — Backend is a pure REST API; frontend is a separate SPA

---

## 2. Scope

### 2.1 In Scope (Phase 1)

| Module | Coverage |
|--------|----------|
| Authentication | Login, JWT, Refresh Token, Logout |
| RBAC | 13 roles, 26 permissions, fine-grained access control |
| Patient Registration | UHID generation, duplicate detection, demographics |
| Appointments | Booking, token generation, status management |
| OPD Workflow | Encounter creation, queue management, consultation |
| EMR | Consultation, Diagnosis, Ayurveda Fields, Prescription |
| Referrals | Inter-department referral with clinical history transfer |
| Pharmacy | Medicine master, stock management, dispensing |
| Billing | Invoice generation, payment tracking, receipts |
| Timeline | Cross-department unified clinical history |
| Dashboard | Role-specific widgets and KPIs |
| Patient Portal | Self-service login, appointments, prescriptions, bills |
| Audit Logging | Immutable audit trail for all critical actions |

### 2.2 In Scope (Phase 2)

| Module | Coverage |
|--------|----------|
| Panchakarma | Treatment plans, sessions, therapists, materials |
| IPD | Admission, beds, wards, nursing, diet, discharge |
| Investigations | Lab orders, results upload, report viewing |
| Hospital Master | Hospital profile, logo, settings |
| User Master | Staff CRUD, designation, department assignment |
| Role Management | Custom roles, permission assignment |
| Advanced Reports | Revenue, department, referral analytics |
| Export | Excel, PDF export for all data views |
| Print | Prescription print, bill print, referral slip print |
| Notifications | SMS, email, push notifications |

### 2.3 Out of Scope

- Multi-hospital/chain management
- Insurance integration
- Telemedicine/video consultation
- AI-based diagnosis
- Mobile native apps (responsive web only for now)

---

## 3. User Journey

### 3.1 New Patient — First Visit

```
Patient calls hospital
    ↓
Receptionist searches patient (not found)
    ↓
Receptionist registers new patient
    → System generates UHID: AHMS-2026-000001
    ↓
Receptionist books appointment
    → Token number auto-assigned
    ↓
Patient arrives → Receptionist updates status to WAITING
    ↓
Doctor sees patient in queue → Starts consultation
    ↓
Doctor records: Chief Complaints, History, Examination
    ↓
Doctor records: Prakriti, Vikriti, Dosha analysis
    ↓
Doctor creates Diagnosis
    ↓
Doctor writes Prescription
    ↓
Doctor refers to Panchakarma (if needed)
    ↓
Patient goes to billing → Pays consultation fee
    ↓
Patient goes to pharmacy → Medicines dispensed
    ↓
Encounter marked COMPLETED
```

### 3.2 Referral Flow — Cross-Department

```
Doctor A (Kaya Chikitsa) examines patient
    ↓
Doctor A decides to refer to Doctor B (Panchakarma)
    ↓
Doctor A creates Referral
    → System captures: Source Encounter, Clinical Notes, Priority
    ↓
Referral status: CREATED
    ↓
Doctor B sees referral in "Incoming" queue
    ↓
Doctor B clicks referral → Sees full source history:
    → Previous consultation (Chief Complaints, History, Examination)
    → Diagnosis (Primary + Comorbidity)
    → Prescriptions (Medicines, Doses, Dispensed Qty)
    → Ayurveda Fields (Prakriti, Vikriti, Dosha)
    → Referral Notes from Doctor A
    ↓
Doctor B accepts referral → Status: ACCEPTED
    ↓
Doctor B starts new encounter for this patient
    → New department, new token
    ↓
Doctor B completes consultation
    ↓
Referral status: COMPLETED
    ↓
Unified timeline shows both encounters
```

### 3.3 Patient Portal Flow

```
Patient receives UHID + registered mobile
    ↓
Patient visits portal → Logs in with UHID + mobile
    ↓
Sees dashboard: Appointments, Prescriptions, Due Amount
    ↓
Books appointment online
    ↓
Views prescription after consultation
    ↓
Views bills and payment status
    ↓
Downloads receipts
```

---

## 4. Modules

### 4.1 Module Map

```
┌─────────────────────────────────────────────────────────┐
│                    AHMS MODULES                          │
├─────────────┬─────────────┬─────────────┬───────────────┤
│ FOUNDATION  │ CLINICAL    │ OPERATIONS  │ PATIENT       │
├─────────────┼─────────────┼─────────────┼───────────────┤
│ Auth        │ EMR         │ Pharmacy    │ Portal        │
│ RBAC        │ Consultation│ Billing     │ Appointments  │
│ Departments │ Diagnosis   │ Inventory   │ Prescriptions │
│ Doctors     │ Referrals   │ Audit       │ Bills         │
│ Users       │ Timeline    │ Reports     │ Profile       │
│ Hospital    │ Panchakarma │ Dashboard   │               │
│ Patients    │ IPD         │             │               │
│ Appointments│ Investigations│           │               │
└─────────────┴─────────────┴─────────────┴───────────────┘
```

### 4.2 Module Dependencies

```
Auth → RBAC → All Modules
Patients → Encounters → Consultations → Prescriptions → Pharmacy
Patients → Encounters → Billing
Patients → Encounters → Referrals → Encounters (new department)
Patients → Timeline (aggregates all encounters)
```

---

## 5. Development Phases

### Phase 1 — Core Hospital Workflow (Current)

| Sprint | Deliverable |
|--------|-------------|
| Sprint 1 | Auth, RBAC, Patient Registration, UHID |
| Sprint 2 | Appointments, OPD Workflow, Encounters |
| Sprint 3 | Consultation, Diagnosis, Ayurveda Fields |
| Sprint 4 | Prescriptions, Pharmacy, Dispensing |
| Sprint 5 | Referrals, Timeline, Cross-department history |
| Sprint 6 | Billing, Payments, Dashboard |
| Sprint 7 | Patient Portal, Public Pages |
| Sprint 8 | Audit Logging, Security Hardening, QA |

### Phase 2 — Extended Features

| Sprint | Deliverable |
|--------|-------------|
| Sprint 9 | Panchakarma Module |
| Sprint 10 | IPD Module |
| Sprint 11 | Investigations Module |
| Sprint 12 | Hospital/User/Role Management |
| Sprint 13 | Reports & Analytics |
| Sprint 14 | Export, Print, Notifications |

---

## 6. Folder Structure

### 6.1 Backend

```
ahms-backend/
├── cmd/
│   └── api/
│       └── main.go                    # Entry point
├── internal/
│   ├── config/
│   │   └── config.go                  # Environment configuration
│   ├── database/
│   │   └── database.go                # DB connection, migrations, seeds
│   ├── middleware/
│   │   ├── auth.go                    # JWT authentication
│   │   ├── permission.go              # Fine-grained permission check
│   │   ├── cors.go                    # CORS configuration
│   │   ├── ratelimit.go               # Rate limiting
│   │   ├── security.go                # Security headers
│   │   └── blacklist.go               # Token blacklist
│   ├── models/
│   │   ├── base.go                    # BaseModel (UUID, timestamps)
│   │   ├── user.go                    # User model
│   │   ├── role.go                    # Role model
│   │   ├── permission.go              # Permission model
│   │   ├── patient.go                 # Patient model
│   │   ├── doctor.go                  # Doctor model
│   │   ├── department.go              # Department model
│   │   ├── appointment.go             # Appointment model
│   │   ├── encounter.go               # Encounter model
│   │   ├── consultation.go            # Consultation model
│   │   ├── diagnosis.go               # Diagnosis model
│   │   ├── prescription.go            # Prescription model
│   │   ├── pharmacy.go                # Medicine + Inventory model
│   │   ├── billing.go                 # Bill + Payment model
│   │   ├── referral.go                # Referral model
│   │   └── audit_log.go              # Audit Log model
│   ├── utils/
│   │   ├── jwt.go                     # JWT manager
│   │   ├── password.go                # bcrypt utilities
│   │   └── response.go                # API response helpers
│   ├── auth/                          # Auth module
│   │   ├── dto.go
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── routes.go
│   ├── patients/                      # Patients module
│   ├── appointments/                  # Appointments module
│   ├── encounters/                    # Encounters module
│   ├── consultations/                 # Consultations module
│   ├── prescriptions/                 # Prescriptions module
│   ├── pharmacy/                      # Pharmacy module
│   ├── billing/                       # Billing module
│   ├── referrals/                     # Referrals module
│   ├── timeline/                      # Timeline module
│   ├── departments/                   # Departments module
│   ├── doctors/                       # Doctors module
│   ├── dashboard/                     # Dashboard module
│   ├── portal/                        # Patient Portal module
│   └── audit/                         # Audit module
├── docs/                              # Swagger documentation
├── go.mod
├── go.sum
├── .env
├── Dockerfile
└── docker-compose.yml
```

### 6.2 Frontend

```
ahms-frontend/
├── src/
│   ├── components/
│   │   ├── ui.tsx                     # Core UI primitives
│   │   ├── AdminLayout.tsx            # Admin shell
│   │   ├── PublicLayout.tsx           # Public shell
│   │   └── hero/                      # Hero components
│   ├── design-system/
│   │   ├── tokens.ts                  # Design tokens
│   │   ├── animations.ts             # Motion variants
│   │   ├── Buttons.tsx               # Premium buttons
│   │   ├── Cards.tsx                 # Premium cards
│   │   ├── Forms.tsx                 # Floating forms
│   │   ├── Layout.tsx                # Section layouts
│   │   ├── AdminComponents.tsx       # Admin-specific
│   │   └── index.ts                  # Barrel export
│   ├── pages/
│   │   ├── admin/                     # Admin pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Patients.tsx
│   │   │   ├── PatientNew.tsx
│   │   │   ├── PatientDetail.tsx
│   │   │   ├── Appointments.tsx
│   │   │   ├── Encounters.tsx
│   │   │   ├── Consultation.tsx
│   │   │   ├── Prescriptions.tsx
│   │   │   ├── Referrals.tsx
│   │   │   ├── ReferralDetail.tsx
│   │   │   ├── Pharmacy.tsx
│   │   │   ├── Billing.tsx
│   │   │   ├── Doctors.tsx
│   │   │   ├── Departments.tsx
│   │   │   └── AuditLogs.tsx
│   │   ├── portal/                    # Patient portal pages
│   │   │   ├── PatientLogin.tsx
│   │   │   ├── PortalHome.tsx
│   │   │   ├── PortalAppointments.tsx
│   │   │   ├── PortalPrescriptions.tsx
│   │   │   └── PortalBills.tsx
│   │   ├── Home.tsx                   # Public home
│   │   ├── PublicDepartments.tsx
│   │   ├── PublicDoctors.tsx
│   │   ├── PublicAppointment.tsx
│   │   ├── Contact.tsx
│   │   └── Login.tsx
│   ├── lib/
│   │   ├── api.ts                     # Axios client + interceptors
│   │   └── auth.tsx                   # Auth context/provider
│   ├── App.tsx                        # Router configuration
│   ├── main.tsx                       # Entry point
│   └── index.css                      # Global styles + tokens
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 7. Coding Standards

### 7.1 Backend (Go)

| Rule | Standard |
|------|----------|
| Formatting | `gofmt` / `goimports` |
| Linting | `golangci-lint` |
| Error handling | Always check errors; never `_ = err` |
| Naming | camelCase for variables, PascalCase for exports |
| Comments | All exported functions must have godoc comments |
| Tests | Unit tests for service layer; table-driven tests |
| DB | Use GORM; never raw SQL unless necessary |
| Auth | Always use middleware; never skip permission checks |
| Response | Always use `utils.Success()` / `utils.Fail()` |

### 7.2 Frontend (TypeScript/React)

| Rule | Standard |
|------|----------|
| Formatting | `prettier` |
| Linting | `oxlint` |
| Components | Functional components only; no class components |
| Hooks | Custom hooks for reusable logic |
| Types | Define interfaces for all props and API responses |
| State | React Context for auth; local state for UI |
| API | Always use `api.ts` / `portalApi` axios instances |
| Styling | Tailwind CSS only; no inline styles |
| Icons | Lucide React only |
| Animation | Framer Motion for all transitions |
| Forms | React Hook Form + Zod validation |

---

## 8. Naming Conventions

### 8.1 Database

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case, plural | `patients`, `encounter_consultations` |
| Columns | snake_case | `patient_id`, `created_at` |
| Primary keys | `id` (UUID) | `id` |
| Foreign keys | `{table_singular}_id` | `patient_id`, `doctor_id` |
| Indexes | `idx_{table}_{column}` | `idx_patients_uhid` |
| Unique indexes | `uniq_{table}_{column}` | `uniq_users_email` |

### 8.2 Go (Backend)

| Element | Convention | Example |
|---------|-----------|---------|
| Packages | lowercase, single word | `patients`, `consultations` |
| Files | snake_case | `dto.go`, `service.go`, `repository.go` |
| Types | PascalCase | `CreatePatientRequest`, `PatientResponse` |
| Functions | PascalCase (exported), camelCase (unexported) | `FindByID`, `toResponse` |
| Constants | PascalCase | `RoleDoctor`, `PermPatientView` |
| Variables | camelCase | `patientID`, `doctorName` |
| DB columns | snake_case via GORM tags | `json:"patient_id"` |

### 8.3 TypeScript (Frontend)

| Element | Convention | Example |
|---------|-----------|---------|
| Files | PascalCase for components | `PatientLogin.tsx`, `PortalHome.tsx` |
| Components | PascalCase | `PatientLogin`, `PortalHome` |
| Functions | camelCase | `loadPatients`, `handleSubmit` |
| Variables | camelCase | `patientName`, `formData` |
| Interfaces | PascalCase | `Patient`, `LoginResponse` |
| Constants | UPPER_SNAKE_CASE | `TOKEN_KEY`, `API_BASE_URL` |

---

## 9. Git Workflow

### 9.1 Commit Messages

Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code refactoring (no feature change) |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies |
| `perf` | Performance improvement |

Examples:

```
feat(patients): add duplicate mobile detection
fix(portal): correct uhid column name in portal login query
docs(vol1): add RBAC matrix for all modules
refactor(billing): extract payment logic into service
```

---

## 10. Branch Strategy

### 10.1 Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch for next release |
| `feature/*` | Feature development |
| `fix/*` | Bug fixes |
| `release/*` | Release preparation |

### 10.2 Workflow

```
feature/* → develop → release/* → main
                              ↓
                          hotfix/* → main
```

### 10.3 Rules

1. Never commit directly to `main`
2. All features branch from `develop`
3. All merges to `develop` require PR review
4. Release branches are created from `develop`
5. Hotfixes branch from `main` and merge back

---

## 11. UI Design Principles

### 11.1 Visual Language

| Principle | Implementation |
|-----------|---------------|
| **Premium Healthcare** | Teal (#0F766E) primary, Gold (#C8A14D) accent, Ivory (#FAF8F2) background |
| **Clean Hierarchy** | Poppins for headings, Inter for body text |
| **Generous Spacing** | 8px base grid, rounded-2xl corners |
| **Subtle Depth** | Teal-tinted shadows, glass morphism for overlays |
| **Purposeful Motion** | Framer Motion for page transitions, hover effects, stagger animations |

### 11.2 Interaction Principles

| Principle | Implementation |
|-----------|---------------|
| **Maximum 3 Clicks** | Any information reachable in 3 clicks or fewer |
| **Context Preservation** | Scroll position, filters, and state preserved on navigation |
| **Progressive Disclosure** | Show summary first, details on demand |
| **Feedback on Every Action** | Loading states, success toasts, error messages |
| **Keyboard Accessible** | Tab order, Enter to submit, Escape to close |

### 11.3 Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Single column, bottom nav, stacked cards |
| Tablet | 768px – 1024px | Two columns, collapsible sidebar |
| Desktop | > 1024px | Full sidebar, multi-column layouts |
| Wide | > 1440px | Max-width containers, centered content |

### 11.4 Role-Specific UX Rules

| Role | UX Rule |
|------|---------|
| Receptionist | Maximum 3 clicks to register patient, quick search always visible |
| Doctor | Patient timeline always visible, consultation form is primary |
| Pharmacist | Scan-first workflow, batch/expiry prominent |
| Billing | Print after payment, receipt auto-generated |
| Patient | Simple language, minimal fields, mobile-first |

---

## Appendix A: Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend Framework | Go + Gin | 1.10.0 |
| ORM | GORM | 1.25.10 |
| Database | PostgreSQL | 16 |
| Auth | JWT (HS256) | golang-jwt/v5 |
| Password | bcrypt | golang.org/x/crypto |
| API Docs | Swagger/OpenAPI | swaggo/gin-swagger |
| Frontend | React | 19.2.8 |
| Build Tool | Vite | 8.2.0 |
| Language | TypeScript | 6.0.2 |
| Styling | Tailwind CSS | 4.3.3 |
| HTTP Client | Axios | 1.19.0 |
| Routing | React Router | 7.18.2 |
| Animation | Framer Motion | 12.43.0 |
| Icons | Lucide React | 1.28.0 |
| Charts | Recharts | 3.10.1 |
| Containerization | Docker + Docker Compose | — |

---

## Appendix B: Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `ahms` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_NAME` | PostgreSQL database | `ahms` |
| `DB_SSLMODE` | SSL mode | `disable` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | — |
| `JWT_ACCESS_TTL` | Access token TTL | `60` (minutes) |
| `JWT_REFRESH_TTL` | Refresh token TTL | `10080` (7 days) |
| `CORS_ALLOWED_ORIGINS` | CORS origins | `http://localhost:5173` |
| `SEED_SUPER_ADMIN_EMAIL` | Super admin email | `admin@ahms.local` |
| `SEED_SUPER_ADMIN_MOBILE` | Super admin mobile | `9999999999` |
| `SEED_SUPER_ADMIN_PASSWORD` | Super admin password | — |
| `SEED_DEMO_DEPARTMENTS` | Seed demo departments | `true` |
| `REDIS_ENABLED` | Enable Redis cache | `false` |

---

*End of Volume 0 — Project Overview*
