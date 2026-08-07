# AHMS Volume 13 — Complete API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Common Response Formats](#common-response-formats)
5. [Pagination](#pagination)
6. [Rate Limiting](#rate-limiting)
7. [Auth Module](#auth-module)
8. [Users Module](#users-module)
9. [Roles Module](#roles-module)
10. [Patient Module](#patient-module)
11. [Appointment Module](#appointment-module)
12. [Encounter Module](#encounter-module)
13. [Consultation Module](#consultation-module)
14. [Diagnosis Module](#diagnosis-module)
15. [Prescription Module](#prescription-module)
16. [Referral Module](#referral-module)
17. [Timeline Module](#timeline-module)
18. [Pharmacy Module](#pharmacy-module)
19. [Panchakarma Module](#panchakarma-module)
20. [IPD Module](#ipd-module)
21. [Billing Module](#billing-module)
22. [Reports Module](#reports-module)
23. [Portal Module](#portal-module)
24. [Dashboard Module](#dashboard-module)
25. [Global Search](#global-search)

---

## Overview

AHMS (Ayurvedic Hospital Management System) Backend API — Complete endpoint reference for all modules.

**Version:** 1.0.0  
**Protocol:** HTTP/HTTPS  
**Content-Type:** application/json  
**API Versioning:** URL-based (`/api/v1`)

---

## Base URL

```
http://localhost:8080/api/v1
```

All endpoints documented below are relative to this base URL unless otherwise noted.

---

## Authentication

AHMS uses **JWT (JSON Web Token)** based authentication.

**Token Lifetime:**
- Access Token: 15 minutes
- Refresh Token: 7 days

**How to authenticate:**

1. Obtain tokens via `POST /auth/login` or `POST /auth/register`
2. Include the access token in every request header:

```
Authorization: Bearer <access_token>
```

**Token Refresh Flow:**
- When access token expires, use `POST /auth/refresh` with the refresh token
- The refresh token is returned in the login response body or as an httpOnly cookie
- After refresh, both new access and refresh tokens are provided

**Permission System:**
- Each endpoint requires specific permissions
- Permissions are assigned via roles
- Roles are assigned to users
- Format: `module:action` (e.g., `patients:read`, `billing:create`)

---

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Success Response (List)

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field_name": ["Error message for this field"]
    }
  }
}
```

---

## Pagination

All list endpoints support pagination via query parameters:

| Parameter | Type    | Default | Description                |
|-----------|---------|---------|----------------------------|
| page      | integer | 1       | Page number (1-indexed)    |
| limit     | integer | 20      | Items per page (max: 100)  |
| sort      | string  | id      | Sort field                 |
| order     | string  | desc    | Sort order: `asc` or `desc`|
| search    | string  | —       | Search query               |

**Query parameters vary by endpoint.** Each endpoint may have additional filter parameters documented individually.

---

## Rate Limiting

| Endpoint Category      | Rate Limit       |
|------------------------|------------------|
| Auth endpoints         | 10/minute        |
| Read-only endpoints    | 60/minute        |
| Write endpoints        | 30/minute        |
| Search endpoints       | 30/minute        |
| Report endpoints       | 20/minute        |
| File upload endpoints  | 10/minute        |

Rate limit headers returned in every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1640995200
```

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

HTTP Status: `429 Too Many Requests`

---

## Auth Module

### POST /auth/login

**Description:** Authenticate a user and return JWT tokens.

**Auth:** None (public endpoint)  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Content-Type: application/json }
Body: {
  email: string (valid email, required) - User email address
  password: string (min 8 chars, required) - User password
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "string",
      "name": "string",
      "role": "string",
      "permissions": ["string"]
    },
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 900
  }
}
```

**Response 401:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

**Response 422:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["Email is required"],
      "password": ["Password is required"]
    }
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ahms.com","password":"admin123"}'
```

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "admin@ahms.com",
      "name": "Admin User",
      "role": "admin",
      "permissions": ["*"]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/register

**Description:** Register a new user account.

**Auth:** None (public endpoint)  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Content-Type: application/json }
Body: {
  name: string (2-100 chars, required) - Full name
  email: string (valid email, required) - Email address
  password: string (min 8 chars, required) - Password
  confirmPassword: string (must match password, required) - Confirm password
  phone: string (optional) - Phone number
  role: string (optional, default: "patient") - Role assignment
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "string",
      "createdAt": "ISO8601"
    },
    "accessToken": "string",
    "refreshToken": "string"
  },
  "message": "Registration successful"
}
```

**Response 409:**

```json
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "A user with this email already exists"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Sharma","email":"sharma@ahms.com","password":"doctor123","confirmPassword":"doctor123","role":"doctor"}'
```

---

### POST /auth/refresh

**Description:** Refresh an expired access token using a refresh token.

**Auth:** None (public endpoint, but requires valid refresh token)  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Content-Type: application/json }
Body: {
  refreshToken: string (required) - Valid refresh token
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 900
  }
}
```

**Response 401:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Invalid or expired refresh token"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."}'
```

---

### POST /auth/logout

**Description:** Invalidate the current refresh token and log out.

**Auth:** Bearer token required  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Body: {
  refreshToken: string (required) - Refresh token to invalidate
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."}'
```

---

## Users Module

### GET /users

**Description:** List all users with pagination and filtering.

**Auth:** Required — `users:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  sort: string (optional, default: "createdAt") - Sort field
  order: string (optional, default: "desc") - Sort order
  search: string (optional) - Search by name or email
  role: string (optional) - Filter by role
  status: string (optional) - Filter by status (active/inactive)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "email": "string",
        "phone": "string",
        "role": "string",
        "status": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Response 401:** `UNAUTHORIZED`  
**Response 403:** `FORBIDDEN`

**Example:**

```bash
curl "http://localhost:8080/api/v1/users?page=1&limit=10&role=doctor" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /users/:id

**Description:** Get a specific user by ID.

**Auth:** Required — `users:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - User ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": {
      "id": "uuid",
      "name": "string",
      "permissions": ["string"]
    },
    "status": "string",
    "lastLogin": "ISO8601",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:**

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /users

**Description:** Create a new user.

**Auth:** Required — `users:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (2-100 chars, required) - Full name
  email: string (valid email, required) - Email address
  password: string (min 8 chars, required) - Password
  phone: string (optional) - Phone number
  roleId: uuid (required) - Role ID
  status: string (optional, default: "active") - Account status
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "status": "string",
    "createdAt": "ISO8601"
  },
  "message": "User created successfully"
}
```

**Response 409:**

```json
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "A user with this email already exists"
  }
}
```

**Response 422:** `VALIDATION_ERROR`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Nurse Priya","email":"priya@ahms.com","password":"nurse123","roleId":"r1b2c3d4...","status":"active"}'
```

---

### PUT /users/:id

**Description:** Update an existing user.

**Auth:** Required — `users:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - User ID
}
Body: {
  name: string (optional) - Full name
  email: string (optional) - Email address
  phone: string (optional) - Phone number
  roleId: uuid (optional) - Role ID
  status: string (optional) - Account status
  password: string (optional) - New password
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "User updated successfully"
}
```

**Response 404:** `USER_NOT_FOUND`  
**Response 409:** `EMAIL_IN_USE`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Sharma Updated","phone":"+91-9876543210"}'
```

---

### DELETE /users/:id

**Description:** Delete a user (soft delete).

**Auth:** Required — `users:delete`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - User ID
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Response 404:** `USER_NOT_FOUND`

**Example:**

```bash
curl -X DELETE http://localhost:8080/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Roles Module

### GET /roles

**Description:** List all roles with permissions.

**Auth:** Required — `roles:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  search: string (optional) - Search by role name
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string",
        "permissions": ["string"],
        "userCount": 5,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/roles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /roles/:id

**Description:** Get a specific role with all permissions.

**Auth:** Required — `roles:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Role ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "permissions": ["string"],
    "users": [
      {
        "id": "uuid",
        "name": "string",
        "email": "string"
      }
    ],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `ROLE_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/roles/r1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /roles

**Description:** Create a new role.

**Auth:** Required — `roles:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (2-50 chars, required) - Role name
  description: string (optional) - Role description
  permissions: array of strings (required) - List of permissions
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "permissions": ["string"],
    "createdAt": "ISO8601"
  },
  "message": "Role created successfully"
}
```

**Response 409:** `ROLE_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/roles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Senior Doctor","description":"Senior doctor with full access","permissions":["patients:*","appointments:*","prescriptions:*"]}'
```

---

### PUT /roles/:id

**Description:** Update an existing role.

**Auth:** Required — `roles:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Role ID
}
Body: {
  name: string (optional) - Role name
  description: string (optional) - Role description
  permissions: array of strings (optional) - List of permissions
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "permissions": ["string"],
    "updatedAt": "ISO8601"
  },
  "message": "Role updated successfully"
}
```

**Response 404:** `ROLE_NOT_FOUND`  
**Response 409:** `ROLE_NAME_IN_USE`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/roles/r1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated senior doctor role","permissions":["patients:*","appointments:*","prescriptions:*","billing:*"]}'
```

---

### DELETE /roles/:id

**Description:** Delete a role. Cannot delete roles assigned to users.

**Auth:** Required — `roles:delete`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Role ID
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Response 404:** `ROLE_NOT_FOUND`  
**Response 409:**

```json
{
  "success": false,
  "error": {
    "code": "ROLE_IN_USE",
    "message": "Cannot delete role assigned to users"
  }
}
```

**Example:**

```bash
curl -X DELETE http://localhost:8080/api/v1/roles/r1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Patient Module

### GET /patients

**Description:** List all patients with pagination and filtering.

**Auth:** Required — `patients:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  sort: string (optional, default: "createdAt") - Sort field
  order: string (optional, default: "desc") - Sort order
  search: string (optional) - Search by name, phone, or UHID
  gender: string (optional) - Filter by gender
  ageMin: integer (optional) - Minimum age
  ageMax: integer (optional) - Maximum age
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "uhid": "string",
        "name": "string",
        "gender": "string",
        "dateOfBirth": "ISO8601",
        "age": 45,
        "phone": "string",
        "email": "string",
        "bloodGroup": "string",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/patients?page=1&limit=10&search=sharma" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /patients/:id

**Description:** Get a specific patient with full details.

**Auth:** Required — `patients:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Patient ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "uhid": "string",
    "name": "string",
    "gender": "string",
    "dateOfBirth": "ISO8601",
    "age": 45,
    "phone": "string",
    "email": "string",
    "bloodGroup": "string",
    "address": {
      "line1": "string",
      "line2": "string",
      "city": "string",
      "state": "string",
      "pincode": "string"
    },
    "emergencyContact": {
      "name": "string",
      "phone": "string",
      "relation": "string"
    },
    "medicalHistory": {
      "allergies": ["string"],
      "chronicConditions": ["string"],
      "pastSurgeries": ["string"],
      "familyHistory": "string"
    },
    "insurance": {
      "provider": "string",
      "policyNumber": "string",
      "validUntil": "ISO8601"
    },
    "status": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `PATIENT_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/patients/p1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /patients

**Description:** Register a new patient.

**Auth:** Required — `patients:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (2-100 chars, required) - Full name
  gender: string (required, enum: male/female/other) - Gender
  dateOfBirth: ISO8601 (required) - Date of birth
  phone: string (required) - Phone number
  email: string (optional) - Email address
  bloodGroup: string (optional) - Blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)
  address: {
    line1: string (optional) - Address line 1
    line2: string (optional) - Address line 2
    city: string (optional) - City
    state: string (optional) - State
    pincode: string (optional) - Pincode
  },
  emergencyContact: {
    name: string (optional) - Emergency contact name
    phone: string (optional) - Emergency contact phone
    relation: string (optional) - Relationship
  },
  medicalHistory: {
    allergies: array of strings (optional) - Known allergies
    chronicConditions: array of strings (optional) - Chronic conditions
    pastSurgeries: array of strings (optional) - Past surgeries
    familyHistory: string (optional) - Family medical history
  },
  insurance: {
    provider: string (optional) - Insurance provider
    policyNumber: string (optional) - Policy number
    validUntil: ISO8601 (optional) - Policy validity
  }
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "uhid": "AHMS-2026-001234",
    "name": "string",
    "gender": "string",
    "dateOfBirth": "ISO8601",
    "phone": "string",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Patient registered successfully"
}
```

**Response 409:** `PATIENT_EXISTS` (duplicate phone)

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/patients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Rajesh Kumar","gender":"male","dateOfBirth":"1980-05-15","phone":"+91-9876543210","bloodGroup":"O+","address":{"line1":"123 Main St","city":"Delhi","state":"Delhi","pincode":"110001"}}'
```

---

### PUT /patients/:id

**Description:** Update patient information.

**Auth:** Required — `patients:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Patient ID
}
Body: {
  name: string (optional) - Full name
  gender: string (optional) - Gender
  dateOfBirth: ISO8601 (optional) - Date of birth
  phone: string (optional) - Phone number
  email: string (optional) - Email address
  bloodGroup: string (optional) - Blood group
  address: object (optional) - Address details
  emergencyContact: object (optional) - Emergency contact
  medicalHistory: object (optional) - Medical history
  insurance: object (optional) - Insurance details
  status: string (optional) - Patient status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "uhid": "string",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Patient updated successfully"
}
```

**Response 404:** `PATIENT_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/patients/p1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91-9999888877","email":"rajesh.kumar@email.com"}'
```

---

### GET /patients/search

**Description:** Search patients by name, phone, UHID, or email with autocomplete support.

**Auth:** Required — `patients:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  q: string (required, min 2 chars) - Search query
  limit: integer (optional, default: 10) - Max results
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "uhid": "string",
        "name": "string",
        "phone": "string",
        "gender": "string",
        "age": 45
      }
    ]
  }
}
```

**Response 422:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Search query must be at least 2 characters"
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/patients/search?q=raj&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Appointment Module

### GET /appointments

**Description:** List all appointments with filtering.

**Auth:** Required — `appointments:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  doctorId: uuid (optional) - Filter by doctor
  patientId: uuid (optional) - Filter by patient
  date: ISO8601 date (optional) - Filter by date
  dateFrom: ISO8601 date (optional) - Start date range
  dateTo: ISO8601 date (optional) - End date range
  status: string (optional) - Filter by status (scheduled/completed/cancelled/no-show)
  type: string (optional) - Filter by type (consultation/follow-up/emergency)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "appointmentNumber": "APT-2026-001",
        "patient": {
          "id": "uuid",
          "name": "string",
          "uhid": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "date": "ISO8601",
        "timeSlot": {
          "start": "HH:mm",
          "end": "HH:mm"
        },
        "type": "string",
        "status": "string",
        "reason": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/appointments?date=2026-01-15&doctorId=d1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /appointments/:id

**Description:** Get a specific appointment with full details.

**Auth:** Required — `appointments:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Appointment ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "appointmentNumber": "APT-2026-001",
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string",
      "phone": "string"
    },
    "doctor": {
      "id": "uuid",
      "name": "string",
      "specialization": "string"
    },
    "date": "ISO8601",
    "timeSlot": {
      "start": "HH:mm",
      "end": "HH:mm"
    },
    "type": "string",
    "status": "string",
    "reason": "string",
    "notes": "string",
    "encounterId": "uuid",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `APPOINTMENT_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /appointments

**Description:** Create a new appointment.

**Auth:** Required — `appointments:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  patientId: uuid (required) - Patient ID
  doctorId: uuid (required) - Doctor ID
  date: ISO8601 date (required) - Appointment date
  timeSlot: {
    start: string (required, HH:mm format) - Start time
    end: string (required, HH:mm format) - End time
  },
  type: string (required, enum: consultation/follow-up/emergency) - Appointment type
  reason: string (optional) - Reason for visit
  notes: string (optional) - Additional notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "appointmentNumber": "APT-2026-002",
    "patient": {
      "id": "uuid",
      "name": "string"
    },
    "doctor": {
      "id": "uuid",
      "name": "string"
    },
    "date": "ISO8601",
    "timeSlot": {
      "start": "HH:mm",
      "end": "HH:mm"
    },
    "type": "string",
    "status": "scheduled",
    "createdAt": "ISO8601"
  },
  "message": "Appointment booked successfully"
}
```

**Response 409:** `TIME_SLOT_UNAVAILABLE`  
**Response 422:** `VALIDATION_ERROR`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/appointments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"patientId":"p1b2c3d4...","doctorId":"d1b2c3d4...","date":"2026-01-20","timeSlot":{"start":"10:00","end":"10:30"},"type":"consultation","reason":"Follow-up for treatment"}'
```

---

### PUT /appointments/:id

**Description:** Update an existing appointment.

**Auth:** Required — `appointments:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Appointment ID
}
Body: {
  date: ISO8601 date (optional) - Appointment date
  timeSlot: {
    start: string (optional) - Start time
    end: string (optional) - End time
  },
  type: string (optional) - Appointment type
  reason: string (optional) - Reason for visit
  notes: string (optional) - Additional notes
  status: string (optional) - Appointment status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "appointmentNumber": "APT-2026-001",
    "updatedAt": "ISO8601"
  },
  "message": "Appointment updated successfully"
}
```

**Response 404:** `APPOINTMENT_NOT_FOUND`  
**Response 409:** `TIME_SLOT_UNAVAILABLE`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-25","timeSlot":{"start":"11:00","end":"11:30"}}'
```

---

### DELETE /appointments/:id

**Description:** Cancel/delete an appointment.

**Auth:** Required — `appointments:delete`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Appointment ID
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

**Response 404:** `APPOINTMENT_NOT_FOUND`

**Example:**

```bash
curl -X DELETE http://localhost:8080/api/v1/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### PATCH /appointments/:id/status

**Description:** Update appointment status.

**Auth:** Required — `appointments:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Appointment ID
}
Body: {
  status: string (required, enum: scheduled/in-progress/completed/cancelled/no-show) - New status
  reason: string (optional) - Reason for status change
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Appointment status updated"
}
```

**Response 404:** `APPOINTMENT_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/appointments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

---

## Encounter Module

### GET /encounters

**Description:** List all encounters with filtering.

