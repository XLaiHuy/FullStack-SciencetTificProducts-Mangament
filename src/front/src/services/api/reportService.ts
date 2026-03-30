/**
 * src/services/api/reportService.ts
 * Statistics and export helpers for the Reports module.
 */
import { axiosClient } from './axiosClient';
import type { Project } from '../../types';

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

  // GET /api/reports/export?type={type}&format={format}
  async exportReport(type: string, format: 'pdf' | 'excel'): Promise<{ url: string }> {
    const res = await axiosClient.get('/reports/export', { params: { type, format } });
    return res.data;
  },
};
