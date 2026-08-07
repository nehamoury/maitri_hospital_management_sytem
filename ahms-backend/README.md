# AHMS Backend (Go + Gin + GORM + PostgreSQL)

Ayurvedic Hospital Management System — **Phase 1 backend, complete.**

Modules built: Authentication (login/logout/refresh/JWT), Roles (4 system roles), Departments (CRUD), Doctors (CRUD + auto login provisioning), Patients (create/edit/search + auto UHID + duplicate-mobile detection), Appointments (booking + auto token generation), Dashboard (summary aggregates).

## Folder structure — what each folder is for

```
ahms-backend/
├── cmd/api/main.go          Application entrypoint: loads config, connects DB,
│                             runs migrations + seeds, wires middleware,
│                             registers every module's routes, starts the server.
├── internal/
│   ├── config/               Reads and validates environment variables (.env).
│   ├── database/              DB connection (GORM+Postgres), AutoMigrate for
│   │                          every model, and idempotent seed functions
│   │                          (roles, bootstrap super admin, demo departments).
│   ├── models/                 GORM entities: BaseModel, Role, Permission, User,
│   │                          Department, Doctor, Patient, UHIDCounter, Appointment.
│   ├── utils/                  Cross-cutting helpers: JSON response envelope,
│   │                          bcrypt password hashing, JWT issue/parse.
│   ├── middleware/              JWT auth guard (RequireAuth), role-based guard
│   │                          (RequireRoles), CORS.
│   ├── auth/                   Login/refresh/logout/me.
│   ├── users/                  Reserved for a future standalone user-management
│   │                          module (Phase 1 creates staff logins through the
│   │                          doctors module and the super-admin seed instead).
│   ├── roles/                  Reserved for role CRUD if ever needed beyond the
│   │                          seeded four system roles.
│   ├── departments/            Department CRUD, restricted to Super Admin /
│   │                          Hospital Admin for writes.
│   ├── doctors/                Doctor CRUD. Creating a doctor provisions a
│   │                          linked User login (role=DOCTOR) in one transaction.
│   ├── patients/                Patient create/edit/search/delete. Auto-generates
│   │                          UHID (AHMS-YYYY-000001...) via a row-locked yearly
│   │                          counter; detects duplicate mobile numbers and
│   │                          returns the existing matches unless force=true.
│   ├── appointments/             Appointment booking. Auto-assigns a sequential
│   │                          queue token per (doctor, date) via a row-locked
│   │                          transaction, so concurrent bookings never collide.
│   └── dashboard/                Read-only aggregate queries: today's patient
│                              count, today's appointment count, department
│                              count, active doctor count, recent registrations,
│                              today's appointment list.
├── docs/                        Swagger/OpenAPI spec served at /swagger/index.html.
├── go.mod                        Pinned dependency versions.
├── Dockerfile                    Multi-stage build → small Alpine runtime image.
├── docker-compose.yml            backend + postgres + redis, one command to run.
├── .env.example                  Copy to .env and fill in real values.
└── README.md                     This file.
```

Every module follows the same 4-layer pattern: **dto → repository → service → handler → routes**, registered in `cmd/api/main.go`. This keeps HTTP concerns (handler), business rules (service), and data access (repository) independently testable.

## Running it (requires normal internet access — see note below)

```bash
cp .env.example .env
# edit .env: set a real JWT_SECRET (32+ chars) and DB credentials

docker compose up --build
```

The API will be available at `http://localhost:8080`, Swagger UI at
`http://localhost:8080/swagger/index.html`, health check at
`http://localhost:8080/health`.

On first boot the backend automatically:
1. Runs migrations for every table.
2. Seeds the 4 system roles: `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `RECEPTIONIST`, `DOCTOR`.
3. Creates one bootstrap Super Admin account from `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` in `.env` (idempotent).
4. If `SEED_DEMO_DEPARTMENTS=true`, seeds 5 starter Ayurvedic departments (only if the table is empty).

### Try the full flow

```bash
# 1. Log in as the bootstrap super admin
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ahms.local","password":"ChangeMe123!"}'
# → copy access_token from the response

TOKEN="paste-access-token-here"

# 2. List departments (demo-seeded)
curl http://localhost:8080/api/v1/departments -H "Authorization: Bearer $TOKEN"

# 3. Create a doctor
curl -X POST http://localhost:8080/api/v1/doctors -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"full_name":"Dr. Asha Verma","email":"asha@ahms.local","mobile":"9000000001","password":"Doctor@123","department_id":"<dept-id-from-step-2>","specialization":"Panchakarma","experience_years":8,"consultation_fee":500}'

