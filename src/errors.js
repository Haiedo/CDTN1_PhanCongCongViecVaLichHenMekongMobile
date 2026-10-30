// Hai loại lỗi, tách theo lớp:
//  - DomainError: lỗi NGHIỆP VỤ do lớp services/validation/token ném ra. Chỉ có `code` và `message`,
//    KHÔNG biết gì về HTTP. Việc đổi code → mã HTTP nằm ở src/middleware/error.js (lớp API).
//  - AppError: lỗi do lớp API (routes, middleware) tự ném, mang sẵn mã HTTP.
class DomainError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}
class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
module.exports = { DomainError, AppError };
