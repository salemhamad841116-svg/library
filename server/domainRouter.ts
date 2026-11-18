/**
 * Host-based Domain Router and Security Isolation Layer.
 *
 * Separates:
 * 1. Public Bot Domain (bot.misruq.com):
 *    - Serves exclusively the public conversational bot interface (bot.html bundle).
 *    - Exposes ZERO admin endpoints, zero config panels, zero secret keys.
 *    - All admin routes (/api/admin/*, /api/bot/admin/*, /api/library/* writes) return 404.
 *    - Unauthenticated public access for chat, voice and file uploads (no auth blockers).
 *
 * 2. Admin & Books Domain (library.misruq.com / library-mgt.misruq.com):
 *    - Serves the Books & Notes app and the Unified Administration Panel (index.html).
 *    - Full CRUD for books, nested lists, sub-notes, and bot management.
 *    - Secured by admin authentication.
 *
 * Query/path fallback for local development:
 *    - ?app=bot or /bot URL prefix routes to the public bot interface.
 */
import { Request, Response, NextFunction } from 'express';

export const BOT_PUBLIC_DOMAIN = (process.env.BOT_PUBLIC_DOMAIN || 'bot.misruq.com').toLowerCase().trim();
export const ADMIN_BOOKS_DOMAINS = (process.env.ADMIN_BOOKS_DOMAIN || 'library.misruq.com,library-mgt.misruq.com')
  .toLowerCase()
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

export type AppDomainTier = 'bot' | 'library';

/**
 * Determine the tier (bot or library) based on Host header, query param, or path.
 */
export function resolveDomainTier(req: Request): AppDomainTier {
  // Query param override for testing/local preview: ?app=bot or ?app=library
  const appQuery = String(req.query?.app || '').toLowerCase();
  if (appQuery === 'bot') return 'bot';
  if (appQuery === 'library' || appQuery === 'admin') return 'library';

  // Path override for local preview: inspect both originalUrl and path
  const fullPath = (req.originalUrl || req.url || req.path || '').toLowerCase().split('?')[0];
  if (
    fullPath === '/bot' ||
    fullPath.startsWith('/bot/') ||
    fullPath === '/voice' ||
    fullPath.startsWith('/voice/')
  ) {
    return 'bot';
  }

  // Host header check
  const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().toLowerCase();
  const hostname = rawHost.split(':')[0].trim();

  if (hostname === BOT_PUBLIC_DOMAIN || hostname.startsWith('bot.')) {
    return 'bot';
  }

  if (ADMIN_BOOKS_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return 'library';
  }

  // Default for localhost / development without specific subdomains
  return 'library';
}

/**
 * Middleware that strictly protects against admin leakage on the public bot domain.
 * Any admin route requested on the public bot domain is dropped with 404.
 */
export function botDomainSecurityGuard(req: Request, res: Response, next: NextFunction): void {
  const tier = resolveDomainTier(req);

  if (tier === 'bot') {
    const isForbiddenAdminRoute =
      req.path.startsWith('/api/admin') ||
      req.path.startsWith('/api/bot/admin') ||
      (req.path.startsWith('/api/library') && req.method !== 'GET');

    if (isForbiddenAdminRoute) {
      // Return clean 404 to hide the existence of admin endpoints on the public domain
      res.status(404).json({ success: false, error: 'Not Found' });
      return;
    }
  }

  next();
}