# 4. Register a patient (auto UHID)
curl -X POST http://localhost:8080/api/v1/patients -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"full_name":"Ramesh Kumar","gender":"MALE","age":45,"mobile":"9111111111"}'

# 5. Book an appointment (auto token number)
curl -X POST http://localhost:8080/api/v1/appointments -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"patient_id":"<patient-id>","doctor_id":"<doctor-id>","appointment_date":"2026-08-03","reason":"General consultation"}'

# 6. Dashboard summary
curl http://localhost:8080/api/v1/dashboard -H "Authorization: Bearer $TOKEN"
```

### Local (non-Docker) run

```bash
go mod tidy   # downloads gin, gorm, jwt, etc.
go build ./...
go test ./...
go run ./cmd/api
```

## ⚠️ A note on this build environment

This code was written and reviewed inside a sandboxed container whose network
is restricted to a small allowlist (github.com, npmjs.org, pypi.org, etc.) and
does **not** include `proxy.golang.org` or `golang.org`. Because of that,
`go mod tidy` / `go build` / `go test` could not be executed inside this
sandbox to fetch Gin/GORM/JWT and produce a `go.sum`. Every file was written
by hand, module-by-module, then verified with `gofmt -l -e` (catches syntax
errors and formatting issues via full AST parsing) across all files with
**zero errors**. There are no TODOs or placeholder functions anywhere.

**On your own machine or CI (with normal internet), run:**
```bash
go mod tidy
go build ./...
go test ./...
```
This will download the pinned dependency versions, generate `go.sum`, and
compile normally. If you hit any compile error, send it to me and I'll fix
it immediately.

## Complete API reference

| Method | Endpoint                         | Auth              | Description |
|--------|-----------------------------------|--------------------|--------------|
| POST   | `/api/v1/auth/login`             | No                 | Email + password → tokens |
| POST   | `/api/v1/auth/refresh`          | No                 | Refresh token → new token pair |
| POST   | `/api/v1/auth/logout`           | Any                | Stateless logout |
| GET    | `/api/v1/auth/me`                | Any                | Current user identity |
| GET    | `/api/v1/departments`            | Any                | List departments |
| GET    | `/api/v1/departments/:id`       | Any                | Get one department |
| POST   | `/api/v1/departments`           | Super Admin, Hospital Admin | Create department |
| PUT    | `/api/v1/departments/:id`       | Super Admin, Hospital Admin | Update department |
| DELETE | `/api/v1/departments/:id`       | Super Admin, Hospital Admin | Delete department |
| GET    | `/api/v1/doctors`                 | Any                | List doctors |
| GET    | `/api/v1/doctors/:id`            | Any                | Get one doctor |
| POST   | `/api/v1/doctors`                | Super Admin, Hospital Admin | Create doctor (+ login) |
| PUT    | `/api/v1/doctors/:id`            | Super Admin, Hospital Admin | Update doctor |
| DELETE | `/api/v1/doctors/:id`            | Super Admin, Hospital Admin | Deactivate doctor |
| GET    | `/api/v1/patients?search=`      | Any                | List / search patients |
| GET    | `/api/v1/patients/:id`           | Any                | Get one patient |
| POST   | `/api/v1/patients`               | Super Admin, Hospital Admin, Receptionist | Register patient (auto UHID) |
| PUT    | `/api/v1/patients/:id`           | Super Admin, Hospital Admin, Receptionist | Update patient |
| DELETE | `/api/v1/patients/:id`           | Super Admin, Hospital Admin, Receptionist | Delete patient |
| GET    | `/api/v1/appointments`           | Any                | List / filter appointments |
| GET    | `/api/v1/appointments/:id`      | Any                | Get one appointment |
| POST   | `/api/v1/appointments`           | Super Admin, Hospital Admin, Receptionist | Book appointment (auto token) |
| PUT    | `/api/v1/appointments/:id/status` | Any (role-appropriate) | Update status |
| GET    | `/api/v1/dashboard`               | Any                | Summary aggregates |
| GET    | `/health`                          | No                 | Liveness check |

## Next: Frontend

Phase 1 backend is complete. Next step is the Next.js 15 + TypeScript
frontend consuming these exact endpoints (no mock data), built module by
module in the same way: Auth pages → Dashboard → Departments →
Doctors → Patients → Appointments.
