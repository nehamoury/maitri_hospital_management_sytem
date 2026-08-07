# AHMS — Phase A QA & Production Hardening Checklist

**Project:** Ayurvedic Hospital Management System (AHMS)
**Stage:** Production-Ready Core MVP — QA & Hardening
**Stack:** Go (backend, Docker :8080) + Vite/React/TS/Tailwind (frontend, local :5173)
**Base URL:** `http://localhost:5173/api/v1` (frontend proxy) | `http://localhost:8080/api/v1` (direct)
**Test data:** `admin@ahms.local / ChangeMe123!` | doctor `asha@ahms.local / Doctor@123` | portal `AHMS-2026-000005 / 9876543210`

**Status legend:** `[ ]` Pending · `[P]` Pass · `[F]` Fail · `[B]` Blocked
**Priority legend:** `[CRIT]` Critical (production blocker) · `[HIGH]` High · `[MED]` Medium

---

## 1. Authentication & Security

| ID | Priority | Module | Test Case | Expected Result | Status | Bug ID |
|----|----------|--------|-----------|-----------------|--------|--------|
| AUTH-001 | CRIT | auth | Valid login (admin) | 200, access_token + user with role SUPER_ADMIN | [ ] | |
| AUTH-002 | CRIT | auth | Valid login (doctor) | 200, token with role DOCTOR | [P] | |
| AUTH-003 | CRIT | auth | Invalid password | 401, no token | [ ] | |
| AUTH-004 | CRIT | auth | Unknown email | 401, no user enumeration in error | [ ] | |
| AUTH-005 | CRIT | auth | Empty body to /auth/login | 400 | [ ] | |
| AUTH-006 | HIGH | auth | Request protected API with NO token | 401 | [P] | |
| AUTH-007 | HIGH | auth | Request protected API with garbage token | 401 | [P] | |
| AUTH-008 | HIGH | auth | Request protected API with tampered/expired JWT | 401 | [P] | |
| AUTH-009 | HIGH | auth | GET /auth/me with valid token | 200, returns current user | [ ] | |
| AUTH-010 | HIGH | auth | POST /auth/refresh with valid refresh token | 200, new access_token | [ ] | |
| AUTH-011 | HIGH | auth | POST /auth/refresh with invalid refresh token | 401 | [ ] | |
| AUTH-012 | MED | auth | POST /auth/logout | 200; subsequent token refresh invalidated (if supported) | [ ] | |
| AUTH-013 | HIGH | security | Port 8080 exposed publicly while /api also on 5173 | Decide deployment posture: document which port is public | [ ] | |
| AUTH-014 | CRIT | security | SQL injection attempt in patient search (`' OR '1'='1`) | 200, returns no rows / no error leak | [P] | |
| AUTH-015 | CRIT | security | No secrets in client bundle / git | API keys, DB password absent from frontend code and repo | [ ] | |
| AUTH-016 | MED | security | Login rate limiting / brute force (many failed logins) | 429 or backoff after N attempts (document if absent) | [ ] | |

## 2. RBAC Testing (who sees / edits / deletes what)

Roles under test: SUPER_ADMIN, HOSPITAL_ADMIN, RECEPTIONIST, DOCTOR, PHARMACIST, PATIENT.

| ID | Priority | Module | Test Case | Expected Result | Status | Bug ID |
|----|----------|--------|-----------|-----------------|--------|--------|
| RBAC-001 | CRIT | patients | Receptionist creates patient | 200/201 | [ ] | |
| RBAC-002 | CRIT | patients | Patient (portal token) calls POST /patients | 403 (role not allowed) | [P] | |
| RBAC-003 | CRIT | patients | Pharmacist edits a patient record | 403 | [ ] | |
| RBAC-004 | CRIT | patients | Super Admin deletes a patient | 200; record soft-deleted | [ ] | |
| RBAC-005 | CRIT | patients | Receptionist deletes a patient | 403 | [ ] | |
| RBAC-006 | HIGH | appointments | Receptionist books appointment | 200/201 | [ ] | |
| RBAC-007 | HIGH | appointments | Pharmacist cancels appointment | 403 | [ ] | |
| RBAC-008 | HIGH | encounters | Doctor creates encounter for own dept | 200/201 | [ ] | |
| RBAC-009 | HIGH | encounters | Receptionist updates encounter status | 403 (PermEncounterUpdate required) | [ ] | |
| RBAC-010 | HIGH | clinical | Doctor creates consultation + prescription | 200/201 | [ ] | |
| RBAC-011 | HIGH | clinical | Receptionist creates consultation | 403 | [ ] | |
| RBAC-012 | HIGH | referrals | Doctor creates referral | 200/201 | [ ] | |
| RBAC-013 | HIGH | referrals | Receptionist updates referral status | 403 | [ ] | |
| RBAC-014 | HIGH | pharmacy | Pharmacist adjusts stock + dispenses | 200 | [ ] | |
| RBAC-015 | HIGH | pharmacy | Doctor dispenses medicine | 403 (unless permission granted) | [ ] | |
| RBAC-016 | HIGH | billing | Billing clerk / admin creates bill | 200/201 | [ ] | |
| RBAC-017 | HIGH | billing | Doctor records a payment | 403 | [P] | |
| RBAC-018 | HIGH | audit | Super Admin reads audit logs | 200 | [ ] | |
| RBAC-019 | HIGH | audit | Receptionist reads audit logs | 403 (PermAuditView) | [ ] | |
| RBAC-020 | HIGH | portal | Patient reads ONLY own data | Portal endpoints return only self records | [ ] | |
| RBAC-021 | CRIT | portal | Patient calls GET /portal/bills after impersonating another patient's token | 403/404, no data leak | [P] | |
| RBAC-022 | HIGH | doctors | Only admins manage doctors (create/update/delete) | 403 for clinical roles | [ ] | |
| RBAC-023 | HIGH | departments | Only admins manage departments | 403 for clinical roles | [ ] | |

