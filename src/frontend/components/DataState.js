// Thành phần DataState: bọc MỌI chỗ hiển thị dữ liệu từ API để luôn xử lý đủ ba trạng thái
//   ĐANG TẢI  → chữ "Đang tải…"
//   RỖNG      → câu giải thích (vd "Chưa có phiếu nào") thay vì bảng trống
//   LỖI       → thông báo + nút "Thử lại" (backend tắt, 401, 500…)
import { h } from './ui.js';

export function mountDataState(container, { load, render, isEmpty = (d) => Array.isArray(d) && d.length === 0,
                                            emptyText = 'Chưa có dữ liệu.' }) {
  let seq = 0;                                   // bỏ qua kết quả của lần tải cũ nếu người dùng bấm "Thử lại" nhiều lần
  async function run() {
    const mine = ++seq;
    container.replaceChildren(h('p', { class: 'state state-loading', role: 'status' }, 'Đang tải…'));
    try {
      const data = await load();
      if (mine !== seq) return;
      if (isEmpty(data)) { container.replaceChildren(h('p', { class: 'state state-empty' }, emptyText)); return; }
      container.replaceChildren();
      render(container, data);
    } catch (err) {
      if (mine !== seq) return;
      container.replaceChildren(h('div', { class: 'state state-error', role: 'alert' },
        h('p', {}, err.message || 'Đã xảy ra lỗi.'),
        h('button', { class: 'btn', type: 'button', onclick: run }, 'Thử lại')));
    }
  }
  run();
  return { reload: run };
}
