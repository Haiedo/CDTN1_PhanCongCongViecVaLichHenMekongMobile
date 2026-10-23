// Khôi phục dữ liệu demo: xóa MỌI dữ liệu nghiệp vụ trong CSDL của DATABASE_URL rồi nạp lại db/seed.sql.
// Dùng khi các phiếu mẫu đã bị phân công hết (do thử curl hoặc thử giao diện) và muốn làm lại luồng từ đầu.
// Chạy: npm run demo:reset
require('dotenv').config();
const { Client } = require('pg');
const { migrate } = require('../src/db/migrate');
const url = process.env.DATABASE_URL || require('../src/config').databaseUrl;

(async () => {
  const dbName = new URL(url).pathname.slice(1);
  console.log(`Khôi phục dữ liệu demo trong CSDL "${dbName}"…`);
  await migrate(url, { seed: false });                       // đảm bảo bảng đã tồn tại
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('TRUNCATE appointment, ticket_assignment, ticket, technician_skill, technician, customer RESTART IDENTITY CASCADE');
  await c.end();
  await migrate(url, { seed: true });
  console.log('Xong: phiếu T-2026-0042 và T-2026-0043 đang Chờ phân công, T-2026-0044 đã giao TECH-003; chưa có lịch hẹn.');
})().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });
