# 📘 NCKH SYSTEM - TÀI LIỆU KỸ THUẬT & HƯỚNG DẪN TRIỂN KHAI

Tài liệu này tổng hợp toàn bộ cấu trúc hệ thống, quy trình chạy thực tế (Local) và Hướng dẫn đẩy lên Git / Deploy lên Cloud (Production).

---

## 🏗 1. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống NCKH (Nghiên cứu khoa học) được xây dựng theo mô hình **Full-Stack Separated** (Frontend và Backend tách biệt kết nối qua RESTful API).

### 🖥 Frontend (`src/front`)
*   **Core:** React.js + Vite + TypeScript.
*   **Networking:** `Axios` (cấu hình tại `axiosClient.ts` tự động chèn JWT Header). Cải tiến từ MockDB lên API thực.
*   **UI:** Tailwind CSS / Shadcn (Nếu có dùng UI components).
*   **Module đã tích hợp API:** `authService.ts` (Login/Logout), `projectService.ts` (Đề tài), `contractService.ts` (Hợp đồng), `councilService.ts` (Hội đồng, COI Check).

### ⚙️ Backend (`src/back`)
*   **Core:** Node.js + Express + TypeScript.
*   **ORM Database:** Prisma ORM kết nối MySQL.
*   **Kiến trúc:** **3-Layer Architecture** chuẩn doanh nghiệp:
    *   **Controller Layer**: Xử lý HTTP Req/Res (vd: `project.controller.ts`). Validate body bằng `Zod`.
    *   **Service Layer**: Xử lý logic nghiệp vụ, State Machine, validate COI (vd: `project.service.ts`). Tự sinh mã `ĐT-YYMM-xxxx`.
    *   **Repository Layer**: Xử lý logic truy vấn Prisma, query `is_deleted: false` (vd: `project.repository.ts`).
*   **Bảo mật:** JWT Authentication (`/utils/jwt.ts`), Bcrypt password hashing, RBAC (Role-based access control) middleware.
*   **Soft Delete:** Cấu trúc 13 bảng schema đều được sử dụng field `is_deleted: Boolean @default(false)` thay cho xóa xóa vật lý.

---

## 🚀 2. HƯỚNG DẪN CHẠY LOCAL (DEVELOPMENT)

Để chạy dự án ở máy cá nhân (Localhost), cần mở **2 terminal** độc lập:

### Bước 1: Khởi động Backend + MySQL
Mở terminal 1, di chuyển vào folder `src/back`:
```bash
cd src/back
npm install

# 1. Khởi tạo Database MySQL
# Sửa mật khẩu và port trong file .env phần DATABASE_URL="mysql://root:password@localhost:3306/nckh_db"
npx prisma db push --accept-data-loss
npx prisma generate

# 2. Sinh dữ liệu giả (Seed data bao gồm users, project_members)
npm run db:seed

# 3. Chạy server (Sẽ mở tại http://localhost:3000)
npm run dev
```

### Bước 2: Khởi động Frontend
Mở terminal 2, di chuyển vào folder `src/front`:
```bash
cd src/front
npm install

# Tạo file .env nếu chưa có và thêm:
# VITE_API_URL=http://localhost:3000/api

npm run dev
# -> Trang web sẽ host ở http://localhost:5173 
```
**(Demo Account: `owner@nckh.edu.vn` hoặc `staff@nckh.edu.vn` - Mật khẩu chung: `123456`)**

---

## 🐙 3. HƯỚNG DẪN PUSH LÊN GITHUB

Để bảo mật, CHÚ Ý không bao giờ push file `.env` hoặc thư mục `node_modules` lên Github.

**Bước 1: Setup `.gitignore` ở thư mục gốc (Nếu chưa có)**
Đảm bảo bạn có file `.gitignore` chứa:
```text
node_modules/
.env
dist/
uploads/
```

**Bước 2: Push code lên Git**
Tại thư mục gốc của dự án (`c:\Users\HUY\Documents\Frontend + Backend NCKH`):
```bash
git init
git add .
git commit -m "feat: Hoan thien fullstack 3-Layer NCKH System"
git branch -M main
git remote add origin https://github.com/Username_cua_ban/TenRepo.git
git push -u origin main
```

