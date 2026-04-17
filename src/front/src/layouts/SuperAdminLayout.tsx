import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/SidebarTopbar';

const menuItems = [
  { label: 'Dashboard', path: '/superadmin/dashboard' },
  { label: 'Quản lý tài khoản', path: '/superadmin/account-management' },
  { label: 'Cấu hình hệ thống', path: '/superadmin/system-config' },
  { label: 'Audit Log', path: '/superadmin/audit-log' },
  { label: 'Quản lý danh mục', path: '/superadmin/category-management' },
];

const SuperAdminLayout: React.FC = () => (
  <div className="flex min-h-screen bg-background">
    <Sidebar items={menuItems} roleLabel="System Admin" logoLetters="SA" />
    <div className="flex-grow ml-64 flex flex-col min-h-screen">
      <Topbar searchPlaceholder="Tìm kiếm tài khoản, log..." />
      <main className="flex-1 py-8 pr-8 pl-10 lg:pl-12 workspace-canvas">
        <div className="workspace-content">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);

export default SuperAdminLayout;
