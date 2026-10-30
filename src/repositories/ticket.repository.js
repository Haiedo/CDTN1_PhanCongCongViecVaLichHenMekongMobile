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

// CRUD phiếu (US – tiếp nhận tối thiểu cho BT2). Mã nghiệp vụ T-YYYY-NNNN = số lớn nhất trong năm + 1,
// sinh dưới khóa tư vấn để hai yêu cầu tạo cùng lúc không nhận cùng một mã.
async function insert(db, { customerId, deviceModel, requiredSkill, serviceArea, year }) {
  await db.query('SELECT pg_advisory_xact_lock(727002)');
  const { rows: next } = await db.query(
    `SELECT COALESCE(MAX(substring(ticket_code FROM 8)::int), 0) + 1 AS n FROM ticket WHERE ticket_code LIKE $1`,
    [`T-${year}-%`]);
  const code = `T-${year}-${String(next[0].n).padStart(4, '0')}`;
  await db.query(
    `INSERT INTO ticket (ticket_code, customer_id, device_model, required_skill, service_area)
     VALUES ($1, $2, $3, $4, $5)`, [code, customerId, deviceModel, requiredSkill, serviceArea]);
  return code;
}
// Chỉ ghi các trường được gửi; trường không gửi (undefined) giữ nguyên.
async function update(db, ticketId, { deviceModel, requiredSkill, serviceArea }) {
  await db.query(
    `UPDATE ticket SET device_model = COALESCE($2, device_model), required_skill = COALESCE($3, required_skill),
                       service_area = COALESCE($4, service_area) WHERE ticket_id = $1`,
    [ticketId, deviceModel ?? null, requiredSkill ?? null, serviceArea ?? null]);
}
async function remove(db, ticketId) {
  await db.query('DELETE FROM ticket WHERE ticket_id = $1', [ticketId]);
}
module.exports = { findByCode, assign, list, findView, insert, update, remove };