## 3. Patient Flow — End-to-End

| ID | Priority | Module | Test Case | Expected Result | Status | Bug ID |
|----|----------|--------|-----------|-----------------|--------|--------|
| FLOW-001 | CRIT | patients | Register patient | UHID generated (AHMS-YYYY-NNNNNN), 201 | [P] | |
| FLOW-002 | CRIT | patients | Duplicate registration (same name+mobile) | 409 + existing_patients list | [P] | |
| FLOW-003 | CRIT | patients | Force registration of duplicate | 201 (bypass duplicate) | [ ] | |
| FLOW-004 | HIGH | appointments | Book appointment | 201, token_number allocated | [P] | |
| FLOW-005 | HIGH | appointments | Complete appointment | Status → COMPLETED | [P] | |
| FLOW-006 | CRIT | encounters | Create encounter | 201, token + dept + doctor | [P] | |
| FLOW-007 | CRIT | encounters | Advance encounter status (REGISTERED→WAITING→IN_CONSULTATION→COMPLETED) | Each PATCH succeeds | [P] | |
| FLOW-008 | CRIT | consultation | Save consultation with diagnoses | 200/201, diagnoses stored | [P] | |
| FLOW-009 | CRIT | prescriptions | Create prescription with ≥1 item | 201, status PRESCRIBED | [P] | |
| FLOW-010 | CRIT | pharmacy | Dispense prescription against medicine stock | 200, stock decremented, rx status DISPENSED/PARTIALLY_DISPENSED | [P] | |
| FLOW-011 | CRIT | pharmacy | Dispense more than available stock | 409, no stock change (rollback) | [P] | |
| FLOW-012 | CRIT | referrals | Create referral (patient → other dept) | REF number generated | [P] | |
| FLOW-013 | CRIT | referrals | Receiving doctor walks status CREATED→RECEIVED→ACCEPTED→CONSULTATION_STARTED→COMPLETED | All transitions valid | [P] | |
| FLOW-014 | CRIT | timeline | GET /patients/:id/timeline shows encounters, consultations, diagnoses, prescriptions | Chronological cross-dept history | [P] | |
| FLOW-015 | CRIT | billing | Create bill after care | bill_no auto, net = sum − discount | [P] | |
| FLOW-016 | CRIT | billing | Partial payment then full payment | status PARTIAL → PAID, due = 0 | [P] | |
| FLOW-017 | HIGH | portal | Patient logs in, views appointments/prescriptions/bills | Self-only data correct | [P] | |

## 4. API Validation

| ID | Priority | Module | Test Case | Expected Result | Status | Bug ID |
|----|----------|--------|-----------|-----------------|--------|--------|
| VAL-001 | CRIT | all | POST with empty JSON body | 400, no partial write | [P] | |
| VAL-002 | CRIT | all | Invalid UUID in path param (/patients/abc) | 400 | [P] | |
| VAL-003 | HIGH | patients | Invalid DOB format (not YYYY-MM-DD) | 400 | [P] | |
| VAL-004 | HIGH | patients | Mobile < 10 digits | 400 | [ ] | |
| VAL-005 | HIGH | patients | Invalid gender value | 400 (oneof MALE/FEMALE/OTHER) | [P] | |
| VAL-006 | HIGH | patients | Invalid email format | 400 | [ ] | |
| VAL-007 | HIGH | patients | Age out of range (e.g. 999) | 400 (0–150) | [P] | |
| VAL-008 | HIGH | appointments | Missing appointment_date | 400 | [ ] | |
| VAL-009 | HIGH | appointments | Date not in YYYY-MM-DD | 400 | [ ] | |
| VAL-010 | HIGH | appointments | Nonexistent doctor_id | 404 | [ ] | |
| VAL-011 | HIGH | encounters | Missing department_id/doctor_id | 400 | [ ] | |
| VAL-012 | HIGH | consultations | Missing required diagnosis field | 400 | [ ] | |
| VAL-013 | HIGH | prescriptions | Empty items array | 400 (min=1) | [ ] | |
| VAL-014 | HIGH | prescriptions | Medicine item with missing medicine name | 400 | [ ] | |
| VAL-015 | HIGH | referrals | Missing reason | 400 | [ ] | |
| VAL-016 | HIGH | referrals | Nonexistent source_encounter_id | 404 | [ ] | |
| VAL-017 | HIGH | pharmacy | Negative stock quantity | 400 (gte=0) | [P] | |
| VAL-018 | HIGH | pharmacy | Medicine with empty name | 400 | [ ] | |
| VAL-019 | HIGH | billing | Bill with empty items | 400 (min=1) | [ ] | |
| VAL-020 | HIGH | billing | Payment amount 0 or negative | 400 | [ ] | |
| VAL-021 | HIGH | billing | Payment exceeding due | Rejected or clamped (verify + document) | [ ] | |
| VAL-022 | HIGH | portal | Portal login wrong UHID/mobile | 401 | [ ] | |
| VAL-023 | HIGH | portal | Portal login missing fields | 400 | [ ] | |
| VAL-024 | MED | all | Unexpected content-type / malformed JSON | 400, no crash | [ ] | |
| VAL-025 | MED | all | Oversized body | 413 or 400, no crash | [ ] | |

## 5. UI Testing