---

## ☁️ 4. HƯỚNG DẪN DEPLOY LÊN CLOUD (PRODUCTION)

Kiến trúc tách rời cho phép **deploy Frontend và Backend ở 2 server độc lập**. Dưới đây là cách triển khai miễn phí/rẻ trên Cloud.

### A. Deploy Database (MySQL)
*Khuyên dùng: **Aiven** (Có gói Free MySQL), hoặc **TiDB**.*
1. Tạo account Aiven / TiDB.
2. Tạo MySQL Service. Lấy chuỗi kết nối **Connection String** (URI).
3. Đổi biến `DATABASE_URL` trong Backend `.env` thành chuỗi vừa lấy.
4. Chạy `npx prisma db push` ở máy Local để đẩy Schema từ máy tính bạn lên Database trên mạng.

### B. Deploy Backend Node.js (Render.com / Railway.app)
1. Đăng nhập Render.com -> Tạo mới **Web Service**.
2. Kết nối tới Github Repo của bạn.
3. Thiết lập thư mục gốc (Root Directory): Lắp `src/back`.
4. Command Build: `npm install && npx prisma generate` (Lưu ý phải chạy generate).
5. Command Start: `npx ts-node src/server.ts` (hoặc build ra dist tuỳ cấu hình prod).
6. **THÊM MÔI TRƯỜNG (Environment Variables)**:
   - Copy tất cả nội dung trong `.env` vào tab Environment của Render.
   - Thay URL Frontend vào mục `FRONTEND_URL` (ví dụ `https://nckh-front.vercel.app`) để mở CORS cho nó.
   - Điền URL Database lấy ở Bước A vào mục `DATABASE_URL`.

### C. Deploy Frontend React/Vite (Vercel / Netlify)
1. Đăng nhập Vercel.com -> Tạo mới **Project** -> Kết nối tới Github Repo.
2. Thiết lập thư mục gốc (Root Directory): Lắp `src/front`.
3. Vercel sẽ tự nhận diện Vite (Build command: `npm run build`, Out dir: `dist`).
4. **THÊM MÔI TRƯỜNG:** Tại tab Env, thêm:
   `VITE_API_URL` = `https://<ten-backend-tren-render>.onrender.com/api`
5. Nhấn **Deploy** và chờ Vercel nhả URL trang web thật của bạn.

---

🎉 **HỆ THỐNG ĐÃ SẴN SÀNG - HAPPY CODING!** 🎉

---

## ✅ FRONTEND INTEGRATION PROGRESS (Auto log)

### 2026-03-30
- **research_staff/ContractManagementPage**: thay `mockApi` bằng API thật.
  - **Fetch**: `GET /api/contracts`, `GET /api/projects`
  - **Create contract**: `POST /api/contracts` (backend tự sinh mã HĐ `HĐ-YYMM-nnnn`)
  - **Upload PDF scan**: `POST /api/contracts/:id/upload` bằng `FormData`
  - **State refresh**: refetch sau mutation để UI luôn khớp DB (kể cả F5)

- **research_staff/CouncilCreationPage**: nối API thật + check COI trước khi thêm thành viên.
  - **Fetch**: `GET /api/councils`, `GET /api/projects` (lọc `status=cho_nghiem_thu` ở FE)
  - **COI guard**: `POST /api/councils/check-conflict` trước khi thêm member
  - **Create council**: `POST /api/councils` với `projectId` + `members`

- **research_staff/DashboardPage**: thay mock bằng dữ liệu thật từ MySQL.
  - **Fetch**: `GET /api/projects` + `GET /api/reports/dashboard`
  - **Hiển thị số liệu thực**: tổng đề tài, đang thực hiện, chờ nghiệm thu, trễ hạn
  - **Tỷ lệ trạng thái**: tính động theo dữ liệu API thay vì hard-code

