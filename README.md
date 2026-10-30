# Smart CRM – Mekong Mobile · Luồng L4: Phân công kỹ thuật viên và lịch hẹn

| | |
|---|---|
| Học phần | Chuyên đề tốt nghiệp 1 · Bài tập 2 (tag **v0.2**) |
| Sinh viên | Nguyễn Trọng Hải · MSSV 2374802010126 · Lớp 261_71ITGR40203_03 |
| Giảng viên hướng dẫn | ThS. Nguyễn Minh Tân |
| Track · Luồng | **SE** · **L4** – phân công kỹ thuật viên cho phiếu bảo hành theo tay nghề, địa bàn, khối lượng công việc; đặt lịch hẹn giao – nhận máy và chặn trùng lịch |
| Công nghệ | Node.js + Express (API), PostgreSQL (driver `pg`), giao diện web thuần HTML + ES modules (không có bước build) |
| Repo | https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile |

## 1. Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|------------|-----------|---------|
| Node.js | **20 trở lên** (đã chạy trên 22) | `node -v` |
| npm | 10 trở lên | `npm -v` |
| PostgreSQL | **14 trở lên** (đã chạy trên 16) | cần extension `btree_gist` (bộ cài chuẩn đã kèm) |
| `psql` | cùng bản PostgreSQL | phải nằm trong `PATH` |
| Git | bất kỳ bản mới | để clone |
| Trình duyệt | Chrome, Edge hoặc Firefox | dùng giao diện |

Không cần Docker, không cần cài thêm thư viện toàn cục.

## 2. Cài đặt và chạy (mỗi bước một lệnh)

Làm lần lượt từng bước. Clone **đúng tag `v0.2`** vào một thư mục trống. Lệnh viết cho Bash; trên PowerShell chỉ khác bước 3.

| Bước | Lệnh | Kết quả đúng |
|------|------|--------------|
| 1 | `git clone --branch v0.2 https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile.git thu-nghiem` | có thư mục `thu-nghiem/` chứa `src/`, `db/`, `test/` |
| 2 | `cd thu-nghiem` | đang ở thư mục dự án |
| 3 | `npm install` | không báo lỗi, có `node_modules/` (cài đúng phiên bản theo `package-lock.json`) |
| 4 | `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) | có file `.env` |
| 5 | Mở `.env`, thay `matkhau_cua_ban` bằng mật khẩu tài khoản `postgres` của máy (ở cả hai dòng `DATABASE_URL` và `TEST_DATABASE_URL`) | `.env` không còn chữ `matkhau_cua_ban` |
| 6 | `psql -U postgres -h localhost -c "CREATE DATABASE mekong_l4;"` | `CREATE DATABASE` |
| 7 | `psql -U postgres -h localhost -c "CREATE DATABASE mekong_l4_test;"` | `CREATE DATABASE` (CSDL riêng cho test, bị xóa sạch mỗi lần test) |
| 8 | `npm run migrate` | `Đã áp dụng 001_schema (db/schema.sql)` |
| 9 | `npm run seed` | `Đã nạp dữ liệu mẫu (db/seed.sql)` |
| 10 | `npm test` | cuối kết quả có `tests 69`, `pass 69`, `fail 0` (đầu dòng là `ℹ` hoặc `#` tùy phiên bản Node) |
| 11 | `npm run e2e` | `KẾT QUẢ END-TO-END: 12/12 bước đạt, 0 lỗi` |
| 12 | `npm start` | `API chạy tại http://localhost:3000`; mở địa chỉ đó trong trình duyệt để vào giao diện |

Thứ tự bước 10 → 12 không bắt buộc; `npm test` và `npm run e2e` dùng `mekong_l4_test`, không đụng dữ liệu của `mekong_l4`. Khi `npm start` đang chạy ở một cửa sổ, chạy test ở cửa sổ khác.

