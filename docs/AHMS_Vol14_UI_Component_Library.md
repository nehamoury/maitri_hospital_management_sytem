# AHMS Volume 14 — UI Component Library

**Reusable UI Component Library for the Ayurvedic Hospital Management System**

---

## 1. Introduction

This volume documents **every reusable UI component** in the AHMS frontend, including full props interfaces and usage examples. It is the single source of truth for the enterprise component library.

### Technology Stack

- **React 19** — UI library (concurrent features, actions, `use` hook)
- **TypeScript 6** — strict type safety, explicit `Props` interfaces
- **Tailwind CSS 4** — utility-first styling, CSS-first configuration
- **Framer Motion 12** — animation primitives (`motion`, `AnimatePresence`)
- **Lucide React** — icon set (`import { PawPrint } from "lucide-react"`)

### Design Tokens (from Volumes 1 & 11)

| Token | Value | Usage |
|-------|-------|-------|
| Primary (Teal) | `#0F766E` | Primary actions, active states, links |
| Accent (Gold) | `#C8A14D` | Highlights, prices, ratings, emphasis |
| Background (Ivory) | `#FAF8F2` | Page background, surfaces |
| Text Primary | `#1F2937` | Body/heading text |
| Danger | `#DC2626` | Errors, destructive actions |
| Success | `#059669` | Success states |

### Conventions Applied Throughout

- Every component is **typed** with a `Props` interface.
- Components are **stateless / presentational** (see Section 7).
- Classes use numbered Tailwind palette shades derived from tokens.
- Icons come exclusively from Lucide React.

---

## 2. Component Groups

Each component below follows this documented format:

```
### ComponentName

**Purpose:** <what it does>
**Props:** (table)
**Variants:** (if any)
**States:** Loading / Empty / Error (if applicable)
**Usage Example:**
**Accessibility:**
```

---

# LAYOUT COMPONENTS

### Navbar

**Purpose:** Primary header with logo, navigation links, call-to-action button, and a mobile responsive menu.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `logo` | `ReactNode` | No | — | Logo element/brand mark |
| `links` | `NavItem[]` | Yes | — | Navigation links (`label`, `href`, `active`) |
| `cta` | `{ label: string; onClick: () => void }` | No | — | Call-to-action button |
| `user` | `{ name: string; role: string }` | No | — | Logged-in user info |
| `onMenuToggle` | `() => void` | No | — | Emits mobile menu open event |

**Variants:** `fixed` (sticky), `transparent` (over content).

**Accessibility:** `role="navigation"`, `aria-label`, keyboard toggling of mobile menu with Escape to close.

```tsx
<Navbar
  logo={<img src="/logo.svg" alt="AHMS" />}
  links={[
    { label: "Dashboard", href: "/", active: true },
    { label: "Patients", href: "/patients" },
  ]}
  cta={{ label: "Book Appointment", onClick: () => router.push("/book") }}
  user={{ name: "Dr. Sharma", role: "Practitioner" }}
/>
```

---

### Topbar

**Purpose:** Secondary bar showing the current page title, breadcrumbs, notifications, and user menu.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Current page title |
| `breadcrumbs` | `Crumb[]` | No | `[]` | Path navigation items |
| `notifications` | `number` | No | `0` | Unread notification count |
| `user` | `UserSummary` | Yes | — | User avatar + name |
| `onNotificationClick` | `() => void` | No | — | Notification panel trigger |

**Variants:** Fixed at top, collapsible on scroll.

**Accessibility:** `<header>` landmark, `aria-live` for notification count updates.

```tsx
<Topbar
  title="OPD Queue"
  breadcrumbs={[
    { label: "Home", href: "/" },
    { label: "OPD", href: "/opd" },
  ]}
  notifications={3}
  user={{ name: "Dr. Sharma", initials: "DS" }}
/>
```

---

### Sidebar

**Purpose:** Collapsible vertical navigation with icons, labels, and badge counts.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `SidebarItem[]` | Yes | — | `{ label, icon, href, badge?, active? }` |
| `collapsed` | `boolean` | No | `false` | Toggle icon-only mode |
| `onToggle` | `() => void` | No | — | Collapse toggle handler |
| `footer` | `ReactNode` | No | — | Bottom section (logout, help) |

**Variants:** Light (ivory) and Dark (teal) themes.

**Accessibility:** `role="navigation"`, `aria-current="page"` on active item, `aria-expanded` for collapse state.

```tsx
<Sidebar
  collapsed={collapsed}
  items={[
    { label: "Dashboard", icon: <Home />, href: "/", active: true },
    { label: "OPD", icon: <Stethoscope />, href: "/opd", badge: 12 },
  ]}
  onToggle={setCollapsed}
/>
```

---

### BottomNav

**Purpose:** Mobile-only bottom navigation bar with icon tabs.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `NavItem[]` | Yes | — | Items with `label`, `icon`, `href` |
| `activePath` | `string` | Yes | — | Current route to highlight |

**States:** Renders on small screens only (`md:hidden`).

**Accessibility:** `role="navigation"`, `aria-current="page"` on active, safe-area inset padding.

```tsx
<BottomNav
  activePath="/opd"
  items={[
    { label: "Home", icon: <Home />, href: "/" },
    { label: "Queue", icon: <List />, href: "/opd" },
    { label: "Profile", icon: <User />, href: "/profile" },
  ]}
/>
```

---

### Footer

**Purpose:** Page footer with quick links and copyright.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `links` | `FooterColumn[]` | No | `[]` | Grouped link columns |
| `copyright` | `string` | Yes | — | Copyright text |
| `logo` | `ReactNode` | No | — | Brand mark |

**Accessibility:** `<footer>` landmark, descriptive `aria-label` on link groups.

```tsx
<Footer
  copyright="© 2026 AHMS. All rights reserved."
  links={[
    { title: "Resources", items: [{ label: "Help", href: "/help" }] },
  ]}
/>
```

