// LỚP API – AppointmentController: CRUD lịch hẹn (entity chính của Sprint 1).
//   Create POST   /appointments        (US3, MANAGER)
//   Read   GET    /appointments, /:code (US4, US5: MANAGER hoặc TECHNICIAN – chỉ lịch của mình)
//   Update PATCH  /appointments/:code   (US6 xác nhận lịch hẹn; hủy: MANAGER)
//   Delete DELETE /appointments/:code   (hủy mềm: đổi trạng thái CANCELLED, giữ lịch sử – NFR5)
const express = require('express');
const { requireRole } = require('../middleware/auth');
const service = require('../services/appointment.service');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.post('/', requireRole('MANAGER'), wrap(async (req, res) => {
  res.status(201).json(await service.create(req.body, req.user));
}));
router.get('/', requireRole('MANAGER', 'TECHNICIAN'), wrap(async (req, res) => {
  const { technician_code: technicianCode, ticket_code: ticketCode, status } = req.query;
  res.status(200).json({ data: await service.list({ technicianCode, ticketCode, status }, req.user) });
}));
router.get('/:code', requireRole('MANAGER', 'TECHNICIAN'), wrap(async (req, res) => {
  res.status(200).json(await service.get(req.params.code, req.user));
}));
router.patch('/:code', wrap(async (req, res) => {
  res.status(200).json(await service.changeStatus(req.params.code, (req.body || {}).status, req.user));
}));
router.delete('/:code', requireRole('MANAGER'), wrap(async (req, res) => {
  res.status(200).json(await service.changeStatus(req.params.code, 'CANCELLED', req.user));
}));
module.exports = router;
