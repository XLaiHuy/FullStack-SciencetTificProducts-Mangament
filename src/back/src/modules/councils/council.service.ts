import { z } from 'zod';
import prisma from '../../prisma';
import { nextCouncilCode } from '../../utils/codeGenerator';
import { logBusiness, logDeleteAction } from '../../middleware/requestLogger';
import { sendCouncilInvitation } from '../../utils/emailService';
import { hashPassword } from '../../utils/password';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { resolveExistingUploadFile, sanitizeDownloadName } from '../../utils/uploadFile';
import { NotificationService } from '../notifications/notification.service';

type NewCouncilAccountCsvRow = {
  name: string;
  email: string;
  role: MemberInput['role'];
  temporaryPassword: string;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────
export const MemberSchema = z.object({
  userId:      z.string().cuid().optional(),
  name:        z.string().min(2),
  title:       z.string().optional(),
  institution: z.string().optional(),
  email:       z.string().email(),
  phone:       z.string().optional(),
  affiliation: z.string().optional(),
  role:        z.enum(['chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky', 'uy_vien']),
});

export const CreateCouncilSchema = z.object({
  projectId: z.string().cuid(),
  members:   z.array(MemberSchema).min(5, 'Hội đồng phải có ít nhất 5 thành viên'),
});

export const AddMemberSchema = MemberSchema;

export const CheckConflictSchema = z.object({
  memberEmail: z.string().email(),
  projectId:   z.string(),
});

export const ScoreDecisionSchema = z.object({
  memberId: z.string().cuid(),
  decision: z.enum(['accepted', 'rework']),
  note: z.string().max(1000).optional(),
});

const ScorePayloadSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  comments: z.string().trim().max(3000).optional().default(''),
}).strict();

const ReviewPayloadSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  comments: z.string().trim().max(3000).optional().default(''),
}).strict();

const MinutesPayloadSchema = z.object({
  content: z.string().trim().max(5000).optional(),
  fileUrl: z.string().trim().min(1).optional(),
}).strict();

type MemberInput = z.infer<typeof MemberSchema>;

type CouncilDownloadPayload =
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

const mapMemberRoleToCouncilRole = (role: MemberInput['role']) => {
  if (role === 'chu_tich') return 'chairman';
  if (role === 'thu_ky') return 'secretary';
  if (role === 'phan_bien_1' || role === 'phan_bien_2') return 'reviewer';
  return 'member';
};

const REQUIRED_COUNCIL_ROLES: Array<MemberInput['role']> = ['chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky'];

const getMissingCouncilRoles = (members: Array<{ role: MemberInput['role'] }>) =>
  REQUIRED_COUNCIL_ROLES.filter((role) => !members.some((member) => member.role === role));

const SCORE_ELIGIBLE_ROLES: MemberInput['role'][] = ['chu_tich', 'phan_bien_1', 'phan_bien_2'];

const isScoreEligibleRole = (role?: string | null): role is MemberInput['role'] =>
  role === 'chu_tich' || role === 'phan_bien_1' || role === 'phan_bien_2';

const generateTemporaryPassword = () => `NCKH@${Math.random().toString(36).slice(-6)}A1`;

const getConfiguredCouncilDefaultPassword = async () => {
  const row = await prisma.systemConfig.findUnique({
    where: { key: 'COUNCIL_DEFAULT_PASSWORD' },
    select: { value: true },
  });
  const value = row?.value?.trim();
  return value && value.length >= 6 ? value : undefined;
};

const toCsvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildNewCouncilAccountsCsv = (
  decisionCode: string,
  projectCode: string,
  rows: NewCouncilAccountCsvRow[],
) => {
  const header = [
    'HoiDongCode',
    'DeTaiCode',
    'HoTen',
    'EmailDangNhap',
    'VaiTroHoiDong',
    'MatKhauTam',
    'GhiChu',
  ].map(toCsvCell).join(',');

  const body = rows.map((row) => ([
    decisionCode,
    projectCode,
    row.name,
    row.email,
    row.role,
    row.temporaryPassword,
    'Chi hien thi mot lan. Yeu cau doi mat khau khi dang nhap dau tien.',
  ].map(toCsvCell).join(',')));

  return [header, ...body].join('\n');
};

