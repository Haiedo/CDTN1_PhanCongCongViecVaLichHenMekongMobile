// Unit test lớp nghiệp vụ (hàm thuần, KHÔNG cần CSDL): quy tắc BR-06 và bảng validation ở api-contract.md
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAppointmentInput, toVnIso } = require('../src/services/validation');

const NOW = new Date('2026-10-05T01:00:00Z');               // 08:00 thứ Hai 05/10/2026 giờ VN
const base = { ticket_code: 'T-2026-0042', technician_code: 'TECH-003', type: 'DROP_OFF',
               start_at: '2026-10-06T09:00:00+07:00', duration_minutes: 30 };
const fails = (body, now = NOW) =>
  assert.throws(() => validateAppointmentInput(body, now), (e) => e.status === 400 && e.code === 'VALIDATION_ERROR');

test('lịch hợp lệ: end_at = start_at + thời lượng, mặc định 30 phút', () => {
  const r = validateAppointmentInput({ ...base, duration_minutes: undefined }, NOW);
  assert.equal(r.durationMinutes, 30);
  assert.equal(toVnIso(r.endAt), '2026-10-06T09:30:00+07:00');
});
test('start_at ở quá khứ bị từ chối (AC3.3)', () => fails({ ...base, start_at: '2026-10-04T09:00:00+07:00' }));
test('trước 08:00 hoặc kết thúc sau 17:30 bị từ chối (BR-06)', () => {
  fails({ ...base, start_at: '2026-10-06T07:30:00+07:00' });
  fails({ ...base, start_at: '2026-10-06T17:15:00+07:00', duration_minutes: 30 });
});
test('Chủ nhật bị từ chối', () => fails({ ...base, start_at: '2026-10-11T09:00:00+07:00' }));
test('thời lượng ngoài 15–120 hoặc không phải số nguyên bị từ chối', () => {
  fails({ ...base, duration_minutes: 10 });
  fails({ ...base, duration_minutes: 121 });
  fails({ ...base, duration_minutes: 30.5 });
});
test('type sai, mã sai định dạng, thiếu start_at đều bị từ chối và liệt kê đủ lỗi', () => {
  fails({ ...base, type: 'DELIVERY' });
  fails({ ...base, ticket_code: '42' });
  assert.throws(() => validateAppointmentInput({}, NOW), (e) => e.extra.details.length >= 4);
});
test('giờ UTC nhưng đúng khung giờ VN vẫn hợp lệ (đổi múi giờ đúng)', () => {
  const r = validateAppointmentInput({ ...base, start_at: '2026-10-06T02:00:00Z' }, NOW);   // 09:00 VN
  assert.equal(toVnIso(r.startAt), '2026-10-06T09:00:00+07:00');
});
