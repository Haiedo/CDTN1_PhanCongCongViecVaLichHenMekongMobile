// LỚP NGHIỆP VỤ – token đăng nhập (NFR3: token hết hạn sau 60 phút).
// Token dạng  <payload>.<chữ ký>  (payload là JSON mã hóa base64url, chữ ký HMAC-SHA256) – không cần thư viện ngoài.
// Hàm thuần: thời điểm hiện tại được truyền vào nên kiểm thử được mà không cần CSDL hay chờ 60 phút.
const crypto = require('crypto');
const { DomainError } = require('../errors');

const TTL_SECONDS = 60 * 60;

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function sign(user, { secret, nowMs = Date.now(), ttlSeconds = TTL_SECONDS }) {
  if (!secret) throw new Error('Thiếu JWT_SECRET');
  const iat = Math.floor(nowMs / 1000);
  const payload = b64u(JSON.stringify({ name: user.name, role: user.role, code: user.code || null,
                                        iat, exp: iat + ttlSeconds }));
  return `${payload}.${hmac(payload, secret)}`;
}

function verify(token, { secret, nowMs = Date.now() }) {
  const bad = (code, msg) => new DomainError(code, msg);
  if (typeof token !== 'string' || token.split('.').length !== 2)
    throw bad('TOKEN_INVALID', 'Token không hợp lệ.');
  const [payload, sig] = token.split('.');
  const expected = hmac(payload, secret);
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    throw bad('TOKEN_INVALID', 'Token không hợp lệ.');
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { throw bad('TOKEN_INVALID', 'Token không hợp lệ.'); }
  if (Math.floor(nowMs / 1000) >= data.exp)                      // đúng thời điểm hết hạn là đã hết hạn
    throw bad('TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  return { name: data.name, role: data.role, code: data.code };
}
module.exports = { sign, verify, TTL_SECONDS };
