// LỚP NGHIỆP VỤ – AppointmentService (UC3 Đặt lịch, UC4 Kiểm tra trùng lịch, UC6–UC8).
const { AppError } = require('../errors');
const { pool, withTransaction } = require('../db/pool');
const ticketRepo = require('../repositories/ticket.repository');
const technicianRepo = require('../repositories/technician.repository');
const appointmentRepo = require('../repositories/appointment.repository');
const { validateAppointmentInput, toVnIso } = require('./validation');

// Móc dành riêng cho test (xem assign.service.js)
const hooks = { afterChecks: async () => {} };

function toApi(r) {
  return { appointment_code: r.appointment_code, ticket_code: r.ticket_code,
           technician_code: r.technician_code, type: r.appt_type,
           start_at: toVnIso(r.start_at), end_at: toVnIso(r.end_at), status: r.status };
}
function conflictError(c) {
  return new AppError(409, 'APPOINTMENT_CONFLICT',
    `Kỹ thuật viên ${c.technician_code} đã có lịch hẹn trong khung giờ này.`,
    { conflicting_appointment: { appointment_code: c.appointment_code,
        start_at: toVnIso(c.start_at), end_at: toVnIso(c.end_at) } });
}

// FR4 + FR5 – UC3 (include UC4)
async function create(body, user, now = new Date()) {
  const input = validateAppointmentInput(body, now);
  try {
    return await withTransaction(async (tx) => {
      const ticket = await ticketRepo.findByCode(tx, input.ticketCode);
      if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', `Không tìm thấy phiếu ${input.ticketCode}.`);
      // Khóa dòng kỹ thuật viên: các yêu cầu đặt lịch của CÙNG một kỹ thuật viên xếp hàng nhau.
      // Nếu không khóa, hai INSERT chồng nhau chờ nhau và PostgreSQL báo deadlock (40P01) → lỗi 500.
      const tech = await technicianRepo.findByCode(tx, input.technicianCode, { forUpdate: true });
      if (!tech) throw new AppError(404, 'TECHNICIAN_NOT_FOUND', `Không tìm thấy kỹ thuật viên ${input.technicianCode}.`);
      if (ticket.technician_id !== tech.technician_id)                                          // BR-07
        throw new AppError(409, 'TECHNICIAN_NOT_ASSIGNED', 'Kỹ thuật viên không phải người đang phụ trách phiếu này.');
      const clash = await appointmentRepo.findOverlap(tx, tech.technician_id, input.startAt, input.endAt); // UC4
      if (clash) throw conflictError(clash);
      await hooks.afterChecks();
      const row = await appointmentRepo.insert(tx, { ticketId: ticket.ticket_id, technicianId: tech.technician_id,
        type: input.type, startAt: input.startAt, endAt: input.endAt, by: user.name });
      return toApi(row);
    });
  } catch (err) {
    // Chốt chặn cuối: ràng buộc EXCLUDE (23P01) của CSDL (NFR2)
    if (err.code === '23P01') {
      const tech = await technicianRepo.findByCode(pool, input.technicianCode);
      const clash = await appointmentRepo.findOverlap(pool, tech.technician_id, input.startAt, input.endAt);
      if (clash) throw conflictError(clash);
    }
    throw err;
  }
}

// FR6 – danh sách. Kỹ thuật viên chỉ thấy lịch của chính mình (NFR3).
async function list(filters, user) {
  const f = { ...filters };
  if (user.role === 'TECHNICIAN') {
    if (!user.code) throw new AppError(403, 'FORBIDDEN', 'Thiếu X-User-Code của kỹ thuật viên.');
    f.technicianCode = user.code;
  }
  return (await appointmentRepo.list(pool, f)).map(toApi);
}
async function get(code, user) {
  const r = await appointmentRepo.findByCode(pool, code);
  if (!r) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', `Không tìm thấy lịch hẹn ${code}.`);
  if (user.role === 'TECHNICIAN' && r.technician_code !== user.code)
    throw new AppError(403, 'FORBIDDEN', 'Chỉ được xem lịch hẹn của chính mình.');
  return toApi(r);
}

// FR8 – xác nhận; hủy. Chuyển trạng thái hợp lệ: PENDING→CONFIRMED|CANCELLED, CONFIRMED→CANCELLED
const TRANSITIONS = { PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['CANCELLED'], CANCELLED: [] };
async function changeStatus(code, status, user) {
  if (!['CONFIRMED', 'CANCELLED'].includes(status))
    throw new AppError(400, 'VALIDATION_ERROR', 'status chỉ nhận CONFIRMED hoặc CANCELLED.', { details: ['status'] });
  if (status === 'CANCELLED' && user.role !== 'MANAGER')
    throw new AppError(403, 'FORBIDDEN', 'Chỉ quản lý trung tâm được hủy lịch hẹn.');
  return withTransaction(async (tx) => {
    const r = await appointmentRepo.findByCode(tx, code, { forUpdate: true });
    if (!r) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', `Không tìm thấy lịch hẹn ${code}.`);
    if (!TRANSITIONS[r.status].includes(status))
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Không thể chuyển lịch hẹn từ ${r.status} sang ${status}.`);
    return toApi(await appointmentRepo.setStatus(tx, code, status));
  });
}
module.exports = { create, list, get, changeStatus, toApi, hooks };