**Auth:** Required — `encounters:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  patientId: uuid (optional) - Filter by patient
  doctorId: uuid (optional) - Filter by doctor
  date: ISO8601 date (optional) - Filter by date
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
  status: string (optional) - Filter by status
  type: string (optional) - Filter by type (opd/ipd/emergency)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "encounterNumber": "ENC-2026-001",
        "patient": {
          "id": "uuid",
          "name": "string",
          "uhid": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "appointmentId": "uuid",
        "type": "string",
        "status": "string",
        "vitals": {
          "bloodPressure": "string",
          "temperature": "number",
          "pulse": "number",
          "weight": "number"
        },
        "chiefComplaint": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 200,
      "totalPages": 10
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/encounters?date=2026-01-15&doctorId=d1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /encounters/:id

**Description:** Get a specific encounter with full clinical data.

**Auth:** Required — `encounters:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Encounter ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "encounterNumber": "ENC-2026-001",
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string",
      "gender": "string",
      "age": 45
    },
    "doctor": {
      "id": "uuid",
      "name": "string"
    },
    "appointmentId": "uuid",
    "type": "string",
    "status": "string",
    "vitals": {
      "bloodPressure": "string",
      "temperature": "number",
      "pulse": "number",
      "respiratoryRate": "number",
      "spo2": "number",
      "weight": "number",
      "height": "number"
    },
    "chiefComplaint": "string",
    "historyOfPresentIllness": "string",
    "pastMedicalHistory": "string",
    "examination": "string",
    "diagnosis": [
      {
        "id": "uuid",
        "name": "string",
        "type": "string"
      }
    ],
    "prescriptions": [
      {
        "id": "uuid",
        "medicine": "string",
        "dosage": "string"
      }
    ],
    "referrals": [
      {
        "id": "uuid",
        "toDoctor": "string",
        "status": "string"
      }
    ],
    "labOrders": ["string"],
    "advice": "string",
    "followUpDate": "ISO8601",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `ENCOUNTER_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/encounters/e1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /encounters

**Description:** Create a new encounter.

**Auth:** Required — `encounters:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  patientId: uuid (required) - Patient ID
  doctorId: uuid (required) - Doctor ID
  appointmentId: uuid (optional) - Linked appointment ID
  type: string (required, enum: opd/ipd/emergency) - Encounter type
  chiefComplaint: string (required) - Chief complaint
  vitals: {
    bloodPressure: string (optional) - e.g., "120/80"
    temperature: number (optional) - In Fahrenheit
    pulse: number (optional) - Beats per minute
    respiratoryRate: number (optional) - Breaths per minute
    spo2: number (optional) - SpO2 percentage
    weight: number (optional) - In kg
    height: number (optional) - In cm
  },
  historyOfPresentIllness: string (optional) - HPI
  pastMedicalHistory: string (optional) - PMH
  examination: string (optional) - Physical examination findings
  advice: string (optional) - Doctor's advice
  followUpDate: ISO8601 date (optional) - Follow-up date
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "encounterNumber": "ENC-2026-002",
    "patientId": "uuid",
    "doctorId": "uuid",
    "type": "string",
    "status": "open",
    "createdAt": "ISO8601"
  },
  "message": "Encounter created successfully"
}
```

**Response 404:** `PATIENT_NOT_FOUND` or `DOCTOR_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/encounters \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"patientId":"p1b2c3d4...","doctorId":"d1b2c3d4...","type":"opd","chiefComplaint":"Chronic back pain for 3 months","vitals":{"bloodPressure":"120/80","temperature":98.6,"pulse":72,"weight":75}}'
```

---

### PUT /encounters/:id

**Description:** Update an encounter with clinical data.

**Auth:** Required — `encounters:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Encounter ID
}
Body: {
  chiefComplaint: string (optional) - Chief complaint
  vitals: object (optional) - Vital signs
  historyOfPresentIllness: string (optional) - HPI
  pastMedicalHistory: string (optional) - PMH
  examination: string (optional) - Examination findings
  advice: string (optional) - Doctor's advice
  followUpDate: ISO8601 date (optional) - Follow-up date
  status: string (optional) - Encounter status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "encounterNumber": "ENC-2026-001",
    "updatedAt": "ISO8601"
  },
  "message": "Encounter updated successfully"
}
```

**Response 404:** `ENCOUNTER_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/encounters/e1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"examination":"Tenderness in lumbar region, limited range of motion","advice":"Rest, avoid heavy lifting","followUpDate":"2026-02-15"}'
```

---

## Consultation Module

### GET /consultations

**Description:** List all consultations.

**Auth:** Required — `consultations:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  encounterId: uuid (optional) - Filter by encounter
  doctorId: uuid (optional) - Filter by doctor
  patientId: uuid (optional) - Filter by patient
  date: ISO8601 date (optional) - Filter by date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "encounterId": "uuid",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "consultationType": "string",
        "notes": "string",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/consultations?doctorId=d1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /consultations/:id

**Description:** Get a specific consultation with full details.

**Auth:** Required — `consultations:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Consultation ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "encounter": {
      "id": "uuid",
      "encounterNumber": "string"
    },
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "doctor": {
      "id": "uuid",
      "name": "string"
    },
    "consultationType": "string",
    "chiefComplaint": "string",
    "clinicalNotes": "string",
    "examinationFindings": "string",
    "vitals": {},
    "status": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `CONSULTATION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/consultations/c1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /consultations

**Description:** Create a new consultation.

**Auth:** Required — `consultations:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  encounterId: uuid (required) - Encounter ID
  consultationType: string (required) - Type of consultation
  chiefComplaint: string (required) - Chief complaint
  clinicalNotes: string (optional) - Clinical notes
  examinationFindings: string (optional) - Examination findings
  vitals: object (optional) - Vital signs
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "encounterId": "uuid",
    "consultationType": "string",
    "status": "in-progress",
    "createdAt": "ISO8601"
  },
  "message": "Consultation created successfully"
}
```

**Response 404:** `ENCOUNTER_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/consultations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"encounterId":"e1b2c3d4...","consultationType":"initial","chiefComplaint":"Chronic back pain","clinicalNotes":"Patient reports persistent lower back pain"}'
```

---

### PUT /consultations/:id

**Description:** Update a consultation.

**Auth:** Required — `consultations:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Consultation ID
}
Body: {
  consultationType: string (optional) - Type of consultation
  chiefComplaint: string (optional) - Chief complaint
  clinicalNotes: string (optional) - Clinical notes
  examinationFindings: string (optional) - Examination findings
  vitals: object (optional) - Vital signs
  status: string (optional) - Consultation status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "ISO8601"
  },
  "message": "Consultation updated successfully"
}
```

**Response 404:** `CONSULTATION_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/consultations/c1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"clinicalNotes":"Updated notes after examination","examinationFindings":"Lumbar tenderness confirmed","status":"completed"}'
```

---

## Diagnosis Module

### GET /diagnoses

**Description:** List all diagnoses.

**Auth:** Required — `diagnoses:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  encounterId: uuid (optional) - Filter by encounter
  patientId: uuid (optional) - Filter by patient
  type: string (optional) - Filter by type (primary/secondary/differential)
  search: string (optional) - Search by diagnosis name
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "encounterId": "uuid",
        "patientId": "uuid",
        "doctorId": "uuid",
        "name": "string",
        "code": "string",
        "type": "string",
        "status": "string",
        "notes": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 80,
      "totalPages": 4
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/diagnoses?encounterId=e1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /diagnoses

**Description:** Create a new diagnosis.

**Auth:** Required — `diagnoses:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  encounterId: uuid (required) - Encounter ID
  patientId: uuid (required) - Patient ID
  doctorId: uuid (required) - Doctor ID
  name: string (required) - Diagnosis name
  code: string (optional) - ICD code
  type: string (required, enum: primary/secondary/differential) - Diagnosis type
  notes: string (optional) - Additional notes
  status: string (optional, default: "active") - Diagnosis status
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "encounterId": "uuid",
    "name": "string",
    "code": "string",
    "type": "string",
    "status": "string",
    "createdAt": "ISO8601"
  },
  "message": "Diagnosis added successfully"
}
```

**Response 404:** `ENCOUNTER_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/diagnoses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"encounterId":"e1b2c3d4...","patientId":"p1b2c3d4...","doctorId":"d1b2c3d4...","name":"Lumbar Spondylosis","code":"M47.816","type":"primary","notes":"Chronic degenerative changes in lumbar spine"}'
```

---

### PUT /diagnoses/:id

**Description:** Update a diagnosis.

**Auth:** Required — `diagnoses:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Diagnosis ID
}
Body: {
  name: string (optional) - Diagnosis name
  code: string (optional) - ICD code
  type: string (optional) - Diagnosis type
  notes: string (optional) - Additional notes
  status: string (optional) - Diagnosis status (active/resolved/inactive)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Diagnosis updated successfully"
}
```

**Response 404:** `DIAGNOSIS_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/diagnoses/d1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved","notes":"Patient responded well to treatment"}'
```

---

## Prescription Module

### GET /prescriptions

**Description:** List all prescriptions.

**Auth:** Required — `prescriptions:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  encounterId: uuid (optional) - Filter by encounter
  patientId: uuid (optional) - Filter by patient
  doctorId: uuid (optional) - Filter by doctor
  status: string (optional) - Filter by status
  date: ISO8601 date (optional) - Filter by date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "prescriptionNumber": "RX-2026-001",
        "encounterId": "uuid",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "medicines": [
          {
            "name": "string",
            "dosage": "string",
            "frequency": "string",
            "duration": "string"
          }
        ],
        "status": "string",
        "dispensedAt": "ISO8601",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/prescriptions?patientId=p1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /prescriptions/:id

**Description:** Get a specific prescription with full details.

**Auth:** Required — `prescriptions:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Prescription ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "prescriptionNumber": "RX-2026-001",
    "encounter": {
      "id": "uuid",
      "encounterNumber": "string"
    },
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "doctor": {
      "id": "uuid",
      "name": "string"
    },
    "medicines": [
      {
        "id": "uuid",
        "medicineId": "uuid",
        "name": "string",
        "dosage": "string",
        "frequency": "string",
        "duration": "string",
        "quantity": "string",
        "instructions": "string",
        "isAyurvedic": true,
        "category": "string"
      }
    ],
    "notes": "string",
    "status": "string",
    "dispensedAt": "ISO8601",
    "dispensedBy": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `PRESCRIPTION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/prescriptions/rx1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /prescriptions

**Description:** Create a new prescription.

**Auth:** Required — `prescriptions:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  encounterId: uuid (required) - Encounter ID
  patientId: uuid (required) - Patient ID
  doctorId: uuid (required) - Doctor ID
  medicines: array (required) - List of medicines [
    {
      medicineId: uuid (required) - Medicine ID
      dosage: string (required) - Dosage (e.g., "500mg")
      frequency: string (required) - Frequency (e.g., "twice daily")
      duration: string (required) - Duration (e.g., "7 days")
      quantity: string (optional) - Quantity to dispense
      instructions: string (optional) - Special instructions
    }
  ],
  notes: string (optional) - General prescription notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "prescriptionNumber": "RX-2026-002",
    "encounterId": "uuid",
    "medicines": [],
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "message": "Prescription created successfully"
}
```

**Response 404:** `ENCOUNTER_NOT_FOUND` or `MEDICINE_NOT_FOUND`  
**Response 422:** `VALIDATION_ERROR`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/prescriptions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"encounterId":"e1b2c3d4...","patientId":"p1b2c3d4...","doctorId":"d1b2c3d4...","medicines":[{"medicineId":"m1b2c3d4...","dosage":"500mg","frequency":"twice daily","duration":"7 days","instructions":"Take after food"}],"notes":"Complete course of medication"}'
```

---

### PUT /prescriptions/:id

**Description:** Update a prescription (only if not yet dispensed).

**Auth:** Required — `prescriptions:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Prescription ID
}
Body: {
  medicines: array (optional) - Updated list of medicines
  notes: string (optional) - General notes
  status: string (optional) - Prescription status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "ISO8601"
  },
  "message": "Prescription updated successfully"
}
```

**Response 404:** `PRESCRIPTION_NOT_FOUND`  
**Response 409:** `PRESCRIPTION_DISPENSED` (cannot update dispensed prescription)

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/prescriptions/rx1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"medicines":[{"medicineId":"m1b2c3d4...","dosage":"250mg","frequency":"three times daily","duration":"10 days"}]}'
```

---

## Referral Module

### GET /referrals

**Description:** List all referrals.

**Auth:** Required — `referrals:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  patientId: uuid (optional) - Filter by patient
  fromDoctorId: uuid (optional) - Filter by referring doctor
  toDoctorId: uuid (optional) - Filter by receiving doctor
  status: string (optional) - Filter by status
  department: string (optional) - Filter by department
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "referralNumber": "REF-2026-001",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "fromDoctor": {
          "id": "uuid",
          "name": "string"
        },
        "toDoctor": {
          "id": "uuid",
          "name": "string"
        },
        "department": "string",
        "reason": "string",
        "priority": "string",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 60,
      "totalPages": 3
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/referrals?status=pending" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /referrals/:id

**Description:** Get a specific referral with full details.

**Auth:** Required — `referrals:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Referral ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "referralNumber": "REF-2026-001",
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "encounter": {
      "id": "uuid",
      "encounterNumber": "string"
    },
    "fromDoctor": {
      "id": "uuid",
      "name": "string"
    },
    "toDoctor": {
      "id": "uuid",
      "name": "string"
    },
    "department": "string",
    "reason": "string",
    "clinicalNotes": "string",
    "priority": "string",
    "status": "string",
    "responseNotes": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `REFERRAL_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/referrals/rf1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /referrals

**Description:** Create a new referral.

**Auth:** Required — `referrals:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  patientId: uuid (required) - Patient ID
  encounterId: uuid (optional) - Encounter ID
  fromDoctorId: uuid (required) - Referring doctor ID
  toDoctorId: uuid (required) - Receiving doctor ID
  department: string (required) - Target department
  reason: string (required) - Reason for referral
  clinicalNotes: string (optional) - Clinical notes to share
  priority: string (optional, default: "normal") - Priority (low/normal/high/urgent)
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "referralNumber": "REF-2026-002",
    "patientId": "uuid",
    "fromDoctorId": "uuid",
    "toDoctorId": "uuid",
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "message": "Referral created successfully"
}
```

**Response 404:** `PATIENT_NOT_FOUND` or `DOCTOR_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/referrals \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"patientId":"p1b2c3d4...","fromDoctorId":"d1b2c3d4...","toDoctorId":"d2b2c3d4...","department":"Panchakarma","reason":"Patient requires specialized Panchakarma treatment","priority":"normal"}'
```

---

### PUT /referrals/:id

**Description:** Update a referral.

**Auth:** Required — `referrals:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Referral ID
}
Body: {
  toDoctorId: uuid (optional) - Receiving doctor ID
  department: string (optional) - Target department
  reason: string (optional) - Reason for referral
  clinicalNotes: string (optional) - Clinical notes
  priority: string (optional) - Priority level
  status: string (optional) - Referral status
  responseNotes: string (optional) - Response notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "ISO8601"
  },
  "message": "Referral updated successfully"
}
```

**Response 404:** `REFERRAL_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/referrals/rf1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"priority":"high","clinicalNotes":"Patient condition has worsened, requires urgent evaluation"}'
```

---

### PATCH /referrals/:id/status

**Description:** Update referral status.

**Auth:** Required — `referrals:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Referral ID
}
Body: {
  status: string (required, enum: accepted/rejected/completed) - New status
  responseNotes: string (optional) - Response notes from receiving doctor
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Referral status updated"
}
```

**Response 404:** `REFERRAL_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/referrals/rf1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"accepted","responseNotes":"Will see the patient tomorrow morning"}'
```

---

### GET /referrals/:id/history

**Description:** Get the complete history/audit trail of a referral.

**Auth:** Required — `referrals:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Referral ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "referralId": "uuid",
    "history": [
      {
        "action": "created",
        "performedBy": {
          "id": "uuid",
          "name": "string"
        },
        "timestamp": "ISO8601",
        "details": "Referral created"
      },
      {
        "action": "status_changed",
        "performedBy": {
          "id": "uuid",
          "name": "string"
        },
        "timestamp": "ISO8601",
        "details": "Status changed from pending to accepted",
        "previousStatus": "pending",
        "newStatus": "accepted"
      }
    ]
  }
}
```

**Response 404:** `REFERRAL_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/referrals/rf1b2c3d4-e5f6-7890-abcd-ef1234567890/history \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Timeline Module

### GET /timeline/patient/:patientId

**Description:** Get the complete patient timeline with all encounters, prescriptions, referrals, and treatments.

**Auth:** Required — `patients:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  patientId: uuid (required) - Patient ID
}
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 50) - Items per page
  type: string (optional) - Filter by event type (encounter/prescription/referral/treatment)
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "timeline": [
      {
        "id": "uuid",
        "type": "encounter",
        "date": "ISO8601",
        "title": "OPD Visit #45",
        "description": "Follow-up for chronic back pain",
        "doctor": "Dr. Sharma",
        "details": {
          "encounterId": "uuid",
          "diagnosis": ["Lumbar Spondylosis"],
          "prescriptions": 2
        }
      },
      {
        "id": "uuid",
        "type": "prescription",
        "date": "ISO8601",
        "title": "Prescription RX-2026-001",
        "description": "3 medicines prescribed",
        "doctor": "Dr. Sharma",
        "details": {
          "prescriptionId": "uuid",
          "medicineCount": 3,
          "dispensed": true
        }
      },
      {
        "id": "uuid",
        "type": "referral",
        "date": "ISO8601",
        "title": "Referral to Panchakarma",
        "description": "Referred for specialized treatment",
        "doctor": "Dr. Sharma",
        "details": {
          "referralId": "uuid",
          "toDoctor": "Dr. Patel",
          "department": "Panchakarma",
          "status": "accepted"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 45,
      "totalPages": 1
    }
  }
}
```

**Response 404:** `PATIENT_NOT_FOUND`

**Example:**

```bash
curl "http://localhost:8080/api/v1/timeline/patient/p1b2c3d4-e5f6-7890-abcd-ef1234567890?type=encounter&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Pharmacy Module

### GET /medicines

**Description:** List all medicines with filtering.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  search: string (optional) - Search by name
  category: string (optional) - Filter by category
  supplierId: uuid (optional) - Filter by supplier
  isAyurvedic: boolean (optional) - Filter Ayurvedic medicines
  stockStatus: string (optional) - Filter by stock status (in-stock/low/out-of-stock)
  expiryStatus: string (optional) - Filter by expiry (valid/expiring/expired)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "genericName": "string",
        "category": {
          "id": "uuid",
          "name": "string"
        },
        "manufacturer": "string",
        "isAyurvedic": true,
        "form": "string",
        "strength": "string",
        "unit": "string",
        "currentStock": 150,
        "minimumStock": 50,
        "maximumStock": 500,
        "stockStatus": "string",
        "expiryDate": "ISO8601",
        "batchNumber": "string",
        "mrp": 120.00,
        "costPrice": 80.00,
        "status": "string"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 300,
      "totalPages": 15
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/medicines?search=ashwagandha&isAyurvedic=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /medicines/:id

**Description:** Get a specific medicine with full details.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Medicine ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "genericName": "string",
    "category": {
      "id": "uuid",
      "name": "string"
    },
    "supplier": {
      "id": "uuid",
      "name": "string"
    },
    "manufacturer": "string",
    "isAyurvedic": true,
    "form": "string",
    "strength": "string",
    "unit": "string",
    "description": "string",
    "composition": "string",
    "dosageForm": "string",
    "currentStock": 150,
    "minimumStock": 50,
    "maximumStock": 500,
    "stockStatus": "string",
    "batches": [
      {
        "batchNumber": "string",
        "quantity": 100,
        "expiryDate": "ISO8601",
        "mrp": 120.00,
        "costPrice": 80.00,
        "manufacturingDate": "ISO8601"
      }
    ],
    "usageStatistics": {
      "totalDispensed": 500,
      "averageMonthlyUsage": 50
    },
    "status": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `MEDICINE_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/medicines/m1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /medicines

**Description:** Add a new medicine to inventory.

**Auth:** Required — `pharmacy:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (required) - Medicine name
  genericName: string (optional) - Generic name
  categoryId: uuid (required) - Category ID
  supplierId: uuid (optional) - Supplier ID
  manufacturer: string (optional) - Manufacturer name
  isAyurvedic: boolean (optional, default: false) - Is Ayurvedic medicine
  form: string (required) - Form (tablet/capsule/syrup/powder/oil/ghrita/lehya/paste)
  strength: string (optional) - Strength (e.g., "500mg")
  unit: string (required) - Unit (tablets/capsules/ml/gm/ltr)
  description: string (optional) - Description
  composition: string (optional) - Composition details
  dosageForm: string (optional) - Dosage form
  currentStock: number (required, min: 0) - Initial stock
  minimumStock: number (required) - Minimum stock level
  maximumStock: number (required) - Maximum stock level
  batches: array (optional) - Batch details [
    {
      batchNumber: string (required)
      quantity: number (required)
      expiryDate: ISO8601 (required)
      mrp: number (required, min: 0)
      costPrice: number (required, min: 0)
      manufacturingDate: ISO8601 (optional)
    }
  ]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "category": "string",
    "currentStock": 150,
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Medicine added successfully"
}
```

