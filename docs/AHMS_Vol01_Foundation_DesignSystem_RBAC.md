# AHMS — Volume 1: Foundation, Design System & RBAC

> **Maitri Ayurveda Hospital Management System**
> Enterprise Product Specification — Volume 1

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Design System](#2-design-system)
3. [Sidebar — Role-wise Navigation](#3-sidebar--role-wise-navigation)
4. [Dashboard — Role-wise Widgets](#4-dashboard--role-wise-widgets)
5. [RBAC Matrix](#5-rbac-matrix)
6. [Department Master](#6-department-master)
7. [User Master](#7-user-master)
8. [Doctor Master](#8-doctor-master)
9. [Hospital Master](#9-hospital-master)
10. [Authentication](#10-authentication)
11. [UI Specification](#11-ui-specification)
12. [Component Reference](#12-component-reference)
13. [UX Notes](#13-ux-notes)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [Future Enhancements](#15-future-enhancements)

---

# 1. Project Architecture

## 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Admin Panel   │ Patient Portal  │   Public Website        │
│   (React SPA)   │  (React SPA)    │   (React SPA)           │
│   Port: 5173    │  Port: 5173     │   Port: 5173            │
└────────┬────────┴────────┬────────┴────────┬────────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │ HTTPS (Axios)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
├─────────────────────────────────────────────────────────────┤
│               Go + Gin (Port: 8080)                          │
│  /api/v1/*                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   Auth   │ │ Patients │ │Clinical  │ │Billing   │       │
│  │Middleware│ │ Module   │ │Modules   │ │Module    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Pharmacy  │ │Referrals │ │Dashboard │ │Audit     │       │
│  │Module    │ │Module    │ │Module    │ │Module    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└────────┬────────────────────────────────────────────────────┘
         │ GORM
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL 16 (Docker)                          │
│  Tables: users, roles, permissions, patients, doctors,      │
│  departments, appointments, encounters, consultations,       │
│  diagnoses, prescriptions, medicines, bills, referrals,      │
│  audit_logs, uhid_counters, bill_counters, referral_counters │
└─────────────────────────────────────────────────────────────┘
```

## 1.2 Request Flow

```
Browser Request
    ↓
Vite Dev Server (proxy /api/v1 → localhost:8080)
    ↓
CORS Middleware
    ↓
Security Headers Middleware
    ↓
Rate Limiting Middleware (auth endpoints)
    ↓
JWT Authentication Middleware (RequireAuth)
    ↓
Permission Middleware (RequirePermission) — DB lookup
    ↓
Handler → Service → Repository → GORM → PostgreSQL
    ↓
Response (utils.Success / utils.Fail)
    ↓
JSON Response to Client
```

## 1.3 Module Architecture Pattern

Every module follows the same 5-file pattern:

```
internal/{module}/
├── dto.go          # Request/Response structs + mapping functions
├── repository.go   # Database queries
├── service.go      # Business logic
├── handler.go      # HTTP handlers (Gin)
└── routes.go       # Route registration
```

Data flow:

```
HTTP Request
    ↓
handler.go (parse request, validate)
    ↓
service.go (business rules, orchestration)
    ↓
repository.go (database queries)
    ↓
GORM → PostgreSQL
```

---

# 2. Design System

## 2.1 Color Tokens

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0F766E` | Primary teal — buttons, links, active states, sidebar accent |
| `primaryDk` | `#0a5954` | Dark teal — button gradient ends, hover states |
| `primaryLt` | `#14B8A6` | Light teal — gradients, accents, avatar backgrounds |
| `accent` | `#C8A14D` | Gold — premium accent, section tags, dividers |
| `accentLt` | `#dbb96b` | Light gold — secondary gold gradient |

### Background & Surface

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#FAF8F2` | Ivory page background |
| `surface` | `#FFFFFF` | White surface/cards |
| `dark` | `#0F172A` | Dark slate — headings, footer bg |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text` | `#334155` | Body text |
| `textMuted` | `#64748B` | Secondary/muted text |

### Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#16A34A` | Success states, active badges |
| `warning` | `#F59E0B` | Warning states, amber badges |
| `danger` | `#DC2626` | Error states, emergency, danger buttons |
| `info` | `#3B82F6` | Information badges |

### Border

| Token | Hex | Usage |
|-------|-----|-------|
| `border` | `#E2E8F0` | Default border color |

### Chart Palette

```
['#0F766E', '#14B8A6', '#C8A14D', '#6366F1', '#F59E0B', '#EC4899']
```

### Badge Colors

| Color | Background | Text |
|-------|-----------|------|
| `green` | `bg-emerald-100` | `text-emerald-800` |
| `red` | `bg-red-100` | `text-red-700` |
| `amber` | `bg-amber-100` | `text-amber-800` |
| `blue` | `bg-blue-100` | `text-blue-700` |
| `slate` | `bg-slate-100` | `text-slate-700` |
| `purple` | `bg-purple-100` | `text-purple-700` |

## 2.2 Typography

### Font Families

| Usage | Font | Weights |
|-------|------|---------|
| Headings | Poppins | 400, 500, 600, 700, 800 |
| Body | Inter | 300, 400, 500, 600 |

### Type Scale

| Level | Class | Size | Weight | Usage |
|-------|-------|------|--------|-------|
| Page Title | `text-3xl md:text-4xl lg:text-5xl font-bold` | 30-48px | 700 | Page headers |
| Section Title | `text-2xl font-bold` | 24px | 700 | Card headers |
| Card Title | `text-lg font-bold` | 18px | 700 | Sub-sections |
| Body | `text-sm leading-relaxed` | 14px | 400 | Default text |
| Label | `text-sm font-semibold` | 14px | 600 | Form labels |
| Caption | `text-xs font-medium` | 12px | 500 | Metadata |
| Badge | `text-xs font-semibold uppercase tracking-wide` | 12px | 600 | Status badges |
| Overline | `text-xs font-semibold uppercase tracking-widest` | 12px | 600 | Section tags |

### Line Heights

| Context | Value |
|---------|-------|
| Headings | `1.2` |
| Body | `1.6` |
| Tight | `1.0` |

## 2.3 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `4px` | Tight internal padding |
| `sm` | `8px` | Small gaps |
| `md` | `16px` | Standard padding |
| `lg` | `24px` | Card padding |
| `xl` | `32px` | Section padding |
| `2xl` | `48px` | Large section padding |
| `3xl` | `64px` | Page section vertical |

### Common Patterns

| Context | Pattern |
|---------|---------|
| Container max-width | `max-w-7xl` (1280px) |
| Container padding | `px-4 sm:px-6 lg:px-8` |
| Card padding | `p-6` |
| Grid gap | `gap-6` |
| Page header margin | `mb-8` |
| Button padding | `px-5 py-2.5` (default) |
| Input padding | `px-4 py-2.5` |

## 2.4 Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `sm` | 8px | `rounded-xl` | Buttons, inputs |
| `md` | 12px | `rounded-xl` / `rounded-2xl` | Cards |
| `lg` | 20px | `rounded-2xl` | Large cards |
| `xl` | 28px | `rounded-3xl` | Premium cards |
| `full` | 9999px | `rounded-full` | Avatars, badges |

## 2.5 Elevation & Shadows

| Level | Shadow | Usage |
|-------|--------|-------|
| `sm` | `0 1px 3px rgba(15,118,110,0.08), 0 1px 2px rgba(0,0,0,0.06)` | Subtle lift |
| `md` | `0 4px 24px rgba(15,118,110,0.10), 0 2px 8px rgba(0,0,0,0.06)` | Cards |
| `lg` | `0 8px 40px rgba(15,118,110,0.14), 0 4px 16px rgba(0,0,0,0.08)` | Hover states |
| `xl` | `0 20px 60px rgba(15,118,110,0.18), 0 8px 24px rgba(0,0,0,0.10)` | Modals, drawers |
| `gold` | `0 0 30px rgba(200,161,77,0.25)` | Premium accent |

### Special Shadows

| Context | Shadow |
|---------|--------|
| Card default | `0 4px 24px rgba(15,118,110,0.06)` |
| Card hover | `0 20px 40px rgba(15,118,110,0.12)` |
| Button primary | `0 4px 20px rgba(15,118,110,0.35)` |
| Button gold | `0 4px 20px rgba(200,161,77,0.40)` |
| Button danger | `0 4px 16px rgba(220,38,38,0.35)` |
| Input focus | `0 0 0 3px rgba(15,118,110,0.12)` |
| Topbar | `0 4px 24px rgba(15,118,110,0.08)` |

## 2.6 Motion & Animation

### Framer Motion Variants

| Variant | From | To | Duration |
|---------|------|----|----------|
| `fadeUp` | `{ opacity: 0, y: 40 }` | `{ opacity: 1, y: 0 }` | 0.6s |
| `fadeIn` | `{ opacity: 0 }` | `{ opacity: 1 }` | 0.5s |
| `fadeLeft` | `{ opacity: 0, x: -40 }` | `{ opacity: 1, x: 0 }` | 0.6s |
| `fadeRight` | `{ opacity: 0, x: 40 }` | `{ opacity: 1, x: 0 }` | 0.6s |
| `scaleIn` | `{ opacity: 0, scale: 0.88 }` | `{ opacity: 1, scale: 1 }` | 0.5s |
| `cardHover` (rest) | `{ y: 0 }` | — | — |
| `cardHover` (hover) | — | `{ y: -8 }` | 0.3s |

### Stagger Configs

| Name | staggerChildren | delayChildren |
|------|-----------------|---------------|
| `staggerContainer` | 0.12s | 0.1s |
| `staggerContainerFast` | 0.07s | 0.05s |

### Timing Functions

| Name | Value |
|------|-------|
| Fast | `150ms cubic-bezier(0.4,0,0.2,1)` |
| Base | `300ms cubic-bezier(0.4,0,0.2,1)` |
| Slow | `600ms cubic-bezier(0.4,0,0.2,1)` |
| Custom | `[0.22, 1, 0.36, 1]` |

### Button Interaction

```ts
whileTap = { scale: 0.96, transition: { duration: 0.1 } }
```

### Skeleton Shimmer

```css
background: linear-gradient(90deg,
  rgba(200,161,77,0.06) 25%,
  rgba(200,161,77,0.12) 50%,
  rgba(200,161,77,0.06) 75%
);
background-size: 200% 100%;
animation: shimmer 1.8s infinite;
border-radius: 12px;
```

## 2.7 Icons

| Library | Usage |
|---------|-------|
| Lucide React | All admin panel icons |
| Inline SVGs | Public site decorative icons |
| Emoji | Department/treatment card icons |

### Standard Sizes

| Context | Size | Class |
|---------|------|-------|
| Sidebar nav | 20px | `h-5 w-5` |
| Topbar buttons | 20px | `h-5 w-5` |
| Stat card | 24px | `h-6 w-6` |
| Quick action | 20px | `h-5 w-5` |
| Small inline | 14px | `h-3.5 w-3.5` |

## 2.8 Glassmorphism

| Class | Background | Backdrop | Border |
|-------|-----------|----------|--------|
| `.glass` | `rgba(255,255,255,0.75)` | `blur(20px) saturate(180%)` | `1px solid rgba(255,255,255,0.4)` |
| `.glass-dark` | `rgba(15,23,42,0.7)` | `blur(20px) saturate(180%)` | `1px solid rgba(255,255,255,0.1)` |
| `.glass-green` | `rgba(15,118,110,0.85)` | `blur(20px) saturate(180%)` | `1px solid rgba(255,255,255,0.15)` |

---

# 3. Sidebar — Role-wise Navigation

## 3.1 Super Admin

```
┌──────────────────────────┐
│  🏥 Maitri Ayurveda      │
│     v1.0 — Phase 1       │
├──────────────────────────┤
│  OVERVIEW                │
│  ├── 📊 Dashboard        │
│                          │
│  CLINICAL                │
│  ├── 👥 Patients         │
│  ├── 📅 Appointments     │
│  ├── 🩺 Encounters       │
│  ├── ↕️  Referrals        │
│  ├── 💊 Prescriptions    │
│                          │
│  OPERATIONS              │
│  ├── 💊 Pharmacy         │
│  ├── 🧾 Billing          │
│  ├── 📈 Reports          │
│                          │
│  ADMINISTRATION          │
│  ├── 👨‍⚕️ Doctors          │
│  ├── 🏢 Departments      │
│  ├── 👤 Users            │
│  ├── 🔐 Roles            │
│  ├── 🏥 Hospital         │
│  ├── 📋 Audit Logs       │
│  ├── ⚙️  Settings         │
└──────────────────────────┘
```

## 3.2 Hospital Admin

```
┌──────────────────────────┐
│  🏥 Maitri Ayurveda      │
├──────────────────────────┤
│  OVERVIEW                │
│  ├── 📊 Dashboard        │
│                          │
│  CLINICAL                │
│  ├── 👥 Patients         │
│  ├── 📅 Appointments     │
│  ├── 🩺 Encounters       │
│  ├── ↕️  Referrals        │
│  ├── 💊 Prescriptions    │
│                          │
│  OPERATIONS              │
│  ├── 💊 Pharmacy         │
│  ├── 🧾 Billing          │
│  ├── 📈 Reports          │
│                          │
│  ADMINISTRATION          │
│  ├── 👨‍⚕️ Doctors          │
│  ├── 🏢 Departments      │
│  ├── 👤 Users            │
│  ├── 📋 Audit Logs       │
└──────────────────────────┘
```

## 3.3 Receptionist

```
┌──────────────────────────┐
│  🏥 Maitri Ayurveda      │
├──────────────────────────┤
│  OVERVIEW                │
│  ├── 📊 Dashboard        │
│                          │
│  FRONT DESK              │
│  ├── 👥 Patients         │
│  ├── 📅 Appointments     │
│  ├── 🩺 Encounters       │
│  ├── 📋 Referrals        │
│                          │
│  FINANCE                 │
│  ├── 🧾 Billing          │
└──────────────────────────┘
```

## 3.4 Doctor

```
┌──────────────────────────┐
│  🏥 Maitri Ayurveda      │
├──────────────────────────┤
│  OVERVIEW                │
│  ├── 📊 Dashboard        │
│                          │
│  CLINICAL                │
│  ├── 👥 My Patients      │
│  ├── 📅 Appointments     │
│  ├── 🩺 Encounters       │
│  ├── 💊 Prescriptions    │
│  ├── ↕️  Referrals        │
│  ├── 📋 Timeline         │
└──────────────────────────┘
```

## 3.5 Pharmacist

```
┌──────────────────────────┐
│  🏥 Maitri Ayurveda      │
├──────────────────────────┤
│  OVERVIEW                │
│  ├── 📊 Dashboard        │
│                          │
│  PHARMACY                │
│  ├── 💊 Medicines        │
│  ├── 📦 Stock            │
│  ├── 📋 Dispensing       │
│  ├── 🔍 Prescriptions    │
└──────────────────────────┘
```

## 3.6 Nurse / Ward Staff

```
┌──────────────────────────┐
│  🏥 Maitri Ayurveda      │
├──────────────────────────┤
│  OVERVIEW                │
│  ├── 📊 Dashboard        │
│                          │
│  WARD                    │
│  ├── 👥 Patients         │
│  ├── 🩺 Encounters       │
│  ├── 📋 Nursing Notes    │
│  ├── 🛏️  Bed Management   │
└──────────────────────────┘
```

## 3.7 Billing Staff

```
┌──────────────────────────┐
│  🏥 Maitri Ayurveda      │
├──────────────────────────┤
│  OVERVIEW                │
│  ├── 📊 Dashboard        │
│                          │
│  FINANCE                 │
│  ├── 🧾 Bills            │
│  ├── 💰 Payments         │
│  ├── 📊 Reports          │
└──────────────────────────┘
```

---

# 4. Dashboard — Role-wise Widgets

## 4.1 Super Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Good Morning, Dr. Sharma                    🔔  👤 SA     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 👥       │ │ 📅       │ │ 🩺       │ │ 💰       │      │
│  │ 1,234    │ │ 48       │ │ 12       │ │ ₹2.4L    │      │
│  │ Patients │ │ Today's  │ │ Active   │ │ Revenue  │      │
│  │ ↑12%     │ │ Appts    │ │ Referrals│ │ ↑8%      │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Revenue Trend          │ │  Department-wise         │   │
│  │  [Bar Chart]            │ │  [Pie Chart]             │   │
│  │  Last 7 days            │ │  Kaya, Salya, Panch...   │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Recent Registrations   │ │  Audit Alerts            │   │
│  │  • Patient AHMS-2026..  │ │  • Failed login attempts │   │
│  │  • Patient AHMS-2026..  │ │  • Permission violations  │   │
│  │  • Patient AHMS-2026..  │ │  • Data exports           │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  User Activity          │ │  System Health           │   │
│  │  • Active sessions      │ │  • API uptime            │   │
│  │  • Login/logout log     │ │  • DB connection         │   │
│  │  • Permission changes   │ │  • Redis status           │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Widgets

| Widget | Data Source | Refresh |
|--------|------------|---------|
| Total Patients | `GET /patients` count | On load |
| Today's Appointments | `GET /dashboard` | On load |
| Active Referrals | `GET /referrals/incoming` count | On load |
| Today's Revenue | `GET /dashboard` | On load |
| Revenue Chart | `GET /dashboard` | On load |
| Department Distribution | `GET /dashboard` | On load |
| Recent Registrations | `GET /patients` (recent 5) | On load |
| Audit Alerts | `GET /audit-logs` (recent 10) | On load |

## 4.2 Hospital Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Good Morning, Admin                     🔔  👤 HA         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 📅       │ │ 🩺       │ │ 🛏️       │ │ 💊       │      │
│  │ 48       │ │ 12       │ │ 85%      │ │ 3 Low    │      │
│  │ Today's  │ │ Active   │ │ Bed      │ │ Stock    │      │
│  │ Appts    │ │ IPD      │ │ Occupancy│ │ Alerts   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  OPD Flow               │ │  Pharmacy Alerts          │   │
│  │  • Waiting: 8           │ │  • Low stock items        │   │
│  │  • In Consultation: 4   │ │  • Near expiry items      │   │
│  │  • Completed: 36        │ │  • Expired items          │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Doctor Availability    │ │  Today's Billing          │   │
│  │  • Available: 15        │ │  • Collected: ₹1.2L      │   │
│  │  • On Leave: 3          │ │  • Pending: ₹0.4L        │   │
│  │  • In Surgery: 2        │ │  • Transactions: 42       │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 4.3 Doctor Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Good Morning, Dr. Priya                    🔔  👤 DR      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 📋       │ │ 🔄       │ │ ↕️       │ │ ⏰       │      │
│  │ 12       │ │ 5        │ │ 3        │ │ 2        │      │
│  │ Today's  │ │ Follow-up│ │ Pending  │ │ Urgent   │      │
│  │ Patients │ │ Patients │ │ Referrals│ │ Cases    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Patient Queue          │ │  Recent Consultations     │   │
│  │  1. Rajesh Kumar -Token#5│ │  • AHMS-2026-000042      │   │
│  │  2. Priya Singh -Token#6│ │    Kaya Chikitsa          │   │
│  │  3. Amit Patel -Token#7 │ │    Diagnosis: Amlapitta   │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────┐                                │
│  │  Referral Inbox          │                                │
│  │  • From Dr. Sharma (Salya)│                               │
│  │  • From Dr. Gupta (Panch) │                               │
│  └─────────────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

## 4.4 Receptionist Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Good Morning, Sunita                     🔔  👤 REC       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 📅       │ │ 👥       │ │ 📋       │ │ 🔢       │      │
│  │ 48       │ │ 8        │ │ 36       │ │ #5       │      │
│  │ Today's  │ │ Waiting  │ │ Completed│ │ Next     │      │
│  │ Appts    │ │ Now      │ │ Today    │ │ Token    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Waiting Queue           │ │  Quick Actions            │   │
│  │  1. Token #3 - Rajesh    │ │  [Register Patient]       │   │
│  │  2. Token #4 - Priya     │ │  [Book Appointment]       │   │
│  │  3. Token #5 - Amit      │ │  [Create Encounter]       │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

# 5. RBAC Matrix

## 5.1 Roles (13 System Roles)

| # | Role | Display Name | Description |
|---|------|-------------|-------------|
| 1 | `SUPER_ADMIN` | Super Admin | Complete system control |
| 2 | `HOSPITAL_ADMIN` | Hospital Admin | Hospital operations management |
| 3 | `RECEPTIONIST` | Receptionist | Front desk operations |
| 4 | `DOCTOR` | Doctor | Clinical consultations |
| 5 | `NURSE` | Nurse | IPD nursing care |
| 6 | `PANCHAKARMA_DOCTOR` | Panchakarma Doctor | PK treatment planning |
| 7 | `THERAPIST` | Therapist | PK session delivery |
| 8 | `PHARMACIST` | Pharmacist | Medicine dispensing |
| 9 | `BILLING_ACCOUNTS` | Billing / Accounts | Invoice & payments |
| 10 | `WARD_STAFF` | Ward Staff | Bed & ward management |
| 11 | `DIET_KITCHEN` | Diet / Kitchen Staff | Diet preparation |
| 12 | `LAB_STAFF` | Lab Staff | Investigation processing |
| 13 | `PATIENT` | Patient | Patient portal access |

## 5.2 Permissions (26 System Permissions)

| # | Permission | Module | Description |
|---|-----------|--------|-------------|
| 1 | `patient.view` | Patient | View patient records |
| 2 | `patient.create` | Patient | Register new patients |
| 3 | `patient.edit` | Patient | Edit patient data |
| 4 | `appointment.view` | Appointment | View appointments |
| 5 | `appointment.update` | Appointment | Update appointment status |
| 6 | `clinical.view` | Clinical | View clinical records |
| 7 | `consultation.create` | Consultation | Create consultation notes |
| 8 | `diagnosis.create` | Diagnosis | Record diagnoses |
| 9 | `encounter.create` | Encounter | Create OPD/IPD encounters |
| 10 | `encounter.update` | Encounter | Update encounter status |
| 11 | `prescription.create` | Prescription | Write prescriptions |
| 12 | `prescription.view` | Prescription | View prescriptions |
| 13 | `referral.create` | Referral | Create referrals |
| 14 | `referral.update` | Referral | Update referral status |
| 15 | `referral.view` | Referral | View referrals |
| 16 | `pharmacy.dispense` | Pharmacy | Dispense medicines |
| 17 | `inventory.manage` | Pharmacy | Manage medicine inventory |
| 18 | `billing.create` | Billing | Create invoices, record payments |
| 19 | `billing.view` | Billing | View invoices |
| 20 | `department.manage` | Admin | Manage departments |
| 21 | `doctor.manage` | Admin | Manage doctors |
| 22 | `user.manage` | Admin | Manage staff users |
| 23 | `role.manage` | Admin | Manage roles |
| 24 | `audit.view` | Admin | View audit logs |
| 25 | `dashboard.view` | Dashboard | View dashboards |
| 26 | `config.manage` | Admin | System configuration |

## 5.3 Permission-to-Role Matrix

### Core CRUD Permissions

| Module | Action | Super Admin | Hospital Admin | Receptionist | Doctor | Panchakarma Doctor | Nurse | Pharmacist | Billing |
|--------|--------|:-----------:|:--------------:|:------------:|:------:|:------------------:|:-----:|:----------:|:-------:|
| **Patient** | View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Create | ✅ | ✅ | ✅ | — | — | — | — | — |
| | Edit | ✅ | ✅ | ✅ | — | — | — | — | — |
| | Delete | ✅ | — | — | — | — | — | — | — |
| **Appointment** | View | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| | Update | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| **Encounter** | View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| | Create | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| | Update | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| **Consultation** | View | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | — |
| | Create | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| **Diagnosis** | Create | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| **Prescription** | View | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| | Create | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| **Referral** | View | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| | Create | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| | Update | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| **Pharmacy** | Dispense | ✅ | ✅ | — | — | — | — | ✅ | — |
| | Inventory | ✅ | ✅ | — | — | — | — | ✅ | — |
| **Billing** | View | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ |
| | Create | ✅ | ✅ | — | — | — | — | — | ✅ |
| **Department** | Manage | ✅ | ✅ | — | — | — | — | — | — |
| **Doctor** | Manage | ✅ | ✅ | — | — | — | — | — | — |
| **User** | Manage | ✅ | ✅ | — | — | — | — | — | — |
| **Role** | Manage | ✅ | — | — | — | — | — | — | — |
| **Audit** | View | ✅ | ✅ | — | — | — | — | — | — |
| **Dashboard** | View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Config** | Manage | ✅ | — | — | — | — | — | — | — |

### Extended Action Permissions

| Module | Action | Super Admin | Hospital Admin | Receptionist | Doctor | Pharmacist | Billing |
|--------|--------|:-----------:|:--------------:|:------------:|:------:|:----------:|:-------:|
| **Any** | Print | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Any** | Export | ✅ | ✅ | — | ✅ | — | ✅ |
| **Patient** | Assign | ✅ | ✅ | ✅ | — | — | — |
| **Encounter** | Close | ✅ | ✅ | — | ✅ | — | — |
| **Referral** | Refer | ✅ | ✅ | — | ✅ | — | — |
| **Pharmacy** | Dispense | ✅ | ✅ | — | — | ✅ | — |
| **Billing** | Approve | ✅ | ✅ | — | — | — | ✅ |
| **Billing** | Refund | ✅ | ✅ | — | — | — | ✅ |
| **Billing** | Close | ✅ | ✅ | — | — | — | ✅ |
| **Prescription** | Dispense | ✅ | ✅ | — | — | ✅ | — |

## 5.4 API Route → Permission Mapping

| Endpoint | Method | Permission |
|----------|--------|-----------|
| `/auth/login` | POST | None (public) |
| `/auth/refresh` | POST | None (public) |
| `/auth/logout` | POST | Any authenticated |
| `/auth/me` | GET | Any authenticated |
| `/departments` | GET | Any authenticated |
| `/departments` | POST | `department.manage` |
| `/departments/:id` | PUT | `department.manage` |
| `/departments/:id` | DELETE | `department.manage` |
| `/doctors` | GET | Any authenticated |
| `/doctors` | POST | `doctor.manage` |
| `/doctors/:id` | PUT | `doctor.manage` |
| `/doctors/:id` | DELETE | `doctor.manage` |
| `/patients` | GET | `patient.view` |
| `/patients` | POST | `patient.create` |
| `/patients/:id` | PUT | `patient.edit` |
| `/patients/:id` | DELETE | `patient.edit` |
| `/patients/:id/timeline` | GET | `clinical.view` |
| `/appointments` | GET | `appointment.view` |
| `/appointments` | POST | `patient.create` |
| `/appointments/:id/status` | PUT | `appointment.update` |
| `/encounters` | GET | `clinical.view` |
| `/encounters` | POST | `encounter.create` |
| `/encounters/:id` | GET | `clinical.view` |
| `/encounters/:id/status` | PATCH | `encounter.update` |
| `/encounters/:id/consultation` | GET | `clinical.view` |
| `/encounters/:id/consultation` | POST | `consultation.create` |
| `/consultations/:id` | PUT | `consultation.create` |
| `/encounters/:id/prescriptions` | GET | `prescription.view` |
| `/encounters/:id/prescriptions` | POST | `prescription.create` |
| `/prescriptions/:id` | GET | `prescription.view` |
| `/prescriptions/:id/status` | PATCH | `pharmacy.dispense` |
| `/referrals` | POST | `referral.create` |
| `/referrals/incoming` | GET | `referral.view` |
| `/referrals/:id` | GET | `referral.view` |
| `/referrals/:id/status` | PATCH | `referral.update` |
| `/medicines` | POST | `inventory.manage` |
| `/medicines` | GET | `inventory.manage` |
| `/medicines/:id/stock` | POST | `inventory.manage` |
| `/prescriptions/:id/dispense` | POST | `pharmacy.dispense` |
| `/bills` | POST | `billing.create` |
| `/bills` | GET | `billing.view` |
| `/bills/:id` | GET | `billing.view` |
| `/bills/:id/payments` | POST | `billing.create` |
| `/dashboard` | GET | `dashboard.view` |
| `/audit-logs` | GET | `audit.view` |
| `/search` | GET | Any authenticated |
| `/portal/login` | POST | None (public) |
| `/portal/profile` | GET | `RequireRoles("PATIENT")` |
| `/portal/appointments` | GET | `RequireRoles("PATIENT")` |
| `/portal/appointments` | POST | `RequireRoles("PATIENT")` |
| `/portal/prescriptions` | GET | `RequireRoles("PATIENT")` |
| `/portal/bills` | GET | `RequireRoles("PATIENT")` |
| `/public/appointments` | POST | None (public) |
| `/public/doctors` | GET | None (public) |

---

# 6. Department Master

## 6.1 Purpose

Centralized management of hospital departments. Each department has doctors, OPD timing, and optional IPD services. Departments are configurable by Super Admin.

## 6.2 UI Objective

Provide a clean, searchable grid of departments with quick-add capability and inline status toggle.

## 6.3 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Departments                           [+ Add Department]   │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search departments...                    Filter ▼       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ 🌿      │ │ 🔪      │ │ 💆      │ │ 👶      │         │
│  │ KAYA    │ │ SALYA   │ │ PANCH   │ │ KAUMAR  │         │
│  │ Chikitsa│ │ Tantra  │ │ karma   │ │ bhritya │         │
│  │         │ │         │ │         │ │         │         │
│  │ 12 Docs │ │ 8 Docs  │ │ 6 Docs  │ │ 4 Docs  │         │
│  │ ✅ Active│ │ ✅ Active│ │ ✅ Active│ │ ✅ Active│         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ 👁️      │ │ 🤰      │ │ 🧘      │ │ ⚖️      │         │
│  │SHALAKYA │ │PRASUTI  │ │SWASTHA  │ │ AGAD    │         │
│  │ Tantra  │ │ Tantra  │ │ vritta  │ │ Tantra  │         │
│  │         │ │         │ │         │ │         │         │
│  │ 5 Docs  │ │ 7 Docs  │ │ 3 Docs  │ │ 2 Docs  │         │
│  │ ✅ Active│ │ ✅ Active│ │ ✅ Active│ │ ✅ Active│         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
│  ┌─────────┐                                               │
│  │ 🚑      │                                               │
│  │ CAS     │                                               │
│  │ Casualty│                                               │
│  │         │                                               │
│  │ 3 Docs  │                                               │
│  │ ✅ Active│                                               │
│  └─────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## 6.4 Layout Structure

- Page header with title + action button
- Search/filter bar
- Responsive grid: 4 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Each card: icon, code, name, doctor count, status badge, edit/delete actions

## 6.5 Fields

| # | Field | Type | Required | Max Length | Default | Notes |
|---|-------|------|----------|-----------|---------|-------|
| 1 | Department Code | string | Yes | 10 | Auto-generated | Unique, e.g. `KAYA` |
| 2 | Department Name | string | Yes | 150 | — | Unique, case-insensitive |
| 3 | Display Name | string | No | 200 | Same as Name | For public display |
| 4 | Description | text | No | 1000 | — | Rich text allowed |
| 5 | Department Icon | string | No | 10 | 🌿 | Emoji or icon name |
| 6 | Department Color | string | No | 7 | `#0F766E` | Hex color code |
| 7 | HOD | select (Doctor) | No | — | — | FK → doctors.id |
| 8 | OPD Timing | string | No | 100 | — | e.g. "Mon-Sat 9AM-5PM" |
| 9 | IPD Available | boolean | No | — | false | Whether IPD is offered |
| 10 | Consultation Fee | decimal | No | 10,2 | 0 | Default fee |
| 11 | Room No. | string | No | 20 | — | Primary room |
| 12 | Floor | string | No | 20 | — | Floor location |
| 13 | Status | boolean | No | — | true | Active/Inactive |
| 14 | Display Order | int | No | — | 0 | Sort order |
| 15 | Created At | timestamp | auto | — | now | — |
| 16 | Updated At | timestamp | auto | — | now | — |

## 6.6 Validation

| Field | Frontend | Backend |
|-------|----------|---------|
| Name | Required, 2-150 chars | `binding:"required,min=2,max=150"` |
| Description | Max 1000 chars | `binding:"max=1000"` |
| Code | Required, max 10, alphanumeric | Unique in DB |
| Color | Valid hex color | Regex validation |

## 6.7 Workflow

```
Super Admin clicks "Add Department"
    ↓
Modal opens with form fields
    ↓
Fills Name, Description, Code
    ↓
Clicks "Save"
    ↓
Frontend validates (Zod schema)
    ↓
POST /api/v1/departments
    ↓
Backend validates (Gin binding)
    ↓
Repository checks name uniqueness (case-insensitive)
    ↓
If duplicate → 409 Conflict
    ↓
If unique → INSERT INTO departments
    ↓
Audit log: department.create
    ↓
Response 201 → UI refreshes list
```

## 6.8 Role Permissions

| Role | View | Create | Edit | Delete | Export | Print |
|------|:----:|:------:|:----:|:------:|:------:|:-----:|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hospital Admin | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| Doctor | ✅ | — | — | — | — | — |
| Receptionist | ✅ | — | — | — | — | — |
| Pharmacist | — | — | — | — | — | — |
| Billing | — | — | — | — | — | — |

## 6.9 API Mapping

### Create Department

```
POST /api/v1/departments
Permission: department.manage

Request:
{
  "name": "Kaya Chikitsa",
  "description": "Internal medicine department"
}

Response 201:
{
  "success": true,
  "message": "department created",
  "data": {
    "id": "uuid",
    "name": "Kaya Chikitsa",
    "description": "Internal medicine department",
    "is_active": true,
    "created_at": "2026-08-05T10:00:00Z",
    "updated_at": "2026-08-05T10:00:00Z"
  }
}

Error 409:
{
  "success": false,
  "error": "department name already exists"
}
```

### List Departments

```
GET /api/v1/departments
Permission: Any authenticated

Response 200:
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Kaya Chikitsa", "is_active": true, ... },
    ...
  ]
}
```

### Update Department

```
PUT /api/v1/departments/:id
Permission: department.manage

Request:
{
  "name": "Kaya Chikitsa",
  "description": "Updated description",
  "is_active": true
}
```

### Delete Department

```
DELETE /api/v1/departments/:id
Permission: department.manage

Response 200:
{
  "success": true,
  "message": "department deleted"
}
```

## 6.10 Database Mapping

```
Table: departments

Columns:
  id          UUID        PRIMARY KEY
  name        VARCHAR(150) UNIQUE NOT NULL
  description TEXT
  is_active   BOOLEAN     DEFAULT true
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ
  deleted_at  TIMESTAMPTZ (soft delete)

Indexes:
  PRIMARY KEY (id)
  UNIQUE (name)
  idx_departments_deleted_at (deleted_at)

Relations:
  departments ← has_many → doctors (via doctors.department_id)
  departments ← has_many → encounters (via encounters.department_id)

Cascade Rules:
  Soft delete: Setting deleted_at preserves referential integrity
  Cannot delete department if active doctors are assigned
```

## 6.11 Gap Analysis

```
Current Implementation:
  - Department model: name, description, is_active
  - Full CRUD API
  - Basic card grid UI

Gap:
  - Missing: Code, Display Name, Icon, Color, HOD, OPD Timing,
    IPD Available, Consultation Fee, Room, Floor, Display Order
  - Missing: Doctor count on cards
  - Missing: Department-specific settings

Required Backend Changes:
  - Add columns to departments table (migration)
  - Update DTO with new fields
  - Add doctor count aggregation

Required Frontend Changes:
  - Enhanced card design with icon, color, doctor count
  - Advanced form with all fields
  - Department settings panel

Priority: P2 (Should Fix)
Estimated Effort: 3-4 days
```

## 6.12 Responsive Rules

| Breakpoint | Layout |
|-----------|--------|
| Desktop (>1024px) | 4-column grid |
| Tablet (768-1024px) | 2-column grid |
| Mobile (<768px) | Single column, full-width cards |

## 6.13 UX Notes

- Department cards should have colored left border matching department color
- Icon should be prominently displayed (48px minimum)
- Quick-toggle for active/inactive without opening edit form
- Search should filter by name, code, and description
- Delete should show confirmation with warning if doctors are assigned

## 6.14 Acceptance Criteria

- [ ] Can create department with all fields
- [ ] Name uniqueness enforced (case-insensitive)
- [ ] Soft delete preserves referential integrity
- [ ] Doctor count displayed on cards
- [ ] Search filters by name, code, description
- [ ] Responsive on all breakpoints
- [ ] Audit log created on create/update/delete
- [ ] Department icon and color rendered correctly

## 6.15 Future Enhancements

- Department-level permissions (e.g., only Kaya Chikitsa doctors see their encounters)
- Department-level reports
- OPD scheduling with time slots
- Room/bed mapping for IPD departments
- Department hierarchy (unit → department → division)

---

# 7. User Master

## 7.1 Purpose

Manage hospital staff accounts (doctors, nurses, pharmacists, billing, reception, admin). Users are assigned roles that determine their system access.

## 7.2 Current Status (from existing codebase)

```
Current Implementation:
  - Users are created implicitly when a Doctor is registered
  - Super Admin is seeded on startup
  - No standalone User CRUD API exists
  - User model: id, full_name, email, mobile, password_hash, is_active, role_id

Gap:
  - No API to create non-doctor staff (receptionist, pharmacist, etc.)
  - No API to list/edit/deactivate staff users
  - No UI for user management
```

## 7.3 Required New Module

### Fields

| # | Field | Type | Required | Max Length | Notes |
|---|-------|------|----------|-----------|-------|
| 1 | Employee ID | string | Yes | 20 | Auto-generated: `EMP-YYYY-NNNN` |
| 2 | Full Name | string | Yes | 150 | |
| 3 | Email | email | Yes | 150 | Unique |
| 4 | Mobile | string | Yes | 15 | Unique |
| 5 | Password | string | Yes | — | Min 8 chars, bcrypt hashed |
| 6 | Department | select | Yes | — | FK → departments.id |
| 7 | Role | select | Yes | — | FK → roles.id |
| 8 | Designation | string | No | 100 | Job title |
| 9 | Joining Date | date | No | — | |
| 10 | Reporting Manager | select | No | — | FK → users.id |
| 11 | Photo | file/url | No | — | Profile picture |
| 12 | Digital Signature | file/url | No | — | For prescriptions/reports |
| 13 | Status | boolean | No | true | Active/Inactive |

### New API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/users` | `user.manage` | List all staff users |
| GET | `/users/:id` | `user.manage` | Get single user |
| POST | `/users` | `user.manage` | Create new staff user |
| PUT | `/users/:id` | `user.manage` | Update user |
| DELETE | `/users/:id` | `user.manage` | Deactivate user |

### New DB Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id),
  role_id UUID REFERENCES roles(id) NOT NULL,
  designation VARCHAR(100),
  joining_date DATE,
  reporting_manager_id UUID REFERENCES users(id),
  photo_url TEXT,
  signature_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

### Priority: P1 (Must Fix)
### Estimated Effort: 4-5 days

---

# 8. Doctor Master

## 8.1 Purpose

Manage doctor profiles including clinical details, availability, and consultation fees. Creating a doctor automatically creates a linked User account.

## 8.2 Current Fields

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Full Name | string | Yes | Via User model |
| 2 | Email | email | Yes | Via User model |
| 3 | Mobile | string | Yes | Via User model |
| 4 | Password | string | Yes | Via User model |
| 5 | Department | select | Yes | FK → departments.id |
| 6 | Specialization | string | Yes | Clinical specialty |
| 7 | Qualification | string | No | Degree/certification |
| 8 | Experience Years | int | No | Years of practice |
| 9 | Consultation Fee | decimal | No | Fee per visit |
| 10 | Status | boolean | No | Active/Inactive |

## 8.3 Gap Analysis — Missing Fields

| # | Field | Type | Notes |
|---|-------|------|-------|
| 11 | Photo | file/url | Profile picture |
| 12 | Digital Signature | file/url | For prescriptions |
| 13 | Registration Number | string | Medical registration |
| 14 | Medical Council | string | State/National council |
| 15 | Languages | string[] | Languages spoken |
| 16 | Available Days | string[] | Mon-Sat |
| 17 | Available Time | string | 9AM-5PM |
| 18 | Biography | text | About the doctor |
| 19 | Research Publications | text[] | Papers, articles |
| 20 | Awards | text[] | Recognition |

## 8.4 Required Backend Changes

- Add new columns to doctors table (migration)
- Update CreateDoctorRequest/UpdateDoctorRequest DTOs
- Add file upload endpoint for photo/signature
- Update DoctorResponse to include new fields

## 8.5 Required Frontend Changes

- Enhanced doctor card with photo
- Advanced doctor form with all fields
- Photo upload with preview
- Availability schedule picker

## 8.6 Priority: P2 (Should Fix)
## Estimated Effort: 3-4 days

---

# 9. Hospital Master

## 9.1 Purpose

Hospital identity and configuration. This is a singleton record containing the hospital's branding, legal, and operational details.

## 9.2 Current Status

```
Current Implementation:
  - No Hospital model exists
  - Hospital name hardcoded in Swagger metadata
  - UHID prefix hardcoded as "AHMS"

Gap:
  - No configurable hospital profile
  - No logo upload
  - No GST/tax configuration
  - No address/contact management
```

## 9.3 Required New Module

### Fields

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Hospital Name | string | Yes | Legal name |
| 2 | Display Name | string | No | Brand name |
| 3 | Logo | file/url | No | Hospital logo |
| 4 | Tagline | string | No | "Healing Through Nature" |
| 5 | Address Line 1 | string | Yes | Street address |
| 6 | Address Line 2 | string | No | |
| 7 | City | string | Yes | |
| 8 | State | string | Yes | |
| 9 | Pincode | string | Yes | |
| 10 | Country | string | Yes | Default: India |
| 11 | Phone | string | Yes | Main line |
| 12 | Emergency Phone | string | Yes | 24/7 helpline |
| 13 | Email | email | Yes | Official email |
| 14 | Website | url | No | |
| 15 | GST Number | string | No | For billing |
| 16 | PAN Number | string | No | |
| 17 | Registration Number | string | Yes | Hospital registration |
| 18 | NABH Accredited | boolean | No | Default: false |
| 19 | NABH Validity | date | No | |
| 20 | OPD Hours | string | No | "Mon-Sat 9AM-5PM" |
| 21 | Emergency Hours | string | No | "24/7" |
| 22 | Timezone | string | No | Default: "Asia/Kolkata" |
| 23 | Currency | string | No | Default: "INR" |
| 24 | UHID Prefix | string | No | Default: "AHMS" |
| 25 | Bill Prefix | string | No | Default: "BILL" |
| 26 | Referral Prefix | string | No | Default: "REF" |

### New API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/hospital` | Any authenticated | Get hospital profile |
| PUT | `/hospital` | `config.manage` | Update hospital profile |
| POST | `/hospital/logo` | `config.manage` | Upload hospital logo |

### New DB Table

```sql
CREATE TABLE hospital (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  display_name VARCHAR(200),
  logo_url TEXT,
  tagline VARCHAR(300),
  address_line1 VARCHAR(300),
  address_line2 VARCHAR(300),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  country VARCHAR(100) DEFAULT 'India',
  phone VARCHAR(15),
  emergency_phone VARCHAR(15),
  email VARCHAR(150),
  website VARCHAR(300),
  gst_number VARCHAR(20),
  pan_number VARCHAR(10),
  registration_number VARCHAR(50),
  nabh_accredited BOOLEAN DEFAULT false,
  nabh_validity DATE,
  opd_hours VARCHAR(100),
  emergency_hours VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  currency VARCHAR(10) DEFAULT 'INR',
  uhid_prefix VARCHAR(10) DEFAULT 'AHMS',
  bill_prefix VARCHAR(10) DEFAULT 'BILL',
  referral_prefix VARCHAR(10) DEFAULT 'REF',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Singleton constraint: only one row allowed
```

## 9.4 Priority: P1 (Must Fix)
## Estimated Effort: 3-4 days

---

# 10. Authentication

## 10.1 Purpose

Secure JWT-based authentication with access/refresh token pair, rate limiting, and token blacklisting.

## 10.2 UI Objective

Clean login page with email/password form, error handling, and redirect to dashboard.

## 10.3 Wireframe — Admin Login

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              ┌─────────────────────────┐                    │
│              │     🏥 Maitri Ayurveda  │                    │
│              │                         │                    │
│              │  Email                  │                    │
│              │  ┌───────────────────┐  │                    │
│              │  │ admin@ahms.local  │  │                    │
│              │  └───────────────────┘  │                    │
│              │                         │                    │
│              │  Password               │                    │
│              │  ┌───────────────────┐  │                    │
│              │  │ ••••••••          │  │                    │
│              │  └───────────────────┘  │                    │
│              │                         │                    │
│              │  [    Sign In    ]      │                    │
│              │                         │                    │
│              │  Patient Portal →       │                    │
│              └─────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 10.4 Wireframe — Patient Portal Login

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              ┌─────────────────────────┐                    │
│              │     Patient Portal      │                    │
│              │                         │                    │
│              │  UHID                   │                    │
│              │  ┌───────────────────┐  │                    │
│              │  │ AHMS-2026-XXXXXX  │  │                    │
│              │  └───────────────────┘  │                    │
│              │                         │                    │
│              │  Mobile Number          │                    │
│              │  ┌───────────────────┐  │                    │
│              │  │ 9999999999        │  │                    │
│              │  └───────────────────┘  │                    │
│              │                         │                    │
│              │  [    Sign In    ]      │                    │
│              │                         │                    │
│              │  ← Back to Home         │                    │
│              └─────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 10.5 Fields

### Admin Login

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| Email | email | Yes | Valid email format |
| Password | password | Yes | Min 6 chars |

### Patient Portal Login

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| UHID | string | Yes | Format: AHMS-YYYY-NNNNNN |
| Mobile | string | Yes | 10-15 digits |

## 10.6 Workflow

### Admin Login Flow

```
User enters email + password
    ↓
POST /api/v1/auth/login
    ↓
Rate limit check (10 req/min per IP)
    ↓
Find user by email (case-insensitive)
    ↓
If not found → 401 "invalid email or password"
    ↓
Compare bcrypt hash
    ↓
If mismatch → 401 "invalid email or password"
    ↓
Generate access token (60 min TTL)
    ↓
Generate refresh token (7 day TTL)
    ↓
Audit log: auth.login
    ↓
Response 200 with tokens + user info
    ↓
Frontend stores tokens in localStorage
    ↓
Redirect to /admin
```

### Token Refresh Flow

```
Access token expires (401 response)
    ↓
Frontend interceptor catches 401
    ↓
POST /api/v1/auth/refresh with refresh_token
    ↓
Validate refresh token signature + expiry
    ↓
If invalid → redirect to login
    ↓
Generate new access + refresh tokens
    ↓
Update localStorage
    ↓
Retry original request with new token
```

### Logout Flow

```
User clicks Logout
    ↓
POST /api/v1/auth/logout (with current token)
    ↓
Backend adds token to blacklist (in-memory)
    ↓
Frontend clears localStorage
    ↓
Redirect to /login
```

## 10.7 JWT Token Structure

```json
{
  "user_id": "uuid",
  "email": "user@ahms.local",
  "role_name": "DOCTOR",
  "token_type": "access",
  "exp": 1722864000,
  "iat": 1722860400
}
```

## 10.8 API Mapping

### Login

```
POST /api/v1/auth/login
Permission: None (public, rate-limited)

Request:
{
  "email": "admin@ahms.local",
  "password": "password123"
}

Response 200:
{
  "success": true,
  "message": "login successful",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in_seconds": 3600,
    "user": {
      "id": "uuid",
      "full_name": "Super Admin",
      "email": "admin@ahms.local",
      "mobile": "9999999999",
      "role_name": "SUPER_ADMIN"
    }
  }
}

Error 401:
{
  "success": false,
  "error": "invalid email or password"
}

Error 429:
{
  "success": false,
  "error": "rate limit exceeded, try again later"
}
```

### Refresh Token

```
POST /api/v1/auth/refresh
Permission: None (public, rate-limited)

Request:
{
  "refresh_token": "eyJ..."
}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in_seconds": 3600,
    "user": { ... }
  }
}
```

### Logout

```
POST /api/v1/auth/logout
Permission: Any authenticated

Response 200:
{
  "success": true,
  "message": "logged out successfully"
}
```

### Current User

```
GET /api/v1/auth/me
Permission: Any authenticated

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@ahms.local",
    "role_name": "DOCTOR"
  }
}
```

## 10.9 Database Mapping

```
Table: users (for staff)
  id UUID PRIMARY KEY
  email VARCHAR(150) UNIQUE NOT NULL
  mobile VARCHAR(15) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  is_active BOOLEAN DEFAULT true
  role_id UUID REFERENCES roles(id) NOT NULL

Table: roles
  id UUID PRIMARY KEY
  name VARCHAR(50) UNIQUE NOT NULL
  display_name VARCHAR(100)
  description TEXT

Table: permissions
  id UUID PRIMARY KEY
  name VARCHAR(100) UNIQUE NOT NULL
  description TEXT

Table: role_permissions (join table)
  role_id UUID REFERENCES roles(id)
  permission_id UUID REFERENCES permissions(id)
  PRIMARY KEY (role_id, permission_id)

Token Blacklist:
  - In-memory only (map with TTL)
  - Does not survive restart
  - Cleaned up every 5 minutes
```

## 10.10 Security Notes

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt cost 12 |
| JWT algorithm | HMAC-SHA256 |
| Access token TTL | 60 minutes |
| Refresh token TTL | 7 days |
| Rate limiting | 10 requests/minute per IP |
| Token blacklist | In-memory with TTL |
| CORS | Configurable origins |
| Security headers | X-Content-Type, X-Frame, HSTS, CSP |
| Body size limit | 10MB |

---

# 11. UI Specification

## 11.1 Responsive Breakpoints

| Name | Width | Sidebar | Content | Grid |
|------|-------|---------|---------|------|
| Mobile | < 768px | Hidden (drawer) | Full width | 1 column |
| Tablet | 768-1024px | Collapsed (72px) | Fluid | 2 columns |
| Desktop | 1024-1440px | Expanded (256px) | Max 1280px | 3-4 columns |
| Wide | > 1440px | Expanded (256px) | Max 1440px | 4 columns |

## 11.2 Admin Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    Topbar (h-16)                             │
│  [☰] [🔍 Search...              ] [🔔] [👤 Avatar] [⏻]    │
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│  Side  │               Content Area                        │
│  bar   │               (p-6)                                │
│  w-64  │                                                    │
│        │  ┌────────────────────────────────────────────┐   │
│  📊    │  │  Page Header                               │   │
│  👥    │  │  Title                          [Action]   │   │
│  📅    │  ├────────────────────────────────────────────┤   │
│  🩺    │  │                                            │   │
│  ↕️    │  │  Page Content                              │   │
│  💊    │  │                                            │   │
│  💊    │  │                                            │   │
│  🧾    │  │                                            │   │
│  📈    │  │                                            │   │
│  👨‍⚕️   │  │                                            │   │
│  🏢    │  │                                            │   │
│  👤    │  │                                            │   │
│  📋    │  └────────────────────────────────────────────┘   │
│        │                                                    │
└────────┴────────────────────────────────────────────────────┘
```

## 11.3 Component Specifications

### Button

| Variant | Background | Text | Hover | Active |
|---------|-----------|------|-------|--------|
| `primary` | Teal gradient | White | Shadow, lift | Scale 0.98 |
| `secondary` | White | Slate-700 | Border darken | Scale 0.98 |
| `danger` | Red gradient | White | Shadow, lift | Scale 0.98 |
| `ghost` | Transparent | Slate-600 | bg-slate-100 | Scale 0.98 |

Sizes: `sm` (px-4 py-2), `md` (px-5 py-2.5), `lg` (px-8 py-3)

### Card

```
rounded-2xl border border-slate-100 bg-white
shadow-sm hover:shadow-md transition-shadow duration-300
```

### Table

```
overflow-x-auto
Header: bg-slate-50, border-b border-slate-200
Body rows: divide-y divide-slate-100
Row hover: hover:bg-slate-50
```

### Input

```
w-full rounded-xl border border-slate-200 bg-slate-50/50
px-4 py-2.5 text-sm
focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10
```

### Badge

| Color | Background | Text |
|-------|-----------|------|
| green | `bg-emerald-100` | `text-emerald-800` |
| red | `bg-red-100` | `text-red-700` |
| amber | `bg-amber-100` | `text-amber-800` |
| blue | `bg-blue-100` | `text-blue-700` |

### Modal / Dialog

```
Backdrop: bg-black/50 backdrop-blur-sm
Panel: rounded-2xl bg-white shadow-xl max-w-lg
Animation: scaleIn (0.88 → 1)
```

### Drawer

```
Width: w-80 (mobile), w-96 (desktop)
Backdrop: bg-slate-900/55 backdrop-blur(4px)
Panel: slide from right
Shadow: -8px 0 40px rgba(15,118,110,0.15)
```

### Toast

```
Position: bottom-right
Variants: success (green), error (red), warning (amber), info (blue)
Animation: slideInRight
Auto-dismiss: 5 seconds
```

### Empty State

```
Centered column
Icon: 48px, bg-slate-100 rounded-2xl
Title: text-lg font-semibold
Message: text-sm text-slate-500
Optional: action button
```

### Skeleton Loading

```
Gold-tinted shimmer animation
Rounded-lg (12px)
Animate-pulse
```

---

# 12. Component Reference

## 12.1 Core Components (src/components/ui.tsx)

| Component | Props | Variants |
|-----------|-------|----------|
| Button | variant, size, disabled, loading | primary, secondary, danger, ghost |
| Input | type, placeholder, error | Standard input |
| Select | options, value, onChange | Standard select |
| Card | className, children | Standard card |
| CardHeader | title, subtitle, action | Header with optional action |
| PageHeader | title, subtitle, action | Page-level header |
| Badge | color | green, red, amber, blue, slate, purple |
| Table | headers, children | Standard table |
| EmptyState | message | Empty state display |
| Spinner | label | Loading spinner |
| Field | label, hint, children | Form field wrapper |

## 12.2 Design System Components (src/design-system/)

| Component | File | Usage |
|-----------|------|-------|
| PrimaryButton | Buttons.tsx | Gradient teal button |
| SecondaryButton | Buttons.tsx | Outline teal button |
| GoldButton | Buttons.tsx | Gold accent button |
| GlassButton | Buttons.tsx | Glassmorphism button |
| EmergencyButton | Buttons.tsx | Red pulsing button |
| DepartmentCard | Cards.tsx | Department display card |
| DoctorCard | Cards.tsx | Doctor profile card |
| StatCard | Cards.tsx | KPI statistic card |
| FloatingInput | Forms.tsx | Floating label input |
| FloatingSelect | Forms.tsx | Floating label select |
| FloatingTextarea | Forms.tsx | Floating label textarea |
| FormError | Forms.tsx | Error message display |
| FormSuccess | Forms.tsx | Success message display |
| StepIndicator | Forms.tsx | Multi-step progress |
| Section | Layout.tsx | Content section |
| SectionTitle | Layout.tsx | Section header |
| PageHero | Layout.tsx | Hero banner |
| AdminStatCard | AdminComponents.tsx | Admin KPI card |
| AdminAlertCard | AdminComponents.tsx | Alert notification |
| AdminQuickAction | AdminComponents.tsx | Quick action button |

---

# 13. UX Notes

## 13.1 Role-Specific UX Rules

| Role | UX Rule |
|------|---------|
| **Receptionist** | Maximum 3 clicks to register patient. Quick search always visible. Token queue prominent. |
| **Doctor** | Patient timeline always visible on consultation page. One-click access to previous visits. |
| **Pharmacist** | Scan-first workflow. Batch/expiry prominently displayed. Dispense button large and accessible. |
| **Billing** | Print after payment auto-triggered. Receipt generated instantly. Payment methods easy to select. |
| **Patient** | Simple language. Minimal fields. Mobile-first design. Clear status indicators. |

## 13.2 Global UX Rules

| Rule | Description |
|------|-------------|
| Loading States | Every API call shows spinner or skeleton |
| Error Handling | Every error shows actionable message |
| Confirmation | Destructive actions require confirmation |
| Keyboard | Tab order logical, Enter submits, Escape closes |
| Scroll | Preserve scroll position on back navigation |
| Search | Debounced search (300ms) |
| Pagination | 20 items per page default |
| Empty States | Every empty list shows helpful message + action |
| Toast Notifications | Success/Error toasts for all mutations |

---

# 14. Acceptance Criteria

## 14.1 Foundation

- [ ] JWT authentication works end-to-end
- [ ] Refresh token flow prevents unexpected logouts
- [ ] Logout invalidates server-side token
- [ ] Rate limiting blocks brute force attacks
- [ ] Security headers present on all responses
- [ ] CORS configured correctly

## 14.2 RBAC

- [ ] 13 roles seeded correctly
- [ ] 26 permissions seeded correctly
- [ ] Role-permission mappings correct
- [ ] Unauthorized access returns 403
- [ ] Patient portal restricted to PATIENT role only
- [ ] Permission changes take effect without token reissue

## 14.3 Design System

- [ ] All color tokens applied consistently
- [ ] Typography scale used correctly
- [ ] Shadows and elevation consistent
- [ ] Animations smooth and purposeful
- [ ] Responsive on all breakpoints
- [ ] Glassmorphism works in supported browsers

## 14.4 Department Master

- [ ] CRUD operations work end-to-end
- [ ] Name uniqueness enforced
- [ ] Soft delete preserves data integrity
- [ ] Search filters correctly
- [ ] Responsive grid displays correctly

## 14.5 Authentication

- [ ] Admin login with email/password works
- [ ] Patient portal login with UHID+mobile works
- [ ] Token refresh happens automatically
- [ ] Logout clears all local state
- [ ] Rate limiting triggers after 10 attempts

---

# 15. Future Enhancements

## 15.1 Foundation

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Redis-backed token blacklist | P2 | 2 days |
| OAuth2/SSO integration | P3 | 1 week |
| Two-factor authentication | P3 | 3 days |
| Session management dashboard | P2 | 2 days |
| API key authentication | P3 | 2 days |

## 15.2 RBAC

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Custom role creation UI | P1 | 3 days |
| Permission groups | P2 | 2 days |
| Department-level permissions | P2 | 3 days |
| Audit trail for permission changes | P2 | 1 day |
| Role templates | P3 | 2 days |

## 15.3 Design System

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Dark mode support | P2 | 1 week |
| High contrast mode | P3 | 3 days |
| RTL support | P3 | 1 week |
| Print stylesheet improvements | P2 | 2 days |
| Email template design system | P3 | 1 week |

## 15.4 Masters

| Enhancement | Priority | Effort |
|------------|----------|--------|
| Bulk import users via CSV | P2 | 2 days |
| Doctor availability calendar | P2 | 3 days |
| Department-level reports | P2 | 2 days |
| Hospital multi-location support | P3 | 1 week |
| Doctor patient limit per day | P2 | 1 day |

---

## Developer Checklist

### Backend

- [ ] All migrations run successfully
- [ ] Seeds execute without duplicates
- [ ] All API endpoints respond correctly
- [ ] Permission checks enforced on all routes
- [ ] Audit logs created for mutations
- [ ] Error responses follow standard format
- [ ] Rate limiting active on auth endpoints

### Frontend

- [ ] All pages render without errors
- [ ] API calls use correct endpoints
- [ ] Auth interceptor handles 401 with refresh
- [ ] Portal logout calls server endpoint
- [ ] Responsive on mobile/tablet/desktop
- [ ] Loading states shown during API calls
- [ ] Error messages displayed to users

### Testing

- [ ] Unit tests for auth service
- [ ] Unit tests for patient service
- [ ] Integration tests for login flow
- [ ] RBAC tests for each role
- [ ] API contract tests

### Security

- [ ] No secrets in code
- [ ] bcrypt cost >= 12
- [ ] JWT secret >= 32 chars
- [ ] CORS configured for production
- [ ] Rate limiting active
- [ ] Security headers present
- [ ] Input validation on all endpoints

### Performance

- [ ] Database queries optimized (no N+1)
- [ ] Pagination on all list endpoints
- [ ] Indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] Response compression enabled

---

*End of Volume 1 — Foundation, Design System & RBAC*
