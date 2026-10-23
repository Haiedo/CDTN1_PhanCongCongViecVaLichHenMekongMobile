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
  const cust = { 'x-user': 'khach', 'x-role': 'CUSTOMER', 'x-user-code': '0901234567' };   // chủ phiếu T-2026-0044
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

// ===== Sprint 2: đăng nhập bằng token, danh sách phiếu, khách xem lịch (giao diện gọi các API này) =====
const login = (username, password) => call('POST', '/auth/login', { headers: {}, body: { username, password } });
const bearer = (token) => ({ authorization: `Bearer ${token}` });

test('Đăng nhập: sai mật khẩu → 401; thiếu trường → 400; đúng → token 60 phút kèm vai trò', async () => {
  assert.equal((await login('quanly01', 'sai-mat-khau')).body.error.code, 'INVALID_CREDENTIALS');
  assert.equal((await login('khong-ton-tai', 'demo123')).status, 401);
  assert.equal((await call('POST', '/auth/login', { headers: {}, body: { username: 'quanly01' } })).status, 400);
  const ok = await login('quanly01', 'demo123');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.expires_in, 3600);
  assert.equal(ok.body.user.role, 'MANAGER');
});
test('Token: dùng Bearer gọi API được; token sai/hết hạn → 401; vai trò lấy từ token (NFR3)', async () => {
  const mgr = (await login('quanly01', 'demo123')).body.token;
  assert.equal((await call('GET', '/tickets', { headers: bearer(mgr) })).status, 200);
  const bad = await call('GET', '/tickets', { headers: bearer(mgr.slice(0, -3) + 'abc') });
  assert.equal(bad.status, 401); assert.equal(bad.body.error.code, 'TOKEN_INVALID');
  // có Authorization sai thì KHÔNG được quay về header giả lập
  const mixed = await call('GET', '/tickets', { headers: { ...MGR, authorization: 'Bearer rac' } });
  assert.equal(mixed.status, 401);
  const tech = (await login('ktv.an', 'demo123')).body.token;
  const r = await call('POST', '/tickets/T-2026-0043/assignment', { headers: bearer(tech), body: { technician_code: 'TECH-007' } });
  assert.equal(r.status, 403);
});
test('Phiếu: quản lý thấy tất cả và lọc theo trạng thái; status sai → 400; kỹ thuật viên/khách chỉ thấy phiếu của mình', async () => {
  const all = await call('GET', '/tickets');
  assert.ok(all.body.data.length >= 3);
  const waiting = await call('GET', '/tickets?status=WAITING_ASSIGNMENT');
  assert.ok(waiting.body.data.every((t) => t.status === 'WAITING_ASSIGNMENT'));
  assert.equal((await call('GET', '/tickets?status=XYZ')).body.error.code, 'INVALID_PARAMETER');
  const an = (await login('ktv.an', 'demo123')).body.token;
  const mine = await call('GET', '/tickets', { headers: bearer(an) });
  assert.ok(mine.body.data.length >= 1 && mine.body.data.every((t) => t.technician.technician_code === 'TECH-003'));
  const khach = (await login('khach01', 'demo123')).body.token;
  const own = await call('GET', '/tickets', { headers: bearer(khach) });
  assert.ok(own.body.data.every((t) => t.customer.phone === '0901234567'));
});
test('Chi tiết phiếu: có khách, kỹ thuật viên, lịch sử phân công; 404; 400; người ngoài → 403', async () => {
  const d = await call('GET', '/tickets/T-2026-0044');
  assert.equal(d.status, 200);
  assert.equal(d.body.customer.full_name, 'Lê Minh Châu');
  assert.equal(d.body.technician.technician_code, 'TECH-003');
  assert.ok(Array.isArray(d.body.assignments));
  assert.equal((await call('GET', '/tickets/T-2026-9999')).status, 404);
  assert.equal((await call('GET', '/tickets/abc')).status, 400);
  const bich = (await login('ktv.bich', 'demo123')).body.token;
  assert.equal((await call('GET', '/tickets/T-2026-0044', { headers: bearer(bich) })).status, 403);
});
test('FR7: khách chỉ xem và xác nhận lịch hẹn của phiếu mình', async () => {
  const mgrBody = { ticket_code: 'T-2026-0044', technician_code: 'TECH-003', type: 'PICK_UP',
                    start_at: nextMonday(15), duration_minutes: 30 };
  const created = await call('POST', '/appointments', { body: mgrBody });
  assert.equal(created.status, 201);
  const code = created.body.appointment_code;
  const chau = bearer((await login('khach01', 'demo123')).body.token);
  assert.ok((await call('GET', '/appointments', { headers: chau })).body.data.some((a) => a.appointment_code === code));
  const other = { 'x-user': 'khac', 'x-role': 'CUSTOMER', 'x-user-code': '0912345678' };
  assert.deepEqual((await call('GET', '/appointments', { headers: other })).body.data, []);
  assert.equal((await call('GET', `/appointments/${code}`, { headers: other })).status, 403);
  assert.equal((await call('PATCH', `/appointments/${code}`, { headers: other, body: { status: 'CONFIRMED' } })).status, 403);
  const tech = { 'x-user': 'an', 'x-role': 'TECHNICIAN', 'x-user-code': 'TECH-003' };
  assert.equal((await call('PATCH', `/appointments/${code}`, { headers: tech, body: { status: 'CONFIRMED' } })).status, 403);
  const ok = await call('PATCH', `/appointments/${code}`, { headers: chau, body: { status: 'CONFIRMED' } });
  assert.equal(ok.body.status, 'CONFIRMED');
});

