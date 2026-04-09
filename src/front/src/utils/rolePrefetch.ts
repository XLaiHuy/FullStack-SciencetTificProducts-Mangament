import type { CouncilRole, UserRole } from '../types';

const idleSchedule = (work: () => void) => {
  const w = window as Window & {
    requestIdleCallback?: (callback: () => void) => number;
  };

  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(work);
    return;
  }

  window.setTimeout(work, 240);
};

const roleLoaders: Partial<Record<UserRole, Array<() => Promise<unknown>>>> = {
  research_staff: [
    () => import('../layouts/ResearchStaffLayout'),
    () => import('../pages/research_staff/DashboardPage'),
    () => import('../pages/research_staff/CouncilCreationPage'),
    () => import('../pages/research_staff/ContractManagementPage'),
  ],
  project_owner: [
    () => import('../layouts/ProjectOwnerLayout'),
    () => import('../pages/project_owner/DashboardPage'),
    () => import('../pages/project_owner/SettlementPage'),
    () => import('../pages/project_owner/ContractViewPage'),
  ],
  accounting: [
    () => import('../layouts/AccountingLayout'),
    () => import('../pages/accounting/DashboardPage'),
    () => import('../pages/accounting/DocumentManagementPage'),
  ],
  archive_staff: [
    () => import('../layouts/ArchiveLayout'),
    () => import('../pages/archive/DashboardPage'),
    () => import('../pages/archive/RepositoryPage'),
  ],
  report_viewer: [
    () => import('../layouts/ReportLayout'),
    () => import('../pages/reports/DashboardPage'),
    () => import('../pages/reports/ExportReportsPage'),
  ],
  superadmin: [
    () => import('../layouts/SuperAdminLayout'),
    () => import('../pages/superadmin/DashboardPage'),
    () => import('../pages/superadmin/AuditLogPage'),
  ],
  council_member: [
    () => import('../layouts/CouncilMemberLayout'),
    () => import('../pages/council_member/DashboardPage'),
    () => import('../pages/council_member/MemberPage'),
  ],
};

const councilRoleLoader: Partial<Record<CouncilRole, () => Promise<unknown>>> = {
  chairman: () => import('../pages/council_member/ChairmanPage'),
  reviewer: () => import('../pages/council_member/ReviewerPage'),
  secretary: () => import('../pages/council_member/SecretaryPage'),
  member: () => import('../pages/council_member/MemberPage'),
};

export const prefetchRoleModules = (role: UserRole, councilRole?: CouncilRole | null) => {
  const base = roleLoaders[role] ?? [];
  const specialized = role === 'council_member' && councilRole ? [councilRoleLoader[councilRole]].filter(Boolean) as Array<() => Promise<unknown>> : [];
  const loaders = [...base, ...specialized];

  if (loaders.length === 0) return;

  idleSchedule(() => {
    void Promise.allSettled(loaders.map((load) => load()));
  });
};
