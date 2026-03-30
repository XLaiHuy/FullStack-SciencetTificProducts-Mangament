import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/SidebarTopbar';

const menuItems = [
  { label: 'Dashboard', path: '/reports/dashboard' },
  { label: 'Thống kê Đề tài', path: '/reports/topic-statistics' },
  { label: 'Thống kê Hợp đồng', path: '/reports/contract-statistics' },
  { label: 'Thống kê Tiến độ', path: '/reports/progress-statistics' },
  { label: 'Xuất Báo cáo', path: '/reports/export' },
];

const ReportLayout: React.FC = () => (
  <div className="flex min-h-screen bg-background">
    <Sidebar items={menuItems} roleLabel="Báo Cáo - Thống Kê" />
    <div className="flex-grow ml-64 flex flex-col min-h-screen">
      <Topbar searchPlaceholder="Tìm kiếm báo cáo..." />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  </div>
);

export default ReportLayout;