**Tài khoản demo** (mật khẩu chung `demo123`, là dữ liệu giả lập công khai, không phải khóa bí mật): `quanly01` (quản lý), `ktv.an` (kỹ thuật viên TECH-003), `ktv.bich` (kỹ thuật viên TECH-007), `khach01` (khách Lê Minh Châu). Token đăng nhập có hiệu lực 60 phút.

### Chạy lại lần hai (không lỗi, không nhân đôi dữ liệu)

`npm run migrate` chạy lại in `001_schema đã áp dụng trước đó – bỏ qua`. `npm run seed` chạy lại không thêm dòng nào (dùng `ON CONFLICT DO NOTHING`); có test kiểm tra điều này. Muốn đưa dữ liệu demo về trạng thái ban đầu (ví dụ các phiếu mẫu đã bị phân công hết khi thử): `npm run demo:reset`.

### Gặp lỗi

| Thông báo | Nghĩa là | Cách xử lý |
|-----------|----------|-----------|
| `Thiếu DATABASE_URL` | chưa có file `.env` | làm bước 4 và 5 |
| `ECONNREFUSED 127.0.0.1:5432` hoặc `Không kết nối được cơ sở dữ liệu` | PostgreSQL chưa chạy | khởi động dịch vụ PostgreSQL rồi chạy lại |
| `password authentication failed` | sai mật khẩu trong `.env` | sửa ở bước 5 |
| `database "mekong_l4" does not exist` | chưa tạo CSDL | bước 6 (hoặc 7 khi chạy test) |
| `permission denied to create extension "btree_gist"` | tài khoản không phải siêu người dùng | dùng tài khoản `postgres` trong `.env` |
| `EADDRINUSE :::3000` | cổng 3000 đang bận | đổi `PORT` trong `.env` |
| `Cannot find module 'dotenv'` | chưa cài thư viện | `npm install` |
| Màn hình danh sách phiếu không còn phiếu nào để phân công | các phiếu mẫu đã bị phân công khi thử trước đó | `npm run demo:reset` |
| Khi tắt PostgreSQL, API trả `503 DATABASE_UNAVAILABLE`, giao diện hiện lỗi kèm nút *Thử lại* | hành vi đúng (suy giảm có kiểm soát) | bật lại PostgreSQL rồi bấm *Thử lại* |

## 3. Chạy thử luồng chính (khoảng 3 phút)

Trên giao diện (`http://localhost:3000`):

1. Đăng nhập `quanly01` → danh sách có 3 phiếu, hai phiếu *Chờ phân công*.
2. Bấm **Phân công** ở `T-2026-0042` → bảng kỹ thuật viên gợi ý (đúng tay nghề, địa bàn, ít phiếu mở trước) → bấm **Phân công** một người.
3. Bấm **Đặt lịch hẹn cho phiếu này** → chọn ngày giờ trong khung 08:00–17:30, thứ Hai đến thứ Bảy → **Đặt lịch hẹn**.
4. Đặt lịch thứ hai chồng giờ lên lịch trên → hệ thống từ chối với thông báo nêu lịch đang chiếm khung giờ.
5. Đăng xuất, đăng nhập `khach01` → **Lịch hẹn** → **Xác nhận**.
6. Đăng nhập `ktv.an` hoặc `ktv.bich` → chỉ thấy phiếu và lịch của mình.

Cùng luồng đó bằng một lệnh: `npm run e2e` (12 lời gọi API, in đầu vào và đầu ra từng bước).

## 4. Gọi API bằng curl hoặc Postman

API ở `/api/v1`. Có hai cách xác thực: `Authorization: Bearer <token>` (lấy từ `POST /auth/login`) hoặc, để thử nhanh, các header `X-User`, `X-Role` (`MANAGER` | `TECHNICIAN` | `CUSTOMER`), `X-User-Code`.

Hai thực thể đủ CRUD: **ticket** (phiếu bảo hành) và **appointment** (lịch hẹn).

