import prisma from '../../prisma';

type NotificationType = 'warning' | 'info' | 'request';

export const NotificationService = {
  async listByUser(userId: string, page = 1, limit = 20) {
    const skip = (Math.max(page, 1) - 1) * Math.max(limit, 1);
    const take = Math.max(limit, 1);

    const [total, items] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async unreadCount(userId: string) {
    const unread = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return unread;
  },

  async markRead(notificationId: string, userId: string) {
    const existing = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
    if (!existing) throw new Error('Thong bao khong ton tai.');

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  },

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  },

  async createForUser(userId: string, type: NotificationType, message: string) {
    return prisma.notification.create({
      data: {
        userId,
        type,
        message,
        isRead: false,
      },
    });
  },

  async createForUsers(userIds: string[], type: NotificationType, message: string) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) return 0;

    const result = await prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        type,
        message,
        isRead: false,
      })),
    });

    return result.count;
  },
};
