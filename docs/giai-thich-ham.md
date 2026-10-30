# Giải thích các hàm trong dự án

Tài liệu này mô tả từng hàm theo thứ tự một yêu cầu đi qua hệ thống: cấu hình → lớp API → lớp nghiệp vụ → lớp lưu trữ → giao diện → kiểm thử. Mỗi bảng cho biết hàm **làm gì**, **ai gọi**, và **vì sao viết như vậy** (khi có điểm đáng chú ý). Tên tệp tính từ thư mục gốc của repo.

## 0. Bức tranh chung

```
POST /api/v1/tickets/T-2026-0042/assignment      (quản lý bấm "Phân công")
  src/frontend/pages/TicketDetailPage.js → assign()
    src/frontend/api/ticket.api.js → assignTechnician()
      src/frontend/api/client.js → request()                      ── mạng ──▶
  src/app.js → middleware/auth.js authenticate() → requireRole('MANAGER')
    routes/ticket.routes.js (kiểm tra đầu vào)
      services/assign.service.js → assign()                        (quy tắc nghiệp vụ, giao dịch)
        db/pool.js → withTransaction()
          repositories/ticket.repository.js → findByCode(forUpdate)
          repositories/technician.repository.js → findByCode, skillLevel, countOpenTickets
          repositories/ticket.repository.js → assign()
          repositories/assignment.repository.js → insert()
  lỗi nghiệp vụ (DomainError) ──▶ middleware/error.js errorHandler() ──▶ mã HTTP + JSON { error: { code, message } }
```

Quy ước ba lớp (có `test/architecture.test.js` kiểm tự động):

| Lớp | Được làm | Không được làm |
|-----|----------|----------------|
| `routes/`, `middleware/` | đọc `req`, kiểm tra đầu vào, kiểm tra vai trò, trả `res`, ném `AppError` có mã HTTP | chứa quy tắc nghiệp vụ, viết SQL |
| `services/` | quy tắc nghiệp vụ, mở giao dịch, ném `DomainError` (chỉ có `code`) | dùng `req`/`res`, nhắc tới mã HTTP, viết SQL |
| `repositories/` | viết SQL, trả dữ liệu thô | biết về HTTP, ném lỗi nghiệp vụ |

## 1. Cấu hình và lỗi

### `src/config.js`
Đọc biến môi trường từ `.env` (qua `dotenv`) và xuất một đối tượng cấu hình.

| Thành phần | Làm gì |
|------------|--------|
| `port` | cổng của API, mặc định 3000 |
| `get databaseUrl()` | trả `DATABASE_URL`; **thiếu thì ném lỗi** chỉ cách làm (`cp .env.example .env`). Dùng getter (đọc lúc cần) để các test đơn vị không cần CSDL vẫn nạp được tệp này |
| `get jwtSecret()` | trả `JWT_SECRET`; thiếu thì khi phát triển sinh khóa ngẫu nhiên 64 ký tự hex (có cảnh báo, nhớ trong tiến trình), khi `NODE_ENV=production` thì ném lỗi |
| `demoPassword` | mật khẩu chung của 4 tài khoản demo |
| `maxSuggestLimit`, `workStartMinutes`, `workEndMinutes`, `vnOffsetMinutes` | hằng số nghiệp vụ: tối đa 20 gợi ý; 08:00 = 480 phút; 17:30 = 1050 phút; múi giờ +07:00 = 420 phút |

### `src/errors.js`
| Lớp | Dùng ở đâu | Ý nghĩa |
|-----|-----------|---------|
| `DomainError(code, message, extra)` | `services/`, `validation.js`, `token.js` | lỗi nghiệp vụ, **không biết HTTP**; `extra` mang thông tin kèm theo (ví dụ lịch đang chiếm khung giờ) |
| `AppError(status, code, message, extra)` | `routes/`, `middleware/` | lỗi của lớp API, mang sẵn mã HTTP |

### `src/middleware/error.js`
| Hàm | Làm gì |
|-----|--------|
| `STATUS_BY_CODE` | bảng **duy nhất** đổi `error.code` → mã HTTP (400, 401, 403, 404, 409, 503). Mã không có trong bảng → 500 |
| `isDatabaseDown(err)` | trả `true` nếu lỗi là mất kết nối PostgreSQL (`ECONNREFUSED`, `57P01`, …), kể cả `AggregateError` của Node 20+ (kết nối `localhost` thử cả IPv6 lẫn IPv4) |
| `notFound(req, res, next)` | đường dẫn không tồn tại → `AppError 404 NOT_FOUND` |
| `errorHandler(err, req, res, next)` | nơi **mọi lỗi** đi qua cuối cùng. `AppError` → giữ mã; `DomainError` → tra `STATUS_BY_CODE`; JSON hỏng → 400 `INVALID_JSON`; mất CSDL → 503 `DATABASE_UNAVAILABLE`; lỗi lạ → 500 với câu chung (không lộ nội dung lỗi nội bộ, chỉ ghi log phía server) |