| Thao tác | Phiếu `ticket` | Lịch hẹn `appointment` |
|----------|----------------|------------------------|
| Create | `POST /tickets` | `POST /appointments` |
| Read | `GET /tickets`, `GET /tickets/{mã}` | `GET /appointments`, `GET /appointments/{mã}` |
| Update | `PATCH /tickets/{mã}` (khi Chờ phân công) | `PATCH /appointments/{mã}` (xác nhận) |
| Delete | `DELETE /tickets/{mã}` (khi Chờ phân công) | `DELETE /appointments/{mã}` (hủy mềm) |

Bash (đang chạy `npm start`):

```bash
H='-H X-User:quanly01 -H X-Role:MANAGER -H Content-Type:application/json'
# Create phiếu mới → 201, mã T-YYYY-NNNN
curl -s $H -X POST localhost:3000/api/v1/tickets -d '{"customer_phone":"0912345678","device_model":"iPad Air","required_skill":"SCREEN_REPAIR","service_area":"Quận 7"}'
# Read
curl -s $H localhost:3000/api/v1/tickets
# Update (thay T-2026-0045 bằng mã vừa tạo)
curl -s $H -X PATCH localhost:3000/api/v1/tickets/T-2026-0045 -d '{"device_model":"iPad Pro"}'
# Delete
curl -s $H -X DELETE localhost:3000/api/v1/tickets/T-2026-0045
# Dữ liệu sai → 400 VALIDATION_ERROR, nói rõ trường nào sai
curl -s $H -X POST localhost:3000/api/v1/tickets -d '{"device_model":"iPad"}'
# Gợi ý kỹ thuật viên cho phiếu chờ phân công
curl -s $H localhost:3000/api/v1/tickets/T-2026-0042/technician-suggestions
```

PowerShell (viết thân JSON bằng UTF-8 để giữ dấu tiếng Việt):

```powershell
$h = @{ 'X-User'='quanly01'; 'X-Role'='MANAGER' }
$u = 'http://localhost:3000/api/v1/tickets'
function Send($m, $url, $json) {
  $p = @{ Method=$m; Uri=$url; Headers=$h; ContentType='application/json; charset=utf-8'; UseBasicParsing=$true }
  if ($json) { $p.Body = [Text.Encoding]::UTF8.GetBytes($json) }
  try   { $r = Invoke-WebRequest @p; "HTTP $([int]$r.StatusCode)"; $r.Content }
  catch { "HTTP $([int]$_.Exception.Response.StatusCode)"; $_.ErrorDetails.Message }
}
"=== 1. CREATE (mong đợi HTTP 201) ==="
$r1 = Send Post $u '{"customer_phone":"0912345678","device_model":"iPad Air","required_skill":"SCREEN_REPAIR","service_area":"Quận 7"}'
$r1
$code = ($r1[1] | ConvertFrom-Json).ticket_code      # mã vừa tạo, ví dụ T-2026-0045
"=== 2. READ (HTTP 200) ===";                 Send Get    "$u/$code" $null
"=== 3. UPDATE (HTTP 200) ===";               Send Patch  "$u/$code" '{"device_model":"iPad Pro"}'
"=== 4. DELETE (HTTP 200) ===";               Send Delete "$u/$code" $null
"=== 5. DỮ LIỆU SAI (HTTP 400 VALIDATION_ERROR) ==="
Send Post $u '{"device_model":"iPad"}'
```

Danh sách đầy đủ endpoint, JSON mẫu, mã lỗi và bảng validation: [`docs/api-contract.md`](docs/api-contract.md). Kiểm tra sức khỏe: `GET /health` → `{"status":"ok","database":"up"}`, hoặc `503` khi PostgreSQL không trả lời.

**Lỗi trả về luôn cùng một dạng** `{ "error": { "code": "...", "message": "..." } }`; không bao giờ trả lỗi thô của thư viện.

## 5. Kiến trúc và cấu trúc thư mục

Backend ba lớp, mỗi lớp một việc; giao diện chỉ nói chuyện với backend qua API.

