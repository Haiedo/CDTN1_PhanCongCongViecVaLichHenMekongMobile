// LỚP LƯU TRỮ – kết nối PostgreSQL. Địa chỉ và mật khẩu chỉ nằm trong .env, không nằm trong mã.
const { Pool } = require('pg');
const config = require('../config');
const pool = new Pool({ connectionString: config.databaseUrl });

// Kết nối rảnh bị PostgreSQL ngắt (khởi động lại, tắt dịch vụ) phát sự kiện 'error'.
// Không có bộ lắng nghe này thì Node thoát cả tiến trình; có thì chỉ ghi log và pool tự mở kết nối mới.
pool.on('error', (err) => console.error('Kết nối rảnh tới PostgreSQL bị lỗi:', err.message));

// Chạy fn trong MỘT giao dịch (NFR2: kiểm tra và ghi cùng giao dịch).
async function withTransaction(fn, db = pool) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    // Lỗi gốc (err) mới là thứ cần báo; nếu ROLLBACK cũng hỏng (mất kết nối) chỉ ghi log rồi vẫn ném lỗi gốc.
    await client.query('ROLLBACK').catch((e) => console.error('ROLLBACK thất bại:', e.message));
    throw err;
  } finally {
    client.release();
  }
}
module.exports = { pool, withTransaction };