---

### PageHeader

**Purpose:** Standard page heading with title, subtitle, and right-aligned action buttons.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Main heading |
| `subtitle` | `string` | No | — | Supporting description |
| `actions` | `ReactNode` | No | — | Action buttons area |

**Variants:** `default`, `compact` (reduces spacing).

**Accessibility:** Heading uses `<h1>`; of landmark value for page structure.

```tsx
<PageHeader
  title="Patient Registry"
  subtitle="Manage all registered patients"
  actions={<Button>Add Patient</Button>}
/>
```

---

### Breadcrumbs

**Purpose:** Hierarchical path navigation showing the user's location in the app.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `Crumb[]` | Yes | — | `{ label, href? }` — last is `aria-current="page"` |
| `separator` | `ReactNode` | No | `/` | Separator icon character |

**Accessibility:** `role="navigation"` with `aria-label="Breadcrumb"`, `aria-current="page"` on active node.

```tsx
<Breadcrumbs
  items={[
    { label: "Home", href: "/" },
    { label: "Pharmacy", href: "/pharmacy" },
    { label: "Inventory" },
  ]}
/>
```

---

### Tabs

**Purpose:** Tabbed navigation to switch between related views.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tabs` | `{ id: string; label: string; icon?: ReactNode }[]` | Yes | — | Tab definitions |
| `activeId` | `string` | Yes | — | Currently active tab |
| `onChange` | `(id: string) => void` | Yes | — | Tab change handler |

**Variants:** `underline`, `pills`, `fullWidth`.

**Accessibility:** `role="tablist"`, each tab `role="tab"` with `aria-selected`, arrow-key navigation.

```tsx
<Tabs
  activeId="doctors"
  onChange={setTab}
  tabs={[
    { id: "doctors", label: "Doctors" },
    { id: "reception", label: "Reception" },
  ]}
/>
```

---

### Drawer

**Purpose:** Slide-in panel typically anchored left or right, with header, content, and footer sections.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | Yes | — | Visibility state |
| `onClose` | `() => void` | Yes | — | Close handler |
| `title` | `string` | Yes | — | Drawer header title |
| `content` | `ReactNode` | Yes | — | Main content |
| `footer` | `ReactNode` | No | — | Sticky footer |
| `anchor` | `"left" \| "right"` | No | `"right"` | Slide direction |
| `width` | `string` | No | `"w-96"` | Tailwind width class |

**Accessibility:** `role="dialog"`, `aria-modal="true"`, focus trapped, Escape closes, click-scrim closes.

```tsx
<Drawer
  open={open}
  onClose={() => setOpen(false)}
  title="Add Medicine"
  content={<MedicineForm />}
  footer={<Button variant="primary">Save</Button>}
  anchor="right"
/>
```

---

# DATA DISPLAY COMPONENTS

### Card

**Purpose:** Basic surface container with optional title, content, and action area.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | — | Card heading |
| `subtitle` | `string` | No | — | Card sub-heading |
| `children` | `ReactNode` | Yes | — | Body content |
| `actions` | `ReactNode` | No | — | Header actions (menu, buttons) |
| `padded` | `boolean` | No | `true` | Padding switch |
| `className` | `string` | No | — | Extra classes |

**Variants:** `default`, `hoverable`, `interactive` (clickable card).

**Accessibility:** Grouping via `<section>` with heading role.

```tsx
<Card title="OPD Summary" subtitle="Today" actions={<MoreVertical />}>
  <p>42 patients seen today.</p>
</Card>
```

---

### DataTable

**Purpose:** Feature-rich tabular display with sorting, filtering, pagination, and per-row actions.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `Column<T>[]` | Yes | — | Column config (`key`, `header`, `sortable?`, `render`) |
| `data` | `T[]` | Yes | — | Row data |
| `loading` | `boolean` | No | `false` | Show skeleton rows |
| `sort` | `{ key: string; dir: "asc" \| "desc" }` | No | — | Controlled sort |
| `onSort` | `(key: string) => void` | No | — | Sort toggle |
| `filter` | `string` | No | — | Global filter text |
| `page` | `number` | No | `1` | Current page |
| `pageSize` | `number` | No | `10` | Rows per page |
| `total` | `number` | Yes | — | Total row count |
| `onPageChange` | `(p: number) => void` | No | — | Pagination handler |
| `rowActions` | `(row: T) => ReactNode` | No | — | Per-row action cell |
| `renderRowActions` | `(row: T) => ReactNode` | No | — | Row action renderer |

**Variants:** `striped`, `bordered`, `dense`.

**States:** Loading (skeleton rows), Empty (EmptyState), Error (inline error).

**Accessibility:** Semantic `<table>` with `<th scope>`, `aria-sort` on sortable headers, keyboard sortable.

```tsx
<DataTable
  columns={[
    { key: "name", header: "Name", sortable: true },
    { key: "uhid", header: "UHID" },
  ]}
  data={patients}
  loading={isLoading}
  total={total}
  page={page}
  pageSize={10}
  onPageChange={setPage}
  onSort={handleSort}
/>
```

---

### TableRow

**Purpose:** A single sortable and selectable row inside a table.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `T` | Yes | — | Row record |
| `selected` | `boolean` | No | `false` | Highlight selection |
| `onSelect` | `(data: T, checked: boolean) => void` | No | — | Selection toggiter |
| `hasCheckbox` | `boolean` | No | `false` | Show checkbox column |
| `onClick` | `() => void` | No | — | Row click |
| `render` | `Record<string, (row: T) => ReactNode>` | Yes | — | Cell renderers by key |

**Accessibility:** `role="row"`, `aria-selected` when selected, checkbox keyboard-accessible.

```tsx
<TableRow
  data={patient}
  hasCheckbox
  selected={selectedIds.has(patient.id)}
  onSelect={handleSelect}
  render={{ name: (p) => <strong>{p.name}</strong> }}
