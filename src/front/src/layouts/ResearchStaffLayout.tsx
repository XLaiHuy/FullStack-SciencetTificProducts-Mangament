import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/SidebarTopbar';

const menuItems = [
  { label: 'Dashboard', path: '/research-staff/dashboard' },
  { label: 'Thành lập Hội Đồng', path: '/research-staff/council-creation' },
  { label: 'Quản lý Hợp đồng', path: '/research-staff/contract-management' },
  { label: 'Quản lý Biểu mẫu', path: '/research-staff/template-management' },
  { label: 'Theo dõi Quyết toán', path: '/research-staff/settlement-tracking' },
  { label: 'Quản lý Gia Hạn', path: '/research-staff/extension-management' },
];

const ResearchStaffLayout: React.FC = () => (
  <div className="flex min-h-screen bg-background">
    <Sidebar items={menuItems} roleLabel="Nhân viên Phòng NCKH" />
    <div className="flex-grow ml-64 flex flex-col min-h-screen">
      <Topbar searchPlaceholder="Tìm kiếm mã đề tài, tên chủ nhiệm..." />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  </div>
);

export default ResearchStaffLayout;
