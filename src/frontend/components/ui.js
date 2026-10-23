// Tiện ích dựng giao diện. Dùng textContent (không dùng innerHTML) nên dữ liệu từ API không chèn được mã HTML.
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const TICKET_STATUS = { WAITING_ASSIGNMENT: 'Chờ phân công', ASSIGNED: 'Đã phân công', IN_PROGRESS: 'Đang xử lý', DONE: 'Hoàn tất' };
export const APPT_STATUS = { PENDING_CONFIRMATION: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy' };
export const APPT_TYPE = { DROP_OFF: 'Khách giao máy', PICK_UP: 'Khách nhận máy' };
export const SKILL = { SCREEN_REPAIR: 'Thay màn hình', BATTERY: 'Thay pin', MAINBOARD: 'Sửa mainboard', WATER_DAMAGE: 'Vào nước' };

export const badge = (text, kind) => h('span', { class: `badge badge-${kind}` }, text);
export const ticketBadge = (s) => badge(TICKET_STATUS[s] || s, s === 'WAITING_ASSIGNMENT' ? 'warn' : s === 'DONE' ? 'ok' : 'info');
export const apptBadge = (s) => badge(APPT_STATUS[s] || s, s === 'PENDING_CONFIRMATION' ? 'warn' : s === 'CONFIRMED' ? 'ok' : 'muted');

// "2026-10-26T09:00:00+07:00" → "26/10/2026 09:00" (cắt chuỗi, không đổi múi giờ)
export function fmtTime(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '';
}

export function table(headers, rows) {
  return h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, headers.map((t) => h('th', {}, t)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
}
export const banner = (kind, ...children) => h('div', { class: `banner banner-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, ...children);

// Giờ kết thúc dự kiến ("HH:MM") = giờ bắt đầu từ ô datetime-local ("2026-10-26T09:00") + số phút; '—' nếu thiếu dữ liệu (wireframe M2).
export function endTimeText(startLocal, minutes) {
  const m = /T(\d{2}):(\d{2})/.exec(startLocal || '');
  if (!m || !Number.isInteger(minutes)) return '—';
  const t = (Number(m[1]) * 60 + Number(m[2]) + minutes) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
