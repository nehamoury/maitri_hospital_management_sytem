# AHMS — Demo Data & Production-Readiness QA Report

**Date:** 2026-08-17
**Scope:** Seed demo data for every role → verify every admin panel loads → confirm RBAC gates → confirm dark theme baseline.
**Stack:** Backend Go/Docker `:8080` · Frontend Vite/React/TS `:5173` (proxy `/api/v1`)
**Artifacts:**
- `qa/demo-seed.ps1` — idempotent demo-data seed (safe to re-run)
- `qa/demo-verify.ps1` — per-role endpoint verification (writes `qa/verify-results.json`)
- `qa/verify-results.json` — machine-readable 240-check result set
- `qa/e2e-ws-tokenboard.mjs` — Round-5 WS token-board E2E (browser-path, via Vite proxy)

---

## 1. Summary

| Check | Result |
|-------|--------|
| Backend health (`/health`) | PASS |
| Demo seed (staff, doctors, patients, appointments, encounters, Rx, bills, referral, treatment plan, lab order, IPD, diet/meals) | PASS — idempotent, re-runnable |
| Frontend build (`tsc -b && vite build`) | PASS — 0 errors |
| Frontend lint (`oxlint`) | PASS — 0 errors, 8 pre-existing warnings |
| Per-role page/RBAC verification | **240 / 240 PASS** (0 permission leaks) |
| **Regression found & fixed:** patient search `/patients?search=` 500 | **FIXED + verified** |
| **Prod gap found & fixed:** nginx missing `/ws` (Token Board WS) | **FIXED + `nginx -t` OK** |
| Deployment posture (AUTH-013) | **RESOLVED** — only 80/443 public |
| **P1-A:** appointment slot double-booking (same doctor + date + time) | **FIXED + verified** (409 `slot already booked`) |
| **P1-B:** live doctor status on the public booking flow | **IMPLEMENTED + verified** (`/public/doctors/:id/status`) |
| **P1:** referral workflow — receiving doctor access before first encounter | **FIXED + verified** (destination-department scope relaxation) |
| **P1:** unified timeline — lab orders + referral events | **IMPLEMENTED + verified** (`GET /patients/:id/timeline`) |
| **P0:** doctor data-scope leak — `scope.go` uuid scan silently failing | **FIXED + verified** (was: doctor saw all 71 patients / any referral; now scoped) |
| **BUG-010:** WS handshake never echoes `Sec-WebSocket-Protocol` → all browsers fail Token Board connect | **FIXED + verified** (Round 5) |
| **Round 5:** WS token-board E2E (19/19 checks) | **PASS** — live push without refresh, RBAC gate, disconnect/reconnect |

---

## 2. Demo Credentials

> ⚠️ **Local/dev only.** These demo accounts must not be copied (DB dump / seed / image) into a staging or shared production environment. See the credential-safety note in §9.

All staff demo accounts: password **`Demo@12345`**

| Role | Email |
|------|-------|
| SUPER_ADMIN | `admin@ahms.local` (password `ChangeMe123!`) |
| HOSPITAL_ADMIN | `demo.hadmin@ahms.local` |
| RECEPTIONIST | `demo.receptionist@ahms.local` |
| DOCTOR | `demo.doctor@ahms.local` |
| PANCHAKARMA_DOCTOR | `demo.pkdoctor@ahms.local` |
| NURSE | `demo.nurse@ahms.local` |
| THERAPIST | `demo.therapist@ahms.local` |
| PHARMACIST | `demo.pharmacist@ahms.local` |
| BILLING_ACCOUNTS | `demo.billing@ahms.local` |
| WARD_STAFF | `demo.wardstaff@ahms.local` |
| DIET_KITCHEN | `demo.diet@ahms.local` |
| LAB_STAFF | `demo.lab@ahms.local` |
| PATIENT (portal) | UHID `MCAH-2026-000066` / mobile `9200000001` |