```
Trình duyệt  →  src/frontend/api/   →  HTTP  →  src/routes/       (lớp API: kiểm tra đầu vào, vai trò, đổi lỗi thành mã HTTP)
                                                    ↓
                                               src/services/     (lớp nghiệp vụ: quy tắc BR-01…BR-07, giao dịch; KHÔNG có req, res, mã HTTP)
                                                    ↓
                                               src/repositories/ (lớp lưu trữ: chỉ SQL)  →  PostgreSQL (db/schema.sql)
```

| Thư mục / tệp | Vai trò |
|---------------|---------|
| `src/routes/` | `auth.routes.js`, `ticket.routes.js`, `appointment.routes.js` |
| `src/services/` | `assign.service.js` (gợi ý, phân công, phân công lại), `appointment.service.js` (đặt lịch, chống trùng, xác nhận, hủy), `ticket.service.js` (CRUD phiếu), `auth.service.js`, `token.js`, `validation.js` (hàm thuần) |
| `src/repositories/` | `ticket`, `technician`, `appointment`, `assignment`, `customer` (mỗi tệp một nhóm bảng) |
| `src/middleware/` | `auth.js` (xác thực, phân quyền), `error.js` (**nơi duy nhất** đổi mã lỗi nghiệp vụ → mã HTTP) |
| `src/db/` | `pool.js` (kết nối, giao dịch), `migrate.js` (áp dụng `db/schema.sql` đúng một lần, `--seed` nạp dữ liệu mẫu) |
| `src/config.js`, `src/errors.js`, `src/app.js`, `src/server.js` | cấu hình từ `.env`, hai loại lỗi (`DomainError`, `AppError`), dựng ứng dụng, khởi động |
| `src/frontend/` | `pages/` (4 màn hình), `components/` (`DataState` ba trạng thái), `api/` (nơi duy nhất gọi mạng) |
| `db/` | `schema.sql` (6 bảng, ràng buộc `EXCLUDE` chống trùng lịch), `seed.sql` (dữ liệu mẫu, chạy lại được) |
| `test/`, `scripts/` | kiểm thử; `e2e.js` (luồng chính), `reset-demo.js` |
| `docs/` | hồ sơ thiết kế và tài liệu nộp bài (mục 8) |

Giải thích từng hàm: [`docs/giai-thich-ham.md`](docs/giai-thich-ham.md).

### Quy tắc nghiệp vụ nằm ở đâu

| Quy tắc | Nơi thực hiện |
|---------|---------------|
| BR-01, BR-02 gợi ý đúng tay nghề, địa bàn, còn hoạt động | `technician.repository.js` → `suggestFor` |
| BR-03 tối đa 8 phiếu mở mỗi kỹ thuật viên | `assign.service.js` → `assign`, `reassign` (đếm bằng `countOpenTickets`) |
| BR-04 mỗi phiếu một kỹ thuật viên | cột `ticket.technician_id` và ràng buộc `ck_ticket_assignee` trong `db/schema.sql` |
| BR-05 một kỹ thuật viên không có hai lịch chồng nhau | `appointment.service.js` → `create` (khóa dòng + kiểm tra) và ràng buộc `ex_appt_no_overlap` |
| BR-06 giờ làm việc 08:00–17:30, thứ Hai–thứ Bảy, 15–120 phút | `validation.js` → `validateAppointmentInput` |
| BR-07 chỉ đặt lịch với người đang phụ trách phiếu | `appointment.service.js` → `create` |
| NFR2 hai quản lý thao tác đồng thời không phá quy tắc | `SELECT … FOR UPDATE` trong `assign`, `reassign`, `create`; có test 10 và 4 yêu cầu song song |
| NFR3 phân quyền ở phía server | `middleware/auth.js` → `requireRole`; phạm vi dữ liệu trong `ticket.service.js`, `appointment.service.js` |

## 6. Kiểm thử

Một lệnh: `npm test` (69 test, cần `TEST_DATABASE_URL` cho nhóm tích hợp). Có thể chạy từng nhóm: `node --test test/validation.test.js`.

