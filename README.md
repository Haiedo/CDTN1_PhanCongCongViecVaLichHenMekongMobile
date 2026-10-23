# Smart CRM – Mekong Mobile · Luồng L4: Phân công kỹ thuật viên và lịch hẹn

- **Học phần:** Chuyên đề tốt nghiệp 1 · Bài tập 1 và 2 · **Track:** SE
- **Sinh viên:** Nguyễn Trọng Hải · MSSV 2374802010126 · GVHD: ThS. Nguyễn Minh Tân
- **Luồng nghiệp vụ:** phân công kỹ thuật viên cho phiếu bảo hành theo tay nghề, địa bàn, khối lượng công việc; đặt lịch hẹn giao – nhận máy và chặn trùng lịch.
- **Công nghệ:** Node.js + Express (API), PostgreSQL 16, giao diện web thuần (HTML + ES modules, không cần bước build).

## 1. Hồ sơ thiết kế

| File | Nội dung |
|------|----------|
| `docs/srs.md`, `docs/user-stories.md` | SRS 6 mục, 7 User Story, bảng truy vết |
| `docs/usecase.drawio`, `docs/architecture.drawio`, `docs/erd.drawio`, `docs/wireframe.drawio` | Sơ đồ gốc (ảnh xuất ở `docs/export/`) |
| `docs/architecture.md`, `docs/wireframe.md`, `docs/api-contract.md` | Kiến trúc và 3 câu lập luận, wireframe, hợp đồng API |
| `docs/thay-doi-thiet-ke.md` | Nhật ký thay đổi thiết kế TD-01… (Buổi 8, Buổi 10) |
| `docs/sprint1-chang-2-3.md`, `docs/buoi10.md` | Báo cáo Sprint 1 và Sprint 2 kèm ảnh kết quả chạy |
| `db/schema.sql`, `db/seed.sql` | DDL PostgreSQL (6 bảng) và dữ liệu mẫu |

## 2. Yêu cầu môi trường

- Node.js 20 trở lên (đã chạy trên Node 22), npm 10 trở lên.
- PostgreSQL 14 trở lên (đã kiểm chứng trên 16), có extension `btree_gist` (bộ cài chuẩn đã kèm). Cách cài: `docs/huong-dan-cai-dat-postgresql.md`.
- Công cụ dòng lệnh `psql` nằm trong `PATH`.
- Trình duyệt hiện đại (Chrome, Edge, Firefox).

## 3. Cài đặt và chạy (mỗi bước một lệnh)

Làm lần lượt từng bước trong thư mục đã clone. Lệnh dưới viết cho Bash; trên PowerShell chỉ khác bước 3.

| Bước | Lệnh | Kết quả đúng |
|------|------|--------------|
| 1 | `git clone https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile.git && cd CDTN1_PhanCongCongViecVaLichHenMekongMobile` | có thư mục `src/`, `db/`, `test/` |
| 2 | `npm install` | không báo lỗi, có thư mục `node_modules/` |
| 3 | `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) | có file `.env`; mở ra sửa mật khẩu `postgres` trong `DATABASE_URL` và `TEST_DATABASE_URL` |
| 4 | `psql -U postgres -h localhost -c "CREATE DATABASE mekong_l4;"` | `CREATE DATABASE` |
| 5 | `psql -U postgres -h localhost -c "CREATE DATABASE mekong_l4_test;"` | `CREATE DATABASE` (CSDL riêng cho test, bị xóa sạch mỗi lần test) |
| 6 | `npm run migrate` | `Đã áp dụng 001_schema (db/schema.sql)`; chạy lại in `đã áp dụng trước đó – bỏ qua` |
| 7 | `npm run seed` | `Đã nạp dữ liệu mẫu (db/seed.sql)` |
| 8 | `npm start` | `API chạy tại http://localhost:3000`; mở địa chỉ đó trong trình duyệt để vào giao diện |
| 9 | `npm test` (mở cửa sổ terminal khác nếu đang chạy bước 8) | `# tests 43`, `# pass 43`, `# fail 0` |
| 10 | `npm run e2e` | `KẾT QUẢ END-TO-END: 12/12 bước đạt, 0 lỗi` |

Tài khoản demo (mật khẩu chung `demo123`): `quanly01` (quản lý), `ktv.an` (TECH-003), `ktv.bich` (TECH-007), `khach01` (khách Lê Minh Châu). Đăng nhập xong token có hiệu lực 60 phút.

