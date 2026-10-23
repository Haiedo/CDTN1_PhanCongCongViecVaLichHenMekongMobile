// Nghiệp vụ phiếu bảo hành: danh sách, chi tiết, gợi ý và phân công kỹ thuật viên (US1, US2, US4, US5).
// Hợp đồng dữ liệu: docs/api-contract.md. Tên trường giữ nguyên dạng snake_case của backend, không đổi tên ở đây.
import { getClient } from './client.js';

export const listTickets = async (status) =>
  (await getClient().get('/tickets' + (status ? `?status=${encodeURIComponent(status)}` : ''))).data;
export const getTicket = (code) => getClient().get(`/tickets/${encodeURIComponent(code)}`);
// purpose: 'assign' (phiếu Chờ phân công) hoặc 'reassign' (phiếu Đã phân công, loại người đang phụ trách)
export const getSuggestions = (code, limit = 5, purpose = 'assign') =>
  getClient().get(`/tickets/${encodeURIComponent(code)}/technician-suggestions?limit=${limit}&purpose=${purpose}`);
export const assignTechnician = (code, technicianCode, note) =>
  getClient().post(`/tickets/${encodeURIComponent(code)}/assignment`,
    note ? { technician_code: technicianCode, note } : { technician_code: technicianCode });
// FR3: phân công lại, lý do bắt buộc
export const reassignTechnician = (code, technicianCode, reason) =>
  getClient().post(`/tickets/${encodeURIComponent(code)}/reassignment`, { technician_code: technicianCode, reason });
