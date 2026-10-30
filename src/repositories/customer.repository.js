// Bảng: customer (dữ liệu khách hàng có từ L2 – L4 chỉ tra cứu)
async function findByPhone(db, phone) {
  const { rows } = await db.query('SELECT customer_id, full_name, phone FROM customer WHERE phone = $1', [phone]);
  return rows[0] || null;
}
module.exports = { findByPhone };
