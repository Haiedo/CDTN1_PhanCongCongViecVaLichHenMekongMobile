// Unit test cấu hình: không có mật khẩu hay khóa thật trong mã; thiếu biến thì báo lỗi rõ ràng.
const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');

function withEnv(vars, fn) {
  const old = {};
  for (const k of Object.keys(vars)) { old[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return fn(); } finally { for (const k of Object.keys(old)) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; } }
}
test('thiếu DATABASE_URL: báo lỗi chỉ cách khắc phục (cp .env.example .env), không dùng mật khẩu mặc định', () => {
  withEnv({ DATABASE_URL: undefined }, () => assert.throws(() => config.databaseUrl, /DATABASE_URL.*\.env\.example/s));
});
test('có DATABASE_URL: trả đúng giá trị', () => {
  withEnv({ DATABASE_URL: 'postgresql://u:p@h:5432/d' }, () => assert.equal(config.databaseUrl, 'postgresql://u:p@h:5432/d'));
});
test('thiếu JWT_SECRET khi phát triển: dùng khóa ngẫu nhiên 64 ký tự hex, không phải chuỗi cố định trong mã', () => {
  const w = console.warn; console.warn = () => {};
  try {
    withEnv({ JWT_SECRET: undefined, NODE_ENV: undefined }, () => {
      const s = config.jwtSecret;
      assert.match(s, /^[0-9a-f]{64}$/);
      assert.equal(config.jwtSecret, s);                       // ổn định trong cùng một lần chạy
    });
  } finally { console.warn = w; }
});
test('thiếu JWT_SECRET khi NODE_ENV=production: từ chối khởi động', () => {
  withEnv({ JWT_SECRET: undefined, NODE_ENV: 'production' }, () => assert.throws(() => config.jwtSecret, /JWT_SECRET/));
});
test('khung giờ làm việc BR-06: 08:00–17:30, múi giờ +07:00', () => {
  assert.equal(config.workStartMinutes, 480);
  assert.equal(config.workEndMinutes, 1050);
  assert.equal(config.vnOffsetMinutes, 420);
});