**Response 409:** `MEDICINE_EXISTS`  
**Response 422:** `VALIDATION_ERROR`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/medicines \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Ashwagandha Churna","categoryId":"c1b2c3d4...","isAyurvedic":true,"form":"powder","unit":"gm","currentStock":500,"minimumStock":100,"maximumStock":2000,"batches":[{"batchNumber":"ASH-2026-001","quantity":500,"expiryDate":"2028-12-31","mrp":150,"costPrice":100}]}'
```

---

### PUT /medicines/:id

**Description:** Update medicine details.

**Auth:** Required — `pharmacy:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Medicine ID
}
Body: {
  name: string (optional) - Medicine name
  genericName: string (optional) - Generic name
  categoryId: uuid (optional) - Category ID
  supplierId: uuid (optional) - Supplier ID
  manufacturer: string (optional) - Manufacturer
  isAyurvedic: boolean (optional) - Is Ayurvedic
  form: string (optional) - Form
  strength: string (optional) - Strength
  unit: string (optional) - Unit
  description: string (optional) - Description
  minimumStock: number (optional) - Minimum stock
  maximumStock: number (optional) - Maximum stock
  status: string (optional) - Status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Medicine updated successfully"
}
```

**Response 404:** `MEDICINE_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/medicines/m1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"minimumStock":200,"maximumStock":3000,"description":"Premium quality Ashwagandha churna"}'
```

---

### POST /medicines/:id/stock

**Description:** Add stock to a medicine (receive inventory).

**Auth:** Required — `pharmacy:stock-update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Medicine ID
}
Body: {
  quantity: number (required, min: 1) - Quantity to add
  batchNumber: string (required) - Batch number
  expiryDate: ISO8601 (required) - Expiry date
  mrp: number (required, min: 0) - MRP
  costPrice: number (required, min: 0) - Cost price
  manufacturingDate: ISO8601 (optional) - Manufacturing date
  supplierId: uuid (optional) - Supplier ID
  purchaseOrderId: uuid (optional) - Purchase order ID
  notes: string (optional) - Notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "medicineId": "uuid",
    "previousStock": 150,
    "addedQuantity": 100,
    "newStock": 250,
    "batch": {
      "batchNumber": "string",
      "quantity": 100,
      "expiryDate": "ISO8601"
    }
  },
  "message": "Stock added successfully"
}
```

**Response 404:** `MEDICINE_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/medicines/m1b2c3d4-e5f6-7890-abcd-ef1234567890/stock \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"quantity":100,"batchNumber":"ASH-2026-002","expiryDate":"2028-06-30","mrp":150,"costPrice":100}'
```

---

### POST /prescriptions/:id/dispense

**Description:** Dispense medicines for a prescription.

**Auth:** Required — `pharmacy:dispense`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Prescription ID
}
Body: {
  items: array (required) - Dispensed items [
    {
      medicineId: uuid (required) - Medicine ID
      batchNumber: string (required) - Batch number
      quantityDispensed: number (required, min: 1) - Quantity dispensed
    }
  ],
  notes: string (optional) - Dispensing notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "prescriptionId": "uuid",
    "prescriptionNumber": "RX-2026-001",
    "dispensedAt": "ISO8601",
    "dispensedBy": {
      "id": "uuid",
      "name": "string"
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "batchNumber": "string",
        "quantityDispensed": 14,
        "unitPrice": 120.00,
        "totalPrice": 1680.00
      }
    ],
    "totalAmount": 1680.00
  },
  "message": "Prescription dispensed successfully"
}
```

**Response 404:** `PRESCRIPTION_NOT_FOUND`  
**Response 409:** `INSUFFICIENT_STOCK` or `ALREADY_DISPENSED`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/prescriptions/rx1b2c3d4-e5f6-7890-abcd-ef1234567890/dispense \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"items":[{"medicineId":"m1b2c3d4...","batchNumber":"ASH-2026-001","quantityDispensed":14}],"notes":"Dispensed full course"}'
```

---

### GET /pharmacy/categories

**Description:** List all medicine categories.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 50) - Items per page
  search: string (optional) - Search by name
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string",
        "parentCategoryId": "uuid",
        "medicineCount": 25,
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/pharmacy/categories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /pharmacy/categories

**Description:** Create a new medicine category.

**Auth:** Required — `pharmacy:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (2-100 chars, required) - Category name
  description: string (optional) - Category description
  parentCategoryId: uuid (optional) - Parent category ID
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Category created successfully"
}
```

**Response 409:** `CATEGORY_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/pharmacy/categories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Ayurvedic Formulations","description":"Traditional Ayurvedic medicine formulations"}'
```

---

### PUT /pharmacy/categories/:id

**Description:** Update a medicine category.

**Auth:** Required — `pharmacy:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Category ID
}
Body: {
  name: string (optional) - Category name
  description: string (optional) - Description
  parentCategoryId: uuid (optional) - Parent category ID
  status: string (optional) - Status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Category updated successfully"
}
```

**Response 404:** `CATEGORY_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/pharmacy/categories/c1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated category description"}'
```

---

### GET /pharmacy/suppliers

**Description:** List all suppliers.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  search: string (optional) - Search by name
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "contactPerson": "string",
        "phone": "string",
        "email": "string",
        "address": "string",
        "gstNumber": "string",
        "medicineCount": 50,
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 20,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/pharmacy/suppliers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /pharmacy/suppliers/:id

**Description:** Get a specific supplier with details.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Supplier ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "contactPerson": "string",
    "phone": "string",
    "email": "string",
    "address": {
      "line1": "string",
      "city": "string",
      "state": "string",
      "pincode": "string"
    },
    "gstNumber": "string",
    "panNumber": "string",
    "bankDetails": {
      "bankName": "string",
      "accountNumber": "string",
      "ifscCode": "string"
    },
    "medicines": [
      {
        "id": "uuid",
        "name": "string"
      }
    ],
    "purchaseOrders": 15,
    "status": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `SUPPLIER_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/pharmacy/suppliers/s1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /pharmacy/suppliers

**Description:** Add a new supplier.

**Auth:** Required — `pharmacy:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (required) - Supplier name
  contactPerson: string (optional) - Contact person name
  phone: string (required) - Phone number
  email: string (optional) - Email address
  address: {
    line1: string (optional) - Address line 1
    city: string (optional) - City
    state: string (optional) - State
    pincode: string (optional) - Pincode
  },
  gstNumber: string (optional) - GST number
  panNumber: string (optional) - PAN number
  bankDetails: {
    bankName: string (optional) - Bank name
    accountNumber: string (optional) - Account number
    ifscCode: string (optional) - IFSC code
  }
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "phone": "string",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Supplier added successfully"
}
```

**Response 409:** `SUPPLIER_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/pharmacy/suppliers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Ayurveda Pharma Corp","contactPerson":"Rajesh Gupta","phone":"+91-9876543210","email":"rajesh@ayurvedapharma.com","gstNumber":"07AABCU9603R1ZM"}'
```

---

### PUT /pharmacy/suppliers/:id

**Description:** Update a supplier.

**Auth:** Required — `pharmacy:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Supplier ID
}
Body: {
  name: string (optional) - Supplier name
  contactPerson: string (optional) - Contact person
  phone: string (optional) - Phone number
  email: string (optional) - Email
  address: object (optional) - Address
  gstNumber: string (optional) - GST number
  panNumber: string (optional) - PAN number
  bankDetails: object (optional) - Bank details
  status: string (optional) - Status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Supplier updated successfully"
}
```

**Response 404:** `SUPPLIER_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/pharmacy/suppliers/s1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91-9999888877","email":"updated@ayurvedapharma.com"}'
```

---

### GET /pharmacy/purchase-orders

**Description:** List all purchase orders.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  supplierId: uuid (optional) - Filter by supplier
  status: string (optional) - Filter by status (draft/pending/approved/received/cancelled)
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "poNumber": "PO-2026-001",
        "supplier": {
          "id": "uuid",
          "name": "string"
        },
        "totalAmount": 50000.00,
        "itemCount": 10,
        "status": "string",
        "expectedDeliveryDate": "ISO8601",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 30,
      "totalPages": 2
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/pharmacy/purchase-orders?status=pending" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /pharmacy/purchase-orders/:id

**Description:** Get a specific purchase order with full details.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Purchase Order ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "poNumber": "PO-2026-001",
    "supplier": {
      "id": "uuid",
      "name": "string",
      "contactPerson": "string",
      "phone": "string"
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "quantity": 100,
        "unitPrice": 100.00,
        "totalPrice": 10000.00,
        "receivedQuantity": 0
      }
    ],
    "totalAmount": 50000.00,
    "taxAmount": 9000.00,
    "grandTotal": 59000.00,
    "status": "string",
    "expectedDeliveryDate": "ISO8601",
    "actualDeliveryDate": "ISO8601",
    "notes": "string",
    "approvedBy": {
      "id": "uuid",
      "name": "string"
    },
    "approvedAt": "ISO8601",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `PURCHASE_ORDER_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/pharmacy/purchase-orders/po1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /pharmacy/purchase-orders

**Description:** Create a new purchase order.

**Auth:** Required — `pharmacy:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  supplierId: uuid (required) - Supplier ID
  items: array (required) - Order items [
    {
      medicineId: uuid (required) - Medicine ID
      quantity: number (required, min: 1) - Quantity to order
      unitPrice: number (required, min: 0) - Unit price
    }
  ],
  expectedDeliveryDate: ISO8601 date (required) - Expected delivery date
  notes: string (optional) - Order notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "poNumber": "PO-2026-002",
    "supplierId": "uuid",
    "totalAmount": 50000.00,
    "status": "draft",
    "createdAt": "ISO8601"
  },
  "message": "Purchase order created successfully"
}
```

**Response 404:** `SUPPLIER_NOT_FOUND` or `MEDICINE_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/pharmacy/purchase-orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"supplierId":"s1b2c3d4...","items":[{"medicineId":"m1b2c3d4...","quantity":100,"unitPrice":100}],"expectedDeliveryDate":"2026-02-15","notes":"Monthly stock replenishment"}'
```

---

### PUT /pharmacy/purchase-orders/:id

**Description:** Update a purchase order (only in draft status).

**Auth:** Required — `pharmacy:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Purchase Order ID
}
Body: {
  items: array (optional) - Updated order items
  expectedDeliveryDate: ISO8601 date (optional) - Expected delivery date
  notes: string (optional) - Order notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "poNumber": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Purchase order updated successfully"
}
```

**Response 404:** `PURCHASE_ORDER_NOT_FOUND`  
**Response 409:** `PO_NOT_EDITABLE` (not in draft status)

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/pharmacy/purchase-orders/po1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"expectedDeliveryDate":"2026-02-20","notes":"Updated delivery date"}'
```

---

### PATCH /pharmacy/purchase-orders/:id/status

**Description:** Update purchase order status.

**Auth:** Required — `pharmacy:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Purchase Order ID
}
Body: {
  status: string (required, enum: pending/approved/cancelled) - New status
  notes: string (optional) - Status change notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Purchase order status updated"
}
```

**Response 404:** `PURCHASE_ORDER_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/pharmacy/purchase-orders/po1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","notes":"Approved by pharmacy manager"}'
```

---

### POST /pharmacy/purchase-orders/:id/receive

**Description:** Receive items against a purchase order.

**Auth:** Required — `pharmacy:stock-update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Purchase Order ID
}
Body: {
  items: array (required) - Received items [
    {
      medicineId: uuid (required) - Medicine ID
      quantityReceived: number (required, min: 1) - Quantity received
      batchNumber: string (required) - Batch number
      expiryDate: ISO8601 (required) - Expiry date
      mrp: number (required) - MRP
      costPrice: number (required) - Cost price
      manufacturingDate: ISO8601 (optional) - Manufacturing date
    }
  ],
  notes: string (optional) - Receiving notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "purchaseOrderId": "uuid",
    "poNumber": "string",
    "receivedAt": "ISO8601",
    "receivedBy": {
      "id": "uuid",
      "name": "string"
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "quantityReceived": 100,
        "batchNumber": "string",
        "stockUpdated": true
      }
    ]
  },
  "message": "Items received successfully"
}
```

**Response 404:** `PURCHASE_ORDER_NOT_FOUND`  
**Response 409:** `PO_NOT_RECEIVED_STATUS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/pharmacy/purchase-orders/po1b2c3d4-e5f6-7890-abcd-ef1234567890/receive \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"items":[{"medicineId":"m1b2c3d4...","quantityReceived":100,"batchNumber":"ASH-2026-003","expiryDate":"2028-12-31","mrp":150,"costPrice":100}],"notes":"All items received in good condition"}'
```

---

### GET /pharmacy/material-requests

**Description:** List all material requests.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  requestedBy: uuid (optional) - Filter by requester
  department: string (optional) - Filter by department
  status: string (optional) - Filter by status (pending/approved/dispensed/rejected)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "requestNumber": "MR-2026-001",
        "requestedBy": {
          "id": "uuid",
          "name": "string"
        },
        "department": "string",
        "items": [
          {
            "medicineName": "string",
            "quantityRequested": 50,
            "quantityDispensed": 0
          }
        ],
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 40,
      "totalPages": 2
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/pharmacy/material-requests?status=pending" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /pharmacy/material-requests/:id

**Description:** Get a specific material request.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Material Request ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestNumber": "MR-2026-001",
    "requestedBy": {
      "id": "uuid",
      "name": "string",
      "department": "string"
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "quantityRequested": 50,
        "quantityDispensed": 0,
        "batchNumber": "string",
        "status": "string"
      }
    ],
    "reason": "string",
    "priority": "string",
    "status": "string",
    "approvedBy": {
      "id": "uuid",
      "name": "string"
    },
    "approvedAt": "ISO8601",
    "dispensedBy": {
      "id": "uuid",
      "name": "string"
    },
    "dispensedAt": "ISO8601",
    "rejectedBy": {
      "id": "uuid",
      "name": "string"
    },
    "rejectionReason": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `MATERIAL_REQUEST_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/pharmacy/material-requests/mr1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /pharmacy/material-requests

**Description:** Create a new material request.

**Auth:** Required — `pharmacy:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  department: string (required) - Requesting department
  items: array (required) - Requested items [
    {
      medicineId: uuid (required) - Medicine ID
      quantityRequested: number (required, min: 1) - Quantity requested
    }
  ],
  reason: string (optional) - Reason for request
  priority: string (optional, default: "normal") - Priority (low/normal/high/urgent)
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestNumber": "MR-2026-002",
    "department": "string",
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "message": "Material request created successfully"
}
```

**Response 404:** `MEDICINE_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/pharmacy/material-requests \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"department":"Panchakarma","items":[{"medicineId":"m1b2c3d4...","quantityRequested":50}],"reason":"Monthly stock replenishment for Panchakarma ward","priority":"normal"}'
```

---

### PATCH /pharmacy/material-requests/:id/approve

**Description:** Approve a material request.

**Auth:** Required — `pharmacy:approve`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Material Request ID
}
Body: {
  notes: string (optional) - Approval notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approvedBy": {
      "id": "uuid",
      "name": "string"
    },
    "approvedAt": "ISO8601"
  },
  "message": "Material request approved"
}
```

**Response 404:** `MATERIAL_REQUEST_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/pharmacy/material-requests/mr1b2c3d4-e5f6-7890-abcd-ef1234567890/approve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"notes":"Approved, stock available"}'
```

---

### PATCH /pharmacy/material-requests/:id/dispense

**Description:** Dispense items for an approved material request.

**Auth:** Required — `pharmacy:dispense`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Material Request ID
}
Body: {
  items: array (required) - Dispensed items [
    {
      medicineId: uuid (required) - Medicine ID
      quantityDispensed: number (required, min: 1) - Quantity dispensed
      batchNumber: string (required) - Batch number
    }
  ],
  notes: string (optional) - Dispensing notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "dispensed",
    "dispensedBy": {
      "id": "uuid",
      "name": "string"
    },
    "dispensedAt": "ISO8601",
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "quantityDispensed": 50,
        "batchNumber": "string"
      }
    ]
  },
  "message": "Material request dispensed"
}
```

**Response 404:** `MATERIAL_REQUEST_NOT_FOUND`  
**Response 409:** `INSUFFICIENT_STOCK`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/pharmacy/material-requests/mr1b2c3d4-e5f6-7890-abcd-ef1234567890/dispense \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"items":[{"medicineId":"m1b2c3d4...","quantityDispensed":50,"batchNumber":"ASH-2026-001"}]}'
```

---

### PATCH /pharmacy/material-requests/:id/reject

**Description:** Reject a material request.

**Auth:** Required — `pharmacy:approve`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Material Request ID
}
Body: {
  reason: string (required) - Rejection reason
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "rejected",
    "rejectedBy": {
      "id": "uuid",
      "name": "string"
    },
    "rejectionReason": "string",
    "rejectedAt": "ISO8601"
  },
  "message": "Material request rejected"
}
```

**Response 404:** `MATERIAL_REQUEST_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/pharmacy/material-requests/mr1b2c3d4-e5f6-7890-abcd-ef1234567890/reject \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"reason":"Insufficient stock, will be fulfilled next week"}'
```

---

### GET /pharmacy/dashboard

**Description:** Get pharmacy dashboard summary data.

**Auth:** Required — `pharmacy:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalMedicines": 300,
    "inStockMedicines": 280,
    "lowStockMedicines": 15,
    "outOfStockMedicines": 5,
    "expiringSoon": 8,
    "expiredMedicines": 2,
    "totalInventoryValue": 1500000.00,
    "todayDispensings": 45,
    "todayRevenue": 25000.00,
    "pendingRequests": 12,
    "recentDispensings": [
      {
        "id": "uuid",
        "prescriptionNumber": "string",
        "patientName": "string",
        "amount": 1500.00,
        "dispensedAt": "ISO8601"
      }
    ],
    "lowStockAlerts": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "currentStock": 5,
        "minimumStock": 50
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/pharmacy/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /pharmacy/reports/stock

**Description:** Get stock report with current inventory status.

