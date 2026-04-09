import { Request, Response } from 'express';
import { SettlementService, SupplementRequestSchema } from './settlement.service';
import * as R from '../../utils/apiResponse';
import { z } from 'zod';

const CreateSettlementFormSchema = z.object({
  projectId: z.string().cuid(),
  content: z.string().min(1),
  totalAmount: z.coerce.number().positive(),
  category: z.string().min(1).optional(),
});

export const SettlementController = {
  /** GET /api/settlements */
  async getAll(req: Request, res: Response) {
    try {
      const { status, search, page, limit } = req.query;
      const result = await SettlementService.getAll({
        status: status as string, search: search as string,
        page:   page  ? parseInt(page as string) : undefined,
        limit:  limit ? parseInt(limit as string) : undefined,
      }, req.user!.userId, req.user!.role);
      R.ok(res, result.settlements, undefined, result.meta);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  /** GET /api/settlements/:id */
  async getById(req: Request, res: Response) {
    try {
      const s = await SettlementService.getById(req.params.id, req.user!.userId, req.user!.role);
      R.ok(res, s);
    } catch (err) { R.notFound(res, (err as Error).message); }
  },

  /** POST /api/settlements */
  async create(req: Request, res: Response) {
    try {
      const body = CreateSettlementFormSchema.parse(req.body);
      const uploadedFile = (req as Request & { file?: Express.Multer.File }).file;
      const settlement = await SettlementService.create({
        projectId: body.projectId,
        content: body.content,
        totalAmount: body.totalAmount,
        budgetItems: [{
          category: body.category ?? 'Thiết bị nghiên cứu',
          planned: body.totalAmount,
          spent: body.totalAmount,
          evidenceFile: uploadedFile?.path,
          status: 'khop',
        }],
      }, req.user!.name, req.user!.userId);
      R.created(res, settlement, 'Nộp hồ sơ quyết toán thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/settlements/:id/supplement-request */
  async requestSupplement(req: Request, res: Response) {
    try {
      const { reasons } = SupplementRequestSchema.parse(req.body);
      const result = await SettlementService.requestSupplement(
        req.params.id, reasons, req.user!.userId, req.user!.name
      );
      R.ok(res, result, 'Đã gửi yêu cầu bổ sung và thông báo email đến chủ nhiệm.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** PUT /api/settlements/:id/status */
  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const result = await SettlementService.updateStatus(req.params.id, status, req.user!.userId, req.user!.name);
      R.ok(res, result, 'Cập nhật trạng thái quyết toán thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/settlements/:id/export */
  async export(req: Request, res: Response) {
    try {
      const format = (req.query.format as 'excel' | 'word') ?? 'excel';
      const result = await SettlementService.exportSettlement(req.params.id, format, req.user!.userId, req.user!.role);

      if (format === 'excel' && 'buffer' in result) {
        res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.send(result.buffer);
      } else {
        R.ok(res, result, `Xuất file ${format} thành công (mock).`);
      }
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** PUT /api/settlements/:id/approve */
  async approve(req: Request, res: Response) {
    try {
      const result = await SettlementService.approve(req.params.id, req.user!.userId, req.user!.name);
      R.ok(res, result, 'Phê duyệt thanh lý thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },
};
