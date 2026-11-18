/**
 * Safe fetch utility for Unified Admin bot components.
 * Automatically resolves and maps legacy API routes to the unified server routes:
 * - /api/bot/admin/*
 * - /api/bot/admin/legacy/*
 */

export function mapAdminBotUrl(url: string): string {
  if (url.startsWith('/api/bot/')) {
    return url;
  }

  // API settings maps directly to new admin router
  if (url.startsWith('/api/admin/api-settings')) {
    return url.replace('/api/admin/api-settings', '/api/bot/admin/api-settings');
  }

  // All other legacy admin tools map to legacy router under /api/bot/admin/legacy
  if (
    url.startsWith('/api/voice/') ||
    url.startsWith('/api/db/') ||
    url.startsWith('/api/queue/') ||
    url.startsWith('/api/anti-ban/') ||
    url.startsWith('/api/engineer-gateway/') ||
    url.startsWith('/api/baileys/') ||
    url.startsWith('/api/whatsapp/') ||
    url.startsWith('/api/ai/') ||
    url.startsWith('/api/admin/') ||
    url.startsWith('/api/status') ||
    url.startsWith('/api/glossary') ||
    url.startsWith('/api/client-config') ||
    url.startsWith('/api/client-logs') ||
    url.startsWith('/api/export/')
  ) {
    return url.replace('/api/', '/api/bot/admin/legacy/');
  }

  return url;
}

export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const mappedUrl = mapAdminBotUrl(url);
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(mappedUrl, {
    ...init,
    headers,
  });
}

export async function safeFetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await adminFetch(url, init);
    const text = await res.text();
    if (!text || !text.trim()) {
      return null;
    }
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return null;
    }
    return JSON.parse(trimmed) as T;
  } catch (err) {
    console.warn(`safeFetchJson error on ${url}:`, err);
    return null;
  }
}