**Auth:** Required — `pharmacy:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  category: string (optional) - Filter by category
  supplierId: uuid (optional) - Filter by supplier
  stockStatus: string (optional) - Filter by stock status
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalMedicines": 300,
      "totalStockValue": 1500000.00,
      "lowStockCount": 15,
      "outOfStockCount": 5
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "category": "string",
        "currentStock": 150,
        "minimumStock": 50,
        "stockValue": 15000.00,
        "lastReceived": "ISO8601",
        "stockStatus": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/pharmacy/reports/stock?category=Ayurvedic" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /pharmacy/reports/dispensing

**Description:** Get dispensing report.

**Auth:** Required — `pharmacy:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
  doctorId: uuid (optional) - Filter by doctor
  category: string (optional) - Filter by medicine category
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDispensings": 450,
      "totalRevenue": 125000.00,
      "uniquePatients": 380,
      "averagePerDay": 30
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "quantityDispensed": 500,
        "revenue": 15000.00,
        "dispensingCount": 120
      }
    ],
    "dailyTrend": [
      {
        "date": "ISO8601",
        "dispensings": 30,
        "revenue": 8500.00
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/pharmacy/reports/dispensing?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /pharmacy/reports/expiry

**Description:** Get expiry report for medicines.

**Auth:** Required — `pharmacy:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  days: integer (optional, default: 90) - Expiry window in days
  status: string (optional) - Filter (expiring/expired)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "expiringWithin90Days": 8,
      "expired": 2,
      "totalValueAtRisk": 45000.00
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "batchNumber": "string",
        "quantity": 50,
        "expiryDate": "ISO8601",
        "daysUntilExpiry": 45,
        "value": 6000.00,
        "status": "expiring"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/pharmacy/reports/expiry?days=60" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Panchakarma Module

### GET /panchakarma/therapy-types

**Description:** List all Panchakarma therapy types.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  category: string (optional) - Filter by category (vamana/virechana/basti/nasya/raktamokshana/other)
  search: string (optional) - Search by name
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "category": "string",
        "description": "string",
        "duration": "string",
        "sessionsRequired": 7,
        "basePrice": 2500.00,
        "materials": ["string"],
        "isActive": true,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/therapy-types?category=vamana" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/therapy-types/:id

**Description:** Get a specific therapy type with full details.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Therapy Type ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "category": "string",
    "description": "string",
    "duration": "string",
    "sessionsRequired": 7,
    "basePrice": 2500.00,
    "materials": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string"
      }
    ],
    "contraindications": ["string"],
    "isActive": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `THERAPY_TYPE_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/therapy-types/t1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /panchakarma/therapy-types

**Description:** Create a new therapy type.

**Auth:** Required — `panchakarma:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (required) - Therapy name
  category: string (required, enum: vamana/virechana/basti/nasya/raktamokshana/other) - Category
  description: string (optional) - Description
  duration: string (required) - Duration (e.g., "45 minutes")
  sessionsRequired: number (required, min: 1) - Number of sessions required
  basePrice: number (required, min: 0) - Base price per session
  materials: array (optional) - Required materials [
    {
      name: string (required) - Material name
      quantity: string (required) - Quantity
      unit: string (required) - Unit
    }
  ],
  contraindications: array of strings (optional) - Contraindications
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "category": "string",
    "isActive": true,
    "createdAt": "ISO8601"
  },
  "message": "Therapy type created successfully"
}
```

**Response 409:** `THERAPY_TYPE_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/panchakarma/therapy-types \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Basti Karma","category":"basti","description":"Medicated enema therapy","duration":"45 minutes","sessionsRequired":7,"basePrice":2500,"materials":[{"name":"Medicated Oil","quantity":"50","unit":"ml"}]}'
```

---

### PUT /panchakarma/therapy-types/:id

**Description:** Update a therapy type.

**Auth:** Required — `panchakarma:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Therapy Type ID
}
Body: {
  name: string (optional) - Therapy name
  category: string (optional) - Category
  description: string (optional) - Description
  duration: string (optional) - Duration
  sessionsRequired: number (optional) - Sessions required
  basePrice: number (optional) - Base price
  materials: array (optional) - Required materials
  contraindications: array (optional) - Contraindications
  isActive: boolean (optional) - Active status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Therapy type updated successfully"
}
```

**Response 404:** `THERAPY_TYPE_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/panchakarma/therapy-types/t1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"basePrice":3000,"description":"Updated therapy description"}'
```

---

### GET /panchakarma/plans

**Description:** List all Panchakarma treatment plans.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  patientId: uuid (optional) - Filter by patient
  doctorId: uuid (optional) - Filter by doctor
  status: string (optional) - Filter by status (draft/active/completed/cancelled)
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "planNumber": "PK-PLAN-2026-001",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "therapies": ["string"],
        "totalSessions": 21,
        "completedSessions": 5,
        "status": "string",
        "startDate": "ISO8601",
        "expectedEndDate": "ISO8601",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 40,
      "totalPages": 2
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/plans?status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/plans/:id

**Description:** Get a specific treatment plan with full details.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Plan ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "planNumber": "PK-PLAN-2026-001",
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "doctor": {
      "id": "uuid",
      "name": "string"
    },
    "therapies": [
      {
        "therapyTypeId": "uuid",
        "therapyName": "string",
        "sessionsPlanned": 7,
        "sessionsCompleted": 2,
        "pricePerSession": 2500.00
      }
    ],
    "totalSessions": 21,
    "completedSessions": 5,
    "totalAmount": 52500.00,
    "paidAmount": 15000.00,
    "status": "string",
    "startDate": "ISO8601",
    "expectedEndDate": "ISO8601",
    "actualEndDate": "ISO8601",
    "notes": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `TREATMENT_PLAN_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/plans/tp1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /panchakarma/plans

**Description:** Create a new treatment plan.

**Auth:** Required — `panchakarma:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  patientId: uuid (required) - Patient ID
  doctorId: uuid (required) - Doctor ID
  therapies: array (required) - Therapies [
    {
      therapyTypeId: uuid (required) - Therapy Type ID
      sessionsPlanned: number (required, min: 1) - Sessions planned
      pricePerSession: number (required, min: 0) - Price per session
    }
  ],
  startDate: ISO8601 date (required) - Start date
  notes: string (optional) - Treatment notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "planNumber": "PK-PLAN-2026-002",
    "patientId": "uuid",
    "doctorId": "uuid",
    "status": "draft",
    "createdAt": "ISO8601"
  },
  "message": "Treatment plan created successfully"
}
```

**Response 404:** `PATIENT_NOT_FOUND` or `DOCTOR_NOT_FOUND` or `THERAPY_TYPE_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/panchakarma/plans \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"patientId":"p1b2c3d4...","doctorId":"d1b2c3d4...","therapies":[{"therapyTypeId":"t1b2c3d4...","sessionsPlanned":7,"pricePerSession":2500}],"startDate":"2026-01-20","notes":"Comprehensive Panchakarma treatment for chronic conditions"}'
```

---

### PUT /panchakarma/plans/:id

**Description:** Update a treatment plan.

**Auth:** Required — `panchakarma:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Plan ID
}
Body: {
  therapies: array (optional) - Updated therapies
  startDate: ISO8601 date (optional) - Start date
  notes: string (optional) - Treatment notes
  status: string (optional) - Plan status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "planNumber": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Treatment plan updated successfully"
}
```

**Response 404:** `TREATMENT_PLAN_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/panchakarma/plans/tp1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"notes":"Updated treatment plan based on patient progress"}'
```

---

### PATCH /panchakarma/plans/:id/status

**Description:** Update treatment plan status.

**Auth:** Required — `panchakarma:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Plan ID
}
Body: {
  status: string (required, enum: active/completed/cancelled) - New status
  notes: string (optional) - Status change notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Treatment plan status updated"
}
```

**Response 404:** `TREATMENT_PLAN_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/panchakarma/plans/tp1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"active","notes":"Plan activated, starting treatment"}'
```

---

### GET /panchakarma/plans/:id/sessions

**Description:** Get all sessions for a treatment plan.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Plan ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "planId": "uuid",
    "sessions": [
      {
        "id": "uuid",
        "sessionNumber": 1,
        "therapyType": "string",
        "scheduledDate": "ISO8601",
        "scheduledTime": "HH:mm",
        "therapist": {
          "id": "uuid",
          "name": "string"
        },
        "status": "string",
        "notes": "string"
      }
    ]
  }
}
```

**Response 404:** `TREATMENT_PLAN_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/plans/tp1b2c3d4-e5f6-7890-abcd-ef1234567890/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/plans/patient/:patientId

**Description:** Get all treatment plans for a specific patient.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  patientId: uuid (required) - Patient ID
}
Params (Query): {
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "plans": [
      {
        "id": "uuid",
        "planNumber": "string",
        "therapies": ["string"],
        "totalSessions": 21,
        "completedSessions": 5,
        "status": "string",
        "startDate": "ISO8601",
        "expectedEndDate": "ISO8601"
      }
    ]
  }
}
```

**Response 404:** `PATIENT_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/plans/patient/p1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/sessions

**Description:** List all Panchakarma sessions.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  planId: uuid (optional) - Filter by plan
  therapistId: uuid (optional) - Filter by therapist
  patientId: uuid (optional) - Filter by patient
  date: ISO8601 date (optional) - Filter by date
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "sessionNumber": 1,
        "plan": {
          "id": "uuid",
          "planNumber": "string"
        },
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "therapist": {
          "id": "uuid",
          "name": "string"
        },
        "therapyType": "string",
        "scheduledDate": "ISO8601",
        "scheduledTime": "HH:mm",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/sessions?date=2026-01-15&therapistId=th1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/sessions/:id

**Description:** Get a specific session with full details.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Session ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionNumber": 1,
    "plan": {
      "id": "uuid",
      "planNumber": "string"
    },
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "therapist": {
      "id": "uuid",
      "name": "string"
    },
    "therapyType": {
      "id": "uuid",
      "name": "string"
    },
    "scheduledDate": "ISO8601",
    "scheduledTime": "HH:mm",
    "actualStartTime": "ISO8601",
    "actualEndTime": "ISO8601",
    "status": "string",
    "preSessionNotes": "string",
    "postSessionNotes": "string",
    "outcome": "string",
    "materialsUsed": [
      {
        "name": "string",
        "quantity": "string"
      }
    ],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `SESSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/sessions/s1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /panchakarma/sessions

**Description:** Create a new session.

**Auth:** Required — `panchakarma:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  planId: uuid (required) - Treatment plan ID
  patientId: uuid (required) - Patient ID
  therapistId: uuid (required) - Therapist ID
  therapyTypeId: uuid (required) - Therapy type ID
  scheduledDate: ISO8601 date (required) - Scheduled date
  scheduledTime: string (required, HH:mm format) - Scheduled time
  preSessionNotes: string (optional) - Pre-session notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionNumber": 1,
    "planId": "uuid",
    "scheduledDate": "ISO8601",
    "scheduledTime": "HH:mm",
    "status": "scheduled",
    "createdAt": "ISO8601"
  },
  "message": "Session created successfully"
}
```

**Response 404:** `TREATMENT_PLAN_NOT_FOUND` or `PATIENT_NOT_FOUND` or `THERAPIST_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/panchakarma/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"planId":"tp1b2c3d4...","patientId":"p1b2c3d4...","therapistId":"th1b2c3d4...","therapyTypeId":"t1b2c3d4...","scheduledDate":"2026-01-20","scheduledTime":"10:00","preSessionNotes":"Patient should fast for 4 hours before session"}'
```

---

### PUT /panchakarma/sessions/:id

**Description:** Update a session.

**Auth:** Required — `panchakarma:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Session ID
}
Body: {
  therapistId: uuid (optional) - Therapist ID
  scheduledDate: ISO8601 date (optional) - Scheduled date
  scheduledTime: string (optional) - Scheduled time
  preSessionNotes: string (optional) - Pre-session notes
  postSessionNotes: string (optional) - Post-session notes
  status: string (optional) - Session status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionNumber": 1,
    "updatedAt": "ISO8601"
  },
  "message": "Session updated successfully"
}
```

**Response 404:** `SESSION_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/panchakarma/sessions/s1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"therapistId":"th2b2c3d4...","scheduledTime":"11:00"}'
```

---

### PATCH /panchakarma/sessions/:id/status

**Description:** Update session status.

**Auth:** Required — `panchakarma:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Session ID
}
Body: {
  status: string (required, enum: scheduled/in-progress/completed/cancelled/no-show) - New status
  notes: string (optional) - Status change notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Session status updated"
}
```

**Response 404:** `SESSION_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/panchakarma/sessions/s1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

---

### PATCH /panchakarma/sessions/:id/notes

**Description:** Update session notes.

**Auth:** Required — `panchakarma:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Session ID
}
Body: {
  preSessionNotes: string (optional) - Pre-session notes
  postSessionNotes: string (optional) - Post-session notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "ISO8601"
  },
  "message": "Session notes updated"
}
```

**Response 404:** `SESSION_NOT_FOUND`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/panchakarma/sessions/s1b2c3d4-e5f6-7890-abcd-ef1234567890/notes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"postSessionNotes":"Patient responded well to therapy, mild dizziness observed"}'
```

---

### PATCH /panchakarma/sessions/:id/outcome

**Description:** Update session outcome.

**Auth:** Required — `panchakarma:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Session ID
}
Body: {
  outcome: string (required, enum: excellent/good/fair/poor) - Session outcome
  notes: string (optional) - Outcome notes
  materialsUsed: array (optional) - Materials used [
    {
      name: string (required) - Material name
      quantity: string (required) - Quantity used
    }
  ]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "outcome": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Session outcome updated"
}
```

**Response 404:** `SESSION_NOT_FOUND`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/panchakarma/sessions/s1b2c3d4-e5f6-7890-abcd-ef1234567890/outcome \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"outcome":"good","notes":"Patient reported relief from symptoms","materialsUsed":[{"name":"Medicated Oil","quantity":"50ml"}]}'
```

---

### GET /panchakarma/sessions/today

**Description:** Get all sessions scheduled for today.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  therapistId: uuid (optional) - Filter by therapist
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "totalSessions": 15,
    "completed": 5,
    "inProgress": 3,
    "scheduled": 7,
    "sessions": [
      {
        "id": "uuid",
        "sessionNumber": 1,
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "therapist": {
          "id": "uuid",
          "name": "string"
        },
        "therapyType": "string",
        "scheduledTime": "HH:mm",
        "status": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/sessions/today \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/sessions/calendar

**Description:** Get sessions in calendar format.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  startDate: ISO8601 date (required) - Start date
  endDate: ISO8601 date (required) - End date
  therapistId: uuid (optional) - Filter by therapist
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "sessions": [
      {
        "id": "uuid",
        "date": "ISO8601",
        "time": "HH:mm",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "therapist": {
          "id": "uuid",
          "name": "string"
        },
        "therapyType": "string",
        "status": "string",
        "duration": "45 minutes"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/sessions/calendar?startDate=2026-01-15&endDate=2026-01-21" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/therapists

**Description:** List all Panchakarma therapists.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  search: string (optional) - Search by name
  specialization: string (optional) - Filter by specialization
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "specialization": "string",
        "experience": "string",
        "phone": "string",
        "email": "string",
        "isAvailable": true,
        "todaySessions": 5,
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/therapists \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/therapists/:id

**Description:** Get a specific therapist with full details.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Therapist ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "specialization": "string",
    "experience": "string",
    "qualifications": ["string"],
    "phone": "string",
    "email": "string",
    "isAvailable": true,
    "weeklySchedule": {
      "monday": {"start": "09:00", "end": "17:00"},
      "tuesday": {"start": "09:00", "end": "17:00"}
    },
    "stats": {
      "totalSessions": 500,
      "thisMonth": 45,
      "averageRating": 4.8
    },
    "status": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `THERAPIST_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/therapists/th1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/therapists/:id/schedule

**Description:** Get therapist's schedule.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Therapist ID
}
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "therapistId": "uuid",
    "therapistName": "string",
    "schedule": [
      {
        "date": "ISO8601",
        "slots": [
          {
            "time": "HH:mm",
            "isAvailable": true,
            "session": {
              "id": "uuid",
              "patientName": "string",
              "therapyType": "string"
            }
          }
        ]
      }
    ]
  }
}
```

**Response 404:** `THERAPIST_NOT_FOUND`

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/therapists/th1b2c3d4-e5f6-7890-abcd-ef1234567890/schedule?dateFrom=2026-01-15&dateTo=2026-01-21" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/therapists/:id/stats

**Description:** Get therapist's performance statistics.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Therapist ID
}
Params (Query): {
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "therapistId": "uuid",
    "therapistName": "string",
    "period": {
      "from": "ISO8601",
      "to": "ISO8601"
    },
    "totalSessions": 150,
    "completedSessions": 140,
    "cancelledSessions": 5,
    "noShows": 5,
    "completionRate": 93.3,
    "outcomeBreakdown": {
      "excellent": 50,
      "good": 60,
      "fair": 25,
      "poor": 5
    },
    "therapyBreakdown": [
      {
        "therapyType": "string",
        "sessionCount": 50,
        "averageOutcome": "good"
      }
    ],
    "averageRating": 4.8,
    "totalRevenue": 375000.00
  }
}
```

**Response 404:** `THERAPIST_NOT_FOUND`

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/therapists/th1b2c3d4-e5f6-7890-abcd-ef1234567890/stats?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/materials/usage

**Description:** Get Panchakarma materials usage report.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
  therapyType: string (optional) - Filter by therapy type
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalMaterialsUsed": 150,
      "totalCost": 75000.00
    },
    "materials": [
      {
        "name": "string",
        "totalQuantity": "500ml",
        "totalCost": 25000.00,
        "usageCount": 50
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/materials/usage?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/materials/low-stock

**Description:** Get low stock alerts for Panchakarma materials.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "materialName": "string",
        "currentStock": "50ml",
        "minimumStock": "200ml",
        "unit": "ml",
        "status": "critical"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/materials/low-stock \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /panchakarma/materials/request

**Description:** Request materials from pharmacy.

**Auth:** Required — `panchakarma:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  materials: array (required) - Requested materials [
    {
      name: string (required) - Material name
      quantity: string (required) - Quantity needed
      unit: string (required) - Unit
    }
  ],
  reason: string (optional) - Reason for request
  urgency: string (optional, default: "normal") - Urgency level (low/normal/high/urgent)
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "requestNumber": "PK-MR-2026-001",
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "message": "Material request submitted successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/panchakarma/materials/request \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"materials":[{"name":"Medicated Oil","quantity":"500","unit":"ml"},{"name":"Herbal Paste","quantity":"200","unit":"gm"}],"reason":"Weekly stock replenishment","urgency":"normal"}'
```

---

### GET /panchakarma/dashboard

**Description:** Get Panchakarma department dashboard summary.

**Auth:** Required — `panchakarma:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todaySessions": 15,
    "completedSessions": 5,
    "pendingSessions": 10,
    "activePlans": 25,
    "totalTherapists": 8,
    "availableTherapists": 6,
    "completedThisMonth": 150,
    "revenueThisMonth": 375000.00,
    "upcomingSessions": [
      {
        "id": "uuid",
        "patientName": "string",
        "therapyType": "string",
        "time": "HH:mm",
        "therapist": "string"
      }
    ],
    "recentCompletions": [
      {
        "id": "uuid",
        "patientName": "string",
        "therapyType": "string",
        "outcome": "good",
        "completedAt": "ISO8601"
      }
    ],
    "lowStockAlerts": 3
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/panchakarma/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/reports/outcomes

**Description:** Get therapy outcomes report.

**Auth:** Required — `panchakarma:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
  therapyType: string (optional) - Filter by therapy type
  therapistId: uuid (optional) - Filter by therapist
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSessions": 150,
      "excellentOutcome": 50,
      "goodOutcome": 60,
      "fairOutcome": 25,
      "poorOutcome": 5,
      "averageRating": 4.8
    },
    "byTherapyType": [
      {
        "therapyType": "string",
        "totalSessions": 50,
        "excellent": 20,
        "good": 20,
        "fair": 8,
        "poor": 2
      }
    ],
    "trend": [
      {
        "date": "ISO8601",
        "sessions": 5,
        "averageOutcome": "good"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/reports/outcomes?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /panchakarma/reports/utilization

**Description:** Get resource utilization report.

**Auth:** Required — `panchakarma:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "therapistUtilization": [
      {
        "therapistId": "uuid",
        "therapistName": "string",
        "totalHours": 160,
        "bookedHours": 120,
        "utilizationRate": 75.0
      }
    ],
    "roomUtilization": [
      {
        "roomNumber": "string",
        "totalHours": 160,
        "bookedHours": 140,
        "utilizationRate": 87.5
      }
    ],
    "equipmentUtilization": [
      {
        "equipmentName": "string",
        "totalUsage": 100,
        "availableHours": 160,
        "utilizationRate": 62.5
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/panchakarma/reports/utilization?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## IPD Module

### GET /ipd/wards

**Description:** List all wards.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  search: string (optional) - Search by ward name
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "floor": "string",
        "totalBeds": 20,
        "occupiedBeds": 15,
        "availableBeds": 5,
        "wardType": "string",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/wards \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/wards/:id

**Description:** Get a specific ward with bed details.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Ward ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "floor": "string",
    "totalBeds": 20,
    "occupiedBeds": 15,
    "availableBeds": 5,
    "wardType": "string",
    "beds": [
      {
        "id": "uuid",
        "bedNumber": "string",
        "bedType": "string",
        "status": "string",
        "currentPatient": {
          "id": "uuid",
          "name": "string"
        }
      }
    ],
    "status": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `WARD_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/wards/w1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /ipd/wards

**Description:** Create a new ward.

**Auth:** Required — `ipd:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (required) - Ward name
  floor: string (required) - Floor
  totalBeds: number (required, min: 1) - Total beds
  wardType: string (required) - Ward type (general/private/icu/semi-private)
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "floor": "string",
    "totalBeds": 20,
    "wardType": "string",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Ward created successfully"
}
```

**Response 409:** `WARD_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/wards \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Ward A","floor":"Ground Floor","totalBeds":20,"wardType":"general"}'
```

---

### PUT /ipd/wards/:id

**Description:** Update a ward.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Ward ID
}
Body: {
  name: string (optional) - Ward name
  floor: string (optional) - Floor
  wardType: string (optional) - Ward type
  status: string (optional) - Status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Ward updated successfully"
}
```

**Response 404:** `WARD_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/ipd/wards/w1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"wardType":"semi-private"}'
```

---

### GET /ipd/beds

**Description:** List all beds with filtering.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  wardId: uuid (optional) - Filter by ward
  status: string (optional) - Filter by status (available/occupied/maintenance)
  bedType: string (optional) - Filter by bed type
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "bedNumber": "string",
        "ward": {
          "id": "uuid",
          "name": "string"
        },
        "bedType": "string",
        "status": "string",
        "currentPatient": {
          "id": "uuid",
          "name": "string"
        },
        "admissionId": "uuid",
        "dailyRate": 1500.00,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 200,
      "totalPages": 10
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/beds?wardId=w1b2c3d4...&status=available" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/beds/:id

**Description:** Get a specific bed with full details.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Bed ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bedNumber": "string",
    "ward": {
      "id": "uuid",
      "name": "string",
      "floor": "string"
    },
    "bedType": "string",
    "status": "string",
    "dailyRate": 1500.00,
    "currentAdmission": {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "name": "string"
      },
      "admissionDate": "ISO8601",
      "expectedDischargeDate": "ISO8601"
    },
    "maintenanceHistory": [
      {
        "date": "ISO8601",
        "reason": "string",
        "completedAt": "ISO8601"
      }
    ],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `BED_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/beds/b1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /ipd/beds

**Description:** Create a new bed.

**Auth:** Required — `ipd:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  wardId: uuid (required) - Ward ID
  bedNumber: string (required) - Bed number
  bedType: string (required) - Bed type (standard/monitor/ventilator)
  dailyRate: number (required, min: 0) - Daily rate
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bedNumber": "string",
    "wardId": "uuid",
    "bedType": "string",
    "dailyRate": 1500.00,
    "status": "available",
    "createdAt": "ISO8601"
  },
  "message": "Bed created successfully"
}
```

**Response 404:** `WARD_NOT_FOUND`  
**Response 409:** `BED_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/beds \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"wardId":"w1b2c3d4...","bedNumber":"A-01","bedType":"standard","dailyRate":1500}'
```

---

### PUT /ipd/beds/:id

**Description:** Update a bed.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bed ID
}
Body: {
  bedNumber: string (optional) - Bed number
  bedType: string (optional) - Bed type
  dailyRate: number (optional) - Daily rate
  status: string (optional) - Status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bedNumber": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Bed updated successfully"
}
```

**Response 404:** `BED_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/ipd/beds/b1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"dailyRate":2000,"bedType":"monitor"}'
```

---

### PATCH /ipd/beds/:id/status

**Description:** Update bed status.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bed ID
}
Body: {
  status: string (required, enum: available/occupied/maintenance) - New status
  reason: string (optional) - Reason for status change
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Bed status updated"
}
```