### `src/middleware/auth.js`
| Hàm | Làm gì |
|-----|--------|
| `authenticate(req, res, next)` | có header `Authorization: Bearer …` → kiểm token bằng `token.verify`, **sai hoặc hết hạn thì 401 ngay, không quay về cách giả lập**. Không có `Authorization` → đọc `X-User`, `X-Role`, `X-User-Code` (dùng cho curl và test). Gắn `req.user = { name, role, code }` |
| `requireRole(...roles)` | trả middleware chỉ cho các vai trò liệt kê đi qua, ngược lại `AppError 403 FORBIDDEN`. Đây là chỗ thực thi NFR3 ở phía server |

## 2. Khởi động và cơ sở dữ liệu

### `src/server.js`
Nạp `app` và `config`, gọi `app.listen(port)`; không chứa logic khác.

### `src/app.js`
Dựng ứng dụng Express: `express.json()`; phục vụ giao diện tĩnh ở `/app`; `/` chuyển hướng tới `/app/`; `GET /api` liệt kê endpoint; **`GET /health`** chạy `SELECT 1` (200 `{status:'ok', database:'up'}` hoặc 503 `{status:'degraded', database:'down'}`); gắn `/api/v1/auth` (không cần token), `/api/v1/tickets` và `/api/v1/appointments` (đi qua `authenticate`); cuối cùng `notFound` và `errorHandler`.

### `src/db/pool.js`
| Hàm | Làm gì |
|-----|--------|
| `pool` | `pg.Pool` dùng chung. Có `pool.on('error')` để kết nối rảnh bị ngắt chỉ ghi log, không làm sập tiến trình |
| `withTransaction(fn, db = pool)` | mượn một kết nối, `BEGIN`, chạy `fn(client)`, `COMMIT`; có lỗi thì `ROLLBACK` rồi ném lại **lỗi gốc**; luôn trả kết nối. Mọi thao tác "kiểm tra rồi ghi" (NFR2) chạy trong hàm này |

### `src/db/migrate.js`
| Hàm | Làm gì |
|-----|--------|
| `migrate(databaseUrl, { seed })` | (1) lấy khóa tư vấn `pg_advisory_lock(727001)` để hai tiến trình không migrate cùng lúc; (2) tạo bảng `schema_migrations` nếu chưa có; (3) nếu chưa áp dụng `001_schema`: nếu bảng đã tồn tại (tạo tay) thì chỉ ghi nhận, ngược lại chạy `db/schema.sql` trong một giao dịch rồi ghi nhận; (4) nếu `seed` thì chạy `db/seed.sql` (dùng `ON CONFLICT DO NOTHING` nên chạy lại không nhân đôi); (5) nhả khóa, đóng kết nối. Chạy lần hai in "đã áp dụng trước đó – bỏ qua" |
| Khối `require.main === module` | khi gọi `npm run migrate` / `npm run seed` thì đọc `.env`, gọi `migrate`, lỗi thì in `Migration lỗi:` và thoát mã 1 |

## 3. Lớp API – `src/routes/`

Tất cả dùng chung `wrap(fn)`: bọc hàm `async` để lỗi bị ném (hoặc `reject`) chuyển sang `next(err)` thay vì làm treo yêu cầu.

### `auth.routes.js`
| Route | Làm gì |
|-------|--------|
| `POST /login` | kiểm `username`, `password` là chuỗi không rỗng (sai → 400 `VALIDATION_ERROR`), gọi `authService.login` |
| `GET /me` | trả `req.user` của token hiện tại |

