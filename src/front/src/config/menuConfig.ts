/**
 * src/config/menuConfig.ts
 * Centralized sidebar menu configuration per role and per council sub-role.
 * Layouts read from this file to build their sidebars.
 */
import type { UserRole, CouncilRole } from '../types';

export interface MenuItem {
  label: string;
  path: string;
  icon?: string;
}

export const menusByRole: Record<UserRole, MenuItem[]> = {
  research_staff: [
    { label: 'Dashboard', path: '/research-staff/dashboard' },
    { label: 'Quản lý Hợp đồng', path: '/research-staff/contract-management' },
    { label: 'Thành lập Hội đồng', path: '/research-staff/council-creation' },
    { label: 'Quản lý Biểu mẫu', path: '/research-staff/template-management' },
    { label: 'Theo dõi Quyết toán', path: '/research-staff/settlement-tracking' },
    { label: 'Quản lý Gia hạn', path: '/research-staff/extension-management' },
  ],
  project_owner: [
    { label: 'Dashboard', path: '/project-owner/dashboard' },
    { label: 'Xem Hợp đồng', path: '/project-owner/contract-view' },
    { label: 'Báo cáo Giữa kỳ', path: '/project-owner/midterm-report' },
    { label: 'Nộp Kết quả', path: '/project-owner/research-submission' },
    { label: 'Biên bản Nghiệm thu', path: '/project-owner/acceptance-minutes' },
    { label: 'Quyết toán', path: '/project-owner/settlement' },
  ],
  council_member: [
    { label: 'Dashboard', path: '/council-member/dashboard' },
    { label: 'Chủ tịch Hội đồng', path: '/council-member/chairman' },
    { label: 'Phản biện', path: '/council-member/reviewer' },
    { label: 'Thư ký', path: '/council-member/secretary' },
    { label: 'Ủy viên', path: '/council-member/member' },
  ],
  accounting: [
    { label: 'Dashboard', path: '/accounting/dashboard' },
    { label: 'Danh sách hồ sơ', path: '/accounting/document-list' },
    { label: 'Quản lý hồ sơ', path: '/accounting/document-management' },
    { label: 'Xác nhận Thanh lý', path: '/accounting/liquidation-confirmation' },
  ],
  archive_staff: [
    { label: 'Dashboard', path: '/archive/dashboard' },
    { label: 'Kho lưu trữ', path: '/archive/repository' },
  ],
  report_viewer: [
    { label: 'Tổng quan', path: '/reports/dashboard' },
    { label: 'Thống kê Đề tài', path: '/reports/topic-statistics' },
    { label: 'Thống kê Hợp đồng', path: '/reports/contract-statistics' },
    { label: 'Thống kê Tiến độ', path: '/reports/progress-statistics' },
    { label: 'Xuất Báo cáo', path: '/reports/export' },
  ],
  superadmin: [
    { label: 'Dashboard', path: '/superadmin/dashboard' },
    { label: 'Quản lý Tài khoản', path: '/superadmin/account-management' },
    { label: 'Quản lý Danh mục', path: '/superadmin/category-management' },
    { label: 'Cấu hình Hệ thống', path: '/superadmin/system-config' },
    { label: 'Nhật ký Hệ thống', path: '/superadmin/audit-log' },
  ],
};

/** Single-item menus for council members — only shows their own role page. */
export const councilMenus: Record<CouncilRole, MenuItem[]> = {
  chairman: [
    { label: 'Tổng quan', path: '/council-member/dashboard' },
    { label: 'Chủ tịch Hội đồng', path: '/council-member/chairman' },
  ],
  reviewer: [
    { label: 'Tổng quan', path: '/council-member/dashboard' },
    { label: 'Phản biện Đề tài', path: '/council-member/reviewer' },
  ],
  secretary: [
    { label: 'Tổng quan', path: '/council-member/dashboard' },
    { label: 'Ghi Biên bản', path: '/council-member/secretary' },
  ],
  member: [
    { label: 'Tổng quan', path: '/council-member/dashboard' },
    { label: 'Đề tài Hội đồng', path: '/council-member/member' },
  ],
};

export const roleLabelMap: Partial<Record<UserRole, string>> & { chairman: string; reviewer: string; secretary: string; member: string } = {
  research_staff: 'Nhân viên Phòng NCKH',
  project_owner: 'Chủ nhiệm Đề tài',
  council_member: 'Thành viên Hội đồng',
  accounting: 'Phòng Kế toán',
  archive_staff: 'Trung tâm Lưu trữ',
  report_viewer: 'Ban Giám hiệu',
  superadmin: 'Quản trị Hệ thống',
  chairman: 'Chủ tịch Hội đồng',
  reviewer: 'Người Phản biện',
  secretary: 'Thư ký Hội đồng',
  member: 'Ủy viên Hội đồng',
};