**Response 404:** `BED_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/ipd/beds/b1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"maintenance","reason":"Annual maintenance"}'
```

---

### GET /ipd/beds/availability

**Description:** Get bed availability summary.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  wardId: uuid (optional) - Filter by ward
  bedType: string (optional) - Filter by bed type
  date: ISO8601 date (optional) - Check availability for date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBeds": 200,
      "available": 50,
      "occupied": 140,
      "maintenance": 10
    },
    "byWard": [
      {
        "wardId": "uuid",
        "wardName": "string",
        "total": 20,
        "available": 5,
        "occupied": 14,
        "maintenance": 1
      }
    ],
    "byBedType": [
      {
        "bedType": "string",
        "total": 100,
        "available": 30,
        "occupied": 65,
        "maintenance": 5
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/beds/availability?date=2026-01-20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/admissions

**Description:** List all admissions.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  patientId: uuid (optional) - Filter by patient
  wardId: uuid (optional) - Filter by ward
  doctorId: uuid (optional) - Filter by doctor
  status: string (optional) - Filter by status (admitted/discharged/transferred)
  dateFrom: ISO8601 date (optional) - Admission date from
  dateTo: ISO8601 date (optional) - Admission date to
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "admissionNumber": "ADM-2026-001",
        "patient": {
          "id": "uuid",
          "name": "string",
          "uhid": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "ward": {
          "id": "uuid",
          "name": "string"
        },
        "bed": {
          "id": "uuid",
          "bedNumber": "string"
        },
        "admissionDate": "ISO8601",
        "expectedDischargeDate": "ISO8601",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/admissions?status=admitted" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/admissions/:id

**Description:** Get a specific admission with full details.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Admission ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "admissionNumber": "ADM-2026-001",
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string",
      "gender": "string",
      "age": 45,
      "phone": "string"
    },
    "doctor": {
      "id": "uuid",
      "name": "string"
    },
    "ward": {
      "id": "uuid",
      "name": "string"
    },
    "bed": {
      "id": "uuid",
      "bedNumber": "string",
      "bedType": "string"
    },
    "admissionDate": "ISO8601",
    "expectedDischargeDate": "ISO8601",
    "actualDischargeDate": "ISO8601",
    "admissionReason": "string",
    "diagnosis": "string",
    "status": "string",
    "totalCharges": 45000.00,
    "totalPaid": 20000.00,
    "attendants": [
      {
        "id": "uuid",
        "name": "string",
        "relation": "string",
        "phone": "string"
      }
    ],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /ipd/admissions

**Description:** Create a new admission.

**Auth:** Required — `ipd:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  patientId: uuid (required) - Patient ID
  doctorId: uuid (required) - Doctor ID
  wardId: uuid (required) - Ward ID
  bedId: uuid (required) - Bed ID
  admissionDate: ISO8601 date (required) - Admission date
  expectedDischargeDate: ISO8601 date (optional) - Expected discharge date
  admissionReason: string (required) - Reason for admission
  diagnosis: string (optional) - Initial diagnosis
  notes: string (optional) - Additional notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "admissionNumber": "ADM-2026-002",
    "patientId": "uuid",
    "doctorId": "uuid",
    "wardId": "uuid",
    "bedId": "uuid",
    "admissionDate": "ISO8601",
    "status": "admitted",
    "createdAt": "ISO8601"
  },
  "message": "Patient admitted successfully"
}
```

**Response 404:** `PATIENT_NOT_FOUND` or `DOCTOR_NOT_FOUND` or `WARD_NOT_FOUND` or `BED_NOT_FOUND`  
**Response 409:** `BED_NOT_AVAILABLE`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/admissions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"patientId":"p1b2c3d4...","doctorId":"d1b2c3d4...","wardId":"w1b2c3d4...","bedId":"b1b2c3d4...","admissionDate":"2026-01-20","admissionReason":"Chronic back pain requiring intensive treatment","diagnosis":"Lumbar Spondylosis"}'
```

---

### PUT /ipd/admissions/:id

**Description:** Update an admission.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
}
Body: {
  expectedDischargeDate: ISO8601 date (optional) - Expected discharge date
  diagnosis: string (optional) - Diagnosis
  notes: string (optional) - Notes
  status: string (optional) - Status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "admissionNumber": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Admission updated successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"expectedDischargeDate":"2026-01-30","diagnosis":"Lumbar Spondylosis - Confirmed"}'
```

---

### PATCH /ipd/admissions/:id/status

**Description:** Update admission status.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
}
Body: {
  status: string (required, enum: admitted/discharged/transferred) - New status
  dischargeDate: ISO8601 date (optional) - Discharge date (required for discharge)
  dischargeSummary: string (optional) - Discharge summary
  notes: string (optional) - Notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "actualDischargeDate": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "message": "Admission status updated"
}
```

**Response 404:** `ADMISSION_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"discharged","dischargeDate":"2026-01-25","dischargeSummary":"Patient recovered well, prescribed home medication"}'
```

---

### POST /ipd/admissions/:id/transfer

**Description:** Transfer a patient to a different bed/ward.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
}
Body: {
  newWardId: uuid (required) - New ward ID
  newBedId: uuid (required) - New bed ID
  transferDate: ISO8601 date (required) - Transfer date
  reason: string (required) - Transfer reason
  notes: string (optional) - Additional notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "admissionId": "uuid",
    "previousWard": {
      "id": "uuid",
      "name": "string"
    },
    "previousBed": {
      "id": "uuid",
      "bedNumber": "string"
    },
    "newWard": {
      "id": "uuid",
      "name": "string"
    },
    "newBed": {
      "id": "uuid",
      "bedNumber": "string"
    },
    "transferDate": "ISO8601",
    "transferredBy": {
      "id": "uuid",
      "name": "string"
    }
  },
  "message": "Patient transferred successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `BED_NOT_FOUND`  
**Response 409:** `BED_NOT_AVAILABLE`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/transfer \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"newWardId":"w2b2c3d4...","newBedId":"b2b2c3d4...","transferDate":"2026-01-22","reason":"Patient requires ICU care"}'
```

---

### GET /ipd/admissions/active

**Description:** Get all active admissions.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  wardId: uuid (optional) - Filter by ward
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "admissionNumber": "ADM-2026-001",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "ward": {
          "id": "uuid",
          "name": "string"
        },
        "bed": {
          "bedNumber": "string"
        },
        "admissionDate": "ISO8601",
        "daysSinceAdmission": 5,
        "status": "admitted"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 80,
      "totalPages": 4
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/admissions/active?wardId=w1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/admissions/today

**Description:** Get today's admissions and discharges.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "admissions": [
      {
        "id": "uuid",
        "admissionNumber": "string",
        "patientName": "string",
        "doctorName": "string",
        "ward": "string",
        "bed": "string",
        "admissionTime": "HH:mm",
        "reason": "string"
      }
    ],
    "discharges": [
      {
        "id": "uuid",
        "admissionNumber": "string",
        "patientName": "string",
        "doctorName": "string",
        "ward": "string",
        "bed": "string",
        "dischargeTime": "HH:mm",
        "dischargeSummary": "string"
      }
    ],
    "transfers": [
      {
        "id": "uuid",
        "patientName": "string",
        "fromWard": "string",
        "toWard": "string",
        "transferTime": "HH:mm"
      }
    ],
    "totalAdmissions": 5,
    "totalDischarges": 3,
    "totalTransfers": 2
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/admissions/today \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/admissions/:id/rounds

**Description:** Get rounds for an admission.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Admission ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "admissionId": "uuid",
    "rounds": [
      {
        "id": "uuid",
        "roundNumber": 1,
        "date": "ISO8601",
        "time": "HH:mm",
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "vitals": {
          "bloodPressure": "string",
          "temperature": "number",
          "pulse": "number"
        },
        "notes": "string",
        "medications": ["string"],
        "nextRoundDate": "ISO8601"
      }
    ]
  }
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/rounds \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /ipd/admissions/:id/rounds

**Description:** Create a new round for an admission.

**Auth:** Required — `ipd:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
}
Body: {
  doctorId: uuid (required) - Doctor ID
  date: ISO8601 date (required) - Round date
  time: string (required, HH:mm format) - Round time
  vitals: {
    bloodPressure: string (optional)
    temperature: number (optional)
    pulse: number (optional)
    respiratoryRate: number (optional)
    spo2: number (optional)
  },
  notes: string (required) - Round notes
  medications: array of strings (optional) - Medications prescribed
  nextRoundDate: ISO8601 date (optional) - Next round date
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "roundNumber": 1,
    "admissionId": "uuid",
    "date": "ISO8601",
    "time": "HH:mm",
    "doctor": {
      "id": "uuid",
      "name": "string"
    },
    "status": "completed",
    "createdAt": "ISO8601"
  },
  "message": "Round created successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/rounds \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"doctorId":"d1b2c3d4...","date":"2026-01-21","time":"09:00","vitals":{"bloodPressure":"120/80","temperature":98.6,"pulse":72},"notes":"Patient responding well to treatment","medications":["Ashwagandha 500mg BD"],"nextRoundDate":"2026-01-22"}'
```

---

### PUT /ipd/admissions/:id/rounds/:roundId

**Description:** Update a round.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
  roundId: uuid (required) - Round ID
}
Body: {
  vitals: object (optional) - Vital signs
  notes: string (optional) - Round notes
  medications: array (optional) - Medications
  nextRoundDate: ISO8601 date (optional) - Next round date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "roundNumber": 1,
    "updatedAt": "ISO8601"
  },
  "message": "Round updated successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `ROUND_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/rounds/r1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"notes":"Updated round notes","medications":["Ashwagandha 500mg BD","Guggulu 250mg BD"]}'
```

---

### GET /ipd/rounds/today

**Description:** Get all rounds scheduled for today.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  doctorId: uuid (optional) - Filter by doctor
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "totalRounds": 20,
    "completed": 10,
    "pending": 10,
    "rounds": [
      {
        "id": "uuid",
        "roundNumber": 1,
        "admission": {
          "id": "uuid",
          "admissionNumber": "string"
        },
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "ward": "string",
        "bed": "string",
        "time": "HH:mm",
        "status": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/rounds/today \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/admissions/:id/nursing

**Description:** Get nursing tasks for an admission.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Admission ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "admissionId": "uuid",
    "tasks": [
      {
        "id": "uuid",
        "taskType": "string",
        "description": "string",
        "scheduledTime": "HH:mm",
        "assignedTo": {
          "id": "uuid",
          "name": "string"
        },
        "status": "string",
        "completedAt": "ISO8601",
        "notes": "string"
      }
    ]
  }
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/nursing \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /ipd/admissions/:id/nursing

**Description:** Create a nursing task for an admission.

**Auth:** Required — `ipd:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
}
Body: {
  taskType: string (required) - Task type (vital-check/medication/dressing/bath/feeding)
  description: string (required) - Task description
  scheduledTime: string (required, HH:mm format) - Scheduled time
  assignedToId: uuid (required) - Assigned nurse ID
  notes: string (optional) - Task notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "taskType": "string",
    "description": "string",
    "scheduledTime": "HH:mm",
    "assignedTo": {
      "id": "uuid",
      "name": "string"
    },
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "message": "Nursing task created successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/nursing \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"taskType":"vital-check","description":"Check patient vitals","scheduledTime":"08:00","assignedToId":"n1b2c3d4...","notes":"Check BP, temperature, pulse"}'
```

---

### PUT /ipd/admissions/:id/nursing/:taskId

**Description:** Update a nursing task.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
  taskId: uuid (required) - Task ID
}
Body: {
  taskType: string (optional) - Task type
  description: string (optional) - Task description
  scheduledTime: string (optional) - Scheduled time
  assignedToId: uuid (optional) - Assigned nurse ID
  notes: string (optional) - Task notes
  status: string (optional) - Task status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "ISO8601"
  },
  "message": "Nursing task updated successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `TASK_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/nursing/t1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","notes":"Vitals recorded: BP 120/80, Temp 98.6, Pulse 72"}'
```

---

### PATCH /ipd/admissions/:id/nursing/:taskId/status

**Description:** Update nursing task status.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
  taskId: uuid (required) - Task ID
}
Body: {
  status: string (required, enum: pending/in-progress/completed/skipped) - New status
  notes: string (optional) - Status notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "completedAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "message": "Nursing task status updated"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `TASK_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/nursing/t1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","notes":"All vitals within normal range"}'
```

---

### GET /ipd/nursing/today

**Description:** Get all nursing tasks scheduled for today.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  nurseId: uuid (optional) - Filter by nurse
  wardId: uuid (optional) - Filter by ward
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "totalTasks": 50,
    "completed": 20,
    "pending": 25,
    "inProgress": 5,
    "tasks": [
      {
        "id": "uuid",
        "admission": {
          "id": "uuid",
          "admissionNumber": "string"
        },
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "ward": "string",
        "bed": "string",
        "taskType": "string",
        "description": "string",
        "scheduledTime": "HH:mm",
        "assignedTo": {
          "id": "uuid",
          "name": "string"
        },
        "status": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/nursing/today?wardId=w1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/admissions/:id/orders

**Description:** Get medical orders for an admission.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Admission ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "admissionId": "uuid",
    "orders": [
      {
        "id": "uuid",
        "orderType": "string",
        "description": "string",
        "orderedBy": {
          "id": "uuid",
          "name": "string"
        },
        "orderedDate": "ISO8601",
        "status": "string",
        "notes": "string"
      }
    ]
  }
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /ipd/admissions/:id/orders

**Description:** Create a medical order for an admission.

**Auth:** Required — `ipd:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
}
Body: {
  orderType: string (required) - Order type (medication/lab-test/procedure/diet)
  description: string (required) - Order description
  orderedById: uuid (required) - Ordering doctor ID
  priority: string (optional, default: "normal") - Priority (normal/urgent/stat)
  notes: string (optional) - Order notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderType": "string",
    "description": "string",
    "orderedBy": {
      "id": "uuid",
      "name": "string"
    },
    "orderedDate": "ISO8601",
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "message": "Order created successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"orderType":"medication","description":"Ashwagandha 500mg twice daily after food","orderedById":"d1b2c3d4...","priority":"normal","notes":"Continue for 7 days"}'
```

---

### PUT /ipd/admissions/:id/orders/:orderId

**Description:** Update a medical order.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
  orderId: uuid (required) - Order ID
}
Body: {
  description: string (optional) - Order description
  priority: string (optional) - Priority
  notes: string (optional) - Order notes
  status: string (optional) - Order status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "ISO8601"
  },
  "message": "Order updated successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `ORDER_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/orders/o1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"description":"Ashwagandha 500mg thrice daily after food","notes":"Increased dosage based on response"}'
```

---

### PATCH /ipd/admissions/:id/orders/:orderId/status

**Description:** Update order status.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
  orderId: uuid (required) - Order ID
}
Body: {
  status: string (required, enum: pending/in-progress/completed/cancelled) - New status
  notes: string (optional) - Status notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Order status updated"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `ORDER_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/orders/o1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","notes":"Medication administered"}'
```

---

### GET /ipd/orders/pending

**Description:** Get all pending orders across admissions.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  orderType: string (optional) - Filter by order type
  wardId: uuid (optional) - Filter by ward
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalPending": 25,
    "orders": [
      {
        "id": "uuid",
        "admission": {
          "id": "uuid",
          "admissionNumber": "string"
        },
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "ward": "string",
        "bed": "string",
        "orderType": "string",
        "description": "string",
        "orderedBy": {
          "id": "uuid",
          "name": "string"
        },
        "orderedDate": "ISO8601",
        "priority": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/orders/pending?orderType=medication" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/admissions/:id/attendants

**Description:** Get attendants for an admission.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Admission ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "admissionId": "uuid",
    "attendants": [
      {
        "id": "uuid",
        "name": "string",
        "relation": "string",
        "phone": "string",
        "email": "string",
        "isPrimary": true,
        "createdAt": "ISO8601"
      }
    ]
  }
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/attendants \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /ipd/admissions/:id/attendants

**Description:** Add an attendant to an admission.

**Auth:** Required — `ipd:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
}
Body: {
  name: string (required) - Attendant name
  relation: string (required) - Relationship
  phone: string (required) - Phone number
  email: string (optional) - Email address
  isPrimary: boolean (optional, default: false) - Is primary attendant
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "relation": "string",
    "phone": "string",
    "isPrimary": true,
    "createdAt": "ISO8601"
  },
  "message": "Attendant added successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/attendants \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Sunita Kumar","relation":"Wife","phone":"+91-9876543211","email":"sunita@email.com","isPrimary":true}'
```

---

### PUT /ipd/admissions/:id/attendants/:attendantId

**Description:** Update an attendant.

**Auth:** Required — `ipd:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Admission ID
  attendantId: uuid (required) - Attendant ID
}
Body: {
  name: string (optional) - Attendant name
  relation: string (optional) - Relationship
  phone: string (optional) - Phone number
  email: string (optional) - Email address
  isPrimary: boolean (optional) - Is primary attendant
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Attendant updated successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `ATTENDANT_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/attendants/at1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91-9999888877"}'
```

---

### DELETE /ipd/admissions/:id/attendants/:attendantId

**Description:** Remove an attendant from an admission.

**Auth:** Required — `ipd:delete`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Admission ID
  attendantId: uuid (required) - Attendant ID
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Attendant removed successfully"
}
```

**Response 404:** `ADMISSION_NOT_FOUND` or `ATTENDANT_NOT_FOUND`

**Example:**

```bash
curl -X DELETE http://localhost:8080/api/v1/ipd/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890/attendants/at1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/dashboard

**Description:** Get IPD department dashboard summary.

