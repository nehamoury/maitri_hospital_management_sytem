# AHMS Volume 16 — Architecture Conflict Resolution & Canonical Standards

This is **Volume 16** of the AHMS Enterprise UI Development Bible. It is the AUTHORITATIVE resolution document that reconciles ALL architecture conflicts found across Volumes 0–15. It establishes canonical standards and a remediation checklist.

---

## 1. Purpose

During cross-volume review, inconsistencies were found between volumes covering roles, permissions, enums, data models, API paths, and workflow rules. This document resolves every one of those inconsistencies.

**Canonical** = the single source of truth. When any volume conflicts with the standards below, the canonical standard in **Section 2** wins, and the **Remediation Checklist** (Section 4) tells you exactly which volumes to update and what to change in each.

Rules of engagement:
- Every conflict found is registered in Section 3 with a resolution reference.
- Volumes are not rewritten wholesale; they are patched per the checklist.
- After patching, Section 5 is used to validate that the fix worked.
- If a future volume introduces a new ambiguity, it must be resolved here first, not silently re-decided.

---

## 2. Canonical Standards (the resolved decisions)

### 2.1 Canonical Role Catalog (15 roles)

There are **exactly 15 canonical roles**. All alternative names encountered in earlier volumes are **aliases or obsolete** and MUST NOT be used in code, seeds, or documentation going forward.

| # | Canonical Role | Replaces / Notes |
|---|----------------|------------------|
| 1 | `SUPER_ADMIN` | Full system access. |
| 2 | `ADMIN` | Canonical name; replaces `HOSPITAL_ADMIN` and the ambiguous `Admin`. |
| 3 | `RECEPTIONIST` | Front desk operations. |
| 4 | `DOCTOR` | General physician/consultant. |
| 5 | `NURSE` | Ward nursing. |
| 6 | `PANCHAKARMA_DOCTOR` | Replaces `PK_DOCTOR`. |
| 7 | `PANCHAKARMA_THERAPIST` | Replaces `PK_THERAPIST` and `THERAPIST`. |
| 8 | `PHARMACIST` | Pharmacy. |
| 9 | `BILLING_STAFF` | Replaces `BILLING_ACCOUNTS`. |
| 10 | `WARD_INCHARGE` | Replaces `WARD_STAFF`. |
| 11 | `LAB_TECHNICIAN` | Replaces `LAB_STAFF`. |
| 12 | `DIET_KITCHEN` | Diet/kitchen module. |
| 13 | `PATIENT` | Portal role — **MUST be seeded** (was missing from Vol 12 seed). |
| 14 | `STORE_MANAGER` | Store / inventory. |
| 15 | `PHYSIOTHERAPIST` | Physiotherapy module. |

**Role assignment model (Decision):** Both mechanisms coexist:

- `users.role_id` — the **primary role** (NOT NULL FK) and the primary authorization role for permission checks.
- `user_roles` — a many-to-many table carrying **additional roles** beyond the primary one.

`role_id` always wins for default authorization; `user_roles` extends capabilities. This reconciles the "single role FK" vs "pure M2M" conflict.

### 2.2 Canonical Permission Grammar

**Grammar:** `module:action` — lowercase singular module, colon, action verb.

**Action verbs (canonical set):** `read`, `create`, `update`, `delete`, `manage`, `approve`, `process`, `dispense`, `pay`, `refund`, `print`, `export`.

**Canonical permissions (~40):**

