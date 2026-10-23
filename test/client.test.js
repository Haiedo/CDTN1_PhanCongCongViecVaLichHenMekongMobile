// Unit test lớp gọi API của giao diện (src/frontend/api/client.js). Không cần trình duyệt, CSDL hay backend:
// hàm gọi mạng được thay bằng hàm giả. Luồng đúng · giá trị biên · dữ liệu sai.
const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/frontend/api/client.js');
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('luồng đúng: gửi Bearer token và trả về JSON', async () => {
  const { createClient } = await load();
  const calls = [];
  const c = createClient({ storage: mem(), fetchFn: async (url, opt) => { calls.push([url, opt]); return reply(200, { data: [1] })(); } });
  c.setSession('tok123', { name: 'quanly01', role: 'MANAGER' });
  assert.deepEqual(await c.get('/tickets'), { data: [1] });
  assert.equal(calls[0][0], '/api/v1/tickets');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer tok123');
  assert.equal(c.getUser().role, 'MANAGER');
});
test('biên: 401 khi đang có token → xóa phiên và báo onUnauthorized đúng một lần', async () => {
  const { createClient, ApiError } = await load();
  let told = 0; let seen;
  const c = createClient({ storage: mem(), onUnauthorized: (code) => { told += 1; seen = code; },
    fetchFn: reply(401, { error: { code: 'TOKEN_EXPIRED', message: 'Hết hạn' } }) });
  c.setSession('cu', { name: 'a' });
  await assert.rejects(c.get('/tickets'), (e) => e instanceof ApiError && e.status === 401 && e.code === 'TOKEN_EXPIRED');
  assert.equal(c.getToken(), null);
  assert.equal(told, 1); assert.equal(seen, 'TOKEN_EXPIRED');
});
test('biên: 401 khi CHƯA có token (sai mật khẩu) không chuyển người dùng về trang đăng nhập', async () => {
  const { createClient } = await load();
  let told = 0;
  const c = createClient({ storage: mem(), onUnauthorized: () => { told += 1; },
    fetchFn: reply(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Sai tên đăng nhập hoặc mật khẩu.' } }) });
  await assert.rejects(c.post('/auth/login', { username: 'a', password: 'b' }), (e) => e.code === 'INVALID_CREDENTIALS');
  assert.equal(told, 0);
});
test('dữ liệu sai: backend tắt (lỗi mạng) → ApiError NETWORK_ERROR kèm câu hướng dẫn', async () => {
  const { createClient } = await load();
  const c = createClient({ storage: mem(), fetchFn: async () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(c.get('/tickets'), (e) => e.status === 0 && e.code === 'NETWORK_ERROR' && /backend/.test(e.message));
});
test('dữ liệu sai: lỗi 409 giữ nguyên mã và dữ liệu kèm theo (lịch xung đột)', async () => {
  const { createClient } = await load();
  const body = { error: { code: 'APPOINTMENT_CONFLICT', message: 'Trùng lịch', conflicting_appointment: { appointment_code: 'APT-0001' } } };
  const c = createClient({ storage: mem(), fetchFn: reply(409, body) });
  await assert.rejects(c.post('/appointments', {}), (e) => e.status === 409 && e.code === 'APPOINTMENT_CONFLICT'
    && e.extra.conflicting_appointment.appointment_code === 'APT-0001');
});
test('dữ liệu sai: máy chủ trả 500 không phải JSON vẫn cho ra ApiError có thông báo', async () => {
  const { createClient } = await load();
  const c = createClient({ storage: mem(), fetchFn: async () => ({ ok: false, status: 500, json: async () => { throw new Error('không phải JSON'); } }) });
  await assert.rejects(c.get('/tickets'), (e) => e.status === 500 && e.code === 'HTTP_500' && e.message.length > 0);
});
