# AHMS Volume 12 — Database ER Diagram & Schema Reference

> **Ayurvedic Hospital Management System (AHMS)**
> Complete Database Schema Reference
> PostgreSQL 14+ | UUID Primary Keys | Soft Deletes

---

## Table of Contents

1. [Overview](#overview)
2. [Complete Table List](#complete-table-list)
3. [ASCII ER Diagram](#ascii-er-diagram)
4. [Schema Definitions — Auth & Users](#1-auth--users)
5. [Schema Definitions — Patient](#2-patient)
6. [Schema Definitions — Clinical](#3-clinical)
7. [Schema Definitions — Pharmacy](#4-pharmacy)
8. [Schema Definitions — Billing](#5-billing)
9. [Schema Definitions — Panchakarma](#6-panchakarma)
10. [Schema Definitions — IPD](#7-ipd)
11. [Schema Definitions — Audit](#8-audit)
12. [Complete CREATE TABLE SQL](#complete-create-table-sql)
13. [Complete Indexes](#complete-indexes)
14. [Seed Data](#seed-data)

---

## Overview

This document defines the complete PostgreSQL database schema for AHMS. The schema consists of **44 tables** organized into 8 functional modules.

**Design Principles:**
- UUID primary keys (`uuid_generate_v4()`)
- Soft deletes via `deleted_at` timestamp columns
- Audit timestamps (`created_at`, `updated_at`)
- Foreign keys with `ON DELETE` behavior explicitly defined
- Normalized structure with composite keys for many-to-many relationships
- JSONB columns for flexible/nested data (vitals, body maps, photographs)

**Required Extension:**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Complete Table List

| # | Module | Table | Description |
|---|--------|-------|-------------|
| 1 | Auth & Users | `users` | System users and authentication |
| 2 | Auth & Users | `roles` | User roles (admin, doctor, nurse, etc.) |
| 3 | Auth & Users | `permissions` | Granular permission definitions |
| 4 | Auth & Users | `role_permissions` | Role-permission mapping |
| 5 | Auth & Users | `user_roles` | User-role mapping |
| 6 | Auth & Users | `token_blacklist` | JWT token revocation |
| 7 | Patient | `patients` | Patient master data |
| 8 | Clinical | `departments` | Hospital departments |
| 9 | Clinical | `doctors` | Doctor profiles |
| 10 | Clinical | `appointments` | Patient appointments |
| 11 | Clinical | `encounters` | Patient encounters/visits |
| 12 | Clinical | `consultations` | Ayurvedic consultations |
| 13 | Clinical | `diagnoses` | Diagnosis records |
| 14 | Clinical | `prescriptions` | Prescription headers |
| 15 | Clinical | `prescription_items` | Prescription line items |
| 16 | Clinical | `referrals` | Doctor-to-doctor referrals |
| 17 | Pharmacy | `medicines` | Medicine master data |
| 18 | Pharmacy | `inventory_transactions` | Stock movements |
| 19 | Pharmacy | `medicine_categories` | Medicine classification |
| 20 | Pharmacy | `suppliers` | Supplier master data |
| 21 | Pharmacy | `purchase_orders` | Purchase order headers |
| 22 | Pharmacy | `po_items` | Purchase order line items |
| 23 | Pharmacy | `material_requests` | Ward/department material requests |
| 24 | Pharmacy | `material_request_items` | Material request line items |
| 25 | Billing | `bills` | Bill/invoice headers |
| 26 | Billing | `bill_items` | Bill line items |
| 27 | Billing | `payments` | Payment transactions |
| 28 | Billing | `refunds` | Refund transactions |
| 29 | Billing | `bill_counters` | Auto-incrementing bill numbers |
| 30 | Billing | `service_categories` | Service classification |
| 31 | Billing | `service_catalogs` | Service master data |
| 32 | Billing | `discount_rules` | Discount rules and promotions |
| 33 | Panchakarma | `therapy_types` | Therapy type definitions |
| 34 | Panchakarma | `treatment_plans` | Treatment plan headers |
| 35 | Panchakarma | `treatment_sessions` | Individual therapy sessions |
| 36 | Panchakarma | `session_materials` | Materials used per session |
| 37 | IPD | `wards` | Ward definitions |
| 38 | IPD | `beds` | Bed master data |
| 39 | IPD | `admissions` | IPD admission records |
| 40 | IPD | `doctor_rounds` | Doctor round notes |
| 41 | IPD | `nursing_care_plans` | Nursing care tasks |
| 42 | IPD | `treatment_orders` | Doctor treatment orders |
| 43 | IPD | `attendants` | Patient attendants/guardians |
| 44 | Audit | `audit_log` | System audit trail |

---

## ASCII ER Diagram

```
+=====================================================================================+
|                  AHMS DATABASE ENTITY-RELATIONSHIP DIAGRAM                          |
|                        44 Tables | 8 Modules                                        |
+=====================================================================================+

 MODULE 1: AUTH & USERS (6 tables)
--------------------------------------------------------------------------------------------

                          +------------------+
                          |      roles       |
                          |------------------|
                          | id          UUID |-------+
                          | name        VARCHAR      |
                          | description TEXT         |
                          | created_at  TIMESTAMPTZ  |
                          +------------------+       |
                                    |                 |
                          +---------+--------+       |
                          | role_permissions  |       |
                          |------------------|       |
                          | role_id     UUID |-------+
                          | permission_id UUID|------------------------+
                          +------------------+                         |
                                                                        |
                          +------------------+                         |
                          |   permissions    |                         |
                          |------------------|                         |
                          | id          UUID |-------------------------+
                          | name        VARCHAR
                          | module      VARCHAR
                          | action      VARCHAR
                          | description TEXT
                          | created_at  TIMESTAMPTZ
                          +------------------+

          +------------------+                           +------------------+
          |      users       |-----------------------+   | token_blacklist  |
          |------------------|                       |   |------------------|
          | id          UUID |                       |   | id          UUID |
          | email       VARCHAR                      |   | token       TEXT |
          | password_hash TEXT                        |   | expires_at  TIMESTAMPTZ
          | first_name  VARCHAR                      |   | created_at  TIMESTAMPTZ
          | last_name   VARCHAR                      |   +------------------+
          | phone       VARCHAR                      |
          | role_id     UUID |--- FK roles ---------+
          | is_active   BOOLEAN
          | created_at  TIMESTAMPTZ
          | updated_at  TIMESTAMPTZ
          | deleted_at  TIMESTAMPTZ
          +------------------+
                    |
                    | user_roles (composite PK)
                    +------------------+
                    | user_id    UUID  |--- FK users
                    | role_id    UUID  |--- FK roles
                    +------------------+

 MODULE 2: PATIENT (1 table)
--------------------------------------------------------------------------------------------

+----------------------------------+
|           patients               |
|----------------------------------|
| id                UUID PK        |<---- Referenced by: appointments, encounters,
| uhid              VARCHAR UNIQUE |      consultations, prescriptions, bills,
| first_name        VARCHAR        |      treatment_plans, admissions, referrals
| last_name         VARCHAR        |
| date_of_birth     DATE           |
| gender            VARCHAR CHECK  |
| phone             VARCHAR        |
| email             VARCHAR        |
| blood_group       VARCHAR CHECK  |
| address           TEXT           |
| city              VARCHAR        |
| state             VARCHAR        |
| id_proof_type     VARCHAR        |
| id_proof_number   VARCHAR        |
| allergies         TEXT           |
| conditions        TEXT           |
| created_at        TIMESTAMPTZ    |
| updated_at        TIMESTAMPTZ    |
| deleted_at        TIMESTAMPTZ    |
+----------------------------------+

 MODULE 3: CLINICAL (9 tables)
--------------------------------------------------------------------------------------------

+------------------+          +-------------------------------+
|   departments    |          |        appointments           |
|------------------|          |-------------------------------|
| id          UUID |<--+      | id                   UUID     |
| name        VARCHAR   |      | patient_id           UUID  ---+--> patients
| description TEXT    |      | doctor_id            UUID  ---+--> doctors
| is_active   BOOLEAN |      | date                 DATE     |
+------------------+  |      | time                 TIME     |
           |          |      | token_number         VARCHAR  |
           |          |      | type                 VARCHAR  |
           |          |      | status               VARCHAR  |
           |          |      | notes                TEXT     |
+------------------+  |      | created_by           UUID  ---+--> users
|     doctors      |  |      | created_at       TIMESTAMPTZ  |
|------------------|  |      | updated_at       TIMESTAMPTZ  |
| id          UUID |<-+      | deleted_at       TIMESTAMPTZ  |
| user_id     UUID |---+--> users                           +-------------------------------+
| specialization   |  |                                     |
| qualification    |  |                                     |
| experience_years |  |      +-------------------------------+
| consultation_fee |  |      |        encounters             |
| is_active   BOOLEAN  |      |-------------------------------|
+------------------+  +----->| id                   UUID     |
                             | patient_id           UUID  ---+--> patients
                             | doctor_id            UUID  ---+--> doctors
                             | encounter_date       DATE     |
                             | type                 VARCHAR  |
                             | chief_complaint      TEXT     |
                             | notes                TEXT     |
                             | created_by           UUID  ---+--> users
                             | created_at       TIMESTAMPTZ  |
                             | deleted_at       TIMESTAMPTZ  |
                             +--------+----------------------+
                                      |
                                      | 1
                                      v *
                             +----------------------------------------+
                             |          consultations                 |
                             |----------------------------------------|
                             | id                       UUID          |
                             | encounter_id             UUID ---------+--> encounters
                             | doctor_id                UUID ---------+--> doctors
                             | consultation_date        DATE          |
                             | presenting_complaint     TEXT          |
                             | history                  TEXT          |
                             | examination              TEXT          |
                             | diagnosis                TEXT          |
                             | notes                    TEXT          |
                             | prakriti                 VARCHAR       |  Ayurvedic constitution
                             | vikriti                  VARCHAR       |  Current imbalance
                             | constitution_notes       TEXT          |
                             | created_at          TIMESTAMPTZ       |
                             | deleted_at          TIMESTAMPTZ       |
                             +----+-----------------------------------+
                                  |
                                  | 1
                                  v *
                             +-------------------------------+
                             |         diagnoses             |
                             |-------------------------------|
                             | id                 UUID       |
                             | consultation_id    UUID     --+--> consultations
                             | encounter_id       UUID     --+--> encounters
                             | condition_name     VARCHAR    |
                             | icd_code           VARCHAR    |
                             | type               VARCHAR    |  PRIMARY/SECONDARY
                             | severity           VARCHAR    |  MILD/MODERATE/SEVERE
                             | status             VARCHAR    |  ACTIVE/RESOLVED/CHRONIC
                             | notes              TEXT       |
                             | created_at     TIMESTAMPTZ    |
                             +-------------------------------+

                             +-------------------------------+
                             |        prescriptions         |
                             |-------------------------------|
                             | id                 UUID       |
                             | encounter_id       UUID     --+--> encounters
                             | patient_id         UUID     --+--> patients
                             | doctor_id          UUID     --+--> doctors
                             | prescription_date  DATE       |
                             | notes              TEXT       |
                             | status             VARCHAR    |  DRAFT/FINAL/CANCELLED
                             | created_at     TIMESTAMPTZ    |
                             | updated_at     TIMESTAMPTZ    |
                             | deleted_at     TIMESTAMPTZ    |
                             +----+--------------------------+
                                  |
                                  | 1
                                  v *
                             +----------------------------------------+
                             |         prescription_items             |
                             |----------------------------------------|
                             | id                       UUID          |
                             | prescription_id          UUID ---------+--> prescriptions
                             | medicine_name            VARCHAR       |
                             | medicine_id              UUID ---------+--> medicines
                             | dosage                   VARCHAR       |
                             | frequency                VARCHAR       |
                             | duration                 VARCHAR       |
                             | instructions             TEXT          |
                             | quantity                 INTEGER       |
                             | dispensed_qty            INTEGER       |
                             | created_at          TIMESTAMPTZ       |
                             +----------------------------------------+

                             +-------------------------------+
                             |         referrals            |
                             |-------------------------------|
                             | id                 UUID       |
                             | referral_number    VARCHAR UNIQUE
                             | patient_id         UUID     --+--> patients
                             | referring_doctor_id UUID   --+--> doctors
                             | referred_to_doctor_id UUID --+--> doctors
                             | encounter_id       UUID     --+--> encounters
                             | department_id      UUID     --+--> departments
                             | reason             TEXT       |
                             | priority           VARCHAR    |  NORMAL/URGENT/EMERGENCY
                             | status             VARCHAR    |  PENDING/ACCEPTED/COMPLETED
                             | notes              TEXT       |
                             | created_at     TIMESTAMPTZ    |
                             | updated_at     TIMESTAMPTZ    |
                             | deleted_at     TIMESTAMPTZ    |
                             +-------------------------------+

 MODULE 4: PHARMACY (8 tables)
--------------------------------------------------------------------------------------------

+----------------------------+                +------------------+
|   medicine_categories      |                |    suppliers     |
|----------------------------|                |------------------|
| id                UUID     |<---+           | id          UUID |
| name              VARCHAR UNIQUE            | name        VARCHAR UNIQUE
| description       TEXT     |                | contact_person   |
| parent_id         UUID     |---+ self-ref   | phone       VARCHAR
| is_active         BOOLEAN  |                | email       VARCHAR
| sort_order        INTEGER  |                | address     TEXT
| created_at    TIMESTAMPTZ  |                | gst_number  VARCHAR
| updated_at    TIMESTAMPTZ  |                | license_number  |
| deleted_at    TIMESTAMPTZ  |                | payment_terms   |
+----------------------------+                | is_active   BOOLEAN
           |                                   | notes       TEXT
           | 1                                 | created_at  TIMESTAMPTZ
           v *                                 | updated_at  TIMESTAMPTZ
+--------------------------------------+      | deleted_at  TIMESTAMPTZ
|            medicines                 |      +--------+----------+
|--------------------------------------|               | 1
| id                UUID               |<--+           v *
| name              VARCHAR UNIQUE     |   |  +-------------------------------+
| category_id       UUID     ----------+   |  |       purchase_orders         |
| formulation       VARCHAR              |  |  |-------------------------------|
| unit              VARCHAR              |  |  | id                 UUID       |
| batch_number      VARCHAR              |  |  | supplier_id        UUID  ----+--> suppliers
| expiry_date       DATE                 |  |  | po_number          VARCHAR UNIQUE
| stock_qty         INTEGER DEFAULT 0    |  |  | order_date         DATE       |
| low_stock_threshold INTEGER DEFAULT 10 |  |  | expected_date      DATE       |
| cost_price        NUMERIC              |  |  | received_date      DATE       |
| selling_price     NUMERIC              |  |  | status             VARCHAR    |
| hsn_code          VARCHAR              |  |  | total_amount       NUMERIC    |
| description       TEXT                 |  |  | discount           NUMERIC    |
| is_active         BOOLEAN              |  |  | tax                NUMERIC    |
| created_at    TIMESTAMPTZ              |  |  | grand_total        NUMERIC    |
| updated_at    TIMESTAMPTZ              |  |  | notes              TEXT       |
| deleted_at    TIMESTAMPTZ              |  |  | created_by         UUID  ----+--> users
+--------------------------------------+  |  | created_at     TIMESTAMPTZ    |
                                           |  | updated_at     TIMESTAMPTZ    |
                                           |  | deleted_at     TIMESTAMPTZ    |
                                           |  +---------+--------------------+
                                           |            | 1
                                           |            v *
                                           |  +-------------------------------+
                                           |  |          po_items             |
                                           |  |-------------------------------|
                                           |  | id                 UUID       |
                                           |  | po_id              UUID  ----+--> purchase_orders
                                           +->| medicine_id        UUID  ----+--> medicines
                                              | quantity_ordered   INTEGER    |
                                              | quantity_received  INTEGER    |
                                              | unit_price         NUMERIC    |
                                              | total_price        NUMERIC GENERATED
                                              | batch_number       VARCHAR    |
                                              | expiry_date        DATE       |
                                              | notes              TEXT       |
                                              | created_at     TIMESTAMPTZ    |
                                              | deleted_at     TIMESTAMPTZ    |
                                              +-------------------------------+

+-------------------------------------------+
|        inventory_transactions             |
|-------------------------------------------|
| id                    UUID                |
| medicine_id           UUID  -------------+--> medicines
| type                  VARCHAR   IN/OUT/ADJUSTMENT/RETURN
| quantity              INTEGER             |
| balance_after         INTEGER             |
| batch_number          VARCHAR             |
| reference_id          UUID                |
| notes                 TEXT                |
| created_by_user_id    UUID  -------------+--> users
| created_at        TIMESTAMPTZ             |
+-------------------------------------------+

+-------------------------------------------+
|          material_requests                |
|-------------------------------------------|
| id                    UUID                |
| requester_id          UUID  -------------+--> users
| department            VARCHAR             |
| status                VARCHAR             |
| urgency               VARCHAR             |
| notes                 TEXT                |
| approved_by           UUID  -------------+--> users
| approved_at       TIMESTAMPTZ             |
| dispensed_by          UUID  -------------+--> users
| dispensed_at      TIMESTAMPTZ             |
| created_at        TIMESTAMPTZ             |
| updated_at        TIMESTAMPTZ             |
| deleted_at        TIMESTAMPTZ             |
+------------------+-----------------------+
                   | 1
                   v *
+-------------------------------------------+
|       material_request_items              |
|-------------------------------------------|
| id                    UUID                |
| request_id            UUID  -------------+--> material_requests
| medicine_id           UUID  -------------+--> medicines
| quantity              INTEGER             |
| unit                  VARCHAR             |
| notes                 TEXT                |
| created_at        TIMESTAMPTZ             |
| deleted_at        TIMESTAMPTZ             |
+-------------------------------------------+

 MODULE 5: BILLING (8 tables)
--------------------------------------------------------------------------------------------

+----------------------------+            +------------------+
|   service_categories       |            |  discount_rules  |
|----------------------------|            |------------------|
| id                 UUID    |<---+       | id          UUID |
| name               VARCHAR    |       | name        VARCHAR
| description        TEXT       |       | type        VARCHAR
| is_active          BOOLEAN    |       | value       NUMERIC
| sort_order         INTEGER    |       | min_amount  NUMERIC
| created_at     TIMESTAMPTZ    |       | max_discount NUMERIC
| updated_at     TIMESTAMPTZ    |       | max_uses    INTEGER
| deleted_at     TIMESTAMPTZ    |       | used_count  INTEGER
+----------------------------+  |       | start_date  DATE
           |                     |       | end_date    DATE
           | 1                   |       | is_active   BOOLEAN
           v *                   |       | created_at  TIMESTAMPTZ
+----------------------------+  |       | updated_at  TIMESTAMPTZ
|     service_catalogs       |  |       | deleted_at  TIMESTAMPTZ
|----------------------------|  |       +--------+--------+
| id                 UUID    |  |                |
| category_id        UUID ---+  |                |
| name               VARCHAR    |                |
| code               VARCHAR UNIQUE              |
| description        TEXT       |                |
| rate               NUMERIC    |                |
| unit               VARCHAR    |                |
| hsn_code           VARCHAR    |                |
| tax_rate           NUMERIC    |                |
| is_active          BOOLEAN    |                |
| created_at     TIMESTAMPTZ    |                |
| updated_at     TIMESTAMPTZ    |                |
| deleted_at     TIMESTAMPTZ    |                |
+----------------------------+  |                |
                                 |                |
+----------------------------+  |                |
|          bills              |  |                |
|----------------------------|  |                |
| id                 UUID    |<-+                |
| bill_no            VARCHAR UNIQUE              |
| patient_id         UUID  ----+--> patients      |
| encounter_id       UUID  ----+--> encounters    |
| admission_id       UUID  ----+--> admissions    |
| service_type       VARCHAR                     |
| total_amount       NUMERIC                     |
| discount           NUMERIC                     |
| discount_type      VARCHAR                     |
| discount_rule_id   UUID  ----------------------+--> discount_rules
| tax_amount         NUMERIC                     |
| net_amount         NUMERIC                     |
| paid_amount        NUMERIC                     |
| due_amount         NUMERIC                     |
| payment_status     VARCHAR                     |
| notes              TEXT                        |
| billed_by_user_id  UUID  ----+--> users        |
| created_at     TIMESTAMPTZ                     |
| updated_at     TIMESTAMPTZ                     |
| deleted_at     TIMESTAMPTZ                     |
+--+---------------------+--+--------------------+
   | 1                    |  |
   |                      |  |
   v *                    |  v *
+-------------------+    |  +-------------------+
|    bill_items     |    |  |     payments      |
|-------------------|    |  |-------------------|
| id          UUID  |    |  | id          UUID   |
| bill_id     UUID --+-->|  | bill_id     UUID --+--> bills
| service_id  UUID  |    |  | amount      NUMERIC
| description VARCHAR    |  | method      VARCHAR
| quantity    INTEGER    |  | reference_number VARCHAR
| rate        NUMERIC    |  | received_by UUID --+--> users
| amount      NUMERIC    |  | notes       TEXT   |
| tax_rate    NUMERIC    |  | created_at TIMESTAMPTZ
| tax_amount  NUMERIC    |  | deleted_at TIMESTAMPTZ
| discount    NUMERIC    |  +-------------------+
| service_type VARCHAR   |
| deleted_at TIMESTAMPTZ |  +-------------------+
+-------------------+    |  |     refunds       |
                          |  |-------------------|
                          |  | id          UUID   |
                          |  | bill_id     UUID --+--> bills
                          |  | amount      NUMERIC
                          |  | reason      TEXT   |
                          |  | reference_number VARCHAR
                          |  | refunded_by UUID --+--> users
                          |  | status      VARCHAR
                          |  | approved_by UUID --+--> users
                          |  | notes       TEXT   |
                          |  | created_at TIMESTAMPTZ
                          |  | updated_at TIMESTAMPTZ
                          |  | deleted_at TIMESTAMPTZ
                          |  +-------------------+

+--------------------------+
|      bill_counters       |
|--------------------------|
| year              INT PK |
| last_number        INT   |
+--------------------------+

 MODULE 6: PANCHAKARMA (4 tables)
--------------------------------------------------------------------------------------------

+----------------------------+        +-------------------------------+
|       therapy_types        |        |        treatment_plans        |
|----------------------------|        |-------------------------------|
| id                    UUID |<---+   | id                    UUID    |
| name              VARCHAR UNIQUE|   | patient_id            UUID  --+--> patients
| category              VARCHAR|   | doctor_id             UUID  --+--> doctors
| sanskrit_name         VARCHAR|   | encounter_id          UUID  --+--> encounters
| duration_minutes      INTEGER|   | department_id         UUID  --+--> departments
| description           TEXT   |   | plan_name             VARCHAR |
| contraindications     TEXT   |   | status                VARCHAR |
| benefits              TEXT   |   | start_date            DATE    |
| preparation_notes     TEXT   |   | estimated_end         DATE    |
| is_active             BOOLEAN   | actual_end            DATE    |
| sort_order            INTEGER|   | diagnosis_notes       TEXT    |
| created_at        TIMESTAMPTZ|   | treatment_goals       TEXT    |
| updated_at        TIMESTAMPTZ|   | total_sessions        INTEGER |
| deleted_at        TIMESTAMPTZ|   | completed_count       INTEGER |
+----------------------------+  | notes                 TEXT    |
                                 | created_by            UUID  --+--> users
                                 | created_at        TIMESTAMPTZ |
                                 | updated_at        TIMESTAMPTZ |
                                 | deleted_at        TIMESTAMPTZ |
                                 +--------+---------------------+
                                          |
                                          | 1
                                          v *
                                 +---------------------------------------------------+
                                 |             treatment_sessions                     |
                                 |---------------------------------------------------|
                                 | id                        UUID                     |
                                 | plan_id                   UUID  ------------------+--> treatment_plans
                                 | therapy_type_id           UUID  ------------------+--> therapy_types
                                 | therapist_id              UUID  ------------------+--> users
                                 | session_number            INTEGER                  |
                                 | scheduled_date            DATE                     |
                                 | scheduled_time            TIME                     |
                                 | duration_minutes          INTEGER                  |
                                 | status                    VARCHAR                  |
                                 | actual_start              TIMESTAMPTZ              |
                                 | actual_end                TIMESTAMPTZ              |
                                 | pre_procedure             TEXT                     |
                                 | post_procedure            TEXT                     |
                                 | therapist_notes           TEXT                     |
                                 | patient_feedback          TEXT                     |
                                 | outcome_score             INTEGER CHECK 1-10       |
                                 | outcome_notes             TEXT                     |
                                 | oil_used                  JSONB                    |
                                 | materials                 JSONB                    |
                                 | body_map                  JSONB                    |
                                 | photographs               JSONB                    |
                                 | cancelled_reason          TEXT                     |
                                 | created_by                UUID  ------------------+--> users
                                 | created_at            TIMESTAMPTZ                  |
                                 | updated_at            TIMESTAMPTZ                  |
                                 | deleted_at            TIMESTAMPTZ                  |
                                 +---+-----------------------------------------------+
                                     |
                                     | 1
                                     v *
                                 +-------------------------------------------+
                                 |         session_materials                 |
                                 |-------------------------------------------|
                                 | id                    UUID                |
                                 | session_id            UUID  -------------+--> treatment_sessions
                                 | medicine_id           UUID  -------------+--> medicines
                                 | material_name         VARCHAR             |
                                 | quantity_used         NUMERIC             |
                                 | unit                  VARCHAR             |
                                 | oil_ml                NUMERIC             |
                                 | notes                 TEXT                |
                                 | created_at        TIMESTAMPTZ             |
                                 | deleted_at        TIMESTAMPTZ             |
                                 +-------------------------------------------+

 MODULE 7: IPD (7 tables)
--------------------------------------------------------------------------------------------

+------------------+          +---------------------------------------+
|      wards       |          |             admissions                |
|------------------|          |---------------------------------------|
| id          UUID |<---+     | id                        UUID         |
| name        VARCHAR UNIQUE | patient_id                UUID  ------> patients
| floor       VARCHAR  |     | admission_number          VARCHAR UNIQUE
| ward_type   VARCHAR  |     | admission_type            VARCHAR
| total_beds  INTEGER  |     | admission_date            DATE
| is_active   BOOLEAN  |     | expected_discharge        DATE
| created_at  TIMESTAMPTZ|   | actual_discharge          DATE
| updated_at  TIMESTAMPTZ|   | status                    VARCHAR
| deleted_at  TIMESTAMPTZ|   | admitting_doctor_id       UUID  ------> doctors
+---------+------------+     | bed_id                    UUID  ------+--> beds
          | 1                  | encounter_id              UUID  ------> encounters
          v *                  | diagnosis                 TEXT
+------------------+          | chief_complaint           TEXT
|       beds       |          | notes                     TEXT
|------------------|          | discharged_by             UUID  ------> users
| id          UUID |<---------+ discharge_summary         TEXT
| ward_id     UUID |----------+--> wards                  | created_by                UUID  ------> users
| bed_number  VARCHAR          | created_at            TIMESTAMPTZ
| bed_type    VARCHAR          | updated_at            TIMESTAMPTZ
| status      VARCHAR          | deleted_at            TIMESTAMPTZ
| rate_per_day NUMERIC         +---+----+----+----+-------+
| is_active   BOOLEAN              |    |    |    |
| created_at  TIMESTAMPTZ          |    |    |    |
| updated_at  TIMESTAMPTZ          |    |    |    |
| deleted_at  TIMESTAMPTZ          |    |    |    |
+------------------+               |    |    |    |
                                    v*   v*   v*   v*
+-----------------------+ +-----------------------+ +-----------------------+ +-------------------+
|    doctor_rounds      | | nursing_care_plans    | |  treatment_orders     | |    attendants     |
|-----------------------| |-----------------------| |-----------------------| |-------------------|
| id             UUID   | | id             UUID   | | id             UUID   | | id         UUID   |
| admission_id   UUID  -+->| admission_id   UUID  -+->| admission_id   UUID  -+->| admission_id UUID|
| doctor_id      UUID    | | nurse_id       UUID    | | ordered_by_id  UUID    | | name       VARCHAR
| round_date     DATE    | | shift          VARCHAR | | order_type     VARCHAR | | relationship VAR
| round_time     TIME    | | task_type      VARCHAR | | description    TEXT    | | phone      VARCHAR
| notes          TEXT    | | description    TEXT    | | frequency      VARCHAR | | id_proof_type VA
| vitals         JSONB   | | scheduled_time TIME    | | start_date     DATE    | | id_proof_number |
| condition      VARCHAR | | status         VARCHAR | | end_date       DATE    | | is_primary  BOOL |
| orders         TEXT    | | completed_at   TIMESTAMPTZ| | status    VARCHAR | | notes       TEXT |
| created_by     UUID    | | notes          TEXT    | | discontinue_reason TEXT | | created_at  TIM
| created_at TIMESTAMPTZ | | created_by     UUID    | | created_by     UUID    | | updated_at  TIM
| updated_at TIMESTAMPTZ | | created_at TIMESTAMPTZ | | created_at TIMESTAMPTZ | | deleted_at  TIM
| deleted_at TIMESTAMPTZ | | updated_at TIMESTAMPTZ | | updated_at TIMESTAMPTZ | +-------------------+
+-----------------------+ | deleted_at TIMESTAMPTZ | | deleted_at TIMESTAMPTZ |
                          +-----------------------+ +-----------------------+

 MODULE 8: AUDIT (1 table)
--------------------------------------------------------------------------------------------

+-------------------------------------------+
|              audit_log                    |
|-------------------------------------------|
| id                UUID                    |
| user_id           UUID  ------------------+--> users
| action            VARCHAR                 |
| resource_type     VARCHAR                 |
| resource_id       UUID                    |
| details           JSONB                   |
| ip_address        INET                    |
| user_agent        TEXT                    |
| created_at    TIMESTAMPTZ                 |
+-------------------------------------------+
```

---

## Schema Definitions — Auth & Users

### 1. `roles`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### 2. `permissions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `module` | VARCHAR(50) | NOT NULL |
| `action` | VARCHAR(50) | NOT NULL |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### 3. `role_permissions`

| Column | Type | Constraints |
|--------|------|-------------|
| `role_id` | UUID | PRIMARY KEY (composite), FK → roles(id) ON DELETE CASCADE |
| `permission_id` | UUID | PRIMARY KEY (composite), FK → permissions(id) ON DELETE CASCADE |

### 4. `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `first_name` | VARCHAR(100) | NOT NULL |
| `last_name` | VARCHAR(100) | NOT NULL |
| `phone` | VARCHAR(20) | |
| `role_id` | UUID | FK → roles(id) ON DELETE SET NULL |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 5. `user_roles`

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | UUID | PRIMARY KEY (composite), FK → users(id) ON DELETE CASCADE |
| `role_id` | UUID | PRIMARY KEY (composite), FK → roles(id) ON DELETE CASCADE |

### 6. `token_blacklist`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `token` | TEXT | NOT NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

## Schema Definitions — Patient

### 7. `patients`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `uhid` | VARCHAR(20) | NOT NULL, UNIQUE |
| `first_name` | VARCHAR(100) | NOT NULL |
| `last_name` | VARCHAR(100) | NOT NULL |
| `date_of_birth` | DATE | NOT NULL |
| `gender` | VARCHAR(10) | NOT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')) |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(255) | |
| `blood_group` | VARCHAR(5) | CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')) |
| `address` | TEXT | |
| `city` | VARCHAR(100) | |
| `state` | VARCHAR(100) | |
| `id_proof_type` | VARCHAR(50) | |
| `id_proof_number` | VARCHAR(100) | |
| `allergies` | TEXT | |
| `conditions` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

---

## Schema Definitions — Clinical

### 8. `departments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `description` | TEXT | |
| `is_active` | BOOLEAN | DEFAULT TRUE |

### 9. `doctors`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `user_id` | UUID | NOT NULL, UNIQUE, FK → users(id) ON DELETE CASCADE |
| `specialization` | VARCHAR(100) | |
| `qualification` | VARCHAR(255) | |
| `experience_years` | INTEGER | DEFAULT 0 |
| `consultation_fee` | NUMERIC(10,2) | DEFAULT 0 |
| `is_active` | BOOLEAN | DEFAULT TRUE |

### 10. `appointments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `patient_id` | UUID | NOT NULL, FK → patients(id) ON DELETE CASCADE |
| `doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `date` | DATE | NOT NULL |
| `time` | TIME | NOT NULL |
| `token_number` | INTEGER | |
| `type` | VARCHAR(20) | DEFAULT 'CONSULTATION' CHECK (type IN ('CONSULTATION','FOLLOW_UP','EMERGENCY')) |
| `status` | VARCHAR(20) | DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')) |
| `notes` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 11. `encounters`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `patient_id` | UUID | NOT NULL, FK → patients(id) ON DELETE CASCADE |
| `doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `encounter_date` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `type` | VARCHAR(20) | DEFAULT 'OPD' CHECK (type IN ('OPD','IPD','EMERGENCY','TELEHEALTH')) |
| `chief_complaint` | TEXT | |
| `notes` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 12. `consultations`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `encounter_id` | UUID | NOT NULL, FK → encounters(id) ON DELETE CASCADE |
| `doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `consultation_date` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `presenting_complaint` | TEXT | |
| `history` | TEXT | |
| `examination` | TEXT | |
| `diagnosis` | TEXT | |
| `notes` | TEXT | |
| `prakriti` | VARCHAR(50) | CHECK (prakriti IN ('VATA','PITTA','KAPHA','VATA_PITTA','VATA_KAPHA','PITTA_KAPHA','SAMA')) |
| `vikriti` | VARCHAR(50) | CHECK (vikriti IN ('VATA','PITTA','KAPHA','VATA_PITTA','VATA_KAPHA','PITTA_KAPHA','SAMA')) |
| `constitution_notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 13. `diagnoses`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `consultation_id` | UUID | FK → consultations(id) ON DELETE CASCADE |
| `encounter_id` | UUID | FK → encounters(id) ON DELETE CASCADE |
| `condition_name` | VARCHAR(255) | NOT NULL |
| `icd_code` | VARCHAR(20) | |
| `type` | VARCHAR(20) | DEFAULT 'PRIMARY' CHECK (type IN ('PRIMARY','SECONDARY','DIFFERENTIAL')) |
| `severity` | VARCHAR(20) | CHECK (severity IN ('MILD','MODERATE','SEVERE')) |
| `status` | VARCHAR(20) | DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RESOLVED','CHRONIC')) |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### 14. `prescriptions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `encounter_id` | UUID | NOT NULL, FK → encounters(id) ON DELETE CASCADE |
| `patient_id` | UUID | NOT NULL, FK → patients(id) ON DELETE CASCADE |
| `doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `prescription_date` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `notes` | TEXT | |
| `status` | VARCHAR(20) | DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','FINAL','CANCELLED')) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 15. `prescription_items`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `prescription_id` | UUID | NOT NULL, FK → prescriptions(id) ON DELETE CASCADE |
| `medicine_name` | VARCHAR(255) | NOT NULL |
| `medicine_id` | UUID | FK → medicines(id) ON DELETE SET NULL |
| `dosage` | VARCHAR(100) | |
| `frequency` | VARCHAR(50) | |
| `duration` | VARCHAR(50) | |
| `instructions` | TEXT | |
| `quantity` | INTEGER | DEFAULT 1 |
| `dispensed_qty` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### 16. `referrals`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `referral_number` | VARCHAR(20) | NOT NULL, UNIQUE |
| `patient_id` | UUID | NOT NULL, FK → patients(id) ON DELETE CASCADE |
| `referring_doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `referred_to_doctor_id` | UUID | FK → doctors(id) ON DELETE SET NULL |
| `encounter_id` | UUID | FK → encounters(id) ON DELETE SET NULL |
| `department_id` | UUID | FK → departments(id) ON DELETE SET NULL |
| `reason` | TEXT | NOT NULL |
| `priority` | VARCHAR(20) | DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','URGENT','EMERGENCY')) |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','COMPLETED','REJECTED')) |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

---

## Schema Definitions — Pharmacy

### 17. `medicine_categories`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `description` | TEXT | |
| `parent_id` | UUID | FK → medicine_categories(id) ON DELETE SET NULL |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `sort_order` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 18. `medicines`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE |
| `category_id` | UUID | FK → medicine_categories(id) ON DELETE SET NULL |
| `formulation` | VARCHAR(50) | CHECK (formulation IN ('TABLET','CAPSULE','SYRUP','POWDER','OIL','PASTE','GHRITA','KVATHA','CHURNA','VATI','LEHA','TAILA','OTHER')) |
| `unit` | VARCHAR(30) | DEFAULT 'PIECE' CHECK (unit IN ('PIECE','STRIP','BOTTLE','KG','GRAM','ML','LITER','PACKET','BOX')) |
| `batch_number` | VARCHAR(50) | |
| `expiry_date` | DATE | |
| `stock_qty` | INTEGER | DEFAULT 0 CHECK (stock_qty >= 0) |
| `low_stock_threshold` | INTEGER | DEFAULT 10 |
| `cost_price` | NUMERIC(10,2) | DEFAULT 0 |
| `selling_price` | NUMERIC(10,2) | DEFAULT 0 |
| `hsn_code` | VARCHAR(20) | |
| `description` | TEXT | |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 19. `inventory_transactions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `medicine_id` | UUID | NOT NULL, FK → medicines(id) ON DELETE CASCADE |
| `type` | VARCHAR(20) | NOT NULL CHECK (type IN ('IN','OUT','ADJUSTMENT','RETURN')) |
| `quantity` | INTEGER | NOT NULL |
| `balance_after` | INTEGER | NOT NULL |
| `batch_number` | VARCHAR(50) | |
| `reference_id` | UUID | |
| `notes` | TEXT | |
| `created_by_user_id` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### 20. `suppliers`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE |
| `contact_person` | VARCHAR(100) | |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(255) | |
| `address` | TEXT | |
| `gst_number` | VARCHAR(20) | |
| `license_number` | VARCHAR(50) | |
| `payment_terms` | TEXT | |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 21. `purchase_orders`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `supplier_id` | UUID | NOT NULL, FK → suppliers(id) ON DELETE CASCADE |
| `po_number` | VARCHAR(20) | NOT NULL, UNIQUE |
| `order_date` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `expected_date` | DATE | |
| `received_date` | DATE | |
| `status` | VARCHAR(20) | DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','CONFIRMED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED')) |
| `total_amount` | NUMERIC(12,2) | DEFAULT 0 |
| `discount` | NUMERIC(12,2) | DEFAULT 0 |
| `tax` | NUMERIC(12,2) | DEFAULT 0 |
| `grand_total` | NUMERIC(12,2) | DEFAULT 0 |
| `notes` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 22. `po_items`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `po_id` | UUID | NOT NULL, FK → purchase_orders(id) ON DELETE CASCADE |
| `medicine_id` | UUID | NOT NULL, FK → medicines(id) ON DELETE CASCADE |
| `quantity_ordered` | INTEGER | NOT NULL CHECK (quantity_ordered > 0) |
| `quantity_received` | INTEGER | DEFAULT 0 |
| `unit_price` | NUMERIC(10,2) | NOT NULL |
| `total_price` | NUMERIC(12,2) | GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED |
| `batch_number` | VARCHAR(50) | |
| `expiry_date` | DATE | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 23. `material_requests`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `requester_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `department` | VARCHAR(100) | |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','DISPENSED','CANCELLED')) |
| `urgency` | VARCHAR(20) | DEFAULT 'NORMAL' CHECK (urgency IN ('NORMAL','URGENT','EMERGENCY')) |
| `notes` | TEXT | |
| `approved_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `approved_at` | TIMESTAMPTZ | |
| `dispensed_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `dispensed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 24. `material_request_items`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `request_id` | UUID | NOT NULL, FK → material_requests(id) ON DELETE CASCADE |
| `medicine_id` | UUID | NOT NULL, FK → medicines(id) ON DELETE CASCADE |
| `quantity` | INTEGER | NOT NULL CHECK (quantity > 0) |
| `unit` | VARCHAR(30) | DEFAULT 'PIECE' |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

---

## Schema Definitions — Billing

### 25. `service_categories`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(100) | NOT NULL |
| `description` | TEXT | |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `sort_order` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 26. `service_catalogs`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `category_id` | UUID | NOT NULL, FK → service_categories(id) ON DELETE CASCADE |
| `name` | VARCHAR(255) | NOT NULL |
| `code` | VARCHAR(30) | NOT NULL, UNIQUE |
| `description` | TEXT | |
| `rate` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `unit` | VARCHAR(30) | DEFAULT 'PIECE' |
| `hsn_code` | VARCHAR(20) | |
| `tax_rate` | NUMERIC(5,2) | DEFAULT 0 |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 27. `discount_rules`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(100) | NOT NULL |
| `type` | VARCHAR(20) | NOT NULL CHECK (type IN ('PERCENTAGE','FIXED')) |
| `value` | NUMERIC(10,2) | NOT NULL |
| `min_amount` | NUMERIC(10,2) | DEFAULT 0 |
| `max_discount` | NUMERIC(10,2) | |
| `max_uses` | INTEGER | |
| `used_count` | INTEGER | DEFAULT 0 |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 28. `bill_counters`

| Column | Type | Constraints |
|--------|------|-------------|
| `year` | INTEGER | PRIMARY KEY |
| `last_number` | INTEGER | NOT NULL DEFAULT 0 |

### 29. `bills`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `bill_no` | VARCHAR(20) | NOT NULL, UNIQUE |
| `patient_id` | UUID | NOT NULL, FK → patients(id) ON DELETE CASCADE |
| `encounter_id` | UUID | FK → encounters(id) ON DELETE SET NULL |
| `admission_id` | UUID | FK → admissions(id) ON DELETE SET NULL |
| `service_type` | VARCHAR(30) | NOT NULL CHECK (service_type IN ('OPD','IPD','PHARMACY','LAB','OTHER')) |
| `total_amount` | NUMERIC(12,2) | DEFAULT 0 |
| `discount` | NUMERIC(12,2) | DEFAULT 0 |
| `discount_type` | VARCHAR(20) | CHECK (discount_type IN ('PERCENTAGE','FIXED')) |
| `discount_rule_id` | UUID | FK → discount_rules(id) ON DELETE SET NULL |
| `tax_amount` | NUMERIC(12,2) | DEFAULT 0 |
| `net_amount` | NUMERIC(12,2) | DEFAULT 0 |
| `paid_amount` | NUMERIC(12,2) | DEFAULT 0 |
| `due_amount` | NUMERIC(12,2) | DEFAULT 0 |
| `payment_status` | VARCHAR(20) | DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PARTIAL','PAID','REFUNDED','CANCELLED')) |
| `notes` | TEXT | |
| `billed_by_user_id` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 30. `bill_items`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `bill_id` | UUID | NOT NULL, FK → bills(id) ON DELETE CASCADE |
| `service_id` | UUID | FK → service_catalogs(id) ON DELETE SET NULL |
| `description` | VARCHAR(255) | NOT NULL |
| `quantity` | INTEGER | DEFAULT 1 |
| `rate` | NUMERIC(10,2) | NOT NULL |
| `amount` | NUMERIC(12,2) | NOT NULL |
| `tax_rate` | NUMERIC(5,2) | DEFAULT 0 |
| `tax_amount` | NUMERIC(12,2) | DEFAULT 0 |
| `discount` | NUMERIC(12,2) | DEFAULT 0 |
| `service_type` | VARCHAR(30) | |
| `deleted_at` | TIMESTAMPTZ | |

### 31. `payments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `bill_id` | UUID | NOT NULL, FK → bills(id) ON DELETE CASCADE |
| `amount` | NUMERIC(12,2) | NOT NULL CHECK (amount > 0) |
| `method` | VARCHAR(20) | NOT NULL CHECK (method IN ('CASH','CARD','UPI','NET_BANKING','INSURANCE','CREDIT')) |
| `reference_number` | VARCHAR(100) | |
| `received_by_user_id` | UUID | FK → users(id) ON DELETE SET NULL |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 32. `refunds`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `bill_id` | UUID | NOT NULL, FK → bills(id) ON DELETE CASCADE |
| `amount` | NUMERIC(12,2) | NOT NULL CHECK (amount > 0) |
| `reason` | TEXT | NOT NULL |
| `reference_number` | VARCHAR(100) | |
| `refunded_by_user_id` | UUID | FK → users(id) ON DELETE SET NULL |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')) |
| `approved_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

---

## Schema Definitions — Panchakarma

### 33. `therapy_types`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(150) | NOT NULL, UNIQUE |
| `category` | VARCHAR(50) | CHECK (category IN ('PURVAKARMA','PANCHAKARMA','UTTARAKARMA','EXTERNAL','INTERNAL','REJUVENATION')) |
| `sanskrit_name` | VARCHAR(150) | |
| `duration_minutes` | INTEGER | DEFAULT 30 |
| `description` | TEXT | |
| `contraindications` | TEXT | |
| `benefits` | TEXT | |
| `preparation_notes` | TEXT | |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `sort_order` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 34. `treatment_plans`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `patient_id` | UUID | NOT NULL, FK → patients(id) ON DELETE CASCADE |
| `doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `encounter_id` | UUID | FK → encounters(id) ON DELETE SET NULL |
| `department_id` | UUID | FK → departments(id) ON DELETE SET NULL |
| `plan_name` | VARCHAR(255) | NOT NULL |
| `status` | VARCHAR(20) | DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')) |
| `start_date` | DATE | |
| `estimated_end` | DATE | |
| `actual_end` | DATE | |
| `diagnosis_notes` | TEXT | |
| `treatment_goals` | TEXT | |
| `total_sessions` | INTEGER | DEFAULT 0 |
| `completed_count` | INTEGER | DEFAULT 0 |
| `notes` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 35. `treatment_sessions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `plan_id` | UUID | NOT NULL, FK → treatment_plans(id) ON DELETE CASCADE |
| `therapy_type_id` | UUID | NOT NULL, FK → therapy_types(id) ON DELETE CASCADE |
| `therapist_id` | UUID | FK → users(id) ON DELETE SET NULL |
| `session_number` | INTEGER | NOT NULL |
| `scheduled_date` | DATE | NOT NULL |
| `scheduled_time` | TIME | |
| `duration_minutes` | INTEGER | DEFAULT 30 |
| `status` | VARCHAR(20) | DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')) |
| `actual_start` | TIMESTAMPTZ | |
| `actual_end` | TIMESTAMPTZ | |
| `pre_procedure` | TEXT | |
| `post_procedure` | TEXT | |
| `therapist_notes` | TEXT | |
| `patient_feedback` | TEXT | |
| `outcome_score` | INTEGER | CHECK (outcome_score >= 1 AND outcome_score <= 10) |
| `outcome_notes` | TEXT | |
| `oil_used` | JSONB | DEFAULT '{}'::jsonb |
| `materials` | JSONB | DEFAULT '[]'::jsonb |
| `body_map` | JSONB | DEFAULT '{}'::jsonb |
| `photographs` | JSONB | DEFAULT '[]'::jsonb |
| `cancelled_reason` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 36. `session_materials`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `session_id` | UUID | NOT NULL, FK → treatment_sessions(id) ON DELETE CASCADE |
| `medicine_id` | UUID | FK → medicines(id) ON DELETE SET NULL |
| `material_name` | VARCHAR(255) | NOT NULL |
| `quantity_used` | NUMERIC(10,2) | DEFAULT 0 |
| `unit` | VARCHAR(30) | DEFAULT 'PIECE' |
| `oil_ml` | NUMERIC(10,2) | DEFAULT 0 |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

---

## Schema Definitions — IPD

### 37. `wards`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `floor` | VARCHAR(20) | |
| `ward_type` | VARCHAR(30) | CHECK (ward_type IN ('GENERAL','SEMI_PRIVATE','PRIVATE','ICU','ICCU','DELUXE','SUITE')) |
| `total_beds` | INTEGER | NOT NULL DEFAULT 0 |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 38. `beds`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `ward_id` | UUID | NOT NULL, FK → wards(id) ON DELETE CASCADE |
| `bed_number` | VARCHAR(20) | NOT NULL |
| `bed_type` | VARCHAR(30) | DEFAULT 'STANDARD' |
| `status` | VARCHAR(20) | DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','OCCUPIED','MAINTENANCE','RESERVED')) |
| `rate_per_day` | NUMERIC(10,2) | DEFAULT 0 |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 39. `admissions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `patient_id` | UUID | NOT NULL, FK → patients(id) ON DELETE CASCADE |
| `admission_number` | VARCHAR(20) | NOT NULL, UNIQUE |
| `admission_type` | VARCHAR(20) | NOT NULL CHECK (admission_type IN ('EMERGENCY','ELECTIVE','TRANSFER')) |
| `admission_date` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `expected_discharge` | DATE | |
| `actual_discharge` | DATE | |
| `status` | VARCHAR(20) | DEFAULT 'ADMITTED' CHECK (status IN ('ADMITTED','DISCHARGED','CANCELLED')) |
| `admitting_doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `bed_id` | UUID | NOT NULL, FK → beds(id) ON DELETE CASCADE |
| `encounter_id` | UUID | FK → encounters(id) ON DELETE SET NULL |
| `diagnosis` | TEXT | |
| `chief_complaint` | TEXT | |
| `notes` | TEXT | |
| `discharged_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `discharge_summary` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 40. `doctor_rounds`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `admission_id` | UUID | NOT NULL, FK → admissions(id) ON DELETE CASCADE |
| `doctor_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `round_date` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `round_time` | TIME | NOT NULL |
| `notes` | TEXT | |
| `vitals` | JSONB | DEFAULT '{}'::jsonb |
| `condition` | VARCHAR(50) | |
| `orders` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 41. `nursing_care_plans`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `admission_id` | UUID | NOT NULL, FK → admissions(id) ON DELETE CASCADE |
| `nurse_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `shift` | VARCHAR(20) | CHECK (shift IN ('MORNING','EVENING','NIGHT')) |
| `task_type` | VARCHAR(50) | |
| `description` | TEXT | NOT NULL |
| `scheduled_time` | TIME | |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED')) |
| `completed_at` | TIMESTAMPTZ | |
| `notes` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 42. `treatment_orders`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `admission_id` | UUID | NOT NULL, FK → admissions(id) ON DELETE CASCADE |
| `ordered_by_id` | UUID | NOT NULL, FK → doctors(id) ON DELETE CASCADE |
| `order_type` | VARCHAR(50) | CHECK (order_type IN ('MEDICATION','IV','DIET','ACTIVITY','LAB','IMAGING','PROCEDURE','OTHER')) |
| `description` | TEXT | NOT NULL |
| `frequency` | VARCHAR(50) | |
| `start_date` | DATE | NOT NULL |
| `end_date` | DATE | |
| `status` | VARCHAR(20) | DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','DISCONTINUED','CANCELLED')) |
| `discontinue_reason` | TEXT | |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

### 43. `attendants`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `admission_id` | UUID | NOT NULL, FK → admissions(id) ON DELETE CASCADE |
| `name` | VARCHAR(150) | NOT NULL |
| `relationship` | VARCHAR(50) | |
| `phone` | VARCHAR(20) | |
| `id_proof_type` | VARCHAR(50) | |
| `id_proof_number` | VARCHAR(100) | |
| `is_primary` | BOOLEAN | DEFAULT FALSE |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | |

---

## Schema Definitions — Audit

### 44. `audit_log`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| `user_id` | UUID | FK → users(id) ON DELETE SET NULL |
| `action` | VARCHAR(50) | NOT NULL |
| `resource_type` | VARCHAR(50) | NOT NULL |
| `resource_id` | UUID | |
| `details` | JSONB | |
| `ip_address` | INET | |
| `user_agent` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

## Complete Create Table SQL

```sql
-- =============================================================================
-- AHMS DATABASE SCHEMA
-- PostgreSQL 14+ | UUID Primary Keys | Soft Deletes
-- =============================================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- MODULE 1: AUTH & USERS
-- =============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MODULE 2: PATIENT
-- =============================================================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uhid VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    phone VARCHAR(20),
    email VARCHAR(255),
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(100),
    allergies TEXT,
    conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- MODULE 3: CLINICAL
-- =============================================================================

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    qualification VARCHAR(255),
    experience_years INTEGER DEFAULT 0,
    consultation_fee NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    token_number INTEGER,
    type VARCHAR(20) DEFAULT 'CONSULTATION' CHECK (type IN ('CONSULTATION', 'FOLLOW_UP', 'EMERGENCY')),
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    encounter_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(20) DEFAULT 'OPD' CHECK (type IN ('OPD', 'IPD', 'EMERGENCY', 'TELEHEALTH')),
    chief_complaint TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    presenting_complaint TEXT,
    history TEXT,
    examination TEXT,
    diagnosis TEXT,
    notes TEXT,
    prakriti VARCHAR(50) CHECK (prakriti IN ('VATA', 'PITTA', 'KAPHA', 'VATA_PITTA', 'VATA_KAPHA', 'PITTA_KAPHA', 'SAMA')),
    vikriti VARCHAR(50) CHECK (vikriti IN ('VATA', 'PITTA', 'KAPHA', 'VATA_PITTA', 'VATA_KAPHA', 'PITTA_KAPHA', 'SAMA')),
    constitution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
    condition_name VARCHAR(255) NOT NULL,
    icd_code VARCHAR(20),
    type VARCHAR(20) DEFAULT 'PRIMARY' CHECK (type IN ('PRIMARY', 'SECONDARY', 'DIFFERENTIAL')),
    severity VARCHAR(20) CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'CHRONIC')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINAL', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(50),
    duration VARCHAR(50),
    instructions TEXT,
    quantity INTEGER DEFAULT 1,
    dispensed_qty INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_number VARCHAR(20) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referring_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    referred_to_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT', 'EMERGENCY')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- MODULE 4: PHARMACY
-- =============================================================================

CREATE TABLE medicine_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES medicine_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category_id UUID REFERENCES medicine_categories(id) ON DELETE SET NULL,
    formulation VARCHAR(50) CHECK (formulation IN ('TABLET', 'CAPSULE', 'SYRUP', 'POWDER', 'OIL', 'PASTE', 'GHRITA', 'KVATHA', 'CHURNA', 'VATI', 'LEHA', 'TAILA', 'OTHER')),
    unit VARCHAR(30) DEFAULT 'PIECE' CHECK (unit IN ('PIECE', 'STRIP', 'BOTTLE', 'KG', 'GRAM', 'ML', 'LITER', 'PACKET', 'BOX')),
    batch_number VARCHAR(50),
    expiry_date DATE,
    stock_qty INTEGER DEFAULT 0 CHECK (stock_qty >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    cost_price NUMERIC(10,2) DEFAULT 0,
    selling_price NUMERIC(10,2) DEFAULT 0,
    hsn_code VARCHAR(20),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'RETURN')),
    quantity INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    batch_number VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(20),
    license_number VARCHAR(50),
    payment_terms TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    po_number VARCHAR(20) NOT NULL UNIQUE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    total_amount NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE po_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(12,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE material_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISPENSED', 'CANCELLED')),
    urgency VARCHAR(20) DEFAULT 'NORMAL' CHECK (urgency IN ('NORMAL', 'URGENT', 'EMERGENCY')),
    notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    dispensed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    dispensed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE material_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit VARCHAR(30) DEFAULT 'PIECE',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- MODULE 5: BILLING
-- =============================================================================

CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE service_catalogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(30) DEFAULT 'PIECE',
    hsn_code VARCHAR(20),
    tax_rate NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE discount_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED')),
    value NUMERIC(10,2) NOT NULL,
    min_amount NUMERIC(10,2) DEFAULT 0,
    max_discount NUMERIC(10,2),
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE bill_counters (
    year INTEGER PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_no VARCHAR(20) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
    service_type VARCHAR(30) NOT NULL CHECK (service_type IN ('OPD', 'IPD', 'PHARMACY', 'LAB', 'OTHER')),
    total_amount NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    discount_type VARCHAR(20) CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_rule_id UUID REFERENCES discount_rules(id) ON DELETE SET NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    net_amount NUMERIC(12,2) DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    due_amount NUMERIC(12,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED')),
    notes TEXT,
    billed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    service_id UUID REFERENCES service_catalogs(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    rate NUMERIC(10,2) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    service_type VARCHAR(30),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(20) NOT NULL CHECK (method IN ('CASH', 'CARD', 'UPI', 'NET_BANKING', 'INSURANCE', 'CREDIT')),
    reference_number VARCHAR(100),
    received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    reference_number VARCHAR(100),
    refunded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- MODULE 6: PANCHAKARMA
-- =============================================================================

CREATE TABLE therapy_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(50) CHECK (category IN ('PURVAKARMA', 'PANCHAKARMA', 'UTTARAKARMA', 'EXTERNAL', 'INTERNAL', 'REJUVENATION')),
    sanskrit_name VARCHAR(150),
    duration_minutes INTEGER DEFAULT 30,
    description TEXT,
    contraindications TEXT,
    benefits TEXT,
    preparation_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    plan_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    start_date DATE,
    estimated_end DATE,
    actual_end DATE,
    diagnosis_notes TEXT,
    treatment_goals TEXT,
    total_sessions INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE treatment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    therapy_type_id UUID NOT NULL REFERENCES therapy_types(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_number INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    pre_procedure TEXT,
    post_procedure TEXT,
    therapist_notes TEXT,
    patient_feedback TEXT,
    outcome_score INTEGER CHECK (outcome_score >= 1 AND outcome_score <= 10),
    outcome_notes TEXT,
    oil_used JSONB DEFAULT '{}'::jsonb,
    materials JSONB DEFAULT '[]'::jsonb,
    body_map JSONB DEFAULT '{}'::jsonb,
    photographs JSONB DEFAULT '[]'::jsonb,
    cancelled_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE session_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES treatment_sessions(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    material_name VARCHAR(255) NOT NULL,
    quantity_used NUMERIC(10,2) DEFAULT 0,
    unit VARCHAR(30) DEFAULT 'PIECE',
    oil_ml NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- MODULE 7: IPD
-- =============================================================================

CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    floor VARCHAR(20),
    ward_type VARCHAR(30) CHECK (ward_type IN ('GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'ICCU', 'DELUXE', 'SUITE')),
    total_beds INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(30) DEFAULT 'STANDARD',
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED')),
    rate_per_day NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_number VARCHAR(20) NOT NULL UNIQUE,
    admission_type VARCHAR(20) NOT NULL CHECK (admission_type IN ('EMERGENCY', 'ELECTIVE', 'TRANSFER')),
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_discharge DATE,
    actual_discharge DATE,
    status VARCHAR(20) DEFAULT 'ADMITTED' CHECK (status IN ('ADMITTED', 'DISCHARGED', 'CANCELLED')),
    admitting_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    diagnosis TEXT,
    chief_complaint TEXT,
    notes TEXT,
    discharged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    discharge_summary TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE doctor_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    round_date DATE NOT NULL DEFAULT CURRENT_DATE,
    round_time TIME NOT NULL,
    notes TEXT,
    vitals JSONB DEFAULT '{}'::jsonb,
    condition VARCHAR(50),
    orders TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE nursing_care_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift VARCHAR(20) CHECK (shift IN ('MORNING', 'EVENING', 'NIGHT')),
    task_type VARCHAR(50),
    description TEXT NOT NULL,
    scheduled_time TIME,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE treatment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    ordered_by_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    order_type VARCHAR(50) CHECK (order_type IN ('MEDICATION', 'IV', 'DIET', 'ACTIVITY', 'LAB', 'IMAGING', 'PROCEDURE', 'OTHER')),
    description TEXT NOT NULL,
    frequency VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISCONTINUED', 'CANCELLED')),
    discontinue_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE attendants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50),
    phone VARCHAR(20),
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- MODULE 8: AUDIT
-- =============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Complete Indexes

```sql
-- =============================================================================
-- INDEXES - AUTH & USERS
-- =============================================================================

-- roles
CREATE INDEX idx_roles_name ON roles(name);

-- permissions
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_permissions_module_action ON permissions(module, action);

-- users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- token_blacklist
CREATE INDEX idx_token_blacklist_token ON token_blacklist(token);
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- =============================================================================
-- INDEXES - PATIENT
-- =============================================================================

CREATE INDEX idx_patients_uhid ON patients(uhid);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_patients_gender ON patients(gender);
CREATE INDEX idx_patients_deleted_at ON patients(deleted_at);

-- =============================================================================
-- INDEXES - CLINICAL
-- =============================================================================

-- doctors
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_is_active ON doctors(is_active);

-- appointments
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created_by ON appointments(created_by);
CREATE INDEX idx_appointments_deleted_at ON appointments(deleted_at);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, date);
CREATE INDEX idx_appointments_patient_date ON appointments(patient_id, date);

-- encounters
CREATE INDEX idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX idx_encounters_doctor_id ON encounters(doctor_id);
CREATE INDEX idx_encounters_date ON encounters(encounter_date);
CREATE INDEX idx_encounters_type ON encounters(type);
CREATE INDEX idx_encounters_created_by ON encounters(created_by);
CREATE INDEX idx_encounters_deleted_at ON encounters(deleted_at);

-- consultations
CREATE INDEX idx_consultations_encounter_id ON consultations(encounter_id);
CREATE INDEX idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);
CREATE INDEX idx_consultations_deleted_at ON consultations(deleted_at);

-- diagnoses
CREATE INDEX idx_diagnoses_consultation_id ON diagnoses(consultation_id);
CREATE INDEX idx_diagnoses_encounter_id ON diagnoses(encounter_id);
CREATE INDEX idx_diagnoses_condition_name ON diagnoses(condition_name);
CREATE INDEX idx_diagnoses_icd_code ON diagnoses(icd_code);
CREATE INDEX idx_diagnoses_type ON diagnoses(type);
CREATE INDEX idx_diagnoses_status ON diagnoses(status);

-- prescriptions
CREATE INDEX idx_prescriptions_encounter_id ON prescriptions(encounter_id);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_date ON prescriptions(prescription_date);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_deleted_at ON prescriptions(deleted_at);

-- prescription_items
CREATE INDEX idx_prescription_items_prescription_id ON prescription_items(prescription_id);
CREATE INDEX idx_prescription_items_medicine_id ON prescription_items(medicine_id);

-- referrals
CREATE INDEX idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX idx_referrals_referring_doctor_id ON referrals(referring_doctor_id);
CREATE INDEX idx_referrals_referred_to_doctor_id ON referrals(referred_to_doctor_id);
CREATE INDEX idx_referrals_encounter_id ON referrals(encounter_id);
CREATE INDEX idx_referrals_department_id ON referrals(department_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_deleted_at ON referrals(deleted_at);

-- =============================================================================
-- INDEXES - PHARMACY
-- =============================================================================

-- medicine_categories
CREATE INDEX idx_medicine_categories_parent_id ON medicine_categories(parent_id);
CREATE INDEX idx_medicine_categories_is_active ON medicine_categories(is_active);
CREATE INDEX idx_medicine_categories_deleted_at ON medicine_categories(deleted_at);

-- medicines
CREATE INDEX idx_medicines_category_id ON medicines(category_id);
CREATE INDEX idx_medicines_formulation ON medicines(formulation);
CREATE INDEX idx_medicines_batch_number ON medicines(batch_number);
CREATE INDEX idx_medicines_stock_qty ON medicines(stock_qty);
CREATE INDEX idx_medicines_is_active ON medicines(is_active);
CREATE INDEX idx_medicines_deleted_at ON medicines(deleted_at);

-- inventory_transactions
CREATE INDEX idx_inventory_transactions_medicine_id ON inventory_transactions(medicine_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_created_by_user_id ON inventory_transactions(created_by_user_id);

-- suppliers
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_deleted_at ON suppliers(deleted_at);

-- purchase_orders
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX idx_purchase_orders_deleted_at ON purchase_orders(deleted_at);

-- po_items
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_po_items_medicine_id ON po_items(medicine_id);

-- material_requests
CREATE INDEX idx_material_requests_requester_id ON material_requests(requester_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_created_at ON material_requests(created_at);
CREATE INDEX idx_material_requests_deleted_at ON material_requests(deleted_at);

-- material_request_items
CREATE INDEX idx_material_request_items_request_id ON material_request_items(request_id);
CREATE INDEX idx_material_request_items_medicine_id ON material_request_items(medicine_id);

-- =============================================================================
-- INDEXES - BILLING
-- =============================================================================

-- service_catalogs
CREATE INDEX idx_service_catalogs_category_id ON service_catalogs(category_id);
CREATE INDEX idx_service_catalogs_code ON service_catalogs(code);
CREATE INDEX idx_service_catalogs_is_active ON service_catalogs(is_active);
CREATE INDEX idx_service_catalogs_deleted_at ON service_catalogs(deleted_at);

-- discount_rules
CREATE INDEX idx_discount_rules_is_active ON discount_rules(is_active);
CREATE INDEX idx_discount_rules_start_date ON discount_rules(start_date);
CREATE INDEX idx_discount_rules_end_date ON discount_rules(end_date);
CREATE INDEX idx_discount_rules_deleted_at ON discount_rules(deleted_at);

-- bills
CREATE INDEX idx_bills_bill_no ON bills(bill_no);
CREATE INDEX idx_bills_patient_id ON bills(patient_id);
CREATE INDEX idx_bills_encounter_id ON bills(encounter_id);
CREATE INDEX idx_bills_admission_id ON bills(admission_id);
CREATE INDEX idx_bills_service_type ON bills(service_type);
CREATE INDEX idx_bills_payment_status ON bills(payment_status);
CREATE INDEX idx_bills_created_at ON bills(created_at);
CREATE INDEX idx_bills_deleted_at ON bills(deleted_at);

-- bill_items
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_service_id ON bill_items(service_id);

-- payments
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- refunds
CREATE INDEX idx_refunds_bill_id ON refunds(bill_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);

-- =============================================================================
-- INDEXES - PANCHAKARMA
-- =============================================================================

-- therapy_types
CREATE INDEX idx_therapy_types_category ON therapy_types(category);
CREATE INDEX idx_therapy_types_is_active ON therapy_types(is_active);
CREATE INDEX idx_therapy_types_deleted_at ON therapy_types(deleted_at);

-- treatment_plans
CREATE INDEX idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_doctor_id ON treatment_plans(doctor_id);
CREATE INDEX idx_treatment_plans_encounter_id ON treatment_plans(encounter_id);
CREATE INDEX idx_treatment_plans_department_id ON treatment_plans(department_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX idx_treatment_plans_created_by ON treatment_plans(created_by);
CREATE INDEX idx_treatment_plans_deleted_at ON treatment_plans(deleted_at);

-- treatment_sessions
CREATE INDEX idx_treatment_sessions_plan_id ON treatment_sessions(plan_id);
CREATE INDEX idx_treatment_sessions_therapy_type_id ON treatment_sessions(therapy_type_id);
CREATE INDEX idx_treatment_sessions_therapist_id ON treatment_sessions(therapist_id);
CREATE INDEX idx_treatment_sessions_scheduled_date ON treatment_sessions(scheduled_date);
CREATE INDEX idx_treatment_sessions_status ON treatment_sessions(status);
CREATE INDEX idx_treatment_sessions_created_by ON treatment_sessions(created_by);
CREATE INDEX idx_treatment_sessions_deleted_at ON treatment_sessions(deleted_at);

-- session_materials
CREATE INDEX idx_session_materials_session_id ON session_materials(session_id);
CREATE INDEX idx_session_materials_medicine_id ON session_materials(medicine_id);

-- =============================================================================
-- INDEXES - IPD
-- =============================================================================

-- wards
CREATE INDEX idx_wards_name ON wards(name);
CREATE INDEX idx_wards_ward_type ON wards(ward_type);
CREATE INDEX idx_wards_is_active ON wards(is_active);
CREATE INDEX idx_wards_deleted_at ON wards(deleted_at);

-- beds
CREATE INDEX idx_beds_ward_id ON beds(ward_id);
CREATE INDEX idx_beds_bed_number ON beds(bed_number);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_is_active ON beds(is_active);
CREATE INDEX idx_beds_deleted_at ON beds(deleted_at);

-- admissions
CREATE INDEX idx_admissions_patient_id ON admissions(patient_id);
CREATE INDEX idx_admissions_admission_number ON admissions(admission_number);
CREATE INDEX idx_admissions_admission_type ON admissions(admission_type);
CREATE INDEX idx_admissions_admission_date ON admissions(admission_date);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_admissions_admitting_doctor_id ON admissions(admitting_doctor_id);
CREATE INDEX idx_admissions_bed_id ON admissions(bed_id);
CREATE INDEX idx_admissions_encounter_id ON admissions(encounter_id);
CREATE INDEX idx_admissions_discharged_by ON admissions(discharged_by);
CREATE INDEX idx_admissions_created_by ON admissions(created_by);
CREATE INDEX idx_admissions_deleted_at ON admissions(deleted_at);

-- doctor_rounds
CREATE INDEX idx_doctor_rounds_admission_id ON doctor_rounds(admission_id);
CREATE INDEX idx_doctor_rounds_doctor_id ON doctor_rounds(doctor_id);
CREATE INDEX idx_doctor_rounds_round_date ON doctor_rounds(round_date);
CREATE INDEX idx_doctor_rounds_created_by ON doctor_rounds(created_by);
CREATE INDEX idx_doctor_rounds_deleted_at ON doctor_rounds(deleted_at);

-- nursing_care_plans
CREATE INDEX idx_nursing_care_plans_admission_id ON nursing_care_plans(admission_id);
CREATE INDEX idx_nursing_care_plans_nurse_id ON nursing_care_plans(nurse_id);
CREATE INDEX idx_nursing_care_plans_shift ON nursing_care_plans(shift);
CREATE INDEX idx_nursing_care_plans_status ON nursing_care_plans(status);
CREATE INDEX idx_nursing_care_plans_created_by ON nursing_care_plans(created_by);
CREATE INDEX idx_nursing_care_plans_deleted_at ON nursing_care_plans(deleted_at);

-- treatment_orders
CREATE INDEX idx_treatment_orders_admission_id ON treatment_orders(admission_id);
CREATE INDEX idx_treatment_orders_ordered_by_id ON treatment_orders(ordered_by_id);
CREATE INDEX idx_treatment_orders_order_type ON treatment_orders(order_type);
CREATE INDEX idx_treatment_orders_status ON treatment_orders(status);
CREATE INDEX idx_treatment_orders_created_by ON treatment_orders(created_by);
CREATE INDEX idx_treatment_orders_deleted_at ON treatment_orders(deleted_at);

-- attendants
CREATE INDEX idx_attendants_admission_id ON attendants(admission_id);
CREATE INDEX idx_attendants_is_primary ON attendants(is_primary);
CREATE INDEX idx_attendants_deleted_at ON attendants(deleted_at);

-- =============================================================================
-- INDEXES - AUDIT
-- =============================================================================

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX idx_audit_log_resource_id ON audit_log(resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

---

## Seed Data

### Roles

```sql
INSERT INTO roles (id, name, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator with full system access'),
('a0000000-0000-0000-0000-000000000002', 'ADMIN', 'System Administrator'),
('a0000000-0000-0000-0000-000000000003', 'DOCTOR', 'Doctor / Vaidya'),
('a0000000-0000-0000-0000-000000000004', 'NURSE', 'Nurse / Medical Officer'),
('a0000000-0000-0000-0000-000000000005', 'RECEPTIONIST', 'Front Desk / Reception'),
('a0000000-0000-0000-0000-000000000006', 'PHARMACIST', 'Pharmacist / Pharmacy Staff'),
('a0000000-0000-0000-0000-000000000007', 'THERAPIST', 'Panchakarma Therapist'),
('a0000000-0000-0000-0000-000000000008', 'BILLING_STAFF', 'Billing & Accounts Staff'),
('a0000000-0000-0000-0000-000000000009', 'LAB_TECHNICIAN', 'Laboratory Technician'),
('a0000000-0000-0000-0000-000000000010', 'PHYSIOTHERAPIST', 'Physiotherapy Staff'),
('a0000000-0000-0000-0000-000000000011', 'WARD_INCHARGE', 'Ward In-Charge / Head Nurse'),
('a0000000-0000-0000-0000-000000000012', 'STORE_MANAGER', 'Inventory / Store Manager');
```

### Permissions

```sql
INSERT INTO permissions (id, name, module, action, description) VALUES
-- Auth & Users
('b0000000-0000-0000-0000-000000000001', 'users.view', 'AUTH', 'VIEW', 'View user list'),
('b0000000-0000-0000-0000-000000000002', 'users.create', 'AUTH', 'CREATE', 'Create new users'),
('b0000000-0000-0000-0000-000000000003', 'users.edit', 'AUTH', 'EDIT', 'Edit user details'),
('b0000000-0000-0000-0000-000000000004', 'users.delete', 'AUTH', 'DELETE', 'Delete users'),
('b0000000-0000-0000-0000-000000000005', 'roles.manage', 'AUTH', 'MANAGE', 'Manage roles and permissions'),
-- Patient
('b0000000-0000-0000-0000-000000000010', 'patients.view', 'PATIENT', 'VIEW', 'View patient records'),
('b0000000-0000-0000-0000-000000000011', 'patients.create', 'PATIENT', 'CREATE', 'Register new patients'),
('b0000000-0000-0000-0000-000000000012', 'patients.edit', 'PATIENT', 'EDIT', 'Edit patient details'),
('b0000000-0000-0000-0000-000000000013', 'patients.delete', 'PATIENT', 'DELETE', 'Delete patient records'),
-- Clinical
('b0000000-0000-0000-0000-000000000020', 'appointments.view', 'CLINICAL', 'VIEW', 'View appointments'),
('b0000000-0000-0000-0000-000000000021', 'appointments.create', 'CLINICAL', 'CREATE', 'Create appointments'),
('b0000000-0000-0000-0000-000000000022', 'appointments.edit', 'CLINICAL', 'EDIT', 'Edit appointments'),
('b0000000-0000-0000-0000-000000000023', 'encounters.view', 'CLINICAL', 'VIEW', 'View encounters'),
('b0000000-0000-0000-0000-000000000024', 'encounters.create', 'CLINICAL', 'CREATE', 'Create encounters'),
('b0000000-0000-0000-0000-000000000025', 'consultations.create', 'CLINICAL', 'CREATE', 'Create consultations'),
('b0000000-0000-0000-0000-000000000026', 'prescriptions.create', 'CLINICAL', 'CREATE', 'Create prescriptions'),
('b0000000-0000-0000-0000-000000000027', 'diagnoses.create', 'CLINICAL', 'CREATE', 'Create diagnoses'),
-- Pharmacy
('b0000000-0000-0000-0000-000000000030', 'medicines.view', 'PHARMACY', 'VIEW', 'View medicines'),
('b0000000-0000-0000-0000-000000000031', 'medicines.create', 'PHARMACY', 'CREATE', 'Add new medicines'),
('b0000000-0000-0000-0000-000000000032', 'medicines.edit', 'PHARMACY', 'EDIT', 'Edit medicine details'),
('b0000000-0000-0000-0000-000000000033', 'inventory.manage', 'PHARMACY', 'MANAGE', 'Manage inventory'),
('b0000000-0000-0000-0000-000000000034', 'prescriptions.dispense', 'PHARMACY', 'DISPENSE', 'Dispense prescriptions'),
('b0000000-0000-0000-0000-000000000035', 'purchase_orders.create', 'PHARMACY', 'CREATE', 'Create purchase orders'),
-- Billing
('b0000000-0000-0000-0000-000000000040', 'bills.view', 'BILLING', 'VIEW', 'View bills'),
('b0000000-0000-0000-0000-000000000041', 'bills.create', 'BILLING', 'CREATE', 'Create bills'),
('b0000000-0000-0000-0000-000000000042', 'payments.process', 'BILLING', 'PROCESS', 'Process payments'),
('b0000000-0000-0000-0000-000000000043', 'refunds.process', 'BILLING', 'PROCESS', 'Process refunds'),
('b0000000-0000-0000-0000-000000000044', 'discounts.manage', 'BILLING', 'MANAGE', 'Manage discount rules'),
-- Panchakarma
('b0000000-0000-0000-0000-000000000050', 'therapy_types.view', 'PANCHAKARMA', 'VIEW', 'View therapy types'),
('b0000000-0000-0000-0000-000000000051', 'treatment_plans.view', 'PANCHAKARMA', 'VIEW', 'View treatment plans'),
('b0000000-0000-0000-0000-000000000052', 'treatment_plans.create', 'PANCHAKARMA', 'CREATE', 'Create treatment plans'),
('b0000000-0000-0000-0000-000000000053', 'treatment_sessions.manage', 'PANCHAKARMA', 'MANAGE', 'Manage therapy sessions'),
-- IPD
('b0000000-0000-0000-0000-000000000060', 'admissions.view', 'IPD', 'VIEW', 'View admissions'),
('b0000000-0000-0000-0000-000000000061', 'admissions.create', 'IPD', 'CREATE', 'Create admissions'),
('b0000000-0000-0000-0000-000000000062', 'doctor_rounds.create', 'IPD', 'CREATE', 'Create doctor rounds'),
('b0000000-0000-0000-0000-000000000063', 'nursing_care.view', 'IPD', 'VIEW', 'View nursing care plans'),
('b0000000-0000-0000-0000-000000000064', 'treatment_orders.create', 'IPD', 'CREATE', 'Create treatment orders'),
('b0000000-0000-0000-0000-000000000065', 'beds.manage', 'IPD', 'MANAGE', 'Manage beds and wards'),
-- Audit
('b0000000-0000-0000-0000-000000000070', 'audit.view', 'AUDIT', 'VIEW', 'View audit logs');
```

### Departments

```sql
INSERT INTO departments (id, name, description) VALUES
('c0000000-0000-0000-0000-000000000001', 'Kayachikitsa', 'General Medicine / Internal Medicine'),
('c0000000-0000-0000-0000-000000000002', 'Shalya Tantra', 'Surgery'),
('c0000000-0000-0000-0000-000000000003', 'Shalakya Tantra', 'ENT & Ophthalmology'),
('c0000000-0000-0000-0000-000000000004', 'Kaumarabhritya', 'Pediatrics'),
('c0000000-0000-0000-0000-000000000005', 'Prasuti Tantra', 'Obstetrics & Gynecology'),
('c0000000-0000-0000-0000-000000000006', 'Agada Tantra', 'Toxicology & Forensic Medicine'),
('c0000000-0000-0000-0000-000000000007', 'Bhutavidya', 'Psychiatry & Clinical Psychology'),
('c0000000-0000-0000-0000-000000000008', 'Dravyaguna', 'Ayurvedic Pharmacology'),
('c0000000-0000-0000-0000-000000000009', 'Rasayana', 'Rejuvenation Therapy'),
('c0000000-0000-0000-0000-000000000010', 'Vajikarana', 'Reproductive Medicine'),
('c0000000-0000-0000-0000-000000000011', 'Panchakarma', 'Panchakarma & Detoxification'),
('c0000000-0000-0000-0000-000000000012', 'Physiotherapy', 'Physiotherapy & Rehabilitation'),
('c0000000-0000-0000-0000-000000000013', 'Pathology', 'Pathology & Laboratory'),
('c0000000-0000-0000-0000-000000000014', 'Radiology', 'Radiology & Diagnostic Imaging'),
('c0000000-0000-0000-0000-000000000015', 'Pharmacy', 'Pharmacy & Dispensary'),
('c0000000-0000-0000-0000-000000000016', 'Administration', 'Hospital Administration');
```

### Therapy Types

```sql
INSERT INTO therapy_types (id, name, category, sanskrit_name, duration_minutes, description, benefits, is_active, sort_order) VALUES
-- Purvakarma (Preparatory Procedures)
('d0000000-0000-0000-0000-000000000001', 'Snehana', 'PURVAKARMA', 'Snehanam', 45, 'Oleation therapy - internal and external application of medicated oils', 'Detoxifies body, lubricates tissues, prepares for deeper cleansing', TRUE, 1),
('d0000000-0000-0000-0000-000000000002', 'Swedana', 'PURVAKARMA', 'Swedanam', 30, 'Sudation/Fomentation therapy - therapeutic sweating', 'Opens pores, liquefies toxins, relieves stiffness', TRUE, 2),
('d0000000-0000-0000-0000-000000000003', 'Abhyanga', 'PURVAKARMA', 'Abhyanga', 60, 'Full body oil massage with medicated oils', 'Improves circulation, nourishes skin, calms nervous system', TRUE, 3),
('d0000000-0000-0000-0000-000000000004', 'Pizhichil', 'PURVAKARMA', 'Pizhichil', 60, 'Oil bath therapy - continuous pouring of warm medicated oil', 'Strengthens muscles, relieves joint pain, rejuvenates tissues', TRUE, 4),
('d0000000-0000-0000-0000-000000000005', 'Njavarakizhi', 'PURVAKARMA', 'Njavarakizhi', 45, 'Massage with NJavara rice bolus cooked in milk and herbal decoction', 'Nourishes muscles, improves complexion, strengthens nervous system', TRUE, 5),

-- Panchakarma (Five Cleansing Procedures)
('d0000000-0000-0000-0000-000000000010', 'Vamana', 'PANCHAKARMA', 'Vamanam', 60, 'Therapeutic emesis for Kapha disorders', 'Eliminates excess Kapha, treats respiratory and skin disorders', TRUE, 10),
('d0000000-0000-0000-0000-000000000011', 'Virechana', 'PANCHAKARMA', 'Virechanam', 45, 'Therapeutic purgation for Pitta disorders', 'Eliminates excess Pitta, treats liver and digestive disorders', TRUE, 11),
('d0000000-0000-0000-0000-000000000012', 'Basti', 'PANCHAKARMA', 'Basthi', 60, 'Medicated enema therapy - oil and decoction enemas', 'Treats Vata disorders, strengthens colon, improves immunity', TRUE, 12),
('d0000000-0000-0000-0000-000000000013', 'Nasya', 'PANCHAKARMA', 'Nasyam', 20, 'Nasal administration of medicated oils', 'Treats sinusitis, headache, neurological disorders', TRUE, 13),
('d0000000-0000-0000-0000-000000000014', 'Raktamokshana', 'PANCHAKARMA', 'Raktamokshanam', 30, 'Bloodletting therapy for blood impurities', 'Purifies blood, treats skin disorders and inflammatory conditions', TRUE, 14),

-- Uttarakarma (Post-Panchakarma)
('d0000000-0000-0000-0000-000000000020', 'Shirodhara', 'UTTARAKARMA', 'Shirodhara', 45, 'Continuous pouring of medicated oil/milk on forehead', 'Treats insomnia, anxiety, stress, and neurological conditions', TRUE, 20),
('d0000000-0000-0000-0000-000000000021', 'Karna Purna', 'UTTARAKARMA', 'Karna Purnam', 15, 'Filling ears with medicated oil', 'Treats earache, tinnitus, hearing loss', TRUE, 21),
('d0000000-0000-0000-0000-000000000022', 'Anjana', 'UTTARAKARMA', 'Anjanam', 10, 'Application of medicated collyrium to eyes', 'Improves vision, treats eye diseases', TRUE, 22),

-- External Therapies
('d0000000-0000-0000-0000-000000000030', 'Udvartana', 'EXTERNAL', 'Udvartanam', 40, 'Upward stroke massage with herbal powders', 'Reduces obesity, cellulite, and improves skin texture', TRUE, 30),
('d0000000-0000-0000-0000-000000000031', 'Lepa', 'EXTERNAL', 'Lepam', 30, 'Application of herbal paste on body', 'Treats skin disorders, inflammation, and localized pain', TRUE, 31),
('d0000000-0000-0000-0000-000000000032', 'Dhoomapana', 'EXTERNAL', 'Dhoomapanam', 10, 'Medicated smoking therapy', 'Treats respiratory disorders, Kapha imbalances', TRUE, 32),

-- Internal Therapies
('d0000000-0000-0000-0000-000000000040', 'Kashayam', 'INTERNAL', 'Kashayam', 15, 'Administration of herbal decoctions', 'Treats acute diseases, reduces inflammation', TRUE, 40),
('d0000000-0000-0000-0000-000000000041', 'Arishtam', 'INTERNAL', 'Arishtam', 10, 'Fermented herbal preparations', 'Treats chronic diseases, improves digestion', TRUE, 41),
('d0000000-0000-0000-0000-000000000042', 'Ghritam', 'INTERNAL', 'Ghritam', 10, 'Medicated ghee preparations', 'Nourishes brain, improves memory, treats Vata disorders', TRUE, 42),

-- Rejuvenation Therapies
('d0000000-0000-0000-0000-000000000050', 'Rasayana Chikitsa', 'REJUVENATION', 'Rasayanam', 30, 'Rejuvenation therapy with Rasayana herbs', 'Slows aging, boosts immunity, improves vitality', TRUE, 50),
('d0000000-0000-0000-0000-000000000051', 'Vajikarana Chikitsa', 'REJUVENATION', 'Vajikaranam', 30, 'Reproductive health rejuvenation', 'Improves reproductive health and vitality', TRUE, 51);
```

### Service Categories

```sql
INSERT INTO service_categories (id, name, description, sort_order) VALUES
('e0000000-0000-0000-0000-000000000001', 'Consultation', 'Doctor consultation fees', 1),
('e0000000-0000-0000-0000-000000000002', 'Panchakarma Therapy', 'Panchakarma and Ayurvedic therapy services', 2),
('e0000000-0000-0000-0000-000000000003', 'Diagnostic Services', 'Laboratory and diagnostic tests', 3),
('e0000000-0000-0000-0000-000000000004', 'IPD Services', 'Inpatient ward, bed, and nursing charges', 4),
('e0000000-0000-0000-0000-000000000005', 'Pharmacy', 'Medicine and pharmaceutical items', 5),
('e0000000-0000-0000-0000-000000000006', 'Pathology', 'Pathology lab tests', 6),
('e0000000-0000-0000-0000-000000000007', 'Radiology', 'X-ray, ultrasound, and imaging services', 7),
('e0000000-0000-0000-0000-000000000008', 'Physiotherapy', 'Physiotherapy and rehabilitation services', 8),
('e0000000-0000-0000-0000-000000000009', 'Procedures', 'Minor surgical and medical procedures', 9),
('e0000000-0000-0000-0000-000000000010', 'Miscellaneous', 'Other charges and services', 10);
```

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Tables** | 44 |
| **Total Foreign Keys** | ~85 |
| **Total Indexes** | ~130 |
| **UUID Primary Keys** | 43 (all except bill_counters) |
| **Soft Delete Tables** | 35 |
| **JSONB Columns** | 5 |
| **Generated Columns** | 1 (po_items.total_price) |

---

*Document Version: 12.0.0*
*Schema Version: 1.0.0*
*Database: PostgreSQL 14+*
*Last Updated: 2026-08-05*
