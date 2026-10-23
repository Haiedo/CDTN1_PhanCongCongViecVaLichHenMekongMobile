// Danh sách phiếu bảo hành (GET /tickets).
// Quản lý (M1): tìm phiếu theo mã + bảng đủ cột, lọc trạng thái. Kỹ thuật viên và khách (M3, tab Phiếu): bảng 4 cột theo wireframe.
import { h, table, ticketBadge, SKILL, TICKET_STATUS } from '../components/ui.js';
import { mountDataState } from '../components/DataState.js';
import { TicketSearch } from '../components/TicketSearch.js';
import { listTickets } from '../api/ticket.api.js';

export function TicketListPage(container, { user, embedded = false }) {
  const manager = user.role === 'MANAGER';
  const body = h('div', {});
  let box = h('div', {}); body.append(box);
  const select = h('select', { id: 'status-filter', 'aria-label': 'Lọc theo trạng thái', onchange: () => load(select.value) },
    h('option', { value: '' }, 'Tất cả trạng thái'),
    Object.entries(TICKET_STATUS).map(([v, t]) => h('option', { value: v }, t)));
  // Thao tác theo trạng thái: Chờ phân công → Phân công; Đã phân công → Đặt lịch, Phân công lại
  const actions = (t) => h('span', { class: 'actions' },
    t.status === 'WAITING_ASSIGNMENT' ? h('a', { class: 'btn btn-primary btn-sm', href: `#/tickets/${t.ticket_code}` }, 'Phân công') : null,
    t.status === 'ASSIGNED' ? [h('a', { class: 'btn btn-primary btn-sm', href: `#/appointments?ticket=${t.ticket_code}` }, 'Đặt lịch'),
                               h('a', { class: 'btn btn-sm', href: `#/tickets/${t.ticket_code}` }, 'Phân công lại')] : null);
  const summary = (rows) => {
    const w = rows.filter((t) => t.status === 'WAITING_ASSIGNMENT').length;
    return h('p', { class: 'hint' }, w ? `Có ${w} phiếu đang chờ phân công. Bấm Phân công ở dòng tương ứng.`
      : 'Không còn phiếu chờ phân công. Với phiếu đã phân công, bạn có thể Đặt lịch hẹn hoặc Phân công lại.');
  };
  const link = (t) => h('a', { href: `#/tickets/${t.ticket_code}` }, t.ticket_code);
  const emptyMine = user.role === 'TECHNICIAN' ? 'Chưa có phiếu nào được giao.' : 'Bạn chưa có phiếu nào.';
  function load(status) {
    const fresh = h('div', {}); box.replaceWith(fresh); box = fresh;
    mountDataState(box, {
      load: () => listTickets(status),
      emptyText: status ? 'Không có phiếu nào ở trạng thái này.' : (manager ? 'Chưa có phiếu bảo hành nào.' : emptyMine),
      render: (el, rows) => { if (manager && !status) el.append(summary(rows)); el.append(manager
        ? table(['Mã phiếu', 'Khách hàng', 'Thiết bị', 'Tay nghề cần', 'Địa bàn', 'Trạng thái', 'Kỹ thuật viên', 'Thao tác'],
            rows.map((t) => [link(t), t.customer.full_name, t.device_model, SKILL[t.required_skill] || t.required_skill, t.service_area,
              ticketBadge(t.status), t.technician ? `${t.technician.technician_code} · ${t.technician.full_name}` : '—',
              actions(t)]))
        : table(['Mã phiếu', 'Khách hàng', 'Thiết bị', 'Trạng thái'],
            rows.map((t) => [link(t), t.customer.full_name, t.device_model, ticketBadge(t.status)]))); }
    });
  }
  container.replaceChildren(h('section', {},
    manager ? TicketSearch() : null,
    manager ? h('div', { class: 'page-head' }, h('h2', {}, 'Phiếu bảo hành'),
      h('label', { class: 'inline', for: 'status-filter' }, 'Trạng thái ', select)) : null,
    body));
  load('');
}
