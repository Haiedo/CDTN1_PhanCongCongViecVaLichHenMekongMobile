// Bảng: ticket (đọc kèm customer, technician)
async function findByCode(db, code, { forUpdate = false } = {}) {
  const { rows } = await db.query(
    `SELECT ticket_id, ticket_code, status, required_skill, service_area, technician_id, customer_id
       FROM ticket WHERE ticket_code = $1 ${forUpdate ? 'FOR UPDATE' : ''}`, [code]);
  return rows[0] || null;
}
async function assign(db, ticketId, technicianId) {
  await db.query(`UPDATE ticket SET status = 'ASSIGNED', technician_id = $2 WHERE ticket_id = $1`,
    [ticketId, technicianId]);
}
const VIEW = `SELECT tk.ticket_id, tk.ticket_code, tk.status, tk.device_model, tk.required_skill, tk.service_area,
                     tk.created_at, c.full_name AS customer_name, c.phone AS customer_phone,
                     te.technician_code, te.full_name AS technician_name
                FROM ticket tk
                JOIN customer c ON c.customer_id = tk.customer_id
                LEFT JOIN technician te ON te.technician_id = tk.technician_id`;
async function list(db, { status, technicianCode, customerPhone }) {
  const where = []; const params = [];
  if (status) { params.push(status); where.push(`tk.status = $${params.length}`); }
  if (technicianCode) { params.push(technicianCode); where.push(`te.technician_code = $${params.length}`); }
  if (customerPhone) { params.push(customerPhone); where.push(`c.phone = $${params.length}`); }
  const { rows } = await db.query(
    `${VIEW} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY tk.ticket_code`, params);
  return rows;
}
async function findView(db, code) {
  const { rows } = await db.query(`${VIEW} WHERE tk.ticket_code = $1`, [code]);
  return rows[0] || null;
}
module.exports = { findByCode, assign, list, findView };