| Loại | Tệp | Số test | Cần CSDL |
|------|-----|---------|----------|
| Đơn vị | `validation.test.js`, `token.test.js`, `client.test.js`, `config.test.js`, `errors.test.js` | 33 | không |
| Kiến trúc (đọc mã nguồn, kiểm tách lớp) | `architecture.test.js` | 5 | không |
| Tích hợp trên PostgreSQL thật | `api.integration.test.js` | 31 | có |

Mỗi nhóm có đủ ba loại tình huống: **luồng đúng** (phân công, đặt lịch, tạo phiếu thành công), **giá trị biên** (lịch liền kề 09:30 hợp lệ nhưng chồng 1 phút bị từ chối; token hết hạn đúng giây `exp`; `device_model` đúng 100 ký tự; đúng 8 yêu cầu đồng thời) và **dữ liệu sai** (thiếu trường, sai định dạng, mã không tồn tại, JSON hỏng, token sửa nội dung). Chạy lại lần hai: test kiểm tra `migrate` và `seed` hai lần không nhân đôi dữ liệu. Suy giảm có kiểm soát: test mô phỏng mất kết nối PostgreSQL và kiểm `503`.

## 7. Trạng thái chức năng (tag v0.2)

| Hạng mục | Trạng thái |
|----------|-----------|
| FR1 gợi ý, FR2 phân công, FR3 phân công lại (lý do bắt buộc, lịch hẹn đi theo) | Xong, có giao diện và test |
| FR4–FR5 đặt lịch và chặn trùng lịch | Xong, có giao diện và test đồng thời |
| FR6 kỹ thuật viên xem phiếu và lịch của mình, FR7 khách xem lịch, FR8 khách xác nhận | Xong, có giao diện |
| Đăng nhập demo, token 60 phút, phân quyền phía server (NFR3) | Xong |
| CRUD phiếu bảo hành (tạo, sửa, xóa) | Xong ở mức API (không có màn hình nhập phiếu; TD-16) |
| Giao diện | 4 màn hình bám wireframe M1–M3, mỗi màn hình đủ ba trạng thái (đang tải, rỗng, lỗi + *Thử lại*) |
| Ngoài phạm vi | nhắc lịch qua SMS, tự động phân công, bảng tài khoản người dùng thật |

## 8. Tài liệu

| Tệp | Nội dung |
|-----|----------|
| `docs/thay-doi-thiet-ke.md` | nhật ký thay đổi thiết kế so với BT1 (TD-01 … TD-19) và bảng tổng hợp |
| `docs/ai-disclosure.md` | bảng khai báo sử dụng công cụ AI |
| `docs/bug-log.md` | nhật ký lỗi đã gặp và cách gỡ (tái lập, khoanh vùng, sửa nguyên nhân, xác nhận) |
| `docs/giai-thich-ham.md` | giải thích từng hàm trong dự án |
| `docs/api-contract.md` | hợp đồng API |
| `docs/srs.md`, `docs/user-stories.md` | SRS 6 mục, 7 User Story, bảng truy vết |
| `docs/architecture.md`, `docs/wireframe.md` | kiến trúc và 3 câu lập luận; wireframe và đối chiếu giao diện |
| `docs/*.drawio`, `docs/export/` | sơ đồ gốc (Use Case, kiến trúc, ERD, wireframe) và ảnh xuất |
| `docs/sprint1-chang-2-3.md`, `docs/buoi10.md` | báo cáo Sprint 1 và Sprint 2 kèm ảnh kết quả (`docs/anh-ket-qua/`, `docs/anh-buoi10/`) |

## 9. Bảo mật và quy ước

- `.env` không nằm trong repo (đã có trong `.gitignore`); `.env.example` chỉ có tên biến và giá trị mẫu.
- Mã nguồn không chứa mật khẩu hay khóa thật: thiếu `DATABASE_URL` thì báo lỗi chỉ cách khắc phục; thiếu `JWT_SECRET` khi phát triển thì dùng khóa ngẫu nhiên cho lần chạy đó, còn khi `NODE_ENV=production` thì từ chối chạy.
- Commit theo Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).
