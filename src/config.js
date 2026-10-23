require('dotenv').config();
module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://mekong:mekong@localhost:5432/mekong_l4',
  jwtSecret: process.env.JWT_SECRET || 'doi-chuoi-bi-mat-nay-khi-trien-khai',   // ký token đăng nhập
  demoPassword: process.env.DEMO_PASSWORD || 'demo123',                       // mật khẩu chung của tài khoản demo
  maxSuggestLimit: 20,                       // API: limit 1–20
  workStartMinutes: 8 * 60,                  // BR-06: 08:00
  workEndMinutes: 17 * 60 + 30,              // BR-06: 17:30
  vnOffsetMinutes: 7 * 60,                   // múi giờ +07:00
};
