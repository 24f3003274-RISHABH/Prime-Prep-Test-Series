import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env or root .env
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
  console.error('\n❌ [Migration Error] DATABASE_URL is not configured or contains placeholder credentials.');
  console.error('Please configure your valid Supabase PostgreSQL connection string in backend/.env:');
  console.error('  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase.co') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
});

async function runMigrations() {
  console.log('====================================================');
  console.log('🔄 PrimePrep Database Migration Runner');
  console.log('====================================================');

  const client = await pool.connect();
  const migrationsDir = path.resolve(__dirname, '../migrations');

  try {
    // 1. Create schema_migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Query already applied migrations
    const { rows: appliedRows } = await client.query(
      'SELECT name FROM schema_migrations ORDER BY id ASC'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 3. Read migration files sorted alphabetically
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('ℹ️  No SQL migration files found in backend/migrations.');
      return;
    }

    let newlyAppliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏩  Skipping already applied: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⏳  Applying migration: ${file}...`);
      const startTime = Date.now();

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        const elapsed = Date.now() - startTime;
        console.log(`✅  Successfully applied: ${file} (${elapsed}ms)`);
        newlyAppliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\n❌  Failed applying migration: ${file}`);
        console.error(`    Error: ${err.message}\n`);
        throw err;
      }
    }

    console.log('====================================================');
    if (newlyAppliedCount > 0) {
      console.log(`🎉 Migration complete! ${newlyAppliedCount} new migration(s) applied successfully.`);
    } else {
      console.log('✨ All migrations are up to date. Database schema is current.');
    }
    console.log('====================================================\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('[Migration Runner Fatal Error]', err.message);
  process.exit(1);
});
