# Báo cáo Buổi 10 – Sprint 2: module mở rộng, giao diện và tích hợp end-to-end

> **Lưu ý:** đây là báo cáo Sprint 2 (Buổi 10), số liệu đúng tại thời điểm đó (43 test, README mục 3). Số liệu và các bước chạy hiện hành (tag v0.2: 69 test, README mục 2) xem `README.md`; thay đổi sau Buổi 10 xem `docs/thay-doi-thiet-ke.md` (TD-16 đến TD-19).

Sinh viên: Nguyễn Trọng Hải – MSSV 2374802010126 – Lớp 261_71ITGR40203_03 – GVHD: ThS. Nguyễn Minh Tân
Case study: Mekong Mobile Smart CRM – Luồng L4 (Phân công kỹ thuật viên và lịch hẹn) – Track SE

## 1. Việc đã làm (SE)

| Yêu cầu của phiếu | Kết quả | Vị trí |
|-------------------|---------|--------|
| Lớp gọi API tách riêng | Đạt | `src/frontend/api/client.js`, `auth.api.js`, `ticket.api.js`, `appointment.api.js` |
| 3 màn hình theo wireframe (danh sách, chi tiết, tiếp nhận) | Đạt, đã đối chiếu từng khối M1–M3 (TD-14), thêm màn đăng nhập | `src/frontend/pages/` |
| Mỗi màn có 3 trạng thái tải / rỗng / lỗi | Đạt | `components/DataState.js` |
| Đăng nhập; 401 xóa token và về trang đăng nhập | Đạt | `LoginPage.js`, `client.js` |
| Tắt backend → báo lỗi có nút Thử lại | Đạt | ảnh 11 |
| Không còn `fetch(` trong `pages/` | Đạt (chỉ `api/` gọi mạng) | xem mục 5 |
| Tích hợp end-to-end 6 bước trên dữ liệu mẫu thật | Đạt, 12/12 bước | mục 2, `scripts/e2e.js` |
| ≥ 5 unit test (đúng, biên, sai) có số lượng | 19 unit + 24 tích hợp = 43 PASS | mục 4 |
| README mục 3, mỗi bước một lệnh | Đạt | `README.md` |
| Ghi nhận cắt phạm vi và thay đổi | TD-10 đến TD-14 | `thay-doi-thiet-ke.md` |

## 2. Tích hợp end-to-end

Dữ liệu: `db/seed.sql` (khách Lê Minh Châu, 3 kỹ thuật viên, phiếu T-2026-0042 và T-2026-0043). Chạy `npm run e2e` trên CSDL kiểm thử.

1. Quản lý đăng nhập, nhận token 60 phút.
2. Xem danh sách phiếu "Chờ phân công".
3. Xem gợi ý kỹ thuật viên cho phiếu T-2026-0042 và phân công TECH-007.
4. Đặt lịch hẹn thứ Hai 09:00; đặt chồng lúc 09:15 trả 409 `APPOINTMENT_CONFLICT`.
5. Khách đăng nhập, thấy và xác nhận lịch APT-0001.
6. Kỹ thuật viên đăng nhập, chỉ thấy lịch của mình.

Kết quả: **12/12 bước đạt, 0 lỗi** (`anh-buoi10/ket-qua-end-to-end.txt`). Thao tác tương ứng trên giao diện:

| Ảnh | Nội dung |
|-----|----------|
| `1-dang-nhap-sai-mat-khau.png` | Đăng nhập sai, báo lỗi |
| `2-danh-sach-phieu.png` | Danh sách phiếu (có dữ liệu) |
| `3-trang-thai-rong.png` | Trạng thái rỗng |
| `4-chi-tiet-va-goi-y.png` | Chi tiết phiếu và gợi ý |
| `5-phan-cong-thanh-cong.png` | Phân công thành công |
| `6-dat-lich-thanh-cong.png` | Đặt lịch thành công |
| `7-trung-lich-409.png` | Trùng lịch, 409 |
| `8-khach-xem-lich.png`, `9-khach-xac-nhan.png` | Khách xem và xác nhận |
| `8a-khach-tab-phieu.png` | Khách: tab "Phiếu của tôi" (M3) |
| `10-ktv-rong.png` | Kỹ thuật viên chưa có lịch (rỗng) |
| `10b-ktv-phieu-duoc-giao.png` | Kỹ thuật viên: tab "Phiếu được giao" (M3) |
| `11-loi-backend-tat.png` | Backend tắt, có nút Thử lại |
| `12-het-phien-ve-dang-nhap.png` | Hết phiên, về trang đăng nhập |

## 3. Ba trạng thái dữ liệu

Mọi trang bọc nội dung trong `DataState`: đang tải (spinner), rỗng (thông báo và gợi ý), lỗi (thông báo và nút Thử lại). Lỗi mạng được chuẩn hóa thành `ApiError` mã `NETWORK_ERROR`; lỗi 401 gọi `onUnauthorized` để xóa token.

## 4. Kiểm thử

`npm test`: **43 test PASS** (validation 7, token 6, client 6, tích hợp API 24, trong đó 4 test FR3 phân công lại).

Test biên và ngoại lệ tiêu biểu: token hết hạn đúng giây `exp` bị từ chối; token bị sửa chữ ký → `TOKEN_INVALID`; `Authorization` sai không được rơi về header giả lập; lịch liền kề (kết thúc 09:30, bắt đầu 09:30) hợp lệ còn chồng 1 phút bị 409; client không tự thử lại khi 401; mã phiếu sai định dạng → 400.

## 5. Kiểm tra "xong khi"

- Backend tắt → trang báo lỗi và nút Thử lại (ảnh 11).
- Lệnh tìm `fetch(` trong `pages/` cho kết quả rỗng:
  `grep -rn "fetch(" src/frontend/pages` (Windows: `findstr /s /n "fetch(" src\frontend\pages\*.js`).

## 6. Checklist 10 mục

| # | Mục | Trạng thái | Minh chứng |
|---|-----|-----------|------------|
| 1 | Module chạy được | Đạt | `npm start` → `/app/` |
| 2 | End-to-end không lỗi treo | Đạt | 12/12 bước |
| 3 | Dùng dữ liệu mẫu thật | Đạt | `db/seed.sql` |
| 4 | Ảnh chụp trong docs/ | Đạt | `docs/anh-buoi10/` (12 ảnh) |
| 5 | ≥ 5 test PASS, có số lượng | Đạt | 43 PASS |
| 6 | ≥ 1 test biên/ngoại lệ | Đạt | mục 4 |
| 7 | Xử lý 3 trạng thái | Đạt | mục 3 |
| 8 | README mục 3 đầy đủ | Đạt | `README.md` |
| 9 | Đã thử clone về chạy | Đạt trên máy kiểm thử (clone sạch: 43/43, e2e 12/12); **sinh viên cần lặp lại trên máy mình hoặc máy bạn review** | |
| 10 | ≥ 8 commit | **Sinh viên kiểm tra**: `git rev-list --count HEAD` | |

## 7. Phạm vi đã cắt

Không còn chức năng nào bị cắt. FR3 phân công lại (UC5, US7) ban đầu hoãn (TD-12), sau khi rà soát giao diện đã hiện thực đầy đủ (TD-15).

## 8. Peer review

Bạn review điền 3 dòng: (1) clone và chạy bằng README có thành công không, (2) lỗi hoặc điểm khó hiểu gặp phải, (3) đề xuất sửa. Kết quả dán vào đây: _(chờ bạn review)_
