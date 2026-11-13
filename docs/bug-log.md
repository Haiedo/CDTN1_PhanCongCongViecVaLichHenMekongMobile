# Nhật ký lỗi (bug log) – Giai đoạn 2

Mỗi lỗi đủ 7 dòng theo bốn bước gỡ lỗi: **tái lập → khoanh vùng → sửa nguyên nhân → xác nhận**, kèm triệu chứng, nguyên nhân gốc và bài học. Đây là các lỗi đã thật sự gặp khi làm Sprint 1, Sprint 2 và hoàn thiện BT2.

| Mã | Lỗi | Lớp |
|----|-----|-----|
| BUG-01 | Deadlock khi 4 yêu cầu đặt lịch chồng nhau gửi cùng lúc | Nghiệp vụ + CSDL |
| BUG-02 | Test phân công lại đồng thời viết sai giả định | Kiểm thử |
| BUG-03 | Migrate chạy song song làm hỏng khi hai file test cùng nạp schema | CSDL (migrate) |
| BUG-04 | npm test chỉ đạt 36/39 trên máy sinh viên sau khi chép file Sprint 2 | Quy trình / môi trường |
| BUG-05 | Dải đỏ "báo lỗi" hiện ở trang chi tiết mọi phiếu đã phân công | Giao diện |
| BUG-06 | Giao diện "không làm được gì" khi các phiếu mẫu đã được phân công hết | Giao diện + nghiệp vụ |
| BUG-07 | Bố cục web bị vỡ (bảng tràn khỏi khung, biểu mẫu lệch) | Giao diện (CSS) |
| BUG-08 | Ngày không tồn tại (30/02) được nhận và tự đổi sang ngày khác | Nghiệp vụ (validation) |
| BUG-09 | Lọc lịch hẹn bằng giá trị sai trả 200 rỗng; mã sai định dạng trả 404 | API |
| BUG-10 | `customer_phone` kiểu số bị báo 404 thay vì 400 | Nghiệp vụ (validation) |

## BUG-01 – Deadlock khi 4 yêu cầu đặt lịch chồng nhau gửi cùng lúc

1. **Triệu chứng:** 4 yêu cầu `POST /appointments` chồng nhau cho cùng một kỹ thuật viên gửi đồng thời: có yêu cầu trả 500 "Lỗi hệ thống" thay vì 409; nhật ký PostgreSQL ghi `deadlock detected` (mã 40P01).
2. **Tái lập:** Chạy test đồng thời "4 yêu cầu đặt lịch chồng nhau" khi `create` chưa khóa gì; lỗi lặp lại khi chạy lại.
3. **Khoanh vùng:** Hàm `create` kiểm tra trùng bằng truy vấn rồi mới `INSERT`; xét từng bước thì lỗi nằm ở chỗ hai `INSERT` cùng chạm ràng buộc `EXCLUDE` của bảng `appointment`.
4. **Nguyên nhân:** Không có khóa nào trước `INSERT`: hai giao dịch cùng giữ dòng vừa chèn và chờ nhau, PostgreSQL phải hủy một bên.
5. **Cách sửa:** Khóa dòng kỹ thuật viên (`SELECT … FOR UPDATE`, `technicianRepo.findByCode(…, { forUpdate: true })`) ở đầu giao dịch để các yêu cầu của cùng một kỹ thuật viên xếp hàng; lỗi `23P01` của CSDL vẫn đổi thành 409 làm chốt cuối.
6. **Xác nhận:** Test đồng thời cho kết quả `[201, 409, 409, 409]`, không còn 500; bỏ dòng khóa thì test đỏ (test đột biến).
7. **Bài học và vị trí trong mã:** Chỉ kiểm tra bằng mã là không đủ cho NFR2, phải có cả khóa và ràng buộc ở CSDL. Tệp: `src/services/appointment.service.js` (hàm `create`). Ghi ở TD-07.

## BUG-02 – Test phân công lại đồng thời viết sai giả định

