/**
 * Internal push endpoints for zero-delay updates from masruq_rag_backend (Waraqa).
 * Mounted at /api/internal. Blocked with 404 on public bot/chat domains by botDomainSecurityGuard,
 * and every call must carry `X-Waraqa-Sync-Secret` matching WARAQA_SYNC_SECRET.
 *
 *   POST   /api/internal/waraqa-sync              { type:'document', externalId, title, content, category? }
 *                                                 { type:'qa', externalId, question, answer, keywords? }
 *                                                 { items: [ ...any of the above ] }
 *   DELETE /api/internal/waraqa-sync/:externalId
 */
import express, { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { pushWaraqaDocument, pushWaraqaQa, removeWaraqaRecord } from './waraqaSync.js';

function requireSyncSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = (process.env.WARAQA_SYNC_SECRET || '').trim();
  if (!expected) {
    res.status(503).json({ success: false, error: 'Waraqa push sync is disabled (WARAQA_SYNC_SECRET not set).' });
    return;
  }
  const provided = String(req.header('x-waraqa-sync-secret') || '');
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!provided || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

export function createInternalSyncRouter(): express.Router {
  const router = express.Router();
  router.use('/waraqa-sync', requireSyncSecret);

  router.post('/waraqa-sync', (req: Request, res: Response) => {
    const body = req.body || {};
    const items: any[] = Array.isArray(body.items) ? body.items : [body];
    if (items.length > 2000) {
      res.status(413).json({ success: false, error: 'Too many items (max 2000 per request).' });
      return;
    }
    const results: Array<{ externalId: string; type: string; ok: boolean; error?: string; sections?: number }> = [];
    for (const item of items) {
      const type = str(item?.type) || (item?.question ? 'qa' : 'document');
      const externalId = str(item?.externalId ?? item?.external_id ?? item?.id);
      try {
        if (!externalId) throw new Error('externalId is required');
        if (type === 'qa') {
          const question = str(item.question);
          const answer = str(item.answer);
          if (!question || !answer) throw new Error('question and answer are required');
          pushWaraqaQa({ externalId, question, answer, keywords: item.keywords });
          results.push({ externalId, type, ok: true });
        } else {
          const title = str(item.title);
          const content = typeof item.content === 'string' ? item.content : str(item.raw_text ?? item.text);
          if (!title) throw new Error('title is required');
          const out = pushWaraqaDocument({ externalId, title, content, category: str(item.category) || null });
          results.push({ externalId, type: 'document', ok: true, sections: out.sections });
        }
      } catch (err: any) {
        results.push({ externalId, type, ok: false, error: String(err?.message || err) });
      }
    }
    const failed = results.filter((r) => !r.ok).length;
    res.status(failed === results.length ? 400 : 200).json({ success: failed === 0, results });
  });

  router.delete('/waraqa-sync/:externalId', (req: Request, res: Response) => {
    const removed = removeWaraqaRecord(req.params.externalId);
    res.json({ success: true, removed });
  });

  return router;
}
