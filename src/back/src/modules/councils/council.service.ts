import { z } from 'zod';
import prisma from '../../prisma';
import { nextCouncilCode } from '../../utils/codeGenerator';
import { logBusiness, logDeleteAction } from '../../middleware/requestLogger';
import { sendCouncilInvitation } from '../../utils/emailService';

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

// ─── Council Service ──────────────────────────────────────────────────────────
export const CouncilService = {
  /** GET /api/councils */
  async getAll(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = { is_deleted: false };
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
  async getById(id: string) {
    const council = await prisma.council.findFirst({
      where: { OR: [{ id }, { decisionCode: id }], is_deleted: false },
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

    const council = await prisma.council.create({
      data: {
        decisionCode,
        projectId: data.projectId,
        members: {
          create: data.members.map(m => {
            const isOwner = m.email === project.owner.email;
            const isMember = project.members.some(pm => pm.user.email === m.email && !pm.is_deleted);
            return {
              ...m,
              hasConflict: isOwner || isMember,
            };
          }),
        },
      },
      include: { members: true, project: { select: { code: true, title: true } } },
    });

    // Send invitations (mock)
    await Promise.all(
      data.members.map(m =>
        sendCouncilInvitation(m.email, m.name, project.title, decisionCode)
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
    const council = await prisma.council.findFirst({ where: { id: councilId, is_deleted: false } });
    if (!council) throw new Error('Hội đồng không tồn tại.');

    const added = await prisma.councilMembership.create({
      data: { councilId, ...member },
    });

    await logBusiness(actorId, actorName, `Thêm thành viên ${member.name} vào HĐ ${council.decisionCode}`, 'Councils');
    return added;
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
