# SRS rút gọn – L4. Phân công kỹ thuật viên và lịch hẹn
Case study Smart CRM – Mekong Mobile · Phiên bản 1.0 · Track SE

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu đặc tả yêu cầu cho luồng **phân công kỹ thuật viên cho phiếu bảo hành** và **đặt lịch hẹn giao – nhận máy**, làm cơ sở thiết kế và kiểm thử.

### 1.2 Phạm vi
Thuộc phạm vi: gợi ý và phân công kỹ thuật viên, phân công lại, đặt lịch hẹn, kiểm tra trùng lịch, xem và xác nhận lịch hẹn, nhắc lịch.
Ngoài phạm vi: tạo phiếu bảo hành (đã có ở L2), thanh toán, tự động phân công hoàn toàn (US9 – WON'T).

### 1.3 Bảng thuật ngữ (dùng thống nhất trong SRS, sơ đồ, API)

| Thuật ngữ trong tài liệu | Tên dữ liệu / API | Định nghĩa |
|---|---|---|
| Phiếu bảo hành | `ticket` | Yêu cầu bảo hành – sửa chữa của khách hàng cho một thiết bị. |
| Kỹ thuật viên | `technician` | Nhân sự sửa chữa của trung tâm. |
| Tay nghề | `technician_skill` | Kỹ năng và cấp độ (1–3) của một kỹ thuật viên. |
| Địa điểm | `service_area` | Quận/huyện kỹ thuật viên phụ trách. |
| Khối lượng công việc | `open_tickets` | Số phiếu bảo hành đang mở của kỹ thuật viên. |
| Lịch hẹn | `appointment` | Cuộc hẹn khách giao máy (`DROP_OFF`) hoặc nhận máy (`PICK_UP`). |
| Quản lý trung tâm | role `MANAGER` | Người phân công và đặt lịch. |

---

## 2. Mô tả tổng quan

### 2.1 Tác nhân (actor)
Quản lý trung tâm, Kỹ thuật viên, Khách hàng, Cổng SMS (hệ thống ngoài gửi tin nhắc).

### 2.2 Sơ đồ use case
Xem `docs/diagrams/usecase-diagram-L4.drawio` (9 use case, 4 actor, có ranh giới hệ thống và chú thích).

| Mã | Use case |
|----|----------|
| UC1 | Gợi ý kỹ thuật viên cho phiếu |
| UC2 | Phân công kỹ thuật viên |
| UC3 | Đặt lịch hẹn giao – nhận máy |
| UC4 | Kiểm tra trùng lịch |
| UC5 | Phân công lại kỹ thuật viên |
| UC6 | Xem phiếu được giao |
| UC7 | Xem lịch hẹn |
| UC8 | Xác nhận lịch hẹn |
| UC9 | Gửi nhắc lịch hẹn |

### 2.3 Quy tắc nghiệp vụ

| Mã | Quy tắc |
|----|---------|
| BR-01 | Kỹ thuật viên chỉ đủ điều kiện nếu có **kỹ thuật** khớp loại lỗi của phiếu. |
| BR-02 | Kỹ thuật viên chỉ đủ điều kiện nếu **địa điểm** trùng địa điểm của phiếu. |
| BR-03 | Kỹ thuật viên có **từ 8 phiếu mở trở lên** thì không được nhận thêm. |
| BR-04 | Một phiếu chỉ có **một** kỹ thuật viên phụ trách tại một thời điểm. |
| BR-05 | Hai lịch hẹn của **cùng một kỹ thuật viên** không được chồng thời gian. |
| BR-06 | Lịch hẹn nằm trong giờ làm việc 08:00–17:30, thời lượng 15–120 phút, bắt đầu ở tương lai. |
| BR-07 | Chỉ kỹ thuật viên **đang phụ trách phiếu** mới được đặt lịch hẹn cho phiếu đó. |

### 2.4 Giả định
Dữ liệu phiếu, kỹ thuật viên và tay nghề đã có từ L2. Mỗi phiếu có một loại lỗi map được sang một tay nghề.

---

## 3. Yêu cầu chức năng

| Mã | Yêu cầu | MoSCoW |
|----|---------|--------|
| FR-01 | Hệ thống trả danh sách kỹ thuật viên đủ điều kiện (BR-01, 02, 03) cho một phiếu ở trạng thái *Chờ phân công*, xếp theo số phiếu mở tăng dần; nếu bằng nhau thì ưu tiên cấp tay nghề cao hơn. | MUST |
| FR-02 | Hệ thống gán một kỹ thuật viên cho phiếu, đổi trạng thái sang *Đã phân công*, tăng khối lượng công việc và ghi lịch sử (thực thi BR-03, BR-04). | MUST |
| FR-03 | Hệ thống cho phép chuyển phiếu đang *Đã phân công* sang kỹ thuật viên khác kèm lý do bắt buộc; lịch hẹn chưa diễn ra của phiếu được gắn cho người mới nếu không trùng lịch. | SHOULD |
| FR-04 | Hệ thống tạo lịch hẹn giao hoặc nhận máy với trạng thái *Chờ xác nhận* (thực thi BR-06, BR-07). | MUST |
| FR-05 | Trước khi tạo lịch hẹn, hệ thống kiểm tra trùng lịch của kỹ thuật viên (BR-05) và từ chối nếu trùng, nêu rõ lịch xung đột. | MUST |
| FR-06 | Kỹ thuật viên xem được danh sách phiếu và lịch hẹn của riêng mình. | SHOULD |
| FR-07 | Khách hàng xem được lịch hẹn của phiếu bảo hành của chính mình. | SHOULD |
| FR-08 | Khách hàng xác nhận lịch hẹn, trạng thái chuyển sang *Đã xác nhận*. | SHOULD |
| FR-09 | Hệ thống gửi tin nhắc cho khách hàng trước giờ hẹn 2 giờ qua cổng SMS. | COULD |

### 3.1 Đặc tả chi tiết use case quan trọng nhất – UC2 Phân công kỹ thuật viên

| Mục | Nội dung |
|-----|----------|
| Actor chính | Quản lý trung tâm |
| Mục tiêu | Giao một phiếu bảo hành cho đúng kỹ thuật viên. |
| Điều kiện trước | Quản lý đã đăng nhập (role `MANAGER`); phiếu tồn tại và ở trạng thái *Chờ phân công*. |
| Điều kiện sau (thành công) | Phiếu ở trạng thái *Đã phân công* có đúng một kỹ thuật viên; khối lượng công việc của kỹ thuật viên tăng 1; lịch sử phân công được ghi. |
| Điều kiện sau (thất bại) | Phiếu và dữ liệu kỹ thuật viên không thay đổi. |

**Luồng chính**

| Bước | Hành động |
|------|-----------|
| 1 | Quản lý chọn một phiếu ở trạng thái *Chờ phân công*. |
| 2 | Hệ thống thực hiện UC1 và hiển thị danh sách kỹ thuật viên gợi ý. |
| 3 | Quản lý chọn một kỹ thuật viên trong danh sách. |
| 4 | Hệ thống kiểm tra lại tay nghề, Địa điểm và khối lượng công việc của kỹ thuật viên được chọn. |
| 5 | Hệ thống gán kỹ thuật viên cho phiếu, đổi trạng thái sang *Đã phân công*, ghi lịch sử. |
| 6 | Hệ thống thông báo kết quả cho quản lý. |

**Luồng ngoại lệ (đánh số theo bước)**

| Mã | Tại bước | Điều kiện | Xử lý |
|----|----------|-----------|-------|
| 1a | 1 | Phiếu đã có kỹ thuật viên phụ trách. | Hệ thống từ chối, hướng dẫn dùng UC5 (phân công lại). Use case kết thúc. |
| 2a | 2 | Không có kỹ thuật viên nào đủ điều kiện. | Hệ thống báo "Không có kỹ thuật viên phù hợp"; phiếu giữ *Chờ phân công*. Use case kết thúc. |
| 4a | 4 | Kỹ thuật viên vừa đạt ngưỡng 8 phiếu do quản lý khác phân công trước. | Hệ thống từ chối, không thay đổi dữ liệu, quay lại bước 2 với danh sách mới. |
| 4b | 4 | Kỹ thuật viên không còn đủ điều kiện tay nghề hoặc Địa điểm. | Hệ thống từ chối kèm lý do, quay lại bước 2. |

---

## 4. Yêu cầu phi chức năng

| Mã | Loại | Yêu cầu có ngưỡng đo được |
|----|------|---------------------------|
| NFR-01 | Hiệu năng | API gợi ý kỹ thuật viên (FR-01) trả kết quả trong **≤ 2 giây ở phân vị 95** với ≤ 100 kỹ thuật viên và ≤ 1.000 phiếu mở. |
| NFR-02 | Nhất quán dữ liệu | **0** phiếu có hơn một kỹ thuật viên phụ trách và **0** cặp lịch hẹn chồng nhau của cùng một kỹ thuật viên, kể cả khi hai quản lý thao tác đồng thời (dùng transaction và khóa dòng). |
| NFR-03 | Bảo mật | Mọi API yêu cầu token, token hết hạn sau **60 phút**; chỉ role `MANAGER` được gọi phân công và đặt lịch (nếu không: 403); kỹ thuật viên và khách hàng chỉ thấy dữ liệu của chính mình. |
| NFR-04 | Khả dụng | Hệ thống sẵn sàng **≥ 99%** trong giờ làm việc 08:00–17:30 thứ Hai đến thứ Bảy. |
| NFR-05 | Truy vết | **100%** thao tác phân công, phân công lại, đặt lịch được ghi log gồm người thực hiện và thời điểm, lưu **12 tháng**. |

---

## 5. Dữ liệu và giao diện

### 5.1 Thực thể dữ liệu

| Thực thể | Trường chính |
|----------|--------------|
| `ticket` | `ticket_id`, `customer_id`, `device_model`, `issue_type`, `service_area`, `status` (`WAITING_ASSIGNMENT`, `ASSIGNED`, ...), `technician_id` |
| `technician` | `technician_id`, `full_name`, `service_area`, `max_open_tickets` (mặc định 8), `is_active` |
| `technician_skill` | `technician_id`, `skill_code`, `skill_level` (1–3) |
| `appointment` | `appointment_id`, `ticket_id`, `technician_id`, `type` (`DROP_OFF`/`PICK_UP`), `start_at`, `end_at`, `status` (`PENDING_CONFIRMATION`, `CONFIRMED`, `CANCELLED`) |

### 5.2 Giao diện hệ thống
Giao tiếp qua REST API JSON, định nghĩa trong `docs/api-contract.md`. Cổng SMS là giao diện ngoài cho FR-09.

---

## 6. Bảng truy vết

| Mã yêu cầu | User Story | Use Case | MoSCoW |
|------------|-----------|----------|--------|
| FR-01 | US1 | UC1 | MUST |
| FR-02 | US2 | UC2 | MUST |
| FR-03 | US7 | UC5 | SHOULD |
| FR-04 | US3 | UC3 | MUST |
| FR-05 | US3 | UC4 | MUST |
| FR-06 | US4 | UC6, UC7 | SHOULD |
| FR-07 | US5 | UC7 | SHOULD |
| FR-08 | US6 | UC8 | SHOULD |
| FR-09 | US8 | UC9 | COULD |
| NFR-01 | US1 | UC1 | MUST |
| NFR-02 | US2, US3 | UC2, UC3, UC4 | MUST |
| NFR-03 | US2, US3, US4 | UC2, UC3, UC6 | MUST |
| NFR-04 | US1, US2, US3 | UC1, UC2, UC3, UC4 | MUST |
| NFR-05 | US2, US3, US7 | UC2, UC3, UC5 | MUST |

*US9 (WON'T) không có yêu cầu tương ứng vì không thực hiện trong bản này.*
