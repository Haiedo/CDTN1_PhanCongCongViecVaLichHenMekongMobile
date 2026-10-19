# API Contract – L4. Phân công kỹ thuật viên và lịch hẹn (Track SE)

Base URL: `/api/v1` · Định dạng: JSON · Xác thực (giả lập vì đăng nhập ngoài phạm vi): header `X-User`, `X-Role` (`MANAGER`, `TECHNICIAN`, `CUSTOMER`), `X-User-Code`; bản thật sẽ thay bằng `Authorization: Bearer <token>` · Thời gian: ISO 8601, múi giờ `+07:00`.
Dữ liệu mẫu dưới đây là dữ liệu giả lập của case study Mekong Mobile.

## 1. Danh sách endpoint (cho các story MUST)

| Phương thức | Đường dẫn | Mục đích | Story |
|-------------|-----------|----------|-------|
| GET | `/tickets/{ticket_code}/technician-suggestions` | Gợi ý kỹ thuật viên phù hợp cho phiếu bảo hành | US1 |
| POST | `/tickets/{ticket_code}/assignment` | Phân công kỹ thuật viên cho phiếu bảo hành | US2 |
| POST | `/appointments` | Đặt lịch hẹn giao – nhận máy (có kiểm tra trùng lịch) | US3 |
| GET | `/appointments` | Danh sách lịch hẹn; lọc `technician_code`, `ticket_code`; kỹ thuật viên chỉ thấy lịch của mình | US4 |
| GET | `/appointments/{appointment_code}` | Xem một lịch hẹn | US4, US5 |
| PATCH | `/appointments/{appointment_code}` | Đổi trạng thái (xác nhận: Chờ xác nhận → Đã xác nhận); chuyển sai trạng thái trả 409 | US6 |
| DELETE | `/appointments/{appointment_code}` | Hủy mềm (trạng thái CANCELLED, giải phóng khung giờ) | US3 |

Định dạng lỗi chung:
```json
{ "error": { "code": "APPOINTMENT_CONFLICT", "message": "Mô tả lỗi cho người dùng" } }
```

---

## 2. GET `/tickets/{ticket_code}/technician-suggestions`

Query: `limit` (tùy chọn, 1–20, mặc định 5).

**Response mẫu – 200**
```json
{
  "ticket_code": "T-2026-0042",
  "required_skill": "SCREEN_REPAIR",
  "service_area": "Quận 7",
  "suggestions": [
    { "technician_code": "TECH-003", "full_name": "Nguyễn Văn An", "skill_level": 3, "open_tickets": 2, "max_open_tickets": 8 },
    { "technician_code": "TECH-007", "full_name": "Trần Thị Bích", "skill_level": 2, "open_tickets": 4, "max_open_tickets": 8 }
  ]
}
```
Không có người phù hợp: vẫn trả 200 với `"suggestions": []`.

| Mã HTTP | Khi nào | `error.code` |
|---------|---------|--------------|
| 200 | Thành công (kể cả danh sách rỗng) | – |
| 400 | `limit` ngoài 1–20 hoặc `ticket_code` sai định dạng | `INVALID_PARAMETER` |
| 404 | Không tìm thấy phiếu | `TICKET_NOT_FOUND` |
| 409 | Phiếu không ở trạng thái *Chờ phân công* | `TICKET_NOT_WAITING` |

---

## 3. POST `/tickets/{ticket_code}/assignment`

**Request mẫu**
```json
{ "technician_code": "TECH-003", "note": "Khách cần xử lý trong tuần" }
```
**Response mẫu – 201**
```json
{
  "assignment_code": "ASG-0001",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "ticket_status": "ASSIGNED",
  "technician_open_tickets": 3,
  "assigned_at": "2026-10-05T08:15:00+07:00"
}
```