- **research_staff/TemplateManagementPage**: loại bỏ mock, dùng API biểu mẫu thật.
  - **Fetch**: `GET /api/templates`
  - **Upload**: `POST /api/templates` bằng `FormData` (name, version, role, effectiveDate, file)
  - **Soft delete**: `DELETE /api/templates/:id` + refetch ngay sau mutation

- **research_staff/SettlementTrackingPage**: loại bỏ mock, đồng bộ quyết toán từ backend.
  - **Fetch**: `GET /api/settlements` + `GET /api/reports/dashboard`
  - **Mutation**: gửi bổ sung `POST /api/settlements/:id/supplement-request`, xác nhận `PUT /api/settlements/:id/status`
  - **State persistence**: mọi thao tác đều `refetch` để UI khớp DB

- **accounting/DashboardPage**: bỏ mock dashboard.
  - **Fetch**: `GET /api/accounting/dashboard` + `GET /api/projects`
  - **Hiển thị**: thống kê quyết toán realtime (tổng hồ sơ, chờ xử lý, đã xác nhận, tổng tiền)

- **project_owner/MidtermReportPage**: nối nộp báo cáo giữa kỳ bằng upload thật.
  - **Fetch**: `GET /api/projects` để chọn đề tài
  - **Upload**: `POST /api/projects/:id/midterm-report` bằng `FormData` (`content`, `file`)

- **project_owner/ResearchSubmissionPage**: nối nộp hồ sơ cuối kỳ.
  - **Fetch**: `GET /api/projects` để chọn đề tài
  - **Upload**: `POST /api/projects/:id/final-submission` bằng `FormData`

- **council_member/ReviewerPage**: nối API gửi nhận xét/chấm điểm.
  - **Mutation**: `POST /api/councils/:id/review`
  - **UI rule**: khóa nút/ô nhập sau khi submit (disable chỉnh sửa lại)

- **council_member/ChairmanPage**: nối API chấm điểm chủ tịch.
  - **Mutation**: `POST /api/councils/:id/score`
  - **UI rule**: khóa form sau khi submit

- **council_member/SecretaryPage**: tổng hợp điểm và chốt nghiệm thu.
  - **Fetch**: `GET /api/councils/:id` để hiển thị điểm thành viên
  - **Finalize**: `PUT /api/councils/:id/complete` để xác nhận hoàn tất chỉnh sửa

- **accounting/LiquidationConfirmationPage**: nối xác nhận thanh lý.
  - **Fetch**: `GET /api/accounting/documents`
  - **Mutation**: `POST /api/accounting/liquidation/:id/confirm` + refetch

- **Endpoint naming standardization (FE + BE)**
  - **Projects/Product**:
    - Thêm backend endpoint chuẩn `POST /api/projects/:id/products` (field `type`: `midterm_report|final_report|paper|software|other`)
    - FE dùng `projectService.submitProduct(...)` cho nộp giữa kỳ/cuối kỳ
  - **Council**:
    - Thêm alias chuẩn `POST /api/council/:id/score-reviews`
    - Thêm endpoint tổng hợp `GET /api/council/:id/score-summary`
  - **Revisions**:
    - Thêm module route `PUT /api/revisions/:id/approve` (map vào flow hoàn tất nghiệm thu)
  - **Settlements**:
    - Thêm alias chuẩn `PUT /api/settlements/:id/approve`
  - **Reports stats**:
    - Thêm alias chuẩn `GET /api/reports/stats`

- **Module Gia hạn (Extension Management)**
  - Chuẩn hóa endpoint qua alias `api/extension-requests` (song song `api/extensions`)
  - `POST /api/extension-requests` nhận `FormData` gồm `requested_deadline`, `reason`, `supporting_document`
  - `PUT /api/extension-requests/:id/approve` cho Admin NCKH duyệt
  - Giữ business logic backend: khi duyệt, tự cập nhật `projects.endDate` tương ứng

- **Module Kho lưu trữ & bảo mật tải tài liệu**
  - Thêm endpoint danh sách chuẩn `GET /api/archives` (lọc đề tài trạng thái đã nghiệm thu)
  - Thêm endpoint tải `GET /api/archives/:topicId/download`
  - Với role nội bộ (`project_owner`), backend đóng watermark PDF trước khi trả file (logo placeholder, tên người tải, mã người dùng, thời gian tải)
  - Cài dependency `pdf-lib` cho watermark pipeline

