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
  "timestamp": "2026-10-16T20:30:00.000Z",
  "environment": "development",
  "database": {
    "status": "connected",
    "latencyMs": 14
  }
}
```

---

## 2. Authentication (Phase 3)

- `POST /api/auth/register` - Student account registration
- `POST /api/auth/login` - Student & admin authentication
- `POST /api/auth/logout` - Invalidate session / clear cookie
- `GET /api/auth/me` - Retrieve authenticated identity & role

---

## 3. Academic Content (Phase 4)

- `GET /api/subjects` - List active subjects
- `GET /api/subjects/:id` - Subject details
- `GET /api/test-categories` - List categories (Sectional, Full-Length, PYQ)
- `GET /api/subjects/:id/test-series` - List test series for subject
- `GET /api/test-series/:id/tests` - List available tests

---

## 4. Bulk Question Import (Phase 5)

- `GET /api/admin/imports/template` - Download standard XLSX template
- `POST /api/admin/imports/preview` - Upload & validate Excel file without committing
- `POST /api/admin/imports/confirm` - Transactional database insertion
- `GET /api/admin/imports` - Audit log of previous imports

---

## 5. Test Engine (Phase 6)

- `POST /api/tests/:id/attempts` - Start test session & initialize server timer
- `PUT /api/attempts/:id/responses` - Save answer or toggle review status
- `POST /api/attempts/:id/submit` - Complete test & trigger backend scoring
- `GET /api/attempts/:id/results` - Review final score, question breakdown, and explanations