### Demo clinical data (for non-empty admin pages)
- 4 patients: `MCAH-2026-000066` Aarav Sharma, `-000067` Meera Iyer, `-000068` Rohan Gupta, `-000069` Kavita Joshi
- Appointments (today + tomorrow, tokens allocated) · Encounters (1 COMPLETED, 1 WAITING) · Consultation + 2-item prescription (DISPENSED)
- 2 bills: `BILL-2026-000029` PAID, `BILL-2026-000030` PARTIAL (due badge shows)
- Referral `REF-2026-000019` → RECEIVED · Treatment plan `PKR-2026-000010` (7 sessions, APPROVED)
- Lab order `LAB-2026-000015` (collected, results entered)
- IPD admission `IPD-2026-000017` (ADMITTED, nurse note, clinical order, diet plan, 12 meal orders for today)

---

## 3. Bug Found & Fixed (production blocker)

### BUG-008 — Production nginx missing `/ws` WebSocket route (Token Board dead behind proxy)
- **Symptoms:** in `docker-compose.prod.yml` / `Dockerfile.prod` flow, the live Token Board WebSocket (`ws(s)://<host>/ws`) fell through to the SPA fallback (`try_files ... /index.html`), so the appointment feed + beep would never connect in production. Not reproducible in local dev (Vite proxies `/ws` directly).
- **Root cause:** `ahms-frontend/nginx.conf` proxied `/api/` but had no `/ws` location.
- **Fix:** added a `/ws` nginx location proxying to `backend:8080` with `proxy_http_version 1.1` + `Upgrade`/`Connection: upgrade` headers + 3600s socket timeouts (nginx `location /ws` prefix-match wins over `location /`).
- **Verified:** `nginx -t` in `nginx:1.27-alpine` → **syntax ok** (uses `docker set $backend_upstream` + `resolver 127.0.0.11`, consistent with the existing `/api/` block).

