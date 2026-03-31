import { z } from 'zod';
import prisma from '../../prisma';
import { nextContractCode } from '../../utils/codeGenerator';
import { logBusiness } from '../../middleware/requestLogger';
import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// ─── Validation Schemas ───────────────────────────────────────────────────────
export const CreateContractSchema = z.object({
  projectId: z.string().cuid(),
  budget:    z.number().positive(),
  notes:     z.string().optional(),
});

export const UpdateContractStatusSchema = z.object({
  status: z.enum(['cho_duyet', 'da_ky', 'hoan_thanh', 'huy']),
});

type ParsedProposal = {
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

const normalizeText = (raw: string) =>
  raw
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const normalizeCode = (value: string) => value.replace(/[\s_/]+/g, '-').toUpperCase();

const parseMoney = (value: string): number | undefined => {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const detectProposalData = (text: string) => {
  const projectCodeRaw = text.match(/(?:ĐT|DT)[\s_\/-]?\d{2,4}[\s_\/-]?\d{2,6}(?:[\s_\/-]?[A-Z0-9]{1,6})?/i)?.[0];
  const projectCode = projectCodeRaw ? normalizeCode(projectCodeRaw) : undefined;

  const ownerEmail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();

  const ownerNameLine =
    text.match(/(?:Chủ\s*nhiệm(?:\s*đề\s*tài)?|Chu\s*nhiem(?:\s*de\s*tai)?|Bên\s*B|Ben\s*B)\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim();

  const ownerTitle = ownerNameLine?.match(/^(GS\.TS\.|PGS\.TS\.|TS\.|ThS\.|GS|PGS|TS|ThS)/i)?.[0];
  const ownerName = ownerNameLine?.replace(/^(GS\.TS\.|PGS\.TS\.|TS\.|ThS\.|GS|PGS|TS|ThS)\s*/i, '').trim();

  const budgetCandidate =
    text.match(/(?:kinh\s*phí|ngân\s*sách|gia\s*trị\s*hợp\s*đồng|gia\s*tri\s*hop\s*dong)\s*[:\-]?\s*([\d\s.,]{6,})/i)?.[1] ??
    text.match(/\b\d{1,3}(?:[.\s,]\d{3}){1,}(?:[.,]\d{1,2})?\b/)?.[0] ??
    text.match(/\b\d{7,}\b/)?.[0];

  const suggestedBudget = budgetCandidate ? parseMoney(budgetCandidate) : undefined;

  return {
    projectCode,
    ownerEmail,
    ownerName,
    ownerTitle,
    suggestedBudget,
  };
};

const buildConfidence = (data: {
  projectCode?: string;
  ownerEmail?: string;
  ownerName?: string;
  suggestedBudget?: number;
}) => {
  const points = [data.projectCode, data.ownerEmail, data.ownerName, data.suggestedBudget].filter(Boolean).length;
  return Math.round((points / 4) * 100);
};

// ─── Contract Service ─────────────────────────────────────────────────────────
export const ContractService = {
  /** POST /api/contracts/proposals/parse */
  async parseProposal(filePath: string, originalName: string): Promise<ParsedProposal> {
    const ext = path.extname(originalName).toLowerCase();
    let sourceType: ParsedProposal['sourceType'] = 'text';
    let rawText = '';

    if (ext === '.pdf') {
      sourceType = 'pdf';
      const buffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      rawText = parsed.text ?? '';
      await parser.destroy();
    } else if (ext === '.docx' || ext === '.doc') {
      sourceType = 'docx';
      const parsed = await mammoth.extractRawText({ path: filePath });
      rawText = parsed.value ?? '';
    } else {
      sourceType = 'text';
      const buffer = await fs.readFile(filePath);
      rawText = buffer.toString('utf8');
    }

    const text = normalizeText(rawText);
    if (!text) {
      throw new Error('Không thể trích xuất nội dung từ tệp đề xuất. Vui lòng kiểm tra định dạng file.');
    }

    const detected = detectProposalData(text);

    let suggestedProjectId: string | undefined;
    let projectTitle: string | undefined;

    if (detected.projectCode) {
      const byCode = await prisma.project.findFirst({
        where: { code: detected.projectCode, is_deleted: false },
        select: { id: true, title: true },
      });
      if (byCode) {
        suggestedProjectId = byCode.id;
        projectTitle = byCode.title;
      }
    }

    if (!suggestedProjectId && detected.ownerEmail) {
      const byOwner = await prisma.project.findFirst({
        where: {
          owner: { email: detected.ownerEmail },
          is_deleted: false,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, code: true, title: true },
      });
      if (byOwner) {
        suggestedProjectId = byOwner.id;
        projectTitle = byOwner.title;
      }
    }

    const confidence = buildConfidence(detected);
    const notesSuggestion = [
      'Nguồn đề xuất: Upload + nhận diện tự động',
      detected.projectCode ? `Mã đề tài nhận diện: ${detected.projectCode}` : 'Mã đề tài nhận diện: chưa rõ',
      detected.ownerEmail ? `Email chủ nhiệm: ${detected.ownerEmail}` : 'Email chủ nhiệm: chưa rõ',
      detected.suggestedBudget ? `Kinh phí nhận diện: ${detected.suggestedBudget.toLocaleString('vi-VN')} VNĐ` : 'Kinh phí nhận diện: chưa rõ',
    ].join('\n');

    return {
      sourceType,
      projectCode: detected.projectCode,
      projectTitle,
      suggestedProjectId,
      suggestedBudget: detected.suggestedBudget,
      ownerName: detected.ownerName,
      ownerTitle: detected.ownerTitle,
      ownerEmail: detected.ownerEmail,
      confidence,
      notesSuggestion,
      textExcerpt: text.slice(0, 500),
    };
  },

  /** GET /api/contracts */
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
  async getById(id: string, userId: string, userRole: string) {
    const roleFilter = userRole === 'project_owner' ? { project: { ownerId: userId } } : {};
    const contract = await prisma.contract.findFirst({
      where: { OR: [{ id }, { code: id }], is_deleted: false, ...roleFilter },
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
