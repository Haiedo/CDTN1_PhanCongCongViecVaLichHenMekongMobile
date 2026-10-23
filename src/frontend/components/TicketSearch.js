// Ô "Mã phiếu bảo hành" + nút "Tìm phiếu" của wireframe M1. Chỉ kiểm tra định dạng rồi chuyển tới trang chi tiết; không gọi mạng.
import { h, banner } from './ui.js';

export function TicketSearch(current = '') {
  const input = h('input', { id: 'ticket-search', placeholder: 'T-2026-0042', value: current, maxlength: 20, 'aria-label': 'Mã phiếu bảo hành' });
  const msg = h('div', {});
  return h('form', { class: 'card search', onsubmit: (e) => {
    e.preventDefault();
    const code = input.value.trim().toUpperCase();
    if (!/^T-\d{4}-\d{4}$/.test(code)) { msg.replaceChildren(banner('error', 'Mã phiếu sai định dạng. Ví dụ đúng: T-2026-0042.')); return; }
    msg.replaceChildren();
    location.hash = `#/tickets/${code}`;
  } },
    h('label', { for: 'ticket-search' }, 'Mã phiếu bảo hành'),
    h('div', { class: 'search-row' }, input, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Tìm phiếu')), msg);
}
