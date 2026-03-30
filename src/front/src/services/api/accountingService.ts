import { axiosClient } from './axiosClient';

export type AccountingDashboardStats = {
  totalSettlements: number;
  pendingSettlements: number;
  confirmedSettlements: number;
  totalAmount: number;
};

export type AccountingDocument = {
  id: string;
  code: string;
  content: string;
  totalAmount: number;
  status: 'cho_bo_sung' | 'hop_le' | 'da_xac_nhan' | 'hoa_don_vat';
  project?: { code?: string; title?: string; owner?: { name?: string } };
};

export const accountingService = {
  async getDashboard(): Promise<AccountingDashboardStats> {
    const res = await axiosClient.get('/accounting/dashboard');
    return res.data;
  },

  async getDocuments(params?: { status?: string; page?: number; limit?: number }): Promise<AccountingDocument[]> {
    const res = await axiosClient.get('/accounting/documents', { params });
    return res.data ?? [];
  },

  async verifyDocument(id: string, status: 'hop_le' | 'cho_bo_sung' | 'da_xac_nhan' | 'hoa_don_vat', notes?: string): Promise<void> {
    await axiosClient.put(`/accounting/documents/${id}/verify`, { status, notes });
  },

  async confirmLiquidation(id: string): Promise<void> {
    await axiosClient.post(`/accounting/liquidation/${id}/confirm`);
  },
};
