import { Request, Response } from 'express';
import { CouncilService, CreateCouncilSchema, AddMemberSchema, CheckConflictSchema } from './council.service';
import * as R from '../../utils/apiResponse';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'councils')),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
export const uploadDecision = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadMemberFile = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export const CouncilController = {
  /** POST /api/councils/parse-members */
  async parseMembersFromFile(req: Request, res: Response) {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        return R.badRequest(res, 'Vui lòng chọn file danh sách thành viên.');
      }
      const members = await CouncilService.parseMembersFromFile(file.path, file.originalname);
      R.ok(res, members, 'Đã nhận diện các thành viên từ file.');
    } catch (err) {
      R.badRequest(res, (err as Error).message);
    }
  },

  /** GET /api/councils */
  async getAll(req: Request, res: Response) {
    try {
      const { status, search, page, limit } = req.query;
      const result = await CouncilService.getAll({
        status: status as string,
        search: search as string,
        page:   page  ? parseInt(page as string) : undefined,
        limit:  limit ? parseInt(limit as string) : undefined,
      }, req.user!.userId, req.user!.role);
      R.ok(res, result.councils, undefined, result.meta);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  /** GET /api/councils/:id */
  async getById(req: Request, res: Response) {
    try {
      const council = await CouncilService.getById(req.params.id, req.user!.userId, req.user!.role);
      R.ok(res, council);
    } catch (err) { R.notFound(res, (err as Error).message); }
  },

  /** GET /api/council-member/councils */
  async getMine(req: Request, res: Response) {
    try {
      const councils = await CouncilService.getByMember(req.user!.userId);
      R.ok(res, councils);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  /** POST /api/councils */
  async create(req: Request, res: Response) {
    try {
      const body = CreateCouncilSchema.parse(req.body);
      const council = await CouncilService.create(body, req.user!.userId, req.user!.name);
      R.created(res, council, 'Thành lập Hội đồng thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/councils/:id/members */
  async addMember(req: Request, res: Response) {
    try {
      const member = AddMemberSchema.parse(req.body);
      const result = await CouncilService.addMember(req.params.id, member, req.user!.userId, req.user!.name);
      R.created(res, result, 'Thêm thành viên thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/councils/:id/decision */
  async uploadDecision(req: Request, res: Response) {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) { R.badRequest(res, 'Vui lòng chọn file quyết định.'); return; }

      const webPath = `/uploads/councils/${file.filename}`;
      const result = await CouncilService.uploadDecision(req.params.id, webPath, req.user!.userId, req.user!.name);
      R.ok(res, result, 'Đã tải lên quyết định thành lập Hội đồng.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/councils/:id/decision-file */
  async downloadDecision(req: Request, res: Response) {
    try {
      const payload = await CouncilService.getDecisionDownload(req.params.id, req.user!.userId, req.user!.role);
      if (payload.kind === 'file') {
        res.download(payload.absolutePath, payload.fileName);
        return;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
      res.send(payload.fileBuffer);
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/councils/:id/minutes-file */
  async downloadMinutes(req: Request, res: Response) {
    try {
      const payload = await CouncilService.getMinutesDownload(req.params.id, req.user!.userId, req.user!.role);
      if (payload.kind === 'file') {
        res.download(payload.absolutePath, payload.fileName);
        return;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
      res.send(payload.fileBuffer);
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/councils/:id/resend-invitations */
  async resendInvitations(req: Request, res: Response) {
    try {
      const result = await CouncilService.resendInvitations(req.params.id, req.user!.userId, req.user!.name);
      R.ok(res, result, `Đã gửi lại email mời cho ${result.sent} thành viên.`);
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** DELETE /api/councils/:id/members/:memberId */
  async removeMember(req: Request, res: Response) {
    try {
      await CouncilService.removeMember(req.params.id, req.params.memberId, req.user!.userId, req.user!.name);
      R.ok(res, null, 'Đã xóa thành viên khỏi Hội đồng.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/councils/check-conflict */
  async checkConflict(req: Request, res: Response) {
    try {
      const { memberEmail, projectId } = CheckConflictSchema.parse(req.body);
      const result = await CouncilService.checkConflict(memberEmail, projectId);
      R.ok(res, result);
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** PUT /api/councils/:id/approve */
  async approve(req: Request, res: Response) {
    try {
      const result = await CouncilService.approve(req.params.id, req.user!.userId, req.user!.name);
      R.ok(res, result, 'Hội đồng đã được phê duyệt và có hiệu lực.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** PUT /api/councils/:id/complete */
  async complete(req: Request, res: Response) {
    try {
      const result = await CouncilService.complete(
        req.params.id,
        req.user!.userId,
        req.user!.name,
        req.user!.role,
      );
      R.ok(res, result, 'Hoàn thành nghiệm thu. Đề tài đã được nghiệm thu thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/councils/:id/review */
  async submitReview(req: Request, res: Response) {
    try {
      const result = await CouncilService.submitReview(req.params.id, req.user!.userId, req.body);
      R.ok(res, result, 'Đã gửi nhận xét phản biện.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/councils/:id/minutes */
  async recordMinutes(req: Request, res: Response) {
    try {
      const { content } = req.body;
      const file = (req as Request & { file?: Express.Multer.File }).file;
      const fileUrl = file ? `/uploads/councils/${file.filename}` : undefined;
      const result = await CouncilService.recordMinutes(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.user!.name,
        { content, fileUrl },
      );
      R.ok(res, result, 'Đã ghi biên bản họp Hội đồng.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/councils/:id/score */
  async submitScore(req: Request, res: Response) {
    try {
      const result = await CouncilService.submitScore(req.params.id, req.user!.userId, req.body);
      R.ok(res, result, 'Đã chấm điểm.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  async getScoreSummary(req: Request, res: Response) {
    try {
      const data = await CouncilService.getScoreSummary(req.params.id, req.user!.userId, req.user!.role);
      R.ok(res, data);
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  async submitScoreDecision(req: Request, res: Response) {
    try {
      const result = await CouncilService.submitScoreDecision(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body,
      );
      R.ok(res, result, 'Da cap nhat quyet dinh cua thu ky.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },
};
