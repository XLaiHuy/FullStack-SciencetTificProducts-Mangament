/**
 * src/services/api/reportService.ts
 * Statistics and export helpers for the Reports module.
 */
import { axiosClient } from './axiosClient';
import type { Project } from '../../types';
import { downloadFromApi } from './downloadUtil';

export interface SystemStats {
  totalProjects: number;
  activeProjects: number;
  overdueProjects: number;
  completedProjects: number;
  totalBudget: number;
  disbursedBudget: number;
  contractsTotal: number;
  contractsActive: number;
  contractsPending: number;
}

export interface ReportFilterOptions {
  schoolYears: string[];
  fields: string[];
  departments: string[];
  statuses: string[];
}

export const reportService = {
  // GET /api/reports/dashboard
  async getStats(): Promise<SystemStats> {
    const res = await axiosClient.get('/reports/stats');
    const data = res.data;
    return {
      totalProjects: data.totalProjects ?? 0,
      activeProjects: data.activeProjects ?? 0,
      overdueProjects: data.overdueProjects ?? 0,
      completedProjects: data.completedProjects ?? 0,
      totalBudget: data.totalBudget ?? 0,
      disbursedBudget: data.disbursedBudget ?? 0,
      contractsTotal: data.totalContracts ?? 0,
      contractsActive: data.activeContracts ?? 0,
      contractsPending: data.pendingContracts ?? 0,
    };
  },

  // GET /api/reports/topics
  async getProjectsByField(): Promise<{ field: string; count: number }[]> {
    const res = await axiosClient.get('/reports/topics');
    return res.data;
  },

  // GET /api/reports/progress
  async getProjectsByStatus(): Promise<{ status: Project['status']; count: number }[]> {
    const res = await axiosClient.get('/reports/progress');
    return res.data;
  },

  async getContractsByStatus(): Promise<Array<{ status: string; count: number; totalBudget: number }>> {
    const res = await axiosClient.get('/reports/contracts');
    return res.data ?? [];
  },

  async getFilterOptions(): Promise<ReportFilterOptions> {
    const res = await axiosClient.get('/reports/filter-options');
    return {
      schoolYears: res.data?.schoolYears ?? [],
      fields: res.data?.fields ?? [],
      departments: res.data?.departments ?? [],
      statuses: res.data?.statuses ?? [],
    };
  },

  async exportReport(
    type: string,
    format: 'csv' | 'excel',
    params?: { schoolYear?: string; field?: string; department?: string; status?: string },
  ): Promise<void> {
    const search = new URLSearchParams({
      type,
      format,
      ...(params?.schoolYear ? { schoolYear: params.schoolYear } : {}),
      ...(params?.field ? { field: params.field } : {}),
      ...(params?.department ? { department: params.department } : {}),
      ...(params?.status ? { status: params.status } : {}),
    }).toString();
    await downloadFromApi(`/reports/export?${search}`, `report_${type}.${format === 'csv' ? 'csv' : 'xlsx'}`);
  },
};
