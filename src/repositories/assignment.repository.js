// Bảng: ticket_assignment (lịch sử phân công – NFR5)
async function insert(db, { ticketId, technicianId, action, reason = null, note = null, by }) {
  // Mã nghiệp vụ ASG-0001 sinh từ khóa chính, trong cùng giao dịch
  const ins = await db.query(
    `INSERT INTO ticket_assignment (assignment_code, ticket_id, technician_id, action, reason, note, assigned_by)
     VALUES ('TMP-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), $1, $2, $3, $4, $5, $6)
     RETURNING assignment_id`, [ticketId, technicianId, action, reason, note, by]);
  const { rows } = await db.query(
    `UPDATE ticket_assignment SET assignment_code = 'ASG-' || lpad(assignment_id::text, 4, '0')
      WHERE assignment_id = $1 RETURNING assignment_code, assigned_at`, [ins.rows[0].assignment_id]);
  return rows[0];
}
async function listByTicket(db, ticketId) {
  const { rows } = await db.query(
    `SELECT a.assignment_code, te.technician_code, a.action, a.reason, a.note, a.assigned_by, a.assigned_at
       FROM ticket_assignment a JOIN technician te ON te.technician_id = a.technician_id
      WHERE a.ticket_id = $1 ORDER BY a.assigned_at DESC, a.assignment_id DESC`, [ticketId]);
  return rows;
}
module.exports = { insert, listByTicket };
