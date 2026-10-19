// LỚP API – TicketController: gợi ý và phân công kỹ thuật viên (US1, US2).
// Chỉ làm 3 việc: kiểm tra đầu vào, gọi service, đổi kết quả thành HTTP. KHÔNG chứa quy tắc nghiệp vụ.
const express = require('express');
const { AppError } = require('../errors');
const { requireRole } = require('../middleware/auth');
const { pool } = require('../db/pool');
const config = require('../config');
const assignService = require('../services/assign.service');
const { TICKET_RE, TECH_RE } = require('../services/validation');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.get('/:ticket_code/technician-suggestions', requireRole('MANAGER'), wrap(async (req, res) => {
  const { ticket_code: code } = req.params;
  const limit = req.query.limit === undefined ? 5 : Number(req.query.limit);
  if (!TICKET_RE.test(code) || !Number.isInteger(limit) || limit < 1 || limit > config.maxSuggestLimit)
    throw new AppError(400, 'INVALID_PARAMETER', 'ticket_code sai định dạng hoặc limit ngoài khoảng 1–20.');
  res.status(200).json(await assignService.suggest(pool, code, limit));
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
module.exports = router;
