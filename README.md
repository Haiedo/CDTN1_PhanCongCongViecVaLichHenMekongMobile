# Smart CRM – Mekong Mobile · Luồng L4: Phân công kỹ thuật viên và lịch hẹn

- **Học phần:** Chuyên đề tốt nghiệp 1 · Bài tập 1
- **Track:** SE (API contract)
- **Luồng nghiệp vụ:** L4 – phân công kỹ thuật viên cho phiếu bảo hành theo tay nghề, địa bàn, khối lượng công việc; đặt lịch hẹn giao – nhận máy và kiểm tra trùng lịch.

## Cách mở các file thiết kế

| File | Nội dung | Mở bằng |
|------|----------|---------|
| `docs/srs.md` | SRS rút gọn 6 mục, bảng truy vết | Trình xem Markdown |
| `docs/user-stories.md` | 7 User Story, INVEST, MoSCoW, Given–When–Then | Trình xem Markdown |
| `docs/usecase.drawio` | Use Case Diagram | draw.io |
| `docs/architecture.drawio`, `docs/architecture.md` | Kiến trúc 4 lớp và ba câu lập luận | draw.io, Markdown |
| `docs/erd.drawio` | ERD 6 bảng | draw.io |
| `docs/wireframe.drawio`, `docs/wireframe.md` | Wireframe M1, M2, M3 và bảng đối chiếu | draw.io, Markdown |
| `docs/api-contract.md` | API contract Track SE | Markdown |
| `docs/consistency-check.md` | Kết quả 6 phép kiểm nhất quán | Markdown |
| `docs/ai-declaration.md` | Khai báo sử dụng công cụ AI | Markdown |
| `docs/export/*.png` | Ảnh xuất chèn vào PDF | Trình xem ảnh |
| `db/schema.sql`, `db/seed.sql` | DDL PostgreSQL và dữ liệu mẫu | `psql -f` |
| `tools/build_bt1_pdf.py` | Gộp toàn bộ thành file PDF nộp bài | `python3 tools/build_bt1_pdf.py` |

## 2. Môi trường

Chưa cài PostgreSQL hoặc đang chuyển từ MongoDB: xem `docs/huong-dan-cai-dat-postgresql.md`.

- Node.js 20 trở lên, PostgreSQL 16 (cần extension `btree_gist`).
- Sao chép `.env.example` thành `.env` và sửa `DATABASE_URL`, `PORT`; `TEST_DATABASE_URL` trỏ tới một CSDL riêng cho kiểm thử.

```bash
createdb mekong_l4
npm install
npm run migrate   # chạy db/schema.sql, chạy lại không lỗi
npm run seed      # dữ liệu mẫu, chạy lại không nhân đôi
npm start         # http://localhost:3000/health
npm test          # 22 test (unit + tích hợp trên PostgreSQL thật)
```

Xác thực giả lập (đăng nhập ngoài phạm vi): gửi header `X-User`, `X-Role` (MANAGER, TECHNICIAN, CUSTOMER), `X-User-Code`.

## 6. Tình trạng hiện tại

| Hạng mục | Trạng thái |
|----------|-----------|
| FR1 gợi ý kỹ thuật viên | Xong |
| FR2 phân công, ghi lịch sử | Xong |
| FR4, FR5 đặt lịch, chống trùng | Xong |
| FR6 kỹ thuật viên xem lịch của mình; FR8 xác nhận; hủy mềm (CRUD `appointments`) | Xong |
| NFR2 đồng thời (khóa dòng và EXCLUDE) | Xong, có test 10 và 4 yêu cầu song song |
| FR3 phân công lại (chuyển kỹ thuật viên), FR7 khách xem lịch qua giao diện | Chưa làm |
| Giao diện M1–M3 | Chưa làm (chỉ có wireframe) |

Bằng chứng chạy: `docs/anh-ket-qua/`. Nhật ký thay đổi thiết kế: `docs/thay-doi-thiet-ke.md`.