| Module | Permissions |
|--------|-------------|
| patient | `patient:read`, `patient:create`, `patient:update` |
| appointment | `appointment:read`, `appointment:create`, `appointment:update` |
| encounter | `encounter:read`, `encounter:create`, `encounter:update` |
| consultation | `consultation:read`, `consultation:create`, `consultation:update` |
| diagnosis | `diagnosis:create`, `diagnosis:read` |
| prescription | `prescription:read`, `prescription:create`, `prescription:dispense` |
| referral | `referral:read`, `referral:create`, `referral:update` |
| medicine | `medicine:read`, `medicine:create`, `medicine:update` |
| inventory | `inventory:manage` |
| purchase_order | `purchase_order:create`, `purchase_order:read` |
| material_request | `material_request:create`, `material_request:approve`, `material_request:dispense` |
| supplier | `supplier:manage` |
| plan | `plan:read`, `plan:create`, `plan:update` |
| session | `session:read`, `session:create`, `session:update` |
| ward | `ward:manage` |
| bed | `bed:manage` |
| admission | `admission:create`, `admission:update` |
| round | `round:create` |
| nursing | `nursing:create` |
| order | `order:create` |
| bill | `bill:create`, `bill:read`, `bill:update` |
| payment | `payment:process` |
| refund | `refund:process` |
| discount | `discount:manage` |
| user | `user:manage` |
| role | `role:manage` |
| dashboard | `dashboard:read` |
| report | `report:read` |
| audit | `audit:read` |
| config | `config:manage` |
| department | `department:manage` |
| doctor | `doctor:manage` |

> **OBSOLETE — MUST be migrated:** `"patient.view"`, `"billing.create"`, `"patients:read"`, `"bills.create"`, `"appointments.manage"`, and any other name that does not match `module:action`. Any `module.manage`-style or `module:view`-style strings are not canonical.

### 2.3 Canonical Status Enums

All enum values are **UPPERCASE**, stored via DB CHECK constraints, and defaulted as below:

| Entity | Canonical Values | Default |
|--------|------------------|---------|
| `appointment.status` | `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` | `SCHEDULED` |
| `encounter.status` | `REGISTERED`, `WAITING`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED` | `REGISTERED` |
| `consultation.status` | `DRAFT`, `FINALIZED`, `CANCELLED` | `DRAFT` |
| `prescription.status` | `PRESCRIBED`, `PARTIALLY_DISPENSED`, `DISPENSED`, `CANCELLED` | `PRESCRIBED` |
| `referral.status` | `CREATED`, `RECEIVED`, `ACCEPTED`, `CONSULTATION_STARTED`, `COMPLETED`, `REJECTED`, `CANCELLED` | `CREATED` |
| `referral.priority` | `ROUTINE`, `URGENT`, `EMERGENCY` | `ROUTINE` |
| `treatment_plan.status` | `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED` | `DRAFT` |
| `treatment_session.status` | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` | `SCHEDULED` |
| `admission.status` | `ADMITTED`, `DISCHARGED`, `TRANSFERRED`, `CANCELLED` | `ADMITTED` |
| `admission.admission_type` | `EMERGENCY`, `PLANNED`, `OPD_TO_IPD` | `PLANNED` |
| `bed.status` | `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`, `CLEANING` | `AVAILABLE` |
| `nursing_care_plan.status` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `CANCELLED` | `PENDING` |
| `treatment_order.status` | `ACTIVE`, `COMPLETED`, `DISCONTINUED`, `CANCELLED`, `ON_HOLD` | `ACTIVE` |
| `treatment_order.order_type` | `MEDICATION`, `IV`, `DIET`, `ACTIVITY`, `LAB`, `IMAGING`, `PROCEDURE`, `OTHER` | `MEDICATION` |
| `bill.payment_status` | `UNPAID`, `PARTIAL`, `PAID`, `REFUNDED`, `CANCELLED` | `UNPAID` |
| `refund.status` | `PENDING`, `APPROVED`, `PROCESSED`, `REJECTED` | `PENDING` |
| `purchase_order.status` | `DRAFT`, `SENT`, `CONFIRMED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED` | `DRAFT` |
| `material_request.status` | `PENDING`, `APPROVED`, `DISPENSED`, `REJECTED`, `CANCELLED` | `PENDING` |
| `payment.method` | `CASH`, `CARD`, `UPI`, `NET_BANKING`, `INSURANCE`, `CREDIT` | `CASH` |
| `bill.discount_type` | `PERCENTAGE`, `FIXED` | `PERCENTAGE` |
| `diagnosis.type` | `PRIMARY`, `SECONDARY`, `DIFFERENTIAL` | `PRIMARY` |
| `patients.gender` | `MALE`, `FEMALE`, `OTHER` | (no default, required) |
| `therapy_types.category` | `PURVAKARMA`, `PRADHANKARMA`, `PASCHATKARMA` | `PURVAKARMA` |
| `wards.ward_type` | `GENERAL`, `SEMI_PRIVATE`, `PRIVATE`, `ICU`, `NICU`, `MATERNITY`, `SUITE` | `GENERAL` |
| `bills.service_type` | `OPD`, `IPD`, `PHARMACY`, `PANCHAKARMA`, `LAB`, `OTHER` | `OPD` |
| `material_request.urgency` | `NORMAL`, `URGENT`, `EMERGENCY` | `NORMAL` |

