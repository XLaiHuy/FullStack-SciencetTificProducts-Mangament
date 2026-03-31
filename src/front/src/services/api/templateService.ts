import { axiosClient } from './axiosClient';
import type { Template } from '../../types';

type TemplateApi = {
  id: string;
  name: string;
  version: string;
  targetRole?: string;
  formType?: { code?: string };
  size: string;
  effectiveDate?: string;
  createdAt?: string;
  updatedAt?: string;
  isDefault?: boolean;
};

const mapTemplate = (t: TemplateApi): Template => ({
  id: t.id,
  name: t.name,
  version: t.version,
  role: t.targetRole ?? 'unknown',
  category: t.formType?.code ?? 'general',
  size: t.size,
  effectiveDate: new Date(t.effectiveDate ?? t.createdAt ?? Date.now()).toLocaleDateString('vi-VN'),
  updatedDate: new Date(t.updatedAt ?? t.createdAt ?? Date.now()).toLocaleDateString('vi-VN'),
  is_default: t.isDefault,
});

export const templateService = {
  async getAll(category?: string): Promise<Template[]> {
    const res = await axiosClient.get('/templates', { params: category ? { category } : undefined });
    return (res.data ?? []).map(mapTemplate);
  },

  async upload(payload: {
    name: string;
    version: string;
    role: string;
    formTypeCode: string;
    effectiveDate: string;
    file: File;
  }): Promise<Template> {
    const form = new FormData();
    form.append('name', payload.name);
    form.append('version', payload.version);
    form.append('targetRole', payload.role);
    form.append('formTypeCode', payload.formTypeCode);
    form.append('effectiveDate', payload.effectiveDate);
    form.append('file', payload.file);

    const res = await axiosClient.post('/templates', form);
    return mapTemplate(res.data);
  },

  async delete(id: string): Promise<void> {
    await axiosClient.delete(`/templates/${id}`);
  },

  async getFormTypes(): Promise<Array<{ id: string; code: string; name: string }>> {
    const res = await axiosClient.get('/templates/form-types');
    return res.data ?? [];
  },

  async fill(id: string, projectId: string): Promise<void> {
    const token = localStorage.getItem('nckh_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${baseUrl}/templates/${id}/fill?projectId=${encodeURIComponent(projectId)}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error('Không thể tải dự thảo biểu mẫu.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Draft_Template_${id}.docx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
