// Bảng: technician, technician_skill. Khối lượng công việc được ĐẾM từ ticket, không lưu thành cột.
const OPEN_STATUSES = `('ASSIGNED','IN_PROGRESS')`;

async function findByCode(db, code, { forUpdate = false } = {}) {
  const { rows } = await db.query(
    `SELECT technician_id, technician_code, full_name, service_area, max_open_tickets, is_active
       FROM technician WHERE technician_code = $1 ${forUpdate ? 'FOR UPDATE' : ''}`, [code]);
  return rows[0] || null;
}
async function countOpenTickets(db, technicianId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM ticket WHERE technician_id = $1 AND status IN ${OPEN_STATUSES}`,
    [technicianId]);
  return rows[0].n;
}
async function skillLevel(db, technicianId, skillCode) {
  const { rows } = await db.query(
    'SELECT skill_level FROM technician_skill WHERE technician_id = $1 AND skill_code = $2',
    [technicianId, skillCode]);
  return rows[0] ? rows[0].skill_level : null;
}
// FR1 / BR-01..03: đủ tay nghề, cùng địa bàn, còn dưới ngưỡng; xếp theo phiếu mở tăng dần,
// bằng nhau thì cấp tay nghề cao hơn xếp trước. Dùng idx_ticket_technician_status (NFR1).
async function suggestFor(db, { skillCode, serviceArea, limit }) {
  const { rows } = await db.query(
    `SELECT t.technician_code, t.full_name, s.skill_level, o.open_tickets, t.max_open_tickets
       FROM technician t
       JOIN technician_skill s ON s.technician_id = t.technician_id AND s.skill_code = $1
       CROSS JOIN LATERAL (SELECT COUNT(*)::int AS open_tickets FROM ticket k
                            WHERE k.technician_id = t.technician_id AND k.status IN ${OPEN_STATUSES}) o
      WHERE t.is_active AND t.service_area = $2 AND o.open_tickets < t.max_open_tickets
      ORDER BY o.open_tickets ASC, s.skill_level DESC, t.technician_code ASC
      LIMIT $3`, [skillCode, serviceArea, limit]);
  return rows;
}
module.exports = { findByCode, countOpenTickets, skillLevel, suggestFor };
