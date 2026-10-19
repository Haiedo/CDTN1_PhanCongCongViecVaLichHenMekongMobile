// Bảng: ticket
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
module.exports = { findByCode, assign };