/>
```

---

### Pagination

**Purpose:** Page number navigator with previous/next controls.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `page` | `number` | Yes | — | Current page (1-based) |
| `pageCount` | `number` | Yes | — | Total pages |
| `onChange` | `(page: number) => void` | Yes | — | Page change handler |
| `siblings` | `number` | No | `1` | Pages shown around current |

**Accessibility:** `role="navigation"` with `aria-label="Pagination"`, `aria-current="page"`, arrow-key/Enter support, ellipsis placeholder.

```tsx
<Pagination page={page} pageCount={10} onChange={setPage} />
```

---

### EmptyState

**Purpose:** Illustrative placeholder shown when no data is available.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `icon` | `ReactNode` | No | — | Lucide icon |
| `title` | `string` | Yes | — | Heading text |
| `description` | `string` | No | — | Supporting copy |
| `action` | `ReactNode` | No | — | Call-to-action button |

**States:** Empty condition only.

**Accessibility:** `role="status"` / `aria-live="polite"`, visually distinct from errors.

```tsx
<EmptyState
  icon={<Inbox />}
  title="No patients yet"
  description="Register your first patient to get started."
  action={<Button>Add Patient</Button>}
/>
```

---

### ErrorState

**Purpose:** Error placeholder with message and retry capability.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `message` | `string` | Yes | — | Error description |
| `title` | `string` | No | `"Something went wrong"` | Heading |
| `onRetry` | `() => void` | No | — | Retry handler |
| `error` | `unknown` | No | — | Debug error object |

**States:** Error condition only.

**Accessibility:** `role="alert"`, `aria-live="assertive"` for immediate announcement.

```tsx
<ErrorState
  message="We couldn't load the patient list."
  onRetry={() => refetch()}
/>
```

---

### LoadingSkeleton

**Purpose:** Pulse-animated placeholder block that mimics content layout while loading.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `rows` | `number` | No | `1` | Number of skeleton lines |
| `height` | `string` | No | `"h-4"` | Tailwind height class |
| `width` | `string` | No | `"w-full"` | Tailwind width class |
| `className` | `string` | No | — | Extra classes |

**Variants:** `text`, `circle`, `rectangle`, `avatar`.

**States:** Loading only.

**Accessibility:** `aria-busy="true"`, `role="status"` with visually-hidden loading text.

```tsx
<LoadingSkeleton rows={4} height="h-4" />
```

---

### ProgressBar

**Purpose:** Horizontal bar representing percentage completion.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `number` | Yes | — | Percentage `0–100` |
| `color` | `string` | No | teal | Fill color (teal/gold/danger) |
| `size` | `"sm" \| "md" \| "lg"` | No | `"md"` | Bar thickness |
| `showLabel` | `boolean` | No | `false` | Display percentage text |
| `animated` | `boolean` | No | `false` | Animated fill |

**Variants:** `linear`, `circular` (wraps a circular alternative).

**Accessibility:** `role="progressbar"`, `aria-valuenow/min/max` attributes.

```tsx
<ProgressBar value={68} showLabel color="teal" animated />
```

---

### StatusBadge

**Purpose:** Small colored indicator conveying a record's status.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `status` | `string` | Yes | — | Status key |
| `label` | `string` | No | — | Override displayed text |
| `color` | `"teal" \| "gold" \| "danger" \| "success" \| "neutral"` | No | auto | Inject color scheme |

**Variants:** Solid, outline, soft (mapped by status).

**Accessibility:** Non-decorative color — pair with a text label (no color-only meaning).

```tsx
<StatusBadge status="ADMITTED" label="Admitted" color="success" />
```

---

### ChartCard

**Purpose:** Card wrapper that contains a chart with a title and legend slot.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Chart title |
| `loading` | `boolean` | No | `false` | Show skeleton instead of chart |
| `children` | `ReactNode` | Yes | — | Chart element |
| `legend` | `ReactNode` | No | — | Legend/summary slot |
| `height` | `string` | No | `"h-64"` | Container height |

**States:** Loading, Empty (no data passed to chart).

**Accessibility:** Charts get `role="img"` with descriptive `aria-label`.

```tsx
<ChartCard title="Monthly Revenue" loading={isLoading} legend={summary}>
  <RevenueChart data={revenue} />
</ChartCard>
```

---

# DOMAIN-SPECIFIC CARDS

### PatientCard

**Purpose:** Compact card summarizing key patient demographics.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Patient full name |
| `uhid` | `string` | Yes | — | Unique Health ID |
| `dob` | `string` | Yes | — | Date of birth |
| `gender` | `"Male" \| "Female" \| "Other"` | Yes | — | Gender |
| `phone` | `string` | Yes | — | Contact number |
| `avatar` | `string` | No | — | Image URL |
| `onClick` | `() => void` | No | — | Navigate to patient |

**Accessibility:** `role="button"` when clickable, tab focusable, `aria-label` includes name + UHID.

```tsx
<PatientCard
  name="Ananya Rao"
  uhid="UHID-000123"
  dob="1992-05-14"
  gender="Female"
  phone="+91 98765 43210"
  onClick={() => openPatient("000123")}
/>
```

---

### DoctorCard

**Purpose:** Profile card for a practitioner.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Doctor name |
| `specialization` | `string` | Yes | — | Specialty |
| `qualification` | `string` | No | — | Degrees |
| `rating` | `number` | No | `0` | `0–5` rating |
| `avatar` | `string` | No | — | Photo URL |
| `available` | `boolean` | No | `true` | Schedule availability |
| `onBook` | `() => void` | No | — | Book appointment |

**Accessibility:** Rating presented with `aria-label="Rated 4.5 out of 5"`.

```tsx
<DoctorCard
  name="Dr. Vaidya Krishna"
  specialization="Panchakarma"
  qualification="MD (Ayurveda)"
  rating={4.7}
  onBook={bookDoctor}
