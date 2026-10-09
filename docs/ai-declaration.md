# Phụ lục – Bảng khai báo sử dụng công cụ AI

> **BẢN NHÁP – bạn phải đọc, sửa và điền cột cuối bằng những gì bạn THỰC SỰ đã làm.**
> Các dòng "Công cụ / Phần áp dụng / Cách dùng" bên dưới mô tả đúng việc đã xảy ra khi tạo hồ sơ này. Cột "Em đã chỉnh sửa / kiểm chứng gì" để trống trong ngoặc vuông vì chỉ bạn biết mình đã kiểm tra gì. Không ghi những việc bạn chưa làm.

| Công cụ | Phần áp dụng | Cách dùng (tóm tắt yêu cầu đã gửi) | Em đã chỉnh sửa / kiểm chứng gì |
|---------|--------------|------------------------------------|----------------------------------|
| Claude (trợ lý AI dạng chat) | Mục 1 – User Story, tiêu chí Given–When–Then (`docs/user-stories.md`) | Gửi đề bài L4 và các tiêu chí buổi 4, nhờ tạo user story, INVEST, MoSCoW và tiêu chí chấp nhận | [Ghi: giữ/sửa/bỏ story nào, tự kiểm lại INVEST ra sao] |
| Claude | Mục 1 – SRS, bảng truy vết (`docs/srs.md`) | Nhờ soạn SRS 6 mục, FR, NFR có ngưỡng, bảng truy vết | [Ghi: đã đối chiếu với tài liệu lớp / sửa ngưỡng nào] |
| Claude | Mục 2 – Use Case Diagram và đặc tả UC2 (`docs/usecase.drawio`) | Nhờ liệt kê actor, use case, luồng chính và ngoại lệ; file `.drawio` do script tạo | [Ghi: đã mở bằng draw.io, chỉnh bố cục, kiểm lỗi 1–7 ra sao] |
| Claude | Mục 3 – Kiến trúc và ba câu lập luận (`docs/architecture.md`) | Nhờ chia lớp và viết ba câu theo khuôn "Vì NFRx… tôi chọn… đánh đổi là…" | [Ghi: viết lại bằng lời của em chỗ nào, đã hiểu từng đánh đổi chưa] |
| Claude | Mục 4 – ERD và `db/schema.sql` | Nhờ dựng ERD, DDL PostgreSQL, index gắn NFR | [Ghi: đã chạy trên PostgreSQL thật chưa, sửa lỗi nào] |
| Claude | Mục 5 – Wireframe (`docs/wireframe.drawio`) | Nhờ thiết kế 3 màn hình và bảng đối chiếu trường dữ liệu | [Ghi: đã sửa/vẽ lại phần nào] |
| Claude | Phụ lục – API contract (`docs/api-contract.md`) | Nhờ viết 3 endpoint cho story MUST kèm JSON mẫu và validation | [Ghi: đã kiểm tra khớp với DDL chưa] |
| Không dùng | Các phần em tự làm | [Nếu có phần tự làm, ghi rõ; nếu không có thì xóa dòng này] | – |

Ghi chú: nếu không dùng AI cho phần nào, ghi rõ; nếu toàn bộ hồ sơ không dùng AI thì ghi duy nhất dòng "Không sử dụng công cụ AI". Khai báo mơ hồ như "có dùng AI hỗ trợ" sẽ không đạt.
