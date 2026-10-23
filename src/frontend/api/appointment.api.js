// Nghiệp vụ lịch hẹn: danh sách, tạo, xác nhận, hủy (US3, US5, US6).
import { getClient } from './client.js';

// params: { technician_code, ticket_code, status } – lọc phía server (api-contract.md mục 1)
export const listAppointments = async (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return (await getClient().get('/appointments' + (qs ? `?${qs}` : ''))).data;
};
export const createAppointment = (input) => getClient().post('/appointments', input);
export const confirmAppointment = (code) => getClient().patch(`/appointments/${encodeURIComponent(code)}`, { status: 'CONFIRMED' });
export const cancelAppointment = (code) => getClient().del(`/appointments/${encodeURIComponent(code)}`);
