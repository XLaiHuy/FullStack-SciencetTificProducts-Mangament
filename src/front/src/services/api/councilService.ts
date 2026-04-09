/**
 * src/services/api/councilService.ts
 * Council management via Real API Server
 */
import { axiosClient } from './axiosClient';
import type { Council, CouncilMember } from '../../types';
import { downloadFromApi } from './downloadUtil';
import { normalizeUploadPath } from '../../utils/urlUtil';

/** Normalize backend Council → frontend Council shape */
const mapCouncil = (c: any): Council => ({
  id:           c.id ?? '',
  projectId:    c.project?.id ?? c.projectId ?? '',
  decisionCode: c.decisionCode ?? '',
  projectCode:  c.project?.code ?? c.projectCode ?? '',
  projectTitle: c.project?.title ?? c.projectTitle ?? '',
  createdDate:  c.createdDate ? new Date(c.createdDate).toISOString().split('T')[0] : '',
  status:       c.status ?? 'cho_danh_gia',
  members:      (c.members ?? []).map((m: any) => ({
    id:          m.id,
    name:        m.name ?? '',
    title:       m.title ?? '',
    institution: m.institution ?? m.affiliation ?? '',
    email:       m.email ?? '',
    role:        m.role ?? 'uy_vien',
    hasConflict: m.hasConflict ?? false,
    phone:       m.phone ?? '',
    affiliation: m.affiliation ?? '',
  })),
  decisionPdfUrl: normalizeUploadPath(c.decisionPdfUrl),
  minutesFileUrl: normalizeUploadPath(c.minutes?.fileUrl),
  projectReports: (c.project?.reports ?? []).map((r: any) => ({
    id: r.id,
    type: r.type,
    fileUrl: normalizeUploadPath(r.fileUrl),
    submittedAt: r.submittedAt,
  })),
});

export const councilService = {
  // GET /api/councils
  async getAll(): Promise<Council[]> {
    const res = await axiosClient.get('/councils');
    return (res.data ?? []).map(mapCouncil);
  },

  // GET /api/councils/mine
  async getMine(): Promise<Council[]> {
    const res = await axiosClient.get('/councils/mine');
    return (res.data ?? []).map(mapCouncil);
  },

  // GET /api/councils/{id}
  async getById(id: string): Promise<Council | undefined> {
    const res = await axiosClient.get(`/councils/${id}`);
    return res.data ? mapCouncil(res.data) : undefined;
  },

  // POST /api/councils
  async create(projectCode: string, projectTitle: string, members: CouncilMember[], _actorName: string): Promise<Council> {
    // In our backend design, projectId is used. projectCode from FE is mostly passed as projectId (if so mapped).
    // The backend route takes { projectId, members }
    const res = await axiosClient.post('/councils', {
      projectId: projectCode,
      members: members.map(m => ({
        userId: m.id || undefined, // Map `id` to `userId`
        name: m.name,
        title: m.title,
        institution: m.institution,
        email: m.email,
        phone: m.phone,
        affiliation: m.affiliation,
        role: m.role,
      }))
    });
    return mapCouncil(res.data);
  },

  // PUT /api/councils/{id}/approve or complete
  async updateStatus(id: string, status: Council['status'], _actorName: string): Promise<void> {
    if (status === 'dang_danh_gia') {
      await axiosClient.put(`/councils/${id}/approve`);
    } else if (status === 'da_hoan_thanh') {
      await axiosClient.put(`/councils/${id}/complete`);
    } else {
      // Fallback
    }
  },

  // POST /api/councils/{id}/members
  async addMember(councilId: string | null, member: CouncilMember, _actorName: string): Promise<void> {
    if (councilId) {
      await axiosClient.post(`/councils/${councilId}/members`, {
        userId: member.id || undefined,
        name: member.name,
        title: member.title ?? member.hocHamHocVi,
        institution: member.institution,
        email: member.email,
        phone: member.phone,
        affiliation: member.affiliation,
        role: member.role,
      });
    }
  },

  async removeMember(councilId: string, memberId: string): Promise<void> {
    await axiosClient.delete(`/councils/${councilId}/members/${memberId}`);
  },

  async uploadDecision(councilId: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    await axiosClient.post(`/councils/${councilId}/decision`, form);
  },

  async downloadDecision(councilId: string, fallbackFileName?: string): Promise<void> {
    await downloadFromApi(`/councils/${councilId}/decision-file`, fallbackFileName ?? `decision_${councilId}.pdf`);
  },

  async downloadMinutes(councilId: string, fallbackFileName?: string): Promise<void> {
    await downloadFromApi(`/councils/${councilId}/minutes-file`, fallbackFileName ?? `minutes_${councilId}.pdf`);
  },

  async resendInvitations(councilId: string): Promise<{ sent: number; councilCode: string }> {
    const res = await axiosClient.post(`/councils/${councilId}/resend-invitations`);
    return res.data;
  },

  /** 
   * POST /api/councils/check-conflict
   */
  async checkConflict(member: CouncilMember, projectCode: string): Promise<boolean> {
    const res = await axiosClient.post('/councils/check-conflict', {
      memberEmail: member.email,
      projectId: projectCode,
    });
    return res.data.hasConflict ?? false;
  },

  async submitReview(councilId: string, score: number, comments: string): Promise<void> {
    await axiosClient.post(`/councils/${councilId}/review`, { score, comments });
  },

  async submitScore(councilId: string, score: number, comments: string): Promise<void> {
    await axiosClient.post(`/council/${councilId}/score-reviews`, { score, comments });
  },

  async submitMinutes(councilId: string, content: string, file?: File): Promise<void> {
    const form = new FormData();
    form.append('content', content);
    if (file) form.append('file', file);
    await axiosClient.post(`/councils/${councilId}/minutes`, form);
  },

  async getScoreSummary(councilId: string): Promise<{
    items: Array<{
      memberId: string;
      memberName: string;
      role: string;
      score: number | null;
      comments?: string | null;
      isSubmitted: boolean;
      submittedAt?: string | null;
      submittedType?: string | null;
      decisionStatus?: 'accepted' | 'rework' | null;
      decisionNote?: string;
      decisionBy?: string;
      decisionAt?: string | null;
    }>;
    averageScore: number;
    submittedCount?: number;
    totalMembers?: number;
  }> {
    const res = await axiosClient.get(`/council/${councilId}/score-summary`);
    return res.data;
  },

  async submitScoreDecision(
    councilId: string,
    payload: { memberId: string; decision: 'accepted' | 'rework'; note?: string },
  ): Promise<void> {
    await axiosClient.post(`/council/${councilId}/score-decisions`, payload);
  },

  async approveRevision(revisionId: string): Promise<void> {
    await axiosClient.put(`/revisions/${revisionId}/approve`);
  },
};
