import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

/** 200 OK */
export const ok = <T>(res: Response, data: T, message?: string, meta?: ApiResponse['meta']): Response =>
  res.status(200).json({ success: true, data, message, meta });

/** 201 Created */
export const created = <T>(res: Response, data: T, message?: string): Response =>
  res.status(201).json({ success: true, data, message });

/** 204 No Content */
export const noContent = (res: Response): Response =>
  res.status(204).send();

/** 400 Bad Request */
export const badRequest = (res: Response, error: string): Response =>
  res.status(400).json({ success: false, error });

/** 401 Unauthorized */
export const unauthorized = (res: Response, error = 'Unauthorized'): Response =>
  res.status(401).json({ success: false, error });

/** 403 Forbidden */
export const forbidden = (res: Response, error = 'Forbidden: insufficient permissions'): Response =>
  res.status(403).json({ success: false, error });

/** 404 Not Found */
export const notFound = (res: Response, error = 'Resource not found'): Response =>
  res.status(404).json({ success: false, error });

/** 409 Conflict */
export const conflict = (res: Response, error: string): Response =>
  res.status(409).json({ success: false, error });

/** 422 Unprocessable Entity */
export const unprocessable = (res: Response, error: string): Response =>
  res.status(422).json({ success: false, error });

/** 500 Internal Server Error */
export const serverError = (res: Response, error = 'Internal server error'): Response =>
  res.status(500).json({ success: false, error });