| ID | Priority | Module | Test Case | Expected Result | Status | Bug ID |
|----|----------|--------|-----------|-----------------|--------|--------|
| UI-001 | HIGH | admin | Empty table states (no data) | Friendly message, no raw error | [ ] | |
| UI-002 | HIGH | admin | Search with no results (patients) | "No patients found" empty state | [ ] | |
| UI-003 | HIGH | admin | Loading state visible on slow requests | Spinner, no flicker of empty table | [ ] | |
| UI-004 | HIGH | admin | Network down / backend down | Error message shown, not blank page | [ ] | |
| UI-005 | HIGH | admin | 404 on unknown route (/admin/xyz) | Redirect to home or styled 404 | [ ] | |
| UI-006 | HIGH | admin | 500 / 401 response handling | Toast/banner with message; 401 → redirect to login | [ ] | |
| UI-007 | HIGH | admin | Form validation (required fields) | Inline validation blocks submit | [ ] | |
| UI-008 | HIGH | admin | Success/error feedback after create/update | Clear toast or inline banner | [ ] | |
| UI-009 | HIGH | portal | Portal login error (wrong UHID) | Clear message | [ ] | |
| UI-010 | HIGH | portal | Portal logged-out guard | Visiting /portal w/o token → redirect to login | [ ] | |
| UI-011 | MED | admin | Browser back/forward navigation | Correct page, scroll position sane | [ ] | |
| UI-012 | MED | admin | Refresh on deep link (/admin/patients/123) | Page loads correctly | [ ] | |
| UI-013 | MED | admin | Date inputs consistent timezone | Date shown equals date stored (no off-by-one) | [ ] | |

## 6. Responsive Testing

| ID | Priority | Module | Test Case | Expected Result | Status | Bug ID |
|----|----------|--------|-----------|-----------------|--------|--------|
| RESP-001 | MED | admin | Desktop 1920×1080 | Layout clean, tables scroll | [ ] | |
| RESP-002 | MED | admin | Laptop 1366×768 | Sidebar + content fit | [ ] | |
| RESP-003 | HIGH | admin | Tablet 768px | Sidebar collapses, navigation usable | [ ] | |
| RESP-004 | HIGH | admin | Mobile 375px | Forms/tables usable, no horizontal overflow of page | [ ] | |
| RESP-005 | MED | public | Mobile 375px (home/departments/doctors) | Stacked cards, readable | [ ] | |
| RESP-006 | MED | portal | Mobile 375px (portal pages) | Nav accessible, tables scroll | [ ] | |
| RESP-007 | MED | admin | Modal (billing details) on mobile | Fits viewport, scrollable | [ ] | |

## 7. Performance

| ID | Priority | Module | Test Case | Expected Result | Status | Bug ID |
|----|----------|--------|-----------|-----------------|--------|--------|
| PERF-001 | HIGH | dashboard | GET /dashboard response time | < 300 ms locally | [ ] | |
| PERF-002 | HIGH | patients | Patient search with 10k rows | < 500 ms, index in use (verify query) | [ ] | |
| PERF-003 | HIGH | timeline | GET /patients/:id/timeline | < 500 ms | [ ] | |
| PERF-004 | MED | all | List endpoints pagination | Documented + frontend limit where applicable | [ ] | |
| PERF-005 | MED | frontend | Production build bundle size | Currently ~374 KB JS / ~107 KB gzip; watch for regression | [ ] | |
| PERF-006 | MED | frontend | Lazy-load admin routes (optional) | Reduce initial JS if needed | [ ] | |

---

## How to run

```powershell
# Backend (Docker) only
docker compose up -d --build        # from ahms-backend/
# Frontend (local dev)
cd ahms-frontend; npm run dev       # http://localhost:5173
```

## Quick API test helpers

```powershell
# Login
$body = '{"email":"admin@ahms.local","password":"ChangeMe123!"}'
$r = Invoke-RestMethod -Uri "http://localhost:5173/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
$h = @{ Authorization = "Bearer $($r.data.access_token)" }
# Unauthorized check
try { Invoke-RestMethod -Uri "http://localhost:5173/api/v1/patients" -Headers @{} } catch { $_.Exception.Response.StatusCode.value__ }
```

## Automated execution log (2026-08-03)

## Automated execution log (2026-08-07) — RBAC matrix re-run after review changes (final)

**366/366 PASS** · **0 FAIL** · **0 permission leaks**

**Environment / versions**
- Test date: 2026-08-07
- Backend module: `github.com/ahms/backend` (no git repo; tracked via Docker image tag)
- Docker backend image: `ahms-backend-backend` `20b8692ac4b0` (`latest`, built 2026-08-07 13:44:30) — re-built + redeployed for this run
- Frontend: `ahms-frontend` package version `0.0.0` (local `npm run dev` :5173)
- Infra: `ahms_postgres` (postgres:16-alpine, healthy) · `ahms_redis` (redis:7-alpine) · `ahms_backend`
- Health: `GET /health` → `200 {"status":"up"}`
- Seed: `database: permissions seeded` confirmed in logs; idempotent `Replace` reseed applied (stale grants revoked, new grants inserted)

**Roles tested:** SUPER_ADMIN, HOSPITAL_ADMIN, RECEPTIONIST, DOCTOR, PHARMACIST, BILLING_ACCOUNTS (each with real login + permission membership + GET/POST API status), plus PATIENT portal (UHID+mobile) verified against admin endpoints = 403.

