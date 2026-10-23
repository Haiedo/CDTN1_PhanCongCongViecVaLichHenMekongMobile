// LỚP NGHIỆP VỤ – AssignService (UC1 Gợi ý, UC2 Phân công). Chứa quy tắc BR-01..04.
const { AppError } = require('../errors');
const { withTransaction } = require('../db/pool');
const ticketRepo = require('../repositories/ticket.repository');
const technicianRepo = require('../repositories/technician.repository');
const assignmentRepo = require('../repositories/assignment.repository');
const appointmentRepo = require('../repositories/appointment.repository');
const { toVnIso } = require('./validation');

// Móc dành riêng cho test: chèn độ trễ giữa bước kiểm tra và bước ghi để tái hiện cuộc đua.
const hooks = { afterChecks: async () => {} };

// FR1 – UC1
// purpose = 'reassign' (FR3): phiếu phải đang Đã phân công và loại kỹ thuật viên hiện tại khỏi danh sách.
async function suggest(db, ticketCode, limit, purpose = 'assign') {
  const ticket = await ticketRepo.findByCode(db, ticketCode);
  if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', `Không tìm thấy phiếu ${ticketCode}.`);
  const reassign = purpose === 'reassign';
  if (reassign && (ticket.status !== 'ASSIGNED' || !ticket.technician_id))
    throw new AppError(409, 'TICKET_NOT_ASSIGNED', 'Chỉ phân công lại phiếu đang ở trạng thái Đã phân công.');
  if (!reassign && ticket.status !== 'WAITING_ASSIGNMENT')
    throw new AppError(409, 'TICKET_NOT_WAITING', 'Phiếu không ở trạng thái Chờ phân công.');
  const suggestions = await technicianRepo.suggestFor(db,
    { skillCode: ticket.required_skill, serviceArea: ticket.service_area, limit,
      excludeTechnicianId: reassign ? ticket.technician_id : null });
  return { ticket_code: ticket.ticket_code, required_skill: ticket.required_skill,
           service_area: ticket.service_area, suggestions };
}

// FR2 – UC2. Luồng ngoại lệ 1a (đã có người), 4a (quá tải), 4b (không đủ điều kiện).
// Khóa dòng phiếu và dòng kỹ thuật viên trong cùng giao dịch => hai quản lý thao tác đồng thời
// không thể cùng đẩy một kỹ thuật viên vượt ngưỡng (NFR2).
async function assign({ ticketCode, technicianCode, note, user }) {
  return withTransaction(async (tx) => {
    const ticket = await ticketRepo.findByCode(tx, ticketCode, { forUpdate: true });
    if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', `Không tìm thấy phiếu ${ticketCode}.`);
    const tech = await technicianRepo.findByCode(tx, technicianCode, { forUpdate: true });
    if (!tech) throw new AppError(404, 'TECHNICIAN_NOT_FOUND', `Không tìm thấy kỹ thuật viên ${technicianCode}.`);

    if (ticket.status !== 'WAITING_ASSIGNMENT' || ticket.technician_id)                      // 1a
      throw new AppError(409, 'TICKET_ALREADY_ASSIGNED', 'Phiếu đã có kỹ thuật viên phụ trách. Hãy dùng phân công lại.');

    const level = await technicianRepo.skillLevel(tx, tech.technician_id, ticket.required_skill);
    if (!tech.is_active || level === null || tech.service_area !== ticket.service_area)       // 4b
      throw new AppError(409, 'TECHNICIAN_NOT_ELIGIBLE', 'Kỹ thuật viên không đủ tay nghề hoặc khác địa bàn.');

    const open = await technicianRepo.countOpenTickets(tx, tech.technician_id);
    if (open >= tech.max_open_tickets)                                                         // 4a
      throw new AppError(409, 'TECHNICIAN_OVERLOADED', `Kỹ thuật viên đã đủ ${tech.max_open_tickets} phiếu mở.`);

    await hooks.afterChecks();
    await ticketRepo.assign(tx, ticket.ticket_id, tech.technician_id);
    const a = await assignmentRepo.insert(tx, { ticketId: ticket.ticket_id, technicianId: tech.technician_id,
      action: 'ASSIGN', note: note || null, by: user.name });
    return { assignment_code: a.assignment_code, ticket_code: ticket.ticket_code,
             technician_code: tech.technician_code, ticket_status: 'ASSIGNED',
             technician_open_tickets: open + 1, assigned_at: toVnIso(a.assigned_at) };
  });
}
// FR3 – UC5: chuyển phiếu Đã phân công sang kỹ thuật viên khác, LÝ DO BẮT BUỘC. Lịch hẹn chưa diễn ra của phiếu đi theo
// người mới; nếu trùng lịch của người mới thì hủy toàn bộ thao tác (giao dịch quay lui, dữ liệu không đổi).
async function reassign({ ticketCode, technicianCode, reason, note, user }) {
  return withTransaction(async (tx) => {
    const ticket = await ticketRepo.findByCode(tx, ticketCode, { forUpdate: true });
    if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', `Không tìm thấy phiếu ${ticketCode}.`);
    if (ticket.status !== 'ASSIGNED' || !ticket.technician_id)
      throw new AppError(409, 'TICKET_NOT_ASSIGNED', 'Chỉ phân công lại phiếu đang ở trạng thái Đã phân công.');
    const probe = await technicianRepo.findByCode(tx, technicianCode);
    if (!probe) throw new AppError(404, 'TECHNICIAN_NOT_FOUND', `Không tìm thấy kỹ thuật viên ${technicianCode}.`);
    if (String(probe.technician_id) === String(ticket.technician_id))
      throw new AppError(409, 'SAME_TECHNICIAN', 'Kỹ thuật viên mới trùng với người đang phụ trách.');
    await technicianRepo.lockMany(tx, [ticket.technician_id, probe.technician_id]);   // khóa cả người cũ và người mới
    const tech = await technicianRepo.findByCode(tx, technicianCode);
    const level = await technicianRepo.skillLevel(tx, tech.technician_id, ticket.required_skill);
    if (!tech.is_active || level === null || tech.service_area !== ticket.service_area)
      throw new AppError(409, 'TECHNICIAN_NOT_ELIGIBLE', 'Kỹ thuật viên không đủ tay nghề hoặc khác địa bàn.');
    const open = await technicianRepo.countOpenTickets(tx, tech.technician_id);
    if (open >= tech.max_open_tickets)
      throw new AppError(409, 'TECHNICIAN_OVERLOADED', `Kỹ thuật viên đã đủ ${tech.max_open_tickets} phiếu mở.`);
    let moved;
    try { moved = await appointmentRepo.moveFutureToTechnician(tx, ticket.ticket_id, tech.technician_id); }
    catch (err) {
      if (err.code === '23P01')
        throw new AppError(409, 'APPOINTMENT_CONFLICT',
          `Lịch hẹn chưa diễn ra của phiếu bị trùng với lịch của ${tech.technician_code}. Hãy chọn kỹ thuật viên khác.`);
      throw err;
    }
    await ticketRepo.assign(tx, ticket.ticket_id, tech.technician_id);
    const a = await assignmentRepo.insert(tx, { ticketId: ticket.ticket_id, technicianId: tech.technician_id,
      action: 'REASSIGN', reason, note: note || null, by: user.name });
    return { assignment_code: a.assignment_code, ticket_code: ticket.ticket_code, technician_code: tech.technician_code,
             ticket_status: 'ASSIGNED', moved_appointments: moved, technician_open_tickets: open + 1,
             assigned_at: toVnIso(a.assigned_at) };
  });
}
module.exports = { suggest, assign, reassign, hooks };