// ===== FR3 – phân công lại (UC5). Dựng bộ dữ liệu riêng: TECH-008, TECH-009 (cùng địa bàn, cùng tay nghề) =====
let reassignReady = false;
async function setupReassign() {
  if (reassignReady) return; reassignReady = true;
  await pool.query(`INSERT INTO technician (technician_code, full_name, service_area) VALUES
    ('TECH-008','Kỹ thuật viên Tám','Quận 7'), ('TECH-009','Kỹ thuật viên Chín','Quận 7')`);
  await pool.query(`INSERT INTO technician_skill (technician_id, skill_code, skill_level)
    SELECT technician_id, 'SCREEN_REPAIR', 2 FROM technician WHERE technician_code IN ('TECH-008','TECH-009')`);
  await pool.query(`INSERT INTO ticket (ticket_code, customer_id, device_model, required_skill, service_area, status, technician_id)
    SELECT v.code, 1, 'iPhone test', 'SCREEN_REPAIR', 'Quận 7', 'ASSIGNED', t.technician_id
      FROM (VALUES ('T-2026-0500','TECH-008'), ('T-2026-0501','TECH-008')) v(code, tech)
      JOIN technician t ON t.technician_code = v.tech`);
}
const holder = async (code) =>
  (await pool.query(`SELECT te.technician_code FROM ticket tk JOIN technician te USING (technician_id) WHERE tk.ticket_code = $1`, [code])).rows[0].technician_code;