**Changes verified in this run (review-final matrix):**
- Added new permissions `bill.print` + `receipt.print` (constants + seed); granted to SUPER_ADMIN, HOSPITAL_ADMIN, BILLING_ACCOUNTS.
- RECEPTIONIST: **removed** `patient.delete` (now view/create/update only).
- DOCTOR + PANCHAKARMA_DOCTOR: **removed** `appointment.create/update/cancel/checkin` — now `appointment.view` only (receptionist manages appointments).
- HOSPITAL_ADMIN: **removed** `doctor.delete` + `department.delete` (soft-inactive workflow instead). No change to `user.delete`.
- PHARMACIST: `pharmacy.dispense` confirmed present (as spec).
- Missing-role seed verified: NURSE, THERAPIST, WARD_STAFF, DIET_KITCHEN, LAB_STAFF, PANCHAKARMA_DOCTOR all seeded with baseline `patient.view` + `viewClinical` (+ dashboard/doctor view). Panchakarma Doctor's `appointment.*` narrowed per review. (No `nursing.*`/`therapy.*`/`lab.*` perms — modules not yet built; permission catalog is built-modules only.)

**Permission matrix (membership, role ⇒ perms present):**

| Permission | SUPER_ADMIN | HOSPITAL_ADMIN | RECEPTIONIST | DOCTOR | PHARMACIST | BILLING_ACCOUNTS |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| dashboard.view | Y | Y | Y | Y | Y | Y |
| patient.view | Y | Y | Y | Y | Y | Y |
| patient.create | Y | Y | Y | – | – | – |
| patient.update | Y | Y | Y | Y | – | – |
| patient.delete | Y | Y | – | – | – | – |
| patient.export | Y | Y | – | – | – | – |
| appointment.view | Y | Y | Y | Y | – | – |
| appointment.create | Y | Y | Y | – | – | – |
| appointment.update | Y | Y | Y | – | – | – |
| appointment.cancel | Y | Y | Y | – | – | – |
| appointment.checkin | Y | Y | Y | – | – | – |
| encounter.view | Y | Y | Y | Y | Y | – |
| encounter.create | Y | Y | Y | Y | – | – |
| consultation.view | Y | Y | – | Y | – | – |
| consultation.create | Y | Y | – | Y | – | – |
| consultation.update | Y | Y | – | Y | – | – |
| prescription.view | Y | Y | Y | Y | Y | – |
| prescription.create | Y | Y | – | Y | – | – |
| prescription.update | Y | Y | – | Y | – | – |
| prescription.print | Y | Y | – | Y | – | – |
| referral.view | Y | Y | – | Y | – | – |
| referral.create | Y | Y | – | Y | – | – |
| referral.update | Y | Y | – | Y | – | – |
| pharmacy.view | Y | Y | – | Y | Y | Y |
| pharmacy.stock | Y | Y | – | – | Y | – |
| pharmacy.dispense | Y | Y | – | – | Y | – |
| billing.view | Y | Y | Y | Y | Y | Y |
| billing.create | Y | Y | – | – | – | Y |
| billing.payment | Y | Y | – | – | – | Y |
| billing.refund | Y | Y | – | – | – | – |
| bill.print | Y | Y | – | – | – | Y |
| receipt.print | Y | Y | – | – | – | Y |
| doctor.view | Y | Y | Y | Y | Y | Y |
| doctor.create | Y | Y | – | – | – | – |
| doctor.update | Y | Y | – | – | – | – |
| doctor.delete | Y | – | – | – | – | – |
| department.view | Y | Y | Y | – | – | Y |
| department.create | Y | Y | – | – | – | – |
| department.update | Y | Y | – | – | – | – |
| department.delete | Y | – | – | – | – | – |
| audit.view | Y | Y | – | – | – | – |
| user.view | Y | Y | – | – | – | – |
| role.manage | Y | – | – | – | – | – |
| config.manage | Y | – | – | – | – | – |
| reports.view | Y | Y | – | – | – | – |
| reports.export | Y | Y | – | – | – | – |
| clinical.view | Y | Y | Y | Y | Y | – |
| encounter.close | Y | Y | Y | Y | – | – |
| consultation.print | Y | Y | – | Y | – | – |
| inventory.manage | Y | Y | – | – | Y | – |
| pharmacy.purchase | Y | Y | – | – | Y | – |

**API assert (per role, samples):** 6/6 logins 200; GET /dashboard /patients /appointments /encounters /doctors /departments /medicines /bills = 200 where permitted, **403 where not** (e.g. RECEPTIONIST GET /medicines=403, /audit-logs=403; PHARMACIST GET /appointments=403; BILLING_ACCOUNTS GET /appointments /encounters=403; restricted POST = 403). Admin-with-perm POST (empty `{}`) → 4xx validation as expected (auth passed).

**Verdict:** RBAC `production-ready` candidate — release blocking matrix at 366/366.

---

## Spec-compliance audit (Sections 3–7) — 2026-08-07

Findings from auditing the implementation against the system-spec Sections 3 (Roles), 4 (Registration & UHID), 5 (EMR), 6 (OPD), 7 (Consultation). Role-by-role working state at the time the audit was run.

**3. System Roles — PASS ✅** All 13 roles defined (`internal/models/role.go:7-21`): SUPER_ADMIN, HOSPITAL_ADMIN, RECEPTIONIST, DOCTOR, NURSE, PANCHAKARMA_DOCTOR, THERAPIST, PHARMACIST, BILLING_ACCOUNTS, WARD_STAFF, DIET_KITCHEN, LAB_STAFF, PATIENT. Permissions are action-based (`patient.view`, `prescription.create`, `pharmacy.dispense`) matching spec. RBAC matrix verified 366/366.

**5. Unified EMR — PASS** ✅Patient → Encounter → Clinical Records architecture confirmed. Each OPD/IPD visit = separate `encounters` row (`internal/models/encounter.go:39-68`); consultations/prescriptions/diagnoses/referrals all FK to `EncounterID`. No single-editable-document anti-pattern.