1. **Triệu chứng:** Test "hai yêu cầu phân công lại cùng lúc" báo cả hai đều thành công trong khi kỳ vọng một bên bị từ chối.
2. **Tái lập:** Chạy `npm test`, test FR3 đồng thời lần đầu: nhận `[200, 200]` thay vì `[200, 409]`.
3. **Khoanh vùng:** So sánh hai yêu cầu: cả hai chuyển phiếu sang `TECH-003`, mà `TECH-003` đủ điều kiện nên không có lý do gì để từ chối; chỉ ra lỗi nằm ở dữ liệu của test, không phải ở `reassign`.
4. **Nguyên nhân:** Test chọn kỹ thuật viên đích đủ điều kiện nên hai giao dịch nối tiếp nhau đều hợp lệ; kỳ vọng của test sai.
5. **Cách sửa:** Cho cả hai yêu cầu cùng chuyển sang `TECH-009`: yêu cầu thứ hai thấy người phụ trách đã là `TECH-009` và phải nhận `SAME_TECHNICIAN` (409).
6. **Xác nhận:** Kết quả ổn định `[200, 409]`; gỡ `technicianRepo.lockMany` thì test đỏ, chứng minh test thật sự kiểm tra khóa.
7. **Bài học và vị trí trong mã:** Test phải được thử bằng cách phá mã (đột biến) trước khi tin. Tệp: `test/api.integration.test.js` (4 test FR3).

## BUG-03 – Migrate chạy song song làm hỏng khi hai file test cùng nạp schema

1. **Triệu chứng:** Chạy các file test cùng lúc thỉnh thoảng báo `duplicate key value violates unique constraint "pg_type_typname_nsp_index"` khi gọi `migrate`.
2. **Tái lập:** Chạy `node --test` cho nhiều file mà không có `--test-concurrency=1`; lỗi xuất hiện không đều giữa các lần chạy.
3. **Khoanh vùng:** Lỗi chỉ có khi có từ hai tiến trình cùng chạy `migrate` trên một CSDL; một tiến trình chạy một mình không bao giờ lỗi.
4. **Nguyên nhân:** Hai tiến trình cùng thấy "chưa có bảng" và cùng chạy `db/schema.sql`, đụng nhau khi tạo kiểu dữ liệu trong PostgreSQL.
5. **Cách sửa:** Thêm khóa tư vấn `pg_advisory_lock(727001)` quanh `migrate`; đồng thời script `npm test` dùng `--test-concurrency=1`.
6. **Xác nhận:** Chạy `npm test` liên tiếp nhiều lần đều đạt; chạy `npm run migrate` hai lần liên tiếp in "đã áp dụng trước đó – bỏ qua" và không lỗi.
7. **Bài học và vị trí trong mã:** Những bước khởi tạo dùng chung phải an toàn khi chạy lặp và chạy song song (C5). Tệp: `src/db/migrate.js`.

## BUG-04 – npm test chỉ đạt 36/39 trên máy sinh viên sau khi chép file Sprint 2

1. **Triệu chứng:** Trên máy em `npm test` báo 33/39, sau khi chép thêm file còn 36/39 (các test tích hợp đỏ), trong khi trên máy phát triển 39/39.
2. **Tái lập:** Chép gói file thay đổi của Buổi 10 vào thư mục dự án đang dùng rồi chạy `npm test`.
3. **Khoanh vùng:** So danh sách file của hai máy: thiếu `assignment.repository.js` và `appointment.repository.js` trong gói; một số file cũ trên máy em chưa được thay.
4. **Nguyên nhân:** Gói "chỉ file thay đổi" thiếu hai file mà các service mới gọi tới, cộng với file cũ còn sót trên máy.
5. **Cách sửa:** Chép lại đủ các thư mục `src`, `db`, `test`, `scripts` từ gói đầy đủ, xóa file cũ không còn dùng.
6. **Xác nhận:** `npm test` đạt 39/39 trên máy em (sau Buổi 10 là 43/43, nay 69/69).
7. **Bài học và vị trí trong mã:** Phép thử đáng tin nhất là clone vào thư mục mới và làm đúng README (C1), không phải chép đè lên thư mục cũ. Đã đưa bước này vào README mục 3.

## BUG-05 – Dải đỏ "báo lỗi" hiện ở trang chi tiết mọi phiếu đã phân công

1. **Triệu chứng:** Trang chi tiết phiếu đã phân công luôn hiện dải đỏ "Phiếu … đã có kỹ thuật viên phụ trách", kể cả ngay dưới dải xanh "Đã phân công thành công", làm người xem tưởng thao tác vừa rồi lỗi.
2. **Tái lập:** Đăng nhập `quanly01`, phân công `T-2026-0042` (hoặc mở `T-2026-0044` đã có người) và xem lại trang chi tiết: dải đỏ xuất hiện (thấy trong ảnh chụp của báo cáo Buổi 10).
3. **Khoanh vùng:** Dải đỏ chỉ có ở nhánh `status !== 'WAITING_ASSIGNMENT'` của `TicketDetailPage`; mã trả về từ API vẫn là 200, nên lỗi nằm ở giao diện, không phải ở backend.
4. **Nguyên nhân:** Luồng ngoại lệ [1a] của UC2 được vẽ bằng `banner('error', …)` cho mọi lần mở phiếu đã phân công, dù đây chỉ là thông tin chứ không phải lỗi.
5. **Cách sửa:** Đổi sang `banner('info', …)` (thêm kiểu `.banner-info` trong `styles.css`); nội dung nói rõ đổi người bằng khối Phân công lại bên dưới, hoặc nêu trạng thái hiện tại nếu phiếu không phân công lại được.
6. **Xác nhận:** Mở lại `T-2026-0044` bằng trình duyệt tự động: chỉ còn một dải xanh dương, không còn dải đỏ; `npm test` vẫn đạt.
7. **Bài học và vị trí trong mã:** Màu và vai trò của thông báo phải đúng ngữ nghĩa (lỗi, thành công, thông tin). Tệp: `src/frontend/pages/TicketDetailPage.js`.

