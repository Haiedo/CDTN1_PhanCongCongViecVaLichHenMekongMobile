// LỚP NGHIỆP VỤ – TicketService: xem danh sách và chi tiết phiếu (US4, US5, phục vụ màn hình M1 và M3).
// Phạm vi dữ liệu theo vai trò (NFR3): quản lý thấy tất cả; kỹ thuật viên chỉ phiếu của mình; khách chỉ phiếu của mình.
const { AppError } = require('../errors');
const { pool } = require('../db/pool');
const ticketRepo = require('../repositories/ticket.repository');
const assignmentRepo = require('../repositories/assignment.repository');
const { toVnIso } = require('./validation');

const STATUSES = ['WAITING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'DONE'];

function toApi(r) {
  return { ticket_code: r.ticket_code, status: r.status, device_model: r.device_model,
    required_skill: r.required_skill, service_area: r.service_area,
    customer: { full_name: r.customer_name, phone: r.customer_phone },
    technician: r.technician_code ? { technician_code: r.technician_code, full_name: r.technician_name } : null,
    created_at: toVnIso(r.created_at) };
}
function scope(user) {
  if (user.role === 'MANAGER') return {};
  if (!user.code) throw new AppError(403, 'FORBIDDEN', 'Thiếu mã người dùng (X-User-Code).');
  return user.role === 'TECHNICIAN' ? { technicianCode: user.code } : { customerPhone: user.code };
}
function allowed(user, r) {
  if (user.role === 'MANAGER') return true;
  return user.role === 'TECHNICIAN' ? r.technician_code === user.code : r.customer_phone === user.code;
}

async function list({ status }, user) {
  if (status !== undefined && !STATUSES.includes(status))
    throw new AppError(400, 'INVALID_PARAMETER', 'status phải là ' + STATUSES.join(', ') + '.');
  return (await ticketRepo.list(pool, { status, ...scope(user) })).map(toApi);
}
async function get(code, user) {
  const r = await ticketRepo.findView(pool, code);
  if (!r) throw new AppError(404, 'TICKET_NOT_FOUND', `Không tìm thấy phiếu ${code}.`);
  if (!allowed(user, r)) throw new AppError(403, 'FORBIDDEN', 'Chỉ được xem phiếu của chính mình.');
  const history = await assignmentRepo.listByTicket(pool, r.ticket_id);
  return { ...toApi(r), assignments: history.map((h) => ({ assignment_code: h.assignment_code,
    technician_code: h.technician_code, action: h.action, reason: h.reason, note: h.note,
    assigned_by: h.assigned_by, assigned_at: toVnIso(h.assigned_at) })) };
}
module.exports = { list, get, STATUSES };
