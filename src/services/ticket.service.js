// LỚP NGHIỆP VỤ – TicketService: xem danh sách và chi tiết phiếu (US4, US5, phục vụ màn hình M1 và M3).
// Phạm vi dữ liệu theo vai trò (NFR3): quản lý thấy tất cả; kỹ thuật viên chỉ phiếu của mình; khách chỉ phiếu của mình.
const { DomainError } = require('../errors');
const { pool, withTransaction } = require('../db/pool');
const ticketRepo = require('../repositories/ticket.repository');
const assignmentRepo = require('../repositories/assignment.repository');
const customerRepo = require('../repositories/customer.repository');
const { toVnIso, vnParts, validateTicketInput } = require('./validation');

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
  if (!user.code) throw new DomainError('FORBIDDEN', 'Thiếu mã người dùng (X-User-Code).');
  return user.role === 'TECHNICIAN' ? { technicianCode: user.code } : { customerPhone: user.code };
}
function allowed(user, r) {
  if (user.role === 'MANAGER') return true;
  return user.role === 'TECHNICIAN' ? r.technician_code === user.code : r.customer_phone === user.code;
}

async function list({ status }, user) {
  if (status !== undefined && !STATUSES.includes(status))
    throw new DomainError('INVALID_PARAMETER', 'status phải là ' + STATUSES.join(', ') + '.');
  return (await ticketRepo.list(pool, { status, ...scope(user) })).map(toApi);
}
async function get(code, user) {
  const r = await ticketRepo.findView(pool, code);
  if (!r) throw new DomainError('TICKET_NOT_FOUND', `Không tìm thấy phiếu ${code}.`);
  if (!allowed(user, r)) throw new DomainError('FORBIDDEN', 'Chỉ được xem phiếu của chính mình.');
  const history = await assignmentRepo.listByTicket(pool, r.ticket_id);
  return { ...toApi(r), assignments: history.map((h) => ({ assignment_code: h.assignment_code,
    technician_code: h.technician_code, action: h.action, reason: h.reason, note: h.note,
    assigned_by: h.assigned_by, assigned_at: toVnIso(h.assigned_at) })) };
}

// ----- Tạo / sửa / xóa phiếu (đủ CRUD cho thực thể ticket). Chỉ quản lý được ghi (kiểm ở lớp API). -----
// Tạo: phiếu mới luôn ở Chờ phân công, chưa có kỹ thuật viên (khớp ràng buộc ck_ticket_assignee).
async function create(body, now = new Date()) {
  const input = validateTicketInput(body);
  const year = vnParts(now).ymd.slice(0, 4);
  const code = await withTransaction(async (tx) => {
    const customer = await customerRepo.findByPhone(tx, input.customerPhone);
    if (!customer) throw new DomainError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng có số điện thoại ${input.customerPhone}.`);
    return ticketRepo.insert(tx, { customerId: customer.customer_id, deviceModel: input.deviceModel,
      requiredSkill: input.requiredSkill, serviceArea: input.serviceArea, year });
  });
  return toApi(await ticketRepo.findView(pool, code));
}
// Sửa: chỉ khi phiếu còn Chờ phân công (đổi tay nghề/địa bàn sau khi đã phân công sẽ làm sai điều kiện đã kiểm).
async function update(code, body) {
  const input = validateTicketInput(body, { partial: true });
  await withTransaction(async (tx) => {
    const t = await ticketRepo.findByCode(tx, code, { forUpdate: true });     // khóa dòng: không đua với phân công
    if (!t) throw new DomainError('TICKET_NOT_FOUND', `Không tìm thấy phiếu ${code}.`);
    if (t.status !== 'WAITING_ASSIGNMENT')
      throw new DomainError('TICKET_NOT_EDITABLE', 'Chỉ sửa được phiếu đang ở trạng thái Chờ phân công.');
    await ticketRepo.update(tx, t.ticket_id, input);
  });
  return toApi(await ticketRepo.findView(pool, code));
}
// Xóa: chỉ phiếu Chờ phân công (chưa có lịch sử phân công, chưa có lịch hẹn) mới xóa được.
async function remove(code) {
  await withTransaction(async (tx) => {
    const t = await ticketRepo.findByCode(tx, code, { forUpdate: true });
    if (!t) throw new DomainError('TICKET_NOT_FOUND', `Không tìm thấy phiếu ${code}.`);
    if (t.status !== 'WAITING_ASSIGNMENT')
      throw new DomainError('TICKET_NOT_DELETABLE', 'Chỉ xóa được phiếu đang ở trạng thái Chờ phân công.');
    await ticketRepo.remove(tx, t.ticket_id);
  });
  return { ticket_code: code, deleted: true };
}
module.exports = { list, get, create, update, remove, STATUSES };
