import { z } from 'zod';
import prisma from '../../prisma';
import { logBusiness } from '../../middleware/requestLogger';

// ─── Schemas ──────────────────────────────────────────────────────────────────
export const CreateExtensionSchema = z.object({
  projectId:     z.string().cuid(),
  reason:        z.string().min(10, 'Lý do phải tối thiểu 10 ký tự'),
  requested_deadline:  z.string().datetime(),
  extensionDays: z.number().int().positive().max(90, 'Tối đa 90 ngày'),
  supporting_document: z.string().optional(),
});

export const DecisionSchema = z.object({
  decision:     z.enum(['da_phe_duyet', 'tu_choi']),
  decisionNote: z.string().optional(),
});

// ─── Extension Service ────────────────────────────────────────────────────────
export const ExtensionService = {
  /** GET /api/extensions */
  async getAll(
    filters: { status?: string; search?: string; page?: number; limit?: number },
    userId: string,
    userRole: string
  ) {
    const { status, search, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {
      project: {
        is_deleted: false,
        ...(userRole === 'project_owner' ? { ownerId: userId } : {}),
      },
    };
    if (status) where.boardStatus = status;
    if (search) {
      where.OR = [
        { project: { code:  { contains: search } } },
        { project: { title: { contains: search } } },
      ];
    }

    const [total, extensions] = await Promise.all([
      prisma.extension.count({ where }),
      prisma.extension.findMany({
        where,
        include: { project: { select: { code: true, title: true, owner: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { extensions, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  /** GET /api/extensions/:id */
  async getById(id: string, userId: string, userRole: string) {
    const roleFilter = userRole === 'project_owner' ? { ownerId: userId } : {};
    const ext = await prisma.extension.findFirst({
      where: { id, project: { is_deleted: false, ...roleFilter } },
      include: { project: { include: { owner: { select: { name: true, email: true } } } } },
    });
    if (!ext) throw new Error('Yêu cầu gia hạn không tồn tại.');
    return ext;
  },

  /** POST /api/extensions — owner submits extension request */
  async create(data: z.infer<typeof CreateExtensionSchema>, submittedBy: string, actorId: string) {
    const project = await prisma.project.findFirst({ where: { id: data.projectId, is_deleted: false } });
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (project.ownerId !== actorId) throw new Error('Bạn chỉ có thể tạo yêu cầu gia hạn cho đề tài của chính mình.');
    if (!['dang_thuc_hien', 'tre_han'].includes(project.status)) {
      throw new Error('Chỉ có thể gia hạn đề tài đang thực hiện hoặc trễ hạn.');
    }

    // Count existing extensions
    const count = await prisma.extension.count({ where: { projectId: data.projectId } });

    const ext = await prisma.extension.create({
      data: {
        projectId:      data.projectId,
        reason:         data.supporting_document ? `${data.reason}\n[Supporting Document]: ${data.supporting_document}` : data.reason,
        proposedDate:   new Date(data.requested_deadline),
        extensionDays:  data.extensionDays,
        extensionCount: count + 1,
      },
    });

    await logBusiness(actorId, submittedBy, `Tạo gia hạn cho đề tài ${project.code}`, 'Extensions');
    return ext;
  },

  /** PUT /api/extensions/:id/decision — research_staff approves/rejects */
  async decide(id: string, decision: 'da_phe_duyet' | 'tu_choi', decisionNote: string | undefined, actorId: string, actorName: string) {
    const ext = await prisma.extension.findUnique({ where: { id }, include: { project: true } });
    if (!ext) throw new Error('Yêu cầu gia hạn không tồn tại.');
    if (ext.boardStatus !== 'dang_cho') throw new Error('Yêu cầu này đã được xử lý.');

    const updated = await prisma.extension.update({
      where: { id },
      data: {
        boardStatus:  decision,
        decisionNote,
        decidedBy:    actorName,
        decidedAt:    new Date(),
      },
    });

    // If approved: extend project endDate
    if (decision === 'da_phe_duyet') {
      const newEndDate = new Date(ext.project.endDate);
      newEndDate.setDate(newEndDate.getDate() + ext.extensionDays);
      await prisma.project.update({
        where: { id: ext.projectId },
        data:  { endDate: newEndDate, status: 'dang_thuc_hien' },
      });
    }

    await logBusiness(actorId, actorName,
      `${decision === 'da_phe_duyet' ? 'Phê duyệt' : 'Từ chối'} gia hạn đề tài ${ext.project.code}`,
      'Extensions'
    );
    return updated;
  },
};
