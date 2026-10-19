# SRS rút gọn – L4. Phân công kỹ thuật viên và lịch hẹn

Case study Smart CRM – Mekong Mobile · Phiên bản 1.0 · Track SE

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu đặc tả yêu cầu cho luồng **phân công kỹ thuật viên cho phiếu bảo hành** và **đặt lịch hẹn giao – nhận máy**, làm cơ sở thiết kế và kiểm thử.

### 1.2 Phạm vi
Thuộc phạm vi: gợi ý và phân công kỹ thuật viên, phân công lại, đặt lịch hẹn, kiểm tra trùng lịch, xem và xác nhận lịch hẹn.
Ngoài phạm vi: tạo phiếu bảo hành (đã có ở L2), thanh toán, **WON'T trong bản này:** nhắc lịch hẹn qua SMS và tự động phân công không cần quản lý duyệt.

### 1.3 Bảng thuật ngữ (dùng thống nhất trong SRS, sơ đồ, API)

| Thuật ngữ trong tài liệu | Tên dữ liệu / API | Định nghĩa |
|---|---|---|
| Phiếu bảo hành | `ticket` | Bản ghi tiếp nhận một thiết bị của khách hàng cần bảo hành hoặc sửa chữa. |
| Kỹ thuật viên | `technician` | Nhân sự sửa chữa của trung tâm. |
| Tay nghề | `technician_skill` | Kỹ năng và cấp độ (1–3) của một kỹ thuật viên. |
| Địa bàn | `service_area` | Quận/huyện kỹ thuật viên phụ trách. |
| Khối lượng công việc | `open_tickets` (tính từ `ticket`, không lưu cột) | Số phiếu bảo hành đang mở của kỹ thuật viên. |
| Lịch hẹn | `appointment` | Cuộc hẹn khách giao máy (`DROP_OFF`) hoặc nhận máy (`PICK_UP`). |
| Quản lý trung tâm | role `MANAGER` | Người phân công và đặt lịch. |

---

## 2. Mô tả tổng quan

### 2.1 Tác nhân (actor)
Quản lý trung tâm, Kỹ thuật viên, Khách hàng.

### 2.2 Sơ đồ use case
Xem `docs/usecase.drawio` (ảnh xuất: `docs/export/usecase.png`) – 8 use case, 3 actor, có ranh giới hệ thống và chú thích.

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

### 2.3 Quy tắc nghiệp vụ

| Mã | Quy tắc |
|----|---------|
| BR-01 | Kỹ thuật viên chỉ đủ điều kiện nếu có **tay nghề** khớp loại lỗi của phiếu. |
| BR-02 | Kỹ thuật viên chỉ đủ điều kiện nếu **địa bàn** trùng địa bàn của phiếu. |
| BR-03 | Kỹ thuật viên có **từ 8 phiếu mở trở lên** thì không được nhận thêm. |
| BR-04 | Một phiếu chỉ có **một** kỹ thuật viên phụ trách tại một thời điểm. |
| BR-05 | Hai lịch hẹn của **cùng một kỹ thuật viên** không được chồng thời gian. |
| BR-06 | Lịch hẹn nằm trong giờ làm việc 08:00–17:30, thời lượng 15–120 phút, bắt đầu ở tương lai. |
| BR-07 | Chỉ kỹ thuật viên **đang phụ trách phiếu** mới được đặt lịch hẹn cho phiếu đó. |

### 2.4 Giả định
Dữ liệu phiếu, kỹ thuật viên và tay nghề đã có từ L2 (sinh viên tự tạo dữ liệu mẫu). Mỗi phiếu có một loại lỗi map được sang một tay nghề.

---

## 3. Yêu cầu chức năng

### 3.0 User Story (chi tiết và tiêu chí Given–When–Then: `docs/user-stories.md`)

| Mã | User Story (rút gọn) | MoSCoW |
|----|----------------------|--------|
| US1 | Là quản lý trung tâm, tôi muốn xem danh sách kỹ thuật viên phù hợp với phiếu bảo hành để chọn đúng người. | MUST |
| US2 | Là quản lý trung tâm, tôi muốn phân công kỹ thuật viên cho phiếu để phiếu có người chịu trách nhiệm. | MUST |
| US3 | Là quản lý trung tâm, tôi muốn đặt lịch hẹn giao – nhận máy và được báo nếu trùng lịch để không đặt hai lịch cùng lúc. | MUST |
| US4 | Là kỹ thuật viên, tôi muốn xem phiếu và lịch hẹn được giao để sắp xếp công việc. | SHOULD |
| US5 | Là khách hàng, tôi muốn xem lịch hẹn của phiếu mình để biết khi nào giao hoặc nhận máy. | SHOULD |
| US6 | Là khách hàng, tôi muốn xác nhận lịch hẹn để trung tâm chắc chắn tôi sẽ đến. | SHOULD |
| US7 | Là quản lý trung tâm, tôi muốn phân công lại phiếu khi kỹ thuật viên nghỉ để phiếu không trễ hạn. | SHOULD |

