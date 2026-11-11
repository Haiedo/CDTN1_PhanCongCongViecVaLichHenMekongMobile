// LỚP API – AppointmentController: CRUD lịch hẹn (entity chính của Sprint 1).
//   Create POST   /appointments        (US3, MANAGER)
//   Read   GET    /appointments, /:code (US4, US5: mọi vai trò, mỗi người chỉ thấy lịch của mình)
//   Update PATCH  /appointments/:code   (US6 xác nhận lịch hẹn; hủy: MANAGER)
//   Delete DELETE /appointments/:code   (hủy mềm: đổi trạng thái CANCELLED, giữ lịch sử – NFR5)
const express = require('express');
const { AppError } = require('../errors');
const { requireRole } = require('../middleware/auth');
const service = require('../services/appointment.service');
const { TICKET_RE, TECH_RE } = require('../services/validation');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// Kiểm tham số ở lớp API, cùng quy ước với /tickets: sai định dạng → 400 INVALID_PARAMETER (BUG-09)
const APPT_RE = /^APT-\d{4,}$/;
const STATUSES = ['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'];
const badParam = (msg) => new AppError(400, 'INVALID_PARAMETER', msg);
router.param('code', (_req, _res, next, code) =>
  next(APPT_RE.test(code) ? undefined : badParam('appointment_code sai định dạng, dạng APT-0001.')));

router.post('/', requireRole('MANAGER'), wrap(async (req, res) => {
  res.status(201).json(await service.create(req.body, req.user));
}));
router.get('/', requireRole('MANAGER', 'TECHNICIAN', 'CUSTOMER'), wrap(async (req, res) => {
  const { technician_code: technicianCode, ticket_code: ticketCode, status } = req.query;
  if (technicianCode !== undefined && !TECH_RE.test(technicianCode)) throw badParam('technician_code sai định dạng, dạng TECH-003.');
  if (ticketCode !== undefined && !TICKET_RE.test(ticketCode)) throw badParam('ticket_code sai định dạng, dạng T-2026-0042.');
  if (status !== undefined && !STATUSES.includes(status)) throw badParam('status phải là ' + STATUSES.join(', ') + '.');
  res.status(200).json({ data: await service.list({ technicianCode, ticketCode, status }, req.user) });
}));
router.get('/:code', requireRole('MANAGER', 'TECHNICIAN', 'CUSTOMER'), wrap(async (req, res) => {
  res.status(200).json(await service.get(req.params.code, req.user));
}));
router.patch('/:code', wrap(async (req, res) => {
  res.status(200).json(await service.changeStatus(req.params.code, (req.body || {}).status, req.user));
}));
router.delete('/:code', requireRole('MANAGER'), wrap(async (req, res) => {
  res.status(200).json(await service.changeStatus(req.params.code, 'CANCELLED', req.user));
}));
module.exports = router;