- **Frontend cleanup mock còn lại & kết nối API**
  - `research_staff/ExtensionManagementPage`: bỏ mock, gọi `extensionService` + refetch sau approve/create
  - `archive/DashboardPage` + `archive/RepositoryPage`: bỏ mock, dùng `archiveService.getAll()` và download qua API
  - `accounting/DocumentManagementPage` + `accounting/DocumentListPage`: bỏ mock, dùng dữ liệu `archives` + tải tài liệu thật
  - `council_member/SecretaryPage`: đổi sang `score-summary` và `revisions/:id/approve`

### 2026-03-30 (Phase: Template CMS + Soft Delete Audit Finalization)
- **Template CMS nâng cấp (form_types + form_templates)**
  - Mở rộng Prisma schema: thêm model `FormType` (`form_types`) và `FormTemplate` (`form_templates`)
  - Backend `templates`:
    - Upload template theo `formTypeCode` + `targetRole`
    - Auto versioning default: bản mới `isDefault=true`, bản cũ cùng cặp type/role `isDefault=false`
    - Auto-fill `.docx` giữ engine `docxtemplater + pizzip`, data map từ DB (`project_code`, `project_name`, `owner_name`, `owner_title`, ...)
  - Frontend `TemplateManagementPage`:
    - Thêm chọn `Loại biểu mẫu` (form type) + `Vai trò`
    - Upload/refetch theo API mới

- **Chuẩn hóa lưu file**
  - Product/report upload chuyển về `uploads/products` (thay vì `uploads/reports`)
  - Bổ sung auto-create thư mục `uploads/products` khi server khởi động

- **Soft Delete Audit tổng kiểm kê**
  - Xác nhận không còn lệnh `prisma.*.delete(...)` trong backend source
  - Chuẩn hóa log xóa:
    - `Contracts`, `Projects`, `Admin Users`, `Templates` ghi `action='DELETE'`
    - `details` chứa `old_values` để đối soát
  - Hội đồng `Gỡ thành viên`:
    - Backend dùng soft delete `is_deleted=true`
    - Frontend đổi nút thành “Gỡ thành viên” và hiển thị trạng thái “Đã gỡ” để tránh mất dấu thông tin

- **Logic Hội đồng & Quyết toán (endpoint chuẩn)**
  - `PUT /api/revisions/:id/approve`: thư ký chốt bản sửa cuối -> flow complete nghiệm thu
  - `PUT /api/settlements/:id/approve`: kế toán duyệt thanh lý -> đồng bộ trạng thái project sang `da_thanh_ly`

---

### 2026-03-30 (Phase: Generate Migration SQL)
- Đã sinh script SQL migration để cập nhật DB theo Prisma schema hiện tại (Form CMS + soft delete fields + form_types/form_templates).
- File SQL: `src/back/prisma/migrations/20260330150000_form_types_form_templates_softdelete_audit.sql`
- Nội dung script:
  - Bổ sung `is_deleted` cho các bảng dùng soft delete
  - Tạo bảng `project_members`
  - Tạo bảng `form_types` và `form_templates`
  - Thêm constraint/foreign keys cần thiết

### Áp migration lên MySQL
1. Mở MySQL client (phpMyAdmin / MySQL Workbench / CLI).
2. Chạy toàn bộ nội dung file SQL phía trên trong schema `nckh_db`.

### Council score-summary FK fix
- File SQL: `src/back/prisma/migrations/20260330152000_council_reviews_member_fk.sql`
- Chạy file này sau khi chạy file migration chính phía trên.

---

### 2026-03-31 (Phase: Stability Hardening + Security Guardrails)

Mục tiêu: ưu tiên hệ thống chạy ổn định, tránh lỗi runtime ở các luồng upload/duyệt, và giảm rủi ro truy cập sai tài nguyên.

