import { axiosClient } from './axiosClient';
import type { Settlement } from '../../types';

type SettlementApi = {
  id: string;
  code: string;
  content: string;
  totalAmount: number;
  status: Settlement['status'];
  supplementNote?: string;
  project?: { title?: string };
};

const mapSettlement = (s: SettlementApi): Settlement => ({
  id: s.id,
  code: s.code,
  content: s.content,
  amount: Number(s.totalAmount ?? 0),
  status: s.status,
  supplementNote: s.supplementNote ?? undefined,
  projectTitle: s.project?.title ?? '',
  projectBudget: Number((s.project as any)?.budget ?? 0),
});

export const settlementService = {
  async getAll(params?: { status?: string; search?: string }): Promise<Settlement[]> {
    const res = await axiosClient.get('/settlements', { params });
    return (res.data ?? []).map(mapSettlement);
  },

  async getById(id: string): Promise<any> {
    const res = await axiosClient.get(`/settlements/${id}`);
    return res.data;
  },

  async create(payload: {
    projectId: string;
    content: string;
    totalAmount: number;
    category: string;
    evidenceFiles?: File[];
  }): Promise<void> {
    const form = new FormData();
    form.append('projectId', payload.projectId);
    form.append('content', payload.content);
    form.append('totalAmount', String(payload.totalAmount));
    form.append('category', payload.category);
    if (payload.evidenceFiles && payload.evidenceFiles.length > 0) {
      payload.evidenceFiles.forEach((file) => {
        form.append('evidenceFiles', file);
      });
    }
    await axiosClient.post('/settlements', form);
  },

  async requestSupplement(id: string, reasons: string[], supplementNote?: string): Promise<void> {
    await axiosClient.post(`/settlements/${id}/supplement-request`, { reasons, supplementNote });
  },

  async updateStatus(id: string, status: Settlement['status']): Promise<void> {
    await axiosClient.put(`/settlements/${id}/status`, { status });
  },

  async approve(id: string): Promise<void> {
    await axiosClient.put(`/settlements/${id}/approve`);
  },

  async exportFile(id: string, format: 'excel' | 'word'): Promise<{ url: string }> {
    const res = await axiosClient.get(`/settlements/${id}/export`, { params: { format } });
    return res.data;
  },
};
