import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components/SidebarTopbar';
import { getCouncilRole } from '../hooks/useAuth';
import { councilMenus, menusByRole, roleLabelMap } from '../config/menuConfig';

const CouncilMemberLayout: React.FC = () => {
  const councilRole = getCouncilRole();

  // Pick the council-role-specific menu OR the generic council menu
  const menuItems = councilRole ? councilMenus[councilRole] : menusByRole.council_member;
  const roleLabel = councilRole ? roleLabelMap[councilRole] : 'Thành viên Hội đồng';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={menuItems} roleLabel={roleLabel} />
      <div className="flex-grow ml-64 flex flex-col min-h-screen">
        <Topbar searchPlaceholder="Tìm kiếm đề tài..." />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CouncilMemberLayout;
