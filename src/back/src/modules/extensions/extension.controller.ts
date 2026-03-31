import { Request, Response } from 'express';
import { ExtensionService, CreateExtensionSchema, DecisionSchema } from './extension.service';
import * as R from '../../utils/apiResponse';

export const ExtensionController = {
  async getAll(req: Request, res: Response) {
    try {
      const { status, search, page, limit } = req.query;
      const result = await ExtensionService.getAll({
        status: status as string, search: search as string,
        page:   page  ? parseInt(page as string) : undefined,
        limit:  limit ? parseInt(limit as string) : undefined,
      }, req.user!.userId, req.user!.role);
      R.ok(res, result.extensions, undefined, result.meta);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  async getById(req: Request, res: Response) {
    try {
      R.ok(res, await ExtensionService.getById(req.params.id, req.user!.userId, req.user!.role));
    } catch (err) { R.notFound(res, (err as Error).message); }
  },

  async create(req: Request, res: Response) {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      const body = CreateExtensionSchema.parse({
        ...req.body,
        extensionDays: Number(req.body.extensionDays),
        supporting_document: file?.path,
      });
      const ext = await ExtensionService.create(body, req.user!.name, req.user!.userId);
      R.created(res, ext, 'Đã nộp yêu cầu gia hạn.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  async decide(req: Request, res: Response) {
    try {
      const { decision, decisionNote } = DecisionSchema.parse(req.body);
      const result = await ExtensionService.decide(
        req.params.id, decision, decisionNote, req.user!.userId, req.user!.name
      );
      R.ok(res, result, decision === 'da_phe_duyet' ? 'Đã phê duyệt gia hạn.' : 'Đã từ chối gia hạn.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  async approve(req: Request, res: Response) {
    try {
      const result = await ExtensionService.decide(
        req.params.id, 'da_phe_duyet', req.body?.decisionNote, req.user!.userId, req.user!.name
      );
      R.ok(res, result, 'Đã phê duyệt gia hạn.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },
};
