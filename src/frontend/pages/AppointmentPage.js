// Màn hình – LỊCH HẸN. Quản lý: biểu mẫu đặt lịch (wireframe M2: UC3, UC4) + danh sách. Kỹ thuật viên, khách: tab Lịch hẹn của M3 (UC7, UC8).
import { h, table, apptBadge, banner, fmtTime, endTimeText, APPT_TYPE } from '../components/ui.js';
import { mountDataState } from '../components/DataState.js';
import { listAppointments, createAppointment, confirmAppointment, cancelAppointment } from '../api/appointment.api.js';
import { getTicket } from '../api/ticket.api.js';

export function AppointmentPage(container, { user, query, embedded = false }) {
  const manager = user.role === 'MANAGER';
  const listBox = h('div', {});
  let state = null;
  let refreshDay = () => {};
  const notice = h('div', {});
  const reload = () => { state.reload(); refreshDay(); };

  async function act(btn, fn, okText) {
    btn.disabled = true; notice.replaceChildren();
    try { await fn(); notice.replaceChildren(banner('ok', okText)); reload(); }
    catch (err) { btn.disabled = false; notice.replaceChildren(banner('error', err.message)); }
  }

  function form() {
    let techCode = '';
    const ticket = h('input', { id: 'ticket', required: true, placeholder: 'T-2026-0044', value: query.ticket || '', maxlength: 20 });
    const tech = h('input', { id: 'tech', readonly: true, placeholder: '(tự điền sau khi tìm phiếu)', 'aria-readonly': 'true' });
    const radios = Object.entries(APPT_TYPE).map(([v, t], i) =>
      h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'type', value: v, checked: i === 0 }), ` ${t} (${v})`));
    const start = h('input', { id: 'start', type: 'datetime-local', required: true });
    const dur = h('input', { id: 'dur', type: 'number', min: 15, max: 120, step: 1, value: 30, required: true });
    const end = h('span', { class: 'end-preview', id: 'end-preview' }, '—');
    const submit = h('button', { class: 'btn btn-primary btn-wide', type: 'submit' }, 'Đặt lịch hẹn');
    const result = h('div', {});
    const dayBox = h('div', { class: 'card' });
    const typeValue = () => form_el.querySelector('input[name=type]:checked').value;
    const updateEnd = () => { end.textContent = endTimeText(start.value, Number(dur.value)); };

    // Tìm phiếu → tự điền kỹ thuật viên đang phụ trách (BR-07: chỉ đặt lịch với người phụ trách phiếu)
    async function lookup() {
      result.replaceChildren(); techCode = ''; tech.value = '';
      const code = ticket.value.trim().toUpperCase(); ticket.value = code;
      if (!/^T-\d{4}-\d{4}$/.test(code)) { result.replaceChildren(banner('error', 'Mã phiếu sai định dạng. Ví dụ đúng: T-2026-0042.')); refreshDay(); return false; }
      try {
        const t = await getTicket(code);
        if (!t.technician) { result.replaceChildren(banner('error', `Phiếu ${code} chưa có kỹ thuật viên phụ trách. Hãy phân công trước khi đặt lịch.`)); refreshDay(); return false; }
        techCode = t.technician.technician_code;
        tech.value = `${techCode} · ${t.technician.full_name}`;
        refreshDay();
        return true;
      } catch (err) { result.replaceChildren(banner('error', err.message)); refreshDay(); return false; }
    }

    refreshDay = () => {
      const date = start.value.slice(0, 10);
      dayBox.replaceChildren();
      if (!techCode || !date) { dayBox.append(h('p', { class: 'hint' }, 'Chọn phiếu và ngày bắt đầu để xem lịch đã có của kỹ thuật viên.')); return; }
      dayBox.append(h('h3', {}, `Lịch hẹn đã có của ${techCode} trong ngày`));
      const inner = h('div', {}); dayBox.append(inner);
      mountDataState(inner, {
        load: async () => (await listAppointments({ technician_code: techCode }))
          .filter((a) => a.status !== 'CANCELLED' && a.start_at.slice(0, 10) === date),
        emptyText: 'Kỹ thuật viên chưa có lịch hẹn nào trong ngày này.',
        render: (el, rows) => el.append(table(['Mã lịch', 'Bắt đầu', 'Kết thúc', 'Trạng thái'],
          rows.map((a) => [a.appointment_code, fmtTime(a.start_at).slice(-5), fmtTime(a.end_at).slice(-5), apptBadge(a.status)])))
      });
    };

    const form_el = h('form', { class: 'card form stack', onsubmit: async (e) => {
      e.preventDefault(); submit.disabled = true; result.replaceChildren();
      try {
        if (!techCode && !(await lookup())) return;
        const a = await createAppointment({ ticket_code: ticket.value.trim(), technician_code: techCode, type: typeValue(),
          start_at: `${start.value}:00+07:00`, duration_minutes: Number(dur.value) });
        result.replaceChildren(banner('ok', `Đã tạo lịch hẹn ${a.appointment_code} · ${fmtTime(a.start_at)}–${fmtTime(a.end_at).slice(-5)} · Trạng thái: Chờ xác nhận.`));
        reload();
      } catch (err) {
        const c = err.extra && err.extra.conflicting_appointment;       // 409 trùng lịch: nêu rõ lịch đang chiếm khung giờ
        const items = [banner('error', err.message, c ? ` (${c.appointment_code}: ${fmtTime(c.start_at).slice(-5)}–${fmtTime(c.end_at).slice(-5)}). Vui lòng chọn khung giờ khác.` : '')];
        if (err.code === 'APPOINTMENT_CONFLICT')
          items.push(h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { result.replaceChildren(); start.focus(); } }, 'Chọn giờ khác'));
        result.replaceChildren(...items);
        refreshDay();
      } finally { submit.disabled = false; }
    } },
      h('h3', {}, 'Đặt lịch hẹn giao – nhận máy'),
      h('div', {}, h('label', { for: 'ticket' }, 'Mã phiếu bảo hành'),
        h('div', { class: 'search-row' }, ticket, h('button', { class: 'btn', type: 'button', id: 'lookup', onclick: lookup }, 'Tìm phiếu'))),
      h('label', { for: 'tech' }, 'Kỹ thuật viên phụ trách'), tech,
      h('div', {}, h('label', {}, 'Loại lịch hẹn'), h('div', { class: 'radio-row' }, radios)),
      h('label', { for: 'start' }, 'Ngày giờ bắt đầu (08:00–17:30, thứ Hai – thứ Bảy)'), start,
      h('label', { for: 'dur' }, 'Thời lượng (phút, 15–120)'), dur,
      h('div', {}, h('span', {}, 'Kết thúc dự kiến: '), end),
      submit, result);
    start.addEventListener('input', () => { updateEnd(); refreshDay(); });
    dur.addEventListener('input', updateEnd);
    ticket.addEventListener('change', () => { techCode = ''; tech.value = ''; });
    if (ticket.value) lookup();
    refreshDay();
    return [form_el, dayBox];
  }

  const head = embedded ? null : h('div', { class: 'page-head' }, h('h2', {}, manager ? 'Lịch hẹn' : 'Lịch hẹn của tôi'));
  container.replaceChildren(h('section', {}, head, manager ? h('div', { class: 'split' }, ...form()) : null, notice, manager ? h('h3', {}, 'Tất cả lịch hẹn') : null, listBox));
  state = mountDataState(listBox, {
    load: () => listAppointments(),
    emptyText: user.role === 'TECHNICIAN' ? 'Chưa có lịch hẹn nào.' : 'Chưa có lịch hẹn nào.',
    render: (el, rows) => el.append(table(
      manager ? ['Mã lịch', 'Phiếu', 'Kỹ thuật viên', 'Loại', 'Bắt đầu', 'Kết thúc', 'Trạng thái', '']
              : ['Mã lịch', 'Loại', 'Bắt đầu', 'Kết thúc', 'Trạng thái', ''],
      rows.map((a) => {
        const act1 = h('span', { class: 'actions' },
          a.status === 'PENDING_CONFIRMATION' && user.role !== 'TECHNICIAN'
            ? h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: (e) => act(e.target, () => confirmAppointment(a.appointment_code), `Đã xác nhận lịch hẹn ${a.appointment_code}.`) }, 'Xác nhận') : null,
          a.status !== 'CANCELLED' && manager
            ? h('button', { class: 'btn btn-sm', type: 'button', onclick: (e) => act(e.target, () => cancelAppointment(a.appointment_code), `Đã hủy lịch hẹn ${a.appointment_code}.`) }, 'Hủy') : null);
        const times = [fmtTime(a.start_at), fmtTime(a.end_at).slice(-5), apptBadge(a.status), act1];
        return manager ? [a.appointment_code, a.ticket_code, a.technician_code, APPT_TYPE[a.type] || a.type, ...times]
                       : [a.appointment_code, APPT_TYPE[a.type] || a.type, ...times];
      })))
  });
}
