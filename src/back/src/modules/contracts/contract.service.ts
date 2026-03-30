import { z } from 'zod';
import prisma from '../../prisma';
import { nextContractCode } from '../../utils/codeGenerator';
import { logBusiness } from '../../middleware/requestLogger';

// ─── Validation Schemas ───────────────────────────────────────────────────────
export const CreateContractSchema = z.object({
  projectId: z.string().cuid(),
  budget:    z.number().positive(),
  notes:     z.string().optional(),
});

export const UpdateContractStatusSchema = z.object({
  status: z.enum(['cho_duyet', 'da_ky', 'hoan_thanh', 'huy']),
});

// ─── Contract Service ─────────────────────────────────────────────────────────
export const ContractService = {
  /** GET /api/contracts */
  async getAll(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = { is_deleted: false };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { project: { title: { contains: search } } },
        { project: { owner: { name: { contains: search } } } },
      ];
    }

    const [total, contracts] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        include: {
          project: {
            select: { id: true, code: true, title: true, owner: { select: { name: true, email: true, title: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);

    return { contracts, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  /** GET /api/contracts/:id */
  async getById(id: string) {
    const contract = await prisma.contract.findFirst({
      where: { OR: [{ id }, { code: id }], is_deleted: false },
      include: {
        project: { include: { owner: { select: { id: true, name: true, email: true, title: true } } } },
      },
    });
    if (!contract) throw new Error('Hợp đồng không tồn tại.');
    return contract;
  },

  /** GET /api/project-owner/contracts — contracts for logged-in owner */
  async getByOwner(ownerId: string) {
    return prisma.contract.findMany({
      where: { project: { ownerId }, is_deleted: false },
      include: { project: { select: { code: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** POST /api/contracts */
  async create(data: z.infer<typeof CreateContractSchema>, actorId: string, actorName: string) {
    // Verify project exists
    const project = await prisma.project.findFirst({ where: { id: data.projectId, is_deleted: false } });
    if (!project) throw new Error('Đề tài không tồn tại.');

    // Check no active contract already
    const existing = await prisma.contract.findFirst({
      where: { projectId: data.projectId, status: { not: 'huy' }, is_deleted: false },
    });
    if (existing) throw new Error(`Đề tài đã có hợp đồng ${existing.code} còn hiệu lực.`);

    const code = await nextContractCode();
    const contract = await prisma.contract.create({
      data: { code, projectId: data.projectId, budget: data.budget, notes: data.notes },
    });

    await logBusiness(actorId, actorName, `Tạo hợp đồng ${code} cho đề tài ${project.code}`, 'Contracts');
    return contract;
  },

  /** POST /api/contracts/:id/sign — owner signs the contract */
  async sign(id: string, actorId: string, actorName: string) {
    const contract = await prisma.contract.findFirst({
      where: { id, is_deleted: false },
      include: { project: { select: { ownerId: true } } },
    });
    if (!contract) throw new Error('Hợp đồng không tồn tại.');
    if (contract.project.ownerId !== actorId) {
      throw new Error('Bạn không có quyền ký hợp đồng của đề tài này.');
    }
    if (contract.status !== 'cho_duyet') throw new Error('Chỉ có thể ký hợp đồng đang ở trạng thái "Chờ duyệt".');

    const updated = await prisma.contract.update({
      where: { id },
      data:  { status: 'da_ky', signedDate: new Date() },
    });

    await logBusiness(actorId, actorName, `Ký hợp đồng ${contract.code}`, 'Contracts');
    return updated;
  },

  /** PUT /api/contracts/:id/status */
  async updateStatus(id: string, status: string, actorId: string, actorName: string) {
    const contract = await prisma.contract.findFirst({ where: { id, is_deleted: false } });
    if (!contract) throw new Error('Hợp đồng không tồn tại.');

    const updated = await prisma.contract.update({
      where: { id },
      data:  { status: status as never },
    });

    await logBusiness(actorId, actorName, `Cập nhật HĐ ${contract.code}: ${contract.status} → ${status}`, 'Contracts');
    return updated;
  },

  /** POST /api/contracts/:id/upload — store uploaded PDF path */
  async uploadPdf(id: string, filePath: string, actorId: string, actorName: string) {
    const contract = await prisma.contract.findFirst({ where: { id, is_deleted: false } });
    if (!contract) throw new Error('Hợp đồng không tồn tại.');

    const updated = await prisma.contract.update({
      where: { id },
      data:  { pdfUrl: filePath },
    });

    await logBusiness(actorId, actorName, `Tải lên PDF hợp đồng ${contract.code}`, 'Contracts');
    return updated;
  },

  /** DELETE /api/contracts/:id — soft delete */
  async delete(id: string, actorId: string, actorName: string) {
    const contract = await prisma.contract.findFirst({ where: { id, is_deleted: false } });
    if (!contract) throw new Error('Hợp đồng không tồn tại.');
    if (contract.status === 'da_ky') throw new Error('Không thể xóa hợp đồng đã ký.');

    await prisma.contract.update({ where: { id }, data: { is_deleted: true } });
    await logBusiness(actorId, actorName, 'DELETE', 'Contracts', JSON.stringify({ old_values: contract }));
  },
};