/>
```

---

### DepartmentCard

**Purpose:** Card describing a clinical department.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Department title |
| `description` | `string` | Yes | — | Short blurb |
| `doctorCount` | `number` | Yes | — | Practitioners count |
| `icon` | `ReactNode` | No | — | Department icon |
| `onClick` | `() => void` | No | — | View department |

**Accessibility:** Heading as `<h3>`, action described textually.

```tsx
<DepartmentCard
  name="Kayachikitsa"
  description="General internal medicine."
  doctorCount={8}
  icon={<Heart />}
/>
```

---

### AppointmentCard

**Purpose:** Displays an upcoming or scheduled appointment.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `date` | `string` | Yes | — | Appointment date |
| `time` | `string` | Yes | — | Start time |
| `doctor` | `string` | Yes | — | Doctor name |
| `token` | `string` | Yes | — | Queue token number |
| `status` | `AppointmentStatus` | Yes | — | e.g. `CONFIRMED` |
| `onAction` | `(action: string) => void` | No | — | Status actions |

**States:** Confirmed, Pending, Completed, Cancelled.

**Accessibility:** Date/time read via `aria-label`; token emphasized visually.

```tsx
<AppointmentCard
  date="2026-08-06"
  time="10:30"
  doctor="Dr. Sharma"
  token="A-042"
  status="CONFIRMED"
/>
```

---

### BillCard

**Purpose:** Summary card for a patient bill.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `billNo` | `string` | Yes | — | Bill reference |
| `patient` | `string` | Yes | — | Patient name |
| `amount` | `number` | Yes | — | Total amount |
| `status` | `BillStatus` | Yes | — | e.g. `PAID` / `PENDING` |
| `date` | `string` | No | — | Billing date |
| `onView` | `() => void` | No | — | View invoice |

**Accessibility:** Total read with currency context `aria-label="Total ₹ 5,000"`.

```tsx
<BillCard
  billNo="BILL-10021"
  patient="Rajesh Kumar"
  amount={5000}
  status="PAID"
/>
```

---

### PrescriptionCard

**Purpose:** Summarizes a prescription encounter.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `date` | `string` | Yes | — | Prescribed date |
| `doctor` | `string` | Yes | — | Prescriber |
| `diagnosis` | `string` | No | — | Diagnosis summary |
| `itemCount` | `number` | Yes | — | Number of line items |
| `onExpand` | `() => void` | No | — | Open details |

**Accessibility:** Details toggle `aria-expanded`.

```tsx
<PrescriptionCard
  date="2026-08-01"
  doctor="Dr. Iyer"
  diagnosis="Amavata"
  itemCount={12}
/>
```

---

### TreatmentPlanCard

**Purpose:** Card tracking a patient's active treatment plan.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `planName` | `string` | Yes | — | Plan title |
| `patient` | `string` | Yes | — | Patient name |
| `progress` | `number` | Yes | — | `0–100` completion |
| `status` | `PlanStatus` | Yes | — | e.g. `ACTIVE` |
| `onView` | `() => void` | No | — | Open plan |

**Accessibility:** Progress conveyed by `role="progressbar"`.

```tsx
<TreatmentPlanCard
  planName="Panchakarma Detox – Week 2"
  patient="Ananya Rao"
  progress={45}
  status="ACTIVE"
/>
```

---

### SessionCard

**Purpose:** Card for a therapy session (Panchakarma etc.).

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `therapy` | `string` | Yes | — | Therapy name |
| `time` | `string` | Yes | — | Session time |
| `patient` | `string` | Yes | — | Patient name |
| `therapist` | `string` | Yes | — | Therapist name |
| `status` | `SessionStatus` | Yes | — | e.g. `SCHEDULED` |
| `onStart` | `() => void` | No | — | Begin session |

**Accessibility:** Time communicated in text; status badge non-color-only.

```tsx
<SessionCard
  therapy="Abhyanga"
  time="09:00"
  patient="Mohan Das"
  therapist="Sita"
  status="SCHEDULED"
/>
```

---

### BedCard

**Purpose:** Displays a single ward bed with assignment status.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `bedNumber` | `string` | Yes | — | Bed identifier |
| `type` | `"General" \| "Deluxe" \| "ICU" \| "Panchakarma"` | Yes | — | Bed class |
| `status` | `"Occupied" \| "Available" \| "Reserved"` | Yes | — | Bed state |
| `patient` | `string` | No | — | Assigned patient |
| `onAssign` | `() => void` | No | — | Assign action |

**Accessibility:** Status conveyed via color + text label pairing.

```tsx
<BedCard
  bedNumber="W2-06"
  type="Panchakarma"
  status="Available"
  onAssign={assignBed}
/>
```

---

### MedicineCard

**Purpose:** Pharmacy inventory item card.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Medicine name |
| `category` | `string` | No | — | Drug category |
| `stock` | `number` | Yes | — | Current stock |
| `expiry` | `string` | Yes | — | Expiry date |
| `batchNo` | `string` | No | — | Batch reference |
| `onEdit` | `() => void` | No | — | Edit stock |

**States:** Low stock (danger tint), Near expiry (warning tint).

**Accessibility:** Stock/expiry flagged with text + icons, not color alone.

```tsx
<MedicineCard
  name="Triphala Churna"
  category="Herbal"
  stock={24}
  expiry="2027-03-01"
/>
```

---

### ReferralCard

**Purpose:** Records a referral between practitioners/departments.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `from` | `string` | Yes | — | Referring doctor |
| `to` | `string` | Yes | — | Referred-to doctor/dept |
| `reason` | `string` | Yes | — | Referral reason |
| `status` | `ReferralStatus` | Yes | — | e.g. `PENDING` |
| `date` | `string` | No | — | Referral date |

**Accessibility:** Directional flow labelled via `aria-label`.

```tsx
<ReferralCard
  from="Dr. Iyer"
  to="Dr. Krishna (Panchakarma)"
  reason="Chronic back pain"
  status="ACCEPTED"
