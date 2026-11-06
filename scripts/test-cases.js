// Bộ 12 test case của Test Report (Buổi 14) – CHẠY THẬT qua HTTP trên dữ liệu mẫu THẬT (db/seed.sql).
// Mỗi test case tự dựng lại tiền điều kiện (xóa dữ liệu + nạp seed) nên chạy riêng hay chạy hết đều cho cùng kết quả.
// Dùng CSDL KIỂM THỬ (TEST_DATABASE_URL) – giống `npm run e2e`, KHÔNG đụng CSDL demo.
//   npm run tc               chạy cả 12 test case
//   npm run tc -- TC-05      chạy riêng một test case (để chụp ảnh hoặc chạy lại trên lớp)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const url = process.env.TEST_DATABASE_URL;
if (!url) { console.error('Thiếu TEST_DATABASE_URL trong .env (CSDL riêng, sẽ bị xóa dữ liệu).'); process.exit(2); }
process.env.DATABASE_URL = url;

const { migrate } = require('../src/db/migrate');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const p2 = (n) => String(n).padStart(2, '0');
function nextMonday(hour, minute = 0) {                       // thứ Hai kế tiếp theo giờ VN, luôn ở tương lai
  const d = new Date(Date.now() + 7 * 3600000);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(hour)}:${p2(minute)}:00+07:00`;
}
const nextYear = () => new Date(Date.now() + 7 * 3600000).getUTCFullYear() + 1;

let base; const admin = new Pool({ connectionString: url });
const tokens = {};
async function http(method, p, { as, body, token } = {}) {
  let t = token;
  if (!t && as) {
    if (!tokens[as]) {
      const r = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: as, password: process.env.DEMO_PASSWORD || 'demo123' }) });
      tokens[as] = (await r.json()).token;
    }
    t = tokens[as];
  }
  const res = await fetch(base + '/api/v1' + p, { method,
    headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  let json = null; try { json = await res.json(); } catch (_) { /* không có thân */ }
  return { status: res.status, body: json, code: json && json.error && json.error.code, message: json && json.error && json.error.message };
}
const count = async (table, where = '') => Number((await admin.query(`SELECT COUNT(*) FROM ${table} ${where}`)).rows[0].count);
async function resetDb() {
  tokens.__ = 0; for (const k of Object.keys(tokens)) delete tokens[k];
  await admin.query('TRUNCATE appointment, ticket_assignment, ticket, technician_skill, technician, customer RESTART IDENTITY CASCADE');
  await migrate(url, { seed: true });
}

// ---------- khung ghi kết quả ----------
function makeRun() {
  const checks = [];
  return {
    checks,
    say: (s) => console.log('  ' + s),
    // so sánh mong đợi với thực tế; sai bất kỳ điểm nào là FAIL
    expect(label, expected, actual) {
      const ok = JSON.stringify(expected) === JSON.stringify(actual);
      checks.push(ok);
      console.log(`  ${ok ? '✔' : '✘'} ${label}: mong đợi ${JSON.stringify(expected)} · thực tế ${JSON.stringify(actual)}`);
    },
  };
}
const brief = (r) => `HTTP ${r.status}${r.code ? ' ' + r.code : ''}${r.message ? ' – "' + r.message + '"' : ''}`;

const mkAppt = (start, extra = {}) => ({ ticket_code: 'T-2026-0044', technician_code: 'TECH-003', type: 'DROP_OFF', start_at: start, ...extra });
const mkTicket = (extra = {}) => ({ customer_phone: '0901234567', device_model: 'iPhone 13', required_skill: 'SCREEN_REPAIR', service_area: 'Quận 7', ...extra });

const TCS = [
  { id: 'TC-01', loai: 'Luồng đúng', uu: 'Cao', ten: 'Phân công kỹ thuật viên phù hợp cho phiếu Chờ phân công',
    pre: 'Dữ liệu seed: T-2026-0042 (SCREEN_REPAIR, Quận 7) đang WAITING_ASSIGNMENT; TECH-007 cùng địa bàn, có tay nghề, chưa giữ phiếu nào.',
    buoc: ['Đăng nhập quanly01 (MANAGER)', 'POST /tickets/T-2026-0042/assignment {"technician_code":"TECH-007"}', 'GET /tickets/T-2026-0042 và đếm ticket_assignment'],
    mong: '201, ticket_status=ASSIGNED, technician_open_tickets=1; GET trả technician=TECH-007; ticket_assignment tăng đúng 1 dòng.',
    async run(t) {
      const before = await count('ticket_assignment');
      const r = await http('POST', '/tickets/T-2026-0042/assignment', { as: 'quanly01', body: { technician_code: 'TECH-007' } });
      t.say(`POST assignment → ${brief(r)} ${r.body && r.body.ticket_status || ''} open=${r.body && r.body.technician_open_tickets}`);
      const g = await http('GET', '/tickets/T-2026-0042', { as: 'quanly01' });
      const after = await count('ticket_assignment');
      t.expect('mã trạng thái', 201, r.status);
      t.expect('ticket_status', 'ASSIGNED', r.body.ticket_status);
      t.expect('technician_open_tickets', 1, r.body.technician_open_tickets);
      t.expect('GET phiếu: trạng thái / kỹ thuật viên', ['ASSIGNED', 'TECH-007'], [g.body.status, g.body.technician && g.body.technician.technician_code]);
      t.expect(`đếm ticket_assignment trước → sau (${before} → ${after})`, before + 1, after);
    } },

  { id: 'TC-02', loai: 'Luồng đúng', uu: 'Cao', ten: 'Đặt lịch hẹn hợp lệ cho kỹ thuật viên đang phụ trách phiếu',
    pre: 'Dữ liệu seed: T-2026-0044 đã giao TECH-003; chưa có lịch hẹn nào (appointment = 0).',
    buoc: ['Đăng nhập quanly01', 'POST /appointments {ticket T-2026-0044, TECH-003, DROP_OFF, thứ Hai kế tiếp 09:00+07:00}', 'Đếm bảng appointment'],
    mong: '201, status=PENDING_CONFIRMATION, end_at = start_at + 30 phút (mặc định); appointment tăng đúng 1 dòng.',
    async run(t) {
      const before = await count('appointment');
      const start = nextMonday(9);
      const r = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(start) });
      t.say(`POST appointments (${start}) → ${brief(r)} ${r.body && r.body.appointment_code || ''} ${r.body && r.body.status || ''} end=${r.body && r.body.end_at}`);
      const after = await count('appointment');
      t.expect('mã trạng thái', 201, r.status);
      t.expect('status', 'PENDING_CONFIRMATION', r.body.status);
      t.expect('end_at', nextMonday(9, 30), r.body.end_at);
      t.expect(`đếm appointment trước → sau (${before} → ${after})`, before + 1, after);
    } },

  { id: 'TC-03', loai: 'Giá trị biên', uu: 'Cao', ten: 'Biên giờ kết thúc 17:30 (hai phía: đúng 17:30 và 17:31)',
    pre: 'Dữ liệu seed; appointment = 0. Khung làm việc 08:00–17:30, tính cả giờ kết thúc.',
    buoc: ['POST /appointments bắt đầu 17:00, 30 phút (kết thúc đúng 17:30)', 'POST /appointments bắt đầu 17:01, 30 phút (kết thúc 17:31)', 'Đếm bảng appointment'],
    mong: 'Yêu cầu 1: 201. Yêu cầu 2: 400 VALIDATION_ERROR, thông báo nêu khung 08:00–17:30. appointment tăng đúng 1 dòng.',
    async run(t) {
      const before = await count('appointment');
      const a = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(nextMonday(17, 0)) });
      const b = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(nextMonday(17, 1)) });
      t.say(`17:00 + 30 phút → ${brief(a)}`); t.say(`17:01 + 30 phút → ${brief(b)}`);
      const after = await count('appointment');
      t.expect('17:00 (kết thúc đúng 17:30)', 201, a.status);
      t.expect('17:01 (kết thúc 17:31) – mã trạng thái / mã lỗi', [400, 'VALIDATION_ERROR'], [b.status, b.code]);
      t.expect(`đếm appointment trước → sau (${before} → ${after})`, before + 1, after);
    } },

  { id: 'TC-04', loai: 'Giá trị biên', uu: 'Trung bình', ten: 'Biên thời lượng 15–120 phút (14, 15, 120, 121)',
    pre: 'Dữ liệu seed; appointment = 0.',
    buoc: ['POST /appointments duration_minutes=14 (08:00)', 'duration_minutes=15 (08:00)', 'duration_minutes=120 (10:00)', 'duration_minutes=121 (14:00)', 'Đếm bảng appointment'],
    mong: '14 → 400; 15 → 201; 120 → 201; 121 → 400 (VALIDATION_ERROR "từ 15 đến 120"); appointment tăng đúng 2 dòng.',
    async run(t) {
      const before = await count('appointment');
      const send = (h, d) => http('POST', '/appointments', { as: 'quanly01', body: mkAppt(nextMonday(h), { duration_minutes: d }) });
      const r14 = await send(8, 14); const r15 = await send(8, 15); const r120 = await send(10, 120); const r121 = await send(14, 121);
      [['14', r14], ['15', r15], ['120', r120], ['121', r121]].forEach(([d, r]) => t.say(`duration ${d} → ${brief(r)}`));
      const after = await count('appointment');
      t.expect('14 phút', [400, 'VALIDATION_ERROR'], [r14.status, r14.code]);
      t.expect('15 phút', 201, r15.status);
      t.expect('120 phút', 201, r120.status);
      t.expect('121 phút', [400, 'VALIDATION_ERROR'], [r121.status, r121.code]);
      t.expect(`đếm appointment trước → sau (${before} → ${after})`, before + 2, after);
    } },

  { id: 'TC-05', loai: 'Giá trị biên', uu: 'Cao', ten: 'Biên trùng lịch: chồng 1 phút bị từ chối, sát nhau được nhận',
    pre: 'Dữ liệu seed; TECH-003 chưa có lịch.',
    buoc: ['A: POST /appointments 09:00 (30 phút, kết thúc 09:30)', 'C: POST /appointments 09:29 (chồng A đúng 1 phút)', 'B: POST /appointments 09:30 (bắt đầu đúng lúc A kết thúc)', 'Đếm bảng appointment'],
    mong: 'A: 201. C: 409 APPOINTMENT_CONFLICT, nêu lịch trùng là A. B: 201. appointment tăng đúng 2 dòng (A và B).',
    async run(t) {
      const before = await count('appointment');
      const a = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(nextMonday(9, 0)) });
      const c = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(nextMonday(9, 29)) });
      const b = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(nextMonday(9, 30)) });
      t.say(`A 09:00 → ${brief(a)} ${a.body.appointment_code || ''}`); t.say(`C 09:29 → ${brief(c)} lịch trùng: ${c.body && c.body.error && c.body.error.conflicting_appointment && c.body.error.conflicting_appointment.appointment_code}`); t.say(`B 09:30 → ${brief(b)}`);
      const after = await count('appointment');
      t.expect('A (09:00–09:30)', 201, a.status);
      t.expect('C chồng 1 phút – mã trạng thái / mã lỗi', [409, 'APPOINTMENT_CONFLICT'], [c.status, c.code]);
      t.expect('C chỉ ra lịch trùng', a.body.appointment_code, c.body.error && c.body.error.conflicting_appointment && c.body.error.conflicting_appointment.appointment_code);
      t.expect('B sát nhau (09:30–10:00)', 201, b.status);
      t.expect(`đếm appointment trước → sau (${before} → ${after})`, before + 2, after);
    } },

  { id: 'TC-06', loai: 'Giá trị biên', uu: 'Trung bình', ten: 'Biên quá tải: nhận phiếu cuối cùng được, phiếu vượt hạn mức bị từ chối',
    pre: 'Dữ liệu seed; đặt max_open_tickets của TECH-007 = 1 (UPDATE technician) để thử biên mà không phải tạo 8 phiếu.',
    buoc: ['UPDATE technician SET max_open_tickets=1 WHERE technician_code=\'TECH-007\'', 'Phân công T-2026-0042 cho TECH-007 (đang giữ 0 phiếu)', 'POST /tickets tạo phiếu SCREEN_REPAIR Quận 7 mới rồi phân công cho TECH-007 (đang giữ 1 phiếu = hạn mức)', 'Đếm ticket_assignment'],
    mong: 'Lần 1: 201. Lần 2: 409 TECHNICIAN_OVERLOADED; phiếu mới vẫn WAITING_ASSIGNMENT; ticket_assignment tăng đúng 1 dòng.',
    async run(t) {
      await admin.query("UPDATE technician SET max_open_tickets = 1 WHERE technician_code = 'TECH-007'");
      const before = await count('ticket_assignment');
      const r1 = await http('POST', '/tickets/T-2026-0042/assignment', { as: 'quanly01', body: { technician_code: 'TECH-007' } });
      const nt = await http('POST', '/tickets', { as: 'quanly01', body: mkTicket() });
      const r2 = await http('POST', `/tickets/${nt.body.ticket_code}/assignment`, { as: 'quanly01', body: { technician_code: 'TECH-007' } });
      const g = await http('GET', `/tickets/${nt.body.ticket_code}`, { as: 'quanly01' });
      t.say(`phân công T-2026-0042 → ${brief(r1)}`); t.say(`phân công ${nt.body.ticket_code} → ${brief(r2)}`);
      const after = await count('ticket_assignment');
      t.expect('phiếu thứ 1 (0/1)', 201, r1.status);
      t.expect('phiếu thứ 2 (1/1) – mã trạng thái / mã lỗi', [409, 'TECHNICIAN_OVERLOADED'], [r2.status, r2.code]);
      t.expect('phiếu thứ 2 vẫn ở trạng thái', 'WAITING_ASSIGNMENT', g.body.status);
      t.expect(`đếm ticket_assignment trước → sau (${before} → ${after})`, before + 1, after);
    } },

  { id: 'TC-07', loai: 'Dữ liệu sai', uu: 'Cao', ten: 'Ngày không tồn tại trong lịch (30/02, 31/04, tháng 13) bị từ chối',
    pre: 'Dữ liệu seed; appointment = 0. Dùng năm sau để ngày luôn ở tương lai.',
    buoc: ['POST /appointments start_at = <năm sau>-13-01T09:00:00+07:00 (đối chứng)', 'start_at = <năm sau>-02-30T09:00:00+07:00', 'start_at = <năm sau>-04-31T09:00:00+07:00', 'Đếm bảng appointment'],
    mong: 'Cả 3 yêu cầu: 400 VALIDATION_ERROR (start_at sai định dạng); appointment vẫn 0 dòng (không tự đổi sang ngày khác).',
    async run(t) {
      const before = await count('appointment'); const y = nextYear();
      const out = [];
      for (const d of [`${y}-13-01`, `${y}-02-30`, `${y}-04-31`]) {
        const r = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(`${d}T09:00:00+07:00`) });
        t.say(`start_at ${d} → ${brief(r)}${r.body && r.body.start_at ? ' (lưu thành ' + r.body.start_at + ')' : ''}`); out.push([d, r]);
      }
      const after = await count('appointment');
      out.forEach(([d, r]) => t.expect(`start_at ${d}`, [400, 'VALIDATION_ERROR'], [r.status, r.code]));
      t.expect(`đếm appointment trước → sau (${before} → ${after})`, before, after);
    } },

  { id: 'TC-08', loai: 'Dữ liệu sai', uu: 'Trung bình', ten: 'customer_phone sai kiểu (số thay vì chuỗi) và sai độ dài khi tạo phiếu',
    pre: 'Dữ liệu seed; ticket = 3.',
    buoc: ['POST /tickets customer_phone="09012345" (8 chữ số)', 'POST /tickets customer_phone=901234567 (kiểu SỐ, không phải chuỗi)', 'Đếm bảng ticket'],
    mong: 'Cả 2 yêu cầu: 400 VALIDATION_ERROR nêu customer_phone (KHÔNG phải 404 CUSTOMER_NOT_FOUND); ticket vẫn 3 dòng.',
    async run(t) {
      const before = await count('ticket');
      const a = await http('POST', '/tickets', { as: 'quanly01', body: mkTicket({ customer_phone: '09012345' }) });
      const b = await http('POST', '/tickets', { as: 'quanly01', body: mkTicket({ customer_phone: 901234567 }) });
      t.say(`phone "09012345" → ${brief(a)}`); t.say(`phone 901234567 (số) → ${brief(b)}`);
      const after = await count('ticket');
      t.expect('8 chữ số', [400, 'VALIDATION_ERROR'], [a.status, a.code]);
      t.expect('kiểu số', [400, 'VALIDATION_ERROR'], [b.status, b.code]);
      t.expect(`đếm ticket trước → sau (${before} → ${after})`, before, after);
    } },

  { id: 'TC-09', loai: 'Dữ liệu sai', uu: 'Trung bình', ten: 'Tham số lọc và mã lịch hẹn sai định dạng phải báo 400, không trả 200 rỗng / 404 mơ hồ',
    pre: 'Dữ liệu seed; đối chứng: GET /tickets?status=BOGUS vốn đã trả 400 (hợp đồng API mục tickets).',
    buoc: ['GET /tickets?status=BOGUS (đối chứng)', 'GET /appointments?status=BOGUS', 'GET /appointments?technician_code=BAD', 'GET /appointments/abc'],
    mong: 'Cả 4 yêu cầu: 400 INVALID_PARAMETER (nhất quán với /tickets).',
    async run(t) {
      const rs = [];
      for (const p of ['/tickets?status=BOGUS', '/appointments?status=BOGUS', '/appointments?technician_code=BAD', '/appointments/abc']) {
        const r = await http('GET', p, { as: 'quanly01' }); t.say(`GET ${p} → ${brief(r)}`); rs.push([p, r]);
      }
      rs.forEach(([p, r]) => t.expect(`GET ${p}`, [400, 'INVALID_PARAMETER'], [r.status, r.code]));
    } },

  { id: 'TC-10', loai: 'Bảo mật', uu: 'Cao', ten: 'Phân quyền: không token, token giả, sai vai trò, xem lịch của người khác',
    pre: 'Dữ liệu seed; quản lý đã đặt 1 lịch hẹn APT-0001 cho TECH-003. Đếm ticket, appointment, ticket_assignment làm mốc.',
    buoc: ['GET /tickets không gửi token', 'GET /tickets với token đã sửa 1 ký tự chữ ký', 'ktv.bich (TECH-007) GET /appointments/APT-0001 (lịch của TECH-003)', 'khach01 (CUSTOMER) POST /tickets', 'ktv.an (TECHNICIAN) DELETE /appointments/APT-0001', 'khach01 POST /tickets/T-2026-0042/assignment', 'Đếm lại 3 bảng'],
    mong: '401 UNAUTHENTICATED; 401 TOKEN_INVALID; 403 FORBIDDEN; 403; 403; 403. Cả 3 bảng không đổi số dòng.',
    async run(t) {
      const mk = await http('POST', '/appointments', { as: 'quanly01', body: mkAppt(nextMonday(9)) });
      const snap = async () => [await count('ticket'), await count('appointment'), await count('ticket_assignment')];
      const before = await snap();
      const good = await http('POST', '/auth/login', { body: { username: 'quanly01', password: process.env.DEMO_PASSWORD || 'demo123' } });
      const [pl, sig] = good.body.token.split('.');
      const forged = `${pl}.${(sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)}`;
      const cases = [
        ['không token', () => http('GET', '/tickets'), 401, 'UNAUTHENTICATED'],
        ['token sửa chữ ký', () => http('GET', '/tickets', { token: forged }), 401, 'TOKEN_INVALID'],
        ['KTV xem lịch người khác', () => http('GET', `/appointments/${mk.body.appointment_code}`, { as: 'ktv.bich' }), 403, 'FORBIDDEN'],
        ['khách tạo phiếu', () => http('POST', '/tickets', { as: 'khach01', body: mkTicket() }), 403, 'FORBIDDEN'],
        ['KTV hủy lịch', () => http('DELETE', `/appointments/${mk.body.appointment_code}`, { as: 'ktv.an' }), 403, 'FORBIDDEN'],
        ['khách phân công', () => http('POST', '/tickets/T-2026-0042/assignment', { as: 'khach01', body: { technician_code: 'TECH-007' } }), 403, 'FORBIDDEN'],
      ];
      for (const [label, fn, st, code] of cases) { const r = await fn(); t.say(`${label} → ${brief(r)}`); t.expect(label, [st, code], [r.status, r.code]); }
      const after = await snap();
      t.expect(`đếm ticket/appointment/ticket_assignment trước → sau (${before} → ${after})`, before, after);
    } },

  { id: 'TC-11', loai: 'Chất lượng dữ liệu', uu: 'Trung bình', ten: 'Dữ liệu có ký tự nguy hiểm (HTML, SQL) được lưu nguyên văn, không thực thi',
    pre: 'Dữ liệu seed; ticket = 3.',
    buoc: ['POST /tickets device_model="<script>alert(1)</script>"', 'POST /tickets device_model="x\'); DROP TABLE ticket;--"', 'GET lại từng phiếu', 'Đếm bảng ticket; tìm innerHTML trong src/frontend'],
    mong: '201 cả hai, GET trả lại đúng chuỗi đã gửi; bảng ticket còn nguyên và tăng đúng 2 dòng (3 → 5); giao diện không dùng innerHTML (0 chỗ).',
    async run(t) {
      const before = await count('ticket');
      const payloads = ['<script>alert(1)</script>', "x'); DROP TABLE ticket;--"];
      for (const dm of payloads) {
        const r = await http('POST', '/tickets', { as: 'quanly01', body: mkTicket({ device_model: dm }) });
        const g = await http('GET', `/tickets/${r.body.ticket_code}`, { as: 'quanly01' });
        t.say(`device_model ${JSON.stringify(dm)} → ${brief(r)} ${r.body.ticket_code}`);
        t.expect('mã trạng thái', 201, r.status); t.expect('GET trả lại nguyên văn', dm, g.body.device_model);
      }
      const after = await count('ticket');
      t.expect(`đếm ticket trước → sau (${before} → ${after})`, before + 2, after);
      const dir = path.join(__dirname, '..', 'src', 'frontend'); let hits = 0;
      (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const fp = path.join(d, f.name);
        if (f.isDirectory()) walk(fp); else if (/\.(js|html)$/.test(f.name)) hits += (fs.readFileSync(fp, 'utf8').match(/\.innerHTML\s*=/g) || []).length;
      } })(dir);
      t.expect('số chỗ gán .innerHTML trong src/frontend', 0, hits);
    } },

  { id: 'TC-12', loai: 'Tái lập', uu: 'Trung bình', ten: 'Chạy migrate + seed lần thứ hai và thứ ba không lỗi, không nhân đôi, không ghi đè dữ liệu đã đổi',
    pre: 'Dữ liệu seed đã nạp 1 lần; phân công T-2026-0042 cho TECH-007 (dữ liệu đã đổi so với seed).',
    buoc: ['Đếm customer, technician, technician_skill, ticket, schema_migrations', 'Chạy migrate(url, {seed:true}) hai lần nữa', 'Đếm lại 5 bảng; GET /tickets/T-2026-0042'],
    mong: 'Không báo lỗi; số dòng 5 bảng không đổi; T-2026-0042 vẫn ASSIGNED / TECH-007 (seed không khôi phục về Chờ phân công).',
    async run(t) {
      await http('POST', '/tickets/T-2026-0042/assignment', { as: 'quanly01', body: { technician_code: 'TECH-007' } });
      const tables = ['customer', 'technician', 'technician_skill', 'ticket', 'schema_migrations'];
      const snap = async () => { const o = {}; for (const x of tables) o[x] = await count(x); return o; };
      const before = await snap(); let err = null;
      try { await migrate(url, { seed: true }); await migrate(url, { seed: true }); } catch (e) { err = e.message; }
      const after = await snap(); const g = await http('GET', '/tickets/T-2026-0042', { as: 'quanly01' });
      t.say(`trước: ${JSON.stringify(before)}`); t.say(`sau  : ${JSON.stringify(after)}`);
      t.expect('lỗi khi chạy lại migrate + seed', null, err);
      t.expect('số dòng các bảng', before, after);
      t.expect('T-2026-0042 sau khi seed lại', ['ASSIGNED', 'TECH-007'], [g.body.status, g.body.technician && g.body.technician.technician_code]);
    } },
];

(async () => {
  const want = process.argv[2];
  const list = want ? TCS.filter((x) => x.id === want.toUpperCase()) : TCS;
  if (!list.length) { console.error(`Không có test case "${want}". Hợp lệ: ${TCS.map((x) => x.id).join(', ')}`); process.exit(2); }
  const server = app.listen(0); await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  for (const tc of list) {
    await resetDb();
    console.log(`\n════ ${tc.id} · ${tc.loai} · Ưu tiên: ${tc.uu} ════\n${tc.ten}`);
    console.log(`Tiền điều kiện: ${tc.pre}`);
    console.log('Các bước:'); tc.buoc.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log(`Mong đợi: ${tc.mong}\n-- Kết quả chạy thật --`);
    const t = makeRun(); let crashed = null;
    try { await tc.run(t); } catch (e) { crashed = e; console.log(`  ✘ Lỗi khi chạy: ${e.message}`); }
    const ok = !crashed && t.checks.length > 0 && t.checks.every(Boolean);
    console.log(`=> ${tc.id}: ${ok ? 'PASS' : 'FAIL'}  (${t.checks.filter(Boolean).length}/${t.checks.length} điểm kiểm tra khớp)`);
    results.push([tc, ok]);
  }
  console.log('\n──────── TỔNG KẾT ────────');
  results.forEach(([tc, ok]) => console.log(`${tc.id}  ${ok ? 'PASS' : 'FAIL'}  ${tc.loai.padEnd(18)} ${tc.ten}`));
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`Tổng: ${results.length} test case · PASS ${results.length - failed} · FAIL ${failed}`);
  server.close(); await admin.end(); await pool.end();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('Lỗi:', e); process.exit(1); });
