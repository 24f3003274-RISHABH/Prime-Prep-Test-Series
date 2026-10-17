import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { getPool } from '../src/config/db.js';

test('GET /api/health should return 200 with status ok and service info', async (t) => {
  const res = await new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        const json = await response.json();
        resolve({ status: response.status, body: json });
      } finally {
        server.close();
      }
    });
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.strictEqual(res.body.service, 'PrimePrep API');
  assert.ok(typeof res.body.uptimeSeconds === 'number');
  assert.ok(res.body.database);
});

test.after(async () => {
  const pool = getPool();
  if (pool) {
    await pool.end();
  }
});
