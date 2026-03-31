import { z } from 'zod';
import prisma from '../../prisma';
import { nextContractCode } from '../../utils/codeGenerator';
import { logBusiness } from '../../middleware/requestLogger';
import fs from 'fs/promises';
import path from 'path';
const { PDFParse } = require('pdf-parse');
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { resolveExistingUploadFile, sanitizeDownloadName } from '../../utils/uploadFile';

// ─── Validation Schemas ───────────────────────────────────────────────────────
export const CreateContractSchema = z.object({
  projectId: z.string().cuid(),
  budget:    z.number().positive(),
  agencyName: z.string().optional(),
  representative: z.string().optional(),
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

type ContractDownloadPayload =
  | {
      kind: 'file';
      absolutePath: string;
      fileName: string;
    }
  | {
      kind: 'buffer';
      fileBuffer: Buffer;
      fileName: string;
    };

type ContractExcelPayload = {
  workbook: ExcelJS.Workbook;
  fileName: string;
};

const normalizeText = (raw: string) =>
  raw
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const normalizeCode = (value: string) => value.replace(/[\s_/]+/g, '-').toUpperCase();

const stripVietnamese = (value: string) =>
  value
    .replace(/[Đđ]/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const parseMoney = (value: string): number | undefined => {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const isLikelyProjectCode = (value?: string): boolean => {
  if (!value) return false;
  const compact = value.replace(/\s+/g, '');
  return /[A-Z]/i.test(compact) && /\d/.test(compact) && compact.length >= 5;
};

const legacyDetectProposalData = (text: string) => {
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

const detectProposalData = (text: string) => {
  const normalized = stripVietnamese(text);
  const projectCodeFromLabelRaw =
    normalized.match(/(?:ma\s*de\s*tai|ma\s*dt)\s*[:\-]\s*([A-Z0-9\-_/.\s]{4,})/i)?.[1]?.trim();
  const projectCodeFromLabel = projectCodeFromLabelRaw
    ?.split(/\n|;|,/)[0]
    ?.trim();
  const projectCodeFromPattern =
    normalized.match(/\b(?:DT|DETAI)[\s_\/-]?\d{2,4}[\s_\/-]?\d{2,6}(?:[\s_\/-]?[A-Z0-9]{1,6})?\b/i)?.[0];
  const projectCodeCandidate = [projectCodeFromLabel, projectCodeFromPattern].find(isLikelyProjectCode);
  const projectCode = projectCodeCandidate ? normalizeCode(projectCodeCandidate) : undefined;

  const ownerEmail =
    normalized.match(/email\s*[:\-]\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1]?.toLowerCase() ??
    normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();

  const ownerNameLine =
    normalized.match(/(?:chu\s*nhiem(?:\s*de\s*tai)?|ben\s*b)\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim();

  const ownerTitle = ownerNameLine?.match(/^(GS\.TS\.|PGS\.TS\.|TS\.|ThS\.|GS|PGS|TS|ThS)/i)?.[0];
  const ownerName = ownerNameLine?.replace(/^(GS\.TS\.|PGS\.TS\.|TS\.|ThS\.|GS|PGS|TS|ThS)\s*/i, '').trim();

  const budgetCandidate =
    normalized.match(/(?:kinh\s*phi\s*du\s*kien|kinh\s*phi|ngan\s*sach|gia\s*tri\s*hop\s*dong)\s*[:\-]?\s*([\d\s.,]{6,})/i)?.[1] ??
    normalized.match(/\b\d{1,3}(?:[.\s,]\d{3}){1,}(?:[.,]\d{1,2})?\b/)?.[0] ??
    normalized.match(/\b\d{7,}\b/)?.[0];

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

const toDisplayDate = (value?: Date | null) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('vi-VN');
};

const toPdfText = (value: unknown) =>
  String(value ?? '')
    .replace(/[Đđ]/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const buildContractPdfBuffer = async (contract: any) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  const lineGap = 20;

  const drawLine = (label: string, value: string) => {
    page.drawText(toPdfText(`${label}: ${value}`), {
      x: 56,
      y,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineGap;
  };

  page.drawText(toPdfText('RESEARCH CONTRACT SUMMARY'), {
    x: 56,
    y,
    size: 16,
    font: bold,
    color: rgb(0.12, 0.2, 0.5),
  });
  y -= 30;

  drawLine('Contract Code', contract?.code ?? 'N/A');
  drawLine('Project Code', contract?.project?.code ?? 'N/A');
  drawLine('Project Title', (contract?.project?.title ?? 'N/A').slice(0, 90));
  drawLine('Owner', contract?.project?.owner?.name ?? 'N/A');
  drawLine('Status', contract?.status ?? 'N/A');
  drawLine('Signed Date', toDisplayDate(contract?.signedDate));
  drawLine('Budget (VND)', Number(contract?.budget ?? 0).toLocaleString('vi-VN'));
  drawLine('Generated At', new Date().toLocaleString('vi-VN'));

  y -= 14;
  page.drawText(toPdfText('This PDF was generated by backend because no signed PDF file is stored yet.'), {
    x: 56,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
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
      rawText = await parser.getText();
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

  /** GET /api/contracts/:id/pdf */
  async getPdfDownload(id: string, userId: string, userRole: string): Promise<ContractDownloadPayload> {
    const contract = await ContractService.getById(id, userId, userRole);
    const sanitizedCode = sanitizeDownloadName(contract.code, `contract_${contract.id}`);
    const fileName = `${sanitizedCode}.pdf`;

    const uploadedPdfPath = await resolveExistingUploadFile(contract.pdfUrl ?? undefined);
    if (uploadedPdfPath) {
      return {
        kind: 'file',
        absolutePath: uploadedPdfPath,
        fileName,
      };
    }

    const fileBuffer = await buildContractPdfBuffer(contract);
    return {
      kind: 'buffer',
      fileBuffer,
      fileName,
    };
  },

  /** GET /api/contracts/:id/export-excel */
  async getExcelExport(id: string, userId: string, userRole: string): Promise<ContractExcelPayload> {
    const contract = await ContractService.getById(id, userId, userRole);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NCKH Backend';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Contract');
    worksheet.columns = [
      { header: 'Ma hop dong', key: 'contractCode', width: 22 },
      { header: 'Ma de tai', key: 'projectCode', width: 18 },
      { header: 'Ten de tai', key: 'projectTitle', width: 44 },
      { header: 'Chu nhiem', key: 'owner', width: 28 },
      { header: 'Email chu nhiem', key: 'ownerEmail', width: 30 },
      { header: 'Ngan sach (VND)', key: 'budget', width: 20 },
      { header: 'Trang thai', key: 'status', width: 18 },
      { header: 'Ngay ky', key: 'signedDate', width: 16 },
      { header: 'PDF URL', key: 'pdfUrl', width: 42 },
      { header: 'Ghi chu', key: 'notes', width: 42 },
      { header: 'Ngay xuat', key: 'exportedAt', width: 22 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.addRow({
      contractCode: contract.code,
      projectCode: contract.project?.code ?? '',
      projectTitle: contract.project?.title ?? '',
      owner: contract.project?.owner?.name ?? '',
      ownerEmail: contract.project?.owner?.email ?? '',
      budget: Number(contract.budget ?? 0),
      status: contract.status,
      signedDate: contract.signedDate ? new Date(contract.signedDate).toLocaleDateString('vi-VN') : '',
      pdfUrl: contract.pdfUrl ?? '',
      notes: contract.notes ?? '',
      exportedAt: new Date().toLocaleString('vi-VN'),
    });

    const budgetCell = worksheet.getCell('F2');
    budgetCell.numFmt = '#,##0';

    const fileName = `${sanitizeDownloadName(contract.code, `contract_${contract.id}`)}.xlsx`;
    return { workbook, fileName };
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
    const advanceAmount = Number(data.budget) * 0.4;

    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: {
          code,
          projectId: data.projectId,
          budget: data.budget,
          agencyName: data.agencyName,
          representative: data.representative,
          notes: data.notes,
        },
      }),
      prisma.project.update({
        where: { id: data.projectId },
        data: { advancedAmount: advanceAmount },
      }),
    ]);

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
