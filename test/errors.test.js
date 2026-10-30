// Unit test lớp API: đổi lỗi thành phản hồi HTTP (không cần CSDL). Đây là nơi duy nhất biết mã HTTP.
const test = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler, STATUS_BY_CODE, isDatabaseDown } = require('../src/middleware/error');
const { DomainError, AppError } = require('../src/errors');

// Phản hồi giả: ghi lại mã và nội dung
function fakeRes() {
  const r = { code: null, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
const handle = (err) => { const res = fakeRes(); errorHandler(err, {}, res, () => {}); return res; };
const quiet = (fn) => { const o = console.error; console.error = () => {}; try { return fn(); } finally { console.error = o; } };

test('lỗi nghiệp vụ: mã lỗi được đổi sang đúng mã HTTP và giữ nguyên thông tin kèm theo', () => {
  const r = handle(new DomainError('APPOINTMENT_CONFLICT', 'Trùng lịch', { conflicting_appointment: { appointment_code: 'APT-0001' } }));
  assert.equal(r.code, 409);
  assert.equal(r.body.error.code, 'APPOINTMENT_CONFLICT');
  assert.equal(r.body.error.conflicting_appointment.appointment_code, 'APT-0001');
  assert.equal(handle(new DomainError('TICKET_NOT_FOUND', 'x')).code, 404);
  assert.equal(handle(new DomainError('TOKEN_EXPIRED', 'x')).code, 401);
});
test('lỗi của lớp API (AppError) giữ mã HTTP đã gắn sẵn', () => {
  assert.equal(handle(new AppError(403, 'FORBIDDEN', 'x')).code, 403);
});
test('dữ liệu sai: JSON hỏng → 400 INVALID_JSON, không lộ lỗi thô của thư viện', () => {
  const e = Object.assign(new SyntaxError('Unexpected token } in JSON at position 5'), { type: 'entity.parse.failed' });
  const r = handle(e);
  assert.equal(r.code, 400); assert.equal(r.body.error.code, 'INVALID_JSON');
  assert.ok(!JSON.stringify(r.body).includes('Unexpected token'));
});
test('suy giảm có kiểm soát: mất kết nối PostgreSQL → 503 DATABASE_UNAVAILABLE (kể cả AggregateError của Node 20+)', () => {
  quiet(() => {
    assert.equal(handle(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })).code, 503);
    const agg = Object.assign(new Error('x'), { errors: [{ code: 'ECONNREFUSED' }, { code: 'ECONNREFUSED' }] });
    assert.equal(isDatabaseDown(agg), true);
    assert.equal(handle(agg).body.error.code, 'DATABASE_UNAVAILABLE');
  });
});
test('lỗi lạ → 500 với câu chung "Lỗi hệ thống", không lộ nội dung lỗi nội bộ', () => {
  const r = quiet(() => handle(new Error('password authentication failed for user postgres')));
  assert.equal(r.code, 500);
  assert.ok(!JSON.stringify(r.body).includes('password'));
});
test('mọi mã lỗi trong bảng ánh xạ đều là mã HTTP hợp lệ 400–503', () => {
  for (const [code, status] of Object.entries(STATUS_BY_CODE)) assert.ok(status >= 400 && status <= 503, code);
});
