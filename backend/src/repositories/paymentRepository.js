import { getPool } from '../config/db.js';


/**
 * Get all subject packages with test counts and metadata.
 */
export async function getSubjectPackages(studentId = null) {
  const pool = getPool();
  const query = `
    SELECT sp.id, sp.subject_id, sp.price_paise, sp.currency, sp.is_active, sp.features,
           s.name AS subject_name, s.slug AS subject_slug, s.code AS subject_code, s.paper_code AS subject_paper_code,
           COUNT(DISTINCT CASE WHEN t.test_type = 'sectional' AND (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS sectional_test_count,
           COUNT(DISTINCT CASE WHEN t.test_type = 'full_length' AND (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS full_length_test_count,
           COUNT(DISTINCT CASE WHEN t.test_type = 'pyq' AND (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS pyq_test_count,
           COUNT(DISTINCT CASE WHEN (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS total_test_count
    FROM subject_packages sp
    JOIN subjects s ON sp.subject_id = s.id
    LEFT JOIN tests t ON t.subject_id = s.id
    GROUP BY sp.id, sp.subject_id, sp.price_paise, sp.currency, sp.is_active, sp.features,
             s.name, s.slug, s.code, s.paper_code, s.display_order
    ORDER BY COALESCE(s.display_order, 99) ASC, s.name ASC;
  `;

  const { rows } = await pool.query(query);

  let purchasedSubjectIds = new Set();
  if (studentId) {
    const entRes = await pool.query(
      `SELECT subject_id FROM subject_entitlements 
       WHERE user_id = $1 AND status = 'active' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
      [studentId]
    );
    entRes.rows.forEach((r) => purchasedSubjectIds.add(r.subject_id));
  }

  return rows.map((r) => ({
    ...r,
    price_inr: Math.round(r.price_paise / 100),
    is_purchased: purchasedSubjectIds.has(r.subject_id),
  }));
}

/**
 * Get package details for a specific subject.
 */
export async function getSubjectPackageBySubjectId(subjectId, studentId = null) {
  const pool = getPool();
  const query = `
    SELECT sp.id, sp.subject_id, sp.price_paise, sp.currency, sp.is_active, sp.features,
           s.name AS subject_name, s.slug AS subject_slug, s.code AS subject_code, s.paper_code AS subject_paper_code,
           COUNT(DISTINCT CASE WHEN t.test_type = 'sectional' AND (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS sectional_test_count,
           COUNT(DISTINCT CASE WHEN t.test_type = 'full_length' AND (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS full_length_test_count,
           COUNT(DISTINCT CASE WHEN t.test_type = 'pyq' AND (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS pyq_test_count,
           COUNT(DISTINCT CASE WHEN (t.publication_status = 'published' OR t.is_published = true) THEN t.id END)::int AS total_test_count
    FROM subject_packages sp
    JOIN subjects s ON sp.subject_id = s.id
    LEFT JOIN tests t ON t.subject_id = s.id
    WHERE sp.subject_id = $1
    GROUP BY sp.id, sp.subject_id, sp.price_paise, sp.currency, sp.is_active, sp.features,
             s.name, s.slug, s.code, s.paper_code;
  `;

  const { rows } = await pool.query(query, [subjectId]);
  if (rows.length === 0) {
    // If no package record exists yet, fetch subject and provide fallback default package (₹499)
    const subjRes = await pool.query('SELECT id, name, slug, code, paper_code FROM subjects WHERE id = $1', [subjectId]);
    if (subjRes.rows.length === 0) return null;
    const s = subjRes.rows[0];

    // Create package row idempotently
    const insertRes = await pool.query(
      `INSERT INTO subject_packages (subject_id, price_paise, currency)
       VALUES ($1, 49900, 'INR')
       ON CONFLICT (subject_id) DO UPDATE SET updated_at = NOW()
       RETURNING *;`,
      [subjectId]
    );

    return {
      ...insertRes.rows[0],
      subject_name: s.name,
      subject_slug: s.slug,
      subject_code: s.code,
      subject_paper_code: s.paper_code,
      sectional_test_count: 0,
      full_length_test_count: 0,
      pyq_test_count: 0,
      total_test_count: 0,
      price_inr: 499,
      is_purchased: false,
    };
  }

  const pkg = rows[0];
  let isPurchased = false;
  if (studentId) {
    const entRes = await pool.query(
      `SELECT id FROM subject_entitlements 
       WHERE user_id = $1 AND subject_id = $2 AND status = 'active' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [studentId, subjectId]
    );
    isPurchased = entRes.rows.length > 0;
  }

  return {
    ...pkg,
    price_inr: Math.round(pkg.price_paise / 100),
    is_purchased: isPurchased,
  };
}

/**
 * Record a new order in payment_orders.
 */
export async function createPaymentOrder({
  orderId,
  userId,
  subjectId,
  packageId,
  amountPaise,
  currency = 'INR',
  metadata = {},
}) {
  const pool = getPool();
  const query = `
    INSERT INTO payment_orders (
      order_id, user_id, subject_id, package_id, amount_paise, currency, status, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'created', $7)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    orderId,
    userId,
    subjectId,
    packageId,
    amountPaise,
    currency,
    JSON.stringify(metadata),
  ]);
  return rows[0];
}

/**
 * Find order by order_id (Razorpay order ID or internal order ID).
 */
export async function getPaymentOrderByOrderId(orderId) {
  const pool = getPool();
  const query = `
    SELECT po.*, s.name AS subject_name, sp.features
    FROM payment_orders po
    JOIN subjects s ON po.subject_id = s.id
    LEFT JOIN subject_packages sp ON po.package_id = sp.id
    WHERE po.order_id = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [orderId]);
  return rows[0] || null;
}

/**
 * Atomically fulfill a payment order and grant subject entitlement.
 */
export async function fulfillPaymentOrder({
  orderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock and fetch order
    const orderRes = await client.query(
      `SELECT * FROM payment_orders WHERE order_id = $1 FOR UPDATE;`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderRes.rows[0];

    // If order was already fulfilled, return existing entitlement
    if (order.status === 'paid') {
      const existingEntRes = await client.query(
        `SELECT * FROM subject_entitlements WHERE user_id = $1 AND subject_id = $2;`,
        [order.user_id, order.subject_id]
      );
      await client.query('COMMIT');
      return {
        order,
        entitlement: existingEntRes.rows[0],
        alreadyFulfilled: true,
      };
    }

    // 2. Update payment order to 'paid'
    const updateOrderRes = await client.query(
      `UPDATE payment_orders
       SET status = 'paid',
           razorpay_payment_id = $1,
           razorpay_signature = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *;`,
      [razorpayPaymentId, razorpaySignature, order.id]
    );
    const updatedOrder = updateOrderRes.rows[0];

    // 3. Atomically upsert subject entitlement
    const entitlementRes = await client.query(
      `INSERT INTO subject_entitlements (
         user_id, subject_id, order_id, starts_at, status
       )
       VALUES ($1, $2, $3, NOW(), 'active')
       ON CONFLICT (user_id, subject_id) DO UPDATE
       SET status = 'active',
           order_id = EXCLUDED.order_id,
           revoked_at = NULL,
           expires_at = NULL
       RETURNING *;`,
      [order.user_id, order.subject_id, order.id]
    );
    const entitlement = entitlementRes.rows[0];

    await client.query('COMMIT');

    return {
      order: updatedOrder,
      entitlement,
      alreadyFulfilled: false,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get student's purchase history and active entitlements.
 */
export async function getStudentPurchases(userId) {
  const pool = getPool();
  const query = `
    SELECT po.id AS order_table_id, po.order_id, po.amount_paise, po.currency,
           po.status AS order_status, po.razorpay_payment_id, po.created_at AS purchased_at,
           s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.paper_code AS subject_paper_code,
           se.id AS entitlement_id, se.status AS entitlement_status, se.starts_at, se.expires_at,
           COUNT(DISTINCT t.id)::int AS total_tests_unlocked
    FROM payment_orders po
    JOIN subjects s ON po.subject_id = s.id
    LEFT JOIN subject_entitlements se ON se.user_id = po.user_id AND se.subject_id = po.subject_id
    LEFT JOIN tests t ON t.subject_id = s.id AND (t.publication_status = 'published' OR t.is_published = true)
    WHERE po.user_id = $1
    GROUP BY po.id, po.order_id, po.amount_paise, po.currency, po.status,
             po.razorpay_payment_id, po.created_at, s.id, s.name, s.code, s.paper_code,
             se.id, se.status, se.starts_at, se.expires_at
    ORDER BY po.created_at DESC;
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows.map((r) => ({
    ...r,
    amount_inr: Math.round(r.amount_paise / 100),
  }));
}

/**
 * Admin: Update subject package price.
 */
export async function updateSubjectPackage(subjectId, { pricePaise, features, isActive }) {
  const pool = getPool();
  const updates = [];
  const params = [subjectId];
  let pIdx = 2;

  if (pricePaise !== undefined) {
    updates.push(`price_paise = $${pIdx++}`);
    params.push(pricePaise);
  }
  if (features !== undefined) {
    updates.push(`features = $${pIdx++}`);
    params.push(JSON.stringify(features));
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${pIdx++}`);
    params.push(Boolean(isActive));
  }
  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE subject_packages
    SET ${updates.join(', ')}
    WHERE subject_id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
}

/**
 * Admin: Get global free test configuration and eligible candidate tests.
 */
export async function getGlobalFreeTestsAdmin() {
  const pool = getPool();
  const currentQuery = `
    SELECT gft.id, gft.test_type, gft.test_id, gft.updated_at,
           t.title AS test_title, t.test_number, s.name AS subject_name, s.id AS subject_id
    FROM global_free_tests gft
    LEFT JOIN tests t ON gft.test_id = t.id
    LEFT JOIN subjects s ON t.subject_id = s.id;
  `;
  const { rows: current } = await pool.query(currentQuery);

  // Fetch candidate tests for dropdown selector
  const candidatesQuery = `
    SELECT t.id, t.title, t.test_type, t.test_number, s.name AS subject_name
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    WHERE t.test_type IN ('sectional', 'pyq')
      AND (t.publication_status = 'published' OR t.is_published = true)
    ORDER BY s.name ASC, t.test_type ASC, t.test_number ASC;
  `;
  const { rows: candidates } = await pool.query(candidatesQuery);

  return {
    current,
    candidates,
  };
}

/**
 * Admin: Set global free test.
 */
export async function setGlobalFreeTest(testType, testId) {
  const pool = getPool();
  const query = `
    INSERT INTO global_free_tests (test_type, test_id, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (test_type) DO UPDATE
    SET test_id = EXCLUDED.test_id,
        updated_at = NOW()
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [testType, testId]);
  return rows[0];
}

/**
 * Admin: Get revenue analytics and recent transactions.
 */
export async function getPaymentAnalytics() {
  const pool = getPool();
  const revenueRes = await pool.query(`
    SELECT 
      COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid'), 0)::bigint AS total_revenue_paise,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS total_paid_orders,
      COUNT(DISTINCT user_id) FILTER (WHERE status = 'paid')::int AS total_paying_students,
      COUNT(*)::int AS total_orders_created
    FROM payment_orders;
  `);

  const subjectBreakdown = await pool.query(`
    SELECT s.name AS subject_name,
           COUNT(po.id) FILTER (WHERE po.status = 'paid')::int AS paid_orders,
           COALESCE(SUM(po.amount_paise) FILTER (WHERE po.status = 'paid'), 0)::bigint AS revenue_paise
    FROM subjects s
    LEFT JOIN payment_orders po ON po.subject_id = s.id
    GROUP BY s.id, s.name, s.display_order
    ORDER BY COALESCE(s.display_order, 99) ASC, s.name ASC;
  `);

  const recentOrders = await pool.query(`
    SELECT po.id, po.order_id, po.amount_paise, po.status, po.created_at, po.razorpay_payment_id,
           u.full_name AS student_name, u.email AS student_email,
           s.name AS subject_name
    FROM payment_orders po
    JOIN users u ON po.user_id = u.id
    JOIN subjects s ON po.subject_id = s.id
    ORDER BY po.created_at DESC
    LIMIT 25;
  `);

  const rev = revenueRes.rows[0];
  return {
    totalRevenueInr: Math.round(Number(rev.total_revenue_paise) / 100),
    totalRevenuePaise: Number(rev.total_revenue_paise),
    totalPaidOrders: rev.total_paid_orders,
    totalPayingStudents: rev.total_paying_students,
    totalOrdersCreated: rev.total_orders_created,
    subjectBreakdown: subjectBreakdown.rows.map((r) => ({
      ...r,
      revenueInr: Math.round(Number(r.revenue_paise) / 100),
    })),
    recentOrders: recentOrders.rows.map((r) => ({
      ...r,
      amountInr: Math.round(r.amount_paise / 100),
    })),
  };
}
