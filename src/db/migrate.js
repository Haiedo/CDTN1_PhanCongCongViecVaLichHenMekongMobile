// Áp dụng db/schema.sql đúng MỘT lần (ghi vào bảng schema_migrations nên chạy lại không bị lỗi
// "relation already exists"). Thêm --seed để nạp dữ liệu mẫu (db/seed.sql, chạy lại được).
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrate(databaseUrl, { seed = false } = {}) {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    // Khóa tư vấn: nếu có hai tiến trình migrate cùng lúc (vd hai file test chạy song song)
    // thì tiến trình sau phải chờ, tránh lỗi "duplicate key ... pg_type_typname_nsp_index".
    await client.query('SELECT pg_advisory_lock(727001)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', ['001_schema']);
    const existing = await client.query(`SELECT to_regclass('public.customer') AS t`);
    if (done.rowCount === 0 && existing.rows[0].t) {
      // Bảng đã được tạo trước đó (ví dụ chạy tay psql -f db/schema.sql) → chỉ ghi nhận, không tạo lại
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', ['001_schema']);
      console.log('Các bảng đã tồn tại (tạo thủ công) – ghi nhận 001_schema, không tạo lại');
    } else if (done.rowCount === 0) {
      const sql = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', ['001_schema']);
        await client.query('COMMIT');
        console.log('Đã áp dụng 001_schema (db/schema.sql)');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
    } else {
      console.log('001_schema đã áp dụng trước đó – bỏ qua');
    }
    if (seed) {
      await client.query(fs.readFileSync(path.join(__dirname, '../../db/seed.sql'), 'utf8'));
      console.log('Đã nạp dữ liệu mẫu (db/seed.sql)');
    }
  } finally {
    // Nếu mở khóa thất bại (mất kết nối) thì khóa tư vấn tự nhả khi phiên kết thúc; chỉ cần ghi nhận.
    try { await client.query('SELECT pg_advisory_unlock(727001)'); }
    catch (e) { console.warn('Không mở được khóa migrate (tự nhả khi đóng kết nối):', e.message); }
    client.release();
    await pool.end();
  }
}
module.exports = { migrate };

if (require.main === module) {
  require('dotenv').config();
  const url = process.env.DATABASE_URL || require('../config').databaseUrl;
  migrate(url, { seed: process.argv.includes('--seed') })
    .catch((e) => { console.error('Migration lỗi:', e.message); process.exit(1); });
}