## BUG-06 – Giao diện "không làm được gì" khi các phiếu mẫu đã được phân công hết

1. **Triệu chứng:** Sau khi thử luồng bằng curl, danh sách phiếu chỉ còn đường dẫn, không có nút thao tác nào; không phân công lại hay khôi phục dữ liệu mẫu được.
2. **Tái lập:** Phân công cả `T-2026-0042` và `T-2026-0043` bằng curl rồi mở giao diện bằng tài khoản `quanly01`.
3. **Khoanh vùng:** Trạng thái dữ liệu: cả 3 phiếu đều `ASSIGNED`; giao diện chỉ có hành động cho phiếu Chờ phân công nên không còn gì để bấm.
4. **Nguyên nhân:** Thiết kế giao diện chỉ phục vụ luồng "phân công lần đầu"; chức năng phân công lại (FR3) có trong SRS nhưng chưa hiện thực, và không có cách đưa dữ liệu về trạng thái ban đầu.
5. **Cách sửa:** Hiện thực FR3 (`POST /tickets/{mã}/reassignment`), thêm cột Thao tác (Phân công, Đặt lịch, Phân công lại) và lệnh `npm run demo:reset` nạp lại dữ liệu mẫu.
6. **Xác nhận:** Luồng chính chạy lại được từ đầu sau `npm run demo:reset`; `npm run e2e` đạt 12/12; thêm 4 test FR3.
7. **Bài học và vị trí trong mã:** Mọi trạng thái dữ liệu mà người dùng có thể rơi vào phải có đường đi tiếp, và demo cần cách khôi phục dữ liệu. Ghi ở TD-15.

## BUG-07 – Bố cục web bị vỡ (bảng tràn khỏi khung, biểu mẫu lệch)

1. **Triệu chứng:** Bảng phiếu rộng hơn khung trang, các cột nhãn dính nhau; biểu mẫu đặt lịch và thẻ lịch trong ngày không thẳng hàng.
2. **Tái lập:** Mở `#/tickets` và `#/appointments` bằng tài khoản `quanly01` trên cửa sổ trình duyệt thường (ảnh chụp màn hình do em gửi).
3. **Khoanh vùng:** Dùng công cụ kiểm tra phần tử trong trình duyệt: ô bảng không được xuống dòng, vùng chứa hẹp và biểu mẫu không nằm trong lưới chia cột.
4. **Nguyên nhân:** CSS ban đầu giả định bảng ít cột; thêm cột Thao tác làm bảng vượt khung, và hai thẻ ở M2 xếp thành khối dọc không cùng chiều rộng.
5. **Cách sửa:** Mở rộng vùng chứa, cho ô bảng tự xuống dòng, nhóm nút bằng `.actions { flex-wrap }`, chia M2 thành hai cột bằng `.split` và dồn về một cột ở màn hình hẹp.
6. **Xác nhận:** Chạy kiểm tra tự động độ tràn ngang trên các màn hình: không còn phần tử nào rộng quá khung; em mở lại giao diện và đối chiếu lại với wireframe.
7. **Bài học và vị trí trong mã:** Kiểm tra giao diện sau mỗi lần thêm cột hoặc khối mới. Tệp: `src/frontend/styles.css`.

---

## Bug phát hiện ở Buổi 14 (bảy dòng: mã và mức độ · phát hiện bởi · triệu chứng · cách tái lập · nguyên nhân · cách sửa · commit và xác nhận)

Tiêu chí phân loại: (1) người dùng còn làm được việc không; (2) dữ liệu có bị sai hoặc lộ không; (3) có cách làm tạm không. Chưa tìm thấy lỗi Critical (không lộ dữ liệu, không mất dữ liệu, không sập hệ thống).