**Auth:** Required — `ipd:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalBeds": 200,
    "occupiedBeds": 140,
    "availableBeds": 50,
    "maintenanceBeds": 10,
    "occupancyRate": 70.0,
    "todayAdmissions": 5,
    "todayDischarges": 3,
    "todayTransfers": 2,
    "averageLengthOfStay": 5.2,
    "pendingOrders": 25,
    "pendingRounds": 10,
    "byWard": [
      {
        "wardId": "uuid",
        "wardName": "string",
        "totalBeds": 20,
        "occupied": 15,
        "available": 4,
        "maintenance": 1
      }
    ],
    "recentAdmissions": [
      {
        "id": "uuid",
        "admissionNumber": "string",
        "patientName": "string",
        "ward": "string",
        "admittedAt": "ISO8601"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/ipd/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/reports/occupancy

**Description:** Get bed occupancy report.

**Auth:** Required — `ipd:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
  wardId: uuid (optional) - Filter by ward
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "averageOccupancy": 72.5,
      "peakOccupancy": 95.0,
      "lowestOccupancy": 45.0
    },
    "daily": [
      {
        "date": "ISO8601",
        "totalBeds": 200,
        "occupied": 145,
        "occupancyRate": 72.5
      }
    ],
    "byWard": [
      {
        "wardId": "uuid",
        "wardName": "string",
        "averageOccupancy": 75.0
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/reports/occupancy?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /ipd/reports/length-of-stay

**Description:** Get length of stay report.

**Auth:** Required — `ipd:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
  wardId: uuid (optional) - Filter by ward
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "averageLengthOfStay": 5.2,
      "medianLengthOfStay": 4.0,
      "minLengthOfStay": 1,
      "maxLengthOfStay": 25,
      "totalDischarged": 100
    },
    "distribution": [
      {
        "range": "1-3 days",
        "count": 30,
        "percentage": 30.0
      },
      {
        "range": "4-7 days",
        "count": 40,
        "percentage": 40.0
      },
      {
        "range": "8-14 days",
        "count": 20,
        "percentage": 20.0
      },
      {
        "range": "15+ days",
        "count": 10,
        "percentage": 10.0
      }
    ],
    "byWard": [
      {
        "wardId": "uuid",
        "wardName": "string",
        "averageLengthOfStay": 4.5
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/ipd/reports/length-of-stay?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Billing Module

### GET /billing/service-categories

**Description:** List all service categories.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 50) - Items per page
  search: string (optional) - Search by name
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string",
        "serviceCount": 15,
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/billing/service-categories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /billing/service-categories

**Description:** Create a new service category.

**Auth:** Required — `billing:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (required) - Category name
  description: string (optional) - Description
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Service category created successfully"
}
```

**Response 409:** `CATEGORY_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/service-categories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Panchakarma Services","description":"All Panchakarma therapy services"}'
```

---

### PUT /billing/service-categories/:id

**Description:** Update a service category.

**Auth:** Required — `billing:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Category ID
}
Body: {
  name: string (optional) - Category name
  description: string (optional) - Description
  status: string (optional) - Status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Service category updated successfully"
}
```

**Response 404:** `CATEGORY_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/billing/service-categories/sc1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated category description"}'
```

---

### GET /billing/services

**Description:** List all billing services.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  categoryId: uuid (optional) - Filter by category
  search: string (optional) - Search by name
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "code": "string",
        "category": {
          "id": "uuid",
          "name": "string"
        },
        "price": 500.00,
        "taxRate": 18.0,
        "isActive": true,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/billing/services?categoryId=sc1b2c3d4..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /billing/services/:id

**Description:** Get a specific billing service.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Service ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "code": "string",
    "category": {
      "id": "uuid",
      "name": "string"
    },
    "description": "string",
    "price": 500.00,
    "taxRate": 18.0,
    "taxAmount": 90.00,
    "totalPrice": 590.00,
    "isActive": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `SERVICE_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/billing/services/sv1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /billing/services

**Description:** Create a new billing service.

**Auth:** Required — `billing:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (required) - Service name
  code: string (required, unique) - Service code
  categoryId: uuid (required) - Category ID
  description: string (optional) - Description
  price: number (required, min: 0) - Service price
  taxRate: number (optional, default: 18) - Tax rate percentage
  isActive: boolean (optional, default: true) - Active status
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "code": "string",
    "price": 500.00,
    "taxRate": 18.0,
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Service created successfully"
}
```

**Response 404:** `CATEGORY_NOT_FOUND`  
**Response 409:** `SERVICE_CODE_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/services \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Basti Karma","code":"PK-BASTI","categoryId":"sc1b2c3d4...","description":"Medicated enema therapy","price":2500,"taxRate":18}'
```

---

### PUT /billing/services/:id

**Description:** Update a billing service.

**Auth:** Required — `billing:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Service ID
}
Body: {
  name: string (optional) - Service name
  code: string (optional) - Service code
  categoryId: uuid (optional) - Category ID
  description: string (optional) - Description
  price: number (optional) - Price
  taxRate: number (optional) - Tax rate
  isActive: boolean (optional) - Active status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Service updated successfully"
}
```

**Response 404:** `SERVICE_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/billing/services/sv1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"price":3000,"description":"Updated Basti Karma service"}'
```

---

### GET /bills

**Description:** List all bills.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  patientId: uuid (optional) - Filter by patient
  status: string (optional) - Filter by status (draft/issued/paid/partial/refunded)
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
  billType: string (optional) - Filter by type (opd/ipd/pharmacy/panchakarma)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "billNumber": "BILL-2026-001",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "billType": "string",
        "totalAmount": 5900.00,
        "paidAmount": 5900.00,
        "pendingAmount": 0.00,
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 200,
      "totalPages": 10
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/bills?status=paid&dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /bills/:id

**Description:** Get a specific bill with full details.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Bill ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billNumber": "BILL-2026-001",
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string",
      "phone": "string"
    },
    "billType": "string",
    "items": [
      {
        "id": "uuid",
        "serviceId": "uuid",
        "serviceName": "string",
        "quantity": 1,
        "unitPrice": 500.00,
        "discount": 0.00,
        "taxRate": 18.0,
        "taxAmount": 90.00,
        "totalAmount": 590.00
      }
    ],
    "subtotal": 5000.00,
    "discountAmount": 0.00,
    "taxAmount": 900.00,
    "totalAmount": 5900.00,
    "paidAmount": 5900.00,
    "pendingAmount": 0.00,
    "status": "string",
    "issuedBy": {
      "id": "uuid",
      "name": "string"
    },
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Response 404:** `BILL_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /bills/number/:bill_no

**Description:** Get a bill by bill number.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  bill_no: string (required) - Bill number
}
```

**Response 200:** (Same as GET /bills/:id)

**Response 404:** `BILL_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/bills/number/BILL-2026-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /bills

**Description:** Create a new bill.

**Auth:** Required — `billing:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  patientId: uuid (required) - Patient ID
  billType: string (required, enum: opd/ipd/pharmacy/panchakarma) - Bill type
  items: array (required) - Bill items [
    {
      serviceId: uuid (required) - Service ID
      quantity: number (required, min: 1) - Quantity
      unitPrice: number (required, min: 0) - Unit price
      discount: number (optional, default: 0) - Discount amount
    }
  ],
  notes: string (optional) - Bill notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billNumber": "BILL-2026-002",
    "patientId": "uuid",
    "billType": "string",
    "subtotal": 5000.00,
    "discountAmount": 0.00,
    "taxAmount": 900.00,
    "totalAmount": 5900.00,
    "status": "issued",
    "createdAt": "ISO8601"
  },
  "message": "Bill created successfully"
}
```

**Response 404:** `PATIENT_NOT_FOUND` or `SERVICE_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/bills \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"patientId":"p1b2c3d4...","billType":"opd","items":[{"serviceId":"sv1b2c3d4...","quantity":1,"unitPrice":500}]}'
```

---

### PUT /bills/:id

**Description:** Update a bill (only if in draft status).

**Auth:** Required — `billing:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bill ID
}
Body: {
  items: array (optional) - Updated bill items
  notes: string (optional) - Bill notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billNumber": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Bill updated successfully"
}
```

**Response 404:** `BILL_NOT_FOUND`  
**Response 409:** `BILL_NOT_EDITABLE`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"items":[{"serviceId":"sv1b2c3d4...","quantity":2,"unitPrice":500}]}'
```

---

### DELETE /bills/:id

**Description:** Delete a bill (only if in draft status).

**Auth:** Required — `billing:delete`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Bill ID
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Bill deleted successfully"
}
```

**Response 404:** `BILL_NOT_FOUND`  
**Response 409:** `BILL_NOT_DELETABLE`

**Example:**

```bash
curl -X DELETE http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /bills/patient/:patientId

**Description:** Get all bills for a specific patient.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  patientId: uuid (required) - Patient ID
}
Params (Query): {
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "name": "string",
      "uhid": "string"
    },
    "bills": [
      {
        "id": "uuid",
        "billNumber": "string",
        "billType": "string",
        "totalAmount": 5900.00,
        "paidAmount": 5900.00,
        "pendingAmount": 0.00,
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "summary": {
      "totalBills": 10,
      "totalAmount": 59000.00,
      "totalPaid": 50000.00,
      "totalPending": 9000.00
    }
  }
}
```

**Response 404:** `PATIENT_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/bills/patient/p1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /bills/outstanding

**Description:** Get all outstanding (unpaid) bills.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  patientId: uuid (optional) - Filter by patient
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "billNumber": "string",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "billType": "string",
        "totalAmount": 5900.00,
        "paidAmount": 2000.00,
        "pendingAmount": 3900.00,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    },
    "summary": {
      "totalOutstanding": 195000.00,
      "averageAge": 15
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/bills/outstanding" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /bills/:id/payments

**Description:** Record a payment for a bill.

**Auth:** Required — `billing:payment`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bill ID
}
Body: {
  amount: number (required, min: 0.01) - Payment amount
  paymentMethod: string (required, enum: cash/card/upi/bank-transfer/insurance) - Payment method
  transactionId: string (optional) - Transaction ID for digital payments
  referenceNumber: string (optional) - Reference number
  notes: string (optional) - Payment notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "billId": "uuid",
    "billNumber": "string",
    "amount": 5900.00,
    "paymentMethod": "string",
    "transactionId": "string",
    "paidAt": "ISO8601",
    "paidBy": {
      "id": "uuid",
      "name": "string"
    },
    "billStatus": "paid",
    "receiptNumber": "RCP-2026-001"
  },
  "message": "Payment recorded successfully"
}
```

**Response 404:** `BILL_NOT_FOUND`  
**Response 409:** `BILL_ALREADY_PAID` or `AMOUNT_EXCEEDS_PENDING`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/payments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"amount":5900,"paymentMethod":"upi","transactionId":"UPI-2026-001","notes":"Full payment"}'
```

---

### GET /bills/:id/payments

**Description:** Get all payments for a bill.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Bill ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "billId": "uuid",
    "billNumber": "string",
    "totalAmount": 5900.00,
    "totalPaid": 5900.00,
    "payments": [
      {
        "id": "uuid",
        "amount": 5900.00,
        "paymentMethod": "string",
        "transactionId": "string",
        "paidAt": "ISO8601",
        "paidBy": {
          "id": "uuid",
          "name": "string"
        },
        "receiptNumber": "RCP-2026-001"
      }
    ]
  }
}
```

**Response 404:** `BILL_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/payments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /bills/:id/payments/split

**Description:** Record a split payment (multiple payment methods).

**Auth:** Required — `billing:payment`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bill ID
}
Body: {
  payments: array (required) - Payment items [
    {
      amount: number (required, min: 0.01) - Payment amount
      paymentMethod: string (required) - Payment method
      transactionId: string (optional) - Transaction ID
      referenceNumber: string (optional) - Reference number
    }
  ],
  notes: string (optional) - Payment notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "billId": "uuid",
    "billNumber": "string",
    "totalPaid": 5900.00,
    "payments": [
      {
        "id": "uuid",
        "amount": 3000.00,
        "paymentMethod": "cash"
      },
      {
        "id": "uuid",
        "amount": 2900.00,
        "paymentMethod": "upi",
        "transactionId": "UPI-2026-002"
      }
    ],
    "billStatus": "paid",
    "receiptNumber": "RCP-2026-002"
  },
  "message": "Split payment recorded successfully"
}
```

**Response 404:** `BILL_NOT_FOUND`  
**Response 422:** `TOTAL_AMOUNT_MISMATCH`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/payments/split \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"payments":[{"amount":3000,"paymentMethod":"cash"},{"amount":2900,"paymentMethod":"upi","transactionId":"UPI-2026-002"}]}'
```

---

### POST /bills/:id/refunds

**Description:** Process a refund for a bill.

**Auth:** Required — `billing:refund`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bill ID
}
Body: {
  amount: number (required, min: 0.01) - Refund amount
  reason: string (required) - Refund reason
  refundMethod: string (required, enum: cash/card/upi/bank-transfer) - Refund method
  notes: string (optional) - Additional notes
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "refundId": "uuid",
    "billId": "uuid",
    "billNumber": "string",
    "amount": 5900.00,
    "refundMethod": "string",
    "reason": "string",
    "status": "pending",
    "requestedAt": "ISO8601",
    "requestedBy": {
      "id": "uuid",
      "name": "string"
    }
  },
  "message": "Refund request submitted successfully"
}
```

**Response 404:** `BILL_NOT_FOUND`  
**Response 409:** `REFUND_EXCEEDS_PAID_AMOUNT`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/refunds \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"amount":5900,"reason":"Service cancelled","refundMethod":"upi","notes":"Full refund for cancelled service"}'
```

---

### GET /bills/:id/refunds

**Description:** Get all refunds for a bill.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Bill ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "billId": "uuid",
    "billNumber": "string",
    "refunds": [
      {
        "id": "uuid",
        "amount": 5900.00,
        "reason": "string",
        "refundMethod": "string",
        "status": "string",
        "requestedAt": "ISO8601",
        "processedAt": "ISO8601",
        "approvedBy": {
          "id": "uuid",
          "name": "string"
        }
      }
    ]
  }
}
```

**Response 404:** `BILL_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/refunds \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### PATCH /bills/:id/refunds/:refundId/approve

**Description:** Approve a refund request.

**Auth:** Required — `billing:refund-approve`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bill ID
  refundId: uuid (required) - Refund ID
}
Body: {
  notes: string (optional) - Approval notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "refundId": "uuid",
    "status": "approved",
    "approvedBy": {
      "id": "uuid",
      "name": "string"
    },
    "approvedAt": "ISO8601"
  },
  "message": "Refund approved"
}
```

**Response 404:** `BILL_NOT_FOUND` or `REFUND_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/refunds/rf1b2c3d4-e5f6-7890-abcd-ef1234567890/approve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"notes":"Refund approved for cancelled service"}'
```

---

### PATCH /bills/:id/refunds/:refundId/process

**Description:** Process an approved refund.

**Auth:** Required — `billing:refund-process`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Bill ID
  refundId: uuid (required) - Refund ID
}
Body: {
  transactionId: string (optional) - Refund transaction ID
  notes: string (optional) - Processing notes
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "refundId": "uuid",
    "status": "processed",
    "processedBy": {
      "id": "uuid",
      "name": "string"
    },
    "processedAt": "ISO8601",
    "transactionId": "string"
  },
  "message": "Refund processed successfully"
}
```

**Response 404:** `BILL_NOT_FOUND` or `REFUND_NOT_FOUND`  
**Response 422:** `INVALID_STATUS_TRANSITION`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/refunds/rf1b2c3d4-e5f6-7890-abcd-ef1234567890/process \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"transactionId":"REF-2026-001","notes":"Refund processed via UPI"}'
```

---

### GET /billing/refunds

**Description:** List all refunds.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  status: string (optional) - Filter by status (pending/approved/rejected/processed)
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "billNumber": "string",
        "patient": {
          "id": "uuid",
          "name": "string"
        },
        "amount": 5900.00,
        "reason": "string",
        "refundMethod": "string",
        "status": "string",
        "requestedAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/billing/refunds?status=pending" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /billing/discounts

**Description:** List all discount schemes.

**Auth:** Required — `billing:read`  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  search: string (optional) - Search by name
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "type": "string",
        "value": 10.00,
        "minBillAmount": 1000.00,
        "maxDiscount": 500.00,
        "validFrom": "ISO8601",
        "validUntil": "ISO8601",
        "isActive": true,
        "usageCount": 25,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/billing/discounts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### POST /billing/discounts

**Description:** Create a new discount scheme.

**Auth:** Required — `billing:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (required) - Discount name
  type: string (required, enum: percentage/fixed) - Discount type
  value: number (required, min: 0) - Discount value
  minBillAmount: number (optional, default: 0) - Minimum bill amount
  maxDiscount: number (optional) - Maximum discount amount (for percentage type)
  validFrom: ISO8601 date (required) - Valid from date
  validUntil: ISO8601 date (required) - Valid until date
  isActive: boolean (optional, default: true) - Active status
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "type": "string",
    "value": 10.00,
    "validFrom": "ISO8601",
    "validUntil": "ISO8601",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "message": "Discount scheme created successfully"
}
```

**Response 409:** `DISCOUNT_EXISTS`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/discounts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"New Year Discount","type":"percentage","value":10,"minBillAmount":1000,"maxDiscount":500,"validFrom":"2026-01-01","validUntil":"2026-01-31"}'
```

---

### PUT /billing/discounts/:id

**Description:** Update a discount scheme.

**Auth:** Required — `billing:update`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Params (Path): {
  id: uuid (required) - Discount ID
}
Body: {
  name: string (optional) - Discount name
  type: string (optional) - Discount type
  value: number (optional) - Discount value
  minBillAmount: number (optional) - Minimum bill amount
  maxDiscount: number (optional) - Maximum discount
  validFrom: ISO8601 date (optional) - Valid from date
  validUntil: ISO8601 date (optional) - Valid until date
  isActive: boolean (optional) - Active status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "updatedAt": "ISO8601"
  },
  "message": "Discount scheme updated successfully"
}
```

**Response 404:** `DISCOUNT_NOT_FOUND`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/billing/discounts/d1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"value":15,"maxDiscount":750}'
```

---

### POST /billing/discounts/validate

**Description:** Validate if a discount can be applied to a bill.

**Auth:** Required — `billing:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  discountId: uuid (required) - Discount ID
  billAmount: number (required) - Bill amount
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "discountId": "uuid",
    "discountName": "string",
    "billAmount": 5000.00,
    "discountAmount": 500.00,
    "finalAmount": 4500.00,
    "message": "Discount is valid and can be applied"
  }
}
```

**Response 404:** `DISCOUNT_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/discounts/validate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"discountId":"d1b2c3d4...","billAmount":5000}'
```

---

### POST /billing/auto/consultation

**Description:** Auto-generate a bill for a consultation.

**Auth:** Required — `billing:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  encounterId: uuid (required) - Encounter ID
  patientId: uuid (required) - Patient ID
  doctorId: uuid (required) - Doctor ID
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "billId": "uuid",
    "billNumber": "BILL-2026-003",
    "patientId": "uuid",
    "billType": "opd",
    "items": [
      {
        "serviceName": "Consultation Fee",
        "quantity": 1,
        "unitPrice": 500.00,
        "taxAmount": 90.00,
        "totalAmount": 590.00
      }
    ],
    "totalAmount": 590.00,
    "status": "issued",
    "createdAt": "ISO8601"
  },
  "message": "Consultation bill generated successfully"
}
```

**Response 404:** `ENCOUNTER_NOT_FOUND` or `PATIENT_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/auto/consultation \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"encounterId":"e1b2c3d4...","patientId":"p1b2c3d4...","doctorId":"d1b2c3d4..."}'
```

---

### POST /billing/auto/ipd-daily

**Description:** Auto-generate daily charges for IPD patients.

**Auth:** Required — `billing:create`  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  date: ISO8601 date (optional, default: today) - Date for charges
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "billsGenerated": 15,
    "totalAmount": 150000.00,
    "bills": [
      {
        "billId": "uuid",
        "billNumber": "string",
        "patientName": "string",
        "amount": 10000.00
      }
    ]
  },
  "message": "IPD daily charges generated successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/auto/ipd-daily \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-20"}'
```

---

### POST /billing/auto/pharmacy

**Description:** Auto-generate a bill for pharmacy dispense.

**Auth:** Required — `billing:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  prescriptionId: uuid (required) - Prescription ID
  patientId: uuid (required) - Patient ID
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "billId": "uuid",
    "billNumber": "BILL-2026-004",
    "patientId": "uuid",
    "billType": "pharmacy",
    "items": [
      {
        "serviceName": "Ashwagandha Churna",
        "quantity": 14,
        "unitPrice": 120.00,
        "taxAmount": 302.40,
        "totalAmount": 1982.40
      }
    ],
    "totalAmount": 1982.40,
    "status": "issued",
    "createdAt": "ISO8601"
  },
  "message": "Pharmacy bill generated successfully"
}
```

**Response 404:** `PRESCRIPTION_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/auto/pharmacy \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"prescriptionId":"rx1b2c3d4...","patientId":"p1b2c3d4..."}'
```

---

### POST /billing/auto/panchakarma

**Description:** Auto-generate a bill for Panchakarma session.

**Auth:** Required — `billing:create`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  sessionId: uuid (required) - Session ID
  patientId: uuid (required) - Patient ID
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "billId": "uuid",
    "billNumber": "BILL-2026-005",
    "patientId": "uuid",
    "billType": "panchakarma",
    "items": [
      {
        "serviceName": "Basti Karma",
        "quantity": 1,
        "unitPrice": 2500.00,
        "taxAmount": 450.00,
        "totalAmount": 2950.00
      }
    ],
    "totalAmount": 2950.00,
    "status": "issued",
    "createdAt": "ISO8601"
  },
  "message": "Panchakarma bill generated successfully"
}
```

