import { z } from 'zod';
import { ProjectRepository } from './project.repository';
import { nextProjectCode } from '../../utils/codeGenerator';
import { logBusiness } from '../../middleware/requestLogger';
import { ProjectStatus, Prisma } from '@prisma/client';
import path from 'path';
import { resolveExistingUploadFile, sanitizeDownloadName } from '../../utils/uploadFile';

// ─── Validation Schemas ───────────────────────────────────────────────────────
export const CreateProjectSchema = z.object({
  title:         z.string().min(5, 'Tiêu đề phải tối thiểu 5 ký tự'),
  ownerId:       z.string().cuid('ownerId không hợp lệ'),
  ownerTitle:    z.string().optional(),
  department:    z.string().min(1),
  field:         z.string().min(1),
  startDate:     z.string().datetime(),
  endDate:       z.string().datetime(),
  durationMonths: z.number().int().positive(),
  budget:        z.number().positive(),
  advancedAmount: z.number().min(0).optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['dang_thuc_hien', 'tre_han', 'cho_nghiem_thu', 'da_nghiem_thu', 'huy_bo']),
  reason: z.string().optional(),
});

export const SubmitProductSchema = z.object({
  type: z.enum(['midterm_report', 'final_report', 'paper', 'software', 'other']),
  content: z.string().optional(),
});

// State machine — allowed transitions
const ALLOWED_TRANSITIONS: Record<string, ProjectStatus[]> = {
  dang_thuc_hien: ['tre_han', 'cho_nghiem_thu', 'huy_bo'],
  tre_han:        ['dang_thuc_hien', 'huy_bo'],
  cho_nghiem_thu: ['da_nghiem_thu', 'dang_thuc_hien'],
  da_nghiem_thu:  [],
  huy_bo:         [],
};