- **Ổn định upload báo cáo giữa kỳ (frontend trigger ảnh hưởng backend flow nộp file)**
  - Đã chuẩn hóa cơ chế mở file picker bằng `inputRef` + `button type="button"` ở màn hình nộp giữa kỳ.
  - Tránh phụ thuộc `document.getElementById(...).click()` có thể lỗi trên một số trình duyệt/chính sách bảo mật.

- **Soft Delete consistency cho Auth**
  - `auth.service.ts`: các luồng `refresh`, `getMe`, `changePassword` đã thêm điều kiện `is_deleted: false`.
  - Ngăn tài khoản đã soft-delete tiếp tục sử dụng token hoặc đổi mật khẩu.

- **Fix nghiệp vụ Hội đồng (Council Review/Score) – lỗi mapping userId/memberId**
  - `council.service.ts`:
    - `submitReview` và `submitScore` chuyển sang resolve thành viên bằng bộ khóa: `councilId + userId + is_deleted=false`.
    - Sau khi resolve mới dùng `membership.id` để upsert vào `council_reviews`.
  - Tránh lỗi sai khóa ngoại và sai quyền khi user không thuộc hội đồng.

- **Lọc thành viên đã gỡ trong response Hội đồng**
  - `getAll`, `getById`, `getByMember` chỉ trả `members` có `is_deleted=false`.
  - `removeMember` kiểm tra thành viên đúng `councilId` và chưa bị gỡ trước khi update.

- **Authorization check cho các endpoint nhạy cảm theo owner resource**
  - `contract.service.ts`: `sign()` chỉ cho phép chủ nhiệm đề tài của hợp đồng ký.
  - `project.service.ts`: `submitMidtermReport`, `submitFinalReport`, `submitProduct` chỉ cho phép owner của đề tài thao tác.
  - `project.controller.ts`: cập nhật call signature `submitMidtermReport(..., actorId)`.
  - `settlement.service.ts`: `create()` chỉ cho phép owner của đề tài nộp quyết toán.
  - `extension.service.ts`: `create()` chỉ cho phép owner của đề tài tạo yêu cầu gia hạn.

- **Archive query guard**
  - `archive.routes.ts`: endpoint repository chỉ lấy dữ liệu gắn với project `is_deleted=false`.

- **Prisma schema alignment theo migration mới nhất**
  - `schema.prisma`: relation `CouncilReview.member` cập nhật `onDelete: Restrict, onUpdate: Cascade` để khớp migration `20260330152000_council_reviews_member_fk.sql`.

- **Validation sau chỉnh sửa**
  - Đã kiểm tra lỗi trên các file sửa đổi chính (frontend + backend + prisma schema): **không có lỗi mới**.

- **Ảnh hưởng vận hành**
  - Không đổi API contract hiện có ở frontend/backend (ngoại trừ logic kiểm tra quyền được siết chặt).
  - Không phát sinh migration mới bắt buộc ở lần chỉnh này (schema chỉ align metadata relation).

### 2026-03-31 (Phase: Final Release Readiness)

- **Chuẩn hóa thư mục migration Prisma**
  - Chuyển 2 file SQL rời sang đúng format migration folder:
    - `prisma/migrations/20260330150000_form_types_form_templates_softdelete_audit/migration.sql`
    - `prisma/migrations/20260330152000_council_reviews_member_fk/migration.sql`
  - Xóa file SQL rời cũ để tránh nhầm lẫn khi chạy `prisma migrate status/deploy`.

- **Đồng bộ lịch sử migration với DB hiện tại**
  - Đã chạy và đánh dấu applied:
    - `20260330122526_init`
    - `20260330150000_form_types_form_templates_softdelete_audit`
    - `20260330152000_council_reviews_member_fk`
  - Kết quả: `prisma migrate status` báo `Database schema is up to date!`

- **Xác minh DB/schema parity**
  - Đã chạy `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code`.
  - Kết quả: không có sai lệch schema giữa DB thực tế và Prisma schema.

- **Mục tiêu release**
  - Hệ thống backend ở trạng thái sẵn sàng cho deploy theo migration history chuẩn Prisma.
