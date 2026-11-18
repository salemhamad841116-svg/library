/**
 * Public Bot Router.
 * Mounted at /api/bot (and aliased at root /api for legacy headless mobile apps).
 *
 * Publicly accessible with ZERO auth blockers:
 * - /api/bot/chat (unified 5-tier answer engine + optional voice synthesis)
 * - /api/bot/audio/:file (cached and reference audio streaming)
 * - /api/bot/tts & /api/bot/voice/synthesize
 * - /api/bot/transcribe
 * - /api/bot/upload (file & document text extraction: PDF, DOCX, TXT, Audio, Images)
 * - /api/bot/quick-buttons
 * - /api/bot/config
 */
import express, { Request, Response } from 'express';
import path from 'path';
import mammoth from 'mammoth';
import {
  getBotSettings,
  logBotChat,
  getAudioFilePath,
} from '../db/platformDb.js';
import { dbService } from './database-service.js';
import { answerWithPlatformKnowledge } from './answerEngine.js';
import { transcribeAudio } from './gemini.js';
import {
  synthesizeVoiceReply,
  getCachedAudioFilePath,
} from './voice-service.js';

export function createBotPublicRouter(): express.Router {
  const router = express.Router();

  // -------------------------------------------------------------------------
  // 1. Audio File Streaming
  // -------------------------------------------------------------------------
  router.get('/audio/:file', (req: Request, res: Response) => {
    try {
      const rawFile = req.params.file || '';
      const isOgg = rawFile.toLowerCase().endsWith('.ogg');

      // Check uploaded audio library first, then voice TTS cache
      let filePath = getAudioFilePath(rawFile);
      if (!filePath) {
        filePath = getCachedAudioFilePath(rawFile, isOgg ? 'ogg' : 'mp3');
      }

      if (!filePath) {
        res.status(404).json({ success: false, error: 'Audio file not found or expired' });
        return;
      }

      res.setHeader('Content-Type', isOgg ? 'audio/ogg; codecs=opus' : 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // 2. Public Chat Endpoint (/api/bot/chat)
  // -------------------------------------------------------------------------
  router.post('/chat', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const {
        message,
        query,
        audioBase64,
        audioMimeType,
        includeAudio = true,
        voiceReply,
        provider = 'auto',
        voiceId,
        speed,
        userId = 'public-user',
        userName,
        sessionId = `session-${Date.now()}`,
        channel = 'public_web',
      } = req.body || {};

      let userText = (message || query || '').trim();

      // If voice message sent, transcribe it first
      if (!userText && audioBase64) {
        try {
          userText = await transcribeAudio(audioBase64, audioMimeType || 'audio/webm');
        } catch (transErr: any) {
          console.warn('Voice transcription failed:', transErr);
        }
      }

      if (!userText) {
        res.status(400).json({
          success: false,
          error: 'حقل الرسالة أو السؤال مطلوب: أرسل (message) أو تسجيلاً صوتياً (audioBase64).',
        });
        return;
      }

      // Execute 5-tier answer engine
      const answerResult = await answerWithPlatformKnowledge(
        userText,
        dbService.getRaceResults(),
        dbService.getChatEmbeddings(),
        userName
      );

      // Handle Voice Synthesis if requested or if user sent audio
      const shouldGenerateAudio =
        voiceReply !== undefined
          ? Boolean(voiceReply)
          : Boolean(includeAudio || audioBase64 || userText.includes('صوت') || userText.includes('اسمع'));

      let audioPayload: any = null;

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3002';
      const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, '');

      // If the answer came from a Q&A rule with pre-recorded audio, use that directly
      if (answerResult.audioUrl) {
        audioPayload = {
          audioUrl: `${baseUrl}${answerResult.audioUrl}`,
          relativeAudioUrl: answerResult.audioUrl,
          mimeType: 'audio/mpeg',
          isPreRecorded: true,
        };
      } else if (shouldGenerateAudio && answerResult.responseMessage) {
        try {
          const tts = await synthesizeVoiceReply(answerResult.responseMessage, {
            provider: provider || 'auto',
            voiceId,
            speed: typeof speed === 'number' ? speed : undefined,
          });

          audioPayload = {
            audioUrl: `${baseUrl}/api/bot/audio/${tts.cacheKey}.mp3`,
            opusUrl: `${baseUrl}/api/bot/audio/${tts.cacheKey}.ogg`,
            relativeAudioUrl: `/api/bot/audio/${tts.cacheKey}.mp3`,
            relativeOpusUrl: `/api/bot/audio/${tts.cacheKey}.ogg`,
            audioBase64: tts.audioBase64,
            mimeType: 'audio/mpeg',
            providerUsed: tts.providerUsed,
            voicePersona: tts.voicePersonaLabel,
            durationEstimateSec: tts.durationEstimateSec,
            cacheKey: tts.cacheKey,
            latencyMs: tts.latencyMs,
          };
        } catch (ttsError) {
          console.warn('TTS voice reply failed:', ttsError);
        }
      }

      const totalLatency = Date.now() - startTime;

      // Log chat to SQLite & broadcast via SSE to live admin monitor
      logBotChat({
        sessionId,
        channel,
        inputType: audioBase64 ? 'voice' : 'text',
        question: userText,
        answer: answerResult.responseMessage,
        source: answerResult.sourceType,
        provider: answerResult.providerUsed || 'engine',
        ruleId: answerResult.ruleId,
        sources: answerResult.sources.map((s) => s.title),
        latencyMs: totalLatency,
      });

      res.json({
        success: true,
        query: userText,
        answer: answerResult.responseMessage,
        sourceType: answerResult.sourceType,
        sources: answerResult.sources,
        matchedEntities: answerResult.matchedEntities,
        audio: audioPayload,
        intentType: answerResult.intentType,
        ruleId: answerResult.ruleId,
        providerUsed: answerResult.providerUsed,
        modelUsed: answerResult.modelUsed,
        sessionId,
        latencyMs: totalLatency,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('/api/bot/chat error:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal server error in bot chat' });
    }
  });

  // -------------------------------------------------------------------------
  // 3. Voice Synthesis Endpoints (/api/bot/voice/synthesize & /api/bot/tts)
  // -------------------------------------------------------------------------
  const handleTts = async (req: Request, res: Response) => {
    try {
      const { text, message, voiceId, provider, speed } = req.body || {};
      const content = (text || message || '').trim();
      if (!content) {
        res.status(400).json({ success: false, error: 'النص المطلوب قراءته صوتياً غير موجود.' });
        return;
      }

      const tts = await synthesizeVoiceReply(content, {
        provider: provider || 'auto',
        voiceId,
        speed: typeof speed === 'number' ? speed : undefined,
      });

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3002';
      const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, '');

      res.json({
        success: true,
        text: content,
        audioUrl: `${baseUrl}/api/bot/audio/${tts.cacheKey}.mp3`,
        relativeAudioUrl: `/api/bot/audio/${tts.cacheKey}.mp3`,
        audioBase64: tts.audioBase64,
        mimeType: 'audio/mpeg',
        providerUsed: tts.providerUsed,
        voicePersona: tts.voicePersonaLabel,
        latencyMs: tts.latencyMs,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  router.post('/voice/synthesize', handleTts);
  router.post('/tts', handleTts);

  // -------------------------------------------------------------------------
  // 4. Transcription Endpoint (/api/bot/transcribe)
  // -------------------------------------------------------------------------
  router.post('/transcribe', async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType } = req.body || {};
      if (!audioBase64) {
        res.status(400).json({ success: false, error: 'audioBase64 مطلوب.' });
        return;
      }

      const transcription = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
      res.json({ success: true, text: transcription });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // 5. File & Document Upload / Extraction (/api/bot/upload)
  // -------------------------------------------------------------------------
  router.post('/upload', async (req: Request, res: Response) => {
    try {
      const { fileName, fileType, fileBase64 } = req.body || {};
      if (!fileBase64) {
        res.status(400).json({ success: false, error: 'ملف الرفع مفقود (fileBase64 required).' });
        return;
      }

      const buffer = Buffer.from(fileBase64, 'base64');
      const ext = (path.extname(fileName || '') || '').toLowerCase();
      let extractedText = '';

      if (ext === '.docx') {
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value.trim();
      } else if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.csv') {
        extractedText = buffer.toString('utf8').trim();
      } else if (ext === '.pdf') {
        // Simple plain text extraction for PDF if text blocks exist
        const raw = buffer.toString('binary');
        const textBlocks: string[] = [];
        const regex = /\(([\s\S]*?)\)\s*Tj/g;
        let match;
        while ((match = regex.exec(raw)) !== null && textBlocks.length < 500) {
          textBlocks.push(match[1]);
        }
        extractedText = textBlocks.join(' ').replace(/\\(\d{3})/g, '').trim();
        if (!extractedText) {
          extractedText = `[مستند PDF: ${fileName || 'ملف مرفق'} بحجم ${(buffer.length / 1024).toFixed(1)} ك.ب]`;
        }
      } else if (fileType?.startsWith('audio/')) {
        extractedText = await transcribeAudio(fileBase64, fileType);
      } else if (fileType?.startsWith('image/')) {
        extractedText = `[صورة مرفقة: ${fileName || 'صورة'} بحجم ${(buffer.length / 1024).toFixed(1)} ك.ب]`;
      } else if (fileType?.startsWith('video/')) {
        extractedText = `[فيديو مرفق: ${fileName || 'مقطع مرئي'} بحجم ${(buffer.length / 1024).toFixed(1)} ك.ب]`;
      } else {
        extractedText = buffer.toString('utf8', 0, Math.min(buffer.length, 10000)).trim();
      }

      res.json({
        success: true,
        fileName,
        fileType,
        sizeBytes: buffer.length,
        extractedText,
      });
    } catch (err: any) {
      console.error('File upload extraction error:', err);
      res.status(500).json({ success: false, error: err.message || 'فشل استخراج محتوى الملف' });
    }
  });

  // -------------------------------------------------------------------------
  // 6. Quick Action Buttons & Public Config
  // -------------------------------------------------------------------------
  router.get('/quick-buttons', (req: Request, res: Response) => {
    const buttons = dbService.getQuickButtons();
    res.json({ success: true, buttons });
  });

  router.get('/config', (req: Request, res: Response) => {
    const s = getBotSettings();
    res.json({
      success: true,
      botName: s.botName,
      welcomeMessage: s.welcomeMessage,
      voiceRepliesDefault: s.voiceRepliesDefault,
      publicUploadsEnabled: s.publicUploadsEnabled,
    });
  });

  return router;
}