// ─── Project Service ──────────────────────────────────────────────────────────
export const ProjectService = {
  /** GET /api/projects — filtered list with soft-delete guard */
  async getAll(
    filters: { status?: string; field?: string; search?: string; page?: number; limit?: number },
    userId: string,
    userRole: string
  ) {
    const { status, field, search, page = 1, limit = 20 } = filters;

    const where: Prisma.ProjectWhereInput = { is_deleted: false };
    if (userRole === 'project_owner') where.ownerId = userId;
    if (status) where.status = status as ProjectStatus;
    if (field)  where.field  = field;
    if (search) {
      where.OR = [
        { title:       { contains: search } },
        { code:        { contains: search } },
        { department:  { contains: search } },
      ];
    }

    const total = await ProjectRepository.count(where);
    const projects = await ProjectRepository.findManyWithPagination(where, (page - 1) * limit, limit);

    return { projects, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  /** GET /api/projects/:id */
  async getById(id: string, userId: string, userRole: string) {
    const project = await ProjectRepository.findById(id);
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (userRole === 'project_owner' && project.ownerId !== userId) {
      throw new Error('Bạn không có quyền xem đề tài này.');
    }
    return project;
  },

  /** GET /api/projects/:id/reports/:reportId/download */
  async getReportDownload(id: string, reportId: string, userId: string, userRole: string) {
    const project = await ProjectRepository.findById(id);
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (userRole === 'project_owner' && project.ownerId !== userId) {
      throw new Error('Bạn không có quyền tải tệp của đề tài này.');
    }

    const report = project.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Không tìm thấy báo cáo tương ứng.');

    const absolutePath = await resolveExistingUploadFile(report.fileUrl ?? undefined);
    if (!absolutePath) {
      throw new Error('Tệp báo cáo không tồn tại trên máy chủ hoặc chưa được tải lên.');
    }

    const ext = path.extname(absolutePath) || '.dat';
    const safeCode = sanitizeDownloadName(project.code, `project_${project.id}`);
    const fileName = `${safeCode}_${report.type}${ext}`;

    return { absolutePath, fileName };
  },

  /** GET /api/project-owner/projects — only my projects */
  async getByOwner(ownerId: string) {
    return ProjectRepository.findByOwner(ownerId);
  },

  /** POST /api/projects */
  async create(data: z.infer<typeof CreateProjectSchema>, actorId: string, actorName: string) {
    const code = await nextProjectCode();
    const project = await ProjectRepository.create({
      code,
      title:          data.title,
      owner:          { connect: { id: data.ownerId } },
      ownerTitle:     data.ownerTitle,
      department:     data.department,
      field:          data.field,
      startDate:      new Date(data.startDate),
      endDate:        new Date(data.endDate),
      durationMonths: data.durationMonths,
      budget:         data.budget,
      advancedAmount: data.advancedAmount ?? 0,
    });
    await logBusiness(actorId, actorName, `Tạo đề tài ${code}`, 'Projects');
    return project;
  },

  /** PUT /api/projects/:id/status — enforces state machine */
  async updateStatus(id: string, newStatus: ProjectStatus, actorId: string, actorName: string) {
    const project = await ProjectRepository.findById(id);
    if (!project) throw new Error('Đề tài không tồn tại.');

    const allowed = ALLOWED_TRANSITIONS[project.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Không thể chuyển trạng thái từ "${project.status}" → "${newStatus}".`);
    }

    // Nghiệp vụ: Không được nghiệm thu nếu chưa nộp kết quả (`final` report)
    if (['cho_nghiem_thu', 'da_nghiem_thu'].includes(newStatus)) {
      const hasFinalReport = project.reports.some(r => r.type === 'final');
      if (!hasFinalReport) {
        throw new Error('Không thể chuyển trạng thái nghiệm thu: Đề tài chưa nộp Báo cáo tổng kết (Kết quả nghiệm thu).');
      }
    }

    const updated = await ProjectRepository.update(id, { status: newStatus });

    await logBusiness(actorId, actorName,
      `Cập nhật trạng thái đề tài ${project.code}: ${project.status} → ${newStatus}`,
      'Projects'
    );

    return updated;
  },

  /** PUT /api/projects/:id — update basic info */
  async update(id: string, data: Partial<z.infer<typeof CreateProjectSchema>>, actorId: string, actorName: string) {
    const project = await ProjectRepository.findById(id);
    if (!project) throw new Error('Đề tài không tồn tại.');

    const updated = await ProjectRepository.update(id, {
      ...(data.title         && { title: data.title }),
      ...(data.department    && { department: data.department }),
      ...(data.field         && { field: data.field }),
      ...(data.endDate       && { endDate: new Date(data.endDate) }),
      ...(data.budget        !== undefined && { budget: data.budget }),
      ...(data.advancedAmount !== undefined && { advancedAmount: data.advancedAmount }),
    });

    await logBusiness(actorId, actorName, `Cập nhật đề tài ${project.code}`, 'Projects');
    return updated;
  },

  /** DELETE /api/projects/:id — soft delete using is_deleted */
  async delete(id: string, actorId: string, actorName: string) {
    const project = await ProjectRepository.findById(id);
    if (!project) throw new Error('Đề tài không tồn tại.');

    await ProjectRepository.softDelete(id);
    await logBusiness(actorId, actorName, 'DELETE', 'Projects', JSON.stringify({ old_values: project }));
  },

  /** POST /api/projects/:id/midterm-report */
  async submitMidtermReport(projectId: string, content: string, fileUrl: string | undefined, submittedBy: string, actorId: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (project.ownerId !== actorId) throw new Error('Bạn chỉ có thể nộp báo cáo cho đề tài của chính mình.');

    return ProjectRepository.createReport({ projectId, type: 'midterm', content, fileUrl, submittedBy });
  },

  /** POST /api/projects/:id/final-submission */
  async submitFinalReport(projectId: string, content: string, fileUrl: string | undefined, submittedBy: string, actorId: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (project.ownerId !== actorId) throw new Error('Bạn chỉ có thể nộp hồ sơ cuối cho đề tài của chính mình.');

    const report = await ProjectRepository.createReport({ projectId, type: 'final', content, fileUrl, submittedBy });
    // Auto-transition project to cho_nghiem_thu now that final report exists
    await ProjectRepository.update(projectId, { status: 'cho_nghiem_thu' });
    
    await logBusiness(actorId, submittedBy, `Nộp hồ sơ cuối cho dự án ${projectId}`, 'Projects');
    return report;
  },

  /** POST /api/projects/:id/products */
  async submitProduct(
    projectId: string,
    type: z.infer<typeof SubmitProductSchema>['type'],
    content: string | undefined,
    fileUrl: string | undefined,
    submittedBy: string,
    actorId: string
  ) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Đề tài không tồn tại.');
    if (project.ownerId !== actorId) throw new Error('Bạn chỉ có thể nộp sản phẩm cho đề tài của chính mình.');

    // Map unified product types to current schema enum (midterm|final)
    const reportType = type === 'midterm_report' ? 'midterm' : 'final';
    const report = await ProjectRepository.createReport({
      projectId,
      type: reportType,
      content: content ? `[${type}] ${content}` : `[${type}]`,
      fileUrl,
      submittedBy,
    });

    if (type === 'midterm_report') {
      // Keep project in execution phase
      await ProjectRepository.update(projectId, { status: 'dang_thuc_hien' });
    } else {
      // Final artifacts trigger acceptance phase
      await ProjectRepository.update(projectId, { status: 'cho_nghiem_thu' });
    }

    await logBusiness(actorId, submittedBy, `Nộp sản phẩm (${type}) cho dự án ${projectId}`, 'Projects');
    return report;
  },

  /** GET /api/research-staff/dashboard stats */
  async getDashboardStats() {
    const total = await ProjectRepository.count({ is_deleted: false });
    const active = await ProjectRepository.count({ status: 'dang_thuc_hien', is_deleted: false });
    const overdue = await ProjectRepository.count({ status: 'tre_han', is_deleted: false });
    const pendingAcceptance = await ProjectRepository.count({ status: 'cho_nghiem_thu', is_deleted: false });
    const completed = await ProjectRepository.count({ status: 'da_nghiem_thu', is_deleted: false });
    const cancelled = await ProjectRepository.count({ status: 'huy_bo', is_deleted: false });

    const budgetAgg = await ProjectRepository.aggregateBudget({ is_deleted: false });

    return {
      total, active, overdue, pendingAcceptance, completed, cancelled,
      totalBudget:    Number(budgetAgg._sum.budget ?? 0),
      disbursedBudget: Number(budgetAgg._sum.advancedAmount ?? 0),
    };
  },
};
