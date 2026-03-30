import { axiosClient } from './axiosClient';
import type { Settlement } from '../../types';

type SettlementApi = {
  id: string;
  code: string;
  content: string;
  totalAmount: number;
  status: Settlement['status'];
  project?: { title?: string };
};

const mapSettlement = (s: SettlementApi): Settlement => ({
  id: s.id,
  code: s.code,
  content: s.content,
  amount: Number(s.totalAmount ?? 0),
  status: s.status,
  projectTitle: s.project?.title ?? '',
});

export const settlementService = {
  async getAll(params?: { status?: string; search?: string }): Promise<Settlement[]> {
    const res = await axiosClient.get('/settlements', { params });
    return (res.data ?? []).map(mapSettlement);
  },

  async requestSupplement(id: string, reasons: string[]): Promise<void> {
    await axiosClient.post(`/settlements/${id}/supplement-request`, { reasons });
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
