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
  members:   z.array(MemberSchema).min(1, 'Hội đồng phải có ít nhất 1 thành viên'),
});

export const AddMemberSchema = MemberSchema;

export const CheckConflictSchema = z.object({
  memberEmail: z.string().email(),
  projectId:   z.string(),
});

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

const generateTemporaryPassword = () => `NCKH@${Math.random().toString(36).slice(-6)}A1`;

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

const ensureCouncilUserAccount = async (member: MemberInput) => {
  const byId = member.userId
    ? await prisma.user.findFirst({ where: { id: member.userId, is_deleted: false } })
    : null;
  const existing = byId ?? await prisma.user.findFirst({ where: { email: member.email, is_deleted: false } });

  if (existing) {
    if (existing.role === 'council_member') {
      const targetRole = mapMemberRoleToCouncilRole(member.role);
      if (existing.councilRole !== targetRole) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { councilRole: targetRole as never },
        });
      }
    }

    return {
      userId: existing.id,
      loginEmail: existing.email,
      temporaryPassword: undefined as string | undefined,
      isNewAccount: false,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
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

const normalizeText = (raw: string) =>
  raw
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

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

/**
 * Parses raw text to detect council member information based on regex.
 * This is the core parsing logic and likely needs adjustment based on real-world file formats.
 */
const detectCouncilMembers = (text: string): ParsedMember[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 10);
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
    const email = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = line.match(/(?:\d{10,11}\b)/)?.[0];

    const roleText = line.match(/(?:vai trò|chức vụ|vi trí)\s*[:\-]?\s*([^\n,]+)/i)?.[1]?.trim().toLowerCase();
    const role = roleText ? Object.keys(roleMap).find(k => roleText.includes(k)) : undefined;

    const nameText =
      line.match(/(?:họ và tên|họ tên)\s*[:\-]?\s*([^\n,]+)/i)?.[1] ??
      line.split(/[,;]/)[0]; // Fallback: assume name is the first part of the line

    const name = nameText?.replace(/(?:GS\.TS|PGS\.TS|TS|ThS)\.?/ig, '').trim();
    const title = nameText?.match(/(GS\.TS|PGS\.TS|TS|ThS)\.?/i)?.[0];

    const institution = line.match(/(?:đơn vị|cơ quan)\s*[:\-]?\s*([^\n,]+)/i)?.[1]?.trim();

    const points = [name, email, role, institution].filter(Boolean).length;
    const confidence = Math.round((points / 4) * 100);

    if (confidence > 25) {
      detectedMembers.push({
        name,
        email,
        phone,
        title,
        institution,
        role: role ? roleMap[role] : undefined,
        confidence,
        rawLine: line.slice(0, 200),
      });
    }
  }

  return detectedMembers;
};


