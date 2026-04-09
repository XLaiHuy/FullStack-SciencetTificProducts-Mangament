import { z } from 'zod';
import prisma from '../../prisma';
import { nextSettlementCode } from '../../utils/codeGenerator';
import { logBusiness } from '../../middleware/requestLogger';
import { sendSupplementRequest } from '../../utils/emailService';
import ExcelJS from 'exceljs';

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
  async getAll(
    filters: { status?: string; search?: string; page?: number; limit?: number },
    userId: string,
    userRole: string
  ) {
    const { status, search, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = { is_deleted: false };
    if (userRole === 'project_owner') {
      where.project = { ownerId: userId };
    }
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
  async getById(id: string, userId: string, userRole: string) {
    const roleFilter = userRole === 'project_owner' ? { project: { ownerId: userId } } : {};
    const settlement = await prisma.settlement.findFirst({
      where: { OR: [{ id }, { code: id }], is_deleted: false, ...roleFilter },
      include: {
        project: { include: { owner: { select: { name: true, email: true } } } },
        budgetItems: true,
        auditLog:    { orderBy: { timestamp: 'asc' } },
      },
    });
    if (!settlement) throw new Error('Hồ sơ quyết toán không tồn tại.');
    return settlement;
  },

  /** POST /api/settlements — owner submits settlement */
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

    const validStatuses = ['cho_bo_sung', 'hop_le', 'da_xac_nhan', 'hoa_don_vat'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Trạng thái không hợp lệ. Hợp lệ: ${validStatuses.join(', ')}`);
    }

    const allowedTransitions: Record<string, string[]> = {
      cho_bo_sung: ['hop_le', 'hoa_don_vat', 'da_xac_nhan'],
      hop_le: ['cho_bo_sung', 'hoa_don_vat', 'da_xac_nhan'],
      hoa_don_vat: ['cho_bo_sung', 'da_xac_nhan'],
      da_xac_nhan: [],
    };

    if (status !== settlement.status) {
      const allowed = allowedTransitions[settlement.status] ?? [];
      if (!allowed.includes(status)) {
        throw new Error(`Không thể chuyển trạng thái từ "${settlement.status}" sang "${status}".`);
      }
    }

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
        }),
        // Auto-create empty ArchiveRecord when project reaches final status
        prisma.archiveRecord.upsert({
          where: { projectId: settlement.projectId },
          create: {
            projectId: settlement.projectId,
            archivedBy: actorName,
            fileUrlsJson: JSON.stringify([]),
            notes: 'Auto-created when settlement finalized',
          },
          update: {},
        }),
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

  /** GET /api/settlements/:id/export — generate real Excel/Word file */
  async exportSettlement(id: string, format: 'excel' | 'word', userId: string, userRole: string) {
    const roleFilter = userRole === 'project_owner' ? { project: { ownerId: userId } } : {};
    const settlement = await prisma.settlement.findFirst({
      where: { id, is_deleted: false, ...roleFilter },
      include: {
        budgetItems: true,
        project: { select: { code: true, title: true, budget: true, owner: { select: { name: true, email: true } } } },
        auditLog: { orderBy: { timestamp: 'desc' }, take: 5 },
      },
    });
    if (!settlement) throw new Error('Hồ sơ quyết toán không tồn tại.');

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Quyết Toán');

      // Headers
      worksheet.columns = [
        { header: 'Mã Quyết Toán', key: 'code', width: 15 },
        { header: 'Mã Đề Tài', key: 'projectCode', width: 15 },
        { header: 'Tên Đề Tài', key: 'projectTitle', width: 40 },
        { header: 'Chủ Nhiệm', key: 'owner', width: 20 },
        { header: 'Tổng Kinh Phí', key: 'totalAmount', width: 15 },
        { header: 'Trạng Thái', key: 'status', width: 15 },
      ];

      // Data row - summary
      worksheet.addRow({
        code: settlement.code,
        projectCode: settlement.project.code,
        projectTitle: settlement.project.title,
        owner: settlement.project.owner.name,
        totalAmount: Number(settlement.totalAmount),
        status: settlement.status,
      });

      // Budget items section
      worksheet.addRows([]);
      const budgetHeader = worksheet.addRow([
        'Mục Chi Tiết',
        'Kinh Phí Dự Kiến',
        'Thực Chi',
        'Trạng Thái',
        'Chứng Cứ',
      ]);
      budgetHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      budgetHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      settlement.budgetItems.forEach(item => {
        worksheet.addRow([
          item.category,
          Number(item.planned),
          Number(item.spent),
          item.status,
          item.evidenceFile || 'Chưa cung cấp',
        ]);
      });

      // Audit log section
      if (settlement.auditLog.length > 0) {
        worksheet.addRows([]);
        const auditHeader = worksheet.addRow(['Nhật Ký Thay Đổi', 'Người Thực Hiện', 'Thời Gian']);
        auditHeader.font = { bold: true };

        settlement.auditLog.forEach(log => {
          worksheet.addRow([
            log.content,
            log.author,
            new Date(log.timestamp).toLocaleString('vi-VN'),
          ]);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        fileName: `QT_${settlement.code}_${new Date().toISOString().split('T')[0]}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    // For Word format, return placeholder (Phase 2)
    return {
      url: `/api/settlements/${id}/files/export.docx`,
      format,
      mock: true,
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
      // Auto-create empty ArchiveRecord when project reaches final status
      prisma.archiveRecord.upsert({
        where: { projectId: settlement.projectId },
        create: {
          projectId: settlement.projectId,
          archivedBy: actorName,
          fileUrlsJson: JSON.stringify([]),
          notes: 'Auto-created when settlement finalized',
        },
        update: {},
      }),
    ]);

    await logBusiness(actorId, actorName, `APPROVE QT ${settlement.code}`, 'Settlements', JSON.stringify({ old_values: settlement }));
    return updated;
  },
};
