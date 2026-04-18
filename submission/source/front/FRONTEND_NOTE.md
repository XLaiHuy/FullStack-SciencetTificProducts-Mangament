# FRONTEND NOTE - NCKH SYSTEM

Tài liệu này ghi chú nhanh để vận hành frontend ổn định: chức năng, workflow chính, cấu trúc thư mục và các điểm cần lưu ý khi mở rộng.

---

## 1) Stack và nguyên tắc

- React + Vite + TypeScript.
- Routing theo role dùng React Router.
- API gọi qua `axiosClient` và gửi JWT tự động.
- Trạng thái đăng nhập lưu localStorage qua hook `useAuth`.
- Mục tiêu hiện tại: ưu tiên ổn định vận hành và bám API backend thật.

---

## 2) Cấu trúc thư mục chính

- `src/main.tsx`: entry app.
- `src/App.tsx`: mount router tổng.
- `src/router/`
  - `index.tsx`: định tuyến toàn app theo role/layout.
  - `ProtectedRoute.tsx`: chặn route theo quyền.
- `src/layouts/`: layout cho từng role.
- `src/pages/`: màn hình nghiệp vụ theo role.
- `src/services/api/`: toàn bộ API client theo module.
- `src/hooks/useAuth.ts`: lưu token/user, map dashboard theo role.
- `src/components/`: UI dùng lại.
- `src/types/index.ts`: type dùng chung frontend.

---

## 3) Workflow xác thực và điều hướng

### Login flow

1. User login tại trang `/login`.
2. Nhận access token + thông tin user từ backend.
3. Lưu vào localStorage qua `saveAuth(...)`.
4. Điều hướng về dashboard phù hợp bằng `getRoleDashboard(...)`.

### Route guard flow

1. Mọi route nghiệp vụ đi qua `ProtectedRoute`.
2. Kiểm tra đã đăng nhập chưa (`isAuthenticated()`).
3. Kiểm tra role có đúng route không.
4. Sai role hoặc chưa login -> redirect về `/login`.

---

## 4) Danh sách module chức năng

## Research Staff

- Dashboard: thống kê tổng quan đề tài/hợp đồng/quyết toán.
- Contract Management: tạo hợp đồng, cập nhật trạng thái, upload PDF hợp đồng.
- Council Creation: lập hội đồng, check conflict trước khi thêm thành viên.
- Template Management: quản lý biểu mẫu, upload template.
- Settlement Tracking: theo dõi quyết toán, gửi yêu cầu bổ sung.
- Extension Management: duyệt/từ chối gia hạn.

## Project Owner

- Dashboard: tổng quan đề tài của chủ nhiệm.
- Contract View: xem hợp đồng của đề tài.
- Midterm Report: nộp báo cáo giữa kỳ kèm file.
- Research Submission: nộp hồ sơ cuối kỳ.
- Acceptance Minutes: xem biên bản/tiến trình nghiệm thu.
- Settlement: nộp hồ sơ quyết toán.

## Council Member

- Dashboard riêng vai trò hội đồng.
- Chairman: chấm điểm theo vai trò chủ tịch.
- Reviewer: phản biện và nhận xét.
- Secretary: tổng hợp điểm, thực hiện bước chốt theo luồng.
- Member: thao tác thành viên hội đồng thường.

## Accounting

- Dashboard: tổng hợp hồ sơ tài chính/quyết toán.
- Document List/Management: xem hồ sơ và tài liệu cần xử lý.
- Liquidation Confirmation: xác nhận thanh lý theo luồng duyệt.

## Archive

- Dashboard: thống kê lưu trữ.
- Repository: tra cứu hồ sơ lưu trữ và tải tệp.

## Reports

- Dashboard báo cáo tổng hợp.
- Topic/Contract/Progress statistics.
- Export reports.

## SuperAdmin

- Dashboard quản trị.
- Account management.
- Category management.
- System config.
- Audit log.

---

## 5) API services hiện có

Trong `src/services/api/` đã có các service:

- `authService.ts`
- `projectService.ts`
- `contractService.ts`
- `councilService.ts`
- `settlementService.ts`
- `extensionService.ts`
- `templateService.ts`
- `archiveService.ts`
- `accountingService.ts`
- `reportService.ts`
- `axiosClient.ts`

Nguyên tắc sử dụng:

1. Page không gọi `fetch` trực tiếp nếu đã có service tương ứng.
2. Upload file luôn dùng `FormData`.
3. Sau mutation quan trọng (create/approve/delete), refetch dữ liệu để UI đồng bộ DB.

---

## 6) Ghi chú ổn định quan trọng

- Midterm file picker đã chuẩn hóa theo `inputRef` + `button type="button"` để tránh lỗi không mở cửa sổ chọn file.
- Khi dùng khu vực upload dạng custom, ưu tiên `ref.current.click()` thay vì thao tác DOM bằng id.
- Tránh đặt `preventDefault` lên click của nút mở file nếu không thực sự cần.

---

## 7) Workflow chuẩn khi thêm/chỉnh module mới

1. Tạo/điều chỉnh API service trước.
2. Cập nhật page gọi service.
3. Bổ sung xử lý loading/error/empty state.
4. Refetch sau mutation.
5. Kiểm tra route + role guard.
6. Ghi lại thay đổi vào log tài liệu để dễ bàn giao.

---

## 8) Checklist chạy ổn định

- Đảm bảo `VITE_API_URL` trỏ đúng backend.
- Đăng nhập bằng role đúng để test đúng luồng.
- Kiểm tra upload file với 2 bước:
  - mở được file dialog
  - submit thành công và dữ liệu hiển thị lại sau refetch
- Kiểm tra các action duyệt/xóa có thông báo lỗi rõ khi không đủ quyền.

- Kiểm tra quality gate trước khi push:
  - `npm run lint`
  - `npm run build`

Ghi chú: project đã thêm cấu hình `src/front/.eslintrc.cjs` để lệnh lint chạy được ổn định trong local/CI.

---

## 9) Đề xuất bảo trì tối thiểu

- Giữ logic gọi API trong `services/api`, tránh phân tán trong page.
- Giữ type đồng bộ giữa backend response và frontend mapping.
- Khi backend siết quyền mới, cập nhật message UI để người dùng hiểu lý do bị từ chối thao tác.

---

## 10) Final closure note (2026-03-31)

- Đã hoàn tất vòng xử lý cuối cho nhóm button fail ưu tiên: `research_staff`, `accounting`, `report_viewer`.
- Đã bổ sung handler/action thực tế cho các nút trước đây là no-op (lọc, xuất, in, xem tài liệu).
- Đã harden script `src/front/scripts/role-ui-smoke.mjs` với fallback click + retry nhẹ để giảm false-fail trên UI động.
- Kết quả smoke mới nhất: `totalButtonFailures = 0`, `totalJsErrors = 0`, `loginFailed = 0`.
- Báo cáo chi tiết kỹ thuật và trước/sau nằm tại: `docs/testing/UI_SMOKE_FINAL_FIX_REPORT_2026-03-31.md`.