/>
```

---

### NotificationCard

**Purpose:** Single notification entry with read state.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Notification heading |
| `message` | `string` | Yes | — | Body text |
| `time` | `string` | Yes | — | Relative/absolute time |
| `read` | `boolean` | No | `false` | Marked-read state |
| `onClick` | `() => void` | No | — | Open related item |
| `type` | `"info" \| "warning" \| "success"` | No | `"info"` | Icon + tinting |

**Accessibility:** `aria-live="polite"`, unread indicated by dot + label.

```tsx
<NotificationCard
  title="Lab results ready"
  message="Report KF-229 for UHID-000102 is available."
  time="2m ago"
  read={false}
/>
```

---

# FORM COMPONENTS

### Input

**Purpose:** Text, number, and email input with validation and error display.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `name` | `string` | Yes | — | Form field name |
| `value` | `string` | No | `""` | Controlled value |
| `onChange` | `(e) => void` | Yes | — | Change handler |
| `type` | `"text" \| "number" \| "email" \| "password"` | No | `"text"` | Input type |
| `error` | `string` | No | — | Validation message |
| `placeholder` | `string` | No | — | Placeholder |
| `disabled` | `boolean` | No | `false` | Disabled state |
| `icon` | `ReactNode` | No | — | Leading icon |
| `required` | `boolean` | No | `false` | Marks required |

**Variants:** Default, with-icon, error, disabled.

**States:** Error shows message with `aria-invalid`.

**Accessibility:** `role` via `<label htmlFor>`, `aria-invalid`, `aria-describedby` on error text, error announced with `role="alert"`.

```tsx
<Input
  label="Mobile Number"
  name="phone"
  type="tel"
  value={form.phone}
  onChange={handleChange}
  error={errors.phone}
/>
```

---

### Select

**Purpose:** Dropdown selector.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `name` | `string` | Yes | — | Field name |
| `value` | `string` | No | — | Selected value |
| `onChange` | `(v: string) => void` | Yes | — | Change handler |
| `options` | `{ value: string; label: string }[]` | Yes | — | Options |
| `placeholder` | `string` | No | — | Placeholder option |
| `error` | `string` | No | — | Error message |
| `disabled` | `boolean` | No | `false` | Disabled state |

**Accessibility:** Native `<select>` for keyboard/screen-reader support; error linked via `aria-describedby`.

```tsx
<Select
  label="Department"
  name="dept"
  value={form.dept}
  onChange={setDept}
  options={[
    { value: "kaya", label: "Kayachikitsa" },
    { value: "pancha", label: "Panchakarma" },
  ]}
/>
```

---

### TextArea

**Purpose:** Multi-line text entry.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `name` | `string` | Yes | — | Field name |
| `value` | `string` | No | `""` | Value |
| `onChange` | `(e) => void` | Yes | — | Change handler |
| `rows` | `number` | No | `4` | Row count |
| `resizable` | `boolean` | No | `true` | Allow resize |
| `error` | `string` | No | — | Error message |
| `maxLength` | `number` | No | — | Character cap + counter |

**Accessibility:** `<label>`, `aria-invalid`, character counter with `aria-live="polite"`.

```tsx
<TextArea
  label="Chief Complaints"
  name="complaints"
  value={form.complaints}
  onChange={handleChange}
  maxLength={500}
/>
```

---

### DatePicker

**Purpose:** Native-styled date selection.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `name` | `string` | Yes | — | Field name |
| `value` | `string` | No | — | ISO date string |
| `onChange` | `(date: string) => void` | Yes | — | Change handler |
| `minDate` | `string` | No | — | Minimum selectable |
| `maxDate` | `string` | No | — | Maximum selectable |
| `error` | `string` | No | — | Error message |

**Accessibility:** Uses native input `type="date"` for screen-reader & keyboard calendar support.

```tsx
<DatePicker
  label="Date of Birth"
  name="dob"
  value={patient.dob}
  onChange={setDob}
  maxDate="2026-08-05"
/>
```

---

### TimePicker

**Purpose:** Time-of-day selection.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `name` | `string` | Yes | — | Field name |
| `value` | `string` | No | — | `HH:mm` value |
| `onChange` | `(t: string) => void` | Yes | — | Change handler |
| `step` | `number` | No | `30` | Minute interval |
| `error` | `string` | No | — | Error message |

**Accessibility:** Native `type="time"` input; labels bound via `htmlFor`.

```tsx
<TimePicker
  label="Session Time"
  name="time"
  value={form.time}
  onChange={setTime}
  step={15}
/>
```

---

### Checkbox

**Purpose:** Boolean selection control.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `name` | `string` | Yes | — | Field name |
| `checked` | `boolean` | Yes | — | Checked state |
| `onChange` | `(checked: boolean) => void` | Yes | — | Toggle handler |
| `disabled` | `boolean` | No | `false` | Disabled |
| `indeterminate` | `boolean` | No | `false` | Partial state |

**Accessibility:** Native checkbox; `aria-checked={"mixed"}` for indeterminate; Space toggles.

```tsx
<Checkbox
  label="Consent for Panchakarma"
  name="consent"
  checked={form.consent}
  onChange={setConsent}
/>
```

---

### RadioGroup

**Purpose:** Mutually exclusive option set.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | — | Group name |
| `label` | `string` | No | — | Group label |
| `options` | `{ value: string; label: string }[]` | Yes | — | Options |
| `value` | `string` | No | — | Selected value |
| `onChange` | `(v: string) => void` | Yes | — | Change handler |
| `direction` | `"row" \| "column"` | No | `"column"` | Layout |

**Accessibility:** `role="radiogroup"`, each option `role="radio"` with `aria-checked`, arrow-key navigation.

```tsx
<RadioGroup
  name="gender"
  label="Gender"
  value={patient.gender}
  onChange={setGender}
  options={[
    { value: "M", label: "Male" },
    { value: "F", label: "Female" },
  ]}
