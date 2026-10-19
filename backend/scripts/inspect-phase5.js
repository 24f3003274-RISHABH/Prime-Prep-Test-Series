import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const tables = ['subjects', 'chapters', 'tests', 'test_series_settings', 'test_questions', 'questions', 'attempts'];

  for (const table of tables) {
    const cols = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 
       ORDER BY ordinal_position`,
      [table]
    );
    console.log(`\n=== TABLE: ${table} ===`);
    console.table(cols.rows);

    const fks = await pool.query(
      `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`,
      [table]
    );
    if (fks.rows.length) console.log(`Foreign keys for ${table}:`, fks.rows);

    const checks = await pool.query(
      `SELECT tc.constraint_name, cc.check_clause
       FROM information_schema.table_constraints tc
       JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
       WHERE tc.table_schema = 'public' AND tc.table_name = $1`,
      [table]
    );
    if (checks.rows.length) console.log(`Check constraints for ${table}:`, checks.rows);

    const uqs = await pool.query(
      `SELECT tc.constraint_name, string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as cols
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public' AND tc.table_name = $1
       GROUP BY tc.constraint_name`,
      [table]
    );
    if (uqs.rows.length) console.log(`Unique constraints for ${table}:`, uqs.rows);
  }

  const subjects = await pool.query('SELECT * FROM subjects ORDER BY display_order');
  console.log('\nCurrent subjects:', subjects.rows);

  const settings = await pool.query('SELECT * FROM test_series_settings');
  console.log('\nCurrent test_series_settings:', settings.rows);

  await pool.end();
}

run().catch(console.error);
