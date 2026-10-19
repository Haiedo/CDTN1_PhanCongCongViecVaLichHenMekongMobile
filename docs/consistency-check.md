# Kết quả rà soát nhất quán (6 phép) và kiểm chứng Track SE

Các phép 1 đến 4 được chạy bằng script trên đúng các file trong repo; phép 5 và 6 đối chiếu thủ công. Thứ tự sửa theo khuyến nghị: phép 1, phép 2, rồi 3 đến 6.

| Phép | Nội dung | Kết quả | Chi tiết |
|------|----------|---------|----------|
| 1 | Thuật ngữ | Đạt | Bảng thuật ngữ ở SRS mục 1.3. Dùng duy nhất "phiếu bảo hành" (`ticket`), "kỹ thuật viên" (`technician`), "lịch hẹn" (`appointment`) ở SRS, sơ đồ kiến trúc, ERD, wireframe, API. Đã đổi `ticket_id` thành `ticket_code` ở API để không trùng khóa chính trong CSDL. |
| 2 | Truy vết đầy đủ | Đạt | 8/8 yêu cầu chức năng có đủ User Story, Use Case, MoSCoW, Bảng dữ liệu, Màn hình; 0 ô trống. |
| 3 | Kiến trúc ↔ dữ liệu | Đạt | 6 bảng trong lớp lưu trữ = 6 bảng trong ERD = 6 bảng trong `db/schema.sql`. |
| 4 | Wireframe ↔ dữ liệu | Đạt | Mọi trường trên M1, M2, M3 có trong mô hình dữ liệu (số phiếu mở được tính bằng truy vấn đếm). Cả 6 bảng xuất hiện ít nhất một lần trên wireframe. |
| 5 | Lập luận ↔ yêu cầu | Đạt | 3/3 câu nêu mã NFR (NFR2, NFR1, NFR3), ngưỡng, quyết định và đánh đổi. |
| 6 | Ngoại lệ ↔ giao diện | Đạt | SRS 1a, 2a, 4a, 4b có thông báo ở M1; lỗi 400 và 409 (trùng lịch, không phải người phụ trách) có thông báo ở M2. |

## Mục kiểm chứng riêng Track SE

| Mục | Trạng thái | Bằng chứng |
|-----|-----------|-----------|
| ERD có 4–6 bảng | ✔ | 6 bảng |
| Mỗi bảng có khóa chính | ✔ | Khóa số tự tăng; `technician_skill` dùng khóa kép (`technician_id`, `skill_code`) |
| Có ≥ 2 quan hệ khóa ngoại | ✔ | 7 khóa ngoại |
| Không có bảng cô lập | ✔ | Cả 6 bảng nối được vào mô hình |
| Có SQL DDL skeleton | ✔ | `db/schema.sql`: kiểu dữ liệu, NOT NULL, FOREIGN KEY, UNIQUE, CHECK; đã qua bộ phân tích cú pháp PostgreSQL |
| Có index gắn NFR hiệu năng | ✔ | 7 index, ghi chú NFR ngay trong DDL |

## Soi năm lỗi ERD

| Lỗi | Kết quả |
|-----|---------|
| Bảng cô lập | Không có |
| Thiếu bảng lịch sử | Đã có `ticket_assignment` |
| Lưu giá trị tính được | Không lưu số phiếu mở và thời lượng lịch hẹn |
| Thiếu index | Đã có, gắn NFR1 và các chức năng lọc, sắp xếp |
| Khóa nghiệp vụ làm khóa chính | Không; mã nghiệp vụ chỉ là cột UNIQUE |

## Việc chỉ bạn làm được
- Mở các file `.drawio` trong draw.io để kiểm tra bố cục (file được tạo bằng script, ảnh PNG là bản xuất tương ứng).
- Đưa hồ sơ cho một bạn **khác track** đọc 5 phút rồi tóm tắt lại phạm vi; ghi kết quả vào mục 8 của báo cáo buổi.
- Chạy `db/schema.sql` và `db/seed.sql` trên PostgreSQL thật (mình mới kiểm tra cú pháp, chưa chạy được trên máy chủ CSDL).
