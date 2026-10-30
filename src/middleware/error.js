// LỚP API – đổi lỗi thành phản hồi HTTP. Đây là NƠI DUY NHẤT map mã lỗi nghiệp vụ → mã HTTP.
const { AppError, DomainError } = require('../errors');

// code (do services ném) → mã HTTP. Mã lạ không có trong bảng được coi là lỗi hệ thống (500).
const STATUS_BY_CODE = {
  VALIDATION_ERROR: 400, INVALID_PARAMETER: 400, INVALID_JSON: 400,
  UNAUTHENTICATED: 401, TOKEN_INVALID: 401, TOKEN_EXPIRED: 401, INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404, TICKET_NOT_FOUND: 404, TECHNICIAN_NOT_FOUND: 404, APPOINTMENT_NOT_FOUND: 404, CUSTOMER_NOT_FOUND: 404,
  TICKET_NOT_WAITING: 409, TICKET_ALREADY_ASSIGNED: 409, TICKET_NOT_ASSIGNED: 409, TICKET_NOT_EDITABLE: 409,
  TICKET_NOT_DELETABLE: 409, TECHNICIAN_NOT_ELIGIBLE: 409, TECHNICIAN_OVERLOADED: 409, TECHNICIAN_NOT_ASSIGNED: 409,
  SAME_TECHNICIAN: 409, APPOINTMENT_CONFLICT: 409, INVALID_STATUS_TRANSITION: 409,
  DATABASE_UNAVAILABLE: 503,
};

// Lỗi kết nối tới PostgreSQL (tắt dịch vụ, sai địa chỉ, đang khởi động lại…) → 503 thay vì 500 khó hiểu.
const DB_DOWN_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '57P03', '08000', '08001', '08003', '08006'];
function isDatabaseDown(err) {
  const all = [err, ...(Array.isArray(err.errors) ? err.errors : [])];      // Node 20+: kết nối localhost có thể là AggregateError
  return all.some((e) => e && DB_DOWN_CODES.includes(e.code));
}

function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy đường dẫn.'));
}

// Định dạng lỗi chung: { "error": { "code", "message", ... } }. Không bao giờ trả lỗi thô của thư viện cho người dùng.
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] || 500;
    return res.status(status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Nội dung JSON không hợp lệ.' } });
  }
  if (isDatabaseDown(err)) {
    console.error('Mất kết nối cơ sở dữ liệu:', err.code || err.message);
    return res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE',
      message: 'Không kết nối được cơ sở dữ liệu. Hãy kiểm tra PostgreSQL đang chạy rồi thử lại.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
}
module.exports = { notFound, errorHandler, STATUS_BY_CODE, isDatabaseDown };
