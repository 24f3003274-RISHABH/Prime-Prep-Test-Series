import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate .env paths to scan (both root and backend folder)
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const rawJwtSecret = (process.env.JWT_SECRET || '').trim();
const rawAdminSetupSecret = (process.env.ADMIN_SETUP_SECRET || '').trim();

// Security validation diagnostics
if (!rawJwtSecret) {
  console.warn('[Security Warning] JWT_SECRET is not configured in process.env. Using development fallback.');
} else if (rawJwtSecret.length < 32) {
  console.warn('[Security Warning] JWT_SECRET is under 32 characters. Production requires >= 32 characters.');
}

if (!rawAdminSetupSecret) {
  console.warn('[Security Warning] ADMIN_SETUP_SECRET is not configured. Administrator bootstrap endpoint will return 500.');
} else if (rawAdminSetupSecret.length < 32) {
  console.warn('[Security Warning] ADMIN_SETUP_SECRET is under 32 characters. Production requires >= 32 characters.');
}

if (rawJwtSecret && rawAdminSetupSecret && rawJwtSecret === rawAdminSetupSecret) {
  console.error('[Security Hazard] CRITICAL: JWT_SECRET and ADMIN_SETUP_SECRET are set to the exact same value! They must be separated.');
}

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: (process.env.DATABASE_URL || '').trim(),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').trim(),
  jwtSecret: rawJwtSecret || 'dev_jwt_secret_change_in_production_min_32_chars',
  adminSetupSecret: rawAdminSetupSecret,
};
