import { axiosClient } from './axiosClient';

export type NotificationItem = {
  id: string;
  type: 'warning' | 'info' | 'request';
  message: string;
  isRead: boolean;
  createdAt: string;
};

export const notificationService = {
  async list(page = 1, limit = 20): Promise<{ items: NotificationItem[]; meta?: any }> {
    const res = await axiosClient.get('/notifications', { params: { page, limit } });
    return {
      items: res.data ?? [],
      meta: (res as any).meta,
    };
  },

  async unreadCount(): Promise<number> {
    const res = await axiosClient.get('/notifications/unread-count');
    return Number(res.data?.unread ?? 0);
  },

  async markRead(id: string): Promise<void> {
    await axiosClient.put(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await axiosClient.put('/notifications/read-all');
  },
};