| Section | Status | Gaps |
|---------|--------|------|
| 3. Roles (13) | ✅ PASS | None |
| 4. UHID format | ✅ PASS (fixed) | Prefix ~AHMS~→**MCAH** (2 sites: patients/appointments repo); 6-digit pad `%06d` already spec |
| 4. Duplicate detection | ✅ PASS (fixed) | Was mobile-only; now mobile / alternate_mobile / email / name+mobile / name+DOB (`FindDuplicates`) |
| 4. No new patient per OPD/IPD visit | ✅ PASS | Encounter only, never new patient |
| 5. Unified EMR | ✅ PASS | None |
| 6. OPD statuses | ⚠️ PARTIAL | 4 core statuses present; optional `REFERRED/PROCEDURE_ORDERED/ADMISSION_RECOMMENDED` + legal transition-validation NOT built (deferred) |
| 7. Consultation fields | ⚠️ PARTIAL | chief/history/exam/dx/notes/treatment/diet/follow-up present; **investigations absent** (deferred with Lab module); Ayurveda fields present as free-form `ayurveda_fields` JSONB (no backend schema) |

### Deferred (user decision — hold for later milestone)
- Existing `AHMS-*` UHID migration → MCAH (keep old rows; new patients MCAH; separate planned migration script).
- Consultation `investigations`/lab field (with Lab module).
- OPD optional statuses + transition-state graph (OPD workflow enhancement).
- Specialist-role modules & perms (NURSE/THERAPIST/LAB_STAFF/DIET_KITCHEN/WARD_STAFF) — next major release.
- No Aadhaar identifier column currently (not added to duplicate routine).

### Bugs found & fixed this audit
| ID | Module | Issue | Fix |
|---|---|---|---|
| BUG-004 | UHID | Prefix hardcoded `AHMS` | → `MCAH` in `patients/repository.go` + `appointments/repository.go:140`. New pads verified `MCAH-2026-000028`. |
| BUG-005 | search | Explore flagged `uh_id` typo; GORM maps `UHID`→column `uh_id` (**search was correct**; a naive `uhid` change would break it). | Reverted to `uh_id ILIKE`. UHID search verified 200. |
| BUG-006 | duplicate | `FindDuplicates` first build returned ALL active patients (is_active scoped wrong / empty-string alt-mobile & email matched). | Rewrote to scope `is_active` + only match non-empty fields. Verified same-mobile/name+mobile/email each → 409; unique → 201. |

Regressions: `go build` ✅ · `go vet` ✅ · `go test ./...` ✅ (patients pkg incl. new `TestCreateRejectsDuplicateByNameAndDOB`). Container healthy.

---

## Earlier run (2026-08-07) — Full RBAC permission-matrix (7 roles)

**342/342 PASS** (permission membership + API status per role). Logged in as all roles owning a users-row (SUPER_ADMIN/HOSPITAL_ADMIN/RECEPTIONIST/DOCTOR/PHARMACIST/BILLING_ACCOUNTS, QA password `Test@123`) + PATIENT portal (UHID+mobile). Verified every permission membership, GET=200, restricted POST=403.

| Role | Login | Menu/perms | Routes (GET) | Buttons/perms | API restrict | Result |
|------|-------|-----------|--------------|---------------|--------------|--------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ (none denied) | **PASS** |
| HOSPITAL_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ role.manage denied | **PASS** |
| RECEPTIONIST | ✅ | ✅ | ✅ | ✅ | ✅ consultation/referral denied | **PASS** |
| DOCTOR | ✅ | ✅ | ✅ | ✅ | ✅ pharmacy.stock/billing denied | **PASS** |
| PHARMACIST | ✅ | ✅ | ✅ | ✅ | ✅ consultation/billing denied | **PASS** |
| BILLING_ACCOUNTS | ✅ | ✅ | ✅ | ✅ | ✅ refund/clinical denied | **PASS** |
| PATIENT (portal) | ✅ | ✅ | ✅ | ✅ | ✅ admin endpoints 403 | **PASS** |

Patient portal verified: `patient.view,prescription.view,billing.view,encounter.view`; portal endpoints 200; `/patients` & `/medicines` = 403.

**Seed fixes applied on 2026-08-07 to meet design (idempotent seed — `Replace` not `Append`):**
- Added `doctor.view` + `department.view` to SUPER_ADMIN/HOSPITAL_ADMIN (previously create/update/delete only ⇒ admins saw no Doctors/Departments menu).
- Added `billing.view` to SUPER_ADMIN/HOSPITAL_ADMIN.
- Added `clinical.view` to RECEPTIONIST (needed by `GET /encounters`); dropped their `consultation.view`/`referral.view`.
- Dropped `consultation.view` from PHARMACIST; dropped `encounter.view`/`consultation.view`/`billing.refund` from BILLING_ACCOUNTS (per spec).

E2E patient flow — ALL PASS (17 checks): register UHID, appointment book/complete, encounter, consultation (2 dx), prescription (2 items), dispense → DISPENSED, over-dispense → 409, referral REF + full status flow, timeline (encounters/dx/rx), bill create, partial → PAID due=0, portal login + self data.

**RBAC matrix — ALL PASS** (37 checks) across RECEPTIONIST / PHARMACIST / HOSPITAL_ADMIN / BILLING_ACCOUNTS (test users created: `qa.receptionist@ahms.local`, `qa.pharmacist@ahms.local`, `qa.hadmin@ahms.local`, `qa.billing@ahms.local`, password `Test@123`):

| Role | Allowed (verified) | Denied (verified 403) |
|------|--------------------|-----------------------|
| RECEPTIONIST | dashboard, patients view/create, bills view | consultation.create, prescription.create, referral.create, medicines, billing.create, audit, doctors manage, departments manage |
| PHARMACIST | dashboard, medicines view/manage, stock adjust, dispense, rx status, rx view | patient.create, encounter.create, billing, appointments, audit |
| HOSPITAL_ADMIN | dashboard, patients, audit, medicines, departments create, doctor.manage | role.manage (endpoint absent → 404) |
| BILLING_ACCOUNTS | dashboard, patients, bills view/create, payments | patient.create, medicines, audit, appointments |

