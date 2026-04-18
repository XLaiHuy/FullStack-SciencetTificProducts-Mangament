# Hướng dẫn chạy dự án - NCKH Management System

## Yêu cầu hệ thống
- **Java 17+** (kiểm tra: `java -version`)
- **Node.js 18+** (kiểm tra: `node -v`)
- **npm 9+** (kiểm tra: `npm -v`)

---

## Bước 1 — Chạy Backend (Spring Boot)

Mở Terminal 1, trỏ vào thư mục `back-spring`:

```powershell
cd back-spring
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

> Đợi đến khi thấy dòng:
> `Started BackSpringApplication in X seconds`
> Backend đang chạy tại: **http://localhost:8080/api**

---

## Bước 2 — Chạy Frontend (Vite + React)

Mở Terminal 2, trỏ vào thư mục `front`:

```powershell
cd front
npm install
npm run dev
```

> Frontend sẽ mở tại: **http://localhost:5173** (hoặc 5174 nếu cổng bận)

---

## Tài khoản đăng nhập demo (mật khẩu: `123456`)

| Vai trò | Email |
|---|---|
| Cán bộ QLKH | staff@nckh.edu.vn |
| Chủ nhiệm đề tài | owner@nckh.edu.vn |
| Kế toán | accounting@nckh.edu.vn |
| Lưu trữ | archive@nckh.edu.vn |
| Chủ tịch hội đồng | chairman@demo.com |
| Phản biện 1 | reviewer@demo.com |
| Phản biện 2 | council@nckh.edu.vn |
| Thư ký | secretary@demo.com |
| Xem báo cáo | reports@nckh.edu.vn |
| Super Admin | admin@nckh.edu.vn |

---

## Lưu ý
- Database dùng **H2 in-memory** (profile `local`) — tự tạo khi chạy, không cần cài thêm MySQL.
- File tải lên sẽ được lưu vào thư mục `back-spring/uploads/`.
- Nếu gặp lỗi "Port 8080 already in use", chạy: `Get-Process java | Stop-Process -Force` rồi thử lại.