### `ticket.routes.js` (mọi route đã qua `authenticate`)
| Route | Vai trò | Làm gì |
|-------|---------|--------|
| `POST /` | MANAGER | gọi `ticketService.create(req.body)` → 201 |
| `GET /` | tất cả | `ticketService.list({ status }, req.user)` |
| `GET /:ticket_code` | tất cả | kiểm `ticket_code` đúng `T-YYYY-NNNN` rồi `ticketService.get` |
| `PATCH /:ticket_code` | MANAGER | `ticketService.update` |
| `DELETE /:ticket_code` | MANAGER | `ticketService.remove` |
| `GET /:ticket_code/technician-suggestions` | MANAGER | kiểm `limit` (1–20), `purpose` (`assign`/`reassign`) rồi `assignService.suggest` |
| `POST /:ticket_code/assignment` | MANAGER | kiểm `technician_code`, `note` ≤ 255 rồi `assignService.assign` → 201 |
| `POST /:ticket_code/reassignment` | MANAGER | thêm kiểm `reason` bắt buộc 1–255 ký tự rồi `assignService.reassign` → 200 |

### `appointment.routes.js`
| Route | Vai trò | Làm gì |
|-------|---------|--------|
| `POST /` | MANAGER | `service.create(body, user)` → 201 |
| `GET /` | tất cả | lọc `technician_code`, `ticket_code`, `status`; service tự thu hẹp theo vai trò |
| `GET /:code` | tất cả | `service.get` |
| `PATCH /:code` | tất cả (service phân quyền) | đổi trạng thái (xác nhận) |
| `DELETE /:code` | MANAGER | hủy mềm = `changeStatus(code, 'CANCELLED')` |

## 4. Lớp nghiệp vụ – `src/services/`

### `validation.js` (hàm thuần, không đụng CSDL nên test đơn vị được)
| Hàm / hằng | Làm gì |
|------------|--------|
| `TICKET_RE`, `TECH_RE`, `ISO_RE`, `PHONE_RE` | biểu thức chính quy cho mã phiếu `T-YYYY-NNNN`, mã kỹ thuật viên `TECH-NNN`, thời điểm ISO 8601 kèm múi giờ, số điện thoại 9–15 chữ số |
| `SKILLS`, `TYPES` | bốn tay nghề; hai loại lịch `DROP_OFF`/`PICK_UP` |
| `vnParts(date)` | đổi một thời điểm sang giờ Việt Nam, trả `{ minutes (từ 00:00), weekday, ymd }` để kiểm khung giờ và ngày trong tuần |
| `toVnIso(date)` | định dạng thời điểm thành `2026-10-06T09:00:00+07:00` cho phản hồi API |
| `validateAppointmentInput(body, now)` | kiểm toàn bộ đầu vào đặt lịch: mã, loại, thời lượng 15–120 (mặc định 30), `start_at` là ISO, ở tương lai, không Chủ nhật, nằm trong 08:00–17:30 **kể cả giờ kết thúc** (BR-06). Gom mọi lỗi vào `details` rồi ném `DomainError('VALIDATION_ERROR')`. Truyền `now` vào để test không phụ thuộc đồng hồ |
| `validateTicketInput(body, { partial })` | kiểm dữ liệu tạo phiếu (`partial=false`: đủ 4 trường) hoặc sửa phiếu (`partial=true`: ít nhất một trường, không đổi khách). Trả tên trường nội bộ đã cắt khoảng trắng |

### `token.js`
Token dạng `<payload>.<chữ ký>`: payload là JSON mã hóa base64url, chữ ký là HMAC-SHA256 — không cần thư viện ngoài.

| Hàm | Làm gì |
|-----|--------|
| `b64u(buf)`, `hmac(data, secret)` | trợ giúp mã hóa base64url và tính chữ ký |
| `sign(user, { secret, nowMs, ttlSeconds })` | tạo token có `iat` và `exp = iat + 3600`. Thiếu `secret` thì ném lỗi (không tạo token yếu). Nhận `nowMs` để test được mà không chờ 60 phút |
| `verify(token, { secret, nowMs })` | kiểm định dạng; so chữ ký bằng `timingSafeEqual` (chống dò thời gian); giải mã payload; `nowMs/1000 >= exp` thì `TOKEN_EXPIRED` (**đúng thời điểm hết hạn là đã hết hạn**); sai bất kỳ bước nào khác → `TOKEN_INVALID`. Trả `{ name, role, code }` |

### `auth.service.js`
| Hàm | Làm gì |
|-----|--------|
| `DEMO_USERS` | 4 tài khoản demo (không có bảng người dùng trong ERD L4) |
| `same(a, b)` | so sánh chuỗi bằng `timingSafeEqual` |
| `login(username, password, nowMs)` | tìm tài khoản, so mật khẩu với `config.demoPassword`; sai → `INVALID_CREDENTIALS` (cùng một câu cho cả "sai tên" và "sai mật khẩu" để không lộ tài khoản nào tồn tại); đúng → token 60 phút kèm thông tin người dùng |

