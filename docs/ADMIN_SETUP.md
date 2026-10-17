# PrimePrep - Administrator Setup & Security Guide

This document defines the procedure for bootstrapping the initial administrator account.

---

## 1. Principles of Initial Administrator Bootstrap

1. **No Hardcoded Passwords:** The system contains zero default or hardcoded credentials.
2. **One-Time Execution:** The bootstrap mechanism runs exactly once. Once an administrator account exists, subsequent attempts fail with HTTP 409 Conflict and are recorded in `admin_audit_logs`.
3. **Protected Secret:** The bootstrap command requires `ADMIN_SETUP_SECRET`, configured in `backend/.env`.
4. **Bcrypt Hashing:** Passwords are salted and hashed using `bcrypt` (10 rounds).
5. **No Public Admin Creation:** Public registration (`POST /api/auth/register`) strictly coerces role to `student` on the server.
6. **Server-Side Authorization:** Admin permissions are validated server-side on every request via `requireAdmin` middleware checking PostgreSQL database role.

---

## 2. Bootstrapping Instructions

### Method 1: Using the REST API (`POST /api/auth/setup-admin`)
You can bootstrap the administrator via curl, Postman, or the web UI:

```bash
curl -X POST http://localhost:3000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "setupSecret": "YOUR_ADMIN_SETUP_SECRET",
    "fullName": "PrimePrep Administrator",
    "email": "admin@primeprep.com",
    "password": "YourStrongAdminPassword123!"
  }'
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Initial administrator created successfully.",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "c1f7a0b5-...",
    "fullName": "PrimePrep Administrator",
    "email": "admin@primeprep.com",
    "role": "admin",
    "isActive": true,
    "createdAt": "2026-10-16T..."
  }
}
```

### Method 2: Using the CLI Script (`backend/scripts/bootstrap-admin.js`)
Run directly in your terminal or via SSH on Render:
```bash
node backend/scripts/bootstrap-admin.js \
  --secret "YOUR_ADMIN_SETUP_SECRET" \
  --name "Platform Administrator" \
  --email "admin@primeprep.com" \
  --password "YourStrongAdminPassword123!"
```

### Method 3: Using the Web UI
1. Navigate to the PrimePrep Web UI.
2. Click on the **Admin Bootstrap** tab.
3. Enter the `ADMIN_SETUP_SECRET`, full name, email, and password.
4. Click **Bootstrap Administrator Account**.
5. You will immediately be authenticated and redirected to the **Administrator Management Portal**.

---

## 3. Post-Bootstrap Security Best Practices

1. **Remove or Invalidate Secret:** Once the initial administrator account is created, you may safely remove or change `ADMIN_SETUP_SECRET` in your production environment variables.
2. **Subsequent Administrators:** Any additional administrators needed in the future must be created by an authenticated administrator through an authorized administrative workflow.
3. **Audit Trail Verification:** Inspect `admin_audit_logs` in PostgreSQL to view the timestamp and metadata of the initial bootstrap event:
   ```sql
   SELECT * FROM admin_audit_logs WHERE action = 'INITIAL_ADMIN_BOOTSTRAP';
   ```
