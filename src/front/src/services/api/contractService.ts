/**
 * src/services/api/contractService.ts
 * Contract CRUD and signing operations wrapped via Axios.
 */
import { axiosClient } from './axiosClient';
import type { Contract } from '../../types';

export const contractService = {
  // GET /api/contracts
  async getAll(): Promise<Contract[]> {
    const res = await axiosClient.get('/contracts');
    return res.data;
  },

  // GET /api/contracts/{id}
  async getById(id: string): Promise<Contract | undefined> {
    const res = await axiosClient.get(`/contracts/${id}`);
    return res.data;
  },

  // POST /api/contracts
  async create(data: { projectId: string; budget: number; notes?: string }): Promise<Contract> {
    const res = await axiosClient.post('/contracts', data);
    return res.data;
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
    return res.data;
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
