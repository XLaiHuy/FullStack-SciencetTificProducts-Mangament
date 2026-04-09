/**
 * src/services/api/contractService.ts
 * Contract CRUD and signing operations wrapped via Axios.
 */
import { axiosClient } from './axiosClient';
import type { Contract } from '../../types';
import { downloadFromApi } from './downloadUtil';
import { normalizeUploadPath } from '../../utils/urlUtil';

export type ParsedContractProposal = {
  sourceType: 'pdf' | 'docx' | 'text';
  projectCode?: string;
  projectTitle?: string;
  suggestedProjectId?: string;
  suggestedBudget?: number;
  ownerName?: string;
  ownerTitle?: string;
  ownerEmail?: string;
  confidence: number;
  notesSuggestion: string;
  textExcerpt: string;
};

const mapContract = (c: any): Contract => ({
  id: c.id,
  code: c.code,
  projectId: c.projectId ?? c.project?.id,
  projectCode: c.projectCode ?? c.project?.code ?? '',
  projectTitle: c.projectTitle ?? c.project?.title ?? '',
  owner: c.owner ?? c.project?.owner?.name ?? '',
  ownerTitle: c.ownerTitle ?? c.project?.owner?.title,
  ownerEmail: c.ownerEmail ?? c.project?.owner?.email,
  signedDate: c.signedDate ? new Date(c.signedDate).toISOString().split('T')[0] : undefined,
  status: c.status,
  budget: Number(c.budget ?? 0),
  agencyName: c.agencyName,
  representative: c.representative,
  pdfUrl: normalizeUploadPath(c.pdfUrl),
  notes: c.notes,
});

export const contractService = {
  // POST /api/contracts/proposals/parse (multipart/form-data)
  async parseProposal(file: File): Promise<ParsedContractProposal> {
    const form = new FormData();
    form.append('file', file);
    const res = await axiosClient.post('/contracts/proposals/parse', form);
    return res.data;
  },

  // GET /api/contracts
  async getAll(): Promise<Contract[]> {
    const res = await axiosClient.get('/contracts');
    return (res.data ?? []).map(mapContract);
  },

  // GET /api/contracts/{id}
  async getById(id: string): Promise<Contract | undefined> {
    const res = await axiosClient.get(`/contracts/${id}`);
    return res.data ? mapContract(res.data) : undefined;
  },

  // GET /api/contracts/{id}/pdf
  async downloadPdf(id: string, fallbackFileName?: string): Promise<void> {
    await downloadFromApi(`/contracts/${id}/pdf`, fallbackFileName ?? `contract_${id}.pdf`);
  },

  // GET /api/contracts/{id}/export-excel
  async exportExcel(id: string, fallbackFileName?: string): Promise<void> {
    await downloadFromApi(`/contracts/${id}/export-excel`, fallbackFileName ?? `contract_${id}.xlsx`);
  },

  // POST /api/contracts
  async create(data: { 
    projectId: string; 
    budget: number; 
    agencyName?: string;
    representative?: string;
    notes?: string 
  }): Promise<Contract> {
    const res = await axiosClient.post('/contracts', data);
    return mapContract(res.data);
  },

  // POST /api/contracts/{id}/sign
  async sign(id: string): Promise<void> {
    // Role project_owner expected
    await axiosClient.post(`/contracts/${id}/sign`);
  },

  // POST /api/contracts/{id}/upload (multipart/form-data)
  async uploadPdf(id: string, file: File): Promise<Contract> {
    const form = new FormData();
    form.append('file', file);
    // Let axios set the correct multipart Content-Type (with boundary)
    const res = await axiosClient.post(`/contracts/${id}/upload`, form);
    return mapContract(res.data);
  },

  // PUT /api/contracts/{id}/status
  async updateStatus(id: string, status: Contract['status']): Promise<void> {
    await axiosClient.put(`/contracts/${id}/status`, { status });
  },

  // DELETE /api/contracts/{id} (soft delete in backend)
  async delete(id: string): Promise<void> {
    await axiosClient.delete(`/contracts/${id}`);
  },
};