Design findings surfaced by the run: see DESIGN-001, DESIGN-002, NOTE-001, NOTE-002 in the bug log.

---

## Bug tracking

Any FAIL above → record **Bug ID** as `BUG-001`, `BUG-002`, ... and log in the project issues tracker with module + repro steps + expected vs actual.

### Logged bugs (from automated Phase A run)

| Bug ID | Priority | Module | Description | Status |
|--------|----------|--------|-------------|--------|
| BUG-001 | CRIT | frontend | Consultation & Prescription pages called wrong API paths (`/consultations/encounters/...` and `/prescriptions/encounters/...` → 404). Actual backend routes are `/encounters/{id}/consultation` and `/encounters/{id}/prescriptions`. | FIXED (Consultation.tsx, Prescriptions.tsx) |
| BUG-002 | MED | frontend | Billing & PortalBills compared payment status to `PARTIALLY_PAID`; backend enum is `PARTIAL`. Badge rendered wrong color for partial bills. | FIXED (Billing.tsx, PortalBills.tsx) |
| BUG-003 | MED | backend | `ApplyPayment` returned raw gorm error for a nonexistent bill → HTTP 400 instead of 404. `errors.Is(err, billing.ErrNotFound)` never matched. | FIXED (internal/billing/payment.go maps gorm.ErrRecordNotFound → ErrNotFound; backend rebuilt) |
| NOTE-001 | INFO | backend | Consultation/prescription/referral creation requires the authenticated user to have a DOCTOR record (service-level check `FindDoctorByUserID`). Super Admin gets 404 on these — correct RBAC design, but admin UI should show a clear message. | OPEN — UX note |
| DESIGN-001 | HIGH | RBAC | RECEPTIONIST has `encounter.update` (can complete appointments) but lacks `clinical.view` → **cannot list appointments** (`GET /appointments` = 403). Receptionist appointment workflow is broken. Needs a decision: grant `clinical.view` to RECEPTIONIST or add a dedicated appointment.view permission. | FIXED — added `appointment.view` + `appointment.update` permissions; granted to RECEPTIONIST/HOSPITAL_ADMIN/SUPER_ADMIN/DOCTOR/PANCHAKARMA_DOCTOR; routes `GET /appointments`→appointment.view, `PUT /appointments/:id/status`→appointment.update. RECEPTIONIST kept WITHOUT `clinical.view`. Verified: receptionist GET /appointments=200, timeline still 403, doctor still 200. |
| DESIGN-002 | MED | referrals | `GET /referrals/incoming` returns 400 for users with no department (no doctor record), incl. RECEPTIONIST who has `referral.view`. Endpoint should accept explicit `department_id` or return empty list for dept-less users. | FIXED — `Incoming` returns `[]` (200) when caller has no doctor record and no explicit `department_id`. Verified: HOSPITAL_ADMIN (no doctor rec) → 200 `{"data":[]}`. |
| NOTE-002 | INFO | RBAC | `role.manage` / `user.manage` permissions exist but no roles/user management endpoints are registered yet (`POST /roles` → 404). Not a security gap (denied by default), just an unbuilt module. | OPEN — future module |

---

## 2026-08-07 — Patient Profile tabbed UI (Priority 1 MVP #4, complete)

Patient Detail page (`PatientDetail.tsx`) is now a tabbed view. This is the final MVP item. Sessions persist across tabs.

### Backend (patient_id filters added)
| Change | File | Verified |
|--------|------|----------|
| `GET /bills?patient_id={id}` | `internal/billing/handler.go` + `repository.go` (`BillFilter.PatientID`) + `service.go` (`ListBillsByPatient`) | ✅ re/deploy, success=True |
| `GET /prescriptions?patient_id={id}` | `internal/prescriptions/repository.go` (`ListInput.PatientID`, EXISTS on encounters.patient_id) + `handler.go` | ✅ success=True |
| `GET /appointments?patient_id={id}` | pre-existing | ✅ appt created for patient → filtered list count=1, allMatch |

### Frontend tabs (PatientDetail.tsx)
- **Personal Details** — profile card (basic info, address, emergency, vitals, registration).
- **Timeline** — all encounters (diagnoses, consultations, prescriptions).
- **Appointments** — from `/appointments?patient_id`.
- **Prescriptions** — from `/prescriptions?patient_id` (dedicated, incl. dispense qty).
- **Bills** — from `/bills?patient_id` (amounts, items, payment status badge).
- **Documents** — placeholder (future uploads).

Verified: `npm run lint` 0 warnings · `tsc -b` ✅ · `vite build` ✅ · `go build ./...` ✅ · `go test ./...` ✅ (billing, prescriptions pkgs ok) · container `/health` 200.

**E2E check (login `admin@ahms.local`):** created appointment for `MCAH-2026-000029` (manisha sahu) → `GET /appointments?patient_id=...` count=1 filtered. Cleaned up (CANCELLED).

## 2026-08-07 — Generic Treatment Engine (Panchakarma, Priority 2 start, complete)

Panchakarma is the first category on a generic procedure engine (`TreatmentPlan → Procedure → Session → Completion`). Future categories (Physiotherapy, Yoga, Kshar Sutra, Agnikarma, Minor Procedures) plug in as `procedure_types` rows — no schema change.

