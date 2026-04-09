/**
 * src/utils/urlUtil.ts
 * Shared URL utilities for frontend services
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/**
 * Normalize upload paths to full URLs
 * Handles relative paths, partial paths, and absolute URLs
 */
export const normalizeUploadPath = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/uploads/')) return `${API_ORIGIN}${value}`;

  const normalized = value.replace(/\\/g, '/');
  const uploadsIndex = normalized.toLowerCase().indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return `${API_ORIGIN}${normalized.slice(uploadsIndex)}`;
  }
  return undefined;
};

/**
 * Build complete API URL from endpoint
 */
export const buildApiUrl = (endpoint: string): string => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${normalizedEndpoint}`;
};

export { API_BASE, API_ORIGIN };
