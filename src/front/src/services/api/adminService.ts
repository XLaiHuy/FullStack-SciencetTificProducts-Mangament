import { axiosClient } from './axiosClient';

export type AdminUserRole =
  | 'research_staff'
  | 'project_owner'
  | 'council_member'
  | 'accounting'
  | 'archive_staff'
  | 'report_viewer'
  | 'superadmin';

export type AdminCouncilRole = 'chairman' | 'reviewer' | 'secretary' | 'member';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  councilRole?: AdminCouncilRole | null;
  title?: string | null;
  department?: string | null;
  isActive: boolean;
  isLocked: boolean;
  createdAt?: string;
  mustChangePassword?: boolean;
};

export type AdminDashboard = {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalProjects: number;
  auditLogsToday: number;
  roleCounts: Record<AdminUserRole, number>;
};

export type AdminCategory = {
  id: string;
  type: string;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SystemConfigItem = {
  id: string;
  key: string;
  value: string;
  label?: string | null;
  updatedAt: string;
};

export type AuditLogItem = {
  id: string;
  userId?: string | null;
  userName: string;
  action: string;
  module: string;
  details?: string | null;
  ipAddress?: string | null;
  timestamp: string;
};

export type PaginationMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

const mapMeta = (meta: PaginationMeta | undefined): Required<PaginationMeta> => ({
  total: meta?.total ?? 0,
  page: meta?.page ?? 1,
  limit: meta?.limit ?? 0,
  totalPages: meta?.totalPages ?? 1,
});

export const adminService = {
  async getDashboard(): Promise<AdminDashboard> {
    const res = await axiosClient.get('/admin/dashboard');
    return res.data;
  },

  async getUsers(params?: {
    search?: string;
    role?: AdminUserRole | '';
    page?: number;
    limit?: number;
  }): Promise<{ items: AdminUser[]; meta: Required<PaginationMeta> }> {
    const res = await axiosClient.get('/admin/users', { params });
    return { items: res.data ?? [], meta: mapMeta((res as any).meta) };
  },

  async createUser(payload: {
    name: string;
    email: string;
    password: string;
    role: AdminUserRole;
    councilRole?: AdminCouncilRole;
    title?: string;
    department?: string;
  }): Promise<AdminUser> {
    const res = await axiosClient.post('/admin/users', payload);
    return res.data;
  },

  async updateUser(
    id: string,
    payload: Partial<{
      name: string;
      email: string;
      role: AdminUserRole;
      councilRole: AdminCouncilRole;
      title: string;
      department: string;
    }>,
  ): Promise<AdminUser> {
    const res = await axiosClient.put(`/admin/users/${id}`, payload);
    return res.data;
  },

  async resetPassword(id: string, temporaryPassword: string): Promise<void> {
    await axiosClient.post(`/admin/users/${id}/reset-password`, { temporaryPassword });
  },

  async toggleLock(id: string): Promise<{ isLocked: boolean }> {
    const res = await axiosClient.put(`/admin/users/${id}/lock`);
    return res.data;
  },

  async getCategories(type?: string): Promise<AdminCategory[]> {
    const res = await axiosClient.get('/admin/categories', { params: type ? { type } : undefined });
    return res.data ?? [];
  },

  async createCategory(payload: {
    type: string;
    value: string;
    label: string;
    sortOrder?: number;
  }): Promise<AdminCategory> {
    const res = await axiosClient.post('/admin/categories', payload);
    return res.data;
  },

  async updateCategory(
    id: string,
    payload: Partial<{ type: string; value: string; label: string; sortOrder: number; isActive: boolean }>,
  ): Promise<AdminCategory> {
    const res = await axiosClient.put(`/admin/categories/${id}`, payload);
    return res.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await axiosClient.delete(`/admin/categories/${id}`);
  },

  async getConfig(): Promise<SystemConfigItem[]> {
    const res = await axiosClient.get('/admin/config');
    return res.data ?? [];
  },

  async saveConfig(updates: Array<{ key: string; value: string; label?: string }>): Promise<void> {
    await axiosClient.put('/admin/config', updates);
  },

  async getAuditLogs(params?: {
    module?: string;
    user?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: AuditLogItem[]; meta: Required<PaginationMeta> }> {
    const res = await axiosClient.get('/admin/audit-logs', { params });
    return { items: res.data ?? [], meta: mapMeta((res as any).meta) };
  },
};