### `ticket.service.js`
| Hàm | Làm gì |
|-----|--------|
| `STATUSES` | bốn trạng thái phiếu |
| `toApi(row)` | đổi một dòng CSDL (snake_case phẳng) thành đối tượng API (có `customer`, `technician` lồng nhau, giờ +07:00) |
| `scope(user)` | điều kiện lọc theo vai trò: quản lý không lọc; kỹ thuật viên chỉ phiếu của mình; khách chỉ phiếu theo số điện thoại. Thiếu mã người dùng → 403 |
| `allowed(user, row)` | một phiếu có thuộc phạm vi của người dùng không |
| `list({ status }, user)` | kiểm `status`, gọi repository kèm phạm vi, đổi sang API |
| `get(code, user)` | lấy một phiếu + lịch sử phân công; không có → `TICKET_NOT_FOUND`; không thuộc người xem → `FORBIDDEN` |
| `create(body, now)` | kiểm đầu vào, tìm khách theo số điện thoại (không có → `CUSTOMER_NOT_FOUND`), sinh mã `T-<năm VN>-NNNN` trong giao dịch, trả phiếu mới ở trạng thái Chờ phân công |
| `update(code, body)` | kiểm đầu vào (partial), **khóa dòng phiếu** (`FOR UPDATE`) rồi chỉ cho sửa khi còn Chờ phân công (`TICKET_NOT_EDITABLE`); khóa dòng để không đua với một lần phân công đang diễn ra |
| `remove(code)` | khóa dòng phiếu, chỉ xóa khi còn Chờ phân công (`TICKET_NOT_DELETABLE`) |

### `assign.service.js`
| Hàm | Làm gì |
|-----|--------|
| `hooks.afterChecks` | **móc chỉ dành cho test**: mặc định không làm gì; test gán hàm chờ vài mili giây vào đây để chèn độ trễ giữa "kiểm tra" và "ghi", ép cuộc đua xảy ra thật. Nhờ đó chứng minh khóa dòng cần thiết |
| `suggest(db, ticketCode, limit, purpose)` | FR1. `purpose='assign'`: phiếu phải Chờ phân công (`TICKET_NOT_WAITING`). `purpose='reassign'`: phiếu phải Đã phân công (`TICKET_NOT_ASSIGNED`) và loại người đang phụ trách khỏi danh sách. Gọi `technicianRepo.suggestFor` |
| `assign({ ticketCode, technicianCode, note, user })` | FR2, trong **một giao dịch**: khóa dòng phiếu rồi dòng kỹ thuật viên; [1a] phiếu đã có người → `TICKET_ALREADY_ASSIGNED`; [4b] không hoạt động, thiếu tay nghề hoặc khác địa bàn → `TECHNICIAN_NOT_ELIGIBLE`; [4a] đã đủ `max_open_tickets` phiếu mở → `TECHNICIAN_OVERLOADED`; qua hết thì cập nhật phiếu và ghi lịch sử `ASSIGN` |
| `reassign({ … reason … })` | FR3. Khóa phiếu → kiểm Đã phân công → kiểm người mới khác người cũ (`SAME_TECHNICIAN`) → **khóa cả hai kỹ thuật viên theo thứ tự khóa chính** (`lockMany`, tránh hai lần phân công ngược chiều khóa chết nhau) → kiểm đủ điều kiện và tải → chuyển các lịch hẹn chưa diễn ra sang người mới (nếu trùng lịch thì `APPOINTMENT_CONFLICT` và cả giao dịch quay lui) → cập nhật phiếu → ghi lịch sử `REASSIGN` kèm lý do |

