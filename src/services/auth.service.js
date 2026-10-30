// LỚP NGHIỆP VỤ – AuthService: đăng nhập tài khoản DEMO của Sprint 2 (không có bảng người dùng trong ERD L4).
// Tài khoản giả lập dùng chung mật khẩu demo; bản thật sẽ thay bằng dịch vụ đăng nhập của hệ thống chính.
const crypto = require('crypto');
const { DomainError } = require('../errors');
const config = require('../config');
const { sign, TTL_SECONDS } = require('./token');

const DEMO_USERS = [
  { name: 'quanly01',  full_name: 'Quản lý trung tâm',  role: 'MANAGER',    code: null },
  { name: 'ktv.an',    full_name: 'Nguyễn Văn An',      role: 'TECHNICIAN', code: 'TECH-003' },
  { name: 'ktv.bich',  full_name: 'Trần Thị Bích',      role: 'TECHNICIAN', code: 'TECH-007' },
  { name: 'khach01',   full_name: 'Lê Minh Châu',       role: 'CUSTOMER',   code: '0901234567' }, // code = số điện thoại khách
];

const same = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function login(username, password, nowMs = Date.now()) {
  const u = DEMO_USERS.find((d) => d.name === username);
  if (!u || !same(password || '', config.demoPassword))
    throw new DomainError('INVALID_CREDENTIALS', 'Sai tên đăng nhập hoặc mật khẩu.');
  return { token: sign(u, { secret: config.jwtSecret, nowMs }), token_type: 'Bearer', expires_in: TTL_SECONDS,
           user: { name: u.name, full_name: u.full_name, role: u.role, code: u.code } };
}
module.exports = { login, DEMO_USERS };
