# Wireframe 3 màn hình – L4

Sơ đồ gốc: `docs/wireframe.drawio` · Ảnh xuất: `docs/export/wireframe.png`

![Wireframe M1, M2, M3](export/wireframe.png)

## 1. Trường hiển thị ↔ mô hình dữ liệu (phép 4)

| Màn hình | Trường trên wireframe | Bảng.cột |
|----------|----------------------|----------|
| M1 | Mã phiếu bảo hành | `ticket.ticket_code` |
| M1 | Khách hàng, số điện thoại | `customer.full_name`, `customer.phone` |
| M1 | Thiết bị, Tay nghề cần, Địa bàn, Trạng thái | `ticket.device_model`, `ticket.required_skill`, `ticket.service_area`, `ticket.status` |
| M1 | Kỹ thuật viên hiện tại | `technician.full_name` qua `ticket.technician_id` |
| M1 | Mã, Họ tên (bảng gợi ý) | `technician.technician_code`, `technician.full_name` |
| M1 | Cấp tay nghề | `technician_skill.skill_level` |
| M1 | Phiếu mở / tối đa | Đếm `ticket` theo `technician_id` và `status`; `technician.max_open_tickets` |
| M1 | Ghi chú, Lý do phân công lại | `ticket_assignment.note`, `ticket_assignment.reason` |
| M1 | Lịch sử: Thời điểm, Kỹ thuật viên, Hành động, Người thực hiện | `ticket_assignment.assigned_at`, `technician_id`, `action`, `assigned_by` |
| M2 | Mã phiếu bảo hành, Kỹ thuật viên phụ trách | `ticket.ticket_code`, `technician.technician_code`, `technician.full_name` |
| M2 | Loại lịch hẹn | `appointment.appt_type` |
| M2 | Ngày giờ bắt đầu, Kết thúc dự kiến | `appointment.start_at`, `appointment.end_at` |
| M2 | Thời lượng (phút) | Ô nhập; hệ thống tính `end_at = start_at + thời lượng`, không lưu cột riêng |
| M2 | Lịch hẹn đã có: Mã lịch, Bắt đầu, Kết thúc, Trạng thái | `appointment.appointment_code`, `start_at`, `end_at`, `status` |
| M3 | Phiếu được giao: Mã phiếu, Khách hàng, Thiết bị, Trạng thái | `ticket.ticket_code`, `customer.full_name`, `ticket.device_model`, `ticket.status` |
| M3 | Lịch hẹn: Mã lịch, Loại, Bắt đầu, Kết thúc, Trạng thái | `appointment.appointment_code`, `appt_type`, `start_at`, `end_at`, `status` |
| M3 | Nút Xác nhận | Cập nhật `appointment.status` |

## 2. Bảng ↔ màn hình (chiều ngược lại của phép 4)

| Bảng | Xuất hiện ở |
|------|-------------|
| `customer` | M1, M3 |
| `technician` | M1, M2 |
| `technician_skill` | M1 |
| `ticket` | M1, M3 |
| `ticket_assignment` | M1 (khung Lịch sử phân công) |
| `appointment` | M2, M3 |

## 3. Luồng ngoại lệ ↔ chỗ hiển thị thông báo (phép 6)

| Luồng ngoại lệ | Nội dung thông báo | Vị trí |
|----------------|-------------------|--------|
| UC2 – 1a | Phiếu đã có kỹ thuật viên phụ trách, dùng Phân công lại | M1, dưới ô Mã phiếu |
| UC2 – 2a | Không có kỹ thuật viên phù hợp | M1, dưới bảng gợi ý |
| UC2 – 4a | Kỹ thuật viên vừa đủ 8 phiếu, danh sách đã làm mới | M1, dưới bảng gợi ý |
| UC2 – 4b | Kỹ thuật viên không còn đủ tay nghề hoặc địa bàn | M1, cùng khung với 4a |
| API 400 | Giờ hẹn ngoài khoảng cho phép hoặc thời lượng sai | M2, dưới ô Thời lượng |
| API 409 `APPOINTMENT_CONFLICT` | Kỹ thuật viên đã có lịch trong khung giờ, kèm nút Chọn giờ khác | M2, trên nút Đặt lịch hẹn |
| API 409 `TECHNICIAN_NOT_ASSIGNED` | Kỹ thuật viên không phụ trách phiếu | M2, dưới ô Kỹ thuật viên phụ trách |