## BUG-08 – Ngày không tồn tại (30/02) được nhận và tự đổi sang ngày khác

1. **Mã và mức độ:** BUG-08 · **Major** (dữ liệu sai nhưng API vẫn báo thành công; người dùng khó nhận ra nên không có cách làm tạm).
2. **Phát hiện bởi:** TC-07 (dữ liệu sai), khi thử `start_at` ngày không có thật bằng `npm run tc -- TC-07`.
3. **Triệu chứng:** `POST /appointments` với `start_at` = `<năm sau>-02-30T09:00:00+07:00` trả 201 và lưu lịch hẹn vào ngày 02/03; `-04-31` bị lưu thành 01/05. Khách và kỹ thuật viên nhìn thấy một ngày khác với ngày quản lý đã nhập.
4. **Cách tái lập:** `npm run tc -- TC-07` ở bản trước khi sửa: 13-01 → 400, 02-30 → 201, 04-31 → 201, `appointment` 0 → 2. Hoặc dùng `curl` với `start_at` `2027-02-30T09:00:00+07:00` và đọc `start_at` trong phản hồi.
5. **Nguyên nhân:** `validateAppointmentInput` chỉ kiểm hình dạng chuỗi bằng biểu thức chính quy rồi tin vào `Date.parse`. `Date.parse` của Node "làm tròn" ngày vượt tháng thay vì báo lỗi, nên 30/02 thành 02/03. Tháng 13 thì `Date.parse` trả `NaN` nên bị chặn, vì vậy lỗi chỉ lộ ra với ngày vượt số ngày của tháng.
6. **Cách sửa:** thêm `isRealDateTime` trong `src/services/validation.js`: tách năm, tháng, ngày, giờ, phút, giây từ chuỗi, dựng `Date.UTC` rồi so lại từng thành phần (ngày, tháng, giờ ≤ 23, phút và giây ≤ 59). Chỉ sửa một hàm, không đổi API hay CSDL.
7. **Commit và xác nhận:** https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile/commit/dfddba9f0a18197ee684a6fb816d68d31f59f42f. Test hồi quy mới trong `test/validation.test.js` (30/02, 31/04, 29/02/2027, giờ 24, đối chứng 29/02/2028 hợp lệ); gỡ bản sửa thì test đỏ. `npm run tc -- TC-07` đạt PASS (cả 3 yêu cầu 400, `appointment` 0 → 0); `npm test` đạt 70/70 ở thời điểm sửa. Ảnh: `docs/screenshots/BUG-08-fixed.png`.

## BUG-09 – Lọc lịch hẹn bằng giá trị sai trả 200 rỗng; mã sai định dạng trả 404

1. **Mã và mức độ:** BUG-09 · **Minor** (không mất hay sai dữ liệu; gõ sai bộ lọc chỉ làm danh sách trông như "chưa có lịch", có cách làm tạm là gõ đúng).
2. **Phát hiện bởi:** TC-09 (dữ liệu sai), so với `GET /tickets?status=BOGUS` vốn trả 400.
3. **Triệu chứng:** `GET /appointments?status=BOGUS` và `?technician_code=BAD` trả 200 với `"data": []`; `GET /appointments/abc` trả 404 `APPOINTMENT_NOT_FOUND`. Cùng loại lỗi nhập ở `/tickets` thì trả 400 `INVALID_PARAMETER`, nên hai nhóm API trái quy ước.
4. **Cách tái lập:** `npm run tc -- TC-09` ở bản trước khi sửa: `/tickets` 400; `/appointments?status=BOGUS` 200; `?technician_code=BAD` 200; `/appointments/abc` 404.
5. **Nguyên nhân:** `appointment.routes.js` chuyển thẳng `req.query` và `req.params.code` xuống service mà không kiểm định dạng; truy vấn không khớp dòng nào nên trả danh sách rỗng hoặc "không tìm thấy". Các route của `/tickets` đã kiểm ở lớp API, route lịch hẹn bị bỏ sót.
6. **Cách sửa:** trong `src/routes/appointment.routes.js` kiểm `status` thuộc ba trạng thái, `technician_code` theo `TECH-NNN`, `ticket_code` theo `T-YYYY-NNNN`, và mã lịch hẹn theo `APT-NNNN` (bằng `router.param`); sai thì trả 400 `INVALID_PARAMETER`. Mã đúng định dạng nhưng không tồn tại vẫn trả 404. Cập nhật `docs/api-contract.md`.
7. **Commit và xác nhận:** https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile/commit/6241abc6b1ec85a7a52cc03c4c97e3dae1be7e47. Test tích hợp mới "lịch hẹn: tham số lọc và mã sai định dạng → 400" trong `test/api.integration.test.js`; gỡ bản sửa thì test đỏ. `npm run tc -- TC-09` đạt PASS (cả 4 yêu cầu 400); `npm test` đạt 71/71 ở thời điểm sửa. Ảnh: `docs/screenshots/BUG-09-fixed.png`.

