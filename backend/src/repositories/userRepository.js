import { query, getPool } from '../config/db.js';

export const findByEmail = async (email) => {
  const normalized = email.trim().toLowerCase();
  const res = await query(
    `SELECT id, full_name, email, password_hash, role, is_active, created_at, updated_at
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1;`,
    [normalized]
  );
  return res.rows[0] || null;
};

export const findById = async (id) => {
  const res = await query(
    `SELECT id, full_name, email, role, is_active, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
};

export const createStudent = async ({ fullName, email, passwordHash }) => {
  const normalized = email.trim().toLowerCase();
  const res = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'student', true)
     RETURNING id, full_name, email, role, is_active, created_at, updated_at;`,
    [fullName, normalized, passwordHash]
  );
  return res.rows[0];
};

export const countAdmins = async () => {
  const res = await query(
    `SELECT COUNT(*)::int as count FROM users WHERE role = 'admin';`
  );
  return res.rows[0]?.count || 0;
};

/**
 * Transactional bootstrap of initial administrator to avoid race conditions.
 */
export const createInitialAdminTransactional = async ({ fullName, email, passwordHash, metadata = {} }) => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not configured.');
  }

  const client = await pool.connect();
  const normalized = email.trim().toLowerCase();

  try {
    await client.query('BEGIN');

    // Acquire lock and verify no admin exists
    const adminCheck = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1 FOR UPDATE;`
    );

    if (adminCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      const err = new Error('Initial administrator setup has already been completed.');
      err.code = 'ADMIN_ALREADY_EXISTS';
      err.statusCode = 409;
      throw err;
    }

    // Check if email already exists
    const emailCheck = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;`,
      [normalized]
    );

    let adminUser;
    if (emailCheck.rows.length > 0) {
      // Upgrade existing account to admin
      const existingId = emailCheck.rows[0].id;
      const updateRes = await client.query(
        `UPDATE users
         SET full_name = $1, password_hash = $2, role = 'admin', is_active = true, updated_at = NOW()
         WHERE id = $3
         RETURNING id, full_name, email, role, is_active, created_at, updated_at;`,
        [fullName, passwordHash, existingId]
      );
      adminUser = updateRes.rows[0];
    } else {
      const insertRes = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'admin', true)
         RETURNING id, full_name, email, role, is_active, created_at, updated_at;`,
        [fullName, normalized, passwordHash]
      );
      adminUser = insertRes.rows[0];
    }

    // Insert audit log
    await client.query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'INITIAL_ADMIN_BOOTSTRAP', 'users', $1, $2::jsonb);`,
      [
        adminUser.id,
        JSON.stringify({
          email: adminUser.email,
          fullName: adminUser.full_name,
          ...metadata,
        }),
      ]
    );

    await client.query('COMMIT');
    return adminUser;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
