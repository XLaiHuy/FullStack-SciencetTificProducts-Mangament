import { axiosClient } from './axiosClient';

export type ArchiveItem = {
  id: string;
  code: string;
  title: string;
  field: string;
  status: string;
  ownerName: string;
  files: string[];
};

export const archiveService = {
  async getAll(): Promise<ArchiveItem[]> {
    const res = await axiosClient.get('/archives');
    return (res.data ?? []).map((row: any) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      field: row.field,
      status: row.status,
      ownerName: row.owner?.name ?? '',
      files: row.files ?? [],
    }));
  },

  async download(topicId: string): Promise<void> {
    const res = await axiosClient.get(`/archives/${topicId}/download`, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `archive-${topicId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
};
