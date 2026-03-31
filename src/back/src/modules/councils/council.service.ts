import { z } from 'zod';
import prisma from '../../prisma';
import { nextCouncilCode } from '../../utils/codeGenerator';
import { logBusiness, logDeleteAction } from '../../middleware/requestLogger';
import { sendCouncilInvitation } from '../../utils/emailService';
import { hashPassword } from '../../utils/password';

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

const mapMemberRoleToCouncilRole = (role: MemberInput['role']) => {
  if (role === 'chu_tich') return 'chairman';
  if (role === 'thu_ky') return 'secretary';
  if (role === 'phan_bien_1' || role === 'phan_bien_2') return 'reviewer';
  return 'member';
};

const generateTemporaryPassword = () => `NCKH@${Math.random().toString(36).slice(-6)}A1`;

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
    },
  });

  return {
    userId: created.id,
    loginEmail: created.email,
    temporaryPassword,
    isNewAccount: true,
  };
};

// ─── Council Service ──────────────────────────────────────────────────────────
export const CouncilService = {
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
    const roleFilter = userRole === 'council_member' ? { members: { some: { userId, is_deleted: false } } } : {};
    const council = await prisma.council.findFirst({
      where: { OR: [{ id }, { decisionCode: id }], is_deleted: false, ...roleFilter },
      include: {
        project: { include: { owner: true } },
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
