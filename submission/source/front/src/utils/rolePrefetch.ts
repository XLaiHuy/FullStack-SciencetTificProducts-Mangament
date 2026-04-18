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

type LoaderFn = () => Promise<unknown>;

const roleCriticalLoaders: Partial<Record<UserRole, LoaderFn[]>> = {
  research_staff: [
    () => import('../layouts/ResearchStaffLayout'),
    () => import('../pages/research_staff/DashboardPage'),
  ],
  project_owner: [
    () => import('../layouts/ProjectOwnerLayout'),
    () => import('../pages/project_owner/DashboardPage'),
  ],
  accounting: [
    () => import('../layouts/AccountingLayout'),
    () => import('../pages/accounting/DashboardPage'),
  ],
  archive_staff: [
    () => import('../layouts/ArchiveLayout'),
    () => import('../pages/archive/DashboardPage'),
  ],
  report_viewer: [
    () => import('../layouts/ReportLayout'),
    () => import('../pages/reports/DashboardPage'),
  ],
  superadmin: [
    () => import('../layouts/SuperAdminLayout'),
    () => import('../pages/superadmin/DashboardPage'),
  ],
  council_member: [
    () => import('../layouts/CouncilMemberLayout'),
    () => import('../pages/council_member/DashboardPage'),
  ],
};

const roleSecondaryLoaders: Partial<Record<UserRole, LoaderFn[]>> = {
  research_staff: [
    () => import('../pages/research_staff/CouncilCreationPage'),
    () => import('../pages/research_staff/ContractManagementPage'),
    () => import('../pages/research_staff/TemplateManagementPage'),
    () => import('../pages/research_staff/ProjectManagementPage'),
  ],
  project_owner: [
    () => import('../pages/project_owner/SettlementPage'),
    () => import('../pages/project_owner/ContractViewPage'),
    () => import('../pages/project_owner/ResearchSubmissionPage'),
  ],
  accounting: [
    () => import('../pages/accounting/DocumentManagementPage'),
  ],
  archive_staff: [
    () => import('../pages/archive/RepositoryPage'),
  ],
  report_viewer: [
    () => import('../pages/reports/ExportReportsPage'),
  ],
  superadmin: [
    () => import('../pages/superadmin/AuditLogPage'),
  ],
  council_member: [
    () => import('../pages/council_member/MemberPage'),
  ],
};

const councilRoleLoader: Partial<Record<CouncilRole, () => Promise<unknown>>> = {
  chairman: () => import('../pages/council_member/ChairmanPage'),
  reviewer: () => import('../pages/council_member/ReviewerPage'),
  secretary: () => import('../pages/council_member/SecretaryPage'),
  member: () => import('../pages/council_member/MemberPage'),
};

const prefetchSessions = new Set<string>();

const shouldRunSecondaryPrefetch = () => {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;

  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g';
};

const runLoaders = (loaders: LoaderFn[], delayMs = 0) => {
  if (loaders.length === 0) return;

  idleSchedule(() => {
    const execute = () => {
      void Promise.allSettled(loaders.map((load) => load()));
    };

    if (delayMs > 0) {
      window.setTimeout(execute, delayMs);
      return;
    }

    execute();
  });
};

const runLoadersGradually = (loaders: LoaderFn[], startDelayMs = 0, stepDelayMs = 140) => {
  if (loaders.length === 0) return;

  idleSchedule(() => {
    loaders.forEach((load, index) => {
      window.setTimeout(() => {
        void load().catch(() => undefined);
      }, startDelayMs + index * stepDelayMs);
    });
  });
};

export const prefetchRoleModules = (role: UserRole, councilRole?: CouncilRole | null) => {
  const cacheKey = `${role}:${councilRole ?? 'none'}`;
  if (prefetchSessions.has(cacheKey)) return;
  prefetchSessions.add(cacheKey);

  const critical = roleCriticalLoaders[role] ?? [];
  const secondary = roleSecondaryLoaders[role] ?? [];
  const specialized = role === 'council_member' && councilRole ? [councilRoleLoader[councilRole]].filter(Boolean) as LoaderFn[] : [];

  const criticalLoaders = [...critical, ...specialized];
  const secondaryLoaders = [...secondary];

  runLoaders(criticalLoaders);

  if (shouldRunSecondaryPrefetch()) {
    runLoadersGradually(secondaryLoaders, 800, 180);
  }
};
