# Nhật ký thay đổi thiết kế so với BT1 (Buổi 8, 10 và 12)

Mỗi mục gồm 4 dòng: phản hồi, quyết định (SỬA hoặc GIỮ NGUYÊN), lý do, ảnh hưởng.

## TD-01 – Giảm User Story từ 9 xuống 7
- **Phản hồi:** Có 9 User Story, vượt mức 5–7.
- **Quyết định:** SỬA. Bỏ US8 (nhắc lịch qua SMS) và US9 (tự động phân công), chuyển sang mục "Ngoài phạm vi (WON'T)".
- **Lý do:** Hai story này là WON'T, không nằm trong phạm vi triển khai; giữ lại làm hồ sơ phình mà không có code tương ứng.
- **Ảnh hưởng:** `user-stories.md`, `srs.md` (bỏ FR9, UC9, actor SMS, còn 8 FR, 8 UC, 3 actor), `usecase.drawio`, `architecture.drawio/md` (bỏ ReminderJob và cổng SMS), `wireframe`, `consistency-check.md`.

## TD-02 – Thêm chú thích ký hiệu vào ảnh ERD
- **Phản hồi:** Ảnh ERD chưa có chú thích PK, FK, UQ; dòng "Ký hiệu" chỉ có trong file drawio.
- **Quyết định:** SỬA. Chèn khung chú thích "PK = khóa chính, FK = khóa ngoại, UQ = duy nhất" vào ngay trong ảnh và ghi lại ở chú thích dưới ảnh trong báo cáo.
- **Lý do:** Người chấm chỉ xem ảnh trong PDF/Word, không mở drawio.
- **Ảnh hưởng:** `erd.drawio`, `docs/export/erd.png`, mục 4 báo cáo.

## TD-03 – Sửa bố cục đặc tả UC2
- **Phản hồi:** Bảng các bước nằm trước sơ đồ, tiêu đề "Luồng chính" trống, thiếu mã UC và User Story liên quan.
- **Quyết định:** SỬA. Thứ tự mới: sơ đồ, rồi đầu đặc tả (UC2, US2 và US7, actor, tiền/hậu điều kiện), "Luồng chính" kèm bảng bước, "Luồng ngoại lệ" 1a/2a/4a/4b.
- **Lý do:** Đặc tả phải đọc được từ trên xuống và truy vết được sang User Story.
- **Ảnh hưởng:** Mục 2 báo cáo, `srs.md` mục 3.2.

## TD-04 – Hoàn thiện Phụ lục C (khai báo AI)
- **Phản hồi:** Còn "[Ghi: ...]" ở cột kiểm chứng; thiếu dòng cam kết, họ tên, MSSV, ngày.
- **Quyết định:** SỬA. Mỗi dòng ghi việc đã kiểm chứng cụ thể (chạy schema trên PostgreSQL 16, 22 test, đối chiếu API với DDL); thêm dòng cam kết kèm họ tên, MSSV, ngày.
- **Lý do:** Khai báo chưa hoàn thiện bị tính là không đạt.
- **Ảnh hưởng:** `ai-disclosure.md`, Phụ lục C.

## TD-05 – Bổ sung thông tin trang bìa và liên kết GitHub
- **Phản hồi:** Bìa thiếu MSSV, lớp, ngày nộp; "LinkGithub" chỉ là chữ.
- **Quyết định:** SỬA. Bìa có MSSV 2374802010126, lớp, ngày nộp; liên kết là URL đầy đủ bấm được.
- **Lý do:** Nhận diện bài nộp và truy cập được repo.
- **Ảnh hưởng:** Bìa và trang 2 của báo cáo, README.

## TD-06 – Backend chuyển từ MongoDB sang PostgreSQL
- **Phản hồi:** Backend kết nối MongoDB, trong khi thiết kế dùng PostgreSQL với EXCLUDE.
- **Quyết định:** SỬA. Backend dùng PostgreSQL 16 qua driver `pg`; bảng tạo từ `db/schema.sql` bằng `npm run migrate` trước khi viết API.
- **Lý do:** NFR2 cần ràng buộc `EXCLUDE USING gist` chống lịch chồng nhau và giao dịch với `SELECT … FOR UPDATE`; MongoDB không có ràng buộc loại trừ khoảng thời gian.
- **Ảnh hưởng:** `src/db/*`, `package.json`, `.env.example`; không đổi thiết kế CSDL.

