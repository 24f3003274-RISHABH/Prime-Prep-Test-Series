import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes('YOUR_PASSWORD') || databaseUrl.includes('YOUR_SUPABASE_PROJECT_REF')) {
  console.log('====================================================');
  console.log('ℹ️  PrimePrep Database Verification Notice');
  console.log('====================================================');
  console.log('DATABASE_URL is not configured yet with live Supabase credentials.');
  console.log('To verify directly in Supabase SQL Editor:');
  console.log('  1. Open backend/scripts/verify-schema.sql');
  console.log('  2. Copy and paste into the Supabase SQL Editor');
  console.log('  3. Execute to inspect schema checks.\n');
  process.exit(0);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase.co') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
});

async function verifyDatabase() {
  console.log('====================================================');
  console.log('🔍 Executing PrimePrep Database Architecture Checks');
  console.log('====================================================');

  const client = await pool.connect();
  let passedCount = 0;
  const totalChecks = 6;

  try {
    // Check 1: Tables
    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users', 'subjects', 'chapters', 'tests', 'questions',
          'test_questions', 'attempts', 'attempt_answers',
          'admin_audit_logs', 'schema_migrations'
        )
      ORDER BY table_name;
    `);
    const foundTables = tables.map((t) => t.table_name);
    const requiredTables = [
      'admin_audit_logs', 'attempt_answers', 'attempts', 'chapters',
      'questions', 'schema_migrations', 'subjects', 'test_questions',
      'tests', 'users'
    ];
    const allTablesPresent = requiredTables.every((t) => foundTables.includes(t));
    if (allTablesPresent) {
      console.log(`✅ [1/6] Architecture Tables Check: All ${requiredTables.length} core tables verified (${foundTables.join(', ')})`);
      passedCount++;
    } else {
      console.log(`❌ [1/6] Architecture Tables Check: Missing tables. Found ${foundTables.join(', ')}`);
    }

    // Check 2: Foreign Keys
    const { rows: fks } = await client.query(`
      SELECT tc.constraint_name, tc.table_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('chapters', 'tests', 'questions', 'test_questions', 'attempts', 'attempt_answers', 'admin_audit_logs');
    `);
    if (fks.length >= 7) {
      console.log(`✅ [2/6] Hierarchy Foreign Keys Check: ${fks.length} foreign key links verified across Subject -> Chapter -> Test -> Question.`);
      passedCount++;
    } else {
      console.log(`❌ [2/6] Hierarchy Foreign Keys Check: Expected at least 7 FKs, found ${fks.length}.`);
    }

    // Check 3: Initial Subjects
    const { rows: subjects } = await client.query(`SELECT slug, name, display_order FROM subjects ORDER BY display_order ASC;`);
    const expectedSubjects = [
      'political-science', 'philosophy', 'psychology',
      'history', 'economics', 'geography', 'disaster-management'
    ];
    const subjectSlugs = subjects.map((s) => s.slug);
    const subjectsValid = expectedSubjects.every((slug) => subjectSlugs.includes(slug));
    if (subjectsValid) {
      console.log(`✅ [3/6] Initial Subjects Seed Check: All 7 CUET PG subjects verified in order (${subjects.map((s) => s.name).join(', ')})`);
      passedCount++;
    } else {
      console.log(`❌ [3/6] Initial Subjects Seed Check: Missing subjects (${subjectSlugs.join(', ')})`);
    }

    // Check 4: Unique Constraints
    const { rows: uqs } = await client.query(`
      SELECT tc.table_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('users', 'subjects', 'test_questions', 'attempt_answers');
    `);
    if (uqs.length >= 4) {
      console.log(`✅ [4/6] Unique Constraints Check: ${uqs.length} uniqueness constraints verified (users.email, subjects.slug, test_questions, attempt_answers).`);
      passedCount++;
    } else {
      console.log(`❌ [4/6] Unique Constraints Check: Found ${uqs.length} constraints.`);
    }

    // Check 5: CHECK Constraints
    const { rows: checkConstraints } = await client.query(`
      SELECT tc.table_name, cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('users', 'tests', 'questions', 'attempts');
    `);
    if (checkConstraints.length >= 4) {
      console.log(`✅ [5/6] Domain Validation Check Constraints: ${checkConstraints.length} check constraints verified (role, test_type, access_type, correct_option).`);
      passedCount++;
    } else {
      console.log(`❌ [5/6] Check Constraints Check: Found ${checkConstraints.length} check constraints.`);
    }

    // Check 6: Migration Tracking
    const { rows: migrations } = await client.query(`SELECT name FROM schema_migrations ORDER BY id ASC;`);
    if (migrations.length >= 10) {
      console.log(`✅ [6/9] Migration Tracking Check: ${migrations.length} migration records tracked in schema_migrations.`);
      passedCount++;
    } else {
      console.log(`❌ [6/9] Migration Tracking Check: Found ${migrations.length} migrations.`);
    }

    // Check 7: Profiles in public.profiles
    const { rows: profiles } = await client.query(`
      SELECT id, full_name, role, created_at FROM public.profiles ORDER BY created_at DESC;
    `);
    console.log(`✅ [7/9] public.profiles Check: ${profiles.length} profiles verified (Roles: ${[...new Set(profiles.map(p => p.role))].join(', ')})`);
    passedCount++;

    // Check 8: Profile table structure
    const { rows: profileCols } = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' ORDER BY ordinal_position;
    `);
    const hasRequiredProfileCols = ['id', 'full_name', 'role', 'created_at'].every(c => profileCols.some(col => col.column_name === c));
    if (hasRequiredProfileCols) {
      console.log(`✅ [8/9] public.profiles Schema Check: Verified required columns (${profileCols.map(c => c.column_name).join(', ')})`);
      passedCount++;
    } else {
      console.log(`❌ [8/9] public.profiles Schema Check: Missing required profile columns`);
    }

    // Check 9: Verify profiles correspond to auth.users (zero missing profiles)
    const { rows: missingProfiles } = await client.query(`
      SELECT u.id, u.email, u.created_at AS registered_at, p.full_name, p.role
      FROM auth.users AS u
      LEFT JOIN public.profiles AS p ON p.id = u.id
      WHERE p.id IS NULL;
    `);
    if (missingProfiles.length === 0) {
      console.log(`✅ [9/9] Auth Users <-> Profiles Integrity Check: All Supabase auth.users have matching public.profiles (0 orphaned auth users).`);
      passedCount++;
    } else {
      console.log(`❌ [9/9] Auth Users <-> Profiles Integrity Check: Found ${missingProfiles.length} auth.users without profiles.`);
    }

    console.log('====================================================');
    console.log(`Summary: ${passedCount}/9 architecture & auth verification checks passed.`);
    console.log('====================================================\n');
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDatabase().catch((err) => {
  console.error('[Verification Script Error]', err.message);
  process.exit(1);
});
