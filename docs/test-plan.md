# Test Plan rút gọn – Smart CRM Mekong Mobile · L4 (Phân công kỹ thuật viên và lịch hẹn)

Track SE · repo `Haiedo/CDTN1_PhanCongCongViecVaLichHenMekongMobile` · Buổi 14.

## 1. Phạm vi và phần chủ ý không kiểm

**Trong phạm vi:** API `/api/v1` của luồng L4 (gợi ý, phân công, phân công lại, đặt, xác nhận, hủy lịch hẹn, CRUD phiếu), đăng nhập bằng token và phân quyền theo vai trò, kiểm tra dữ liệu đầu vào, ràng buộc ở PostgreSQL (`EXCLUDE` chống trùng lịch, khóa dòng), `migrate` và `seed` chạy lại được.

**Chủ ý KHÔNG kiểm (kèm lý do và rủi ro còn lại):**

| Phần không kiểm | Lý do | Rủi ro còn lại |
|---|---|---|
| Giao diện web tự động (bấm nút, bố cục) | Giao diện chỉ gọi API qua `src/frontend/api/`; thời gian Buổi 14 dành cho API và nghiệp vụ | Lỗi hiển thị chỉ phát hiện bằng mắt. Có 1 kiểm tra tĩnh: giao diện không gán `innerHTML` (TC-11) |
| Hiệu năng và tải | Đề bài chỉ yêu cầu đúng khi đồng thời (NFR2), không có ngưỡng thời gian đáp ứng | Chưa biết hệ thống chịu bao nhiêu người dùng cùng lúc |
| Chống dò mật khẩu (giới hạn số lần đăng nhập sai) | Tài khoản chỉ là tài khoản demo, thay bằng đăng nhập của hệ thống chính khi tích hợp | `POST /auth/login` chưa giới hạn số lần thử; ghi vào checklist bảo mật Buổi 15–16 |
| Gửi SMS nhắc lịch | Đã bỏ khỏi phạm vi (TD-01, US8) | Không có |
| Trình duyệt ngoài Chrome, thiết bị di động | Ngoài phạm vi môn học | Bố cục có thể khác ở trình duyệt khác |

## 2. Loại test và số lượng mỗi tầng

| Tầng | Công cụ / lệnh | Số lượng | Nội dung |
|---|---|---|---|
| Đơn vị (hàm thuần, không CSDL) | `node:test`, `npm test` | 34 | validation 11, token 6, client 6, config 5, errors 6 |
| Kiến trúc | `npm test` | 5 | lớp trên không gọi tắt lớp dưới (routes → services → repositories) |
| Tích hợp API + PostgreSQL thật | `npm test` | 32 | luồng đúng, biên, dữ liệu sai, quyền, đồng thời (4 yêu cầu trùng lịch, 10 yêu cầu phân công) |
| **Test case Test Report (chạy thật qua HTTP)** | **`npm run tc`** | **12** | 5 loại: luồng đúng 2 · giá trị biên 4 · dữ liệu sai 3 · bảo mật / chất lượng dữ liệu 2 · tái lập 1 |
| End-to-end toàn luồng | `npm run e2e` | 12 bước | đăng nhập → phân công → đặt lịch → thử đặt trùng → xác nhận |

Kỹ thuật chọn dữ liệu thử: **giá trị biên hai phía** (17:00 và 17:01; 14, 15, 120, 121 phút; chồng 1 phút và liền kề; hạn mức 0/1 và 1/1), **phân vùng tương đương** cho đầu vào sai (kiểu số / chuỗi, ngày có thật / không có thật), **bảng vai trò × thao tác** cho phân quyền, **đoán lỗi** (ký tự HTML, SQL).

## 3. Tiêu chí thành công (đo được)

1. 12/12 test case của Test Report đạt PASS sau khi sửa bug; mọi test case có ảnh `docs/screenshots/TC-xx.png`.
2. `npm test` đạt 100% (71/71, 0 fail) sau từng bản sửa và ở bản cuối.
3. Mỗi lần gọi bị từ chối (4xx) không làm thay đổi số dòng trong bảng (kiểm đếm trước / sau).
4. Không còn bug Critical hoặc Major đang mở; mỗi bug đã sửa có commit riêng, có test hồi quy và test đó đỏ khi gỡ bản sửa.
5. `npm run e2e` đạt 12/12.

## 4. Môi trường và dữ liệu thử

- Node.js ≥ 20, Express 4, PostgreSQL 16; hai CSDL riêng: `mekong_l4` (demo) và `mekong_l4_test` (kiểm thử, bị xóa dữ liệu mỗi lần chạy).
- Dữ liệu: `db/seed.sql` (2 khách hàng, 3 kỹ thuật viên, 4 dòng tay nghề, 3 phiếu). Mỗi test case tự xóa dữ liệu rồi nạp lại seed, nên không phụ thuộc thứ tự chạy và không dựa vào dữ liệu còn sót.
- Ngày giờ của lịch hẹn tính động (thứ Hai kế tiếp theo giờ Việt Nam) nên bộ test không hỏng theo thời gian.
- TC-06 hạ `max_open_tickets` của TECH-007 xuống 1 để thử biên quá tải mà không phải tạo 8 phiếu.
- Chạy: `npm test` (71 test) · `npm run tc` (12 test case) · `npm run tc -- TC-05` (một test case).
