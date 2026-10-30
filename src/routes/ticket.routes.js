// LỚP API – TicketController: CRUD phiếu (tạo, xem, sửa, xóa), gợi ý và phân công kỹ thuật viên (US1, US2).
// Chỉ làm 3 việc: kiểm tra đầu vào, gọi service, đổi kết quả thành HTTP. KHÔNG chứa quy tắc nghiệp vụ.
const express = require('express');
const { AppError } = require('../errors');
const { requireRole } = require('../middleware/auth');
const { pool } = require('../db/pool');
const config = require('../config');
const assignService = require('../services/assign.service');
const ticketService = require('../services/ticket.service');
const { TICKET_RE, TECH_RE } = require('../services/validation');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// Create – quản lý nhập phiếu mới (Chờ phân công)
router.post('/', requireRole('MANAGER'), wrap(async (req, res) => {
  res.status(201).json(await ticketService.create(req.body));
}));
router.get('/', wrap(async (req, res) => {
  res.status(200).json({ data: await ticketService.list({ status: req.query.status }, req.user) });
}));
router.get('/:ticket_code', wrap(async (req, res) => {
  if (!TICKET_RE.test(req.params.ticket_code))
    throw new AppError(400, 'INVALID_PARAMETER', 'ticket_code sai định dạng.');
  res.status(200).json(await ticketService.get(req.params.ticket_code, req.user));
}));
// Update / Delete – chỉ khi phiếu còn Chờ phân công (service kiểm tra)
router.patch('/:ticket_code', requireRole('MANAGER'), wrap(async (req, res) => {
  if (!TICKET_RE.test(req.params.ticket_code)) throw new AppError(400, 'INVALID_PARAMETER', 'ticket_code sai định dạng.');
  res.status(200).json(await ticketService.update(req.params.ticket_code, req.body));
}));
router.delete('/:ticket_code', requireRole('MANAGER'), wrap(async (req, res) => {
  if (!TICKET_RE.test(req.params.ticket_code)) throw new AppError(400, 'INVALID_PARAMETER', 'ticket_code sai định dạng.');
  res.status(200).json(await ticketService.remove(req.params.ticket_code));
}));
router.get('/:ticket_code/technician-suggestions', requireRole('MANAGER'), wrap(async (req, res) => {
  const { ticket_code: code } = req.params;
  const limit = req.query.limit === undefined ? 5 : Number(req.query.limit);
  const purpose = req.query.purpose === undefined ? 'assign' : req.query.purpose;
  if (!TICKET_RE.test(code) || !Number.isInteger(limit) || limit < 1 || limit > config.maxSuggestLimit
      || !['assign', 'reassign'].includes(purpose))
    throw new AppError(400, 'INVALID_PARAMETER', 'ticket_code sai định dạng, limit ngoài khoảng 1–20 hoặc purpose khác assign/reassign.');
  res.status(200).json(await assignService.suggest(pool, code, limit, purpose));
}));

router.post('/:ticket_code/assignment', requireRole('MANAGER'), wrap(async (req, res) => {
  const { ticket_code: code } = req.params;
  const { technician_code: tech, note } = req.body || {};
  const bad = [];
  if (!TICKET_RE.test(code)) bad.push('ticket_code sai định dạng');
  if (!TECH_RE.test(String(tech || ''))) bad.push('technician_code bắt buộc, dạng TECH-NNN');
  if (note !== undefined && (typeof note !== 'string' || note.length > 255)) bad.push('note tối đa 255 ký tự');
  if (bad.length) throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ: ' + bad.join('; ') + '.', { details: bad });
  res.status(201).json(await assignService.assign({ ticketCode: code, technicianCode: tech, note, user: req.user }));
}));

// FR3 – UC5: phân công lại. Lý do bắt buộc (1–255 ký tự).
router.post('/:ticket_code/reassignment', requireRole('MANAGER'), wrap(async (req, res) => {
  const { ticket_code: code } = req.params;
  const { technician_code: tech, reason, note } = req.body || {};
  const bad = [];
  if (!TICKET_RE.test(code)) bad.push('ticket_code sai định dạng');
  if (!TECH_RE.test(String(tech || ''))) bad.push('technician_code bắt buộc, dạng TECH-NNN');
  if (typeof reason !== 'string' || reason.trim().length < 1 || reason.length > 255) bad.push('reason bắt buộc, 1–255 ký tự');
  if (note !== undefined && (typeof note !== 'string' || note.length > 255)) bad.push('note tối đa 255 ký tự');
  if (bad.length) throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ: ' + bad.join('; ') + '.', { details: bad });
  res.status(200).json(await assignService.reassign({ ticketCode: code, technicianCode: tech, reason: reason.trim(), note, user: req.user }));
}));
module.exports = router;