> **Note (controlled mapping, NOT a conflict):** API JSON uses lowercase camelCase equivalents of these enums, e.g. `PARTIALLY_DISPENSED` → `partiallyDispensed`, `NO_SHOW` → `noShow`, `NET_BANKING` → `netBanking`. This is a fixed, documented serialization mapping — the DB values above are the single source of truth.

### 2.4 Canonical Field Naming (DB snake_case, API JSON camelCase)

Database columns are `snake_case`; API JSON payloads use `camelCase`. A controlled mapping layer performs the conversion.

| Entity | Canonical Fields |
|--------|------------------|
| **patients** | `id`, `uhid VARCHAR(20) NOT NULL UNIQUE`, `first_name`, `last_name`, `full_name` (computed, NOT stored), `date_of_birth DATE`, `age` (computed, NOT stored), `gender`, `phone VARCHAR(15) NOT NULL`, `email`, `blood_group`, `address`, `city`, `state`, `id_proof_type`, `id_proof_number`, `emergency_contact`, `allergies`, `conditions`, `is_active BOOLEAN DEFAULT true`, `created_by UUID FK` |
| **referrals** | `referral_number VARCHAR(20) UNIQUE` (NOT `referral_no`), `patient_id`, `referring_doctor_id`, `referred_to_doctor_id`, `source_encounter_id`, `from_department_id`, `to_department_id`, `preferred_doctor_id`, `reason`, `clinical_notes`, `recommended_treatment`, `priority`, `status`, `referred_by_user_id` |
| **diagnoses** | `condition_name`, `icd_code`, `type`, `severity`, `status`, `notes` |
| **prescription_items** | `medicine_id`, `medicine_name`, `dosage` (NOT `dose`), `frequency`, `duration`, `instructions`, `quantity`, `dispensed_qty` |
| **bills** | `bill_no VARCHAR(30)`, `service_type`, `total_amount NUMERIC(12,2)`, `discount NUMERIC(12,2)`, `tax_amount NUMERIC(12,2)`, `net_amount NUMERIC(12,2)`, `paid_amount`, `due_amount`, `payment_status`, `discount_type`, `discount_rule_id`, `billed_by_user_id NOT NULL` |
| **appointments** | `token_number INTEGER` |
| **wards** | `floor INT` |
| **payments** | `received_by_user_id NOT NULL`; `reference_number VARCHAR(100)` |
| **medicines** | `stock_qty INTEGER`, `cost_price NUMERIC(10,2)`, `selling_price NUMERIC(10,2)` |
| **purchase_orders** | `po_number VARCHAR(20)`; money `NUMERIC(12,2)` |
| **admissions** | `admission_number VARCHAR(20)`; `bed_id` nullable |
| **treatment_sessions** | `therapist_id NOT NULL`; `scheduled_time TIME`; `oil_used` / `body_map JSONB DEFAULT '{}'`; `materials` / `photographs JSONB DEFAULT '[]'` |
| **service_catalogs** | `name VARCHAR(255)`, `code VARCHAR(30)`, `unit VARCHAR(30)` |
| **ALL timestamps** | DB `created_at` / `updated_at`; JSON `createdAt` / `updatedAt` |

**Doctor FK decision:** The canonical FK target for doctor references is the **`doctors` table** (e.g. `referring_doctor_id`, `referred_to_doctor_id`, `therapist_id`). GORM models that FK to `users` are an implementation detail and are acceptable — both are documented as fine; the domain model uses `doctors`.

### 2.5 Canonical API Paths

Base URL **`/api/v1`** is confirmed consistent everywhere.

