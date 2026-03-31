const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

const buildApiUrl = (endpoint: string) => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${normalizedEndpoint}`;
};

const extractFileNameFromDisposition = (header: string | null): string | undefined => {
  if (!header) return undefined;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1];
};

const normalizeFileName = (value: string, fallback: string) => {
  const normalized = value.trim().replace(/[\\/:*?"<>|]+/g, '_');
  return normalized || fallback;
};

export const downloadFromApi = async (endpoint: string, fallbackFileName: string) => {
  const token = localStorage.getItem('nckh_token');
  const response = await fetch(buildApiUrl(endpoint), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let message = 'Khong the tai tep tu he thong.';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Keep fallback message for non-JSON errors.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const suggested = extractFileNameFromDisposition(response.headers.get('content-disposition'));
  const finalName = normalizeFileName(suggested ?? fallbackFileName, fallbackFileName);

  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = finalName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
};