### `appointment.service.js`
| Hàm | Làm gì |
|-----|--------|
| `toApi(row)`, `conflictError(clash)` | đổi dòng CSDL sang API; dựng `APPOINTMENT_CONFLICT` kèm lịch đang chiếm khung giờ |
| `hooks.afterChecks` | móc cho test, như ở `assign.service.js` |
| `create(body, user, now)` | FR4, FR5 (UC3 gồm UC4). Kiểm đầu vào bằng `validateAppointmentInput`; trong giao dịch: **khóa dòng kỹ thuật viên** trước (các yêu cầu của cùng một người xếp hàng, tránh deadlock — xem `docs/bug-log.md` BUG-01) → đọc phiếu **sau khi khóa** (để thấy người phụ trách mới nếu vừa phân công lại) → BR-07 người đặt phải là người phụ trách (`TECHNICIAN_NOT_ASSIGNED`) → tìm lịch chồng (`findOverlap`) → ghi. Nếu CSDL vẫn báo `23P01` (ràng buộc `EXCLUDE`) thì tra lại lịch xung đột và trả `APPOINTMENT_CONFLICT`: đây là chốt chặn cuối |
| `list(filters, user)` | FR6, FR7: khách và kỹ thuật viên bị buộc lọc theo mã của chính mình, không dựa vào tham số người gửi |
| `get(code, user)` | một lịch hẹn; kỹ thuật viên và khách chỉ xem của mình (`FORBIDDEN`) |
| `TRANSITIONS`, `changeStatus(code, status, user)` | FR8. Chỉ nhận `CONFIRMED` hoặc `CANCELLED`; chỉ quản lý được hủy; kỹ thuật viên không đổi được trạng thái; khách chỉ xác nhận lịch của phiếu mình. Chuyển hợp lệ: Chờ xác nhận → Đã xác nhận hoặc Đã hủy; Đã xác nhận → Đã hủy; sai → `INVALID_STATUS_TRANSITION`. Khóa dòng lịch hẹn khi đổi |

## 5. Lớp lưu trữ – `src/repositories/` (chỉ SQL)

Mỗi hàm nhận `db` đầu tiên: có thể là `pool` (đọc đơn lẻ) hoặc `client` của một giao dịch.

### `ticket.repository.js`
| Hàm | Làm gì |
|-----|--------|
| `findByCode(db, code, { forUpdate })` | lấy phiếu; `forUpdate` → `FOR UPDATE` (khóa dòng) |
| `assign(db, ticketId, technicianId)` | đặt trạng thái `ASSIGNED` và người phụ trách (dùng cho cả phân công lần đầu và phân công lại) |
| `list(db, { status, technicianCode, customerPhone })` | danh sách phiếu kèm khách và kỹ thuật viên, lọc động, sắp theo mã |
| `findView(db, code)` | một phiếu ở dạng "xem" (có tên khách, kỹ thuật viên) |
| `insert(db, { customerId, deviceModel, requiredSkill, serviceArea, year })` | lấy khóa tư vấn `727002`, tính mã kế tiếp = số lớn nhất trong năm + 1 (đệm 4 chữ số), `INSERT`, trả mã. Khóa đảm bảo hai yêu cầu tạo cùng lúc không nhận cùng mã |
| `update(db, ticketId, fields)` | cập nhật các trường được gửi (`COALESCE`: trường `undefined` giữ nguyên) |
| `remove(db, ticketId)` | xóa dòng phiếu |

### `technician.repository.js`
| Hàm | Làm gì |
|-----|--------|
| `findByCode(db, code, { forUpdate })` | lấy kỹ thuật viên, có thể khóa dòng |
| `countOpenTickets(db, technicianId)` | **đếm** phiếu `ASSIGNED`/`IN_PROGRESS` của người đó (khối lượng việc không lưu thành cột để khỏi lệch số liệu) |
| `skillLevel(db, technicianId, skillCode)` | cấp tay nghề (1–3) hoặc `null` nếu không có |
| `suggestFor(db, { skillCode, serviceArea, limit, excludeTechnicianId })` | FR1: kỹ thuật viên đang hoạt động, đúng tay nghề, cùng địa bàn, còn dưới ngưỡng; xếp theo số phiếu mở tăng dần, bằng nhau thì cấp tay nghề cao trước, rồi theo mã (kết quả ổn định). Có thể loại một người (phân công lại). Dùng index `idx_ticket_technician_status` (NFR1) |
| `lockMany(db, ids)` | khóa nhiều dòng kỹ thuật viên **theo thứ tự khóa chính** |

### `appointment.repository.js`
| Hàm | Làm gì |
|-----|--------|
| `findOverlap(db, technicianId, startAt, endAt)` | lịch chưa hủy của người đó giao với khoảng `[start, end)`; dùng `tstzrange`, nên lịch liền kề (kết thúc 09:30, bắt đầu 09:30) **không** bị coi là trùng |
| `findByCode(db, code, { forUpdate })` | một lịch hẹn kèm mã phiếu, kỹ thuật viên, số điện thoại khách |
| `insert(db, {…})` | chèn với mã tạm rồi đổi thành `APT-` + khóa chính đệm 4 chữ số (mã tuần tự, cùng giao dịch) |
| `list(db, filters)` | danh sách lọc động theo kỹ thuật viên, phiếu, trạng thái, khách; sắp theo giờ bắt đầu |
| `setStatus(db, code, status)` | đổi trạng thái rồi đọc lại |
| `moveFutureToTechnician(db, ticketId, technicianId)` | FR3: chuyển các lịch chưa hủy và chưa diễn ra của phiếu sang người mới, trả số lịch đã chuyển; trùng lịch thì CSDL ném `23P01` |

