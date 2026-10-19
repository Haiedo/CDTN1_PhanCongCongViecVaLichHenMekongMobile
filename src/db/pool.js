// LỚP LƯU TRỮ – kết nối PostgreSQL. Mật khẩu chỉ nằm trong .env, không nằm trong mã.
const { Pool } = require('pg');
const config = require('../config');
const pool = new Pool({ connectionString: config.databaseUrl });

// Chạy fn trong MỘT giao dịch (NFR2: kiểm tra và ghi cùng giao dịch).
async function withTransaction(fn, db = pool) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
module.exports = { pool, withTransaction };
