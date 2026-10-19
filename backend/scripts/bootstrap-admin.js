import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { createInitialAdminTransactional, countAdmins } from '../src/repositories/userRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

async function runBootstrap() {
  console.log('====================================================');
  console.log('🛡️  PrimePrep Initial Administrator Bootstrap CLI');
  console.log('====================================================');

  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const email = getArg('--email') || process.env.BOOTSTRAP_ADMIN_EMAIL;
  const fullName = getArg('--name') || process.env.BOOTSTRAP_ADMIN_NAME || 'Platform Administrator';
  const password = getArg('--password') || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const secret = getArg('--secret') || process.env.ADMIN_SETUP_SECRET;

  const expectedSecret = process.env.ADMIN_SETUP_SECRET;

  if (!expectedSecret) {
    console.error('❌ Error: ADMIN_SETUP_SECRET is not configured in backend/.env');
    process.exit(1);
  }

  if (secret !== expectedSecret) {
    console.error('❌ Error: Provided setup secret does not match ADMIN_SETUP_SECRET.');
    process.exit(1);
  }

  if (!email || !password) {
    console.error('❌ Error: Email and password are required.');
    console.log('Usage: node backend/scripts/bootstrap-admin.js --email <email> --password <password> [--name <name>] [--secret <secret>]');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const existingAdminCount = await countAdmins();
  if (existingAdminCount > 0) {
    console.error('❌ Error: An administrator account already exists. Bootstrap aborted.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await createInitialAdminTransactional({
    fullName,
    email,
    passwordHash,
    metadata: {
      source: 'cli_bootstrap',
      timestamp: new Date().toISOString(),
    },
  });

  console.log('✅ Initial administrator created successfully!');
  console.log(`   ID:        ${admin.id}`);
  console.log(`   Name:      ${admin.full_name}`);
  console.log(`   Email:     ${admin.email}`);
  console.log(`   Role:      ${admin.role}`);
  console.log('====================================================\n');
  process.exit(0);
}

runBootstrap().catch((err) => {
  console.error('\n❌ Bootstrap failed:', err.message);
  process.exit(1);
});