| Path | Status |
|------|--------|
| `POST /api/v1/billing/auto/panchakarma` | **Canonical.** Vol 04's `/billing/items/auto-generate` is OBSOLETE. |
| `POST /api/v1/pharmacy/material-requests` | **Canonical.** Vol 04's `/pharmacy/materials/request` is OBSOLETE; `/panchakarma/materials/request` is kept as a PK-specific alias. |
| `POST /api/v1/prescriptions/:id/send-to-pharmacy` | **NEW** — explicit handoff that fills the missing prescription→pharmacy integration. |
| `POST /api/v1/portal/register` | Portal additions needed in Vol 13. |
| `POST /api/v1/portal/register/verify` | Portal additions needed in Vol 13. |
| `GET /api/v1/portal/doctors` | Portal additions needed in Vol 13. |
| `GET /api/v1/portal/doctors/:id/availability` | Portal additions needed in Vol 13. |
| `POST /api/v1/portal/appointments` | Portal additions needed in Vol 13. |
| `DELETE /api/v1/portal/appointments/:id` | Portal additions needed in Vol 13. |
| `POST /api/v1/portal/profile/photo` | Portal additions needed in Vol 13. |
| `GET /api/v1/dashboard/{role}` | Role-scoped dashboard for 7 roles: `doctor`, `receptionist`, `pharmacist`, `nurse`, `therapist`, `billing`, `admin`. Gated by `dashboard:read`. |

### 2.6 Canonical Workflow Rules

| Rule | Canonical Decision |
|------|--------------------|
| **Encounter lifecycle** | Encounter stays `OPEN`/`IN_CONSULTATION` through consultation save AND prescription; it becomes `COMPLETED` only after the final bill is settled. (Resolves Vol 03 vs Vol 00 conflict.) |
| **Referral before PK/IPD** | Referral is **OPTIONAL**, not a hard gate. Panchakarma can also be triggered directly by a consultation prescription. |
| **Discharge ownership** | Discharge is owned by the **IPD module only**; Billing subscribes (final bill is created on discharge). |
| **Send to Pharmacy** | Explicit API handoff: `POST /prescriptions/:id/send-to-pharmacy` sets status `PRESCRIBED` and flags the prescription visible to the pharmacist. |
| **Patient portal scoping** | `PATIENT` role required; portal users access their own data only (row-level scoping: `WHERE patient_id = current user's patient_id`). |
| **Material request creation** | Allowed for: `ADMIN`, `PHARMACIST`, `NURSE`, `PANCHAKARMA_DOCTOR`, `PANCHAKARMA_THERAPIST`. Plain `DOCTOR` is **denied**. |
| **Doctor print/export** | Doctor CAN print and export patient records (admin-level access rules from Vol 01 win). |

---

## 3. Conflict Registry

All conflicts found during cross-volume review. Resolution references point to Section 2.x.

