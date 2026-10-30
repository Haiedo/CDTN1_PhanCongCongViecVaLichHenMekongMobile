// Màn hình – CHI TIẾT phiếu (GET /tickets/{mã}) + gợi ý và phân công kỹ thuật viên (wireframe M1: UC1, UC2).
// Bố cục theo M1: tìm phiếu → thông tin phiếu → kỹ thuật viên gợi ý → ghi chú → (phân công lại) → lịch sử phân công.
import { h, table, ticketBadge, banner, fmtTime, SKILL, TICKET_STATUS } from '../components/ui.js';
import { mountDataState } from '../components/DataState.js';
import { TicketSearch } from '../components/TicketSearch.js';
import { getTicket, getSuggestions, assignTechnician, reassignTechnician } from '../api/ticket.api.js';

export function TicketDetailPage(container, { user, params }) {
  const code = params.code;
  const holder = h('div', {});
  container.replaceChildren(h('section', {},
    user.role === 'MANAGER' ? TicketSearch(code) : h('p', {}, h('a', { href: '#/tickets' }, '← Quay lại')), holder));
  mountDataState(holder, { load: () => getTicket(code), isEmpty: () => false, render: (el, t) => renderTicket(el, t) });

  function renderTicket(el, t) {
    const notice = h('div', {});
    el.append(h('div', { class: 'card' },
      h('h2', {}, `Phiếu ${t.ticket_code} `, ticketBadge(t.status)),
      h('dl', { class: 'kv' },
        h('dt', {}, 'Khách hàng'), h('dd', {}, `${t.customer.full_name} · ${t.customer.phone}`),
        h('dt', {}, 'Thiết bị'), h('dd', {}, t.device_model),
        h('dt', {}, 'Tay nghề cần'), h('dd', {}, SKILL[t.required_skill] || t.required_skill),
        h('dt', {}, 'Địa bàn'), h('dd', {}, t.service_area),
        h('dt', {}, 'Kỹ thuật viên hiện tại'), h('dd', {}, t.technician ? `${t.technician.technician_code} · ${t.technician.full_name}` : '(chưa có)'),
        h('dt', {}, 'Tiếp nhận'), h('dd', {}, fmtTime(t.created_at)))));

    if (user.role === 'MANAGER' && t.status === 'WAITING_ASSIGNMENT') {
      const note = h('input', { id: 'assign-note', maxlength: 255, placeholder: 'Khách cần xử lý trong tuần' });
      const box = h('div', {});
      const refresh = () => state.reload();
      let state;
      el.append(h('div', { class: 'card' }, h('h3', {}, 'Kỹ thuật viên gợi ý'),
        h('p', { class: 'hint' }, 'Đúng tay nghề và địa bàn, ít phiếu đang mở xếp trước; tối đa 8 phiếu mở.'), box,
        h('div', { class: 'form' }, h('label', { for: 'assign-note' }, 'Ghi chú (≤ 255 ký tự)'), note)), notice);
      state = mountDataState(box, {
        load: async () => (await getSuggestions(code)).suggestions,
        emptyText: `Không có kỹ thuật viên phù hợp trong địa bàn ${t.service_area}.`,
        render: (b, rows) => b.append(table(['Mã', 'Họ tên', 'Cấp tay nghề', 'Phiếu mở / tối đa', ''],
          rows.map((s) => [s.technician_code, s.full_name, s.skill_level, `${s.open_tickets} / ${s.max_open_tickets}`,
            h('button', { class: 'btn btn-primary btn-sm', type: 'button',
              onclick: (e) => assign(e.target, s.technician_code, note.value.trim(), notice, refresh) }, 'Phân công')])))
      });
    }
    if (user.role === 'MANAGER' && t.status !== 'WAITING_ASSIGNMENT') {
      // [1a] Phiếu đã có kỹ thuật viên: không phân công lần đầu nữa; dùng Phân công lại (FR3, UC5)
      el.append(banner('info', t.status === 'ASSIGNED'
        ? `Phiếu ${t.ticket_code} đã có kỹ thuật viên phụ trách. Muốn đổi người, dùng chức năng Phân công lại bên dưới.`
        : `Phiếu ${t.ticket_code} đang ở trạng thái ${TICKET_STATUS[t.status] || t.status}, không phân công lại được.`));
      if (t.status === 'ASSIGNED' && t.technician) {
        const reason = h('input', { id: 'reassign-reason', maxlength: 255, placeholder: 'Kỹ thuật viên nghỉ đột xuất' });
        const box = h('div', {}); const rnotice = h('div', {});
        let state;
        el.append(h('div', { class: 'card' }, h('h3', {}, 'Phân công lại'),
          h('p', { class: 'hint' }, 'Chọn kỹ thuật viên mới (đúng tay nghề, địa bàn, còn dưới 8 phiếu mở). Lịch hẹn chưa diễn ra của phiếu sẽ chuyển theo người mới.'),
          box, h('div', { class: 'form' }, h('label', { for: 'reassign-reason' }, 'Lý do phân công lại (bắt buộc)'), reason), rnotice));
        state = mountDataState(box, {
          load: async () => (await getSuggestions(code, 5, 'reassign')).suggestions,
          emptyText: 'Không có kỹ thuật viên khác phù hợp để chuyển phiếu.',
          render: (b, rows) => b.append(table(['Mã', 'Họ tên', 'Cấp tay nghề', 'Phiếu mở / tối đa', ''],
            rows.map((s) => [s.technician_code, s.full_name, s.skill_level, `${s.open_tickets} / ${s.max_open_tickets}`,
              h('button', { class: 'btn btn-primary btn-sm', type: 'button',
                onclick: (e) => reassign(e.target, s.technician_code, reason, rnotice, () => state.reload()) }, 'Phân công lại')])))
        });
        el.append(h('p', {}, h('a', { class: 'btn btn-primary', href: `#/appointments?ticket=${t.ticket_code}` }, 'Đặt lịch hẹn cho phiếu này')));
      }
    }
    el.append(h('div', { class: 'card' }, h('h3', {}, 'Lịch sử phân công'),
      t.assignments.length === 0 ? h('p', { class: 'state state-empty' }, 'Chưa có lịch sử phân công.')
        : table(['Thời điểm', 'Kỹ thuật viên', 'Hành động', 'Người thực hiện', 'Ghi chú'],
            t.assignments.map((a) => [fmtTime(a.assigned_at), a.technician_code, a.action, a.assigned_by, a.note || a.reason || '—']))));
  }

  async function assign(btn, techCode, note, notice, refresh) {
    btn.disabled = true; notice.replaceChildren();
    try {
      await assignTechnician(code, techCode, note);
      TicketDetailPage(container, { user, params });                 // tải lại để thấy trạng thái và lịch sử mới
      container.firstChild.prepend(banner('ok', `Đã phân công ${techCode} cho ${code}. Trạng thái: Đã phân công.`));
    } catch (err) {
      btn.disabled = false;
      if (err.code === 'TECHNICIAN_OVERLOADED' || err.code === 'TECHNICIAN_NOT_ELIGIBLE') {   // [4a][4b]
        notice.replaceChildren(banner('error', `${err.message} Danh sách gợi ý đã được làm mới.`));
        refresh();
      } else notice.replaceChildren(banner('error', err.message));
    }
  }

  async function reassign(btn, techCode, reasonInput, notice, refresh) {
    notice.replaceChildren();
    const reason = reasonInput.value.trim();
    if (!reason) { notice.replaceChildren(banner('error', 'Vui lòng nhập lý do phân công lại.')); reasonInput.focus(); return; }
    btn.disabled = true;
    try {
      const r = await reassignTechnician(code, techCode, reason);
      TicketDetailPage(container, { user, params });
      container.firstChild.prepend(banner('ok', `Đã chuyển phiếu ${code} sang ${techCode}. Lịch hẹn chuyển theo: ${r.moved_appointments}.`));
    } catch (err) {
      btn.disabled = false;
      notice.replaceChildren(banner('error', err.message));
      if (['TECHNICIAN_OVERLOADED', 'TECHNICIAN_NOT_ELIGIBLE'].includes(err.code)) refresh();
    }
  }
}