### `assignment.repository.js`
| Hàm | Làm gì |
|-----|--------|
| `insert(db, {…})` | ghi một dòng lịch sử phân công, mã `ASG-NNNN` |
| `listByTicket(db, ticketId)` | lịch sử của một phiếu, mới nhất trước |

### `customer.repository.js`
| Hàm | Làm gì |
|-----|--------|
| `findByPhone(db, phone)` | tìm khách theo số điện thoại (dùng khi tạo phiếu) |

## 6. Giao diện – `src/frontend/`

Giao diện là tệp tĩnh, chạy ngay trong trình duyệt (ES modules), không có bước build.

### `api/client.js` – nơi **duy nhất** gọi mạng
| Hàm | Làm gì |
|-----|--------|
| `ApiError(status, code, message, extra)` | lỗi chuẩn hóa mà mọi trang nhận được |
| `memoryStorage()` | kho tạm trong bộ nhớ khi trình duyệt chặn `localStorage` |
| `createClient({ baseUrl, fetchFn, storage, onUnauthorized })` | dựng bộ gọi API; nhận `fetchFn` và `storage` giả để test không cần trình duyệt. Trả `get`, `post`, `patch`, `del`, `getToken`, `getUser`, `setSession`, `clearSession` |
| `request(method, path, body)` (bên trong) | tự gắn `Bearer` token; lỗi mạng → `ApiError(0, 'NETWORK_ERROR')` kèm câu hướng dẫn; HTTP lỗi → `ApiError` giữ nguyên `code` và dữ liệu kèm; **401 khi đang có token → xóa phiên và gọi `onUnauthorized`** (về trang đăng nhập); 401 khi chưa có token (sai mật khẩu) thì không chuyển trang |
| `getClient()` | bộ gọi dùng chung của ứng dụng, `onUnauthorized` lưu câu nhắc (hết hạn hay chưa đăng nhập) rồi chuyển về `#/login` |

### `api/auth.api.js`, `ticket.api.js`, `appointment.api.js`
Các hàm mỏng, mỗi hàm một lời gọi API, giữ nguyên tên trường snake_case của backend.

| Hàm | Gọi |
|-----|-----|
| `login`, `logout`, `currentUser` | `POST /auth/login` và quản lý phiên |
| `listTickets(status)`, `getTicket(code)` | `GET /tickets`, `GET /tickets/{mã}` |
| `getSuggestions(code, limit, purpose)` | `GET …/technician-suggestions` |
| `assignTechnician`, `reassignTechnician` | `POST …/assignment`, `POST …/reassignment` |
| `listAppointments(params)`, `createAppointment`, `confirmAppointment`, `cancelAppointment` | `GET`/`POST /appointments`, `PATCH`, `DELETE` theo mã |

### `components/`
| Hàm | Làm gì |
|-----|--------|
| `mountDataState(container, { load, render, isEmpty, emptyText })` | **bọc mọi chỗ hiển thị dữ liệu**: hiện "Đang tải…", gọi `load`; rỗng → câu giải thích; lỗi → thông báo + nút *Thử lại*; thành công → `render`. Biến `seq` bỏ qua kết quả của lần tải cũ nếu người dùng bấm *Thử lại* liên tiếp. Trả `{ reload }` |
| `h(tag, attrs, ...children)` | dựng phần tử DOM; dùng `textContent`/`createTextNode` nên dữ liệu từ API không chèn được mã HTML (chống XSS) |
| `badge`, `ticketBadge`, `apptBadge` | nhãn trạng thái có màu |
| `fmtTime(iso)` | `2026-10-26T09:00:00+07:00` → `26/10/2026 09:00` (cắt chuỗi, không đổi múi giờ) |
| `table(headers, rows)` | dựng bảng trong khung cuộn ngang |
| `banner(kind, …)` | thông báo `ok`, `error`, `warn`, `info` (vai trò `alert` chỉ cho `error`) |
| `endTimeText(startLocal, minutes)` | giờ kết thúc dự kiến `HH:MM` cho biểu mẫu đặt lịch; thiếu dữ liệu → `—` |
| `TicketSearch(current)` | ô "Mã phiếu bảo hành" của M1: kiểm định dạng rồi chuyển tới trang chi tiết, không gọi mạng |

