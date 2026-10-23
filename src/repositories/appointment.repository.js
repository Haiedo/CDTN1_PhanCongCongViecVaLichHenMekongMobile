// Bảng: appointment. Chống trùng lịch: ràng buộc ex_appt_no_overlap (db/schema.sql) là chốt chặn cuối.
const SELECT = `SELECT a.appointment_code, tk.ticket_code, te.technician_code, a.appt_type,
                       a.start_at, a.end_at, a.status, c.phone AS customer_phone
                  FROM appointment a
                  JOIN ticket tk ON tk.ticket_id = a.ticket_id
                  JOIN customer c ON c.customer_id = tk.customer_id
                  JOIN technician te ON te.technician_id = a.technician_id`;

async function findOverlap(db, technicianId, startAt, endAt) {
  const { rows } = await db.query(
    `${SELECT} WHERE a.technician_id = $1 AND a.status <> 'CANCELLED'
        AND tstzrange(a.start_at, a.end_at) && tstzrange($2::timestamptz, $3::timestamptz)
      ORDER BY a.start_at LIMIT 1`, [technicianId, startAt, endAt]);
  return rows[0] || null;
}
async function findByCode(db, code, { forUpdate = false } = {}) {
  const { rows } = await db.query(
    `${SELECT} WHERE a.appointment_code = $1 ${forUpdate ? 'FOR UPDATE OF a' : ''}`, [code]);
  return rows[0] || null;
}
async function insert(db, { ticketId, technicianId, type, startAt, endAt, by }) {
  const ins = await db.query(
    `INSERT INTO appointment (appointment_code, ticket_id, technician_id, appt_type, start_at, end_at, created_by)
     VALUES ('TMP-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), $1, $2, $3, $4, $5, $6)
     RETURNING appointment_id`, [ticketId, technicianId, type, startAt, endAt, by]);
  const { rows } = await db.query(
    `UPDATE appointment SET appointment_code = 'APT-' || lpad(appointment_id::text, 4, '0')
      WHERE appointment_id = $1 RETURNING appointment_code`, [ins.rows[0].appointment_id]);
  return findByCode(db, rows[0].appointment_code);
}
async function list(db, { technicianCode, ticketCode, status, customerPhone }) {
  const where = []; const params = [];
  if (technicianCode) { params.push(technicianCode); where.push(`te.technician_code = $${params.length}`); }
  if (ticketCode) { params.push(ticketCode); where.push(`tk.ticket_code = $${params.length}`); }
  if (status) { params.push(status); where.push(`a.status = $${params.length}`); }
  if (customerPhone) { params.push(customerPhone); where.push(`c.phone = $${params.length}`); }
  const { rows } = await db.query(
    `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.start_at ASC`, params);
  return rows;
}
async function setStatus(db, code, status) {
  await db.query('UPDATE appointment SET status = $2 WHERE appointment_code = $1', [code, status]);
  return findByCode(db, code);
}
// FR3: chuyển các lịch hẹn CHƯA DIỄN RA (chưa hủy) của phiếu sang kỹ thuật viên mới. Ràng buộc EXCLUDE sẽ từ chối nếu trùng lịch (23P01).
async function moveFutureToTechnician(db, ticketId, technicianId) {
  const { rowCount } = await db.query(
    `UPDATE appointment SET technician_id = $2
      WHERE ticket_id = $1 AND status <> 'CANCELLED' AND start_at > now()`, [ticketId, technicianId]);
  return rowCount;
}
module.exports = { findOverlap, insert, findByCode, list, setStatus, moveFutureToTechnician };
