# Checklist bảo mật – Smart CRM Mekong Mobile · L4 (bản v1.0)

Bảy mục. Mỗi mục có trạng thái **ĐÃ LÀM / CHƯA LÀM / KHÔNG ÁP DỤNG** và một dòng minh chứng kiểm tra lại được bằng lệnh. Mục "CHƯA LÀM" được ghi trung thực kèm kế hoạch, không che giấu.

| # | Mục kiểm tra | Trạng thái | Một dòng minh chứng (cách kiểm tra) |
|---|---|---|---|
| 1 | Không có secret trong repo và lịch sử commit | **ĐÃ LÀM** | `.env` nằm trong `.gitignore` và `.dockerignore`; `git log --all --oneline -- .env` in ra rỗng; chỉ `.env.example` (giá trị mẫu) được commit |
| 2 | Cấu hình bằng biến môi trường, thiếu thì dừng chứ không chạy với giá trị đoán | **ĐÃ LÀM** | `src/config.js` ném lỗi khi thiếu `DATABASE_URL`/`JWT_SECRET` (`test/config.test.js`, 5 test); `docker-compose.yml` dùng `${JWT_SECRET:?…}` nên thiếu `.env` thì Compose từ chối khởi động |
| 3 | Xác thực: token ký, có hạn, không giả được | **ĐÃ LÀM** | token HMAC-SHA256 hết hạn sau 60 phút, so sánh chữ ký bằng `timingSafeEqual` (`test/token.test.js`, 6 test); TC-10: token sai một ký tự → `401 TOKEN_INVALID` |
| 4 | Phân quyền kiểm ở máy chủ, không chỉ ẩn nút trên giao diện | **ĐÃ LÀM** | `requireRole` + phạm vi dữ liệu theo vai trò ở lớp nghiệp vụ; TC-10: sai vai trò → `403`, số dòng ba bảng không đổi (3, 1, 0 → 3, 1, 0) |
| 5 | Kiểm tra đầu vào và chống tiêm mã (SQL, HTML) | **ĐÃ LÀM** | mọi truy vấn dùng tham số `$1…` (chuỗi ghép vào SQL chỉ là hằng số); TC-11: `'); DROP TABLE ticket;--` lưu nguyên văn, bảng còn nguyên, `grep -rn "innerHTML =" src/frontend` rỗng; TC-07, TC-08, TC-09 và BUG-08, BUG-09, BUG-10 |
| 6 | Phụ thuộc và container an toàn cơ bản | **ĐÃ LÀM** | `npm audit --omit=dev` báo `found 0 vulnerabilities` sau khi sửa BUG-11; `Dockerfile` chạy `USER node`; CSDL không mở cổng ra máy chủ (`docker compose ps` chỉ thấy cổng của `app`); `.dockerignore` loại `.env` khỏi image |
| 7 | Gia cố trước khi mở ra Internet: tắt cơ chế thử `X-User`/`X-Role`, giới hạn số lần đăng nhập sai, HTTPS | **CHƯA LÀM** | `POST /auth/login` chưa giới hạn số lần thử; header `X-User`/`X-Role` vẫn nhận khi không có `Authorization` (dùng cho curl và test); chưa có TLS. Phạm vi prototype chạy cục bộ; kế hoạch: tắt header thử bằng biến môi trường, thêm giới hạn tốc độ, đặt sau reverse proxy có TLS (ghi ở Test Plan, "Chống dò mật khẩu") |

## Giới hạn đã biết (để người đọc không phải đoán)

- **Tài khoản demo:** bốn tài khoản dùng chung mật khẩu `demo123`; đây là dữ liệu giả lập công khai, không phải khóa thật. Khi tích hợp, thay bằng dịch vụ đăng nhập của hệ thống chính.
- **Lịch sử commit:** các commit đầu của dự án có một chuỗi cấu hình mặc định `postgres://mekong:mekong@localhost` (tài khoản PostgreSQL cục bộ của máy phát triển, không phải khóa dùng ở nơi nào khác). Không viết lại lịch sử; chuỗi này đã bị loại khỏi mã từ commit `da924f8` (`fix(config): DATABASE_URL bắt buộc`). `git log --all --oneline -S"mekong:mekong"` liệt kê các commit đó.
- **Mục 7 là lý do không nên mở hệ thống ra Internet công cộng ở bản v1.0.**

## Lệnh kiểm tra lại từng mục

```bash
git log --all --oneline -- .env                       # mục 1: kết quả rỗng
git grep -nE "postgres(ql)?://[^ ]+:[^@ ]+@"          # mục 1: chỉ còn giá trị mẫu và dữ liệu test
npm test                                              # mục 2, 3: tests 71, pass 71, fail 0
npm run tc -- TC-10                                   # mục 3, 4: PASS (7/7 điểm kiểm tra)
npm run tc -- TC-11                                   # mục 5: PASS (6/6 điểm kiểm tra)
npm audit --omit=dev                                  # mục 6: found 0 vulnerabilities
docker compose exec app id                            # mục 6: uid=1000(node) – không phải root
```
