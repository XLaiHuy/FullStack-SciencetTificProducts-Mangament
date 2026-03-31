import { axiosClient } from './axiosClient';

export type ExtensionRequestItem = {
  id: string;
  projectCode: string;
  projectOwner: string;
  reason: string;
  proposedDate: string;
  extensionDays: number;
  extensionCount: number;
  boardStatus: 'da_phe_duyet' | 'dang_cho' | 'tu_choi';
};

export const extensionService = {
  async getAll(): Promise<ExtensionRequestItem[]> {
    const res = await axiosClient.get('/extension-requests');
    return (res.data ?? []).map((e: any) => ({
      id: e.id,
      projectCode: e.project?.code ?? '',
      projectOwner: e.project?.owner?.name ?? '',
      reason: e.reason,
      proposedDate: new Date(e.proposedDate).toLocaleDateString('vi-VN'),
      extensionDays: e.extensionDays,
      extensionCount: e.extensionCount,
      boardStatus: e.boardStatus,
    }));
  },

  async create(payload: {
    projectId: string;
    requested_deadline: string;
    reason: string;
    supporting_document?: File;
  }): Promise<void> {
    const now = new Date();
    const target = new Date(payload.requested_deadline);
    const extensionDays = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const form = new FormData();
    form.append('projectId', payload.projectId);
    form.append('requested_deadline', target.toISOString());
    form.append('reason', payload.reason);
    form.append('extensionDays', String(extensionDays));
    if (payload.supporting_document) form.append('supporting_document', payload.supporting_document);
    await axiosClient.post('/extension-requests', form);
  },

  async approve(id: string, decisionNote?: string): Promise<void> {
    await axiosClient.put(`/extension-requests/${id}/approve`, { decisionNote });
  },

  async reject(id: string, decisionNote?: string): Promise<void> {
    await axiosClient.put(`/extension-requests/${id}/decision`, {
      decision: 'tu_choi',
      decisionNote,
    });
  },
};
