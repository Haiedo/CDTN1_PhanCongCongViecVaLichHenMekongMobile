# User Story – L4. Phân công kỹ thuật viên và lịch hẹn

> Case study Smart CRM – Mekong Mobile · Track SE
> Thuật ngữ thống nhất với SRS: **phiếu bảo hành**, **kỹ thuật viên**, **lịch hẹn**.

## 1. Danh sách User Story (7 story: 3 MUST, 4 SHOULD)

Công thức: *Là &lt;vai trò&gt;, tôi muốn &lt;mục tiêu&gt; để &lt;giá trị&gt;.*

| Mã | User Story | MoSCoW |
|----|-----------|--------|
| US1 | Là **quản lý trung tâm**, tôi muốn xem danh sách kỹ thuật viên phù hợp với một phiếu bảo hành (xếp theo tay nghề, địa bàn, khối lượng việc hiện tại) để chọn đúng người mà không phải đối chiếu thủ công. | **MUST** |
| US2 | Là **quản lý trung tâm**, tôi muốn phân công một kỹ thuật viên cho phiếu bảo hành để phiếu có người chịu trách nhiệm xử lý. | **MUST** |
| US3 | Là **quản lý trung tâm**, tôi muốn đặt lịch hẹn giao – nhận máy với khách hàng và được báo ngay nếu lịch bị trùng để một kỹ thuật viên không bị đặt hai lịch cùng lúc. | **MUST** |
| US4 | Là **kỹ thuật viên**, tôi muốn xem các phiếu bảo hành và lịch hẹn được giao cho mình để sắp xếp công việc trong ngày. | SHOULD |
| US5 | Là **khách hàng**, tôi muốn xem lịch hẹn giao – nhận máy của phiếu bảo hành mình để biết khi nào mang máy đến hoặc đến nhận lại. | SHOULD |
| US6 | Là **khách hàng**, tôi muốn xác nhận lịch hẹn để trung tâm chắc chắn tôi sẽ đến. | SHOULD |
| US7 | Là **quản lý trung tâm**, tôi muốn phân công lại phiếu bảo hành sang kỹ thuật viên khác khi người được giao nghỉ đột xuất để phiếu không bị trễ hạn. | SHOULD |

## 2. Kiểm tra INVEST (6 câu hỏi)

I = Independent (độc lập) · N = Negotiable (thương lượng được) · V = Valuable (có giá trị) · E = Estimable (ước lượng được) · S = Small (đủ nhỏ) · T = Testable (kiểm thử được)

| Mã | I | N | V | E | S | T | Ghi chú xử lý |
|----|---|---|---|---|---|---|---------------|
| US1 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Đã tách khỏi US2 (gợi ý ≠ gán) để mỗi story chạy được riêng. |
| US2 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Gán thủ công; US1 chỉ là hỗ trợ, không bắt buộc. |
| US3 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Kiểm tra trùng lịch là một phần không tách được của việc đặt lịch. |
| US4 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | |
| US5 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | |
| US6 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Đổi lịch tách thành story khác nếu cần. |
| US7 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | |

## 3. Soi bốn lỗi thường gặp

| Lỗi | Kết quả rà soát |
|-----|-----------------|
| (1) Mơ hồ | Đã bỏ các từ như "nhanh", "phù hợp" không có định nghĩa. "Phù hợp" được định nghĩa ở SRS (BR-01 đến BR-03). |
| (2) Không kiểm chứng được | US1–US3 đều có tiêu chí Given–When–Then bên dưới. |
| (3) Hai yêu cầu trong một câu | Tách "xác nhận" (US6) khỏi "đổi lịch"; tách "gợi ý" (US1) khỏi "phân công" (US2). |
| (4) Nêu giải pháp thay vì mục tiêu | Không nhắc nút, màn hình, thuật toán cụ thể trong story. |

## 4. Tiêu chí chấp nhận cho story MUST (Given–When–Then)

### US1 – Gợi ý kỹ thuật viên

