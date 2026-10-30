// Unit test lớp nghiệp vụ: token đăng nhập (NFR3 – hết hạn sau 60 phút). Không cần CSDL.
// Ba loại theo BT2: luồng đúng · giá trị biên · dữ liệu sai.
const test = require('node:test');
const assert = require('node:assert/strict');
const { sign, verify, TTL_SECONDS } = require('../src/services/token');

const SECRET = 'bi-mat-cho-test';
const USER = { name: 'quanly01', role: 'MANAGER', code: null };
const T0 = Date.UTC(2026, 9, 23, 8, 0, 0);                        // 23/10/2026 08:00 UTC

test('luồng đúng: token vừa ký xác thực được và trả lại đúng tên, vai trò, mã', () => {
  const t = sign({ name: 'ktv.an', role: 'TECHNICIAN', code: 'TECH-003' }, { secret: SECRET, nowMs: T0 });
  assert.deepEqual(verify(t, { secret: SECRET, nowMs: T0 + 1000 }), { name: 'ktv.an', role: 'TECHNICIAN', code: 'TECH-003' });
});
test('biên: còn 1 giây trước 60 phút vẫn hợp lệ', () => {
  const t = sign(USER, { secret: SECRET, nowMs: T0 });
  assert.equal(verify(t, { secret: SECRET, nowMs: T0 + (TTL_SECONDS - 1) * 1000 }).name, 'quanly01');
});
test('biên: đúng 60 phút là hết hạn (TOKEN_EXPIRED)', () => {
  const t = sign(USER, { secret: SECRET, nowMs: T0 });
  assert.throws(() => verify(t, { secret: SECRET, nowMs: T0 + TTL_SECONDS * 1000 }),
    (e) => e.code === 'TOKEN_EXPIRED');
});
test('dữ liệu sai: token bị sửa nội dung (đổi vai trò thành MANAGER) bị từ chối', () => {
  const t = sign({ name: 'khach01', role: 'CUSTOMER', code: '0901234567' }, { secret: SECRET, nowMs: T0 });
  const forged = Buffer.from(JSON.stringify({ name: 'khach01', role: 'MANAGER', code: null, iat: 1, exp: 9999999999 })).toString('base64url')
    + '.' + t.split('.')[1];
  assert.throws(() => verify(forged, { secret: SECRET, nowMs: T0 }), (e) => e.code === 'TOKEN_INVALID');
});
test('dữ liệu sai: ký bằng khóa khác, chuỗi rác, rỗng, không phải chuỗi đều bị từ chối', () => {
  const other = sign(USER, { secret: 'khoa-khac', nowMs: T0 });
  for (const bad of [other, 'abc', 'a.b.c', '', null, undefined, 123])
    assert.throws(() => verify(bad, { secret: SECRET, nowMs: T0 }), (e) => e.code === 'TOKEN_INVALID');
});
test('dữ liệu sai: ký token mà thiếu khóa bí mật thì báo lỗi, không tạo token yếu', () => {
  assert.throws(() => sign(USER, { secret: '', nowMs: T0 }), /JWT_SECRET/);
});