// ─── Council Service ──────────────────────────────────────────────────────────
export const CouncilService = {
  /** POST /api/councils/parse-members */
  async parseMembersFromFile(filePath: string, originalName: string): Promise<ParsedMember[]> {
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

    // Clean up uploaded file
    await fs.unlink(filePath);

    return members;
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
        reviews: true,
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
    if (!hasChairman) throw new Error('Hội đồng phải có Chủ tịch.');

    const decisionCode = await nextCouncilCode();

    const preparedMembers = await Promise.all(
      data.members.map(async (m) => {
        const account = await ensureCouncilUserAccount(m);
        const isOwner = m.email === project.owner.email;
        const isMember = project.members.some(pm => pm.user.email === m.email && !pm.is_deleted);
        return {
          ...m,
          userId: account.userId,
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
          create: preparedMembers.map(({ loginEmail, temporaryPassword, isNewAccount, ...member }) => member),
        },
      },
      include: { members: true, project: { select: { code: true, title: true } } },
    });

    // Send invitations with account credentials for newly-created members.
    await Promise.all(
      preparedMembers.map(m =>
        sendCouncilInvitation(m.email, m.name, project.title, decisionCode, {
          loginEmail: m.loginEmail,
          temporaryPassword: m.temporaryPassword,
          isNewAccount: m.isNewAccount,
        })
      )
    );

    await logBusiness(actorId, actorName,
      `Thành lập Hội đồng ${decisionCode} cho đề tài ${project.code}`,
      'Councils'
    );

    return council;
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

    const account = await ensureCouncilUserAccount(member);
    const isOwner = member.email === council.project.owner.email;
    const isMember = council.project.members.some(pm => pm.user.email === member.email && !pm.is_deleted);

    const added = await prisma.councilMembership.create({
      data: {
        councilId,
        ...member,
        userId: account.userId,
        hasConflict: isOwner || isMember,
      },
    });

    await sendCouncilInvitation(member.email, member.name, council.project.title, council.decisionCode, {
      loginEmail: account.loginEmail,
      temporaryPassword: account.temporaryPassword,
      isNewAccount: account.isNewAccount,
    });

    await logBusiness(actorId, actorName, `Thêm thành viên ${member.name} vào HĐ ${council.decisionCode}`, 'Councils');
    return added;
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

    await Promise.all(
      council.members.map((m) =>
        sendCouncilInvitation(m.email, m.name, council.project.title, council.decisionCode, {
          loginEmail: m.user?.email ?? m.email,
          isNewAccount: false,
        })
      )
    );

    await logBusiness(actorId, actorName, `Gửi lại thư mời Hội đồng ${council.decisionCode}`, 'Councils');
    return { sent: council.members.length, councilCode: council.decisionCode };
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
  async complete(id: string, actorId: string, actorName: string) {
    const council = await prisma.council.findFirst({ where: { id, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

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
  async submitReview(councilId: string, userId: string, score: number, comments: string) {
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const member = await prisma.councilMembership.findFirst({
      where: { councilId, userId, is_deleted: false },
    });
    if (!member) throw new Error('Bạn không phải thành viên hợp lệ của Hội đồng này.');

    return prisma.councilReview.upsert({
      where: { councilId_memberId_type: { councilId, memberId: member.id, type: 'review' } } as never,
      create: { councilId, memberId: member.id, score, comments, type: 'review' },
      update: { score, comments },
    });
  },

  /** POST /api/councils/:id/minutes */
  async recordMinutes(councilId: string, content: string, fileUrl: string | undefined, recordedBy: string) {
    return prisma.councilMinutes.upsert({
      where:  { councilId },
      create: { councilId, content, fileUrl, recordedBy },
      update: { content, fileUrl },
    });
  },

  /** POST /api/councils/:id/score */
  async submitScore(councilId: string, userId: string, score: number, comments: string) {
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const member = await prisma.councilMembership.findFirst({
      where: { councilId, userId, is_deleted: false },
    });
    if (!member) throw new Error('Bạn không phải thành viên hợp lệ của Hội đồng này.');

    return prisma.councilReview.upsert({
      where: { councilId_memberId_type: { councilId, memberId: member.id, type: 'score' } } as never,
      create: { councilId, memberId: member.id, score, comments, type: 'score' },
      update: { score, comments },
    });
  },

  async getScoreSummary(councilId: string) {
    const members = await prisma.councilMembership.findMany({ where: { councilId, is_deleted: false } });
    const memberMap = new Map(members.map(m => [m.id, m]));

    const reviews = await prisma.councilReview.findMany({
      where: { councilId },
      orderBy: { createdAt: 'asc' },
    });

    const items = reviews
      .filter(r => memberMap.has(r.memberId))
      .map((r) => {
        const m = memberMap.get(r.memberId)!;
        return {
          memberId: r.memberId,
          memberName: m.name ?? 'Unknown',
          role: m.role ?? 'uy_vien',
          type: r.type,
          score: r.score ? Number(r.score) : null,
          comments: r.comments,
          submittedAt: r.createdAt,
        };
      });

    const scored = items.filter(i => typeof i.score === 'number' && i.score !== null);
    const avg = scored.length ? scored.reduce((s, i) => s + (i.score ?? 0), 0) / scored.length : 0;
    return { items, averageScore: Number(avg.toFixed(2)) };
  },
};