**Response 404:** `SESSION_NOT_FOUND`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/billing/auto/panchakarma \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1b2c3d4...","patientId":"p1b2c3d4..."}'
```

---

### GET /bills/:id/receipt

**Description:** Get a bill receipt for printing.

**Auth:** Required — `billing:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Bill ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "hospital": {
      "name": "AHMS Ayurvedic Hospital",
      "address": "123 Health Street, Medical City",
      "phone": "+91-11-12345678",
      "email": "info@ahms.com",
      "gstin": "07AABCU9603R1ZM"
    },
    "bill": {
      "billNumber": "BILL-2026-001",
      "billDate": "ISO8601",
      "billType": "string"
    },
    "patient": {
      "name": "string",
      "uhid": "string",
      "phone": "string"
    },
    "items": [
      {
        "serviceName": "string",
        "quantity": 1,
        "unitPrice": 500.00,
        "discount": 0.00,
        "taxRate": 18.0,
        "taxAmount": 90.00,
        "totalAmount": 590.00
      }
    ],
    "subtotal": 5000.00,
    "discountAmount": 0.00,
    "taxAmount": 900.00,
    "totalAmount": 5900.00,
    "amountInWords": "Five Thousand Nine Hundred Rupees Only",
    "payments": [
      {
        "paymentMethod": "string",
        "amount": 5900.00,
        "transactionId": "string",
        "paidAt": "ISO8601"
      }
    ],
    "generatedAt": "ISO8601"
  }
}
```

**Response 404:** `BILL_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/bills/bl1b2c3d4-e5f6-7890-abcd-ef1234567890/receipt \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /billing/dashboard

**Description:** Get billing dashboard summary.

