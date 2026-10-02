# Smart CRM - Quản lý và phân công công việc

**Sinh viên:** Nguyễn Trọng Hải - 2374802010126
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang

## 1. Mô tả bài toán[cite: 16]
**Luồng nghiệp vụ:** Chuẩn bị dữ liệu phiếu mẫu -> Đánh giá tiêu chí (tay nghề, địa bàn, khối lượng công việc) -> Phân công kỹ thuật viên -> Đặt lịch hẹn giao nhận -> Kiểm tra trùng lịch.

## 2. Phạm vi
**Phần thực hiện (Làm):**
* Quản lý thông tin và kỹ năng kỹ thuật viên.
* Phân công kỹ thuật viên dựa theo tay nghề, địa bàn và khối lượng công việc hiện tại.
* Quản lý các phiếu yêu cầu.
* Đặt lịch hẹn giao – nhận máy cho khách hàng.
* Kiểm tra và cảnh báo trùng lịch hẹn.

**Phần ngoài phạm vi (Không làm):**
* Không làm chức năng khởi tạo yêu cầu ban đầu vì yêu cầu này được xác định là đã tồn tại.

## 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend** | HTML/CSS/JS kết hợp AJAX.|
| **Backend** | Node.js (ExpressJS).|
| **Database** | MongoDB Atlas, Porte.|
| **Tools** | Git.|
| **Deployment** | Vercel, Render hoặc Railway. |

## 4. Cấu trúc thư mục

Dự án được tổ chức với cấu trúc thư mục như sau:

```text
smartcrm-2374802010126-PhanCongCongViecVaLichHenMekongMobile/
├── docs/diagrams           # Thư mục chứa tài liệu, sơ đồ dự án
├── src/                    # Thư mục chứa mã nguồn chính
│   ├── backend/            # Mã nguồn máy chủ (Node.js/Express)
│   │   ├── node_modules/   # Chứa các gói thư viện cài đặt qua npm
│   │   ├── .gitkeep        # Giữ cấu trúc thư mục khi push lên Git
│   │   ├── package-lock.json
│   │   ├── package.json    # File quản lý cấu hình và thư viện backend
│   │   └── server.js       # File khởi chạy server và kết nối CSDL
│   └── frontend/           # Mã nguồn giao diện người dùng
│       └── .gitkeep
├── tests/                  # Thư mục chứa các kịch bản kiểm thử (testing)
├── .env                    # (Bị ẩn trên Git) File cấu hình môi trường thật
├── .env.example            # File mẫu danh sách các biến môi trường
├── .gitignore              # Cấu hình bỏ qua các file/thư mục khi commit
└── README.md               # Tài liệu giới thiệu và hướng dẫn dự án


## 5. Hướng dẫn cài đặt & chạy

Để khởi chạy dự án trên máy cá nhân, vui lòng thực hiện theo các bước sau:

**Bước 1: Thiết lập môi trường**
- Tại thư mục gốc của dự án, tạo một file trống tên là `.env` (ngang hàng với file `.env.example`).
- Copy nội dung từ `.env.example` sang `.env`.
- Cập nhật chuỗi kết nối MongoDB Atlas thật của bạn vào biến `MONGODB_URI`.

**Bước 2: Cài đặt thư viện (Dependencies)**
- Mở terminal và di chuyển vào thư mục backend:
  ```bash
  cd src/backend

## 6. Khai báo sử dụng công cụ AI

| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
| :--- | :--- | :--- |
| Gemini| hỗ trợ tạo mã, hướng dẫn setup môi trường và sử dụng Git | tạo một dự án mẫu kiểm chứng kết quả rồi mới áp dụng vào dự án chính khi đã thành công|