const { AppError } = require('../errors');

function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy đường dẫn.'));
}
// Định dạng lỗi chung: { "error": { "code", "message", ... } }
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Nội dung JSON không hợp lệ.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
}
module.exports = { notFound, errorHandler };