const buildCouncilPdfBuffer = async (title: string, lines: string[]) => {
  const toPdfText = (value: string) =>
    value
      .replace(/[Đđ]/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  page.drawText(toPdfText(title), {
    x: 56,
    y,
    size: 16,
    font: bold,
    color: rgb(0.12, 0.2, 0.5),
  });
  y -= 30;

  for (const line of lines) {
    const segments = line.match(/.{1,95}/g) ?? [line];
    for (const segment of segments) {
      if (y < 80) break;
      page.drawText(toPdfText(segment), {
        x: 56,
        y,
        size: 11,
        font,
        color: rgb(0.12, 0.12, 0.12),
      });
      y -= 18;
    }
    if (y < 80) break;
  }

  page.drawText(toPdfText(`Generated at ${new Date().toLocaleString('vi-VN')}`), {
    x: 56,
    y: 50,
    size: 10,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
};

const ensureCouncilUserAccount = async (member: MemberInput, defaultTemporaryPassword?: string) => {
  const byId = member.userId
    ? await prisma.user.findFirst({ where: { id: member.userId, is_deleted: false } })
    : null;
  const existing = byId ?? await prisma.user.findFirst({ where: { email: member.email, is_deleted: false } });

  if (existing) {
    return {
      userId: existing.id,
      loginEmail: existing.email,
      temporaryPassword: undefined as string | undefined,
      isNewAccount: false,
    };
  }

  const temporaryPassword = defaultTemporaryPassword ?? generateTemporaryPassword();
  const created = await prisma.user.create({
    data: {
      name: member.name,
      email: member.email,
      passwordHash: await hashPassword(temporaryPassword),
      role: 'council_member',
      councilRole: mapMemberRoleToCouncilRole(member.role) as never,
      title: member.title,
      department: member.affiliation ?? member.institution,
      isActive: true,
      isLocked: false,
      mustChangePassword: true as never,
    },
  });

  return {
    userId: created.id,
    loginEmail: created.email,
    temporaryPassword,
    isNewAccount: true,
  };
};

// ─── Utilities for file parsing ───────────────────────────────────────────────

const coerceToText = (raw: unknown): string => {
  if (typeof raw === 'string') return raw;
  if (raw == null) return '';
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (Array.isArray(raw)) return raw.map((item) => coerceToText(item)).join('\n');

  if (typeof raw === 'object') {
    const candidate = raw as { text?: unknown; value?: unknown; pages?: unknown[] };
    if (typeof candidate.text === 'string') return candidate.text;
    if (typeof candidate.value === 'string') return candidate.value;
    if (Array.isArray(candidate.pages)) {
      const pageText = candidate.pages
        .map((page) => {
          if (typeof page === 'string') return page;
          if (page && typeof page === 'object' && typeof (page as { text?: unknown }).text === 'string') {
            return (page as { text: string }).text;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
      if (pageText) return pageText;
    }
  }

  return String(raw);
};

const normalizeText = (raw: unknown) =>
  coerceToText(raw)
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const stripVietnamese = (value: string) =>
  value
    .replace(/[Đđ]/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const detectRole = (value: string): z.infer<typeof MemberSchema>['role'] | undefined => {
  const normalized = stripVietnamese(value).toLowerCase();
  if (normalized.includes('chu tich hoi dong') || normalized.includes('chu tich')) return 'chu_tich';
  if (normalized.includes('phan bien 1') || normalized.includes('pb1')) return 'phan_bien_1';
  if (normalized.includes('phan bien 2') || normalized.includes('pb2')) return 'phan_bien_2';
  if (normalized.includes('thu ky')) return 'thu_ky';
  if (normalized.includes('uy vien')) return 'uy_vien';
  return undefined;
};

const sanitizeName = (value: string): { name?: string; title?: string } => {
  const compact = value
    .replace(/\b(stt|tt)\b\s*[:\-]?\s*\d+/ig, '')
    .replace(/^\d+[\).\-\s]*/, '')
    .replace(/\b(vai\s*tro|vai\s*tro:|chuc\s*vu|email|don\s*vi|co\s*quan|sdt|dien\s*thoai)\b.*$/i, '')
    .replace(/\b(chu\s*tich\s*hoi\s*dong|chu\s*tich|phan\s*bien\s*1|phan\s*bien\s*2|thu\s*ky|uy\s*vien)\b/ig, '')
    .replace(/[|;:,]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!compact || compact.length < 3) return {};
  const title = compact.match(/^(GS\.TS|PGS\.TS|TS|ThS)\.?/i)?.[0];
  const name = compact.replace(/^(GS\.TS|PGS\.TS|TS|ThS)\.?\s*/i, '').trim();
  if (!name || name.length < 3) return {};
  return { name, title };
};

type ParsedMember = {
  name?: string;
  title?: string;
  institution?: string;
  email?: string;
  phone?: string;
  role?: z.infer<typeof MemberSchema>['role'];
  confidence: number;
  rawLine: string;
};

const detectProposalOwnerAsMember = (text: string): ParsedMember | null => {
  const ownerLine = text.match(/(?:chủ\s*nhiệm(?:\s*đề\s*tài)?|chu\s*nhiem(?:\s*de\s*tai)?)\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim() ?? '';
  const ownerEmail =
    text.match(/(?:email)\s*[:\-]\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1]?.toLowerCase() ??
    text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();

  const { name, title } = sanitizeName(ownerLine || '');
  if (!name && !ownerEmail) return null;

  const confidence = [name, ownerEmail].filter(Boolean).length === 2 ? 70 : 45;
  return {
    name,
    title,
    email: ownerEmail,
    role: 'uy_vien',
    confidence,
    rawLine: ownerLine || text.slice(0, 120),
  };
};

/**
 * Parses raw text to detect council member information based on regex.
 * This is the core parsing logic and likely needs adjustment based on real-world file formats.
 */
const detectCouncilMembers = (text: string): ParsedMember[] => {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\t+/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter((line) => line.length > 6);
  const detectedMembers: ParsedMember[] = [];

  const roleMap: Record<string, z.infer<typeof MemberSchema>['role']> = {
    'chủ tịch': 'chu_tich',
    'chủ tịch hội đồng': 'chu_tich',
    'chu tich': 'chu_tich',
    'phản biện 1': 'phan_bien_1',
    'phan bien 1': 'phan_bien_1',
    'phản biện 2': 'phan_bien_2',
    'phan bien 2': 'phan_bien_2',
    'thư ký': 'thu_ky',
    'thu ky': 'thu_ky',
    'ủy viên': 'uy_vien',
    'uy vien': 'uy_vien',
  };

  for (const line of lines) {
    const email = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
    const phone = line.match(/(?:\d{10,11}\b)/)?.[0];

    const roleText = line.match(/(?:vai trò|vai tro|chức vụ|chuc vu|vi trí|vi tri|role)\s*[:\-]?\s*([^|\n,]+)/i)?.[1]?.trim().toLowerCase();
    const roleKey = roleText ? Object.keys(roleMap).find((k) => roleText.includes(k)) : undefined;
    const role = roleKey ? roleMap[roleKey] : detectRole(line);

    const nameByLabel = line.match(/(?:họ và tên|ho va ten|họ tên|ho ten)\s*[:\-]?\s*([^|\n,]+)/i)?.[1] ?? '';
    const beforeEmail = email ? line.slice(0, line.toLowerCase().indexOf(email.toLowerCase())) : line;
    const nameCandidate = nameByLabel || beforeEmail.split(/[,;|]/)[0] || beforeEmail;
    const { name, title } = sanitizeName(nameCandidate);

    const institution = line.match(/(?:đơn vị|don vi|cơ quan|co quan)\s*[:\-]?\s*([^|\n,]+)/i)?.[1]?.trim();

    const points = [name, email, role, institution].filter(Boolean).length;
    const confidence = Math.round((points / 4) * 100);

    // Require either an email, or an explicit name by label, or a phone to consider it a real person line.
    // This avoids accidental matches on instruction sentences that happen to mention a role.
    const isActuallyPerson = email || phone || line.toLowerCase().includes('họ và tên') || line.toLowerCase().includes('ho va ten') || line.toLowerCase().includes('họ tên') || line.toLowerCase().includes('ho ten') || (name && name.length > 5 && name.length <= 40 && !line.includes('chuẩn bị') && !line.includes('nhiệm thu') && !line.includes('chịu trách nhiệm'));
    
    const identitySignals = [name, email, role].filter(Boolean).length;
    if (identitySignals >= 2 && isActuallyPerson && name && name.length <= 50) {
      detectedMembers.push({
        name,
        email,
        phone,
        title,
        institution,
        role,
        confidence,
        rawLine: line.slice(0, 200),
      });
    }
  }

  const deduped = new Map<string, ParsedMember>();
  for (const member of detectedMembers) {
    const key = (member.email || `${member.name || ''}|${member.role || ''}`).toLowerCase();
    if (!key.trim()) continue;
    const existing = deduped.get(key);
    if (!existing || member.confidence > existing.confidence) {
      deduped.set(key, member);
    }
  }

  const refined = Array.from(deduped.values());
  if (refined.length > 0) {
    return refined;
  }

  const fallback = detectProposalOwnerAsMember(text);
  return fallback ? [fallback] : [];
};


// ─── Council Service ──────────────────────────────────────────────────────────
export const CouncilService = {
  /** POST /api/councils/parse-members */
  async parseMembersFromFile(filePath: string, originalName: string): Promise<ParsedMember[]> {
    try {
      const ext = path.extname(originalName).toLowerCase();
      let rawText = '';

      if (ext === '.docx' || ext === '.doc') {
        const parsed = await mammoth.extractRawText({ path: filePath });
        rawText = parsed.value ?? '';
      } else {
        const buffer = await fs.readFile(filePath);
        rawText = buffer.toString('utf8');
      }

      const text = normalizeText(rawText);
      if (!text) {
        throw new Error('Không thể trích xuất nội dung từ tệp. Vui lòng kiểm tra định dạng file.');
      }

      const members = detectCouncilMembers(text);
      if (members.length === 0) {
        throw new Error('Không nhận diện được thành viên nào từ file. Vui lòng kiểm tra nội dung và định dạng.');
      }

      return members;
    } finally {
      await fs.unlink(filePath).catch(() => undefined);
    }
  },

  /** GET /api/councils */
  async getAll(
    filters: { status?: string; search?: string; page?: number; limit?: number },
    userId: string,
    userRole: string
  ) {
    const { status, search, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = { is_deleted: false };
    if (userRole === 'council_member') {
      where.members = { some: { userId, is_deleted: false } };
    } else if (userRole === 'project_owner') {
      where.project = { ownerId: userId };
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { decisionCode: { contains: search } },
        { project: { title: { contains: search } } },
        { project: { code:  { contains: search } } },
      ];
    }

    const [total, councils] = await Promise.all([
      prisma.council.count({ where }),
      prisma.council.findMany({
        where,
        include: {
          project: { select: { id: true, code: true, title: true, owner: { select: { name: true } } } },
          members: { where: { is_deleted: false } },
        },
        orderBy: { createdDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { councils, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  /** GET /api/councils/:id */
  async getById(id: string, userId: string, userRole: string) {
    const roleFilter = userRole === 'council_member'
      ? { members: { some: { userId, is_deleted: false } } }
      : userRole === 'project_owner'
        ? { project: { ownerId: userId } }
        : {};

    const council = await prisma.council.findFirst({
      where: { OR: [{ id }, { decisionCode: id }], is_deleted: false, ...roleFilter },
      include: {
        project: {
          include: {
            owner: true,
            reports: {
              orderBy: { submittedAt: 'desc' },
              select: {
                id: true,
                type: true,
                fileUrl: true,
                submittedAt: true,
              },
            },
          },
        },
        members: { where: { is_deleted: false } },
        reviews: userRole === 'council_member'
          ? { where: { member: { userId, is_deleted: false } } }
          : true,
        minutes: true,
      },
    });
    if (!council) throw new Error('Hội đồng không tồn tại.');
    return council;
  },

  /** GET /api/council-member/councils — councils where user is a member */
  async getByMember(userId: string) {
    return prisma.council.findMany({
      where: {
        is_deleted: false,
        members: { some: { userId, is_deleted: false } },
      },
      include: {
        project: { select: { code: true, title: true } },
        members: { where: { is_deleted: false } },
      },
      orderBy: { createdDate: 'desc' },
    });
  },

  async create(data: z.infer<typeof CreateCouncilSchema>, actorId: string, actorName: string) {
    const project = await prisma.project.findFirst({ 
      where: { id: data.projectId, is_deleted: false },
      include: { owner: true, members: { include: { user: true } } }
    });
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (project.status !== 'cho_nghiem_thu') {
      throw new Error('Chỉ có thể thành lập Hội đồng cho đề tài đang ở trạng thái "Chờ nghiệm thu".');
    }

    // Check for COI before creating
    const hasChairman = data.members.some(m => m.role === 'chu_tich');
    const hasSecretary = data.members.some(m => m.role === 'thu_ky');
    const hasReviewer1 = data.members.some(m => m.role === 'phan_bien_1');
    const hasReviewer2 = data.members.some(m => m.role === 'phan_bien_2');

    if (!hasChairman || !hasSecretary || !hasReviewer1 || !hasReviewer2) {
      throw new Error('Hội đồng bắt buộc phải có Chủ tịch, Thư ký, Phản biện 1 và Phản biện 2.');
    }

    const uniqueEmails = new Set(data.members.map(m => m.email));
    if (uniqueEmails.size !== data.members.length) {
      throw new Error('Thành viên trong hội đồng không được trùng email.');
    }

    const decisionCode = await nextCouncilCode();

    const defaultTemporaryPassword = await getConfiguredCouncilDefaultPassword();

    const preparedMembers = await Promise.all(
      data.members.map(async (m) => {
        const account = await ensureCouncilUserAccount(m, defaultTemporaryPassword);
        const isOwner = m.email === project.owner.email;
        const isMember = project.members.some(pm => pm.user.email === m.email && !pm.is_deleted);
        return {
          userId: account.userId ?? null,
          name: m.name,
          email: m.email,
          title: m.title,
          institution: m.institution,
          phone: m.phone,
          affiliation: m.affiliation,
          role: m.role,
          hasConflict: isOwner || isMember,
          loginEmail: account.loginEmail,
          temporaryPassword: account.temporaryPassword,
          isNewAccount: account.isNewAccount,
        };
      })
    );

    const council = await prisma.council.create({
      data: {
        decisionCode,
        projectId: data.projectId,
        members: {
          create: preparedMembers.map((m) => ({
            userId: m.userId,
            name: m.name,
            email: m.email,
            title: m.title,
            institution: m.institution,
            phone: m.phone,
            affiliation: m.affiliation,
            role: m.role,
            hasConflict: m.hasConflict,
          })),
        },
      },
      include: { members: true, project: { select: { code: true, title: true } } },
    });

    // Keep council creation successful even when some invitation emails fail.
    const invitationAttempts = await Promise.allSettled(
      preparedMembers.map((m) =>
        sendCouncilInvitation(m.email, m.name, project.title, decisionCode, {
          loginEmail: m.loginEmail,
          temporaryPassword: m.temporaryPassword,
          isNewAccount: m.isNewAccount,
        })
      )
    );

    const invitationFailures = invitationAttempts
      .map((attempt, index) => {
        if (attempt.status === 'fulfilled') return null;
        const reason = attempt.reason instanceof Error ? attempt.reason.message : 'Unknown email error';
        return {
          email: preparedMembers[index]?.email,
          reason,
        };
      })
      .filter((value): value is { email: string; reason: string } => Boolean(value));

    await logBusiness(actorId, actorName,
      `Thành lập Hội đồng ${decisionCode} cho đề tài ${project.code}`,
      'Councils'
    );

    await NotificationService.createForUsers(
      preparedMembers
        .map((m) => m.userId)
        .filter((id): id is string => Boolean(id)),
      'request',
      `Ban duoc moi tham gia hoi dong ${decisionCode} cho de tai ${project.code}.`
    );

    const newAccounts = preparedMembers
      .filter((member) => member.isNewAccount && member.temporaryPassword)
      .map((member) => ({
        name: member.name,
        email: member.loginEmail,
        role: member.role,
        temporaryPassword: member.temporaryPassword as string,
      }));

    const csvText = newAccounts.length > 0
      ? buildNewCouncilAccountsCsv(decisionCode, project.code, newAccounts)
      : undefined;
    const csvFileName = newAccounts.length > 0
      ? `${sanitizeDownloadName(`new_accounts_${decisionCode}`, `council_${council.id}`)}.csv`
      : undefined;

    return {
      ...council,
      invitationSummary: {
        sent: invitationAttempts.length - invitationFailures.length,
        failed: invitationFailures.length,
        failures: invitationFailures,
      },
      newAccountsCount: newAccounts.length,
      newAccountsCsvBase64: csvText ? Buffer.from(csvText, 'utf8').toString('base64') : undefined,
      newAccountsCsvFileName: csvFileName,
    };
  },

  /** POST /api/councils/:id/members */
  async addMember(councilId: string, member: z.infer<typeof MemberSchema>, actorId: string, actorName: string) {
    const council = await prisma.council.findFirst({
      where: { id: councilId, is_deleted: false },
      include: {
        project: { include: { owner: true, members: { include: { user: true } } } },
      },
    });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const existingMember = await prisma.councilMembership.findFirst({
      where: { councilId, email: member.email, is_deleted: false },
    });
    if (existingMember) throw new Error('Thành viên đã tồn tại trong Hội đồng.');

    const defaultTemporaryPassword = await getConfiguredCouncilDefaultPassword();
    const account = await ensureCouncilUserAccount(member, defaultTemporaryPassword);
    const isOwner = member.email === council.project.owner.email;
    const isMember = council.project.members.some(pm => pm.user.email === member.email && !pm.is_deleted);

    const added = await prisma.councilMembership.create({
      data: {
        councilId,
        userId: account.userId ?? null,
        name: member.name,
        email: member.email,
        title: member.title,
        institution: member.institution,
        phone: member.phone,
        affiliation: member.affiliation,
        role: member.role,
        hasConflict: isOwner || isMember,
      },
    });

    await sendCouncilInvitation(member.email, member.name, council.project.title, council.decisionCode, {
      loginEmail: account.loginEmail,
      temporaryPassword: account.temporaryPassword,
      isNewAccount: account.isNewAccount,
    });

    if (account.userId) {
      await NotificationService.createForUser(
        account.userId,
        'request',
        `Ban duoc them vao hoi dong ${council.decisionCode} cho de tai ${council.project.code}.`
      );
    }

    const csvText = account.isNewAccount && account.temporaryPassword
      ? buildNewCouncilAccountsCsv(council.decisionCode, council.project.code, [{
          name: member.name,
          email: account.loginEmail,
          role: member.role,
          temporaryPassword: account.temporaryPassword,
        }])
      : undefined;

    await logBusiness(actorId, actorName, `Thêm thành viên ${member.name} vào HĐ ${council.decisionCode}`, 'Councils');
    return {
      ...added,
      newAccountsCount: account.isNewAccount ? 1 : 0,
      newAccountsCsvBase64: csvText ? Buffer.from(csvText, 'utf8').toString('base64') : undefined,
      newAccountsCsvFileName: csvText ? `${sanitizeDownloadName(`new_account_${council.decisionCode}`, `council_${council.id}`)}.csv` : undefined,
    };
  },

  /** POST /api/councils/:id/decision */
  async uploadDecision(councilId: string, filePath: string, actorId: string, actorName: string) {
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const updated = await prisma.council.update({
      where: { id: councilId },
      data: { decisionPdfUrl: filePath },
    });

    await logBusiness(actorId, actorName, `Tải lên quyết định Hội đồng ${council.decisionCode}`, 'Councils');
    return updated;
  },

  /** GET /api/councils/:id/decision-file */
  async getDecisionDownload(councilId: string, userId: string, userRole: string): Promise<CouncilDownloadPayload> {
    const council = await CouncilService.getById(councilId, userId, userRole);
    const baseName = sanitizeDownloadName(council.decisionCode, `council_${council.id}`);
    const uploadedFile = await resolveExistingUploadFile(council.decisionPdfUrl ?? undefined);

    if (uploadedFile) {
      const ext = path.extname(uploadedFile) || '.pdf';
      return {
        kind: 'file',
        absolutePath: uploadedFile,
        fileName: `${baseName}_decision${ext}`,
      };
    }

    const memberSummary = council.members
      .map((m) => `- ${m.name} (${m.role})`)
      .join(' | ');

    const fileBuffer = await buildCouncilPdfBuffer('COUNCIL DECISION SUMMARY', [
      `Decision code: ${council.decisionCode}`,
      `Project code: ${council.project.code}`,
      `Project title: ${council.project.title}`,
      `Status: ${council.status}`,
      `Members: ${memberSummary || 'N/A'}`,
      'Note: This PDF is generated by backend because decision file has not been uploaded yet.',
    ]);

    return {
      kind: 'buffer',
      fileBuffer,
      fileName: `${baseName}_decision.pdf`,
    };
  },

  /** GET /api/councils/:id/minutes-file */
  async getMinutesDownload(councilId: string, userId: string, userRole: string): Promise<CouncilDownloadPayload> {
    const council = await CouncilService.getById(councilId, userId, userRole);
    const baseName = sanitizeDownloadName(council.decisionCode, `council_${council.id}`);
    const uploadedFile = await resolveExistingUploadFile(council.minutes?.fileUrl ?? undefined);

    if (uploadedFile) {
      const ext = path.extname(uploadedFile) || '.pdf';
      return {
        kind: 'file',
        absolutePath: uploadedFile,
        fileName: `${baseName}_minutes${ext}`,
      };
    }

    const scoreLines = council.reviews
      .filter((r) => r.score !== null)
      .map((r) => `- ${r.type}: ${Number(r.score).toFixed(1)} / 100`);

    const fileBuffer = await buildCouncilPdfBuffer('COUNCIL MINUTES SUMMARY', [
      `Decision code: ${council.decisionCode}`,
      `Project: ${council.project.title}`,
      `Recorded by: ${council.minutes?.recordedBy ?? 'N/A'}`,
      `Content: ${(council.minutes?.content ?? 'No minutes content submitted yet.').slice(0, 400)}`,
      ...(scoreLines.length ? scoreLines : ['- No score submitted yet.']),
      'Note: This PDF is generated by backend because minutes file has not been uploaded yet.',
    ]);

    return {
      kind: 'buffer',
      fileBuffer,
      fileName: `${baseName}_minutes.pdf`,
    };
  },

  /** POST /api/councils/:id/resend-invitations */
  async resendInvitations(councilId: string, actorId: string, actorName: string) {
    const council = await prisma.council.findFirst({
      where: { id: councilId, is_deleted: false },
      include: {
        project: { select: { title: true, code: true } },
        members: {
          where: { is_deleted: false },
          select: { email: true, name: true, user: { select: { email: true } } },
        },
      },
    });
    if (!council) throw new Error('Hội đồng không tồn tại.');
    if (!council.members.length) throw new Error('Hội đồng chưa có thành viên để gửi email.');

    const attempts = await Promise.allSettled(
      council.members.map((m) =>
        sendCouncilInvitation(m.email, m.name, council.project.title, council.decisionCode, {
          loginEmail: m.user?.email ?? m.email,
          isNewAccount: false,
        })
      )
    );

    const failures = attempts
      .map((attempt, index) => ({ attempt, member: council.members[index] }))
      .filter((row): row is { attempt: PromiseRejectedResult; member: (typeof council.members)[number] } => row.attempt.status === 'rejected')
      .map((row) => ({
        email: row.member.email,
        reason: row.attempt.reason instanceof Error ? row.attempt.reason.message : String(row.attempt.reason),
      }));

    const sent = attempts.length - failures.length;

    if (sent === 0) {
      const detail = failures.map((f) => `${f.email}: ${f.reason}`).join(' | ');
      throw new Error(`Không thể gửi lại thư mời cho bất kỳ thành viên nào. ${detail}`);
    }

    await logBusiness(actorId, actorName, `Gửi lại thư mời Hội đồng ${council.decisionCode}`, 'Councils');
    return {
      sent,
      failed: failures.length,
      failures,
      councilCode: council.decisionCode,
    };
  },

  /** DELETE /api/councils/:id/members/:memberId */
  async removeMember(councilId: string, memberId: string, actorId: string, actorName: string) {
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');
    
    const member = await prisma.councilMembership.findFirst({
      where: { id: memberId, councilId, is_deleted: false },
    });
    if (!member) throw new Error('Thành viên không tồn tại trong Hội đồng hoặc đã bị gỡ.');
    
    await prisma.councilMembership.update({ where: { id: memberId }, data: { is_deleted: true } });
    await logDeleteAction(actorId, actorName, 'Councils', member);
    // Keep a readable business action too (module traceability)
    await logBusiness(actorId, actorName, `Xóa thành viên khỏi HĐ ${council.decisionCode}`, 'Councils');
  },

  /**
   * POST /api/councils/check-conflict
   * COI Rule: a member who owns the project cannot be on its council
   */
  async checkConflict(memberEmail: string, projectId: string): Promise<{ hasConflict: boolean; reason?: string }> {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { code: projectId }], is_deleted: false },
      include: { owner: true, members: { include: { user: true } } },
    });
    if (!project) throw new Error('Đề tài không tồn tại.');

    if (project.owner.email === memberEmail) {
      return { hasConflict: true, reason: 'Thành viên là Chủ nhiệm đề tài đang được nghiệm thu.' };
    }
    
    const isMember = project.members.some(pm => pm.user.email === memberEmail && !pm.is_deleted);
    if (isMember) {
      return { hasConflict: true, reason: 'Thành viên thuộc nhóm thực hiện đề tài.' };
    }

    return { hasConflict: false };
  },

  /** PUT /api/councils/:id/approve */
  async approve(id: string, actorId: string, actorName: string) {
    const council = await prisma.council.findFirst({ where: { id, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const updated = await prisma.council.update({
      where: { id },
      data:  { status: 'dang_danh_gia' },
    });

    // Transition project to da_nghiem_thu when council completes
    await logBusiness(actorId, actorName, `Phê duyệt Hội đồng ${council.decisionCode}`, 'Councils');
    return updated;
  },

  /** PUT /api/councils/:id/complete */
  async complete(id: string, actorId: string, actorName: string, actorRole: string) {
    const council = await prisma.council.findFirst({
      where: { id, is_deleted: false },
      include: {
        members: {
          where: { is_deleted: false },
          select: { role: true },
        },
      },
    });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const missingRoles = getMissingCouncilRoles(council.members);
    if (council.members.length < 5 || missingRoles.length > 0) {
      throw new Error('Hội đồng chưa đủ thành phần bắt buộc để hoàn thành nghiệm thu.');
    }

    if (actorRole === 'council_member') {
      const member = await prisma.councilMembership.findFirst({
        where: { councilId: id, userId: actorId, is_deleted: false },
        select: { role: true },
      });
      if (!member || (member.role !== 'thu_ky' && member.role !== 'chu_tich')) {
        throw new Error('Chi thu ky hoac chu tich hoi dong moi duoc phep hoan thanh nghiem thu.');
      }
    }

    const [updatedCouncil] = await prisma.$transaction([
      prisma.council.update({ where: { id }, data: { status: 'da_hoan_thanh' } }),
      prisma.project.update({ where: { id: council.projectId }, data: { status: 'da_nghiem_thu' } }),
    ]);

    await logBusiness(actorId, actorName,
      `Hoàn thành nghiệm thu HĐ ${council.decisionCode} — đề tài chuyển sang đã nghiệm thu`,
      'Councils'
    );
    return updatedCouncil;
  },

  /** POST /api/councils/:id/review */
  async submitReview(councilId: string, userId: string, payload: unknown) {
    const { score, comments } = ReviewPayloadSchema.parse(payload);
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const member = await prisma.councilMembership.findFirst({
      where: { councilId, userId, is_deleted: false },
    });
    if (!member) throw new Error('Bạn không phải thành viên hợp lệ của Hội đồng này.');
    if (member.role !== 'phan_bien_1' && member.role !== 'phan_bien_2') {
      throw new Error('Chi thanh vien phan bien moi duoc gui nhan xet phan bien.');
    }

    return prisma.councilReview.upsert({
      where: { councilId_memberId_type: { councilId, memberId: member.id, type: 'review' } } as never,
      create: { councilId, memberId: member.id, score, comments, type: 'review' },
      update: { score, comments },
    });
  },

  /** POST /api/councils/:id/minutes */
  async recordMinutes(
    councilId: string,
    actorUserId: string,
    actorRole: string,
    actorName: string,
    payload: unknown,
  ) {
    const { content, fileUrl } = MinutesPayloadSchema.parse(payload);
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hoi dong khong ton tai.');

    if (actorRole === 'council_member') {
      const member = await prisma.councilMembership.findFirst({
        where: { councilId, userId: actorUserId, is_deleted: false },
        select: { role: true },
      });
      if (!member || (member.role !== 'thu_ky' && member.role !== 'chu_tich')) {
        throw new Error('Chi thu ky hoac chu tich hoi dong moi duoc cap nhat bien ban.');
      }
    }

    return prisma.councilMinutes.upsert({
      where: { councilId },
      create: { councilId, content, fileUrl, recordedBy: actorName },
      update: { content, fileUrl, recordedBy: actorName },
    });
  },

  /** POST /api/councils/:id/score */
  async submitScore(councilId: string, userId: string, payload: unknown) {
    const { score, comments } = ScorePayloadSchema.parse(payload);
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const member = await prisma.councilMembership.findFirst({
      where: { councilId, userId, is_deleted: false },
    });
    if (!member) throw new Error('Bạn không phải thành viên hợp lệ của Hội đồng này.');
    if (!isScoreEligibleRole(member.role)) {
      throw new Error('Chi chu tich va cac phan bien moi duoc cham diem.');
    }

    return prisma.councilReview.upsert({
      where: { councilId_memberId_type: { councilId, memberId: member.id, type: 'score' } } as never,
      create: { councilId, memberId: member.id, score, comments, type: 'score' },
      update: { score, comments },
    });
  },

  async submitScoreDecision(
    councilId: string,
    actorUserId: string,
    actorRole: string,
    payload: unknown,
  ) {
    const { memberId, decision, note } = ScoreDecisionSchema.parse(payload);
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hoi dong khong ton tai.');

    const targetMember = await prisma.councilMembership.findFirst({
      where: { id: memberId, councilId, is_deleted: false },
    });
    if (!targetMember) throw new Error('Thanh vien khong ton tai trong hoi dong nay.');

    let decidedByName = 'System';
    let decidedByMemberId: string | null = null;

    if (actorRole === 'council_member') {
      const actorMembership = await prisma.councilMembership.findFirst({
        where: { councilId, userId: actorUserId, is_deleted: false },
      });
      if (!actorMembership || actorMembership.role !== 'thu_ky') {
        throw new Error('Chi thu ky hoi dong moi duoc phep xac nhan hoac yeu cau nhap lai diem.');
      }
      decidedByName = actorMembership.name;
      decidedByMemberId = actorMembership.id;
    } else {
      const actor = await prisma.user.findFirst({
        where: { id: actorUserId, is_deleted: false },
        select: { name: true },
      });
      if (actor?.name) decidedByName = actor.name;
    }

    const details = JSON.stringify({
      decision,
      note: note?.trim() ?? '',
      decidedByName,
      decidedByUserId: actorUserId,
      decidedByMemberId,
      decidedAt: new Date().toISOString(),
    });

    await prisma.councilReview.upsert({
      where: {
        councilId_memberId_type: { councilId, memberId: targetMember.id, type: 'decision' },
      } as never,
      create: {
        councilId,
        memberId: targetMember.id,
        type: 'decision',
        comments: details,
        score: null,
      },
      update: {
        comments: details,
        score: null,
      },
    });

    await logBusiness(
      actorUserId,
      decidedByName,
      `${decision === 'accepted' ? 'Xac nhan hop le' : 'Yeu cau nhap lai'} diem cho ${targetMember.name}`,
      'Councils',
    );

    return {
      memberId: targetMember.id,
      decision,
      note: note?.trim() ?? '',
      decidedByName,
    };
  },

  async getScoreSummary(councilId: string, userId: string, userRole: string) {
    const roleFilter = userRole === 'council_member'
      ? { members: { some: { userId, is_deleted: false } } }
      : userRole === 'project_owner'
        ? { project: { ownerId: userId } }
        : {};
    const council = await prisma.council.findFirst({
      where: {
        OR: [{ id: councilId }, { decisionCode: councilId }],
        is_deleted: false,
        ...roleFilter,
      },
      select: { id: true },
    });
    if (!council) {
      throw new Error('Hoi dong khong ton tai hoac ban khong co quyen xem bang tong hop diem.');
    }

    const [members, reviews] = await Promise.all([
      prisma.councilMembership.findMany({
        where: { councilId: council.id, is_deleted: false },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.councilReview.findMany({
        where: { councilId: council.id },
        orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const parseDecision = (raw: string | null) => {
      if (!raw) return { decision: null as 'accepted' | 'rework' | null, note: '', decidedByName: '', decidedAt: null as string | null };
      try {
        const parsed = JSON.parse(raw) as {
          decision?: 'accepted' | 'rework';
          note?: string;
          decidedByName?: string;
          decidedAt?: string;
        };
        if (parsed.decision !== 'accepted' && parsed.decision !== 'rework') {
          return { decision: null, note: '', decidedByName: '', decidedAt: null };
        }
        return {
          decision: parsed.decision,
          note: parsed.note ?? '',
          decidedByName: parsed.decidedByName ?? '',
          decidedAt: parsed.decidedAt ?? null,
        };
      } catch {
        return { decision: null, note: '', decidedByName: '', decidedAt: null };
      }
    };

    const latestByMember = new Map<string, { scoreRow: (typeof reviews)[number] | null; decisionRow: (typeof reviews)[number] | null }>();
    for (const row of reviews) {
      const current = latestByMember.get(row.memberId) ?? { scoreRow: null, decisionRow: null };
      if (row.type === 'decision') {
        current.decisionRow = row;
      } else if (row.type === 'score' || row.type === 'review') {
        current.scoreRow = row;
      }
      latestByMember.set(row.memberId, current);
    }

    const items = members.map((member) => {
      const scoreRequired = isScoreEligibleRole(member.role);
      const latest = latestByMember.get(member.id) ?? { scoreRow: null, decisionRow: null };
      const { scoreRow, decisionRow } = latest;
      const parsedDecision = parseDecision(decisionRow?.comments ?? null);
      const numericScore = scoreRequired && scoreRow?.score !== null && scoreRow?.score !== undefined
        ? Number(scoreRow.score)
        : null;

      return {
        memberId: member.id,
        memberName: member.name ?? 'Unknown',
        role: member.role ?? 'uy_vien',
        score: numericScore,
        comments: scoreRequired ? (scoreRow?.comments ?? null) : null,
        isSubmitted: scoreRequired ? numericScore !== null : false,
        submittedAt: scoreRequired ? (scoreRow?.updatedAt ?? scoreRow?.createdAt ?? null) : null,
        submittedType: scoreRequired ? (scoreRow?.type ?? null) : null,
        decisionStatus: scoreRequired ? parsedDecision.decision : null,
        decisionNote: scoreRequired ? parsedDecision.note : '',
        decisionBy: scoreRequired ? parsedDecision.decidedByName : '',
        decisionAt: scoreRequired ? (parsedDecision.decidedAt ?? (decisionRow?.updatedAt?.toISOString() ?? null)) : null,
      };
    });

    const scored = items.filter((item) => item.score !== null);
    const average = scored.length
      ? scored.reduce((sum, item) => sum + Number(item.score ?? 0), 0) / scored.length
      : 0;

    return {
      items,
      averageScore: Number(average.toFixed(2)),
      submittedCount: scored.length,
      totalMembers: members.length,
    };
  },
};