### 3.1 Yêu cầu chức năng

| Mã | Yêu cầu | MoSCoW |
|----|---------|--------|
| FR1 | Hệ thống trả danh sách kỹ thuật viên đủ điều kiện (BR-01, 02, 03) cho một phiếu ở trạng thái *Chờ phân công*, xếp theo số phiếu mở tăng dần; nếu bằng nhau thì ưu tiên cấp tay nghề cao hơn. | MUST |
| FR2 | Hệ thống gán một kỹ thuật viên cho phiếu, đổi trạng thái sang *Đã phân công*, tăng khối lượng công việc và ghi lịch sử (thực thi BR-03, BR-04). | MUST |
| FR3 | Hệ thống cho phép chuyển phiếu đang *Đã phân công* sang kỹ thuật viên khác kèm lý do bắt buộc; lịch hẹn chưa diễn ra của phiếu được gắn cho người mới nếu không trùng lịch. | SHOULD |
| FR4 | Hệ thống tạo lịch hẹn giao hoặc nhận máy với trạng thái *Chờ xác nhận* (thực thi BR-06, BR-07). | MUST |
| FR5 | Trước khi tạo lịch hẹn, hệ thống kiểm tra trùng lịch của kỹ thuật viên (BR-05) và từ chối nếu trùng, nêu rõ lịch xung đột. | MUST |
| FR6 | Kỹ thuật viên xem được danh sách phiếu và lịch hẹn của riêng mình. | SHOULD |
| FR7 | Khách hàng xem được lịch hẹn của phiếu bảo hành của chính mình. | SHOULD |
| FR8 | Khách hàng xác nhận lịch hẹn, trạng thái chuyển sang *Đã xác nhận*. | SHOULD |

### 3.2 Đặc tả chi tiết use case quan trọng nhất – UC2 Phân công kỹ thuật viên

| Mục | Nội dung |
|-----|----------|
| Mã use case | UC2 |
| User Story liên quan | US2 (phân công); US7 (phân công lại, luồng 1a) |
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
| 4 | Hệ thống kiểm tra lại tay nghề, địa bàn và khối lượng công việc của kỹ thuật viên được chọn. |
| 5 | Hệ thống gán kỹ thuật viên cho phiếu, đổi trạng thái sang *Đã phân công*, ghi lịch sử. |
| 6 | Hệ thống thông báo kết quả cho quản lý. |

**Luồng ngoại lệ (đánh số theo bước)**

| Mã | Tại bước | Điều kiện | Xử lý |
|----|----------|-----------|-------|
| 1a | 1 | Phiếu đã có kỹ thuật viên phụ trách. | Hệ thống từ chối, hướng dẫn dùng UC5 (phân công lại). Use case kết thúc. |
| 2a | 2 | Không có kỹ thuật viên nào đủ điều kiện. | Hệ thống báo "Không có kỹ thuật viên phù hợp"; phiếu giữ *Chờ phân công*. Use case kết thúc. |
| 4a | 4 | Kỹ thuật viên vừa đạt ngưỡng 8 phiếu do quản lý khác phân công trước. | Hệ thống từ chối, không thay đổi dữ liệu, quay lại bước 2 với danh sách mới. |
| 4b | 4 | Kỹ thuật viên không còn đủ điều kiện tay nghề hoặc địa bàn. | Hệ thống từ chối kèm lý do, quay lại bước 2. |

---

## 4. Yêu cầu phi chức năng

