import { z } from 'zod';
import prisma from '../../prisma';
import { nextSettlementCode } from '../../utils/codeGenerator';
import { logBusiness } from '../../middleware/requestLogger';
import { sendSupplementRequest } from '../../utils/emailService';

// ─── Schemas ──────────────────────────────────────────────────────────────────
export const CreateSettlementSchema = z.object({
  projectId:   z.string().cuid(),
  content:     z.string().min(1),
  totalAmount: z.number().positive(),
  budgetItems: z.array(z.object({
    category:     z.string().min(1),
    planned:      z.number().positive(),
    spent:        z.number().min(0).optional(),
    evidenceFile: z.string().optional(),
    status:       z.enum(['khop', 'vuot_muc', 'chua_nop']).optional(),
  })).optional(),
});

export const SupplementRequestSchema = z.object({
  reasons: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất một lý do'),
});

// ─── Settlement Service ───────────────────────────────────────────────────────
export const SettlementService = {
  /** GET /api/settlements */
  async getAll(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = { is_deleted: false };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { project: { title: { contains: search } } },
      ];
    }

    const [total, settlements] = await Promise.all([
      prisma.settlement.count({ where }),
      prisma.settlement.findMany({
        where,
        include: { project: { select: { code: true, title: true, owner: { select: { name: true, email: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { settlements, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  /** GET /api/settlements/:id — with full budget breakdown + audit log */
  async getById(id: string) {
    const settlement = await prisma.settlement.findFirst({
      where: { OR: [{ id }, { code: id }], is_deleted: false },
      include: {
        project: { include: { owner: { select: { name: true, email: true } } } },
        budgetItems: true,
        auditLog:    { orderBy: { timestamp: 'asc' } },
      },
    });
    if (!settlement) throw new Error('Hồ sơ quyết toán không tồn tại.');
    return settlement;
  },

  /** POST /api/project-owner/settlements — owner submits settlement */
  async create(data: z.infer<typeof CreateSettlementSchema>, submittedBy: string, actorId: string) {
    const project = await prisma.project.findFirst({ where: { id: data.projectId, is_deleted: false } });
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (project.ownerId !== actorId) throw new Error('Bạn chỉ có thể nộp quyết toán cho đề tài của chính mình.');

    const code = await nextSettlementCode();

    const settlement = await prisma.settlement.create({
      data: {
        code,
        projectId:   data.projectId,
        content:     data.content,
        totalAmount: data.totalAmount,
        submittedBy,
        budgetItems: data.budgetItems ? {
          create: data.budgetItems.map(item => ({
            category:     item.category,
            planned:      item.planned,
            spent:        item.spent ?? 0,
            evidenceFile: item.evidenceFile,
            status:       item.status ?? 'chua_nop',
          })),
        } : undefined,
        auditLog: {
          create: [{
            content: `Hồ sơ quyết toán được tạo và nộp bởi ${submittedBy}.`,
            author:  submittedBy,
          }],
        },
      },
      include: { budgetItems: true, auditLog: true },
    });

    await logBusiness(actorId, submittedBy, `Tạo quyết toán ${code}`, 'Settlements');
    return settlement;
  },

  /** POST /api/settlements/:id/supplement-request — staff requests supplement */
  async requestSupplement(
    id: string,
    reasons: string[],
    actorId: string,
    actorName: string
  ) {
    const settlement = await prisma.settlement.findFirst({
      where: { id, is_deleted: false },
      include: { project: { include: { owner: true } } },
    });
    if (!settlement) throw new Error('Hồ sơ quyết toán không tồn tại.');

    // Update status + add audit entry
    const [updated] = await prisma.$transaction([
      prisma.settlement.update({
        where: { id },
        data: {
          status: 'cho_bo_sung',
          auditLog: {
            create: [{
              content: `Đã gửi yêu cầu bổ sung: ${reasons.join('; ')}.`,
              author:  actorName,
            }],
          },
        },
      }),
    ]);

    // Send mock email notification
    await sendSupplementRequest(
      settlement.project.owner.email,
      settlement.project.owner.name,
      settlement.code,
      reasons
    );

    await logBusiness(actorId, actorName,
      `Yêu cầu bổ sung QT ${settlement.code}: ${reasons.join(', ')}`,
      'Settlements'
    );

    return updated;
  },

  /** PUT /api/settlements/:id/status — accounting updates status */
  async updateStatus(id: string, status: string, actorId: string, actorName: string) {
    const settlement = await prisma.settlement.findFirst({ where: { id, is_deleted: false } });
    if (!settlement) throw new Error('Hồ sơ quyết toán không tồn tại.');

    const [updated] = await prisma.$transaction([
      prisma.settlement.update({
        where: { id },
        data: {
          status: status as never,
          auditLog: {
            create: [{
              content: `Trạng thái cập nhật: ${settlement.status} → ${status}`,
              author:  actorName,
            }],
          },
        },
      }),
      ...(status === 'da_xac_nhan' ? [
        prisma.project.update({
          where: { id: settlement.projectId },
          data: { status: 'da_thanh_ly' },
        })
      ] : []),
    ]);

    await logBusiness(
      actorId, 
      actorName, 
      status === 'da_xac_nhan' 
        ? `Cập nhật QT ${settlement.code} thành ${status} — thanh lý đề tài` 
        : `Cập nhật QT ${settlement.code}: ${settlement.status} → ${status}`, 
      'Settlements'
    );
    return updated;
  },

  /** GET /api/settlements/:id/export — returns export metadata (real file gen is Phase 2) */
  async exportSettlement(id: string, format: 'excel' | 'word') {
    const settlement = await prisma.settlement.findFirst({
      where: { id, is_deleted: false },
      include: { budgetItems: true, project: { select: { code: true, title: true } } },
    });
    if (!settlement) throw new Error('Hồ sơ quyết toán không tồn tại.');

    // Future: generate real Excel/Word using exceljs/docx
    return {
      url:    `/api/settlements/${id}/files/export.${format === 'excel' ? 'xlsx' : 'docx'}`,
      format,
      mock:   true,
      settlement: { code: settlement.code, project: settlement.project.title },
    };
  },

  async approve(id: string, actorId: string, actorName: string) {
    const settlement = await prisma.settlement.findFirst({
      where: { id, is_deleted: false },
      include: { project: true },
    });
    if (!settlement) throw new Error('Hồ sơ quyết toán không tồn tại.');

    const [updated] = await prisma.$transaction([
      prisma.settlement.update({
        where: { id },
        data: {
          status: 'da_xac_nhan',
          auditLog: {
            create: [{ content: 'Phê duyệt thanh lý quyết toán.', author: actorName }],
          },
        },
      }),
      prisma.project.update({
        where: { id: settlement.projectId },
        data: { status: 'da_thanh_ly' },
      }),
    ]);

    await logBusiness(actorId, actorName, `APPROVE QT ${settlement.code}`, 'Settlements', JSON.stringify({ old_values: settlement }));
    return updated;
  },
};
