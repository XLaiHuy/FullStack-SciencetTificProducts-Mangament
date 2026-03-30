import type { User, UserRole, CouncilRole } from '../types';

const USER_KEY = 'nckh_user';
const TOKEN_KEY = 'nckh_token';
const COUNCIL_ROLE_KEY = 'nckh_council_role';

export const saveAuth = (user: User, token: string) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
  if (user.councilRole) {
    localStorage.setItem(COUNCIL_ROLE_KEY, user.councilRole);
  } else {
    localStorage.removeItem(COUNCIL_ROLE_KEY);
  }
};

export const getUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
};

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const isAuthenticated = (): boolean => !!getToken() && !!getUser();

export const getRole = (): UserRole | null => getUser()?.role ?? null;

export const getCouncilRole = (): CouncilRole | null =>
  (localStorage.getItem(COUNCIL_ROLE_KEY) as CouncilRole | null) ?? getUser()?.councilRole ?? null;

export const logout = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(COUNCIL_ROLE_KEY);
};

/** Returns the landing URL after login based on role and councilRole. */
export const getRoleDashboard = (role: UserRole, councilRole?: CouncilRole | null): string => {
  if (role === 'council_member') {
    const cRoutes: Record<CouncilRole, string> = {
      chairman: '/council-member/chairman',
      reviewer: '/council-member/reviewer',
      secretary: '/council-member/secretary',
      member: '/council-member/member',
    };
    return councilRole ? cRoutes[councilRole] : '/council-member/dashboard';
  }
  const map: Partial<Record<UserRole, string>> = {
    research_staff: '/research-staff/dashboard',
    project_owner: '/project-owner/dashboard',
    accounting: '/accounting/dashboard',
    archive_staff: '/archive/dashboard',
    report_viewer: '/reports/dashboard',
    superadmin: '/superadmin/dashboard',
  };
  return map[role] || '/login';
};