### `main.js`
| Hàm | Làm gì |
|-----|--------|
| `parse()` | tách `#/đường-dẫn?truy-vấn` |
| `navigate(hash)` | đổi `location.hash` hoặc vẽ lại nếu đang ở đó |
| `renderNav(user)` | thanh điều hướng theo vai trò (quản lý: Phiếu bảo hành, Lịch hẹn; người khác: Phiếu và lịch hẹn của tôi) + nút Đăng xuất |
| `render()` | chưa đăng nhập → về `#/login`; ngược lại chọn trang theo đường dẫn và vai trò |

### `pages/`
| Trang | Hàm chính | Làm gì |
|-------|-----------|--------|
| `LoginPage.js` | `LoginPage` | biểu mẫu đăng nhập, nút điền sẵn 4 tài khoản demo, hiện câu nhắc "hết phiên" nếu có; sai mật khẩu báo ngay tại biểu mẫu |
| `TicketListPage.js` | `TicketListPage` | quản lý: tìm phiếu, lọc trạng thái, bảng đủ cột + cột **Thao tác** theo trạng thái (Phân công / Đặt lịch / Phân công lại); kỹ thuật viên và khách: bảng 4 cột. Bên trong: `actions(t)`, `summary(rows)`, `load(status)` |
| `TicketDetailPage.js` | `TicketDetailPage` | M1: thông tin phiếu; phiếu Chờ phân công → bảng gợi ý + ghi chú; phiếu Đã phân công → dải thông tin + khối **Phân công lại** (lý do bắt buộc); lịch sử phân công. Bên trong: `renderTicket`, `assign` (xử lý [4a], [4b]: làm mới gợi ý), `reassign` (chặn khi thiếu lý do ngay trên giao diện) |
| `AppointmentPage.js` | `AppointmentPage` | quản lý: M2 biểu mẫu đặt lịch + lịch trong ngày của kỹ thuật viên + danh sách; kỹ thuật viên, khách: tab Lịch hẹn. Bên trong: `act` (xác nhận/hủy), `form`, `lookup` (tìm phiếu → tự điền kỹ thuật viên phụ trách), `refreshDay` (bảng lịch đã có trong ngày), xử lý 409 hiện nút *Chọn giờ khác* |
| `MyWorkPage.js` | `MyWorkPage` | M3: hai tab Phiếu \| Lịch hẹn cho kỹ thuật viên và khách; tái dùng `TicketListPage` và `AppointmentPage` ở chế độ `embedded` |

## 7. Tập lệnh – `scripts/`

| Tệp / hàm | Làm gì |
|-----------|--------|
| `e2e.js` → `nextMonday(hour, minute)` | tính thứ Hai kế tiếp theo giờ VN (luôn ở tương lai) để lịch hẹn hợp lệ ở mọi thời điểm chạy |
| `e2e.js` → `call(label, method, path, opts)` | gọi API thật, in đầu vào và đầu ra, đếm bước đạt/lỗi |
| `e2e.js` (khối chính) | xóa sạch CSDL **test**, migrate + seed, mở máy chủ ở cổng ngẫu nhiên, chạy 12 bước: đăng nhập quản lý → xem phiếu chờ → gợi ý → phân công → xem lại → đặt lịch → đặt trùng bị từ chối → khách đăng nhập, xem, xác nhận → kỹ thuật viên chỉ thấy lịch của mình → đối chiếu đầu ra |
| `reset-demo.js` | xóa mọi dữ liệu nghiệp vụ trong CSDL của `DATABASE_URL` rồi nạp lại dữ liệu mẫu |

## 8. Kiểm thử – `test/`

