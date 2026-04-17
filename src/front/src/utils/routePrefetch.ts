const idleSchedule = (work: () => void) => {
  const w = window as Window & { requestIdleCallback?: (callback: () => void) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(work);
    return;
  }
  window.setTimeout(work, 180);
};

type LoaderFn = () => Promise<unknown>;

const routeLoaders: Record<string, LoaderFn[]> = {
  '/research-staff/dashboard': [() => import('../layouts/ResearchStaffLayout'), () => import('../pages/research_staff/DashboardPage')],
  '/research-staff/project-management': [() => import('../layouts/ResearchStaffLayout'), () => import('../pages/research_staff/ProjectManagementPage')],
  '/research-staff/contract-management': [() => import('../layouts/ResearchStaffLayout'), () => import('../pages/research_staff/ContractManagementPage')],
  '/research-staff/council-creation': [() => import('../layouts/ResearchStaffLayout'), () => import('../pages/research_staff/CouncilCreationPage')],
  '/research-staff/template-management': [() => import('../layouts/ResearchStaffLayout'), () => import('../pages/research_staff/TemplateManagementPage')],
  '/research-staff/settlement-tracking': [() => import('../layouts/ResearchStaffLayout'), () => import('../pages/research_staff/SettlementTrackingPage')],
  '/research-staff/extension-management': [() => import('../layouts/ResearchStaffLayout'), () => import('../pages/research_staff/ExtensionManagementPage')],

  '/project-owner/dashboard': [() => import('../layouts/ProjectOwnerLayout'), () => import('../pages/project_owner/DashboardPage')],
  '/project-owner/contract-view': [() => import('../layouts/ProjectOwnerLayout'), () => import('../pages/project_owner/ContractViewPage')],
  '/project-owner/midterm-report': [() => import('../layouts/ProjectOwnerLayout'), () => import('../pages/project_owner/MidtermReportPage')],
  '/project-owner/research-submission': [() => import('../layouts/ProjectOwnerLayout'), () => import('../pages/project_owner/ResearchSubmissionPage')],
  '/project-owner/acceptance-minutes': [() => import('../layouts/ProjectOwnerLayout'), () => import('../pages/project_owner/AcceptanceMinutesPage')],
  '/project-owner/settlement': [() => import('../layouts/ProjectOwnerLayout'), () => import('../pages/project_owner/SettlementPage')],

  '/council-member/dashboard': [() => import('../layouts/CouncilMemberLayout'), () => import('../pages/council_member/DashboardPage')],
  '/council-member/chairman': [() => import('../layouts/CouncilMemberLayout'), () => import('../pages/council_member/ChairmanPage')],
  '/council-member/reviewer': [() => import('../layouts/CouncilMemberLayout'), () => import('../pages/council_member/ReviewerPage')],
  '/council-member/secretary': [() => import('../layouts/CouncilMemberLayout'), () => import('../pages/council_member/SecretaryPage')],
  '/council-member/member': [() => import('../layouts/CouncilMemberLayout'), () => import('../pages/council_member/MemberPage')],

  '/accounting/dashboard': [() => import('../layouts/AccountingLayout'), () => import('../pages/accounting/DashboardPage')],
  '/accounting/document-list': [() => import('../layouts/AccountingLayout'), () => import('../pages/accounting/DocumentListPage')],
  '/accounting/document-management': [() => import('../layouts/AccountingLayout'), () => import('../pages/accounting/DocumentManagementPage')],
  '/accounting/liquidation-confirmation': [() => import('../layouts/AccountingLayout'), () => import('../pages/accounting/LiquidationConfirmationPage')],

  '/archive/dashboard': [() => import('../layouts/ArchiveLayout'), () => import('../pages/archive/DashboardPage')],
  '/archive/repository': [() => import('../layouts/ArchiveLayout'), () => import('../pages/archive/RepositoryPage')],

  '/reports/dashboard': [() => import('../layouts/ReportLayout'), () => import('../pages/reports/DashboardPage')],
  '/reports/topic-statistics': [() => import('../layouts/ReportLayout'), () => import('../pages/reports/TopicStatisticsPage')],
  '/reports/contract-statistics': [() => import('../layouts/ReportLayout'), () => import('../pages/reports/ContractStatisticsPage')],
  '/reports/progress-statistics': [() => import('../layouts/ReportLayout'), () => import('../pages/reports/ProgressStatisticsPage')],
  '/reports/export': [() => import('../layouts/ReportLayout'), () => import('../pages/reports/ExportReportsPage')],

  '/superadmin/dashboard': [() => import('../layouts/SuperAdminLayout'), () => import('../pages/superadmin/DashboardPage')],
  '/superadmin/account-management': [() => import('../layouts/SuperAdminLayout'), () => import('../pages/superadmin/AccountManagementPage')],
  '/superadmin/category-management': [() => import('../layouts/SuperAdminLayout'), () => import('../pages/superadmin/CategoryManagementPage')],
  '/superadmin/system-config': [() => import('../layouts/SuperAdminLayout'), () => import('../pages/superadmin/SystemConfigPage')],
  '/superadmin/audit-log': [() => import('../layouts/SuperAdminLayout'), () => import('../pages/superadmin/AuditLogPage')],
};

const prefetchedRoutes = new Set<string>();

export const prefetchRouteByPath = (path: string) => {
  if (prefetchedRoutes.has(path)) return;

  const loaders = routeLoaders[path];
  if (!loaders || loaders.length === 0) return;

  prefetchedRoutes.add(path);

  idleSchedule(() => {
    void Promise.allSettled(loaders.map((load) => load()));
  });
};