/>
```

---

### Switch

**Purpose:** On/off toggle control.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `checked` | `boolean` | Yes | — | Toggled state |
| `onChange` | `(v: boolean) => void` | Yes | — | Toggle handler |
| `disabled` | `boolean` | No | `false` | Disabled |
| `size` | `"sm" \| "md"` | No | `"md"` | Size |

**Accessibility:** `role="switch"`, `aria-checked`, focusable, Space/Enter toggles.

```tsx
<Switch
  label="Active"
  checked={settings.active}
  onChange={setActive}
/>
```

---

### FileUpload

**Purpose:** File picker with image type/size validation and preview.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `accept` | `string` | No | `"image/*"` | MIME types |
| `maxSize` | `number` | No | `2_000_000` | Bytes |
| `onFile` | `(file: File | null) => void` | Yes | — | Selected file |
| `preview` | `string` | No | — | Existing image URL |
| `error` | `string` | No | — | Validation error |

**States:** Loading (upload), Error (invalid file).

**Accessibility:** Wrapper `role="button"` + hidden file input, keyboard trigger (Enter/Space).

```tsx
<FileUpload
  label="Patient Photo"
  onFile={setPhoto}
  accept="image/png,image/jpeg"
  maxSize={5_000_000}
  preview={patient.photo}
/>
```

---

### SearchInput

**Purpose:** Debounced search field.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string` | No | `""` | Input value |
| `onSearch` | `(q: string) => void` | Yes | — | Debounced callback |
| `debounceMs` | `number` | No | `300` | Delay in ms |
| `placeholder` | `string` | No | `"Search…"` | Placeholder |
| `loading` | `boolean` | No | `false` | Show spinner |
| `onKeyDown` | `(e) => void` | No | — | Keyboard handler |

**Accessibility:** `<label>` or `aria-label="Search"`, clearing via Escape, results announced with `role="status"`.

```tsx
<SearchInput
  onSearch={setQuery}
  placeholder="Search patients by name or UHID"
  loading={isSearching}
/>
```

---

# FEEDBACK COMPONENTS

### Button

**Purpose:** Triggers an action; primary interactive element.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `"primary" \| "secondary" \| "outline" \| "danger" \| "ghost"` | No | `"primary"` | Style variant |
| `size` | `"sm" \| "md" \| "lg"` | No | `"md"` | Size |
| `loading` | `boolean` | No | `false` | Show spinner + disable |
| `disabled` | `boolean` | No | `false` | Disabled |
| `icon` | `ReactNode` | No | — | Leading icon |
| `onClick` | `() => void` | Yes | — | Click handler |
| `fullWidth` | `boolean` | No | `false` | Block width |
| `as` | `"button" \| "a"` | No | `"button"` | Element type |

**Variants:** See `variant` — primary (teal), secondary (soft teal), outline (bordered), danger (red), ghost (transparent).

**States:** Loading (spinner), Disabled.

**Accessibility:** Native `<button>`; loading state sets `aria-busy`, disabled sets `aria-disabled`.

```tsx
<Button
  variant="primary"
  size="md"
  loading={saving}
  onClick={handleSave}
  icon={<Save />}
>
  Save
</Button>
```

---

### Modal

**Purpose:** Focus-trapped dialog overlay for confirmations and forms.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | Yes | — | Visibility |
| `onClose` | `() => void` | Yes | — | Close handler |
| `title` | `string` | Yes | — | Heading |
| `children` | `ReactNode` | Yes | — | Body |
| `footer` | `ReactNode` | No | — | Action area |
| `size` | `"sm" \| "md" \| "lg"` | No | `"md"` | Width |
| `closeOnBackdrop` | `boolean` | No | `true` | Backdrop close |

**Variants:** Default, centered (small pieces of content).

**Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` title, focus trap, Escape closes, restore focus on close, prevent scroll-behind.

```tsx
<Modal
  open={open}
  onClose={close}
  title="Confirm Discharge"
  footer={<Button variant="danger" onClick={discharge}>Confirm</Button>}
>
  <p>Discharge UHID-000123?</p>
</Modal>
```

---

### Toast

**Purpose:** Non-blocking transient notification.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `type` | `"success" \| "error" \| "warning" \| "info"` | Yes | — | Toast style |
| `title` | `string` | Yes | — | Heading |
| `message` | `string` | No | — | Body |
| `duration` | `number` | No | `4000` | Auto-dismiss ms |
| `onClose` | `() => void` | Yes | — | Dismiss handler |
| `actionLabel` | `string` | No | — | Optional inline action |
| `onAction` | `() => void` | No | — | Action handler |

**Variants:** See `type`.

**Accessibility:** `role="status"` (info/success) or `role="alert"` (error/warning); auto-dismiss does not hide from screen readers.

```tsx
<Toast
  type="success"
  title="Saved"
  message="Appointment confirmed."
  onClose={() => clearToast()}
/>
```

---

### Tooltip

**Purpose:** Hover/focus informational hint.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `content` | `string` | Yes | — | Tooltip text |
| `children` | `ReactNode` | Yes | — | Trigger element |
| `placement` | `"top" \| "bottom" \| "left" \| "right"` | No | `"top"` | Position |
| `delay` | `number` | No | `300` | Show delay ms |

**Variants:** Light, dark.

**Accessibility:** Trigger `aria-describedby` pointing to tooltip id; tooltip reveals on focus as well as hover.

```tsx
<Tooltip content="Open billing" placement="top">
  <Button variant="ghost" icon={<Receipt />} />