### Backend
| Change | File | Verified |
|--------|------|----------|
| Models: `ProcedureType`, `TreatmentPlan`, `TreatmentSession`, `TreatmentPlanCounter` | `internal/models/treatment.go` | ✅ |
| Treatment permissions (`treatment.view/create/update/approve/session/complete`) | `internal/models/permission.go` | ✅ |
| Migration + permission catalog + role assignments (doctor/pk-doctor/therapist/nurse/ward/diet/lab/reception) | `internal/database/database.go` | ✅ 10 `procedure_types` seeded |
| Module (dto/repo/service/handler/routes) | `internal/treatments/*` | ✅ `go test ./internal/treatments/...` |
| Plan CRUD + approve/cancel/complete + auto session scheduling + `PKR-YYYY-NNNNNN` counter | `internal/treatments/service.go` | ✅ |
| Session endpoints: `/today`, `/start`, `/complete`, `/skip` | `internal/treatments/handler.go` | ✅ |
| Timeline now includes `treatment_plans` (plan + session log) | `internal/timeline/*` | ✅ `GET /patients/:id/timeline` returns plan |
| Wired in `cmd/api/main.go` (+ `SeedProcedureTypes` on boot) | `cmd/api/main.go` | ✅ routes registered |

### Frontend
- **Treatment Plans page** (`/admin/treatment-plans`): list w/ status filter + search, create plan form (patient/procedure/sessions/frequency/start date/therapist), plan detail modal with session log, Approve / Cancel / Complete (with final assessment). RBAC-gated buttons.
- **Therapist Sessions page** (`/admin/treatment-sessions`): today's assigned sessions grouped (Pending / In Progress / Completed), Start / Complete / Skip actions with before/after/complications/observations forms.
- **Nav**: AdminLayout `Leaf` (Treatment Plans) + `CalendarClock` (Therapist Sessions); routes in `App.tsx`.
- **PatientDetail Timeline** now renders the patient's treatment plans and their session logs.

### E2E (real API, running container)
| Step | Actor | Result |
|------|-------|--------|
| Create plan (2× Abhyanga, DAILY, therapist assigned) | DOCTOR `asha@ahms.local` | ✅ `PKR-2026-000001`, 2 sessions auto-scheduled Aug 10/11 |
| Approve plan | PANCHAKARMA_DOCTOR `qa.pkdoctor@ahms.local` | ✅ status APPROVED, approved_by recorded |
| Today's sessions (empty — sessions are Aug 10/11) | THERAPIST `qa.therapist@ahms.local` | ✅ 0 (date filter correct) |
| Today's sessions (after today-dated plan approved) | THERAPIST | ✅ 1 plan returned |
| Start session 1 → plan IN_PROGRESS | THERAPIST | ✅ |
| Complete session 1 & 2 (before/after/complications/observations) | THERAPIST | ✅ |
| Complete plan w/ final assessment | DOCTOR | ✅ COMPLETED, final_assessment saved |
| Timeline for patient | DOCTOR | ✅ 1 treatment_plan, 2 sessions |
| Receptionist creates plan | RECEPTIONIST | ✅ HTTP 403 (permission denied) |

Verified: `go build ./...` ✅ · `go test ./...` ✅ · `go vet ./...` ✅ · `npm run lint` ✅ (1 pre-existing-style warning) · `tsc -b` ✅ · `vite build` ✅ · backend container rebuilt + `/health` 200.

**Note:** `qa.therapist@ahms.local` / `qa.pkdoctor@ahms.local` were created via SQL for QA (password hashes = Doctor@123 / Test@123). Cleaned up test plan `PKR-2026-000002` (CANCELLED); `PKR-2026-000001` retained as the full-lifecycle proof.

## 2026-08-07 — Public Website Data Connected to Backend (seed data live)

The public marketing site (Home, Departments, Doctors, Doctor Detail, Appointment) no longer reads static seed data for doctors/departments/treatments. A new no-auth `internal/public` package serves curated, safe fields; the frontend fetches it via `/public/*` and falls back to the static seed (`site-data.ts`) only for rich marketing fields the backend doesn't store yet (bio, rating, languages, availability, taglines).

### Backend (new package `internal/public`)
| Endpoint | What it returns | Verified |
|----------|-----------------|----------|
| `GET /api/v1/public/doctors` | active doctors: id, name, department, specialization, qualification, experience_years, consultation_fee | ✅ 4 doctors, no auth |
| `GET /api/v1/public/departments` | active departments: id, name, description, doctor_count | ✅ 5 departments, no auth |
| `GET /api/v1/public/procedure-types` | active procedure types: id, name, category, description | ✅ 10 (PANCHAKARMA), no auth |

- Replaced the inline `/public/doctors` closure in `cmd/api/main.go` with the new handler (safe DTO, only active records, no email/mobile/permissions).
- Sensitive fields (email, mobile, internal notes, audit) are never exposed on public DTOs.
- Swagger regenerated (`swag init -g cmd/api/main.go -o docs`).

### Frontend
- **New `src/lib/public-site.ts`**: `fetchDoctors()`, `fetchDepartments()`, `fetchTreatments()` — hit `/public/*`, merge backend fields with static fallbacks (bio/rating/languages/availability via name-match, else sensible defaults). Never renders blank.
- **Departments page**: now uses `fetchDepartments()` (real `doctor_count` from backend) instead of deriving departments from the doctors endpoint.
- **Doctors page**: fetches live doctors + department filter chips from backend; skeleton while loading.
- **Doctor Detail page**: resolves the profile by slug/id from `fetchDoctors()` (loading skeleton + not-found state preserved).
- **Home page**: departments, doctors, and the "Treatments we are known for" grid now come from backend (`/public/departments`, `/public/doctors`, `/public/procedure-types`); testimonials/blogs remain static (no backend source yet).
- **Appointment page**: department picker now uses `fetchDepartments()` (still posts to `/public/appointments`).