test('FR3: phân công lại thành công kèm lý do; lịch hẹn chưa diễn ra đi theo kỹ thuật viên mới; có lịch sử REASSIGN', async () => {
  await setupReassign();
  const appt = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0500', technician_code: 'TECH-008',
    type: 'DROP_OFF', start_at: nextMonday(10), duration_minutes: 30 } });
  assert.equal(appt.status, 201);
  const sg = await call('GET', '/tickets/T-2026-0500/technician-suggestions?purpose=reassign');
  assert.equal(sg.status, 200);
  assert.ok(sg.body.suggestions.map((s) => s.technician_code).includes('TECH-009'));
  assert.ok(!sg.body.suggestions.map((s) => s.technician_code).includes('TECH-008'));       // loại người đang phụ trách
  const r = await call('POST', '/tickets/T-2026-0500/reassignment',
    { body: { technician_code: 'TECH-009', reason: 'Kỹ thuật viên nghỉ đột xuất' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.technician_code, 'TECH-009'); assert.equal(r.body.moved_appointments, 1);
  assert.equal(await holder('T-2026-0500'), 'TECH-009');
  const moved = await call('GET', `/appointments/${appt.body.appointment_code}`);
  assert.equal(moved.body.technician_code, 'TECH-009');
  const hist = (await call('GET', '/tickets/T-2026-0500')).body.assignments;
  assert.equal(hist[0].action, 'REASSIGN'); assert.equal(hist[0].reason, 'Kỹ thuật viên nghỉ đột xuất');
  // người cũ không còn được đặt lịch cho phiếu này (BR-07)
  const old = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0500', technician_code: 'TECH-008',
    type: 'PICK_UP', start_at: nextMonday(11), duration_minutes: 30 } });
  assert.equal(old.body.error.code, 'TECHNICIAN_NOT_ASSIGNED');
});
test('FR3: thiếu lý do → 400; cùng kỹ thuật viên, phiếu chưa phân công, không đủ điều kiện → 409; không phải quản lý → 403', async () => {
  await setupReassign();
  const noReason = await call('POST', '/tickets/T-2026-0501/reassignment', { body: { technician_code: 'TECH-009' } });
  assert.equal(noReason.status, 400); assert.equal(noReason.body.error.code, 'VALIDATION_ERROR');
  assert.equal((await call('POST', '/tickets/T-2026-0501/reassignment', { body: { technician_code: 'TECH-009', reason: '   ' } })).status, 400);
  const same = await call('POST', '/tickets/T-2026-0501/reassignment', { body: { technician_code: 'TECH-008', reason: 'thử' } });
  assert.equal(same.body.error.code, 'SAME_TECHNICIAN');
  const waiting = await call('POST', '/tickets/T-2026-0043/reassignment', { body: { technician_code: 'TECH-009', reason: 'thử' } });
  assert.equal(waiting.body.error.code, 'TICKET_NOT_ASSIGNED');
  const notEligible = await call('POST', '/tickets/T-2026-0501/reassignment', { body: { technician_code: 'TECH-005', reason: 'thử' } });
  assert.equal(notEligible.body.error.code, 'TECHNICIAN_NOT_ELIGIBLE');
  assert.equal((await call('POST', '/tickets/T-2026-9999/reassignment', { body: { technician_code: 'TECH-009', reason: 'x' } })).status, 404);
  const tech = { 'x-user': 'an', 'x-role': 'TECHNICIAN', 'x-user-code': 'TECH-003' };
  assert.equal((await call('POST', '/tickets/T-2026-0501/reassignment', { headers: tech, body: { technician_code: 'TECH-009', reason: 'x' } })).status, 403);
  assert.equal(await holder('T-2026-0501'), 'TECH-008');                                       // không đổi gì
});
test('FR3 biên: lịch hẹn của phiếu trùng lịch người mới → 409, toàn bộ thao tác quay lui (phiếu, lịch, lịch sử không đổi)', async () => {
  await setupReassign();
  // T-2026-0501 (TECH-008) có lịch 13:00; TECH-009 đã có lịch 13:15 của phiếu T-2026-0500 → chuyển 0501 sang 009 sẽ chồng
  const mine = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0501', technician_code: 'TECH-008',
    type: 'DROP_OFF', start_at: nextMonday(13, 0), duration_minutes: 30 } });
  assert.equal(mine.status, 201);
  const theirs = await call('POST', '/appointments', { body: { ticket_code: 'T-2026-0500', technician_code: 'TECH-009',
    type: 'PICK_UP', start_at: nextMonday(13, 15), duration_minutes: 30 } });
  assert.equal(theirs.status, 201);
  const before = (await pool.query('SELECT COUNT(*)::int n FROM ticket_assignment')).rows[0].n;
  const r = await call('POST', '/tickets/T-2026-0501/reassignment', { body: { technician_code: 'TECH-009', reason: 'Nghỉ phép' } });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'APPOINTMENT_CONFLICT');
  assert.equal(await holder('T-2026-0501'), 'TECH-008');
  assert.equal((await call('GET', `/appointments/${mine.body.appointment_code}`)).body.technician_code, 'TECH-008');
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM ticket_assignment')).rows[0].n, before);
});
test('FR3 đồng thời: 2 yêu cầu cùng chuyển một phiếu sang một kỹ thuật viên → đúng 1 thành công, 1 nhận 409; không deadlock/500', async () => {
  await pool.query(`INSERT INTO ticket (ticket_code, customer_id, device_model, required_skill, service_area, status, technician_id)
    SELECT 'T-2026-0502', 1, 'iPhone đua', 'SCREEN_REPAIR', 'Quận 7', 'ASSIGNED', technician_id FROM technician WHERE technician_code = 'TECH-008'`);
  const go = () => call('POST', '/tickets/T-2026-0502/reassignment', { body: { technician_code: 'TECH-009', reason: 'đua' } });
  const results = await Promise.all([go(), go()]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(results.find((r) => r.status === 409).body.error.code, 'SAME_TECHNICIAN');
  assert.equal(await holder('T-2026-0502'), 'TECH-009');
});