</Tooltip>
```

---

### Alert

**Purpose:** Inline banner for warnings, errors, info, success.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `type` | `"info" \| "warning" \| "error" \| "success"` | Yes | — | Style |
| `title` | `string` | No | — | Heading |
| `children` | `ReactNode` | Yes | — | Message body |
| `dismissible` | `boolean` | No | `false` | Show close button |
| `onDismiss` | `() => void` | No | — | Dismiss handler |

**Variants:** See `type`.

**Accessibility:** `role="alert"` (error) or `role="status"` (info); dismiss button labelled.

```tsx
<Alert type="warning" title="Low stock" dismissible onDismiss={close}>
  Triphala Churna is below reorder level.
</Alert>
```

---

### SkeletonLoader

**Purpose:** Full page-load placeholder composed of multiple skeleton blocks.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `"list" \| "dashboard" \| "form" \| "table"` | No | `"dashboard"` | Layout pattern |
| `rows` | `number` | No | `5` | Repeat count |
| `showHeader` | `boolean` | No | `true` | Header block |

**States:** Loading only.

**Accessibility:** `role="status"`, `aria-busy="true"`, hidden label "Loading…".

```tsx
<SkeletonLoader variant="table" rows={8} />
```

---

# SPECIALIZED COMPONENTS

### Calendar

**Purpose:** Scheduling calendar with week/month/day views.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `view` | `"day" \| "week" \| "month"` | No | `"month"` | Current view |
| `date` | `Date` | Yes | — | Displayed date |
| `events` | `CalendarEvent[]` | Yes | — | `{ id, start, end, title, status }` |
| `onDateChange` | `(d: Date) => void` | Yes | — | Navigate date |
| `onEventClick` | `(id: string) => void` | No | — | Event selection |
| `onViewChange` | `(v: View) => void` | No | — | View switch |

**States:** Loading (skeleton grid), Empty (no events).

**Accessibility:** `role="grid"`, arrows navigate days, `aria-selected` on chosen date, aria-labels on view buttons.

```tsx
<Calendar
  view="week"
  date={currentDate}
  events={appointments}
  onDateChange={setDate}
  onEventClick={openAppointment}
/>
```

---

### BodyMap

**Purpose:** Interactive human body diagram with region annotations, used for Panchakarma assessment.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `selectedRegions` | `string[]` | No | `[]` | Highlighted regions |
| `onSelect` | `(region: string) => void` | No | — | Region selection |
| `axis` | `"anterior" \| "posterior"` | No | `"anterior"` | View orientation |
| `interactive` | `boolean` | No | `true` | Allow selection |

**States:** Loading (image skeleton), Empty (none selected).

**Accessibility:** Each region is a focusable element with `aria-label` (e.g. "Abdomen"), `aria-pressed` when selected.

```tsx
<BodyMap
  axis="posterior"
  selectedRegions={["lower-back"]}
  onSelect={setRegion}
/>
```

---

### OutcomeScore

**Purpose:** 1–10 numeric score indicator for clinical outcomes.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `number` | Yes | — | `1–10` score |
| `onChange` | `(v: number) => void` | No | — | Setter (read-only if absent) |
| `size` | `"sm" \| "md" \| "lg"` | No | `"md"` | Scale size |
| `readOnly` | `boolean` | No | `false` | Display only |

**Variants:** Read-only, interactive.

**Accessibility:** `role="slider"` interactive with `aria-valuemin/max/now`, or `role="img"` with `aria-label="Score 7 out of 10"` read-only.

```tsx
<OutcomeScore value={7} readOnly />
<OutcomeScore value={5} onChange={setScore} />
```

---

### VitalsDisplay

**Purpose:** Displays patient vitals (BP, pulse, temp, SpO2).

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `bpSystolic` | `number` | Yes | — | Systolic BP (mmHg) |
| `bpDiastolic` | `number` | Yes | — | Diastolic BP |
| `pulse` | `number` | Yes | — | Heart rate (bpm) |
| `temperature` | `number` | Yes | — | °C |
| `spo2` | `number` | Yes | — | Oxygen saturation % |
| `recordedAt` | `string` | No | — | Timestamp |

**Variants:** Compact grid, detailed row.

**Accessibility:** Values use native text (not color-only); out-of-range flagged with icon + label.

```tsx
<VitalsDisplay
  bpSystolic={126}
  bpDiastolic={82}
  pulse={72}
  temperature={37.2}
  spo2={98}
  recordedAt="08:30"
/>
```

---

### BatchSelector

**Purpose:** Pharmacy FIFO batch selection for issuance.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `medicineId` | `string` | Yes | — | Medicine identifier |
| `quantity` | `number` | Yes | — | Quantity to issue |
| `batches` | `Batch[]` | Yes | — | `{ id, no, qty, expiry, mrp }` sorted by expiry |
| `onSelect` | `(selected: Batch[]) => void` | Yes | — | FIFO allocation result |

**States:** Loading, Empty (no stock), Out-of-stock.

**Accessibility:** Radio-list semantics; selected allocation summarized with `aria-live`.

```tsx
<BatchSelector
  medicineId="med-004"
  quantity={5}
  batches={batches}
  onSelect={allocateFIFO}
/>
```

---

### ServiceSelector

**Purpose:** Billing catalog search and selection of chargeable services.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `catalog` | `Service[]` | Yes | — | `{ id, name, price, category }` |
| `selected` | `Service[]` | Yes | — | Chosen services |
| `onAdd` | `(s: Service) => void` | Yes | — | Add item |
| `onRemove` | `(id: string) => void` | Yes | — | Remove item |
| `query` | `string` | No | — | Search term |
| `onQueryChange` | `(q: string) => void` | No | — | Search update |

**States:** Loading (catalogue fetch), Empty (no matches).

**Accessibility:** Search input labelled; selection list `aria-live="polite"`; price announced with currency.

```tsx
<ServiceSelector
  catalog={services}
  selected={billItems}
  onAdd={addItem}
  onRemove={removeItem}
  onQueryChange={setQuery}
