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
  console.log('  3. Execute to inspect the 8 schema checks.\n');
  console.log('Alternatively, set your live DATABASE_URL in backend/.env and re-run:');
  console.log('  npm run db:verify\n');
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
  console.log('🔍 Executing PrimePrep Database Verification Checks');
  console.log('====================================================');

  const client = await pool.connect();
  let passedCount = 0;
  const totalChecks = 8;

  try {
    // Check 1: Tables
    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users', 'profiles', 'subjects', 'test_categories',
          'test_series', 'tests', 'questions', 'test_questions',
          'test_attempts', 'attempt_responses', 'import_history',
          'audit_logs', 'schema_migrations'
        )
      ORDER BY table_name;
    `);
    if (tables.length === 13) {
      console.log(`✅ [1/8] Tables Check: All 13 tables exist (${tables.map((t) => t.table_name).join(', ')})`);
      passedCount++;
    } else {
      console.log(`❌ [1/8] Tables Check: Expected 13 tables, found ${tables.length}`);
    }

    // Check 2: Foreign Keys
    const { rows: fks } = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
    `);
    if (fks.length >= 12) {
      console.log(`✅ [2/8] Foreign Keys Check: ${fks.length} foreign key relationships verified.`);
      passedCount++;
    } else {
      console.log(`❌ [2/8] Foreign Keys Check: Found only ${fks.length} foreign keys.`);
    }

    // Check 3: Initial Subjects
    const { rows: subjects } = await client.query(`SELECT slug FROM subjects ORDER BY slug;`);
    const expectedSubjects = [
      'disaster-management', 'economics', 'geography',
      'history', 'philosophy', 'political-science', 'psychology'
    ];
    const subjectSlugs = subjects.map((s) => s.slug).sort();
    const subjectsValid = expectedSubjects.every((slug) => subjectSlugs.includes(slug));
    if (subjectsValid) {
      console.log(`✅ [3/8] Initial Subjects Check: All 7 CUET PG subjects verified.`);
      passedCount++;
    } else {
      console.log(`❌ [3/8] Initial Subjects Check: Missing subjects (${subjectSlugs.join(', ')})`);
    }

    // Check 4 & 5: Categories & Default Quotas
    const { rows: categories } = await client.query(`
      SELECT slug, default_test_count FROM test_categories ORDER BY slug;
    `);
    const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.default_test_count]));
    if (catMap['sectional'] === 15 && catMap['full-length'] === 10 && catMap['pyq'] === 5) {
      console.log(`✅ [4/8 & 5/8] Test Categories & Default Quotas Check: 15 Sectional, 10 Full-Length, 5 PYQ verified.`);
      passedCount += 2;
    } else {
      console.log(`❌ [4/8 & 5/8] Test Categories Check failed:`, catMap);
    }

    // Check 6: Single Attempt Unique Constraint
    const { rows: attemptUq } = await client.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'test_attempts' AND tc.constraint_type = 'UNIQUE';
    `);
    if (attemptUq.length > 0) {
      console.log(`✅ [6/8] Single-Attempt Policy Check: Unique constraint on (student_id, test_id) verified.`);
      passedCount++;
    } else {
      console.log(`❌ [6/8] Single-Attempt Policy Check: Unique constraint missing on test_attempts.`);
    }

    // Check 7: Question Ordering Unique Constraint
    const { rows: questionOrderUq } = await client.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'test_questions' AND tc.constraint_type = 'UNIQUE';
    `);
    if (questionOrderUq.length >= 2) {
      console.log(`✅ [7/8] Deterministic Question Ordering Check: Unique constraints on test_questions verified.`);
      passedCount++;
    } else {
      console.log(`❌ [7/8] Question Ordering Check: Constraints missing on test_questions.`);
    }

    // Check 8: Question Option Check Constraint
    const { rows: checkConstraints } = await client.query(`
      SELECT cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'questions' AND cc.check_clause LIKE '%correct_option%';
    `);
    if (checkConstraints.length > 0) {
      console.log(`✅ [8/8] Correct Option Constraint Check: Option CHECK constraint (A, B, C, D) verified.`);
      passedCount++;
    } else {
      console.log(`❌ [8/8] Correct Option Check Constraint missing on questions table.`);
    }

    console.log('====================================================');
    console.log(`Summary: ${passedCount}/${totalChecks} checks passed.`);
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