### AUTH-013 — Deployment posture (now RESOLVED)
- **Verdict:** only **80/443 (Caddy)** are published to the host. `postgres`, `redis`, `backend`, `frontend` all use `expose` only (docker-network isolated) in `docker-compose.prod.yml`.
- Caddy terminates TLS (Let's Encrypt) and proxies to `frontend:80` (nginx → `/api` + `/ws` → `backend:8080`). Direct 8080/5432/6379 are **not** publicly reachable in prod.
- Note: the **dev** `docker-compose.yml` still publishes `5432`, `6379`, `8080` on localhost — that's fine for local dev, but don't run it on a public host.

### BUG-007 — Patient search/list returns HTTP 500: `column "uhid" does not exist`
- **Symptoms:** `GET /api/v1/patients?search=<anything>` → `500 {"success":false,"error":"failed to fetch patients"}`. Broke the entire Patients page (list + search) for every role.
- **Root cause:** The `Patient` model field `UHID` maps (GORM snake_case) to column **`uh_id`**. Five raw-SQL queries referenced a non-existent `uhid`/`p.uhid` column. Introduced by commit `a60233f` (regression of previously-fixed BUG-005).
- **Fix:** `uhid` → `uh_id` in 5 locations:
  - `internal/patients/repository.go:139` (patient list/search)
  - `cmd/api/main.go:379` (global search)
  - `internal/ipd/repository.go:284` (IPD search)
  - `internal/prescriptions/repository.go:133` (prescription search)
  - `internal/treatments/repository.go:104` (treatment-plan search)
- **Verified:** backend rebuilt (`docker compose up -d --build backend`); search by UHID/name/mobile and full list all return 200. IPD/prescriptions/treatments search paths use the same corrected column.

---

## 4. RBAC Verification Results — 240/240 PASS

Per-role matrix: every admin page's backing GET endpoint returns 2xx when the role holds the page permission, and 403 when it does not.

Design (verified as intended, not leaks):
- `GET /departments`, `GET /doctors` are auth-only reference data (needed by all roles) — page navigation is still permission-gated in the UI.
- `GET /roles` requires `user.view` (writes require `role.manage`) — HOSPITAL_ADMIN can view the catalog but not edit.

| Role | Pages verified 2xx | Denials verified 403 |
|------|--------------------|----------------------|
| SUPER_ADMIN | dashboard, patients, appointments, encounters, referrals, treatment, sessions, admissions, wards, lab, pharmacy, billing, diet, reports, doctors, departments, users, roles, audit, profile | (none) |
| HOSPITAL_ADMIN | all except roles (roles list accessible by `user.view`) | role editing (not exposed) |
| RECEPTIONIST | dashboard, patients, appointments, encounters, treatment, billing, doctors, departments, profile | users, roles, audit, pharmacy, lab, referrals, diet, reports, wards, admissions, sessions |
| DOCTOR | dashboard, patients, appointments, encounters, referrals, treatment, sessions, admissions, wards, lab, pharmacy, billing, doctors, profile | users, roles, audit, departments, diet, reports |
| PANCHAKARMA_DOCTOR | (same as DOCTOR) | users, roles, audit, departments, diet, reports |
| NURSE | dashboard, patients, encounters, treatment, admissions, wards, diet, doctors, profile | appointments, billing, lab, pharmacy, referrals, reports, users, roles, audit, sessions |
| THERAPIST | dashboard, patients, encounters, treatment, sessions, doctors, profile | appointments, admissions, billing, lab, pharmacy, diet, wards, referrals, reports, users, roles, audit |
| PHARMACIST | dashboard, patients, encounters, pharmacy, billing, doctors, profile | appointments, admissions, lab, diet, wards, referrals, reports, users, roles, audit, treatment |
| BILLING_ACCOUNTS | dashboard, patients, billing, profile | appointments, encounters, referrals, treatment, sessions, admissions, wards, lab, pharmacy, diet, reports, users, roles, audit, doctors (read-only by design) |
| WARD_STAFF | dashboard, patients, encounters, treatment, doctors, profile | appointments, admissions, billing, lab, pharmacy, diet, wards, reports, users, roles, audit, sessions |
| DIET_KITCHEN | dashboard, patients, encounters, treatment, diet, doctors, profile | appointments, admissions, billing, lab, pharmacy, wards, referrals, reports, users, roles, audit, sessions |
| LAB_STAFF | dashboard, patients, encounters, treatment, lab, doctors, profile | appointments, admissions, billing, pharmacy, diet, wards, referrals, reports, users, roles, audit, sessions |

---

## 5. Remaining Manual (Browser) Checks

Automation covers API/RBAC/load paths. These require a human in the browser (dark theme especially):

1. **Dark theme:** log in as each role → toggle theme (top-right in `AdminLayout`) → confirm sidebar/nav, tables, modals, forms, toasts all render legibly in dark mode. `ThemeProvider` stores `ahms-theme` (system/light/dark).
2. **Live Token Board WebSocket** — only SUPER_ADMIN / HOSPITAL_ADMIN / RECEPTIONIST open the WS; book an appointment as receptionist and confirm the beep + toast + board refresh.
3. **Patient portal** — login `MCAH-2026-000066 / 9200000001`; verify self-only appointments/prescriptions/bills/profile; confirm logged-out guard redirects.
4. **Print flows** — consultation, prescription, bill, receipt, lab report (permissions `consultation.print`, `prescription.print`, `bill.print`, `receipt.print`).
5. **Reports page** — date-range filters + export (`reports.export`).
6. **Responsive** — sidebar collapse at 768px, forms/tables usable at 375px.
7. **Deployment posture decision (AUTH-013):** **RESOLVED** — prod compose exposes only 80/443 via Caddy; backend/DB/redis are docker-network isolated. Dev compose publishing 5432/6379/8080 is for localhost dev only.
8. **WebSocket /ws in prod:** **FIXED** (BUG-008) — nginx.conf now proxies `/ws` with upgrade headers. Confirm beep + board refresh once deployed.

---

## 6. Notes

- Rate limiter: 10 logins/min/IP (`main.go:134`) — scripts pace logins 7s apart and retry on 429.
- Seed script is idempotent: re-running skips existing records and backfills only what is missing (e.g. IPD clinical order/diet/meals added on 2nd run).
- Minor cosmetic nit (not blocking): the demo referral existence check uses `/referrals/incoming`; once a referral is RECEIVED it leaves "incoming", so a fresh re-run creates one new demo referral. Harmless for QA.
- Frontend lint warnings are pre-existing (unused `catch (e)` params, 3× exhaustive-deps) — no errors.

---

## 7. P1 Fixes — Round 2 (2026-08-17)

### P1-A: Appointment slot double-booking — FIXED + verified

Two patients racing for the same doctor + date + time slot previously could both be confirmed (each got a distinct token). The public booking flow did no uniqueness check; the auth'd admin path relied on the UI, so a direct/parallel API call could slip through.

**Fix:** the slot check now lives inside the `CreateWithToken` transaction (`internal/appointments/repository.go`). Holding the doctor row-lock (`clause.Locking{Strength: "UPDATE"}`), the query looks for an existing non-cancelled appointment with the same `doctor_id`, same `appointment_date` (day-boundary), and `LOWER(time_slot) = LOWER(?)`. A hit returns `ErrSlotAlreadyBooked` before token assignment; the check is skipped when `TimeSlot == ""`. Both entry points map this to **HTTP 409** `{"success":false,"error":"slot already booked"}`:
- `POST /api/v1/appointments` (auth'd `Book`) — `internal/appointments/handler.go`
- `POST /api/v1/public/appointments` (`PublicBook`) — `internal/appointments/handler.go`

**Verified live (concurrent jobs via public API, doctor `44b4d57d-…b4176f2`, 2026-08-25, 10:00 AM):**
- Winner → `201` token=1
- Loser → `409` `slot already booked`
- Auth'd `Book` same doctor/slot → `409`
- Same doctor, different slot same day → `201` token=2
- Same doctor + slot, next day (2026-08-26) → `201` token=1 (date scoping correct)

`go build ./...` and `go test ./...` pass.

### P1-B: Live doctor status on the public booking flow — IMPLEMENTED + verified

**Endpoint:** `GET /public/doctors/:id/status` (no auth, read-only, advisory)
```json
{ "success": true, "data": { "doctor_id": "...", "status": "AVAILABLE" } }
```
- `AVAILABLE` — active doctor, no `IN_CONSULTATION` encounter
- `IN_CONSULTATION` — doctor currently has an encounter in `IN_CONSULTATION`
- `NOT_AVAILABLE` — doctor inactive or not found

Implementation: `HasInConsultation` in `internal/doctors/repository.go` + `LiveStatus` in `internal/doctors/service.go`; handler `DoctorStatus` + route `GET /doctors/:id/status` in `internal/public/handler.go`/`routes.go`.

**Verified live:** AVAILABLE (idle doctor) · IN_CONSULTATION (temporarily set an encounter to `IN_CONSULTATION`, confirmed `IN_CONSULTATION`, reverted) · NOT_AVAILABLE (unknown UUID) · 400 (malformed UUID).

**Frontend** (`ahms-frontend/src/pages/public/Appointment.tsx`):
- Doctor cards (Step 1) show a pulsing status dot + label (Available now / In consultation / Not available), refreshed every 60s.
- Step 2 shows the selected doctor's live status under the date picker ("currently seeing a patient" hint when IN_CONSULTATION).
- Advisory only — a doctor mid-consultation can still take future-slot bookings (never blocks).
- `npm run build` PASS.

### P2: WebSocket role filter — already satisfied (no action needed)

`main.go:161-187` validates the JWT, rejects PATIENT, and only lets SUPER_ADMIN / HOSPITAL_ADMIN / RECEPTIONIST connect (403 otherwise). Backend role filtering exists.

---

## 8. P1 Fixes — Round 3 (2026-08-17): Referral workflow + Unified timeline

### P0 (found during verification): Doctor data-scope silently disabled

While verifying the referral fix we found the scope injected by `DataScopeMiddleware` was always **nil**. `internal/middleware/scope.go:32` scanned the PG uuid column straight into `uuid.UUID`, which fails (`converting driver.Value type string to uint8`); the error was swallowed, so `scope.DoctorID` stayed nil and every doctor got **unscoped access**.

**Impact confirmed live:** the demo Panchakarma doctor (0 encounters with 70/71 patients) could list all 71 patients, fetch any patient's timeline, and read any referral (any status, any department). This defeated every per-doctor query gate in patients, referrals, timeline, lab, consultations and prescriptions.

**Fix:** scan `id` into a string first, then `uuid.Parse`. Verified: same doctor now sees **1** patient, unrelated timelines → 404, completed/unrelated referrals → 404.

### P1-1: Receiving doctor can access referrals before their first encounter — FIXED

Chicken-and-egg: `applyDoctorScope` (referrals/repository.go) required `EXISTS (encounters WHERE doctor_id = ?)` before the doctor could open a referral, but the receiving doctor has no encounter until they create the destination visit — so they could never see the incoming referral.

**Fix:** the scope now allows a doctor to see a referral when either
- they have treated the patient (existing rule), **or**
- the referral is **active** (CREATED/RECEIVED/ACCEPTED/CONSULTATION_STARTED) **and routed to the doctor's own department** (`doctors.department_id = referrals.to_department_id`).

Same rule applied to `applyAttachmentDoctorScope`. Non-doctor staff remain unscoped.

**Verified live** (Panchakarma doctor `demo.panch@ahms.local`, 0 encounters with the patient):
- REF-2026-000018 (RECEIVED → Panchakarma): **200** with full source history
- REF-2026-000011 (RECEIVED → Panchakarma): 200 — source consultation (chief complaints, clinical notes), diagnosis, prescription with item + `dispensed_qty`
- REF-2026-000016 (RECEIVED → Prasuti, not his dept): **404**
- REF-2026-000014 (COMPLETED → Casualty): **404** (inactive referral, not his dept)

The timeline itself was NOT loosened — a doctor who has not treated the patient still gets 404 on `/patients/{id}/timeline` (verified). Scope is relaxed only for the referral detail path.

### P1-2: Unified patient timeline — lab orders + referral events — IMPLEMENTED

`GET /patients/:id/timeline` (`internal/timeline/`) now returns six sections instead of four. Existing fields untouched (backward compatible — new `lab_orders` and `referrals` are additive):

- `encounters` (consultations, diagnoses, prescriptions w/ dispensed qty) — existing
- `treatment_plans` + sessions — existing
- `admissions` (IPD, notes, orders, diet) — existing
- **`lab_orders` (NEW)** — order no, status, priority, ordered/reviewed by, sample collected, per-item test name/status/result/flag/ref-range
- **`referrals` (NEW)** — referral no, from→to department, reason, clinical notes, priority, status, referred by, and a `source_encounter` snapshot (diagnoses/consultations/prescriptions)

**Verified live** (receptionist token, patient `MCAH-2026-000066`): `encounters=2 treatment_plans=1 admissions=1 lab_orders=1 referrals=2` — lab item `result_status`, referral notes + source context all present.

**Not changed (deferred):** patient-level pharmacy dispense event entity remains a P2 (existing `dispensed_qty` on prescription items is sufficient until partial/multi-dispense tracking is required).

### P2 pharmacy — not blocked (as agreed)

`DispensedQty` already surfaces in referral source history and timeline. A full dispense-event entity is deferred until partial dispensing / returns / batch tracking is actually needed.

## 9. Patient Registration — Round 4 (2026-08-17): Govt identifiers + name/age warning + UHID single-source

Closes the three gaps found in the patient-registration spec review. Requirement set now **4/4 complete**.

### P1: Structured government/other identifiers — IMPLEMENTED + verified

`Patient` gains structured (not free-text) fields: `aadhaar_no` (12-digit, `numeric`), `pan_no` (10-char `alphanum`), `abha_id` (ABHA/Health ID), plus `other_id_type` + `other_id_number` for any other document. Added to `CreatePatientRequest`, `UpdatePatientRequest` and the response DTO with validation; columns auto-migrated.

**DTO-level masking / authorization:**
- `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `RECEPTIONIST` → **full** values (they register/edit patients).
- Every other role (doctors, pharmacists, lab, etc.) → **masked** numbers (`****` + last 4 chars); `other_id_type` is not sensitive and stays visible.
- Verified live: admin GET `demo patient Meera Iyer` returned full `998877665544` / `HNQPK8899Z`; Panchakarma doctor (who treats her) returned `****5544` / `****899Z`. A 4-char aadhaar submit → HTTP 400 (validation enforced).

### P1: Name + age duplicate as a soft warning — IMPLEMENTED + verified

Strong rules unchanged (mobile, alternate mobile, email, name+mobile, name+DOB → hard 409). New: when a registration has **no DOB**, the name + age rule runs as a **warning**, not a hard rejection — age is not a durable fact (it drifts), so the receptionist decides.

- Verified live: register `Test Govt ID Patient`, age 39, no DOB, new mobile → **409 `possible duplicate match (name + age)`** with the existing record in `existing_patients`; resubmit with `force=true` → **201**. Same mobile / same name+DOB still hard-409 as before.

### P2: Public-booking UHID race — FIXED (single source of truth)

`appointments.FindOrCreatePatient` previously re-implemented the UHID counter **without** the row-lock that `patients.CreateWithUHID` uses — two concurrent public bookings could mint the same UHID. Removed that copy entirely:

```
PublicBooking -> patients.FindOrCreateByMobile
                  └─ reuse by mobile, else CreateWithUHID (row-lock tx)
```

`appointments` now depends on a tiny `PatientRepository` interface (`FindActiveByMobile` + `FindOrCreateByMobile`) wired in `main.go`; the `MCAH-%d-%06d` format exists in exactly one place (`patients/repository.go:168`, grep-verified).

**Verified live:** 5 parallel public bookings (distinct mobiles) → 5 unique sequential UHIDs `MCAH-2026-000075..000079`, all 201, 0 duplicate UHIDs in DB, counter = 79, created patients carry `registration_type=ONLINE`; two same-mobile parallel bookings correctly reused one patient (`MCAH-2026-000074`).

### 🔐 Demo credential safety (local-only)

The demo accounts in §2 are **local/dev-only** — they must **never** be replicated (DB dump, seed copy, or image bake) into a staging or shared production environment. The documented password `Demo@12345` is published in this report on purpose for local QA only. During Round 4 the passwords of `demo.doctor@ahms.local` and `demo.panch@ahms.local` were temporarily rotated for RBAC masking checks and then **restored to `Demo@12345`** (verified via login). If a shared environment needs demo data, generate throwaway accounts with random credentials instead of copying these.

---

## 10. WebSocket Token Board — Round 5 (2026-08-17): live push, RBAC gate, reconnect

Artifacts:
- `qa/e2e-ws-tokenboard.mjs` — browser-path E2E driving the running stack **exactly as a browser does** (HTTP through the Vite proxy `:5173 → :8080`, WS at `ws://localhost:5173/ws` with the `ahms.<jwt>` subprotocol). Uses Node ≥ 22 built-ins, no browser install needed.
- `ahms-backend/internal/websocket/hub.go` — host of the Round-5 production bug (below).

### BUG-010 — WS handshake never echoes `Sec-WebSocket-Protocol` → Token Board could never connect (FIXED)

Reproduced with a raw probe (the only browser-faithful way short of `<WebSocket>` in a page):

```
> curl -i -H "Connection: Upgrade" -H "Upgrade: websocket" \
       -H "Sec-WebSocket-Key: ..." -H "Sec-WebSocket-Version: 13" \
       -H "Sec-WebSocket-Protocol: ahms.<jwt>" http://localhost:8080/ws
< HTTP/1.1 101 Switching Protocols
< Upgrade: websocket
< Connection: Upgrade
< Sec-WebSocket-Accept: ...
< (NO Sec-WebSocket-Protocol echo)
```

Per RFC 6455 / the WHATWG browser algorithm, a client that **offered** a subprotocol and does not receive it back **must fail the handshake**. The frontend (`AdminLayout.tsx`) offers `ahms.<jwt>` — so **every real browser** would have dropped the connection and the live Token Board / beep / toast was dead on arrival.

**Fix (minimal):** in `ServeWs`, read the offered protocols with `websocket.Subprotocols(r)`, pick the `ahms.*` token one, and echo it by setting `upgrader.Subprotocols = []string{selected}` before `Upgrade`. Token auth path (`ahms.` prefix → JWT → role gate) unchanged.

Verified after rebuild: the 101 now carries `Sec-WebSocket-Protocol: ahms.<jwt>`.

### Round-5 E2E result — ALL CHECKS PASSED (19/19)

| # | Check | Result |
|---|-------|--------|
| 1 | Login admin/reception, doctors list, Panchakarma dept, patient lookup (all via proxy) | PASS |
| 2 | Receptionist WS **opens** on `ws://localhost:5173/ws` with `ahms.<jwt>` | PASS |
| 3 | Public booking `POST /public/appointments` → **HTTP 201** (token 2) | PASS |
| 4 | `NEW_APPOINTMENT` pushed to open socket **without page refresh** (Δ 137 ms) | PASS |
| 5 | Reception creates OPD encounter → **HTTP 201**, token 6 auto-generated, REGISTERED | PASS |
| 6 | `encounter_created` broadcast received (Δ 169 ms) | PASS |
| 7 | Board `GET /encounters` reflects REGISTERED | PASS |
| 8–10 | Queue lifecycle `REGISTERED → WAITING → IN_CONSULTATION → COMPLETED` via `PATCH /encounters/:id/status`, each with a live `encounter_updated` push (Δ 62 / 123 / 21 ms) | PASS |
| 11 | Board reflects COMPLETED after WS-pushed refresh | PASS |
| 12–13 | Appointment status `PUT /appointments/:id/status` → 200 + `appointment_updated` push (Δ 122 ms) | PASS |
| 14 | **RBAC:** doctor JWT rejected on `/ws` (role gate 403) — only SUPER_ADMIN/HOSPITAL_ADMIN/RECEPTIONIST | PASS |
| 15 | Disconnect → reconnect opens a fresh socket | PASS |
| 16–17 | Second booking after reconnect → 201 + `NEW_APPOINTMENT` still received (Δ 78 ms) | PASS |

Latencies are per-socket Δ from the HTTP trigger to the WS message — all well under 200 ms in the containerized stack, so the board update is effectively instant.

### Notes

- The `409 slot already booked` guard (P1-A) was hit repeatedly during E2E debugging; it works. The final harness books on dates far enough out and randomizes slots so re-runs are idempotent.
- Bridging the browser gap is done; an optional follow-up would be a Playwright page that asserts the sonner toast + beep and DOM re-render on `NEW_APPOINTMENT`, but the protocol path those rely on is now verified end-to-end.