| Mã | Loại | Yêu cầu có ngưỡng đo được |
|----|------|---------------------------|
| NFR1 | Hiệu năng | API gợi ý kỹ thuật viên (FR1) trả kết quả trong **≤ 2 giây ở phân vị 95** với ≤ 100 kỹ thuật viên và ≤ 1.000 phiếu mở. |
| NFR2 | Nhất quán dữ liệu | **0** phiếu có hơn một kỹ thuật viên phụ trách và **0** cặp lịch hẹn chồng nhau của cùng một kỹ thuật viên, kể cả khi hai quản lý thao tác đồng thời (dùng transaction và khóa dòng). |
| NFR3 | Bảo mật | Mọi API yêu cầu token, token hết hạn sau **60 phút**; chỉ role `MANAGER` được gọi phân công và đặt lịch (nếu không: 403); kỹ thuật viên và khách hàng chỉ thấy dữ liệu của chính mình. |
| NFR4 | Khả dụng | Hệ thống sẵn sàng **≥ 99%** trong giờ làm việc 08:00–17:30 thứ Hai đến thứ Bảy. |
| NFR5 | Truy vết | **100%** thao tác phân công, phân công lại, đặt lịch được ghi log gồm người thực hiện và thời điểm, lưu **12 tháng**. |

---

## 5. Dữ liệu và giao diện

### 5.1 Thực thể dữ liệu
ERD đầy đủ ở `docs/erd.drawio` (ảnh: `docs/export/erd.png`), DDL ở `db/schema.sql`. Gồm 6 bảng:

| Bảng | Vai trò | Khóa ngoại |
|------|---------|------------|
| `customer` | Khách hàng sở hữu phiếu bảo hành | – |
| `technician` | Kỹ thuật viên: địa bàn, ngưỡng phiếu tối đa, trạng thái hoạt động | – |
| `technician_skill` | Tay nghề và cấp độ (1–3) của kỹ thuật viên | `technician_id` |
| `ticket` | Phiếu bảo hành: loại kỹ năng cần, địa bàn, trạng thái, người đang phụ trách | `customer_id`, `technician_id` |
| `ticket_assignment` | Lịch sử phân công và phân công lại (lý do, người thực hiện, thời điểm) | `ticket_id`, `technician_id` |
| `appointment` | Lịch hẹn giao – nhận máy (`start_at`, `end_at`, trạng thái) | `ticket_id`, `technician_id` |

Khối lượng công việc của kỹ thuật viên được **đếm** từ `ticket` (trạng thái `ASSIGNED`, `IN_PROGRESS`), không lưu thành cột.

### 5.2 Giao diện
- Người dùng: 3 màn hình wireframe M1, M2, M3 (`docs/wireframe.drawio`).
- Hệ thống: REST API JSON (`docs/api-contract.md`).
- Kiến trúc 4 lớp và lập luận thiết kế: `docs/architecture.md`.

---

## 6. Bảng truy vết

### 6.1 Yêu cầu chức năng

| Mã | User Story | Use Case | MoSCoW | Bảng dữ liệu | Màn hình |
|----|-----------|----------|--------|--------------|----------|
| FR1 | US1 | UC1 | MUST | `customer`, `technician`, `technician_skill`, `ticket` | M1 |
| FR2 | US2 | UC2 | MUST | `ticket`, `ticket_assignment` | M1 |
| FR3 | US7 | UC5 | SHOULD | `ticket`, `ticket_assignment` | M1 |
| FR4 | US3 | UC3 | MUST | `appointment`, `ticket` | M2 |
| FR5 | US3 | UC4 | MUST | `appointment` | M2 |
| FR6 | US4 | UC6, UC7 | SHOULD | `ticket`, `appointment`, `customer` | M3 |
| FR7 | US5 | UC7 | SHOULD | `appointment`, `ticket` | M3 |
| FR8 | US6 | UC8 | SHOULD | `appointment` | M3 |

### 6.2 Yêu cầu phi chức năng

| Mã | User Story | Use Case | MoSCoW | Thiết kế đáp ứng |
|----|-----------|----------|--------|------------------|
| NFR1 | US1 | UC1 | MUST | Index `idx_ticket_technician_status`, `idx_technician_area_active`, `idx_skill_code_level` |
| NFR2 | US2, US3 | UC2, UC3, UC4 | MUST | Giao dịch ở lớp nghiệp vụ + ràng buộc `ex_appt_no_overlap` |
| NFR3 | US2, US3, US4 | UC2, UC3, UC6 | MUST | Kiểm tra vai trò ở `AssignService`, `AppointmentService` |
| NFR4 | US1, US2, US3 | UC1, UC2, UC3, UC4 | MUST | Cam kết vận hành, không có thành phần thiết kế riêng |
| NFR5 | US2, US3, US7 | UC2, UC3, UC5 | MUST | Bảng `ticket_assignment`, các cột `created_by`, `assigned_by` |

*Hai hạng mục WON'T (nhắc lịch SMS, tự động phân công) không có yêu cầu tương ứng vì không thực hiện trong bản này.*
