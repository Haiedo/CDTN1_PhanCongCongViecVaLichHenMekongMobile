// Màn hình M3 – "Phiếu và lịch hẹn của tôi" cho kỹ thuật viên và khách hàng: hai tab Phiếu | Lịch hẹn (UC6–8, FR6–8).
// Phạm vi dữ liệu do SERVER quyết định (NFR3); màn hình chỉ hiển thị những gì API trả về.
import { h } from '../components/ui.js';
import { TicketListPage } from './TicketListPage.js';
import { AppointmentPage } from './AppointmentPage.js';

export function MyWorkPage(container, ctx, tab) {
  const tech = ctx.user.role === 'TECHNICIAN';
  const panel = h('div', {});
  const tabs = [['tickets', tech ? 'Phiếu được giao' : 'Phiếu của tôi', '#/tickets'], ['appointments', 'Lịch hẹn', '#/appointments']];
  container.replaceChildren(h('section', {},
    h('nav', { class: 'tabs', 'aria-label': 'Phiếu và lịch hẹn của tôi' },
      tabs.map(([id, label, href]) => h('a', { class: 'tab' + (id === tab ? ' active' : ''), href, 'aria-current': id === tab ? 'page' : null }, label))),
    panel,
    h('p', { class: 'hint' }, tech ? 'Bạn chỉ thấy phiếu và lịch hẹn của mình.'
      : 'Bạn chỉ thấy lịch hẹn của phiếu mình. Bấm Xác nhận để chốt lịch đang ở trạng thái Chờ xác nhận.')));
  const sub = { ...ctx, embedded: true };
  return tab === 'appointments' ? AppointmentPage(panel, sub) : TicketListPage(panel, sub);
}