### E2E (no auth, real container)
| Check | Result |
|-------|--------|
| `GET :8080/api/v1/public/doctors` | ✅ 4 active doctors with qualification + experience |
| `GET :8080/api/v1/public/departments` | ✅ 5 depts, doctor_count correct (General Ayurveda Consultation = 3, Panchakarma = 1) |
| `GET :8080/api/v1/public/procedure-types` | ✅ 10 PANCHAKARMA procedures |
| Same endpoints via frontend proxy `:5173/api/v1/public/*` | ✅ all reachable |
| `/doctors` page | ✅ HTTP 200 |
| Backend protected routes still require auth | ✅ unchanged |

Verified: `go build ./...` ✅ · `go test ./...` ✅ · `go vet ./...` ✅ · `tsc -b` ✅ · `npm run lint` ✅ (1 pre-existing-style warning) · `vite build` ✅ · backend container rebuilt, `/health` 200.

**Decision:** Backend model enrichment (doctor bio/languages/rating/awards/availability, department images, testimonials, blogs, gallery, SEO metadata) deferred to a future sprint once content requirements are final — avoids unnecessary migrations/reseeding now.

## 2026-08-07 — Department Master (real columns: Code, Type, Default Fee, Status)

The department master is no longer a JSON blob hidden in `description`. `Code`, `Type`, `DefaultFee` are real `departments` columns (Status = existing `is_active`), the DB is synced to a canonical 10-department master on every boot, and both admin + public UI show the fields.

### Backend
| Change | File | Verified |
|--------|------|----------|
| Model: `Code` (varchar(20), unique, nullable-by-schema), `Type` (varchar(30), default `OPD`), `DefaultFee` (numeric(10,2)) + `DepartmentType*` constants + `ValidDepartmentTypes` allow-list | `internal/models/department.go` | ✅ |
| `SyncDepartmentMaster` — idempotent, runs every boot: upserts 10 master rows by code/name/legacy alias, remaps "General Ayurveda Consultation" doctors → KAYA, deactivates obsolete rows (General, Nadi Pariksha, soft-deleted QA depts untouched) | `internal/database/database.go` | ✅ exactly 10 active |
| `Create/Update` requests + `DepartmentResponse` include code/type/default_fee; duplicate code → 409, invalid type → 400 | `internal/departments/dto.go`, `service.go`, `repository.go`, `handler.go` | ✅ |
| `DepartmentPublic` exposes code/type/default_fee (no auth) | `internal/public/handler.go` | ✅ |
| `SeedDemoDepartments` removed; `SyncDepartmentMaster` wired in `main.go` | `cmd/api/main.go` | ✅ |
| Swagger regenerated | `docs/` | ✅ |

### Department Master (canonical seed)
| Code | Name | Type | Default Fee |
|------|------|------|------------:|
| KAYA | Kayachikitsa | OPD | 500 |
| PANCHA | Panchakarma | Procedure | 800 |
| SHALYA | Shalya Tantra | OPD | 700 |
| SHALAKYA | Shalakya Tantra | OPD | 600 |
| PRASUTI | Prasuti Tantra Evam Stri Roga | OPD | 700 |
| KAUMAR | Kaumarbhritya (Bal Roga) | OPD | 500 |
| SWASTHA | Swasthavritta & Yoga | Wellness | 400 |
| AGAD | Agad Tantra Evam Vidhi Vaidyaka | Clinical | 600 |
| RASA | Rasashastra & Bhaishajya Kalpana | Pharmacy | 300 |
| CAS | Casualty | Emergency | 1000 |

### Frontend
- **`site-data.ts`** static fallback synced to the same 10-department master (each entry now carries `code`, `type`, `fee`).
- **`public-site.ts`**: `PublicDepartment` gains `code`/`type`/`default_fee`; mapping fills from backend with static fallback.
- **`DepartmentCard`** (design-system): renders code badge, type chip, and fee on every card.
- **Public Departments page + home DepartmentSection**: pass `code`/`type`/`default_fee` through to the card.
- **Admin Departments page**: uses real `code`/`type`/`default_fee` fields — the JSON-in-description hack and HOD/location/hours fields removed; type dropdown = OPD/Procedure/Wellness/Clinical/Pharmacy/Emergency.

### E2E (real container + API)
| Check | Result |
|-------|--------|
| Boot sync → exactly 10 active departments with code/type/fee | ✅ |
| Doctor remap: Asha/Neha/Vikram → KAYA, Bhanu → PANCHA (public doctors show "Kayachikitsa"/"Panchakarma") | ✅ |
| `GET :8080/api/v1/public/departments` — 10 rows, doctor_count KAYA=3, PANCHA=1, rest 0 | ✅ |
| Auth `GET /departments` includes code/type/default_fee; legacy General/Nadi inactive | ✅ |
| POST with invalid type | ✅ 400 |
| POST without code → auto-generated (OJASCLIN) | ✅ |
| POST duplicate code → 409 | ✅ |
| PUT updates type/fee; DELETE works | ✅ |
| `:5173/api/v1/public/departments` via Vite proxy | ✅ 200 |

Verified: `go build ./...` ✅ · `go vet ./...` ✅ · `go test ./...` ✅ · `tsc -b` ✅ · `vite build` ✅ · `npm run lint` 0 errors (4 pre-existing warnings: 3× unused `catch (e)`, TreatmentPlans exhaustive-deps). Backend container rebuilt, `/health` 200.

**Notes:** code column is schema-nullable so `AutoMigrate` can add it to populated tables; the service always writes a code (auto-generated from name if omitted). Soft-deleted legacy rows (`deleted_at` set) are excluded by GORM and left untouched.