## TD-07 – Khóa dòng kỹ thuật viên khi đặt lịch
- **Phản hồi:** (tự phát hiện khi viết test đồng thời) 4 yêu cầu đặt lịch chồng nhau gửi cùng lúc gây deadlock 40P01.
- **Quyết định:** SỬA. `appointment.service` khóa dòng `technician` trong giao dịch trước khi kiểm tra trùng; lỗi 23P01 của DB vẫn được đổi thành 409 làm chốt cuối.
- **Lý do:** Chỉ có kiểm tra bằng code là không đủ cho NFR2; test đột biến xác nhận bỏ khóa thì test đỏ.
- **Ảnh hưởng:** `src/services/appointment.service.js`, `test/api.integration.test.js`.

## TD-08 – Hợp đồng API khớp với code đang chạy
- **Phản hồi:** (tự rà) API contract chưa phản ánh xác thực giả lập và các endpoint đã làm.
- **Quyết định:** SỬA ở mức ghi chú: xác thực giả lập bằng header `X-User`, `X-Role`, `X-User-Code` (đăng nhập ngoài phạm vi); thêm GET danh sách, GET theo mã, PATCH trạng thái, DELETE (hủy mềm) cho `/appointments`; mã 401, 403.
- **Lý do:** CRUD của một thực thể là yêu cầu buổi 8.
- **Ảnh hưởng:** `docs/api-contract.md`.

## TD-09 – Giữ nguyên kiến trúc 4 lớp và 6 bảng
- **Phản hồi:** Không có phản hồi yêu cầu đổi.
- **Quyết định:** GIỮ NGUYÊN.
- **Lý do:** `src/` ánh xạ 1–1: `routes` = API, `services` = nghiệp vụ, `repositories` = lưu trữ; tên bảng trùng ERD, DDL, wireframe.
- **Ảnh hưởng:** Không.

---

## Sau Sprint 2 (Buổi 10, ngày 23/10/2026)

## TD-10 – Thêm đăng nhập bằng token 60 phút
- **Phản hồi:** (tự phát hiện khi làm giao diện) Giao diện phải đăng nhập và xử lý 401, nhưng thiết kế BT1 ghi đăng nhập là ngoài phạm vi, Sprint 1 chỉ dùng header giả lập.
- **Quyết định:** SỬA. Thêm `POST /auth/login` với 4 tài khoản demo và token ký HMAC hết hạn sau 60 phút (đúng NFR3); vẫn giữ header giả lập cho curl và kiểm thử.
- **Lý do:** NFR3 đã yêu cầu token hết hạn 60 phút; không có token thì không kiểm chứng được luồng "hết phiên → về trang đăng nhập". Không thêm bảng người dùng để ERD vẫn đúng 6 bảng.
- **Ảnh hưởng:** `src/services/token.js`, `auth.service.js`, `routes/auth.routes.js`, `middleware/auth.js`; `architecture.md` (dòng ngoài phạm vi), `api-contract.md` mục 7, `.env.example` (JWT_SECRET, DEMO_PASSWORD).

## TD-11 – Thêm API đọc phiếu và cho khách xem lịch hẹn
- **Phản hồi:** (tự rà wireframe) M1 và M3 cần danh sách và chi tiết phiếu, M3 cần khách xem và xác nhận lịch của mình (FR7), nhưng API BT1 chưa có.
- **Quyết định:** SỬA. Thêm `GET /tickets`, `GET /tickets/{mã}` (kèm lịch sử phân công); mở `GET /appointments` cho khách; khách chỉ xác nhận lịch của phiếu mình, kỹ thuật viên không đổi trạng thái lịch.
- **Lý do:** Có đủ dữ liệu cho 3 màn hình đã vẽ ở BT1; phạm vi dữ liệu theo vai trò kiểm tra ở lớp nghiệp vụ, không chỉ ẩn nút (NFR3).
- **Ảnh hưởng:** `services/ticket.service.js`, `repositories/ticket.repository.js`, `appointment.service.js`; `api-contract.md`; `srs.md` không đổi (FR7 đã có).