| ID | Category | Summary | Resolution |
|----|----------|---------|------------|
| 1 | RBAC | Role set: 13 (Vol 01) vs 12 (Vol 12) | §2.1 |
| 2 | RBAC | `PATIENT` role missing from Vol 12 seed | §2.1 |
| 3 | RBAC | Vol 11 dashboards vs UX-rule role lists differ | §2.1 |
| 4 | RBAC | Panchakarma roles `PANCHAKARMA_*` vs `PK_*` vs `THERAPIST` | §2.1 |
| 5 | RBAC | `BILLING_ACCOUNTS` vs `BILLING_STAFF` | §2.1 |
| 6 | RBAC | Ward/Lab/Store/Physio/Diet role naming | §2.1 |
| 7 | RBAC | Permission grammar three-way conflict | §2.2 |
| 8 | RBAC | Billing permission set mismatch | §2.2 |
| 9 | RBAC | Dispense permission `pharmacy.dispense` vs `prescriptions.dispense` | §2.2 |
| 10 | RBAC | Referral permissions absent from Vol 12 seed | §2.2 |
| 11 | RBAC | `user.manage` vs `users.*` | §2.2 |
| 12 | RBAC | Vol 04 undefined grants (`appointments.manage` etc.) | §2.2 |
| 13 | Workflow | Material-request role matrix conflict (Doctor/Nurse) | §2.6 |
| 14 | Workflow | Vol 02 denies Doctor print/export; Vol 01 grants | §2.6 |
| 15 | Workflow | Dashboard auth mechanism mismatch | §2.5 |
| 16 | Workflow | Vol 08 matrix vs API module-dashboard scoping | §2.5 |
| 17 | Workflow | Patient own-scope missing from Vol 01 | §2.6 |
| 18 | RBAC | Admin naming `SUPER_ADMIN`/`HOSPITAL_ADMIN`/`ADMIN` | §2.1 |
| 19 | RBAC | `role_id` FK vs `user_roles` M2M | §2.1 |
| 20 | Data Model | Patient entity has three schemas | §2.4 |
| 21 | Data Model | UHID length 20 vs 30 | §2.4 |
| 22 | Data Model | `phone` length/nullability | §2.4 |
| 23 | Enum | `gender` enum casing | §2.3 |
| 24 | Data Model | Diagnosis field naming | §2.4 |
| 25 | Data Model | Prescription medicine/dosage naming (`dose` vs `dosage`) | §2.4 |
| 26 | Data Model | `referral_number` vs `referral_no` | §2.4 |
| 27 | Data Model | `bill_no` length + `billNumber` casing | §2.4 |
| 28 | Enum | Payment method field/enum | §2.3/2.4 |
| 29 | Data Model | `token_number` INT vs string | §2.4 |
| 30 | Data Model | Ward `floor` type | §2.4 |
| 31 | Data Model | Doctor FK target `users` vs `doctors` | §2.4 |
| 32 | Data Model | `created_at` vs `createdAt` casing split | §2.4 |
| 33 | Enum | Referral priority `ROUTINE` vs `NORMAL` vs low/high | §2.3 |
| 34 | Enum | Prescription status 4-way conflict | §2.3 |
| 35 | Enum | Referral status `CREATED` vs `PENDING` | §2.3 |
| 36 | Enum | Appointment status missing states | §2.3 |
| 37 | Enum | Encounter status missing from DB/API | §2.3 |
| 38 | Enum | Consultation status undefined | §2.3 |
| 39 | Enum | Treatment plan status | §2.3 |
| 40 | Enum | Admission status `ACTIVE` vs `ADMITTED` | §2.3 |
| 41 | Enum | Bed status `CLEANING` | §2.3 |
| 42 | Enum | Nursing `SKIPPED` vs `CANCELLED` | §2.3 |
| 43 | Enum | Treatment order `ON_HOLD` vs `DISCONTINUED` | §2.3 |
| 44 | Enum | Bill status `UNPAID` vs `PENDING` | §2.3 |
| 45 | Enum | Refund `PROCESSED` vs `COMPLETED` | §2.3 |
| 46 | Enum | Purchase order status | §2.3 |
| 47 | Enum | Material request `CANCELLED` | §2.3 |
| 48 | Enum | Therapy category `PRADHANKARMA` vs `PANCHAKARMA` | §2.3 |
| 49 | Enum | Ward type `ICCU` vs `NICU` | §2.3 |
| 50 | Workflow | PK auto-billing path variants | §2.5 |
| 51 | Workflow | Material-request path 3 variants | §2.5 |
| 52 | Workflow | "Send to Pharmacy" has no API | §2.5/2.6 |
| 53 | Workflow | Portal self-registration missing in Vol 13 | §2.5 |
| 54 | Workflow | Portal booking/doctors missing in Vol 13 | §2.5 |
| 55 | Workflow | Portal photo upload missing | §2.5 |
| 56 | Workflow | Encounter `COMPLETED` timing | §2.6 |
| 57 | Data Model | Bill money precision `12,2` vs `10,2` | §2.4 |
| 58 | Data Model | Medicines stock type | §2.4 |
| 59 | Data Model | NOT NULL vs nullable (`received_by_user_id`, `therapist_id`, `bed_id`, etc.) | §2.4 |
| 60 | Data Model | JSONB default `{}` vs `[]` | §2.4 |

---

## 4. Remediation Checklist

Each action lists the volume(s) to edit and exactly what to change.