Dữ liệu mẫu: phiếu `T-2026-0042` và `T-2026-0043` đang chờ phân công, `T-2026-0044` đã giao TECH-003. Thử luồng chính trên giao diện: đăng nhập `quanly01` → mở `T-2026-0042` → bấm Phân công → Đặt lịch hẹn → đăng xuất, đăng nhập `khach01` → Lịch hẹn của tôi → Xác nhận.

**Gặp lỗi:**

| Thông báo | Cách xử lý |
|-----------|-----------|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL chưa chạy; khởi động dịch vụ rồi chạy lại |
| `password authentication failed` | Sai mật khẩu trong `.env` |
| `database "mekong_l4" does not exist` | Chưa làm bước 4 (hoặc 5 khi chạy test) |
| `EADDRINUSE :::3000` | Cổng bận; đổi `PORT` trong `.env` |
| `permission denied to create extension "btree_gist"` | Chạy migrate bằng tài khoản `postgres` |
| Giao diện không còn phiếu nào để phân công (đã phân công hết do thử trước đó) | `npm run demo:reset` (xóa dữ liệu trong `DATABASE_URL` và nạp lại dữ liệu mẫu) |

## 4. Cấu trúc thư mục (ánh xạ với 4 lớp của sơ đồ kiến trúc)

| Lớp | Thư mục | Ghi chú |
|-----|---------|---------|
| Giao diện | `src/frontend/` | `pages/` (4 màn hình), `components/DataState.js`, `api/` (nơi duy nhất gọi mạng: `client.js`, `*.api.js`) |
| API (Controller) | `src/routes/` | kiểm tra đầu vào, vai trò, đổi kết quả thành mã HTTP |
| Nghiệp vụ (Service) | `src/services/` | quy tắc BR-01…BR-07, giao dịch, token |
| Lưu trữ (Repository) | `src/repositories/` | chỉ SQL |
| Dùng chung | `src/middleware/`, `src/db/`, `src/config.js`, `src/errors.js` | xác thực, kết nối, migration |
| Khác | `db/`, `test/`, `scripts/e2e.js`, `docs/` | DDL, kiểm thử, luồng end-to-end, tài liệu |

## 5. Màn hình và API

| Màn hình (wireframe) | Địa chỉ | Gọi API |
|----------------------|---------|---------|
| Đăng nhập | `#/login` | `POST /api/v1/auth/login` |
| Danh sách phiếu + Tìm phiếu (quản lý) | `#/tickets` | `GET /api/v1/tickets` |
| M1 Chi tiết phiếu, gợi ý, phân công, phân công lại, lịch sử | `#/tickets/{mã}` | `GET /tickets/{mã}`, `GET …/technician-suggestions[?purpose=reassign]`, `POST …/assignment`, `POST …/reassignment` |
| M2 Đặt lịch hẹn + lịch trong ngày của kỹ thuật viên (quản lý) | `#/appointments` | `GET/POST /appointments`, `PATCH/DELETE /appointments/{mã}` |
| M3 Phiếu và lịch hẹn của tôi, hai tab (kỹ thuật viên, khách) | `#/tickets`, `#/appointments` | `GET /tickets`, `GET /appointments`, `PATCH /appointments/{mã}` |

Mỗi màn hình xử lý đủ ba trạng thái: đang tải, rỗng (có câu giải thích), lỗi (có nút Thử lại). Chi tiết hợp đồng dữ liệu: `docs/api-contract.md`. Dùng curl hoặc Postman: thay Bearer token bằng header `X-User`, `X-Role`, `X-User-Code`.

## 6. Trạng thái hiện tại (Sprint 2, Buổi 10)

| Hạng mục | Trạng thái |
|----------|-----------|
| FR1 gợi ý, FR2 phân công, FR4–FR5 đặt lịch và chống trùng | Xong, có giao diện |
| FR6 kỹ thuật viên xem phiếu và lịch của mình, FR7 khách xem lịch, FR8 khách xác nhận | Xong, có giao diện |
| Đăng nhập, token 60 phút, phân quyền phía server (NFR3) | Xong |
| NFR2 đồng thời (khóa dòng và EXCLUDE) | Xong, có test 10 và 4 yêu cầu song song |
| Kiểm thử | 43 test (đơn vị: validation, token, client; tích hợp trên PostgreSQL thật) |
| FR3 phân công lại (chuyển kỹ thuật viên, lý do bắt buộc, lịch hẹn đi theo) | Xong, có giao diện và test (TD-12 đã đóng bởi TD-15) |
| Nhập mới phiếu bảo hành | Ngoài phạm vi L4 (thuộc L2) |
