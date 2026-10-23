// Màn hình đăng nhập → POST /auth/login. Sai mật khẩu hiện lỗi ngay tại form; thành công về danh sách phiếu.
import { h, banner } from '../components/ui.js';
import { login } from '../api/auth.api.js';

const DEMO = [['quanly01', 'Quản lý trung tâm'], ['ktv.an', 'Kỹ thuật viên TECH-003'], ['ktv.bich', 'Kỹ thuật viên TECH-007'], ['khach01', 'Khách hàng Lê Minh Châu']];

export function LoginPage(container, { navigate }) {
  const msg = h('div', {});
  let flash = null;
  try { flash = sessionStorage.getItem('mekong.flash'); sessionStorage.removeItem('mekong.flash'); } catch { /* bỏ qua */ }
  if (flash) msg.append(banner('warn', flash));
  const user = h('input', { id: 'username', name: 'username', autocomplete: 'username', required: true, value: 'quanly01' });
  const pass = h('input', { id: 'password', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Đăng nhập');
  const form = h('form', { class: 'card form', onsubmit: async (e) => {
    e.preventDefault();
    submit.disabled = true; msg.replaceChildren();
    try { await login(user.value.trim(), pass.value); navigate('#/tickets'); }
    catch (err) { msg.replaceChildren(banner('error', err.message)); submit.disabled = false; }
  } },
    h('h2', {}, 'Đăng nhập'),
    h('label', { for: 'username' }, 'Tên đăng nhập'), user,
    h('label', { for: 'password' }, 'Mật khẩu'), pass,
    submit,
    h('p', { class: 'hint' }, 'Tài khoản demo (mật khẩu chung: demo123):'),
    h('div', { class: 'chips' }, DEMO.map(([name, label]) =>
      h('button', { type: 'button', class: 'chip', onclick: () => { user.value = name; pass.value = 'demo123'; } }, `${name} · ${label}`))));
  container.replaceChildren(h('section', { class: 'narrow' }, msg, form));
}
