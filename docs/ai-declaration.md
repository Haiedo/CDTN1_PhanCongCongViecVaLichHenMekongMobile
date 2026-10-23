# Phụ lục – Bảng khai báo sử dụng công cụ AI

| Công cụ | Phần áp dụng | Cách dùng (tóm tắt yêu cầu đã gửi) | Em đã chỉnh sửa / kiểm chứng gì |
|---------|--------------|------------------------------------|----------------------------------|
| Claude (trợ lý AI dạng chat) | Mục 1 – User Story, tiêu chí Given–When–Then (`docs/user-stories.md`) | Gửi đề bài L4 và các tiêu chí buổi 4, nhờ tạo user story, INVEST, MoSCoW và tiêu chí chấp nhận | Theo phản hồi giảng viên, bỏ US8 (SMS) và US9 (tự động phân công) còn 7 story; tự kiểm lại INVEST từng story và đối chiếu Given–When–Then với test đã chạy |
| Claude | Mục 1 – SRS, bảng truy vết (`docs/srs.md`) | Nhờ soạn SRS 6 mục, FR, NFR có ngưỡng, bảng truy vết | Đối chiếu 8 FR với bảng truy vết (không ô trống), bỏ FR9/UC9, kiểm lại ngưỡng NFR1–NFR5 với đề bài L4 |
| Claude | Mục 2 – Use Case Diagram và đặc tả UC2 (`docs/usecase.drawio`) | Nhờ liệt kê actor, use case, luồng chính và ngoại lệ; file `.drawio` do script tạo | Sửa bố cục đặc tả UC2 (sơ đồ trước, luồng chính, rồi ngoại lệ; ghi UC2, US2 và US7); bỏ UC9 khỏi sơ đồ |
| Claude | Mục 3 – Kiến trúc và ba câu lập luận (`docs/architecture.md`) | Nhờ chia lớp và viết ba câu theo khuôn "Vì NFRx… tôi chọn… đánh đổi là…" | Đã kiểm chứng lập luận NFR2 bằng test đồng thời (10 và 4 yêu cầu song song) và test đột biến bỏ khóa thì test đỏ; bỏ ReminderJob và cổng SMS khỏi sơ đồ |
| Claude | Mục 4 – ERD và `db/schema.sql` | Nhờ dựng ERD, DDL PostgreSQL, index gắn NFR | Đã chạy `db/schema.sql` và `db/seed.sql` trên PostgreSQL 16 thật, chạy lại nhiều lần không lỗi; bổ sung chú thích PK, FK, UQ vào ảnh ERD |
| Claude | Mục 5 – Wireframe (`docs/wireframe.drawio`) | Nhờ thiết kế 3 màn hình và bảng đối chiếu trường dữ liệu | Sửa tên trường sai, đối chiếu lại từng trường trên M1–M3 với cột trong DDL; bỏ phần liên quan SMS |
| Claude | Phụ lục – API contract (`docs/api-contract.md`) | Nhờ viết 3 endpoint cho story MUST kèm JSON mẫu và validation | Đối chiếu tên trường với DDL; đã gọi thật các endpoint bằng curl (200, 201, 400, 403, 409) và lưu ảnh trong `docs/anh-ket-qua/` |
| Claude | Sprint 2 – giao diện, đăng nhập, test, e2e (`src/frontend/`, `src/services/token.js`, `test/`, `scripts/e2e.js`) | Nhờ soạn mã giao diện, token 60 phút, 12 test mới và kịch bản end-to-end | Đã chạy `npm test` (43 pass) và `npm run e2e` (12/12) trên PostgreSQL thật, thử tắt backend và hết phiên trên giao diện, chụp 12 ảnh trong `docs/anh-buoi10/` |
| Không dùng | Vẽ Use Case Diagram trên draw.io; cài đặt, chạy và kiểm thử PostgreSQL; chụp ảnh kết quả; commit và push; quyết định SỬA hoặc GIỮ NGUYÊN từng phản hồi | Em tự thực hiện | Em tự đọc lại và chịu trách nhiệm nội dung |

## Cam kết

Em cam kết các nội dung trên là đúng sự thật; em đã đọc, hiểu và chịu trách nhiệm về toàn bộ sản phẩm nộp.

- Họ tên: Nguyễn Trọng Hải
- MSSV: 2374802010126
- Ngày: 19/10/2026
