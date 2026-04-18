import { Request, Response } from 'express';
import { ContractService, CreateContractSchema, UpdateContractStatusSchema } from './contract.service';
import * as R from '../../utils/apiResponse';

export const ContractController = {
  /** POST /api/contracts/proposals/parse */
  async parseProposal(req: Request, res: Response) {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) { R.badRequest(res, 'Vui lòng chọn file đề xuất để nhận diện.'); return; }

      const parsed = await ContractService.parseProposal(file.path, file.originalname);
      R.ok(res, parsed, 'Nhận diện đề xuất thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/contracts */
  async getAll(req: Request, res: Response) {
    try {
      const { status, search, page, limit } = req.query;
      const result = await ContractService.getAll({
        status: status as string,
        search: search as string,
        page:   page   ? parseInt(page as string) : undefined,
        limit:  limit  ? parseInt(limit as string) : undefined,
      }, req.user!.userId, req.user!.role);
      R.ok(res, result.contracts, undefined, result.meta);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  /** GET /api/contracts/:id */
  async getById(req: Request, res: Response) {
    try {
      const c = await ContractService.getById(req.params.id, req.user!.userId, req.user!.role);
      R.ok(res, c);
    } catch (err) { R.notFound(res, (err as Error).message); }
  },

  /** GET /api/contracts/:id/pdf */
  async downloadPdf(req: Request, res: Response) {
    try {
      const payload = await ContractService.getPdfDownload(req.params.id, req.user!.userId, req.user!.role);

      if (payload.kind === 'file') {
        res.download(payload.absolutePath, payload.fileName);
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
      res.send(payload.fileBuffer);
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/contracts/:id/export-excel */
  async exportExcel(req: Request, res: Response) {
    try {
      const payload = await ContractService.getExcelExport(req.params.id, req.user!.userId, req.user!.role);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
      await payload.workbook.xlsx.write(res);
      res.end();
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** GET /api/project-owner/contracts */
  async getMyContracts(req: Request, res: Response) {
    try {
      const contracts = await ContractService.getByOwner(req.user!.userId);
      R.ok(res, contracts);
    } catch (err) { R.serverError(res, (err as Error).message); }
  },

  /** POST /api/contracts */
  async create(req: Request, res: Response) {
    try {
      const body = CreateContractSchema.parse(req.body);
      const c = await ContractService.create(body, req.user!.userId, req.user!.name);
      R.created(res, c, 'Tạo hợp đồng thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/contracts/:id/sign */
  async sign(req: Request, res: Response) {
    try {
      const c = await ContractService.sign(req.params.id, req.user!.userId, req.user!.name);
      R.ok(res, c, 'Ký hợp đồng thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** PUT /api/contracts/:id/status */
  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = UpdateContractStatusSchema.parse(req.body);
      const c = await ContractService.updateStatus(req.params.id, status, req.user!.userId, req.user!.name);
      R.ok(res, c, 'Cập nhật trạng thái hợp đồng thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** POST /api/contracts/:id/upload */
  async uploadPdf(req: Request, res: Response) {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) { R.badRequest(res, 'Vui lòng chọn file để tải lên.'); return; }
      const webPath = `/uploads/contracts/${file.filename}`;
      const c = await ContractService.uploadPdf(req.params.id, webPath, req.user!.userId, req.user!.name);
      R.ok(res, c, 'Tải lên PDF hợp đồng thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },

  /** DELETE /api/contracts/:id */
  async delete(req: Request, res: Response) {
    try {
      await ContractService.delete(req.params.id, req.user!.userId, req.user!.name);
      R.ok(res, null, 'Đã xóa hợp đồng.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  },
};
