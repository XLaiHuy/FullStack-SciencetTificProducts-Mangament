import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/SidebarTopbar';

const menuItems = [
  { label: 'Dashboard', path: '/accounting/dashboard' },
  { label: 'Danh sách hồ sơ', path: '/accounting/document-list' },
  { label: 'Quản lý Hồ sơ', path: '/accounting/document-management' },
  { label: 'Xác nhận thanh lý', path: '/accounting/liquidation-confirmation' },
];

const AccountingLayout: React.FC = () => (
  <div className="flex min-h-screen bg-background">
    <Sidebar items={menuItems} roleLabel="Phòng Kế toán" />
    <div className="flex-grow ml-64 flex flex-col min-h-screen">
      <Topbar searchPlaceholder="Tìm kiếm hồ sơ, đề tài..." />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  </div>
);

export default AccountingLayout;
