// LỚP API – xác thực và phân quyền (NFR3).
// Cách 1 (giao diện): Authorization: Bearer <token> lấy từ POST /api/v1/auth/login, hết hạn sau 60 phút.
// Cách 2 (curl/Postman, kiểm thử): header giả lập X-User · X-Role (MANAGER | TECHNICIAN | CUSTOMER) · X-User-Code.
// Nếu có header Authorization mà token sai hoặc hết hạn thì trả 401 ngay, KHÔNG quay về cách 2.
const { AppError } = require('../errors');
const config = require('../config');
const { verify } = require('../services/token');

function authenticate(req, _res, next) {
  const authz = req.get('authorization');
  if (authz) {
    const m = /^Bearer (.+)$/.exec(authz);
    if (!m) return next(new AppError(401, 'TOKEN_INVALID', 'Token không hợp lệ.'));
    try { req.user = verify(m[1], { secret: config.jwtSecret }); return next(); }
    catch (e) { return next(e); }
  }
  const user = req.get('x-user');
  const role = req.get('x-role');
  if (!user || !['MANAGER', 'TECHNICIAN', 'CUSTOMER'].includes(role)) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Thiếu hoặc sai thông tin xác thực.'));
  }
  req.user = { name: user, role, code: req.get('x-user-code') || null };
  next();
}

// NFR3: chặn ở phía server, không chỉ ẩn nút trên giao diện
function requireRole(...roles) {
  return (req, _res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'Vai trò hiện tại không được phép thực hiện thao tác này.'));
}
module.exports = { authenticate, requireRole };
