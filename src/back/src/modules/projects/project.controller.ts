import { Request, Response } from 'express';
import { ProjectService, CreateProjectSchema, UpdateStatusSchema, SubmitProductSchema } from './project.service';
import { ProjectStatus } from '@prisma/client';
import * as R from '../../utils/apiResponse';

export const ProjectController = {
  /** GET /api/projects */
  async getAll(req: Request, res: Response) {
    try {
      const { status, field, search, page, limit } = req.query;
      const result = await ProjectService.getAll({
        status: status as string,
        field:  field  as string,
        search: search as string,
        page:   page   ? parseInt(page as string) : undefined,
        limit:  limit  ? parseInt(limit as string) : undefined,
      }, req.user!.userId, req.user!.role);
      R.ok(res, result.projects, undefined, result.meta);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  /** GET /api/projects/:id */
  async getById(req: Request, res: Response) {
    try {
      const project = await ProjectService.getById(req.params.id, req.user!.userId, req.user!.role);
      R.ok(res, project);
    } catch (err) { R.notFound(res, (err as Error).message); }
  },

  /** GET /api/projects/:id/reports/:reportId/download */
  async downloadReportFile(req: Request, res: Response) {
    try {
      const payload = await ProjectService.getReportDownload(
        req.params.id,
        req.params.reportId,
        req.user!.userId,
        req.user!.role
      );
      res.download(payload.absolutePath, payload.fileName);
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/project-owner/projects */
  async getMyProjects(req: Request, res: Response) {
    try {
      const projects = await ProjectService.getByOwner(req.user!.userId);
      R.ok(res, projects);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  /** POST /api/projects */
  async create(req: Request, res: Response) {
    try {
      const body = CreateProjectSchema.parse(req.body);
      const project = await ProjectService.create(body, req.user!.userId, req.user!.name);
      R.created(res, project, 'Tạo đề tài thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** PUT /api/projects/:id/status */
  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = UpdateStatusSchema.parse(req.body);
      const project = await ProjectService.updateStatus(
        req.params.id, status as ProjectStatus,
        req.user!.userId, req.user!.name
      );
      R.ok(res, project, 'Cập nhật trạng thái thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** PUT /api/projects/:id */
  async update(req: Request, res: Response) {
    try {
      const project = await ProjectService.update(req.params.id, req.body, req.user!.userId, req.user!.name);
      R.ok(res, project, 'Cập nhật đề tài thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** DELETE /api/projects/:id */
  async delete(req: Request, res: Response) {
    try {
      await ProjectService.delete(req.params.id, req.user!.userId, req.user!.name);
      R.ok(res, null, 'Đã xóa đề tài.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/projects/:id/midterm-report */
  async submitMidtermReport(req: Request, res: Response) {
    try {
      const { content } = req.body;
      const fileUrl = (req as Request & { file?: Express.Multer.File }).file?.path;
      const report = await ProjectService.submitMidtermReport(req.params.id, content, fileUrl, req.user!.name, req.user!.userId);
      R.created(res, report, 'Nộp báo cáo giữa kỳ thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/projects/:id/final-submission */
  async submitFinalReport(req: Request, res: Response) {
    try {
      const { content } = req.body;
      const fileUrl = (req as Request & { file?: Express.Multer.File }).file?.path;
      const report = await ProjectService.submitFinalReport(
        req.params.id, content, fileUrl, req.user!.name, req.user!.userId
      );
      R.created(res, report, 'Nộp hồ sơ cuối thành công. Đề tài chuyển sang trạng thái Chờ nghiệm thu.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/projects/:id/products */
  async submitProduct(req: Request, res: Response) {
    try {
      const body = SubmitProductSchema.parse(req.body);
      const fileUrl = (req as Request & { file?: Express.Multer.File }).file?.path;
      const result = await ProjectService.submitProduct(
        req.params.id,
        body.type,
        body.content,
        fileUrl,
        req.user!.name,
        req.user!.userId
      );
      R.created(res, result, 'Nộp sản phẩm thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/research-staff/dashboard */
  async getDashboard(req: Request, res: Response) {
    try {
      const stats = await ProjectService.getDashboardStats();
      R.ok(res, stats);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },
};
