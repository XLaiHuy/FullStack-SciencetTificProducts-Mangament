import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/SidebarTopbar';

const menuItems = [
  { label: 'Dashboard', path: '/project-owner/dashboard' },
  { label: 'Xem hợp đồng', path: '/project-owner/contract-view' },
  { label: 'Báo cáo Tiến độ Giữa kỳ', path: '/project-owner/midterm-report' },
  { label: 'Nộp Kết quả Nghiên cứu', path: '/project-owner/research-submission' },
  { label: 'Biên bản Nghiệm thu', path: '/project-owner/acceptance-minutes' },
  { label: 'Quyết toán', path: '/project-owner/settlement' },
];

const ProjectOwnerLayout: React.FC = () => (
  <div className="flex min-h-screen bg-background">
    <Sidebar items={menuItems} roleLabel="Chủ nhiệm đề tài" logoLetters="N" />
    <div className="flex-grow ml-64 flex flex-col min-h-screen">
      <Topbar searchPlaceholder="Tìm kiếm đề tài..." />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  </div>
);

export default ProjectOwnerLayout;
