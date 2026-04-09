const idleSchedule = (work: () => void) => {
  const w = window as Window & { requestIdleCallback?: (callback: () => void) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(work);
    return;
  }
  window.setTimeout(work, 180);
};

const hasPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export const prefetchRouteByPath = (path: string) => {
  idleSchedule(() => {
    if (hasPrefix(path, '/research-staff')) {
      void Promise.allSettled([
        import('../layouts/ResearchStaffLayout'),
        import('../pages/research_staff/DashboardPage'),
      ]);
      return;
    }

    if (hasPrefix(path, '/project-owner')) {
      void Promise.allSettled([
        import('../layouts/ProjectOwnerLayout'),
        import('../pages/project_owner/DashboardPage'),
      ]);
      return;
    }

    if (hasPrefix(path, '/council-member')) {
      void Promise.allSettled([
        import('../layouts/CouncilMemberLayout'),
        import('../pages/council_member/DashboardPage'),
      ]);
      return;
    }

    if (hasPrefix(path, '/accounting')) {
      void Promise.allSettled([
        import('../layouts/AccountingLayout'),
        import('../pages/accounting/DashboardPage'),
      ]);
      return;
    }

    if (hasPrefix(path, '/archive')) {
      void Promise.allSettled([
        import('../layouts/ArchiveLayout'),
        import('../pages/archive/DashboardPage'),
      ]);
      return;
    }

    if (hasPrefix(path, '/reports')) {
      void Promise.allSettled([
        import('../layouts/ReportLayout'),
        import('../pages/reports/DashboardPage'),
      ]);
      return;
    }

    if (hasPrefix(path, '/superadmin')) {
      void Promise.allSettled([
        import('../layouts/SuperAdminLayout'),
        import('../pages/superadmin/DashboardPage'),
      ]);
    }
  });
};
