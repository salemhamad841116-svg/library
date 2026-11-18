/**
 * Unified Admin Router for Bot & Books.
 * Mounted at /api/bot/admin and /api/library.
 *
 * Provides:
 * 1. Q&A Rules CRUD & Match Tester
 * 2. Voice Library & Direct Audio files CRUD
 * 3. System Instructions & Active LLM Model Config
 * 4. AES-256-GCM Encrypted Provider API Keys Vault
 * 5. Live Chat Logs with Server-Sent Events (SSE) Stream
 * 6. Books & Notes Publishing endpoints (Zero caching delay)
 * 7. Advanced Tools (Simulator, Baileys, Queue, Anti-ban, Ingestion)
 */
import express, { Request, Response } from 'express';
import {
  listQaRules,
  getQaRule,
  saveQaRule,
  deleteQaRule,
  matchQaRule,
  listAudioFiles,
  saveAudioFile,
  deleteAudioFile,
  getBotSettings,
  updateBotSettings,
  getBotChatLogs,
  subscribeChatLogs,
  upsertPublishedList,
  deletePublishedList,
  upsertPublishedNote,
  deletePublishedNote,
  getPublishedStats,
  clearPublishedLibrary,
} from '../db/platformDb.js';
import { dbService } from './database-service.js';
import { createBotLegacyRouter } from './legacyRouter.js';