## TD-12 – Hoãn FR3 phân công lại (cắt phạm vi có ghi nhận)
- **Phản hồi:** Phiếu Buổi 10 yêu cầu giữ luồng chính, cho phép cắt chức năng phụ và ghi nhận lý do.
- **Quyết định:** GIỮ NGUYÊN thiết kế (UC5, US7, FR3 vẫn nằm trong SRS), HOÃN hiện thực.
- **Lý do:** FR3 là SHOULD, không nằm trên luồng chính phân công → đặt lịch → xác nhận; thời gian dành cho test, README và thử clone mới (bảng tiêu chí BT2 chấm các mục này).
- **Ảnh hưởng:** Không đổi tài liệu thiết kế; README mục 6 ghi "chưa làm"; `wireframe.md` mục 4 ghi phần M1 chưa làm.
- **Cập nhật:** Quyết định hoãn này đã được thay thế bởi TD-15 (đã hiện thực FR3).

## TD-13 – Giao diện web thuần, không dùng framework
- **Phản hồi:** Phiếu Buổi 10 gợi ý `src/api/client.js` và `pages/`; không bắt buộc framework.
- **Quyết định:** GIỮ NGUYÊN kiến trúc 4 lớp; chọn HTML + ES modules, phục vụ bằng chính Express.
- **Lý do:** Chạy bằng một lệnh `npm start`, không bước build, người khác clone về chạy ngay (mục 9 checklist). Mọi lời gọi mạng nằm trong `api/`; trong `pages/` không có `fetch(`.
- **Ảnh hưởng:** `src/frontend/`; `app.js` phục vụ `/app/`, `/` chuyển hướng sang `/app/`.

## TD-14 – Đồng bộ giao diện web với wireframe M1–M3
- **Phản hồi:** (tự rà soát) Bản giao diện đầu tiên của Sprint 2 thiếu một số khối đã vẽ ở BT1: ô Tìm phiếu và Ghi chú (M1), kỹ thuật viên tự điền, chọn loại lịch, giờ kết thúc dự kiến, nút Chọn giờ khác, lịch trong ngày (M2), hai tab (M3).
- **Quyết định:** SỬA giao diện cho khớp wireframe; GIỮ NGUYÊN wireframe, SRS và API. Khối "Phân công lại" của M1 ban đầu hiển thị nhưng khóa vì FR3 hoãn (TD-12); sau đó được mở bằng TD-15.
- **Lý do:** Wireframe là hợp đồng giao diện đã nộp ở BT1; giao diện sai khác sẽ làm bảng truy vết màn hình – use case mất ý nghĩa. Không thêm API mới: danh sách lịch trong ngày dùng `GET /appointments?technician_code=`.
- **Ảnh hưởng:** `src/frontend/` (thêm `TicketSearch.js`, `MyWorkPage.js`; sửa `TicketDetailPage.js`, `TicketListPage.js`, `AppointmentPage.js`, `main.js`, `ui.js`, `appointment.api.js`, `styles.css`); `wireframe.md` mục 4; `README.md` mục 5; ảnh `docs/anh-buoi10/`. Bố cục đã rà soát: khung nội dung rộng 1240 px, ô bảng tự xuống dòng, nút thao tác trong bảng thu nhỏ và tự xuống dòng, màn Đặt lịch chia hai cột (biểu mẫu | lịch trong ngày) và xếp dọc dưới 900 px.

