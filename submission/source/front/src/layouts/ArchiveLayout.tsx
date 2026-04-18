import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/SidebarTopbar';

const menuItems = [
  { label: 'Dashboard', path: '/archive/dashboard' },
  { label: 'Kho lưu trữ', path: '/archive/repository' },
];

const ArchiveLayout: React.FC = () => (
  <div className="flex min-h-screen bg-background">
    <Sidebar items={menuItems} roleLabel="Nhân viên Lưu trữ" />
    <div className="flex-grow ml-64 flex flex-col min-h-screen">
      <Topbar searchPlaceholder="Tìm kiếm đề tài lưu trữ..." />
      <main className="flex-1 py-8 pr-8 pl-10 lg:pl-12 workspace-canvas">
        <div className="workspace-content">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);

export default ArchiveLayout;