export function createBotAdminRouter(): express.Router {
  const router = express.Router();

  // -------------------------------------------------------------------------
  // 1. Q&A Rules (أسئلة وأجوبة البوت)
  // -------------------------------------------------------------------------
  router.get('/qa-rules', (req: Request, res: Response) => {
    res.json({ success: true, rules: listQaRules() });
  });

  router.post('/qa-rules', (req: Request, res: Response) => {
    try {
      const { id, question, keywords, answer, audio_file_id, match_mode, priority, enabled } = req.body || {};
      if (!question || !answer) {
        res.status(400).json({ success: false, error: 'السؤال والجواب حقول مطلوبة.' });
        return;
      }
      const saved = saveQaRule({
        id,
        question,
        keywords,
        answer,
        audio_file_id,
        match_mode,
        priority: Number(priority || 0),
        enabled: enabled !== undefined ? Boolean(enabled) : true,
      });
      res.json({ success: true, rule: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/qa-rules/:id', (req: Request, res: Response) => {
    const success = deleteQaRule(req.params.id);
    res.json({ success });
  });

  router.post('/qa-rules/test-match', (req: Request, res: Response) => {
    const { query } = req.body || {};
    const matched = matchQaRule(query || '');
    res.json({
      success: true,
      matched: Boolean(matched),
      rule: matched,
    });
  });

  // -------------------------------------------------------------------------
  // 2. Direct Voice Library (مكتبة الردود الصوتية المباشرة)
  // -------------------------------------------------------------------------
  router.get('/audio-files', (req: Request, res: Response) => {
    res.json({ success: true, files: listAudioFiles() });
  });

  router.post('/audio-files', (req: Request, res: Response) => {
    try {
      const { label, fileName, mimeType, audioBase64 } = req.body || {};
      if (!audioBase64) {
        res.status(400).json({ success: false, error: 'audioBase64 مطلوب لرفع الملف الصوتي.' });
        return;
      }

      const buffer = Buffer.from(audioBase64, 'base64');
      const saved = saveAudioFile(
        label || fileName || 'تسجيل صوتي',
        fileName || 'audio.mp3',
        mimeType || 'audio/mpeg',
        buffer
      );

      res.json({ success: true, file: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/audio-files/:id', (req: Request, res: Response) => {
    const success = deleteAudioFile(req.params.id);
    res.json({ success });
  });

  // -------------------------------------------------------------------------
  // 3. Bot Settings & AI Model Selector
  // -------------------------------------------------------------------------
  router.get('/settings', (req: Request, res: Response) => {
    res.json({ success: true, settings: getBotSettings() });
  });

  router.post('/settings', (req: Request, res: Response) => {
    try {
      const updated = updateBotSettings(req.body || {});
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // 4. API Keys Vault (AES-256-GCM)
  // -------------------------------------------------------------------------
  router.get('/api-settings', (req: Request, res: Response) => {
    res.json({ success: true, settings: dbService.getApiSettings(true) });
  });

  router.post('/api-settings', (req: Request, res: Response) => {
    try {
      const saved = dbService.saveApiSetting(req.body || {});
      res.json({ success: true, setting: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/api-settings/:id/toggle', (req: Request, res: Response) => {
    try {
      const updated = dbService.toggleApiSetting(req.params.id, req.body?.is_active);
      res.json({ success: true, setting: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/api-settings/:id', (req: Request, res: Response) => {
    const success = dbService.deleteApiSetting(req.params.id);
    res.json({ success });
  });

  // -------------------------------------------------------------------------
  // 5. Live Chat Logs with SSE Stream
  // -------------------------------------------------------------------------
  router.get('/chat-logs', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    res.json({ success: true, logs: getBotChatLogs(limit, offset) });
  });

  router.get('/chat-logs/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial connected event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const unsubscribe = subscribeChatLogs((log) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'chat_log', log })}\n\n`);
      } catch {
        /* client disconnected */
      }
    });

    // Heartbeat every 15 seconds to keep reverse proxies alive
    const interval = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(interval);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
      unsubscribe();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Books & Notes Publishing / Sync Endpoints
  // -------------------------------------------------------------------------
  router.get('/library/stats', (req: Request, res: Response) => {
    res.json({ success: true, stats: getPublishedStats() });
  });

  router.post('/library/sync-all', (req: Request, res: Response) => {
    try {
      const { lists = [], notes = [], ownerUid = 'admin' } = req.body || {};

      // Clear previous published library for this admin
      clearPublishedLibrary(ownerUid);

      // Publish lists
      for (const l of lists) {
        upsertPublishedList({
          id: l.id,
          owner_uid: ownerUid,
          name: l.name,
          icon: l.icon,
          color: l.color,
          parent_id: l.parentId || null,
          sort_order: l.sortOrder || 0,
          is_archived: Boolean(l.isArchived),
          bot_visible: l.bot_visible !== false,
          updated_at: l.updatedAt,
        });
      }

      // Publish notes
      for (const n of notes) {
        if (!n.isDeleted && !n.isArchived) {
          upsertPublishedNote({
            id: n.id,
            owner_uid: ownerUid,
            list_id: n.listId || null,
            parent_id: n.parentId || null,
            title: n.title,
            content_text: n.content,
            tags: n.tags || [],
            is_pinned: Boolean(n.isPinned),
            updated_at: n.updatedAt,
          });
        }
      }

      res.json({
        success: true,
        stats: getPublishedStats(),
        message: 'تم نشر ومزامنة كافة الكتب والملاحظات في مركز المعرفة بنجاح',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mount existing Legacy router for advanced tools (WhatsApp Simulator, Baileys, Queue, Anti-Ban, etc.)
  router.use('/legacy', createBotLegacyRouter());

  return router;
}

/**
 * Creates real-time publish-on-save endpoints mounted at /api/library
 */
export function createLibraryPublishRouter(): express.Router {
  const router = express.Router();

  // Save / Update Note
  router.put('/notes/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { title, content, listId, parentId, tags, isPinned, isDeleted, isArchived, ownerUid = 'admin' } = req.body || {};

      if (isDeleted || isArchived) {
        deletePublishedNote(id);
      } else if (title) {
        upsertPublishedNote({
          id,
          owner_uid: ownerUid,
          title,
          content_text: content || '',
          list_id: listId || null,
          parent_id: parentId || null,
          tags: tags || [],
          is_pinned: Boolean(isPinned),
        });
      }

      res.json({ success: true, stats: getPublishedStats() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete Note
  router.delete('/notes/:id', (req: Request, res: Response) => {
    try {
      deletePublishedNote(req.params.id);
      res.json({ success: true, stats: getPublishedStats() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save / Update List (Book / Category)
  router.put('/lists/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { name, icon, color, parentId, sortOrder, isArchived, bot_visible, ownerUid = 'admin' } = req.body || {};

      upsertPublishedList({
        id,
        owner_uid: ownerUid,
        name: name || 'قائمة بدون عنوان',
        icon,
        color,
        parent_id: parentId || null,
        sort_order: sortOrder || 0,
        is_archived: Boolean(isArchived),
        bot_visible: bot_visible !== false,
      });

      res.json({ success: true, stats: getPublishedStats() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete List
  router.delete('/lists/:id', (req: Request, res: Response) => {
    try {
      deletePublishedList(req.params.id);
      res.json({ success: true, stats: getPublishedStats() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