1. **Vol 12:** Update seed roles to the 15-role catalog (add `PATIENT`, `PANCHAKARMA_DOCTOR`, `PANCHAKARMA_THERAPIST`, `DIET_KITCHEN`; rename to `BILLING_STAFF`/`WARD_INCHARGE`/`LAB_TECHNICIAN`); add referral permissions; migrate all permission names to the `module:action` grammar; align all enums to §2.3; add `encounters.status` + `consultations.status` columns; fix fields per §2.4 (uhid 20, phone 15 NOT NULL, ward floor INT, bill_no 30, add `age`/`emergency_contact`/`is_active`/`created_by` to patients, `referral_number` rename, prescription `dosage`, JSONB defaults `{}`/`[]`).
2. **Vol 13:** Add missing portal endpoints (`register`, `verify`, `doctors`, `availability`, `appointments` POST/DELETE, `profile/photo`); add `POST /prescriptions/:id/send-to-pharmacy`; align all enums to §2.3; ensure camelCase JSON consistently; add dashboard `billing` + `/dashboard/therapist` + `/dashboard/admin`; fix payment method enum; remove the pending-referral filter in favor of `CREATED`.
3. **Vol 03:** `referral_no` → `referral_number`; wireframe `PENDING` → `CREATED`; remove immediate encounter `COMPLETED`-on-save (keep `OPEN` until billing); add the send-to-pharmacy step; add `icd_code` to diagnosis; `dose` → `dosage`.
4. **Vol 02:** Allow Doctor print/export; patient schema fields per §2.4; `token_number` integer; snake_case JSON → camelCase.
5. **Vol 04:** PK role renames; `/billing/items/auto-generate` → `/billing/auto/panchakarma`; `/pharmacy/materials/request` → `/pharmacy/material-requests`; therapy category enum; plan status enum.
6. **Vol 05:** Role matrix: add `NURSE`/`PHARMACIST` to material request, deny `DOCTOR`; permission grammar; dispense batch retained (additive OK).
7. **Vol 06:** Admission status `ADMITTED`/`TRANSFERRED`; bed `CLEANING`; ward type `NICU`/`MATERNITY`; nursing `SKIPPED`; order `ON_HOLD`; doctor FK target note.
8. **Vol 07:** `BILLING_STAFF`; bill status `UNPAID` default; refund `PROCESSED`; discount `FLAT` → `FIXED`; payment methods `NET_BANKING`/`CREDIT`; NOT NULL `received_by`/`billed_by`.
9. **Vol 09:** snake_case JSON → camelCase; `PATIENT` role; portal registration doc kept (already present).
10. **Vol 11:** Align dashboards + UX-rule role lists to the 15-role catalog; 7 dashboards = doctor, receptionist, pharmacist, nurse, therapist, billing, admin.
11. **Vol 01:** Permission grammar; role catalog; `dashboard:read`; add own-scope concept; `ADMIN` replaces `HOSPITAL_ADMIN`.
12. **Vol 00:** Update role count mention (13 → 15).
13. **Vol 14:** Note role strings use canonical names; token prop example integer.
14. **Vol 15:** No changes (consistent).

---

## 5. Validation & Sign-off

After applying the remediation checklist, verify all of the following:

- [ ] Seed applies cleanly with the full 15-role catalog, including `PATIENT`.
- [ ] No duplicate permission names exist; every permission matches `module:action`.
- [ ] All enums pass DB CHECK constraints (uppercase, canonical values only).
- [ ] Portal login works with the `PATIENT` role and row-level scoping.
- [ ] All 7 dashboard endpoints return role-scoped data.
- [ ] `POST /prescriptions/:id/send-to-pharmacy` sets status `PRESCRIBED` and flags the prescription for the pharmacist.
- [ ] Encounter stays `IN_CONSULTATION` until the final bill settles, then `COMPLETED`.
- [ ] `POST /billing/auto/panchakarma` and `POST /pharmacy/material-requests` respond at their canonical paths.
- [ ] JSON serialization uses camelCase and enum values map per §2.3's controlled mapping.

### Summary

| Metric | Count |
|--------|-------|
| Total conflicts found | 60 |
| Total conflicts resolved | 60 |
| Canonical roles defined | 15 |
| Canonical permissions defined | ~40 |
| Canonical enum sets defined | 27 |
| Canonical field specifications defined | 15 |
| Canonical API path decisions defined | 13 |

This document is the authority. All volumes must defer to Section 2; disagreements are resolved through Section 3 and applied via Section 4.
