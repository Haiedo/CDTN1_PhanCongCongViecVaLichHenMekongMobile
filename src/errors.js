// Lỗi nghiệp vụ mang mã HTTP và error.code theo docs/api-contract.md
class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
module.exports = { AppError };
