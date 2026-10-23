// Khung ứng dụng: thanh điều hướng theo vai trò + bộ định tuyến theo #hash. Không chứa nghiệp vụ, không gọi mạng.
import { h } from './components/ui.js';
import { currentUser, logout } from './api/auth.api.js';
import { LoginPage } from './pages/LoginPage.js';
import { TicketListPage } from './pages/TicketListPage.js';
import { TicketDetailPage } from './pages/TicketDetailPage.js';
import { AppointmentPage } from './pages/AppointmentPage.js';
import { MyWorkPage } from './pages/MyWorkPage.js';

const ROLE = { MANAGER: 'Quản lý', TECHNICIAN: 'Kỹ thuật viên', CUSTOMER: 'Khách hàng' };
const nav = document.getElementById('nav');
const view = document.getElementById('view');
const navigate = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

function parse() {
  const [path, qs] = (location.hash.replace(/^#/, '') || '/').split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function renderNav(user) {
  nav.replaceChildren();
  if (!user) return;
  const mine = user.role !== 'MANAGER';
  nav.append(
    ...(mine ? [h('a', { href: '#/tickets' }, 'Phiếu và lịch hẹn của tôi')]
             : [h('a', { href: '#/tickets' }, 'Phiếu bảo hành'), h('a', { href: '#/appointments' }, 'Lịch hẹn')]),
    h('span', { class: 'who' }, `${user.full_name || user.name} · ${ROLE[user.role] || user.role}`),
    h('button', { class: 'btn', type: 'button', onclick: () => { logout(); navigate('#/login'); } }, 'Đăng xuất'));
}

function render() {
  const user = currentUser();
  const { path, query } = parse();
  renderNav(user);
  if (!user && path !== '/login') { location.hash = '#/login'; return; }   // chưa đăng nhập → về trang đăng nhập
  const ctx = { user, query, navigate };
  let m;
  if (path === '/login') return user ? navigate('#/tickets') : LoginPage(view, ctx);
  if (path === '/appointments') return user.role === 'MANAGER' ? AppointmentPage(view, ctx) : MyWorkPage(view, ctx, 'appointments');
  if ((m = /^\/tickets\/([^/]+)$/.exec(path))) return TicketDetailPage(view, { ...ctx, params: { code: decodeURIComponent(m[1]) } });
  if (path === '/tickets' || path === '/') return user.role === 'MANAGER' ? TicketListPage(view, ctx) : MyWorkPage(view, ctx, 'tickets');
  view.replaceChildren(h('p', { class: 'state state-empty' }, 'Không tìm thấy trang.'));
}
window.addEventListener('hashchange', render);
render();
