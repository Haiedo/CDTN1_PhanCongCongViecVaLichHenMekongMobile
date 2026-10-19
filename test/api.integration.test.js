// Test tích hợp chạy trên PostgreSQL THẬT. Cần TEST_DATABASE_URL (CSDL riêng – test xóa sạch dữ liệu).
const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  test('bỏ qua test tích hợp: chưa đặt TEST_DATABASE_URL', { skip: true }, () => {});
  return;
}
process.env.DATABASE_URL = TEST_URL;                          // pool của app dùng CSDL test
const { Pool } = require('pg');
const { migrate } = require('../src/db/migrate');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const assignHooks = require('../src/services/assign.service').hooks;
const apptHooks = require('../src/services/appointment.service').hooks;
const slow = (ms) => () => new Promise((r) => setTimeout(r, ms));   // trì hoãn giữa kiểm tra và ghi → ép cuộc đua xảy ra

const MGR = { 'x-user': 'quanly01', 'x-role': 'MANAGER' };
let server; let base;
const call = async (method, path, { headers = MGR, body } = {}) => {
  const res = await fetch(base + path, { method,
    headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
};
// Thứ Hai kế tiếp (giờ VN), luôn ở tương lai
function nextMonday(hour, minute = 0) {
  const d = new Date(Date.now() + 7 * 3600000);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(hour)}:${p(minute)}:00+07:00`;
}

test.before(async () => {
  const admin = new Pool({ connectionString: TEST_URL });
  await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await admin.end();
  await migrate(TEST_URL, { seed: true });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
test.after(async () => { server.close(); await pool.end(); });

test('401 khi thiếu xác thực; 403 khi vai trò không phải MANAGER (NFR3)', async () => {
  assert.equal((await call('GET', '/tickets/T-2026-0042/technician-suggestions', { headers: {} })).status, 401);
  const r = await call('POST', '/tickets/T-2026-0042/assignment',
    { headers: { 'x-user': 'ktv', 'x-role': 'TECHNICIAN' }, body: { technician_code: 'TECH-003' } });
  assert.equal(r.status, 403);
});

test('FR1: gợi ý đúng tay nghề + địa bàn, phiếu mở ít hơn xếp trước (AC1.1)', async () => {
  const r = await call('GET', '/tickets/T-2026-0042/technician-suggestions');
  assert.equal(r.status, 200);
  const codes = r.body.suggestions.map((s) => s.technician_code);
  assert.deepEqual(codes, ['TECH-007', 'TECH-003']);          // 0 phiếu mở trước, 1 phiếu mở sau
  assert.ok(!codes.includes('TECH-005'));                      // khác địa bàn và khác tay nghề
});
test('gợi ý: 404 phiếu không có; 400 limit sai; 409 phiếu đã phân công', async () => {
  assert.equal((await call('GET', '/tickets/T-2026-9999/technician-suggestions')).status, 404);
  assert.equal((await call('GET', '/tickets/T-2026-0042/technician-suggestions?limit=99')).status, 400);
  assert.equal((await call('GET', '/tickets/T-2026-0044/technician-suggestions')).body.error.code, 'TICKET_NOT_WAITING');
});
test('gợi ý rỗng khi không ai phù hợp (AC1.3)', async () => {
  await pool.query(`UPDATE technician SET is_active = false WHERE technician_code IN ('TECH-003','TECH-007')`);
  const r = await call('GET', '/tickets/T-2026-0042/technician-suggestions');
  await pool.query(`UPDATE technician SET is_active = true`);
  assert.equal(r.status, 200); assert.deepEqual(r.body.suggestions, []);
});

test('FR2: phân công thành công 201, ghi lịch sử; phân công lại bằng thao tác thường bị 409 (AC2.1, AC2.3)', async () => {
  const ok = await call('POST', '/tickets/T-2026-0042/assignment', { body: { technician_code: 'TECH-007', note: 'Gấp' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.ticket_status, 'ASSIGNED');
  assert.equal(ok.body.technician_open_tickets, 1);
  assert.match(ok.body.assignment_code, /^ASG-\d{4}$/);
  const log = await pool.query('SELECT action, assigned_by FROM ticket_assignment');
  assert.deepEqual(log.rows, [{ action: 'ASSIGN', assigned_by: 'quanly01' }]);
  const again = await call('POST', '/tickets/T-2026-0042/assignment', { body: { technician_code: 'TECH-003' } });
  assert.equal(again.status, 409); assert.equal(again.body.error.code, 'TICKET_ALREADY_ASSIGNED');
});
test('FR2: kỹ thuật viên không đủ điều kiện → 409; thiếu dữ liệu → 400; không có → 404', async () => {
  const r = await call('POST', '/tickets/T-2026-0043/assignment', { body: { technician_code: 'TECH-005' } });
  assert.equal(r.body.error.code, 'TECHNICIAN_NOT_ELIGIBLE');
  assert.equal((await call('POST', '/tickets/T-2026-0043/assignment', { body: {} })).status, 400);
  assert.equal((await call('POST', '/tickets/T-2026-0043/assignment', { body: { technician_code: 'TECH-999' } })).status, 404);
});
test('luồng 4a: kỹ thuật viên đủ 8 phiếu mở → 409 TECHNICIAN_OVERLOADED, dữ liệu không đổi (AC2.2)', async () => {
  await pool.query(`INSERT INTO ticket (ticket_code, customer_id, device_model, required_skill, service_area, status, technician_id)
    SELECT 'T-2026-01' || lpad(g::text, 2, '0'), 1, 'Máy test', 'BATTERY', 'Quận 7', 'ASSIGNED',
           (SELECT technician_id FROM technician WHERE technician_code = 'TECH-007') FROM generate_series(1, 7) g`);
  const r = await call('POST', '/tickets/T-2026-0043/assignment', { body: { technician_code: 'TECH-007' } });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'TECHNICIAN_OVERLOADED');
  const t = await pool.query(`SELECT status FROM ticket WHERE ticket_code = 'T-2026-0043'`);
  assert.equal(t.rows[0].status, 'WAITING_ASSIGNMENT');
});
test('NFR2: 10 yêu cầu phân công đồng thời cho kỹ thuật viên chỉ còn 1 chỗ → đúng 1 bên thành công, không vượt ngưỡng 8', async () => {
  await pool.query(`DELETE FROM ticket WHERE ticket_code = 'T-2026-0107'`);          // 8 phiếu mở → còn 7, tức còn đúng 1 chỗ
  const openSql = `SELECT COUNT(*)::int n FROM ticket WHERE status IN ('ASSIGNED','IN_PROGRESS')
    AND technician_id = (SELECT technician_id FROM technician WHERE technician_code = 'TECH-007')`;
  assert.equal((await pool.query(openSql)).rows[0].n, 7);
  await pool.query(`INSERT INTO ticket (ticket_code, customer_id, device_model, required_skill, service_area)
    SELECT 'T-2026-03' || lpad(g::text, 2, '0'), 1, 'Máy đua', 'BATTERY', 'Quận 7' FROM generate_series(0, 9) g`);
  assignHooks.afterChecks = slow(80);
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    call('POST', `/tickets/T-2026-03${String(i).padStart(2, '0')}/assignment`, { body: { technician_code: 'TECH-007' } })));
  assignHooks.afterChecks = async () => {};
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(results.filter((r) => r.status === 409 && r.body.error.code === 'TECHNICIAN_OVERLOADED').length, 9);
  assert.equal((await pool.query(openSql)).rows[0].n, 8);      // không bao giờ vượt ngưỡng 8
});

let apt;
test('FR4: đặt lịch 201, trạng thái Chờ xác nhận, mã APT-xxxx (AC3.1)', async () => {
  const r = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0044', technician_code: 'TECH-003',
    type: 'DROP_OFF', start_at: nextMonday(9), duration_minutes: 30 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.status, 'PENDING_CONFIRMATION');
  assert.match(r.body.appointment_code, /^APT-\d{4}$/);
  apt = r.body;
});
test('FR5: trùng lịch → 409 kèm lịch xung đột, không tạo thêm (AC3.2)', async () => {
  const r = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0044', technician_code: 'TECH-003',
    type: 'PICK_UP', start_at: nextMonday(9, 15), duration_minutes: 30 } });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'APPOINTMENT_CONFLICT');
  assert.equal(r.body.error.conflicting_appointment.appointment_code, apt.appointment_code);
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM appointment')).rows[0].n, 1);
});
test('lịch liền kề (09:30–10:00) không bị coi là trùng', async () => {
  const r = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0044', technician_code: 'TECH-003',
    type: 'PICK_UP', start_at: nextMonday(9, 30), duration_minutes: 30 } });
  assert.equal(r.status, 201);
});
test('BR-07 và dữ liệu sai: không phụ trách phiếu → 409; giờ ngoài khung → 400 (AC3.3); phiếu lạ → 404', async () => {
  const wrong = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0044', technician_code: 'TECH-007',
    type: 'DROP_OFF', start_at: nextMonday(11), duration_minutes: 30 } });
  assert.equal(wrong.body.error.code, 'TECHNICIAN_NOT_ASSIGNED');
  const bad = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0044', technician_code: 'TECH-003',
    type: 'DROP_OFF', start_at: nextMonday(18), duration_minutes: 30 } });
  assert.equal(bad.status, 400);
  const none = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-7777', technician_code: 'TECH-003',
    type: 'DROP_OFF', start_at: nextMonday(11), duration_minutes: 30 } });
  assert.equal(none.status, 404);
});
test('NFR2: 4 yêu cầu đặt lịch chồng nhau gửi cùng lúc → đúng 1 thành công, 3 nhận 409 (không deadlock/500)', async () => {
  const mk = (h) => call('POST', '/appointments', { body: { ticket_code: 'T-2026-0044', technician_code: 'TECH-003',
    type: 'DROP_OFF', start_at: nextMonday(14, h), duration_minutes: 30 } });
  apptHooks.afterChecks = slow(80);
  const results = await Promise.all([mk(0), mk(15), mk(5), mk(10)]);   // cả 4 khung đều chồng nhau
  apptHooks.afterChecks = async () => {};
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409]);
  assert.ok(results.filter((r) => r.status === 409).every((r) => r.body.error.code === 'APPOINTMENT_CONFLICT'));
});
test('Read: danh sách lọc theo kỹ thuật viên; kỹ thuật viên chỉ thấy lịch của mình (NFR3)', async () => {
  const mine = await call('GET', '/appointments', { headers: { 'x-user': 'an', 'x-role': 'TECHNICIAN', 'x-user-code': 'TECH-003' } });
  assert.equal(mine.status, 200); assert.ok(mine.body.data.length >= 3);
  const other = await call('GET', '/appointments', { headers: { 'x-user': 'bich', 'x-role': 'TECHNICIAN', 'x-user-code': 'TECH-007' } });
  assert.deepEqual(other.body.data, []);
  const one = await call('GET', `/appointments/${apt.appointment_code}`, { headers: { 'x-user': 'bich', 'x-role': 'TECHNICIAN', 'x-user-code': 'TECH-007' } });
  assert.equal(one.status, 403);
});
test('Update/Delete: xác nhận → CONFIRMED; xác nhận lại → 409; hủy mềm → CANCELLED và giải phóng khung giờ', async () => {
  const cust = { 'x-user': 'khach', 'x-role': 'CUSTOMER' };
  const ok = await call('PATCH', `/appointments/${apt.appointment_code}`, { headers: cust, body: { status: 'CONFIRMED' } });
  assert.equal(ok.body.status, 'CONFIRMED');
  const again = await call('PATCH', `/appointments/${apt.appointment_code}`, { headers: cust, body: { status: 'CONFIRMED' } });
  assert.equal(again.body.error.code, 'INVALID_STATUS_TRANSITION');
  assert.equal((await call('DELETE', `/appointments/${apt.appointment_code}`, { headers: cust })).status, 403);
  const del = await call('DELETE', `/appointments/${apt.appointment_code}`);
  assert.equal(del.body.status, 'CANCELLED');
  const reuse = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0044', technician_code: 'TECH-003',
    type: 'DROP_OFF', start_at: nextMonday(9), duration_minutes: 30 } });
  assert.equal(reuse.status, 201);                             // khung 09:00 đã được giải phóng
  assert.equal((await call('GET', '/appointments/APT-9999')).status, 404);
});
