import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

let pool = null;

if (config.databaseUrl && !config.databaseUrl.includes('YOUR_PASSWORD')) {
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.nodeEnv === 'production' || config.databaseUrl.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });
} else {
  console.info('[PrimePrep Database] DATABASE_URL is not configured yet or has placeholder values. DB operations will be queued or rejected until configured.');
}

export const getPool = () => pool;

/**
 * Execute a parameterized SQL query using the connection pool.
 * @param {string} text - Parameterized SQL text
 * @param {Array} params - Array of parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export const query = async (text, params = []) => {
  if (!pool) {
    throw new Error('Database connection pool is not configured. Please set DATABASE_URL in backend/.env');
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    console.log('[DB Query]', { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
};

/**
 * Check if the database connection is reachable.
 * @returns {Promise<{ status: string, latencyMs?: number, error?: string }>}
 */
export const checkDbHealth = async () => {
  if (!pool) {
    return {
      status: 'unconfigured',
      message: 'DATABASE_URL not set in environment',
    };
  }
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - start;
    return {
      status: 'connected',
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};
