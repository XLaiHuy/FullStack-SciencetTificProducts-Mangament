/**
 * src/services/api/projectService.ts
 * CRUD operations for research projects communicating with Real API.
 */
import { axiosClient } from './axiosClient';
import type { Project } from '../../types';
import { downloadFromApi } from './downloadUtil';

/** Normalize backend Project (owner is object) → frontend Project (owner is string) */
const mapProject = (p: any): Project => ({
  ...p,
  ownerId: p.owner?.id ?? p.ownerId,
  ownerEmail: p.owner?.email,
  owner: typeof p.owner === 'object' && p.owner !== null ? p.owner.name ?? '' : p.owner ?? '',
  ownerTitle: p.owner?.title ?? p.ownerTitle ?? '',
  budget: Number(p.budget ?? 0),
  advancedAmount: Number(p.advancedAmount ?? 0),
  startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
  endDate: p.endDate   ? new Date(p.endDate).toISOString().split('T')[0]   : '',
});

export const projectService = {
  // GET /api/projects
  async getAll(): Promise<Project[]> {
    const res = await axiosClient.get('/projects');
    return (res.data ?? []).map(mapProject);
  },

  // GET /api/projects/{id}
  async getById(id: string): Promise<Project | undefined> {
    const res = await axiosClient.get(`/projects/${id}`);
    return res.data ? mapProject(res.data) : undefined;
  },

  // GET /api/projects/{id}/reports/{reportId}/download
  async downloadReportFile(projectId: string, reportId: string, fallbackFileName?: string): Promise<void> {
    await downloadFromApi(
      `/projects/${projectId}/reports/${reportId}/download`,
      fallbackFileName ?? `report_${reportId}.dat`
    );
  },

  // GET /api/projects?status={status}
  async getByStatus(status: Project['status']): Promise<Project[]> {
    const res = await axiosClient.get(`/projects`, { params: { status } });
    return (res.data ?? []).map(mapProject);
  },

  // GET /api/projects/my
  async getByOwnerEmail(_ownerEmail: string): Promise<Project[]> {
    const res = await axiosClient.get('/projects/my');
    return (res.data ?? []).map(mapProject);
  },

  // PUT /api/projects/{id}/status
  async updateStatus(id: string, status: Project['status'], _actorName: string): Promise<void> {
    await axiosClient.put(`/projects/${id}/status`, { status });
  },

  // POST /api/projects/{id}/midterm-report
  async submitMidtermReport(id: string, payload: { content: string; file: File }): Promise<void> {
    const form = new FormData();
    form.append('content', payload.content);
    form.append('file', payload.file);
    await axiosClient.post(`/projects/${id}/midterm-report`, form);
  },

  // POST /api/projects/{id}/final-submission
  async submitFinalSubmission(id: string, payload: { content: string; file: File }): Promise<void> {
    const form = new FormData();
    form.append('content', payload.content);
    form.append('file', payload.file);
    await axiosClient.post(`/projects/${id}/final-submission`, form);
  },

  // POST /api/projects/{id}/products (standardized)
  async submitProduct(id: string, payload: {
    type: 'midterm_report' | 'final_report' | 'paper' | 'software' | 'other';
    content?: string;
    file: File;
  }): Promise<void> {
    const form = new FormData();
    form.append('type', payload.type);
    if (payload.content) form.append('content', payload.content);
    form.append('file', payload.file);
    await axiosClient.post(`/projects/${id}/products`, form);
  },

  // POST /api/projects
  async create(data: {
    title: string;
    ownerId: string;
    ownerTitle?: string;
    department: string;
    field: string;
    startDate: string;
    endDate: string;
    durationMonths: number;
    budget: number;
    advancedAmount?: number;
  }): Promise<Project> {
    const res = await axiosClient.post('/projects', data);
    return mapProject(res.data);
  },
};
