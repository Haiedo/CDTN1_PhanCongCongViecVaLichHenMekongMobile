// Chạy TOÀN BỘ luồng chính L4 từ đầu đến cuối trên dữ liệu mẫu THẬT (db/seed.sql), qua HTTP thật, và in đầu vào/đầu ra.
// Luồng (theo đặc tả UC2/UC3 ở BT1): đăng nhập → xem phiếu chờ → gợi ý → phân công → đặt lịch → thử đặt trùng → khách xác nhận.
// Dùng CSDL KIỂM THỬ (TEST_DATABASE_URL) và XÓA SẠCH nó trước khi chạy, để chạy lần nào cũng cho cùng kết quả.
//   npm run e2e
require('dotenv').config();
const { Pool } = require('pg');
const url = process.env.TEST_DATABASE_URL;
if (!url) { console.error('Thiếu TEST_DATABASE_URL trong .env (CSDL riêng, sẽ bị xóa sạch).'); process.exit(2); }
process.env.DATABASE_URL = url;

const { migrate } = require('../src/db/migrate');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

function nextMonday(hour, minute = 0) {                       // thứ Hai kế tiếp theo giờ VN, luôn ở tương lai
  const d = new Date(Date.now() + 7 * 3600000);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(hour)}:${p(minute)}:00+07:00`;
}

let base; let passed = 0; let failed = 0; let step = 0;
async function call(label, method, path, { token, body, expect }) {
  step += 1;
  const res = await fetch(base + path, { method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  const show = JSON.stringify(json).replace(/"token":"[^"]+"/, '"token":"<đã ẩn>"');
  const good = res.status === expect;
  console.log(`\n[Bước ${step}] ${label}\n  vào : ${method} ${path}${body ? ' ' + JSON.stringify(body) : ''}\n  ra  : HTTP ${res.status} ${good ? '✔' : '✖ (mong đợi ' + expect + ')'}  ${show.slice(0, 220)}`);
  if (good) passed += 1; else failed += 1;
  return json;
}

(async () => {
  const admin = new Pool({ connectionString: url });
  await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await admin.end();
  await migrate(url, { seed: true });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  console.log('\n===== LUỒNG CHÍNH L4: PHÂN CÔNG KỸ THUẬT VIÊN VÀ ĐẶT LỊCH HẸN (dữ liệu mẫu db/seed.sql) =====');
  try {
    const mgr = (await call('Quản lý đăng nhập', 'POST', '/auth/login', { body: { username: 'quanly01', password: 'demo123' }, expect: 200 })).token;
    const waiting = await call('Xem các phiếu đang chờ phân công', 'GET', '/tickets?status=WAITING_ASSIGNMENT', { token: mgr, expect: 200 });
    const code = waiting.data[0].ticket_code;
    const sug = await call(`Gợi ý kỹ thuật viên cho phiếu ${code} (UC1)`, 'GET', `/tickets/${code}/technician-suggestions`, { token: mgr, expect: 200 });
    const tech = sug.suggestions[0].technician_code;
    await call(`Phân công ${tech} cho phiếu ${code} (UC2)`, 'POST', `/tickets/${code}/assignment`, { token: mgr, body: { technician_code: tech }, expect: 201 });
    const detail = await call('Xem lại chi tiết phiếu: đã phân công, có lịch sử', 'GET', `/tickets/${code}`, { token: mgr, expect: 200 });
    const appt = await call('Đặt lịch giao máy 09:00, 30 phút (UC3)', 'POST', '/appointments', { token: mgr, expect: 201,
      body: { ticket_code: code, technician_code: tech, type: 'DROP_OFF', start_at: nextMonday(9), duration_minutes: 30 } });
    await call('Đặt lịch chồng 09:15 cho cùng kỹ thuật viên → bị từ chối (UC4)', 'POST', '/appointments', { token: mgr, expect: 409,
      body: { ticket_code: code, technician_code: tech, type: 'PICK_UP', start_at: nextMonday(9, 15), duration_minutes: 30 } });
    const khach = (await call('Khách hàng đăng nhập', 'POST', '/auth/login', { body: { username: 'khach01', password: 'demo123' }, expect: 200 })).token;
    await call('Khách xem lịch hẹn của phiếu mình (FR7)', 'GET', '/appointments', { token: khach, expect: 200 });
    const done = await call(`Khách xác nhận lịch ${appt.appointment_code} (FR8)`, 'PATCH', `/appointments/${appt.appointment_code}`, { token: khach, body: { status: 'CONFIRMED' }, expect: 200 });
    const ktv = (await call('Kỹ thuật viên đăng nhập', 'POST', '/auth/login', { body: { username: tech === 'TECH-007' ? 'ktv.bich' : 'ktv.an', password: 'demo123' }, expect: 200 })).token;
    const mine = await call('Kỹ thuật viên chỉ thấy lịch của mình (FR6)', 'GET', '/appointments', { token: ktv, expect: 200 });
    const consistent = detail.technician.technician_code === tech && detail.assignments.length === 1
      && done.status === 'CONFIRMED' && mine.data.length === 1 && mine.data[0].appointment_code === appt.appointment_code;
    console.log(`\nĐối chiếu đầu ra: phiếu ${code} → ${tech}; lịch ${appt.appointment_code} = ${done.status}; kỹ thuật viên thấy ${mine.data.length} lịch → ${consistent ? '✔ khớp' : '✖ lệch'}`);
    if (!consistent) failed += 1;
  } catch (e) { failed += 1; console.error('\nLỗi không mong đợi:', e); }
  console.log(`\n===== KẾT QUẢ END-TO-END: ${passed}/${passed + failed} bước đạt, ${failed} lỗi =====`);
  server.close(); await pool.end();
  process.exit(failed ? 1 : 0);
})();
