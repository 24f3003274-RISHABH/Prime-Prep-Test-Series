# PrimePrep - REST API Specification

Base URL: `/api`

---

## 1. System & Health

### `GET /api/health`
Returns the operational health, process uptime, environment, and Supabase PostgreSQL connectivity.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "PrimePrep API",
  "version": "1.0.0",
  "uptimeSeconds": 142,
  "timestamp": "2026-10-16T21:00:00.000Z",
  "environment": "development",
  "database": {
    "status": "connected",
    "latencyMs": 84
  }
}
```

---

## 2. Authentication & Authorization

### `POST /api/auth/register`
Registers a new student account. Passwords are automatically hashed with bcrypt. The role is strictly enforced as `'student'`.

**Request Body:**
```json
{
  "fullName": "Student Name",
  "email": "student@example.com",
  "password": "StudentPassword123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Student account created successfully.",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "e3b0c442-...",
    "fullName": "Student Name",
    "email": "student@example.com",
    "role": "student",
    "isActive": true,
    "createdAt": "2026-10-16T..."
  }
}
```

**Errors:**
- `400 Bad Request` — Validation failure (invalid email format, name too short, password < 8 characters).
- `409 Conflict` — Account with this email already exists (`EMAIL_ALREADY_EXISTS`).

---

### `POST /api/auth/login`
Authenticates students or administrators using email and password. Generates a signed JWT with 7-day expiration.

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "StudentPassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "e3b0c442-...",
    "fullName": "Student Name",
    "email": "student@example.com",
    "role": "student",
    "isActive": true,
    "createdAt": "2026-10-16T..."
  }
}
```

**Errors:**
- `401 Unauthorized` — Invalid email or password (`INVALID_CREDENTIALS`).
- `403 Forbidden` — Account is deactivated (`ACCOUNT_INACTIVE`).

---

### `POST /api/auth/setup-admin`
One-time bootstrap endpoint for creating the platform administrator account. Protected by `ADMIN_SETUP_SECRET`. Runs in a PostgreSQL transaction preventing concurrent administrator creation.

**Request Body:**
```json
{
  "setupSecret": "YOUR_ADMIN_SETUP_SECRET",
  "fullName": "PrimePrep Administrator",
  "email": "admin@primeprep.com",
  "password": "YourStrongAdminPassword123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Initial administrator created successfully.",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "a0b1c2d3-...",
    "fullName": "PrimePrep Administrator",
    "email": "admin@primeprep.com",
    "role": "admin",
    "isActive": true,
    "createdAt": "2026-10-16T..."
  }
}
```

**Errors:**
- `403 Forbidden` — Invalid setup secret (`INVALID_SETUP_SECRET`).
- `409 Conflict` — Initial administrator setup has already been completed (`ADMIN_ALREADY_EXISTS`).

---

### `GET /api/auth/me`
Retrieves the profile of the currently authenticated user. Reads current account status from PostgreSQL.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "e3b0c442-...",
    "fullName": "Student Name",
    "email": "student@example.com",
    "role": "student",
    "isActive": true,
    "createdAt": "2026-10-16T..."
  }
}
```

**Errors:**
- `401 Unauthorized` — Missing, malformed, or expired token (`UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_TOKEN`).
- `403 Forbidden` — Account deactivated (`ACCOUNT_INACTIVE`).

---

### `POST /api/auth/logout`
Acknowledges client session termination.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### `GET /api/auth/admin-check`
Protected verification endpoint requiring both `requireAuth` and `requireAdmin` middleware. Used to verify server-side role validation.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Administrator authorization verified.",
  "user": { ... }
}
```

**Errors:**
- `403 Forbidden` — Access denied when called with student token (`FORBIDDEN`).
