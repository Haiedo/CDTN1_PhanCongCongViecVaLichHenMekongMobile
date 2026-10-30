const path = require('path');
const express = require('express');
const { authenticate } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');
const { pool } = require('./db/pool');

const app = express();
app.use(express.json());
// Giao diện (LỚP GIAO DIỆN): tệp tĩnh, mở tại http://localhost:3000/app/ – chỉ gọi API qua src/frontend/api/
app.use('/app', express.static(path.join(__dirname, 'frontend')));
app.get('/', (_req, res) => res.redirect('/app/'));
app.get('/api', (_req, res) => res.json({
  service: 'Smart CRM – Mekong Mobile · L4 (phân công kỹ thuật viên và lịch hẹn)',
  status: 'running',
  health: '/health',
  note: 'Giao diện tại /app/. API dưới /api/v1: đăng nhập lấy Bearer token (hoặc header X-User, X-Role khi dùng curl)',
  endpoints: [
    'POST  /api/v1/auth/login',
    'POST  /api/v1/tickets',
    'GET   /api/v1/tickets',
    'GET   /api/v1/tickets/{ticket_code}',
    'PATCH /api/v1/tickets/{ticket_code}',
    'DELETE /api/v1/tickets/{ticket_code}',
    'GET   /api/v1/tickets/{ticket_code}/technician-suggestions',
    'POST  /api/v1/tickets/{ticket_code}/assignment',
    'POST  /api/v1/tickets/{ticket_code}/reassignment',
    'POST  /api/v1/appointments',
    'GET   /api/v1/appointments',
    'GET   /api/v1/appointments/{appointment_code}',
    'PATCH /api/v1/appointments/{appointment_code}',
    'DELETE /api/v1/appointments/{appointment_code}',
  ],
}));
// Kiểm tra sức khỏe: API còn chạy nhưng CSDL tắt → 503 và nói rõ (suy giảm có kiểm soát), không để treo.
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    console.error('Health: CSDL không phản hồi:', err.code || err.message);
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/tickets', authenticate, require('./routes/ticket.routes'));
app.use('/api/v1/appointments', authenticate, require('./routes/appointment.routes'));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