| # | Tiêu chí |
|---|----------|
| AC1.1 | **Given** phiếu T-2026-0042 cần kỹ năng thay màn hình tại Quận 7, và có 3 kỹ thuật viên đủ điều kiện<br>**When** quản lý yêu cầu gợi ý<br>**Then** hệ thống trả về đúng 3 kỹ thuật viên đó, xếp theo số phiếu đang mở tăng dần. |
| AC1.2 | **Given** kỹ thuật viên TECH-005 đang có 8 phiếu mở (bằng ngưỡng tối đa)<br>**When** quản lý yêu cầu gợi ý<br>**Then** TECH-005 không xuất hiện trong danh sách. |
| AC1.3 *(ngoại lệ)* | **Given** không kỹ thuật viên nào có tay nghề phù hợp trong địa bàn<br>**When** quản lý yêu cầu gợi ý<br>**Then** hệ thống trả danh sách rỗng kèm thông báo "Không có kỹ thuật viên phù hợp" và phiếu giữ nguyên trạng thái *Chờ phân công*. |

### US2 – Phân công kỹ thuật viên

| # | Tiêu chí |
|---|----------|
| AC2.1 | **Given** phiếu ở trạng thái *Chờ phân công* và TECH-003 còn dưới ngưỡng tải<br>**When** quản lý phân công TECH-003 cho phiếu<br>**Then** phiếu chuyển sang *Đã phân công*, số phiếu mở của TECH-003 tăng 1 và thao tác được ghi lịch sử. |
| AC2.2 *(ngoại lệ)* | **Given** TECH-003 vừa nhận phiếu thứ 8 từ một quản lý khác ngay trước đó<br>**When** quản lý này phân công thêm phiếu cho TECH-003<br>**Then** hệ thống từ chối với lỗi xung đột, phiếu không thay đổi và quản lý được nhắc làm mới danh sách gợi ý. |
| AC2.3 *(ngoại lệ)* | **Given** phiếu đã có kỹ thuật viên phụ trách<br>**When** quản lý phân công người khác bằng thao tác phân công thường<br>**Then** hệ thống từ chối và hướng dẫn dùng chức năng phân công lại. |

### US3 – Đặt lịch hẹn giao – nhận máy

| # | Tiêu chí |
|---|----------|
| AC3.1 | **Given** TECH-003 đã phụ trách phiếu và rảnh 09:00–09:30 ngày 06/10/2026<br>**When** quản lý đặt lịch giao máy 09:00 trong 30 phút<br>**Then** lịch hẹn được tạo với trạng thái *Chờ xác nhận*. |
| AC3.2 *(ngoại lệ)* | **Given** TECH-003 đã có lịch 09:15–09:45 cùng ngày<br>**When** quản lý đặt lịch 09:00–09:30<br>**Then** hệ thống từ chối, nêu rõ lịch đang xung đột và không tạo lịch mới. |
| AC3.3 *(ngoại lệ)* | **Given** giờ hẹn nằm trong quá khứ hoặc ngoài giờ làm việc 08:00–17:30<br>**When** quản lý đặt lịch<br>**Then** hệ thống từ chối vì dữ liệu không hợp lệ. |

## 5. Giả định dùng cho các tiêu chí trên

- Ngưỡng tối đa: **8 phiếu mở** cho mỗi kỹ thuật viên.
- Giờ làm việc: **08:00–17:30**, thứ Hai đến thứ Bảy. Thời lượng lịch hẹn từ **15 đến 120 phút**, mặc định 30.
- Nhóm tay nghề mẫu: `SCREEN_REPAIR`, `BATTERY`, `MAINBOARD`, `WATER_DAMAGE`.
- Dữ liệu phiếu mẫu (ticket, technician) do sinh viên tự tạo theo L2.

## 6. Ngoài phạm vi (WON'T) – không tính là User Story

- Nhắc lịch hẹn qua SMS (cần cổng SMS ngoài, chưa có trong case study).
- Tự động phân công không cần quản lý duyệt (quá lớn, chưa có tiêu chí chấp nhận kiểm chứng được).
