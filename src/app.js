const express = require('express');
const { authenticate } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(express.json());
app.get('/', (_req, res) => res.json({
  service: 'Smart CRM – Mekong Mobile · L4 (phân công kỹ thuật viên và lịch hẹn)',
  status: 'running',
  health: '/health',
  note: 'API nằm dưới /api/v1 và cần header X-User, X-Role (MANAGER | TECHNICIAN | CUSTOMER)',
  endpoints: [
    'GET   /api/v1/tickets/{ticket_code}/technician-suggestions',
    'POST  /api/v1/tickets/{ticket_code}/assignment',
    'POST  /api/v1/appointments',
    'GET   /api/v1/appointments',
    'GET   /api/v1/appointments/{appointment_code}',
    'PATCH /api/v1/appointments/{appointment_code}',
    'DELETE /api/v1/appointments/{appointment_code}',
  ],
}));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/tickets', authenticate, require('./routes/ticket.routes'));
app.use('/api/v1/appointments', authenticate, require('./routes/appointment.routes'));
app.use(notFound);
app.use(errorHandler);
module.exports = app;