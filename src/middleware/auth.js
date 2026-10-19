// LỚP API – xác thực và phân quyền (NFR3).
// Đăng nhập và cấp token nằm NGOÀI phạm vi L4 (xem sơ đồ kiến trúc), nên ở Sprint 1 dùng header giả lập:
//   X-User (tên đăng nhập) · X-Role (MANAGER | TECHNICIAN | CUSTOMER) · X-User-Code (mã kỹ thuật viên, vd TECH-003)
const { AppError } = require('../errors');

function authenticate(req, _res, next) {
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
