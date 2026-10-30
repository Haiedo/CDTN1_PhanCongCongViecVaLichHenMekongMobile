// Cấu hình đọc từ biến môi trường (file .env, xem .env.example). KHÔNG có mật khẩu hay khóa thật nào nằm trong mã.
require('dotenv').config();
const crypto = require('crypto');

let randomSecret = null;
module.exports = {
  port: Number(process.env.PORT) || 3000,
  // Đọc lúc cần dùng (getter) để các test đơn vị không cần CSDL vẫn nạp được file này.
  get databaseUrl() {
    if (!process.env.DATABASE_URL) {
      throw new Error('Thiếu DATABASE_URL. Hãy chạy "cp .env.example .env" rồi sửa mật khẩu PostgreSQL trong .env.');
    }
    return process.env.DATABASE_URL;
  },
  // Khóa ký token. Thiếu JWT_SECRET: khi phát triển dùng khóa ngẫu nhiên mỗi lần khởi động (token cũ mất hiệu lực);
  // khi NODE_ENV=production thì bắt buộc phải đặt.
  get jwtSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') throw new Error('Thiếu JWT_SECRET trong môi trường production.');
    if (!randomSecret) {
      randomSecret = crypto.randomBytes(32).toString('hex');
      console.warn('Cảnh báo: chưa đặt JWT_SECRET trong .env, dùng khóa ngẫu nhiên cho lần chạy này.');
    }
    return randomSecret;
  },
  demoPassword: process.env.DEMO_PASSWORD || 'demo123',   // mật khẩu CHUNG của 4 tài khoản demo (giả lập, công khai trong README)
  maxSuggestLimit: 20,                       // API: limit 1–20
  workStartMinutes: 8 * 60,                  // BR-06: 08:00
  workEndMinutes: 17 * 60 + 30,              // BR-06: 17:30
  vnOffsetMinutes: 7 * 60,                   // múi giờ +07:00
};
