# PrimePrep - Administrator Setup & Security Guide

This document defines the procedure for bootstrapping the initial administrator account.

---

## 1. Principles of Initial Administrator Bootstrap

1. **No Hardcoded Passwords:** The system contains zero default or hardcoded credentials.
2. **One-Time Execution:** The bootstrap mechanism runs exactly once. Once an administrator account exists, subsequent attempts fail and are recorded in `audit_logs`.
3. **Protected Secret:** The bootstrap command requires `ADMIN_SETUP_SECRET`, configured in `backend/.env`.
4. **Bcrypt Hashing:** Passwords are salted and hashed using `bcrypt` (work factor 12).
5. **No Frontend Privileges:** Admin permissions are validated server-side on every request via JWT claims checked against the database.

---

## 2. Bootstrapping Instructions (Scheduled for Phase 3)

### Step 1: Generate High-Entropy Secret
Generate a random secret for `ADMIN_SETUP_SECRET` and add it to `backend/.env`:
```bash
ADMIN_SETUP_SECRET=your_super_secret_bootstrap_key_12345
```

### Step 2: Run CLI Bootstrap Script
Run the dedicated Node.js bootstrap script:
```bash
node backend/scripts/bootstrap-admin.js --email admin@primeprep.com --name "Platform Administrator"
```
You will be prompted to enter a password securely (or provide via environment variable).

### Step 3: Audit Trail Verification
The script inserts:
1. Administrator record in `admin_users` table with bcrypt-hashed password.
2. An audit event in `audit_logs` capturing timestamp, admin email, and IP address.