**Auth:** Required — `billing:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todayCollection": 125000.00,
    "todayBills": 45,
    "todayPayments": 40,
    "pendingAmount": 450000.00,
    "pendingBills": 150,
    "thisMonthCollection": 3500000.00,
    "thisMonthBills": 1200,
    "byPaymentMethod": [
      {
        "method": "cash",
        "amount": 500000.00,
        "count": 200
      },
      {
        "method": "upi",
        "amount": 1500000.00,
        "count": 500
      },
      {
        "method": "card",
        "amount": 1000000.00,
        "count": 300
      },
      {
        "method": "insurance",
        "amount": 500000.00,
        "count": 200
      }
    ],
    "recentPayments": [
      {
        "id": "uuid",
        "billNumber": "string",
        "patientName": "string",
        "amount": 5900.00,
        "paymentMethod": "string",
        "paidAt": "ISO8601"
      }
    ],
    "outstandingAlerts": [
      {
        "billId": "uuid",
        "billNumber": "string",
        "patientName": "string",
        "pendingAmount": 5900.00,
        "daysPending": 30
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/billing/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /billing/reports/daily

**Description:** Get daily collection report.

**Auth:** Required — `billing:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  date: ISO8601 date (optional, default: today) - Report date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "summary": {
      "totalBills": 45,
      "totalCollection": 125000.00,
      "cashCollection": 30000.00,
      "digitalCollection": 95000.00,
      "averageBillAmount": 2777.78
    },
    "byBillType": [
      {
        "billType": "opd",
        "count": 25,
        "amount": 62500.00
      },
      {
        "billType": "ipd",
        "count": 10,
        "amount": 50000.00
      },
      {
        "billType": "pharmacy",
        "count": 8,
        "amount": 10000.00
      },
      {
        "billType": "panchakarma",
        "count": 2,
        "amount": 2500.00
      }
    ],
    "hourlyBreakdown": [
      {
        "hour": "09:00",
        "bills": 5,
        "amount": 15000.00
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/billing/reports/daily?date=2026-01-20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /billing/reports/service-wise

**Description:** Get service-wise collection report.

**Auth:** Required — `billing:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
  categoryId: uuid (optional) - Filter by category
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 3500000.00,
      "totalServices": 1500,
      "averagePerService": 2333.33
    },
    "services": [
      {
        "serviceId": "uuid",
        "serviceName": "string",
        "category": "string",
        "totalBilled": 200,
        "totalRevenue": 100000.00,
        "averagePerBill": 500.00
      }
    ],
    "topServices": [
      {
        "rank": 1,
        "serviceName": "string",
        "billedCount": 200,
        "revenue": 100000.00
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/billing/reports/service-wise?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /billing/reports/outstanding

**Description:** Get outstanding payments report.

**Auth:** Required — `billing:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOutstanding": 450000.00,
      "totalBills": 150,
      "averageAge": 15
    },
    "ageWise": [
      {
        "range": "0-30 days",
        "count": 80,
        "amount": 200000.00
      },
      {
        "range": "31-60 days",
        "count": 50,
        "amount": 150000.00
      },
      {
        "range": "61-90 days",
        "count": 15,
        "amount": 75000.00
      },
      {
        "range": "90+ days",
        "count": 5,
        "amount": 25000.00
      }
    ],
    "topDefaulters": [
      {
        "patientId": "uuid",
        "patientName": "string",
        "outstandingAmount": 15000.00,
        "oldestBillDays": 45
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/billing/reports/outstanding" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /billing/reports/payment-method

**Description:** Get payment method wise collection report.

**Auth:** Required — `billing:reports`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCollection": 3500000.00,
      "totalTransactions": 1200
    },
    "byMethod": [
      {
        "method": "cash",
        "totalAmount": 500000.00,
        "transactionCount": 200,
        "percentage": 14.3
      },
      {
        "method": "card",
        "totalAmount": 1000000.00,
        "transactionCount": 300,
        "percentage": 28.6
      },
      {
        "method": "upi",
        "totalAmount": 1500000.00,
        "transactionCount": 500,
        "percentage": 42.8
      },
      {
        "method": "insurance",
        "totalAmount": 500000.00,
        "transactionCount": 200,
        "percentage": 14.3
      }
    ],
    "dailyTrend": [
      {
        "date": "ISO8601",
        "cash": 15000.00,
        "card": 50000.00,
        "upi": 75000.00,
        "insurance": 25000.00
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/billing/reports/payment-method?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Reports Module

### GET /reports/dashboard

**Description:** Get overall hospital dashboard.

**Auth:** Required — `reports:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todayAppointments": 45,
    "todayPatients": 40,
    "todayRevenue": 125000.00,
    "activeIPD": 80,
    "pendingBills": 150,
    "outstandingAmount": 450000.00,
    "pharmacyLowStock": 5,
    "panchakarmaSessions": 15
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/reports/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/dashboard/opd

**Description:** Get OPD dashboard data.

**Auth:** Required — `reports:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  date: ISO8601 date (optional, default: today) - Date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "totalAppointments": 45,
    "completed": 35,
    "cancelled": 5,
    "noShow": 5,
    "totalPatients": 40,
    "newPatients": 10,
    "revenue": 62500.00,
    "byDoctor": [
      {
        "doctorId": "uuid",
        "doctorName": "string",
        "appointments": 10,
        "completed": 8,
        "revenue": 15000.00
      }
    ],
    "hourlyTrend": [
      {
        "hour": "09:00",
        "appointments": 5
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/dashboard/opd?date=2026-01-20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/dashboard/ipd

**Description:** Get IPD dashboard data.

**Auth:** Required — `reports:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalBeds": 200,
    "occupiedBeds": 140,
    "occupancyRate": 70.0,
    "todayAdmissions": 5,
    "todayDischarges": 3,
    "todayTransfers": 2,
    "averageLengthOfStay": 5.2,
    "pendingOrders": 25,
    "pendingRounds": 10,
    "byWard": [
      {
        "wardName": "string",
        "totalBeds": 20,
        "occupied": 15,
        "available": 5
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/reports/dashboard/ipd \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/dashboard/pharmacy

**Description:** Get pharmacy dashboard data.

**Auth:** Required — `reports:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalMedicines": 300,
    "inStock": 280,
    "lowStock": 15,
    "outOfStock": 5,
    "todayDispensings": 45,
    "todayRevenue": 25000.00,
    "pendingRequests": 12,
    "expiringSoon": 8,
    "expired": 2
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/reports/dashboard/pharmacy \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/dashboard/panchakarma

**Description:** Get Panchakarma dashboard data.

**Auth:** Required — `reports:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todaySessions": 15,
    "completedSessions": 5,
    "pendingSessions": 10,
    "activePlans": 25,
    "totalTherapists": 8,
    "availableTherapists": 6,
    "thisMonthRevenue": 375000.00,
    "lowStockAlerts": 3
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/reports/dashboard/panchakarma \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/dashboard/billing

**Description:** Get billing dashboard data.

**Auth:** Required — `reports:read`  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todayCollection": 125000.00,
    "todayBills": 45,
    "pendingAmount": 450000.00,
    "pendingBills": 150,
    "thisMonthCollection": 3500000.00,
    "thisMonthBills": 1200,
    "byPaymentMethod": [
      {
        "method": "cash",
        "amount": 500000.00,
        "count": 200
      },
      {
        "method": "upi",
        "amount": 1500000.00,
        "count": 500
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/reports/dashboard/billing \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/patients/demographics

**Description:** Get patient demographics report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalPatients": 5000,
    "byGender": {
      "male": 2800,
      "female": 2000,
      "other": 200
    },
    "byAgeGroup": [
      {
        "range": "0-18",
        "count": 500,
        "percentage": 10.0
      },
      {
        "range": "19-35",
        "count": 1500,
        "percentage": 30.0
      },
      {
        "range": "36-50",
        "count": 1500,
        "percentage": 30.0
      },
      {
        "range": "51-65",
        "count": 1000,
        "percentage": 20.0
      },
      {
        "range": "65+",
        "count": 500,
        "percentage": 10.0
      }
    ],
    "byBloodGroup": [
      {
        "bloodGroup": "O+",
        "count": 1500
      }
    ],
    "topCities": [
      {
        "city": "Delhi",
        "count": 1500
      }
    ],
    "registrationTrend": [
      {
        "month": "2026-01",
        "count": 150
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/patients/demographics" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/patients/visit-patterns

**Description:** Get patient visit patterns report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalVisits": 1500,
    "uniquePatients": 800,
    "averageVisitsPerPatient": 1.875,
    "byDayOfWeek": [
      {
        "day": "Monday",
        "visits": 300
      }
    ],
    "byHour": [
      {
        "hour": "10:00",
        "visits": 150
      }
    ],
    "returnRate": 60.0,
    "topReasons": [
      {
        "reason": "Follow-up",
        "count": 500,
        "percentage": 33.3
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/patients/visit-patterns?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/opd/daily

**Description:** Get daily OPD report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  date: ISO8601 date (optional, default: today) - Report date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "ISO8601",
    "totalAppointments": 45,
    "completed": 35,
    "cancelled": 5,
    "noShow": 5,
    "totalPatients": 40,
    "newPatients": 10,
    "followUpPatients": 30,
    "totalConsultations": 35,
    "revenue": 62500.00,
    "byDoctor": [
      {
        "doctorId": "uuid",
        "doctorName": "string",
        "specialization": "string",
        "appointments": 10,
        "completed": 8,
        "revenue": 15000.00
      }
    ],
    "topDiagnoses": [
      {
        "diagnosis": "string",
        "count": 10,
        "percentage": 28.6
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/opd/daily?date=2026-01-20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/opd/doctor-workload

**Description:** Get doctor workload report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "doctorId": "uuid",
        "doctorName": "string",
        "specialization": "string",
        "totalAppointments": 100,
        "completedAppointments": 85,
        "averagePerDay": 5,
        "totalRevenue": 125000.00,
        "patientSatisfaction": 4.8
      }
    ],
    "busiestDoctor": {
      "doctorId": "uuid",
      "doctorName": "string",
      "totalAppointments": 100
    },
    "quietestDoctor": {
      "doctorId": "uuid",
      "doctorName": "string",
      "totalAppointments": 50
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/opd/doctor-workload?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/billing/revenue

**Description:** Get revenue report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
  groupBy: string (optional, default: "day") - Group by (day/week/month)
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 3500000.00,
      "totalBills": 1200,
      "averageBillAmount": 2916.67,
      "collectionRate": 85.0
    },
    "byBillType": [
      {
        "billType": "opd",
        "revenue": 1500000.00,
        "count": 600
      },
      {
        "billType": "ipd",
        "revenue": 1200000.00,
        "count": 200
      },
      {
        "billType": "pharmacy",
        "revenue": 500000.00,
        "count": 300
      },
      {
        "billType": "panchakarma",
        "revenue": 300000.00,
        "count": 100
      }
    ],
    "trend": [
      {
        "date": "ISO8601",
        "revenue": 125000.00,
        "bills": 45
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/billing/revenue?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/billing/collection

**Description:** Get collection report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBilled": 3500000.00,
      "totalCollected": 3000000.00,
      "collectionRate": 85.7,
      "pendingAmount": 500000.00
    },
    "byPaymentMethod": [
      {
        "method": "cash",
        "collected": 500000.00,
        "percentage": 16.7
      },
      {
        "method": "card",
        "collected": 1000000.00,
        "percentage": 33.3
      },
      {
        "method": "upi",
        "collected": 1200000.00,
        "percentage": 40.0
      },
      {
        "method": "insurance",
        "collected": 300000.00,
        "percentage": 10.0
      }
    ],
    "dailyTrend": [
      {
        "date": "ISO8601",
        "billed": 125000.00,
        "collected": 110000.00
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/billing/collection?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/billing/outstanding

**Description:** Get outstanding report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOutstanding": 450000.00,
      "totalBills": 150,
      "averageAge": 15
    },
    "ageWise": [
      {
        "range": "0-30 days",
        "count": 80,
        "amount": 200000.00
      },
      {
        "range": "31-60 days",
        "count": 50,
        "amount": 150000.00
      },
      {
        "range": "61-90 days",
        "count": 15,
        "amount": 75000.00
      },
      {
        "range": "90+ days",
        "count": 5,
        "amount": 25000.00
      }
    ],
    "topDefaulters": [
      {
        "patientId": "uuid",
        "patientName": "string",
        "outstandingAmount": 15000.00,
        "oldestBillDays": 45
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/billing/outstanding" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/billing/service-wise

**Description:** Get service-wise collection report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "services": [
      {
        "serviceId": "uuid",
        "serviceName": "string",
        "category": "string",
        "totalBilled": 200,
        "totalRevenue": 100000.00,
        "averagePerBill": 500.00
      }
    ],
    "topServices": [
      {
        "rank": 1,
        "serviceName": "string",
        "billedCount": 200,
        "revenue": 100000.00
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/billing/service-wise?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/billing/payment-method

**Description:** Get payment method wise report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalCollection": 3000000.00,
    "totalTransactions": 1200,
    "byMethod": [
      {
        "method": "cash",
        "totalAmount": 500000.00,
        "transactionCount": 200,
        "percentage": 16.7
      },
      {
        "method": "card",
        "totalAmount": 1000000.00,
        "transactionCount": 300,
        "percentage": 33.3
      },
      {
        "method": "upi",
        "totalAmount": 1200000.00,
        "transactionCount": 500,
        "percentage": 40.0
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/billing/payment-method?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/pharmacy/stock

**Description:** Get pharmacy stock report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  category: string (optional) - Filter by category
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalMedicines": 300,
      "totalStockValue": 1500000.00,
      "lowStockCount": 15,
      "outOfStockCount": 5
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "category": "string",
        "currentStock": 150,
        "minimumStock": 50,
        "stockValue": 15000.00,
        "stockStatus": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/pharmacy/stock" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/pharmacy/dispensing

**Description:** Get pharmacy dispensing report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDispensings": 450,
      "totalRevenue": 125000.00,
      "uniquePatients": 380,
      "averagePerDay": 30
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "quantityDispensed": 500,
        "revenue": 15000.00,
        "dispensingCount": 120
      }
    ],
    "dailyTrend": [
      {
        "date": "ISO8601",
        "dispensings": 30,
        "revenue": 8500.00
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/pharmacy/dispensing?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/pharmacy/expiry

**Description:** Get pharmacy expiry report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  days: integer (optional, default: 90) - Expiry window in days
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "expiringWithin90Days": 8,
      "expired": 2,
      "totalValueAtRisk": 45000.00
    },
    "items": [
      {
        "medicineId": "uuid",
        "medicineName": "string",
        "batchNumber": "string",
        "quantity": 50,
        "expiryDate": "ISO8601",
        "daysUntilExpiry": 45,
        "value": 6000.00,
        "status": "expiring"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/pharmacy/expiry?days=60" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/ipd/occupancy

**Description:** Get IPD occupancy report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "averageOccupancy": 72.5,
      "peakOccupancy": 95.0,
      "lowestOccupancy": 45.0
    },
    "daily": [
      {
        "date": "ISO8601",
        "totalBeds": 200,
        "occupied": 145,
        "occupancyRate": 72.5
      }
    ],
    "byWard": [
      {
        "wardId": "uuid",
        "wardName": "string",
        "averageOccupancy": 75.0
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/ipd/occupancy?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/ipd/admissions

**Description:** Get IPD admissions report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalAdmissions": 150,
      "totalDischarges": 120,
      "totalTransfers": 10,
      "netAdmission": 20
    },
    "daily": [
      {
        "date": "ISO8601",
        "admissions": 5,
        "discharges": 3,
        "transfers": 1
      }
    ],
    "byWard": [
      {
        "wardId": "uuid",
        "wardName": "string",
        "admissions": 50,
        "discharges": 40
      }
    ],
    "topDiagnoses": [
      {
        "diagnosis": "string",
        "count": 30,
        "percentage": 20.0
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/ipd/admissions?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/ipd/length-of-stay

**Description:** Get IPD length of stay report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "averageLengthOfStay": 5.2,
      "medianLengthOfStay": 4.0,
      "minLengthOfStay": 1,
      "maxLengthOfStay": 25,
      "totalDischarged": 100
    },
    "distribution": [
      {
        "range": "1-3 days",
        "count": 30,
        "percentage": 30.0
      },
      {
        "range": "4-7 days",
        "count": 40,
        "percentage": 40.0
      },
      {
        "range": "8-14 days",
        "count": 20,
        "percentage": 20.0
      },
      {
        "range": "15+ days",
        "count": 10,
        "percentage": 10.0
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/ipd/length-of-stay?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/panchakarma/outcomes

**Description:** Get Panchakarma outcomes report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSessions": 150,
      "excellentOutcome": 50,
      "goodOutcome": 60,
      "fairOutcome": 25,
      "poorOutcome": 5,
      "averageRating": 4.8
    },
    "byTherapyType": [
      {
        "therapyType": "string",
        "totalSessions": 50,
        "excellent": 20,
        "good": 20,
        "fair": 8,
        "poor": 2
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/panchakarma/outcomes?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/panchakarma/utilization

**Description:** Get Panchakarma utilization report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "therapistUtilization": [
      {
        "therapistId": "uuid",
        "therapistName": "string",
        "totalHours": 160,
        "bookedHours": 120,
        "utilizationRate": 75.0
      }
    ],
    "roomUtilization": [
      {
        "roomNumber": "string",
        "totalHours": 160,
        "bookedHours": 140,
        "utilizationRate": 87.5
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/panchakarma/utilization?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/audit/user-activity

**Description:** Get user activity audit report.

**Auth:** Required — `reports:read`  
**Rate Limit:** 20/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  dateFrom: ISO8601 date (required) - Start date
  dateTo: ISO8601 date (required) - End date
  userId: uuid (optional) - Filter by user
  action: string (optional) - Filter by action type
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalActions": 5000,
      "uniqueUsers": 50,
      "logins": 800,
      "failedLogins": 15
    },
    "activities": [
      {
        "userId": "uuid",
        "userName": "string",
        "action": "string",
        "module": "string",
        "timestamp": "ISO8601",
        "ipAddress": "string"
      }
    ],
    "byModule": [
      {
        "module": "patients",
        "actions": 1500,
        "percentage": 30.0
      }
    ],
    "byAction": [
      {
        "action": "create",
        "count": 800,
        "percentage": 16.0
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/audit/user-activity?dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /reports/export/:reportId

**Description:** Export a report in CSV/Excel/PDF format.

**Auth:** Required — `reports:export`  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  reportId: string (required) - Report ID
}
Params (Query): {
  format: string (required, enum: csv/excel/pdf) - Export format
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "string",
    "fileName": "string",
    "fileSize": "string",
    "expiresAt": "ISO8601"
  }
}
```

**Response 404:** `REPORT_NOT_FOUND`

**Example:**

```bash
curl "http://localhost:8080/api/v1/reports/export/billing-revenue?format=pdf&dateFrom=2026-01-01&dateTo=2026-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Portal Module

### POST /portal/login

**Description:** Authenticate a patient for the patient portal.

**Auth:** None (public endpoint)  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Content-Type: application/json }
Body: {
  phone: string (required) - Registered phone number
  otp: string (required) - OTP sent to phone
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "name": "string",
      "phone": "string"
    },
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 900
  }
}
```

**Response 401:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Invalid or expired OTP"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/portal/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91-9876543210","otp":"123456"}'
```

---

### POST /portal/refresh

**Description:** Refresh portal access token.

**Auth:** None (public endpoint, requires valid refresh token)  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Content-Type: application/json }
Body: {
  refreshToken: string (required) - Valid refresh token
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 900
  }
}
```

**Response 401:** `INVALID_REFRESH_TOKEN`

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/portal/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."}'
```

---

### POST /portal/logout

**Description:** Log out from the patient portal.

**Auth:** Bearer token required  
**Rate Limit:** 10/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/portal/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/profile

**Description:** Get patient profile.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "phone": "string",
    "email": "string",
    "gender": "string",
    "dateOfBirth": "ISO8601",
    "bloodGroup": "string",
    "address": {
      "line1": "string",
      "city": "string",
      "state": "string",
      "pincode": "string"
    },
    "emergencyContact": {
      "name": "string",
      "phone": "string",
      "relation": "string"
    }
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/portal/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### PUT /portal/profile

**Description:** Update patient profile.

**Auth:** Bearer token required  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  name: string (optional) - Full name
  email: string (optional) - Email address
  address: object (optional) - Address details
  emergencyContact: object (optional) - Emergency contact
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "ISO8601"
  },
  "message": "Profile updated successfully"
}
```

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/portal/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@email.com","address":{"line1":"123 Main St","city":"Delhi"}}'
```

---

### PUT /portal/profile/password

**Description:** Change patient password.

**Auth:** Bearer token required  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token>, Content-Type: application/json }
Body: {
  currentPassword: string (required) - Current password
  newPassword: string (required, min 8 chars) - New password
  confirmPassword: string (required, must match) - Confirm new password
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response 401:** `INVALID_CURRENT_PASSWORD`

**Example:**

```bash
curl -X PUT http://localhost:8080/api/v1/portal/profile/password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"oldpass123","newPassword":"newpass456","confirmPassword":"newpass456"}'
```

---

### GET /portal/bills

**Description:** Get patient's bills.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "billNumber": "string",
        "billType": "string",
        "totalAmount": 5900.00,
        "paidAmount": 5900.00,
        "pendingAmount": 0.00,
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/bills?status=pending" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/appointments

**Description:** Get patient's appointments.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "appointmentNumber": "string",
        "doctor": {
          "name": "string",
          "specialization": "string"
        },
        "date": "ISO8601",
        "timeSlot": {
          "start": "HH:mm",
          "end": "HH:mm"
        },
        "type": "string",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/appointments?status=scheduled" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/prescriptions

**Description:** Get patient's prescriptions.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "prescriptionNumber": "string",
        "doctor": {
          "name": "string"
        },
        "medicines": [
          {
            "name": "string",
            "dosage": "string",
            "frequency": "string",
            "duration": "string"
          }
        ],
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/prescriptions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/referrals

**Description:** Get patient's referrals.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "referralNumber": "string",
        "fromDoctor": {
          "name": "string"
        },
        "toDoctor": {
          "name": "string"
        },
        "department": "string",
        "reason": "string",
        "status": "string",
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/referrals" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/treatment-plans

**Description:** Get patient's Panchakarma treatment plans.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "planNumber": "string",
        "therapies": ["string"],
        "totalSessions": 21,
        "completedSessions": 5,
        "status": "string",
        "startDate": "ISO8601",
        "expectedEndDate": "ISO8601"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/treatment-plans?status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/treatment-plans/:id

**Description:** Get a specific treatment plan with full details.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Plan ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "planNumber": "string",
    "doctor": {
      "name": "string"
    },
    "therapies": [
      {
        "therapyName": "string",
        "sessionsPlanned": 7,
        "sessionsCompleted": 2,
        "pricePerSession": 2500.00
      }
    ],
    "totalSessions": 21,
    "completedSessions": 5,
    "totalAmount": 52500.00,
    "paidAmount": 15000.00,
    "status": "string",
    "startDate": "ISO8601",
    "expectedEndDate": "ISO8601",
    "sessions": [
      {
        "sessionNumber": 1,
        "therapyType": "string",
        "scheduledDate": "ISO8601",
        "scheduledTime": "HH:mm",
        "therapist": {
          "name": "string"
        },
        "status": "string"
      }
    ]
  }
}
```

**Response 404:** `TREATMENT_PLAN_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/portal/treatment-plans/tp1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/sessions

**Description:** Get patient's Panchakarma sessions.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  status: string (optional) - Filter by status
  dateFrom: ISO8601 date (optional) - Start date
  dateTo: ISO8601 date (optional) - End date
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "sessionNumber": 1,
        "therapyType": "string",
        "scheduledDate": "ISO8601",
        "scheduledTime": "HH:mm",
        "therapist": {
          "name": "string"
        },
        "status": "string",
        "outcome": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/sessions?status=completed" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/sessions/:id

**Description:** Get a specific session with details.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Session ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionNumber": 1,
    "therapyType": {
      "name": "string",
      "description": "string"
    },
    "scheduledDate": "ISO8601",
    "scheduledTime": "HH:mm",
    "actualStartTime": "ISO8601",
    "actualEndTime": "ISO8601",
    "therapist": {
      "name": "string"
    },
    "status": "string",
    "preSessionNotes": "string",
    "postSessionNotes": "string",
    "outcome": "string"
  }
}
```

**Response 404:** `SESSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/portal/sessions/s1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/admissions

**Description:** Get patient's IPD admissions.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  status: string (optional) - Filter by status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "admissionNumber": "string",
        "doctor": {
          "name": "string"
        },
        "ward": "string",
        "bed": "string",
        "admissionDate": "ISO8601",
        "expectedDischargeDate": "ISO8601",
        "status": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/admissions?status=admitted" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/admissions/:id

**Description:** Get a specific admission with details.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Admission ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "admissionNumber": "string",
    "doctor": {
      "name": "string"
    },
    "ward": "string",
    "bed": "string",
    "admissionDate": "ISO8601",
    "expectedDischargeDate": "ISO8601",
    "actualDischargeDate": "ISO8601",
    "admissionReason": "string",
    "diagnosis": "string",
    "status": "string",
    "totalCharges": 45000.00,
    "totalPaid": 20000.00,
    "rounds": [
      {
        "roundNumber": 1,
        "date": "ISO8601",
        "doctor": {
          "name": "string"
        },
        "notes": "string"
      }
    ],
    "attendants": [
      {
        "name": "string",
        "relation": "string",
        "phone": "string"
      }
    ]
  }
}
```

**Response 404:** `ADMISSION_NOT_FOUND`

**Example:**

```bash
curl http://localhost:8080/api/v1/portal/admissions/ad1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /portal/notifications

**Description:** Get patient notifications.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  page: integer (optional, default: 1) - Page number
  limit: integer (optional, default: 20) - Items per page
  isRead: boolean (optional) - Filter by read status
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "message": "string",
        "type": "string",
        "isRead": false,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    },
    "unreadCount": 10
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/portal/notifications?isRead=false" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### PATCH /portal/notifications/:id/read

**Description:** Mark a notification as read.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Path): {
  id: uuid (required) - Notification ID
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isRead": true,
    "updatedAt": "ISO8601"
  },
  "message": "Notification marked as read"
}
```

**Response 404:** `NOTIFICATION_NOT_FOUND`

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/portal/notifications/n1b2c3d4-e5f6-7890-abcd-ef1234567890/read \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### PATCH /portal/notifications/read-all

**Description:** Mark all notifications as read.

**Auth:** Bearer token required  
**Rate Limit:** 60/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "updatedCount": 10
  },
  "message": "All notifications marked as read"
}
```

**Example:**

```bash
curl -X PATCH http://localhost:8080/api/v1/portal/notifications/read-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Dashboard Module

### GET /dashboard

**Description:** Get main dashboard data based on user role.

**Auth:** Bearer token required  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "role": "string",
    "summary": {
      "todayAppointments": 45,
      "todayPatients": 40,
      "todayRevenue": 125000.00,
      "pendingTasks": 10
    },
    "recentActivity": [
      {
        "type": "string",
        "description": "string",
        "timestamp": "ISO8601"
      }
    ],
    "alerts": [
      {
        "type": "string",
        "message": "string",
        "priority": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /dashboard/doctor

**Description:** Get doctor-specific dashboard data.

**Auth:** Bearer token required (Doctor role)  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todayAppointments": 10,
    "completedAppointments": 5,
    "pendingAppointments": 5,
    "todayPatients": 8,
    "todayRevenue": 15000.00,
    "upcomingAppointments": [
      {
        "id": "uuid",
        "patientName": "string",
        "time": "HH:mm",
        "type": "string"
      }
    ],
    "recentPatients": [
      {
        "id": "uuid",
        "name": "string",
        "lastVisit": "ISO8601",
        "diagnosis": "string"
      }
    ],
    "pendingReferrals": 3,
    "pendingPrescriptions": 5
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/dashboard/doctor \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /dashboard/receptionist

**Description:** Get receptionist-specific dashboard data.

**Auth:** Bearer token required (Receptionist role)  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todayAppointments": 45,
    "completedAppointments": 30,
    "pendingAppointments": 15,
    "todayPatients": 40,
    "newPatients": 10,
    "todayCollection": 125000.00,
    "pendingBills": 25,
    "upcomingAppointments": [
      {
        "id": "uuid",
        "patientName": "string",
        "doctorName": "string",
        "time": "HH:mm"
      }
    ],
    "recentRegistrations": [
      {
        "id": "uuid",
        "name": "string",
        "uhid": "string",
        "registeredAt": "ISO8601"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/dashboard/receptionist \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /dashboard/pharmacist

**Description:** Get pharmacist-specific dashboard data.

**Auth:** Bearer token required (Pharmacist role)  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "todayDispensings": 45,
    "todayRevenue": 25000.00,
    "pendingPrescriptions": 12,
    "lowStockAlerts": 5,
    "expiringSoon": 3,
    "recentDispensings": [
      {
        "id": "uuid",
        "prescriptionNumber": "string",
        "patientName": "string",
        "amount": 1500.00,
        "dispensedAt": "ISO8601"
      }
    ],
    "pendingMaterialRequests": 8,
    "topSellingMedicines": [
      {
        "medicineName": "string",
        "quantityDispensed": 50,
        "revenue": 6000.00
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/dashboard/pharmacist \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### GET /dashboard/nurse

**Description:** Get nurse-specific dashboard data.

**Auth:** Bearer token required (Nurse role)  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "assignedPatients": 15,
    "todayTasks": 20,
    "completedTasks": 10,
    "pendingTasks": 10,
    "upcomingRounds": [
      {
        "admissionNumber": "string",
        "patientName": "string",
        "ward": "string",
        "bed": "string",
        "roundTime": "HH:mm",
        "doctor": "string"
      }
    ],
    "pendingVitalChecks": 5,
    "pendingMedications": 8,
    "recentTaskCompletions": [
      {
        "taskType": "string",
        "patientName": "string",
        "completedAt": "ISO8601"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:8080/api/v1/dashboard/nurse \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Global Search

### GET /search

**Description:** Global search across all modules.

**Auth:** Bearer token required  
**Rate Limit:** 30/minute

**Request:**

```
Headers: { Authorization: Bearer <token> }
Params (Query): {
  q: string (required, min 2 chars) - Search query
  modules: string (optional) - Comma-separated modules to search (patients,appointments,medicines,bills)
  limit: integer (optional, default: 10) - Max results per module
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "query": "string",
    "results": {
      "patients": [
        {
          "id": "uuid",
          "name": "string",
          "uhid": "string",
          "phone": "string",
          "module": "patients"
        }
      ],
      "appointments": [
        {
          "id": "uuid",
          "appointmentNumber": "string",
          "patientName": "string",
          "doctorName": "string",
          "date": "ISO8601",
          "module": "appointments"
        }
      ],
      "medicines": [
        {
          "id": "uuid",
          "name": "string",
          "category": "string",
          "currentStock": 150,
          "module": "medicines"
        }
      ],
      "bills": [
        {
          "id": "uuid",
          "billNumber": "string",
          "patientName": "string",
          "totalAmount": 5900.00,
          "module": "bills"
        }
      ]
    },
    "totalResults": 25
  }
}
```

**Response 422:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Search query must be at least 2 characters"
  }
}
```

**Example:**

```bash
curl "http://localhost:8080/api/v1/search?q=raj&modules=patients,appointments&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Appendix A: Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `USER_EXISTS` | 409 | User with this email already exists |
| `USER_NOT_FOUND` | 404 | User not found |
| `EMAIL_IN_USE` | 409 | Email already in use by another user |
| `ROLE_EXISTS` | 409 | Role with this name already exists |
| `ROLE_NOT_FOUND` | 404 | Role not found |
| `ROLE_IN_USE` | 409 | Cannot delete role assigned to users |
| `ROLE_NAME_IN_USE` | 409 | Role name already in use |
| `PATIENT_NOT_FOUND` | 404 | Patient not found |
| `PATIENT_EXISTS` | 409 | Patient with this phone already exists |
| `APPOINTMENT_NOT_FOUND` | 404 | Appointment not found |
| `TIME_SLOT_UNAVAILABLE` | 409 | Time slot is not available |
| `ENCOUNTER_NOT_FOUND` | 404 | Encounter not found |
| `CONSULTATION_NOT_FOUND` | 404 | Consultation not found |
| `DIAGNOSIS_NOT_FOUND` | 404 | Diagnosis not found |
| `PRESCRIPTION_NOT_FOUND` | 404 | Prescription not found |
| `PRESCRIPTION_DISPENSED` | 409 | Cannot update dispensed prescription |
| `REFERRAL_NOT_FOUND` | 404 | Referral not found |
| `MEDICINE_NOT_FOUND` | 404 | Medicine not found |
| `MEDICINE_EXISTS` | 409 | Medicine already exists |
| `INSUFFICIENT_STOCK` | 409 | Insufficient stock for dispensing |
| `ALREADY_DISPENSED` | 409 | Prescription already dispensed |
| `CATEGORY_EXISTS` | 409 | Category already exists |
| `CATEGORY_NOT_FOUND` | 404 | Category not found |
| `SUPPLIER_NOT_FOUND` | 404 | Supplier not found |
| `SUPPLIER_EXISTS` | 409 | Supplier already exists |
| `PURCHASE_ORDER_NOT_FOUND` | 404 | Purchase order not found |
| `PO_NOT_EDITABLE` | 409 | Purchase order is not in draft status |
| `PO_NOT_RECEIVED_STATUS` | 409 | Purchase order not in receive status |
| `MATERIAL_REQUEST_NOT_FOUND` | 404 | Material request not found |
| `THERAPY_TYPE_NOT_FOUND` | 404 | Therapy type not found |
| `THERAPY_TYPE_EXISTS` | 409 | Therapy type already exists |
| `TREATMENT_PLAN_NOT_FOUND` | 404 | Treatment plan not found |
| `SESSION_NOT_FOUND` | 404 | Session not found |
| `THERAPIST_NOT_FOUND` | 404 | Therapist not found |
| `WARD_NOT_FOUND` | 404 | Ward not found |
| `WARD_EXISTS` | 409 | Ward already exists |
| `BED_NOT_FOUND` | 404 | Bed not found |
| `BED_EXISTS` | 409 | Bed already exists |
| `BED_NOT_AVAILABLE` | 409 | Bed is not available |
| `ADMISSION_NOT_FOUND` | 404 | Admission not found |
| `ROUND_NOT_FOUND` | 404 | Round not found |
| `TASK_NOT_FOUND` | 404 | Nursing task not found |
| `ORDER_NOT_FOUND` | 404 | Order not found |
| `ATTENDANT_NOT_FOUND` | 404 | Attendant not found |
| `BILL_NOT_FOUND` | 404 | Bill not found |
| `BILL_NOT_EDITABLE` | 409 | Bill is not in draft status |
| `BILL_NOT_DELETABLE` | 409 | Bill cannot be deleted |
| `BILL_ALREADY_PAID` | 409 | Bill is already fully paid |
| `AMOUNT_EXCEEDS_PENDING` | 409 | Payment amount exceeds pending amount |
| `REFUND_EXCEEDS_PAID_AMOUNT` | 409 | Refund amount exceeds paid amount |
| `DISCOUNT_NOT_FOUND` | 404 | Discount scheme not found |
| `DISCOUNT_EXISTS` | 409 | Discount scheme already exists |
| `SERVICE_NOT_FOUND` | 404 | Service not found |
| `SERVICE_CODE_EXISTS` | 409 | Service code already exists |
| `NOTIFICATION_NOT_FOUND` | 404 | Notification not found |
| `REPORT_NOT_FOUND` | 404 | Report not found |
| `INVALID_REFRESH_TOKEN` | 401 | Invalid or expired refresh token |
| `INVALID_OTP` | 401 | Invalid or expired OTP |
| `INVALID_CURRENT_PASSWORD` | 401 | Current password is incorrect |
| `INVALID_STATUS_TRANSITION` | 422 | Invalid status transition |
| `VALIDATION_ERROR` | 422 | Validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |

---

## Appendix B: Status Enums Reference

### Appointment Status
- `scheduled` - Appointment is scheduled
- `in-progress` - Patient has arrived, consultation in progress
- `completed` - Consultation completed
- `cancelled` - Appointment cancelled
- `no-show` - Patient did not show up

### Encounter Status
- `open` - Encounter is active
- `closed` - Encounter is completed

### Prescription Status
- `pending` - Prescription created, not yet dispensed
- `dispensed` - Medicines dispensed
- `cancelled` - Prescription cancelled

### Referral Status
- `pending` - Referral created, awaiting acceptance
- `accepted` - Referral accepted by receiving doctor
- `rejected` - Referral rejected
- `completed` - Referral completed

### Admission Status
- `admitted` - Patient admitted
- `discharged` - Patient discharged
- `transferred` - Patient transferred to another ward/bed

### Bill Status
- `draft` - Bill is being created
- `issued` - Bill issued to patient
- `paid` - Bill fully paid
- `partial` - Partial payment received
- `refunded` - Bill refunded

### Material Request Status
- `pending` - Request awaiting approval
- `approved` - Request approved
- `dispensed` - Items dispensed
- `rejected` - Request rejected

### Purchase Order Status
- `draft` - PO being created
- `pending` - PO awaiting approval
- `approved` - PO approved
- `received` - Items received
- `cancelled` - PO cancelled

---

## Appendix C: Permission Modules Reference

| Module | Permissions |
|--------|-------------|
| `users` | `read`, `create`, `update`, `delete` |
| `roles` | `read`, `create`, `update`, `delete` |
| `patients` | `read`, `create`, `update` |
| `appointments` | `read`, `create`, `update`, `delete` |
| `encounters` | `read`, `create`, `update` |
| `consultations` | `read`, `create`, `update` |
| `diagnoses` | `read`, `create`, `update` |
| `prescriptions` | `read`, `create`, `update` |
| `referrals` | `read`, `create`, `update` |
| `pharmacy` | `read`, `create`, `update`, `stock-update`, `dispense`, `approve`, `reports` |
| `panchakarma` | `read`, `create`, `update`, `reports` |
| `ipd` | `read`, `create`, `update`, `delete`, `reports` |
| `billing` | `read`, `create`, `update`, `delete`, `payment`, `refund`, `refund-approve`, `refund-process`, `reports` |
| `reports` | `read`, `export` |

---

*End of AHMS Volume 13 — Complete API Documentation*