| Tệp | Nội dung chính |
|-----|----------------|
| `validation.test.js` | luồng đúng, biên (giờ 08:00, 17:30, thời lượng 15 và 120, Chủ nhật, đổi múi giờ), dữ liệu sai của lịch hẹn và phiếu |
| `token.test.js` | token hợp lệ, còn 1 giây, đúng 60 phút hết hạn, bị sửa nội dung, sai khóa, thiếu khóa |
| `client.test.js` | gắn Bearer token, 401 xóa phiên đúng một lần, 401 khi chưa có token, lỗi mạng, giữ dữ liệu kèm 409, phản hồi 500 không phải JSON |
| `config.test.js` | thiếu `DATABASE_URL`, khóa ngẫu nhiên, `production` bắt buộc `JWT_SECRET`, hằng số khung giờ |
| `errors.test.js` | ánh xạ mã lỗi → HTTP, JSON hỏng, mất kết nối → 503, lỗi lạ → 500 không lộ chi tiết |
| `architecture.test.js` | `services` không dùng `req`/`res`/mã HTTP/`AppError`; không có SQL ngoài `repositories`; `routes` không gọi thẳng `repositories`; `pages` không gọi `fetch` |
| `api.integration.test.js` | chạy trên PostgreSQL thật: gợi ý, phân công (kể cả [1a], [4a], [4b] và 10 yêu cầu đồng thời chỉ còn 1 chỗ), đặt lịch, chống trùng (kể cả 4 yêu cầu song song), phân quyền, đăng nhập và token, phân công lại, CRUD phiếu, `seed` chạy lại, mất kết nối CSDL |

Chạy: `npm test`. Các hàm trợ giúp trong `api.integration.test.js`: `call(method, path, opts)` gọi API thật và trả `{ status, body }`; `nextMonday(h, m)`; `login`, `bearer`.

## 9. Chuẩn bị trả lời khi giảng viên hỏi một hàm bất kỳ

Ba câu hỏi chuẩn của buổi demo, trả lời bằng chính mã của dự án:

**1. Vì sao chọn cách này mà không phải cách kia?** Ví dụ `assign`: "Em khóa dòng phiếu và dòng kỹ thuật viên bằng `SELECT … FOR UPDATE` trong cùng một giao dịch. Cách khác là kiểm tra bằng mã rồi ghi, nhưng hai quản lý bấm cùng lúc sẽ cùng thấy kỹ thuật viên còn một chỗ và cùng ghi, vượt ngưỡng 8. Em đã thử: test 10 yêu cầu song song chỉ còn đúng 1 thành công, và bỏ khóa thì test đỏ." Ví dụ `seed.sql`: "Em nạp bằng `ON CONFLICT DO NOTHING` để chạy lại không nhân đôi; xóa rồi nạp lại cũng được nhưng mất lịch sử đã thêm."

**2. Nếu dữ liệu tăng gấp mười thì chỗ nào hỏng trước?** Chỗ yếu nhất là `GET /tickets` và `GET /appointments`: trả toàn bộ danh sách, **chưa phân trang**, nên màn hình danh sách chậm trước. Cách khắc phục: thêm `LIMIT`/`OFFSET` (hoặc phân trang theo khóa) và lọc ở server; cách đo: dùng `EXPLAIN ANALYZE` trên câu lệnh trong `ticket.repository.js` `list` và đo thời gian phản hồi bằng `curl -w`. Phần gợi ý kỹ thuật viên (`suggestFor`) đã dùng index `idx_ticket_technician_status`, `idx_technician_area_active`, `idx_skill_code_level` nên đỡ lo hơn.

**3. Chỉ cho thầy dòng mã chịu trách nhiệm cho việc này.**

| Việc | Tệp và hàm |
|------|------------|
| Chống trùng lịch (BR-05, NFR2) | `appointment.service.js` → `create` (khóa + `findOverlap`), `db/schema.sql` → `ex_appt_no_overlap` |
| Giới hạn 8 phiếu mở (BR-03) | `assign.service.js` → `assign`, đoạn `if (open >= tech.max_open_tickets)` |
| Lý do phân công lại bắt buộc (FR3) | `ticket.routes.js` (kiểm `reason`) và `db/schema.sql` → `ck_reassign_reason` |
| Phân quyền (NFR3) | `middleware/auth.js` → `requireRole`; `ticket.service.js` → `scope` |
| Token hết hạn đúng giây (NFR3) | `token.js` → `verify`, dòng `>= data.exp` |
| Đổi lỗi nghiệp vụ thành mã HTTP | `middleware/error.js` → `STATUS_BY_CODE`, `errorHandler` |
| Ba trạng thái giao diện | `components/DataState.js` → `mountDataState` |
| 401 đưa về trang đăng nhập | `api/client.js` → `request` |

Không tìm được dòng chịu trách nhiệm trong vài giây là dấu hiệu chưa hiểu phần mình nộp, nên nên tự mở thử từng dòng trong bảng trên trước khi demo.