| Mã HTTP | Khi nào | `error.code` |
|---------|---------|--------------|
| 201 | Phân công thành công | – |
| 400 | Thiếu hoặc sai định dạng `technician_code`; `note` quá dài | `VALIDATION_ERROR` |
| 404 | Không tìm thấy phiếu hoặc kỹ thuật viên | `TICKET_NOT_FOUND`, `TECHNICIAN_NOT_FOUND` |
| 409 | Phiếu đã có người phụ trách | `TICKET_ALREADY_ASSIGNED` |
| 409 | Kỹ thuật viên đã đủ 8 phiếu mở | `TECHNICIAN_OVERLOADED` |
| 409 | Kỹ thuật viên thiếu tay nghề hoặc khác địa bàn | `TECHNICIAN_NOT_ELIGIBLE` |

**Quy tắc validation**

| Trường | Bắt buộc | Kiểu | Độ dài | Dải giá trị |
|--------|----------|------|--------|-------------|
| `ticket_code` (path) | Có | string | – | dạng `T-YYYY-NNNN` |
| `technician_code` | Có | string | – | dạng `TECH-NNN` |
| `note` | Không | string | 0–255 ký tự | – |

---

## 4. POST `/appointments`

**Request mẫu**
```json
{
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "type": "DROP_OFF",
  "start_at": "2026-10-06T09:00:00+07:00",
  "duration_minutes": 30
}
```
**Response mẫu – 201**
```json
{
  "appointment_code": "APT-0015",
  "ticket_code": "T-2026-0042",
  "technician_code": "TECH-003",
  "type": "DROP_OFF",
  "start_at": "2026-10-06T09:00:00+07:00",
  "end_at": "2026-10-06T09:30:00+07:00",
  "status": "PENDING_CONFIRMATION"
}
```
**Response mẫu – 409 (trùng lịch)**
```json
{
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "Kỹ thuật viên TECH-003 đã có lịch hẹn trong khung giờ này.",
    "conflicting_appointment": {
      "appointment_code": "APT-0012",
      "start_at": "2026-10-06T09:15:00+07:00",
      "end_at": "2026-10-06T09:45:00+07:00"
    }
  }
}
```

| Mã HTTP | Khi nào | `error.code` |
|---------|---------|--------------|
| 201 | Tạo lịch hẹn thành công | – |
| 400 | Thiếu trường, `type` sai, `duration_minutes` ngoài 15–120, `start_at` ở quá khứ hoặc ngoài 08:00–17:30 | `VALIDATION_ERROR` |
| 404 | Không tìm thấy phiếu hoặc kỹ thuật viên | `TICKET_NOT_FOUND`, `TECHNICIAN_NOT_FOUND` |
| 409 | Kỹ thuật viên trùng lịch | `APPOINTMENT_CONFLICT` |
| 409 | Kỹ thuật viên không phải người đang phụ trách phiếu | `TECHNICIAN_NOT_ASSIGNED` |

**Quy tắc validation**

| Trường | Bắt buộc | Kiểu | Độ dài | Dải giá trị |
|--------|----------|------|--------|-------------|
| `ticket_code` | Có | string | – | dạng `T-YYYY-NNNN` |
| `technician_code` | Có | string | – | dạng `TECH-NNN` |
| `type` | Có | enum | – | `DROP_OFF`, `PICK_UP` |
| `start_at` | Có | datetime ISO 8601 | – | tương lai; 08:00–17:30; thứ Hai–thứ Bảy |
| `duration_minutes` | Không (mặc định 30) | integer | – | 15–120; `start_at + duration` ≤ 17:30 |

---

## 5. Lỗi dùng chung cho mọi endpoint

| Mã HTTP | Khi nào |
|---------|---------|
| 401 | Thiếu hoặc hết hạn token |
| 403 | Không phải role `MANAGER` (NFR3) |

## 6. Truy vết endpoint ↔ User Story

| Endpoint | User Story | Yêu cầu |
|----------|-----------|---------|
| GET `/tickets/{ticket_code}/technician-suggestions` | US1 | FR1, NFR1 |
| POST `/tickets/{ticket_code}/assignment` | US2 | FR2, NFR2 |
| POST `/appointments` | US3 | FR4, FR5, NFR2 |