/>
```

---

### DateRangePicker

**Purpose:** Selection of a start and end date.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `start` | `string` | No | — | Start ISO date |
| `end` | `string` | No | — | End ISO date |
| `onChange` | `(range: { start: string; end: string }) => void` | Yes | — | Range update |
| `presets` | `{ label: string; days: number }[]` | No | — | Quick ranges |
| `minDate` | `string` | No | — | Lower bound |
| `maxDate` | `string` | No | — | Upper bound |

**Accessibility:** Two labelled date inputs; preset buttons `aria-pressed`; range summary via `aria-live`.

```tsx
<DateRangePicker
  start={"2026-08-01"}
  end={"2026-08-05"}
  onChange={setRange}
  presets={[
    { label: "7 days", days: 7 },
    { label: "30 days", days: 30 },
  ]}
/>
```

---

### BarcodeScanner

**Purpose:** Scans medicine barcodes for fast pharmacy lookups.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onScan` | `(code: string) => void` | Yes | — | Barcode result |
| `active` | `boolean` | Yes | — | Camera on/off |
| `onClose` | `() => void` | Yes | — | Stop scanning |
| `onError` | `(err: string) => void` | No | — | Camera errors |

**States:** Idle, Scanning, Success (beep+flash), Error (camera denied).

**Accessibility:** Status communicated via `aria-live` ("Scanning…", "Scanned XYZ").

```tsx
<BarcodeScanner
  active={scanning}
  onScan={lookupMed}
  onClose={() => setScanning(false)}
/>
```

---

### QuantityInput

**Purpose:** Numeric stepper with optional unit label.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `number` | Yes | — | Current quantity |
| `onChange` | `(v: number) => void` | Yes | — | Change handler |
| `min` | `number` | No | `0` | Minimum |
| `max` | `number` | No | `Infinity` | Maximum |
| `step` | `number` | No | `1` | Increment |
| `unit` | `string` | No | — | Unit label (e.g. `tabs`) |
| `disabled` | `boolean` | No | `false` | Disabled |

**Accessibility:** `role="spinbutton"`, `aria-valuenow/min/max`, labelled increment/decrement buttons.

```tsx
<QuantityInput
  value={dose}
  onChange={setDose}
  min={1}
  max={30}
  unit="tabs"
/>
```

---

### Timeline

**Purpose:** Vertical chronological list of events.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `TimelineItem[]` | Yes | — | `{ id, title, description?, time, icon?, color }` |
| `orientation` | `"vertical" \| "horizontal"` | No | `"vertical"` | Layout |
| `onItemClick` | `(id: string) => void` | No | — | Select event |

**States:** Empty (no items).

**Accessibility:** `role="list"` with `role="listitem"` per node; timing read in `aria-label`.

```tsx
<Timeline
  items={[
    { id: "1", title: "Admitted", time: "08:00", icon: <Bed /> },
    { id: "2", title: "Therapy started", time: "09:00" },
  ]}
/>
```

---

### ColorPicker

**Purpose:** Theme customization color selection.

**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string` | Yes | — | Current hex color |
| `onChange` | `(hex: string) => void` | Yes | — | Update color |
| `presets` | `string[]` | No | tokens | Common swatches |
| `allowCustom` | `boolean` | No | `true` | Enable hex input |

**Variants:** Swatched, full (with hex field + native picker).

**Accessibility:** `role="radiogroup"` for swatches, `aria-pressed`; custom input labelled; hex validated.

```tsx
<ColorPicker
  value="#0F766E"
  onChange={setThemeColor}
  presets={["#0F766E", "#C8A14D", "#DC2626"]}
/>
```

---

## 5. Component Naming Conventions & Folder Structure

**Naming Rules:**
- Components use **PascalCase** filenames matching export names (e.g. `PatientCard.tsx`).
- Custom hooks use **camelCase** with a `use` prefix (e.g. `useDebounce`).
- Prop interfaces are named `<ComponentName>Props` (e.g. `PatientCardProps`).
- Export each component as a **named export**; hooks exported separately.
- One component per file unless tightly coupled (e.g. small `Button.Group`).

**Folder Structure:**
```
src/components/
├── common/        (generic: Button, Card, Modal, Input, Toast, etc.)
│   ├── Button/
│   ├── Card/
│   ├── Modal/
│   ├── Input/
│   └── ...
├── layout/        (Navbar, Sidebar, Topbar, Footer, Drawer, BottomNav)
│   ├── Navbar/
│   ├── Sidebar/
│   ├── Topbar/
│   ├── Footer/
│   ├── Drawer/
│   └── BottomNav/
├── domain/        (business cards: PatientCard, DoctorCard, BillCard, etc.)
│   ├── PatientCard/
│   ├── DoctorCard/
│   ├── AppointmentCard/
│   └── ...
├── pages/         (page-specific components, not reusable)
│   ├── opd/
│   ├── pharmacy/
│   ├── billing/
│   └── ...
└── index.ts       (barrel re-export for library consumers)
```

---

## 6. State Management

Components in this library are **stateless / presentational**. They receive data and callbacks entirely through props and never manage server data internally.

- **Server state** is fetched and cached via **React Query** hooks (e.g. `usePatients`, `useBatches`).
- **Form state** lives in parent containers using React hooks (`useState`, `useForm`) passed down as controlled props.
- Callbacks such as `onChange`, `onSelect`, `onRetry` are provided by parent views tied to React Query mutations/invalidations.
- This separation keeps every component **predictable, testable, and reusable** across modules without coupling to backend schemas.

---

*End of Volume 14. For design tokens, see Volume 1 (Design System) and Volume 11 (Theme).*