## TD-15 – Hiện thực FR3 phân công lại và khắc phục ngõ cụt thao tác
- **Phản hồi:** (sinh viên rà soát ứng dụng) Giao diện gần như không cho thao tác: khi các phiếu mẫu đã được phân công (do thử curl hoặc thử giao diện) thì danh sách chỉ còn đường dẫn, không có nút nào; không có cách phân công lại hay khôi phục dữ liệu demo.
- **Quyết định:** SỬA. Hiện thực FR3 theo SRS (phiếu Đã phân công chuyển sang kỹ thuật viên khác, lý do bắt buộc, lịch hẹn chưa diễn ra đi theo người mới nếu không trùng); thêm cột Thao tác theo trạng thái trên danh sách phiếu; thêm lệnh `npm run demo:reset`. Thay quyết định hoãn ở TD-12.
- **Lý do:** Ngõ cụt thao tác làm luồng chính không chạy lại được; FR3 đã có sẵn trong SRS, wireframe M1, API và ERD (`action = REASSIGN`, `reason`) nên chỉ cần hiện thực, không đổi thiết kế. Khóa dòng phiếu và hai kỹ thuật viên (theo thứ tự khóa chính) giữ đúng NFR2; đọc phiếu sau khi khóa kỹ thuật viên ở `AppointmentService.create` để không đặt lịch với người vừa bị thay.
- **Ảnh hưởng:** `POST /tickets/{mã}/reassignment` và `?purpose=reassign` (`api-contract.md`); `assign.service.js`, `technician.repository.js`, `appointment.repository.js`, `appointment.service.js`, `ticket.routes.js`; giao diện `TicketDetailPage.js`, `TicketListPage.js`; `scripts/reset-demo.js`, `package.json`; thêm 4 test (tổng 43); `README.md` mục 3, 5, 6.

## TD-16 – Thêm CRUD phiếu bảo hành để có hai thực thể đủ CRUD
- **Phản hồi:** (tự đối chiếu đề BT2, thành phần TP1) Đề yêu cầu ít nhất 2 thực thể đủ Create/Read/Update/Delete. Mới có `appointment` đủ CRUD; `ticket` chỉ đọc và phân công vì việc nhập phiếu từng được xếp "ngoài phạm vi L4 (thuộc L2)".
- **Quyết định:** SỬA ở mức tối thiểu. Thêm `POST /tickets`, `PATCH /tickets/{mã}`, `DELETE /tickets/{mã}` (chỉ `MANAGER`). Sửa và xóa chỉ khi phiếu còn *Chờ phân công*; xóa là xóa thật (không thêm trạng thái hủy). Không làm màn hình nhập phiếu; kiểm bằng curl hoặc Postman và bằng test.
- **Lý do:** Phiếu đã phân công đã qua kiểm tra tay nghề, địa bàn, tải việc; đổi dữ liệu đó sau khi phân công sẽ làm các kiểm tra cũ sai. Giữ nguyên 6 bảng, không sửa `db/schema.sql` nên CSDL đã migrate trước đó vẫn dùng được. Mã phiếu `T-YYYY-NNNN` sinh dưới khóa tư vấn để 8 yêu cầu tạo cùng lúc không trùng mã (có test).
- **Ảnh hưởng:** `ticket.routes.js`, `ticket.service.js`, `ticket.repository.js`, `customer.repository.js` (mới), `validation.js` (`validateTicketInput`), `docs/api-contract.md` mục 8, 5 test tích hợp và 3 test đơn vị mới.

## TD-17 – Tách lỗi nghiệp vụ khỏi mã HTTP
- **Phản hồi:** (tự đối chiếu tiêu chí C2 "service không có req, res, mã trạng thái HTTP") Các service ném `AppError(409, 'CODE', …)`, tức là lớp nghiệp vụ biết mã HTTP.
- **Quyết định:** SỬA. Thêm `DomainError(code, message)` cho `services/`, `validation.js`, `token.js`; bảng `STATUS_BY_CODE` trong `src/middleware/error.js` là nơi duy nhất đổi mã lỗi thành mã HTTP. `AppError` chỉ còn dùng ở lớp API (routes, middleware).
- **Lý do:** Đổi giao thức (ví dụ thêm giao diện dòng lệnh) không phải sửa nghiệp vụ; đúng với kiến trúc 4 lớp ở BT1. Giao diện và hợp đồng API không đổi (mã HTTP và `error.code` giữ nguyên, 43 test cũ vẫn qua).
- **Ảnh hưởng:** `src/errors.js`, `src/middleware/error.js`, 4 service, `validation.js`, `token.js`; `test/architecture.test.js` (mới) kiểm tự động bằng cách đọc mã nguồn; `test/errors.test.js` (mới).

