# AHMS — Volume 3: EMR & Referral

> **Maitri Ayurveda Hospital Management System**
> Enterprise Product Specification — Volume 3

---

## Table of Contents

1. [Consultation (EMR)](#1-consultation-emr)
2. [Diagnosis](#2-diagnosis)
3. [Ayurveda Clinical Fields](#3-ayurveda-clinical-fields)
4. [Prescription](#4-prescription)
5. [Medicine Dispensing](#5-medicine-dispensing)
6. [Referral Workflow](#6-referral-workflow)
7. [Referral Detail & Source History](#7-referral-detail--source-history)
8. [Clinical Timeline](#8-clinical-timeline)
9. [Gap Analysis](#9-gap-analysis)
10. [Acceptance Criteria](#10-acceptance-criteria)
11. [Developer Checklist](#11-developer-checklist)
12. [Future Enhancements](#12-future-enhancements)

---

# 1. Consultation (EMR)

## 1.1 Purpose

Doctor records clinical findings, examination results, treatment plan, and Ayurveda-specific assessments during a patient encounter.

## 1.2 UI Objective

Comprehensive yet efficient consultation form that captures all clinical data in a single workflow. Doctor should complete consultation in under 5 minutes.

## 1.3 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Consultation — Rajesh Kumar (AHMS-2026-000042)             │
│  Kaya Chikitsa — Dr. Priya — August 5, 2026                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋 Chief Complaints                                 │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Amlapitta - burning sensation since 2 weeks │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📜 History                                          │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Patient reports burning sensation in epigas..│    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔍 Examination                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Tongue: coated, Pulse: tikshna,             │    │   │
│  │  │ Abdomen: tenderness in epigastric region    │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🧘 Ayurveda Assessment                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │ Prakriti │ │ Vikriti  │ │  Dosha   │            │   │
│  │  │ Pitta    │ │ Pitta    │ │ Pitta    │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │   Agni   │ │   Nadi   │ │   Mala   │            │   │
│  │  │ Tikshna  │ │ Tikshna  │ │  Muta    │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │  Mutra   │ │  Jihva   │ │  Nidra   │            │   │
│  │  │  Sam     │ │  Alpa    │ │  reduced │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎯 Treatment Plan                                   │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Shodhana: Virechana recommended              │    │   │
│  │  │ Shamana: Avipattikara Churna                 │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🥗 Diet                                              │   │
│  │  Pathya: Simple warm food, khichdi, buttermilk      │   │
│  │  Apathya: Spicy, fried, fermented, caffeine         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 Diagnosis                                         │   │
│  │  [+ Add Diagnosis]                                   │   │
│  │  1. Amlapitta (PRIMARY)                              │   │
│  │  2. Amajirya (COMORBIDITY)                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Follow-up Date: [2026-09-05]                              │
│                                                             │
│  [  Save Consultation  ]  [  Create Prescription  ]        │
└─────────────────────────────────────────────────────────────┘
```

## 1.4 Layout Structure

- Page header: Patient name, UHID, department, doctor, date
- Accordion-style sections (expandable/collapsible)
- Ayurveda Assessment in grid layout
- Diagnosis as dynamic list (add/remove)
- Diet as two-column (Pathya/Apathya)
- Action buttons: Save, Create Prescription

## 1.5 UI Prompt

```
Design a premium enterprise EMR Consultation page for an Ayurvedic hospital.

Requirements:
- Clean white card with sections separated by subtle borders
- Each section has an icon + title header
- Chief Complaints: large text area, prominent placement
- History: full-width text area
- Examination: full-width text area
- Ayurveda Assessment: 3-column grid of select inputs (Prakriti, Vikriti, Dosha, Agni, Nadi, Mala, Mutra, Jihva, Nidra)
- Ashtavidha Pariksha: expandable sub-grid (8 items)
- Dashavidha Pariksha: expandable sub-grid (10 items)
- Treatment Plan: text area
- Diet: two side-by-side text areas (Pathya/Apathya)
- Diagnosis: dynamic list with add/remove buttons, each with name, type (PRIMARY/COMORBIDITY), notes
- Follow-up Date: date picker
- Save button: teal gradient
- Create Prescription button: gold accent
- Responsive: single column on mobile
- Loading state during save
```

## 1.6 Fields

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Chief Complaints | text | No | Primary reason for visit |
| 2 | History | text | No | Patient history of present illness |
| 3 | Examination | text | No | Physical examination findings |
| 4 | Clinical Notes | text | No | Additional clinical observations |
| 5 | Treatment Plan | text | No | Planned treatment approach |
| 6 | Diet Pathya | text | No | Recommended diet (Do's) |
| 7 | Diet Apathya | text | No | Restricted diet (Don'ts) |
| 8 | Ayurveda Fields | JSONB | No | Structured Ayurveda assessment |
| 9 | Follow-up Date | date | No | Next visit date |
| 10 | Diagnoses | array | No | List of diagnoses |

### Ayurveda Fields Structure

```json
{
  "prakriti": "Pitta",
  "vikriti": "Pitta",
  "dosha": "Pitta",
  "agni": "Tikshna",
  "nadi": "Tikshna",
  "mala": "Muta",
  "mutra": "Sam",
  "jihva": "Alpa",
  "nidra": "Reduced",
  "ashtavidha": {
    "darshana": "",
    "sparshana": "",
    "prashna": "",
    "shabda": "",
    "sparsa": "",
    "rasa": "",
    "gandha": "",
    "akriti": ""
  },
  "dashavidha": {
    "prakriti_avastha": "",
    "vikriti_avastha": "",
    "sara": "",
    "samhanana": "",
    "pramana": "",
    "sattmya": "",
    "vyayamashakti": "",
    "vohanashakti": ""
  }
}
```

## 1.7 Validation

| Field | Frontend | Backend |
|-------|----------|---------|
| Chief Complaints | Optional | Optional |
| History | Optional | Optional |
| Examination | Optional | Optional |
| Diagnoses | Optional | If provided: `diagnosis` required |
| Follow-up Date | Valid date | `datetime=2006-01-02` |

## 1.8 Workflow

```
Doctor opens encounter → Clicks "Consultation"
    ↓
Consultation form loads (or existing consultation for edit)
    ↓
Doctor fills Chief Complaints
    ↓
Doctor fills History
    ↓
Doctor fills Examination
    ↓
Doctor selects Ayurveda Fields (Prakriti, Vikriti, Dosha, etc.)
    ↓
Doctor enters Treatment Plan
    ↓
Doctor enters Diet Pathya/Apathya
    ↓
Doctor adds Diagnoses (1+ entries)
    ↓
Doctor sets Follow-up Date
    ↓
Clicks "Save Consultation"
    ↓
POST /api/v1/encounters/:id/consultation
    ↓
Backend creates Consultation + Diagnoses in transaction
    ↓
Encounter status auto-updates to COMPLETED
    ↓
Response 201 → Doctor proceeds to Prescription
```

## 1.9 Role Permissions

| Role | View | Create | Edit | Delete |
|------|:----:|:------:|:----:|:------:|
| Doctor | ✅ | ✅ | ✅ | — |
| Panchakarma Doctor | ✅ | ✅ | ✅ | — |
| Nurse | ✅ | — | — | — |
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Hospital Admin | ✅ | ✅ | ✅ | — |

## 1.10 API Mapping

### Create Consultation

```
POST /api/v1/encounters/:id/consultation
Permission: consultation.create

Request:
{
  "chief_complaints": "Amlapitta - burning sensation",
  "history": "Patient reports burning since 2 weeks",
  "examination": "Tongue coated, pulse tikshna",
  "clinical_notes": "Pitta aggravation observed",
  "treatment_plan": "Shodhana + Shamana",
  "diet_pathya": "Warm food, khichdi, buttermilk",
  "diet_apathya": "Spicy, fried, fermented",
  "ayurveda_fields": {
    "prakriti": "Pitta",
    "vikriti": "Pitta",
    "dosha": "Pitta",
    "agni": "Tikshna",
    "nadi": "Tikshna"
  },
  "follow_up_date": "2026-09-05",
  "diagnoses": [
    {
      "diagnosis": "Amlapitta",
      "diagnosis_type": "PRIMARY",
      "notes": ""
    },
    {
      "diagnosis": "Amajirya",
      "diagnosis_type": "COMORBIDITY",
      "notes": "Mild"
    }
  ]
}

Response 201:
{
  "success": true,
  "message": "consultation recorded",
  "data": {
    "id": "uuid",
    "encounter_id": "uuid",
    "doctor_id": "uuid",
    "doctor_name": "Dr. Priya",
    "chief_complaints": "Amlapitta - burning sensation",
    "history": "Patient reports burning since 2 weeks",
    "examination": "Tongue coated, pulse tikshna",
    "clinical_notes": "Pitta aggravation observed",
    "treatment_plan": "Shodhana + Shamana",
    "diet_pathya": "Warm food, khichdi, buttermilk",
    "diet_apathya": "Spicy, fried, fermented",
    "ayurveda_fields": { "prakriti": "Pitta", ... },
    "follow_up_date": "2026-09-05",
    "diagnoses": [
      { "id": "uuid", "diagnosis": "Amlapitta", "diagnosis_type": "PRIMARY" },
      { "id": "uuid", "diagnosis": "Amajirya", "diagnosis_type": "COMORBIDITY" }
    ],
    "created_at": "2026-08-05T10:30:00Z"
  }
}
```

### Update Consultation

```
PUT /api/v1/consultations/:id
Permission: consultation.create

Request: (same as create, partial update)
```

### Get Consultation by Encounter

```
GET /api/v1/encounters/:id/consultation
Permission: clinical.view

Response 200:
{
  "success": true,
  "data": { ... }
}
```

## 1.11 Database Mapping

```
Table: consultations

Columns:
  id              UUID        PRIMARY KEY
  encounter_id    UUID        NOT NULL → encounters.id
  doctor_id       UUID        NOT NULL → doctors.id
  chief_complaints TEXT
  history         TEXT
  examination     TEXT
  clinical_notes  TEXT
  treatment_plan  TEXT
  diet_pathya     TEXT
  diet_apathya    TEXT
  ayurveda_fields JSONB
  follow_up_date  TIMESTAMPTZ
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Table: diagnoses

Columns:
  id              UUID        PRIMARY KEY
  encounter_id    UUID        NOT NULL → encounters.id
  consultation_id UUID        → consultations.id (optional)
  diagnosis       VARCHAR(255) NOT NULL
  diagnosis_type  VARCHAR(20) DEFAULT 'PRIMARY'
  notes           TEXT
  doctor_id       UUID        NOT NULL → doctors.id
  created_at      TIMESTAMPTZ

Indexes:
  idx_diagnoses_encounter_id (encounter_id)
  idx_diagnoses_consultation_id (consultation_id)

Relations:
  consultations → belongs_to → encounters
  consultations → belongs_to → doctors
  consultations → has_many → diagnoses
  diagnoses → belongs_to → encounters
  diagnoses → belongs_to → consultations (optional)
```

---

# 2. Diagnosis

## 2.1 Purpose

Record diagnostic assessments linked to an encounter or consultation.

## 2.2 Diagnosis Types

| Type | Description | Example |
|------|-------------|---------|
| `PRIMARY` | Main diagnosis | Amlapitta, Amavata |
| `COMORBIDITY` | Co-existing condition | Amajirya, Prameha |

## 2.3 Fields

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Diagnosis | string | Yes | Diagnosis name |
| 2 | Diagnosis Type | enum | No | PRIMARY (default), COMORBIDITY |
| 3 | Notes | text | No | Additional notes |

## 2.4 Ayurveda Diagnosis Examples

| Disease | Sanskrit | Type |
|---------|----------|------|
| Hyperacidity | Amlapitta | PRIMARY |
| Rheumatoid Arthritis | Amavata | PRIMARY |
| Diabetes | Prameha | PRIMARY |
| Indigestion | Amajirya | COMORBIDITY |
| Anemia | Pandu | COMORBIDITY |
| Obesity | Sthoulya | PRIMARY |
| Irritable Bowel | Grahani | PRIMARY |
| Skin Disorders | Kustha | PRIMARY |
| Respiratory | Pratishyaya | PRIMARY |

---

# 3. Ayurveda Clinical Fields

## 3.1 Purpose

Structured capture of Ayurveda-specific clinical assessment data.

## 3.2 Field Reference

### Basic Assessment

| Field | Description | Options |
|-------|-------------|---------|
| Prakriti | Constitutional type | Vata, Pitta, Kapha, Vata-Pitta, Pitta-Kapha, Vata-Kapha, Sama |
| Vikriti | Current imbalance | Same as Prakriti |
| Dosha | Dominant dosha | Same as Prakriti |
| Agni | Digestive fire | Tikshna (sharp), Mandya (weak), Sama (balanced) |
| Nadi | Pulse quality | Tikshna, Sthira, Manda, Vata, Pitta, Kapha |
| Mala | Bowel movement | Muta (urine), Purisha (stool), Sveda (sweat) |
| Mutra | Urine characteristics | Sam (normal), Ati (excess), Alpa (less) |
| Jihva | Tongue appearance | Alpa (thin), Sthula (thick), Sam (normal) |
| Nidra | Sleep pattern | Sam (normal), Ati (excess), Alpa (reduced) |

### Ashtavidha Pariksha (8-fold Examination)

| Field | Description |
|-------|-------------|
| Darshana | Visual examination |
| Sparshana | Touch/palpation |
| Prashna | Questioning |
| Shabda | Voice/speech quality |
| Sparsa | Skin quality |
| Rasa | Taste/tongue coating |
| Gandha | Body odor |
| Akriti | Body build/appearance |

### Dashavidha Pariksha (10-fold Examination)

| Field | Description |
|-------|-------------|
| Prakriti Avastha | Constitutional state |
| Vikriti Avastha | Morbid state |
| Sara | Tissue quality |
| Samhanana | Body compactness |
| Pramana | Body measurements |
| Sattmya | Adaptability |
| Vyayamashakti | Exercise capacity |
| Vohanashakti | Carrying capacity |

## 3.3 JSONB Storage

All Ayurveda fields are stored as a single JSONB column in PostgreSQL:

```sql
ayurveda_fields JSONB DEFAULT '{}'
```

This allows:
- Flexible field additions without schema changes
- Efficient querying with JSONB operators
- Future extensibility for additional Ayurveda assessments

---

# 4. Prescription

## 4.1 Purpose

Doctor prescribes medicines with dosage, frequency, duration, and special instructions.

## 4.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Prescription — Rajesh Kumar (AHMS-2026-000042)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Notes: After food, avoid cold water                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  #  Medicine           Formulation  Dose   Freq  Qty  │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  1  Avipattikara       Churna       3g     BD    3   │ │
│  │  2  Chandanasava       Avaleha      10ml   BD    2   │ │
│  │  3  Sutshekhar Rasa    Vati         250mg  TID   1   │ │
│  │                                                      │ │
│  │  [+ Add Medicine]                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Medicine Details (per item):                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Anupana: Warm water / Lukewarm water               │   │
│  │  Route: Oral                                        │   │
│  │  Duration: 30 days                                  │   │
│  │  Instructions: Take after food                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Status: PRESCRIBED                                         │
│                                                             │
│  [  Save Prescription  ]  [  Send to Pharmacy  ]           │
└─────────────────────────────────────────────────────────────┘
```

## 4.3 Fields

### Prescription

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Notes | text | No | General instructions |
| 2 | Items | array | Yes | Min 1 medicine |
| 3 | Status | enum | Auto | PRESCRIBED → DISPENSED |

### Prescription Item

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Medicine | string | Yes | Medicine name |
| 2 | Formulation | string | No | Vati, Churna, Kwath, Taila, etc. |
| 3 | Dose | string | No | Dosage amount |
| 4 | Frequency | string | No | BD, TID, QID, SOS, etc. |
| 5 | Duration | string | No | Treatment duration |
| 6 | Quantity | int | No | Number of units |
| 7 | Anupana | string | No | Vehicle/administration medium |
| 8 | Route | string | No | Oral, topical, etc. |
| 9 | Instructions | text | No | Special instructions |

## 4.4 Ayurveda Formulations

| Formulation | Sanskrit | Description |
|-------------|----------|-------------|
| Vati/Gutika | वटी/गुटिका | Tablets/pills |
| Churna | चूर्ण | Powder |
| Kwath/Kashaya | क्वाथ/कषाय | Decoction |
| Avaleha/Lehya | अवलेह/लेय | Paste/lickable |
| Taila | तैल | Oil |
| Ghrita | घृत | Ghee |
| Asava/Arishta | असव/अरिष्ट | Fermented preparation |
| Bhasma | भस्म | Calcined preparation |
| Rasa Aushadhi | रस औषधि | Mineral preparation |

## 4.5 Prescription Status Workflow

```
PRESCRIBED → PARTIALLY_DISPENSED → DISPENSED
    ↓              ↓                    ↓
Doctor writes    Pharmacy dispenses   All items
prescription     some items           dispensed
```

## 4.6 API Mapping

### Create Prescription

```
POST /api/v1/encounters/:id/prescriptions
Permission: prescription.create

Request:
{
  "notes": "After food, avoid cold water",
  "items": [
    {
      "medicine": "Avipattikara Churna",
      "formulation": "Churna",
      "dose": "3g",
      "frequency": "BD",
      "duration": "30 days",
      "quantity": 3,
      "anupana": "Warm water",
      "route": "Oral",
      "instructions": "Take after food"
    },
    {
      "medicine": "Chandanasava",
      "formulation": "Avaleha",
      "dose": "10ml",
      "frequency": "BD",
      "duration": "20 days",
      "quantity": 2,
      "anupana": "",
      "route": "Oral"
    }
  ]
}

Response 201:
{
  "success": true,
  "message": "prescription created",
  "data": {
    "id": "uuid",
    "encounter_id": "uuid",
    "doctor_id": "uuid",
    "doctor_name": "Dr. Priya",
    "status": "PRESCRIBED",
    "notes": "After food, avoid cold water",
    "items": [
      {
        "id": "uuid",
        "medicine": "Avipattikara Churna",
        "formulation": "Churna",
        "dose": "3g",
        "frequency": "BD",
        "duration": "30 days",
        "quantity": 3,
        "anupana": "Warm water",
        "route": "Oral",
        "instructions": "Take after food",
        "dispensed_qty": 0
      }
    ],
    "created_at": "2026-08-05T10:45:00Z"
  }
}
```

### Get Prescriptions by Encounter

```
GET /api/v1/encounters/:id/prescriptions
Permission: prescription.view

Response 200:
{
  "success": true,
  "data": [...]
}
```

## 4.7 Database Mapping

```
Table: prescriptions

Columns:
  id           UUID        PRIMARY KEY
  encounter_id UUID        NOT NULL → encounters.id
  doctor_id    UUID        NOT NULL → doctors.id
  status       VARCHAR(30) DEFAULT 'PRESCRIBED'
  notes        TEXT
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ

Table: prescription_items

Columns:
  id                  UUID        PRIMARY KEY
  prescription_id     UUID        NOT NULL → prescriptions.id
  medicine            VARCHAR(200) NOT NULL
  formulation         VARCHAR(100)
  dose                VARCHAR(100)
  frequency           VARCHAR(50)
  duration            VARCHAR(50)
  quantity            INTEGER
  anupana             VARCHAR(100)
  route               VARCHAR(50)
  instructions        TEXT
  dispensed_qty       INTEGER DEFAULT 0
  created_at          TIMESTAMPTZ

Indexes:
  idx_prescriptions_encounter_id (encounter_id)
  idx_prescription_items_prescription_id (prescription_id)

Relations:
  prescriptions → belongs_to → encounters
  prescriptions → has_many → prescription_items
```

---

# 5. Medicine Dispensing

## 5.1 Purpose

Pharmacy dispenses medicines against prescriptions, updates stock, and tracks dispensing history.

## 5.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Dispense — Prescription #RX-2026-000042                    │
│  Patient: Rajesh Kumar — Dr. Priya                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Medicine           Prescribed  Dispense  Stock  Batch│ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  Avipattikara       3 units     [3] ✅    45    B001  │ │
│  │  Chandanasava       2 units     [2] ✅    23    B002  │ │
│  │  Sutshekhar Rasa    1 unit      [1] ✅    67    B003  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Total Items: 3    Total Value: ₹450.00                    │
│                                                             │
│  [  Confirm Dispensing  ]  [  Print Receipt  ]             │
└─────────────────────────────────────────────────────────────┘
```

## 5.3 Dispensing Logic

```go
func (s *service) Dispense(prescriptionID uuid.UUID, req DispenseRequest) error {
    return s.repo.db.Transaction(func(tx *gorm.DB) error {
        // Load prescription with items
        var prescription models.Prescription
        tx.Preload("Items").First(&prescription, "id = ?", prescriptionID)

        // For each dispense item:
        for _, item := range req.Items {
            // 1. Load medicine (row-locked)
            var medicine models.Medicine
            tx.Clauses(clause.Locking{Strength: "UPDATE"}).
                First(&medicine, "id = ?", item.MedicineID)

            // 2. Check stock availability
            if medicine.StockQty < float64(item.Quantity) {
                return fmt.Errorf("insufficient stock for %s", medicine.Name)
            }

            // 3. Deduct stock
            medicine.StockQty -= float64(item.Quantity)
            tx.Save(&medicine)

            // 4. Create inventory transaction
            tx.Create(&models.InventoryTransaction{
                MedicineID:   medicine.ID,
                Type:         "DISPENSE",
                Quantity:     -float64(item.Quantity),
                BalanceAfter: medicine.StockQty,
                BatchNumber:  medicine.BatchNumber,
                ReferenceID:  prescriptionID.String(),
            })

            // 5. Update prescription item dispensed_qty
            var presItem models.PrescriptionItem
            tx.First(&presItem, "id = ?", item.PrescriptionItemID)
            presItem.DispensedQty += item.Quantity
            tx.Save(&presItem)
        }

        // 6. Update prescription status
        allDispensed := checkAllItemsDispensed(prescription.Items)
        if allDispensed {
            prescription.Status = "DISPENSED"
        } else {
            prescription.Status = "PARTIALLY_DISPENSED"
        }
        tx.Save(&prescription)

        return nil
    })
}
```

## 5.4 API Mapping

### Dispense Prescription

```
POST /api/v1/prescriptions/:id/dispense
Permission: pharmacy.dispense

Request:
{
  "items": [
    {
      "prescription_item_id": "uuid",
      "quantity": 3,
      "medicine_id": "uuid"
    },
    {
      "prescription_item_id": "uuid",
      "quantity": 2,
      "medicine_id": "uuid"
    }
  ]
}

Response 200:
{
  "success": true,
  "message": "medicines dispensed",
  "data": {
    "id": "uuid",
    "status": "DISPENSED",
    "items": [
      { "id": "uuid", "medicine": "Avipattikara", "dispensed_qty": 3 }
    ]
  }
}

Error 400:
{
  "success": false,
  "error": "insufficient stock for Avipattikara Churna"
}
```

---

# 6. Referral Workflow

## 6.1 Purpose

Enable doctors to refer patients to other departments with complete clinical context transfer.

## 6.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Referrals                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ Incoming Referrals ]  [ Create Referral ]               │
│                                                             │
│  Incoming Referrals (3):                                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  REF-2026..  Patient      From          Priority Status│ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  REF-2026..  Rajesh K.    Kaya Chik.   URGENT  PENDING│ │
│  │  REF-2026..  Priya S.     Shalakya     ROUTINE PENDING│ │
│  │  REF-2026..  Amit P.      Prasuti      ROUTINE ACCEPTED│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Create Referral:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Patient: [Search...]                                │   │
│  │  Source Encounter: [Select encounter ▼]              │   │
│  │  To Department: [Select department ▼]                │   │
│  │  Preferred Doctor: [Select doctor ▼]                 │   │
│  │  Reason: [________________________________]          │   │
│  │  Clinical Notes: [____________________________]      │   │
│  │  Priority: [ROUTINE ▼]                               │   │
│  │  Recommended Treatment: [____________________]       │   │
│  │  Diagnosis: [_______________________________]        │   │
│  │                                                      │   │
│  │  [ Create Referral ]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 6.3 Referral Status Workflow

```
CREATED → RECEIVED → ACCEPTED → CONSULTATION_STARTED → COMPLETED
    │                                │
    │                                │
    ▼                                ▼
  REJECTED                        CANCELLED
```

| Status | Description | Triggered By |
|--------|-------------|-------------|
| `CREATED` | Referral created by source doctor | Source Doctor |
| `RECEIVED` | Referral seen by destination department | System/Reception |
| `ACCEPTED` | Destination doctor accepts referral | Destination Doctor |
| `CONSULTATION_STARTED` | Doctor begins consultation | Destination Doctor |
| `COMPLETED` | Referral workflow finished | Destination Doctor |
| `REJECTED` | Destination doctor rejects referral | Destination Doctor |
| `CANCELLED` | Source doctor cancels referral | Source Doctor |

## 6.4 Fields

### Create Referral

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Patient ID | uuid | Yes | FK → patients.id |
| 2 | Source Encounter ID | uuid | Yes | FK → encounters.id |
| 3 | To Department ID | uuid | Yes | FK → departments.id |
| 4 | Preferred Doctor ID | uuid | No | FK → doctors.id |
| 5 | Reason | string | Yes | Reason for referral |
| 6 | Clinical Notes | text | No | Additional clinical context |
| 7 | Priority | enum | No | ROUTINE (default), URGENT, EMERGENCY |
| 8 | Recommended Treatment | string | No | Suggested treatment approach |
| 9 | Diagnosis | string | No | Diagnosis summary |

## 6.5 Referral Number Format

```
REF-YYYY-NNNNNN

Examples:
  REF-2026-000001
  REF-2026-000042
```

Generated atomically with row locking (same pattern as UHID).

## 6.6 API Mapping

### Create Referral

```
POST /api/v1/referrals
Permission: referral.create

Request:
{
  "patient_id": "uuid",
  "source_encounter_id": "uuid",
  "to_department_id": "uuid",
  "preferred_doctor_id": "uuid",
  "reason": "Panchakarma treatment recommended",
  "clinical_notes": "Patient not responding to Shamana therapy",
  "priority": "ROUTINE",
  "recommended_treatment": "Virechana",
  "diagnosis": "Amlapitta - Pitta type"
}

Response 201:
{
  "success": true,
  "message": "referral created",
  "data": {
    "id": "uuid",
    "referral_no": "REF-2026-000001",
    "patient_id": "uuid",
    "uhid": "AHMS-2026-000042",
    "patient_name": "Rajesh Kumar",
    "from_department": "Kaya Chikitsa",
    "to_department": "Panchkarma",
    "reason": "Panchakarma treatment recommended",
    "priority": "ROUTINE",
    "status": "CREATED",
    "referred_at": "2026-08-05T11:00:00Z"
  }
}
```

### List Incoming Referrals

```
GET /api/v1/referrals/incoming
Permission: referral.view

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "referral_no": "REF-2026-000001",
      "patient_name": "Rajesh Kumar",
      "uhid": "AHMS-2026-000042",
      "from_department": "Kaya Chikitsa",
      "to_department": "Panchkarma",
      "reason": "Panchakarma treatment recommended",
      "priority": "ROUTINE",
      "status": "CREATED",
      "referred_at": "2026-08-05T11:00:00Z"
    }
  ]
}
```

### Update Referral Status

```
PATCH /api/v1/referrals/:id/status
Permission: referral.update

Request:
{
  "status": "ACCEPTED"
}
```

## 6.7 Database Mapping

```
Table: referrals

Columns:
  id                      UUID        PRIMARY KEY
  referral_no             VARCHAR(20) UNIQUE NOT NULL
  patient_id              UUID        NOT NULL → patients.id
  source_encounter_id     UUID        NOT NULL → encounters.id
  from_department_id      UUID        NOT NULL → departments.id
  to_department_id        UUID        NOT NULL → departments.id
  preferred_doctor_id     UUID        → doctors.id (optional)
  referred_by_user_id     UUID        NOT NULL → users.id
  reason                  TEXT        NOT NULL
  clinical_notes          TEXT
  priority                VARCHAR(20) DEFAULT 'ROUTINE'
  recommended_treatment   TEXT
  diagnosis               VARCHAR(255)
  status                  VARCHAR(30) DEFAULT 'CREATED'
  created_at              TIMESTAMPTZ
  updated_at              TIMESTAMPTZ

Table: referral_counters

Columns:
  year        INTEGER PRIMARY KEY
  last_number INTEGER NOT NULL DEFAULT 0

Indexes:
  UNIQUE (referral_no)
  idx_referrals_patient_id (patient_id)
  idx_referrals_source_encounter_id (source_encounter_id)
  idx_referrals_to_department_id (to_department_id)
  idx_referrals_status (status)

Relations:
  referrals → belongs_to → patients
  referrals → belongs_to → encounters (source)
  referrals → belongs_to → departments (from, to)
  referrals → belongs_to → doctors (preferred, optional)
  referrals → belongs_to → users (referred_by)
```

---

# 7. Referral Detail & Source History

## 7.1 Purpose

Receiving doctor sees the complete clinical history from the source encounter when viewing a referral.

## 7.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Referral REF-2026-000001                    [Accept] [Reject]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Patient: Rajesh Kumar (AHMS-2026-000042)                  │
│  From: Kaya Chikitsa (Dr. Priya)                           │
│  To: Panchkarma                                             │
│  Priority: URGENT 🔴                                        │
│  Status: CREATED                                            │
│                                                             │
│  Reason: Panchakarma treatment recommended                  │
│  Clinical Notes: Patient not responding to Shamana therapy  │
│  Recommended Treatment: Virechana                           │
│  Diagnosis: Amlapitta - Pitta type                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋 Source Encounter History                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  Visit Date: August 5, 2026                          │   │
│  │  Department: Kaya Chikitsa                           │   │
│  │  Doctor: Dr. Priya                                   │   │
│  │                                                      │   │
│  │  ─── Consultation ───                                │   │
│  │  Chief Complaints: Amlapitta - burning sensation     │   │
│  │  History: Burning since 2 weeks, worse after spicy   │   │
│  │  Examination: Tongue coated, pulse tikshna           │   │
│  │  Treatment Plan: Shodhana + Shamana                  │   │
│  │                                                      │   │
│  │  ─── Ayurveda Assessment ───                         │   │
│  │  Prakriti: Pitta  Vikriti: Pitta  Dosha: Pitta      │   │
│  │  Agni: Tikshna    Nadi: Tikshna                     │   │
│  │                                                      │   │
│  │  ─── Diagnosis ───                                   │   │
│  │  • Amlapitta (PRIMARY)                               │   │
│  │  • Amajirya (COMORBIDITY)                            │   │
│  │                                                      │   │
│  │  ─── Prescriptions ───                               │   │
│  │  1. Avipattikara Churna 3g BD x 30 days (Dispensed) │   │
│  │  2. Chandanasava 10ml BD x 20 days (Dispensed)      │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ Start Consultation ]  [ Transfer to Another Doctor ]     │
└─────────────────────────────────────────────────────────────┘
```

## 7.3 Source History Data

When `GET /api/v1/referrals/:id` is called, the response includes:

```json
{
  "source_encounter": {
    "encounter_id": "uuid",
    "visit_date": "2026-08-05",
    "department_name": "Kaya Chikitsa",
    "doctor_name": "Dr. Priya",
    "consultations": [
      {
        "consultation_id": "uuid",
        "chief_complaints": "Amlapitta",
        "history": "Burning since 2 weeks",
        "examination": "Tongue coated, pulse tikshna",
        "clinical_notes": "Pitta aggravation",
        "treatment_plan": "Shodhana + Shamana",
        "ayurveda_fields": { "prakriti": "Pitta", ... },
        "diagnoses": [...]
      }
    ],
    "diagnoses": [...],
    "prescriptions": [
      {
        "prescription_id": "uuid",
        "status": "DISPENSED",
        "items": [...]
      }
    ]
  }
}
```

## 7.4 Clinical Context Transfer

The receiving doctor sees:

| Data | Source | Status |
|------|--------|--------|
| Chief Complaints | Consultation | ✅ |
| History | Consultation | ✅ |
| Examination | Consultation | ✅ |
| Clinical Notes | Consultation | ✅ |
| Treatment Plan | Consultation | ✅ |
| Diet Pathya/Apathya | Consultation | ✅ |
| Ayurveda Fields | Consultation | ✅ |
| Diagnoses (encounter-level) | Encounter | ✅ |
| Diagnoses (consultation-level) | Consultation | ✅ |
| Prescriptions + Items | Prescription | ✅ |
| Dispensed Quantities | Prescription | ✅ |
| Referral Notes | Referral | ✅ |

---

# 8. Clinical Timeline

## 8.1 Purpose

Unified cross-department view of all patient encounters, consultations, diagnoses, and prescriptions.

## 8.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Timeline — Rajesh Kumar (AHMS-2026-000042)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 August 5, 2026 — Kaya Chikitsa — Dr. Priya            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Chief Complaint: Amlapitta                          │   │
│  │  Diagnosis: Hyperacidity (PRIMARY)                   │   │
│  │  Prescription: Avipattikara Churna, Chandanasava     │   │
│  │  Status: COMPLETED                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼  Referral to Panchkarma                        │
│                                                             │
│  📅 August 10, 2026 — Panchkarma — Dr. Amit               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Referral: REF-2026-000001                           │   │
│  │  Treatment: Virechana                                │   │
│  │  Sessions: 3 completed                               │   │
│  │  Status: COMPLETED                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼  Follow-up                                      │
│                                                             │
│  📅 September 5, 2026 — Kaya Chikitsa — Dr. Priya         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Chief Complaint: Follow-up Amlapitta                │   │
│  │  Diagnosis: Hyperacidity (FOLLOW_UP)                 │   │
│  │  Status: COMPLETED                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 8.3 API Mapping

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
    "gender": "MALE",
    "age": 41,
    "mobile": "9876543210",
    "encounters": [
      {
        "encounter_id": "uuid",
        "visit_date": "2026-08-05",
        "department_name": "Kaya Chikitsa",
        "doctor_name": "Dr. Priya",
        "visit_type": "NEW",
        "status": "COMPLETED",
        "referral_id": null,
        "diagnoses": [...],
        "consultations": [...],
        "prescriptions": [...]
      }
    ]
  }
}
```

---

# 9. Gap Analysis

## 9.1 Consultation

| Gap | Priority | Effort |
|-----|----------|--------|
| No save draft functionality | P2 | 1 day |
| No consultation templates | P2 | 3 days |
| No voice-to-text for notes | P3 | 1 week |
| No image attachment (tongue photo, etc.) | P3 | 3 days |
| No Ashtavidha/Dashavidha UI (stored but not rendered) | P2 | 2 days |

## 9.2 Prescription

| Gap | Priority | Effort |
|-----|----------|--------|
| No medicine autocomplete from inventory | P2 | 2 days |
| No prescription print format | P2 | 2 days |
| No prescription PDF export | P3 | 2 days |
| No prescription history per patient | P2 | 1 day |
| No drug interaction checking | P3 | 1 week |

## 9.3 Referral

| Gap | Priority | Effort |
|-----|----------|--------|
| No email/SMS notification on referral | P2 | 3 days |
| No referral print format | P3 | 2 days |
| No referral tracking dashboard | P2 | 2 days |
| No referral analytics | P3 | 2 days |
| No auto-create encounter on acceptance | P2 | 1 day |

## 9.4 Dispensing

| Gap | Priority | Effort |
|-----|----------|--------|
| No barcode scanning for medicines | P3 | 3 days |
| No batch-wise dispensing | P2 | 2 days |
| No expiry check before dispensing | P2 | 1 day |
| No dispensing receipt print | P3 | 1 day |

---

# 10. Acceptance Criteria

## 10.1 Consultation

- [ ] Doctor can create consultation with all fields
- [ ] Ayurveda fields stored as JSONB
- [ ] Multiple diagnoses supported (PRIMARY + COMORBIDITY)
- [ ] Encounter auto-completes on consultation save
- [ ] Follow-up date stored correctly
- [ ] Diet Pathya/Apathya saved

## 10.2 Prescription

- [ ] Multiple medicines per prescription
- [ ] All Ayurveda formulations supported
- [ ] Status transitions work (PRESCRIBED → DISPENSED)
- [ ] Dispensed quantity tracked per item
- [ ] Stock deducted on dispensing

## 10.3 Referral

- [ ] Referral number auto-generated
- [ ] Source encounter history included in response
- [ ] All consultations shown (not just first)
- [ ] Status workflow works correctly
- [ ] Receiving doctor sees full clinical context

## 10.4 Timeline

- [ ] All encounters shown chronologically
- [ ] Cross-department history visible
- [ ] Consultations, diagnoses, prescriptions included
- [ ] Ayurveda fields displayed
- [ ] Referral links work

---

# 11. Developer Checklist

## Backend

- [ ] Consultation CRUD works
- [ ] Diagnosis CRUD works
- [ ] Ayurveda JSONB stored correctly
- [ ] Prescription CRUD works
- [ ] Dispensing deducts stock
- [ ] Referral number generation atomic
- [ ] Source history preloaded correctly
- [ ] Timeline endpoint complete

## Frontend

- [ ] Consultation form renders all sections
- [ ] Ayurveda fields display correctly
- [ ] Prescription form works
- [ ] Referral creation works
- [ ] Referral detail shows source history
- [ ] Timeline renders correctly
- [ ] Responsive on all breakpoints

## Testing

- [ ] Consultation creation + diagnosis
- [ ] Prescription creation + items
- [ ] Dispensing stock deduction
- [ ] Referral status transitions
- [ ] Concurrent dispensing doesn't oversell

## Security

- [ ] Only authorized doctors can create consultations
- [ ] Only pharmacists can dispense
- [ ] Referral access controlled by department

---

# 12. Future Enhancements

## 12.1 EMR

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Consultation templates | P2 | 3 days |
| Voice-to-text for clinical notes | P3 | 1 week |
| Tongue photo attachment | P3 | 3 days |
| Pulse diagnosis device integration | P3 | 2 weeks |
| Clinical decision support | P3 | 2 weeks |

## 12.2 Prescription

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Medicine autocomplete | P2 | 2 days |
| Prescription print format | P2 | 2 days |
| Drug interaction checking | P3 | 1 week |
| Prescription PDF export | P3 | 2 days |
| Digital signature on prescription | P3 | 2 days |

## 12.3 Referral

| Enhancement | Priority | Effort |
|------------|----------|--------|
| SMS/email notification | P2 | 3 days |
| Referral print format | P3 | 2 days |
| Auto-create encounter on acceptance | P2 | 1 day |
| Referral analytics dashboard | P3 | 2 days |
| Multi-department referral chain | P3 | 3 days |

## 12.4 Dispensing

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Barcode scanning | P3 | 3 days |
| Batch-wise dispensing | P2 | 2 days |
| Expiry check before dispensing | P2 | 1 day |
| Dispensing receipt print | P3 | 1 day |
| Medicine alternatives suggestion | P3 | 3 days |

---

*End of Volume 3 — EMR & Referral*