## BUG-10 – `customer_phone` kiểu số bị báo 404 thay vì 400

1. **Mã và mức độ:** BUG-10 · **Minor** (không sai dữ liệu, không tạo phiếu hỏng; chỉ trả sai loại lỗi và thông báo gây hiểu nhầm, người dùng gửi lại chuỗi là được).
2. **Phát hiện bởi:** TC-08 (dữ liệu sai), thử kiểu dữ liệu sai theo bảng validation trong `docs/api-contract.md` (`customer_phone` là string).
3. **Triệu chứng:** `POST /tickets` với `"customer_phone": 901234567` (số JSON) trả 404 `CUSTOMER_NOT_FOUND` "Không tìm thấy khách hàng có số điện thoại 901234567", trong khi lẽ ra là 400 `VALIDATION_ERROR` vì sai kiểu.
4. **Cách tái lập:** `npm run tc -- TC-08` ở bản trước khi sửa: `"09012345"` → 400; `901234567` → 404; `ticket` 3 → 3.
5. **Nguyên nhân:** `validateTicketInput` kiểm `PHONE_RE.test(String(phone || ''))`; `String()` biến số thành chuỗi nên qua được kiểm tra định dạng, rồi lỗi mới lộ ở bước tìm khách hàng.
6. **Cách sửa:** kiểm `typeof phone === 'string'` trước khi so định dạng, trong `src/services/validation.js`; ghi rõ "phải gửi dạng chuỗi" ở `docs/api-contract.md`.
7. **Commit và xác nhận:** https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile/commit/1161036ba5869718a092087a1fdf7e8460d40dba. Thêm một dòng kiểm tra vào test "tạo phiếu thiếu trường, sai tay nghề…" trong `test/validation.test.js`; gỡ bản sửa thì test đỏ. `npm run tc -- TC-08` đạt PASS (cả 2 yêu cầu 400); `npm test` đạt 70/70 ở thời điểm sửa. Ảnh: `docs/screenshots/BUG-10-fixed.png`.


## Bug phát hiện ở Buổi 16

## BUG-11 – Thư viện body-parser có lỗ hổng từ chối dịch vụ mức High
1. **Mã và mức độ:** BUG-11 · **Major** (lỗ hổng mức High theo `npm audit`; ảnh hưởng tính sẵn sàng của mọi endpoint nhận JSON; không làm sai hay lộ dữ liệu, tạm thời xử lý được bằng cách khởi động lại dịch vụ).
2. **Phát hiện bởi:** `npm audit --omit=dev` khi rà soát phụ thuộc cho mục 6 của checklist bảo mật (Buổi 16), không phải test chức năng.
3. **Triệu chứng:** `npm audit` báo `1 high severity vulnerability`: `body-parser <1.20.9`, "Denial of Service via trailing bytes after a compressed request body" (GHSA-27r3-jxmh-p828). Khi dùng bình thường không có triệu chứng nào.
4. **Cách tái lập:** `npm audit --omit=dev` cho `1 high severity vulnerability`; `npm ls body-parser` cho `body-parser@1.20.8` (phụ thuộc gián tiếp của `express@4.22.3`). Em không tái hiện cuộc tấn công, chỉ dựa vào thông báo của npm.
5. **Nguyên nhân:** `package-lock.json` khóa `body-parser` ở 1.20.8, bản có lỗi; Express 4 đọc JSON qua thư viện này.
6. **Cách sửa:** `npm audit fix`; chỉ nâng `body-parser` 1.20.8 → 1.20.9 trong `package-lock.json`, không đổi `package.json` hay mã nguồn. Commit này cũng đổi hai dòng version của package-lock.json (dòng 3 và 9) từ 0.2.0 lên 1.0.0 để khớp bản phát hành; package.json đổi version ở một commit riêng chore(release)
7. **Commit và xác nhận:** https://github.com/Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile/commit/53a7ace1a30da02fa37884612a793bc3c9223e1d. Không có test hồi quy tự động cho lỗ hổng thư viện; xác nhận bằng `npm audit --omit=dev` → `found 0 vulnerabilities`, `npm test` 71/71, `npm run tc` 12/12. Ảnh: `docs/screenshots/BUG-11-fixed.png` (và ảnh trước khi sửa `BUG-11-audit-before.png`).