## TD-18 – Cấu hình không còn giá trị mặc định nhạy cảm
- **Phản hồi:** (tự rà theo việc dọn repo số 2 "tìm secret") `src/config.js` có địa chỉ CSDL kèm mật khẩu mặc định và một chuỗi khóa ký token cố định.
- **Quyết định:** SỬA. `DATABASE_URL` bắt buộc; thiếu thì báo lỗi nói rõ cách làm (`cp .env.example .env`). `JWT_SECRET` thiếu thì khi phát triển dùng khóa ngẫu nhiên mỗi lần khởi động (có cảnh báo), khi `NODE_ENV=production` thì từ chối chạy. `package.json` đặt phiên bản `0.2.0` khớp tag nộp bài.
- **Lý do:** Repo công khai; mã nguồn không được chứa giá trị dùng được ở nơi khác. Mật khẩu chung `demo123` của 4 tài khoản demo vẫn giữ vì là dữ liệu giả lập, công khai trong README và trên màn hình đăng nhập.
- **Ảnh hưởng:** `src/config.js`, `package.json`, `.env.example`, `test/config.test.js` (mới).

## TD-19 – Suy giảm có kiểm soát khi PostgreSQL ngừng
- **Phản hồi:** (tự thử theo mục "suy giảm có kiểm soát" của đề) Tắt PostgreSQL thì API trả 500 "Lỗi hệ thống" khó hiểu; `/health` vẫn báo `ok`; kết nối rảnh bị ngắt có thể làm Node thoát cả tiến trình.
- **Quyết định:** SỬA. Lỗi kết nối CSDL → `503 DATABASE_UNAVAILABLE` kèm câu hướng dẫn; `/health` thật sự hỏi CSDL (`503 degraded` khi mất kết nối); `pool.on('error')` ghi log thay vì để tiến trình sập; giao diện nhận 503 qua `ApiError` và hiện nút *Thử lại* như các lỗi khác.
- **Lý do:** Mất một thành phần phụ trợ phải cho ra lỗi rõ ràng và tự khôi phục khi CSDL chạy lại, không treo, không lộ lỗi thô của thư viện.
- **Ảnh hưởng:** `src/middleware/error.js`, `src/db/pool.js`, `src/app.js`, `docs/api-contract.md` mục 8; test mô phỏng mất kết nối ở `test/api.integration.test.js` và `test/errors.test.js`.

---

## Tổng hợp thay đổi so với BT1 (cho mục 7 của BT2)

| Hạng mục | BT1 | Hiện tại (tag v0.2) | Mã |
|----------|-----|---------------------|----|
| Số User Story | 9 | 7 (bỏ US8 SMS, US9 tự động phân công) | TD-01 |
| Cơ sở dữ liệu | MongoDB trong khung ban đầu, thiết kế PostgreSQL | PostgreSQL 16, 6 bảng, `EXCLUDE` chống trùng lịch | TD-06 |
| Đăng nhập | Ngoài phạm vi, giả lập bằng header | Đăng nhập demo, token HMAC 60 phút (header giả lập giữ cho curl) | TD-10 |
| Phân công lại (FR3) | Có trong SRS | Đã hiện thực, có giao diện | TD-12, TD-15 |
| Nhập phiếu | Ngoài phạm vi (thuộc L2) | Có API tạo, sửa, xóa tối thiểu (không có màn hình) | TD-16 |
| Lỗi nghiệp vụ | Chưa quy định | `DomainError` + bảng ánh xạ HTTP ở lớp API | TD-17 |
| Cấu hình | Chưa quy định | Không có giá trị nhạy cảm trong mã | TD-18 |
| CSDL ngừng | Chưa quy định | 503 rõ ràng, `/health` thật | TD-19 |
| Kiến trúc 4 lớp, 6 bảng, wireframe M1–M3 | – | Giữ nguyên | TD-09, TD-14 |
