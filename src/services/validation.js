// LỚP NGHIỆP VỤ – hàm thuần (không đụng CSDL) nên kiểm thử đơn vị được.
// Quy tắc: SRS BR-06 và docs/api-contract.md (bảng validation).
const { AppError } = require('../errors');
const config = require('../config');

const TICKET_RE = /^T-\d{4}-\d{4}$/;
const TECH_RE = /^TECH-\d{3}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const TYPES = ['DROP_OFF', 'PICK_UP'];

// Đổi một thời điểm sang "giờ Việt Nam" để kiểm tra khung 08:00–17:30, thứ Hai–thứ Bảy
function vnParts(date) {
  const d = new Date(date.getTime() + config.vnOffsetMinutes * 60000);
  return { minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), weekday: d.getUTCDay(), ymd: d.toISOString().slice(0, 10) };
}
function toVnIso(date) {                       // 2026-10-06T09:00:00+07:00
  const d = new Date(date.getTime() + config.vnOffsetMinutes * 60000);
  return d.toISOString().replace('Z', '').replace(/\.\d{3}$/, '') + '+07:00';
}

function validateAppointmentInput(body = {}, now = new Date()) {
  const errors = [];
  const { ticket_code: ticketCode, technician_code: technicianCode, type, start_at: startRaw } = body;
  const duration = body.duration_minutes === undefined ? 30 : body.duration_minutes;

  if (!TICKET_RE.test(String(ticketCode || ''))) errors.push('ticket_code bắt buộc, dạng T-YYYY-NNNN');
  if (!TECH_RE.test(String(technicianCode || ''))) errors.push('technician_code bắt buộc, dạng TECH-NNN');
  if (!TYPES.includes(type)) errors.push('type bắt buộc, chỉ nhận DROP_OFF hoặc PICK_UP');
  if (!Number.isInteger(duration) || duration < 15 || duration > 120)
    errors.push('duration_minutes phải là số nguyên từ 15 đến 120');

  let startAt = null; let endAt = null;
  if (typeof startRaw !== 'string' || !ISO_RE.test(startRaw) || Number.isNaN(Date.parse(startRaw))) {
    errors.push('start_at bắt buộc, định dạng ISO 8601 kèm múi giờ');
  } else {
    startAt = new Date(startRaw);
    if (Number.isInteger(duration)) {
      endAt = new Date(startAt.getTime() + duration * 60000);
      const s = vnParts(startAt); const e = vnParts(endAt);
      if (startAt <= now) errors.push('start_at phải ở tương lai');
      if (s.weekday === 0) errors.push('start_at không được rơi vào Chủ nhật');
      if (s.minutes < config.workStartMinutes || e.ymd !== s.ymd || e.minutes > config.workEndMinutes)
        errors.push('lịch hẹn phải nằm trong 08:00–17:30 (kể cả giờ kết thúc)');
    }
  }
  if (errors.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ: ' + errors.join('; ') + '.', { details: errors });
  }
  return { ticketCode, technicianCode, type, startAt, endAt, durationMinutes: duration };
}
module.exports = { validateAppointmentInput, toVnIso, TICKET_RE, TECH_RE };
