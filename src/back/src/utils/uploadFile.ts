import fs from 'fs/promises';
import path from 'path';

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

export const sanitizeDownloadName = (value: string, fallback = 'download') => {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
};

export const resolveUploadAbsolutePath = (storedPath?: string): string | undefined => {
  if (!storedPath) return undefined;

  const normalizedInput = storedPath.trim();
  if (!normalizedInput || /^https?:\/\//i.test(normalizedInput)) return undefined;

  const normalized = normalizedInput.replace(/\\/g, '/');
  const uploadsMarker = '/uploads/';
  const markerIndex = normalized.toLowerCase().indexOf(uploadsMarker);

  let candidate: string;
  if (markerIndex >= 0) {
    // Keep path segment from uploads/ onward.
    candidate = normalized.slice(markerIndex + 1);
  } else if (normalized.toLowerCase().startsWith('uploads/')) {
    candidate = normalized;
  } else if (path.isAbsolute(normalizedInput)) {
    candidate = normalizedInput;
  } else {
    candidate = normalized.replace(/^\.?\//, '');
  }

  const absolutePath = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(process.cwd(), candidate);

  const relativeToUploads = path.relative(UPLOADS_ROOT, absolutePath);
  if (relativeToUploads.startsWith('..') || path.isAbsolute(relativeToUploads)) {
    return undefined;
  }

  return absolutePath;
};

export const resolveExistingUploadFile = async (storedPath?: string): Promise<string | undefined> => {
  const absolutePath = resolveUploadAbsolutePath(storedPath);
  if (!absolutePath) return undefined;

  try {
    await fs.access(absolutePath);
    return absolutePath;
  } catch {
    return undefined;
  }
};