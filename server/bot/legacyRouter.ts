import express from 'express';
import { baileysEngine } from './baileys-engine.js';
import { queueService } from './queue-service.js';
import { dbService, POSTGRES_PGVECTOR_DDL_SCHEMA } from './database-service.js';
import { antiBanManager } from './anti-ban.js';
import { CAMEL_RACING_GLOSSARY, WHISPER_PROMPT_BIASING, SAMPLE_RACE_MESSAGES, DIALECT_INTENT_MAPPINGS } from './camel-glossary.js';
import { transcribeAudio, extractStructuredRaceResult, generateEmbedding } from './gemini.js';
import { answerWithPlatformKnowledge as handleUserQueryRAG } from './answerEngine.js';
import { runIngestionWorker, ingestAndCleanSocialPost } from './ingestion-worker.js';
import { engineerGatewayService } from './engineer-gateway.js';
import {
  synthesizeVoiceReply,
  getVoiceCacheStats,
  purgeExpiredAudioCache,
  getVoiceEngineConfig,
  updateVoiceEngineConfig,
  saveReferenceSpeakerAudio,
  getCachedAudioFilePath,
} from './voice-service.js';

const PORT = process.env.PORT || '3002';

/**
 * Legacy bot routes (admin & tools). Mounted at /api/bot/admin behind admin auth.
 * Public endpoints live in publicRouter.ts.
 */
export function createBotLegacyRouter(): express.Router {
  const app = express.Router();

  // =========================================================================
  // API Routes
  // =========================================================================

  // 1. Health & Overall Status
  app.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      architectureMode: 'HEADLESS_API_PRIMARY + BAILEYS_PASSIVE_COLLECTOR',
      baileys: baileysEngine.getState(),
      queue: queueService.getMetrics(),
      database: dbService.getStats(),
      antiBan: {
        config: antiBanManager.getConfig(),
        rateLimit: antiBanManager.checkRateLimit(),
      },
      voiceConfig: getVoiceEngineConfig(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      serverTime: new Date().toISOString(),
    });
  });

  // 2. Baileys Engine Endpoints
  app.get('/baileys/state', (req, res) => {
    res.json(baileysEngine.getState());
  });

  app.post('/baileys/toggle', async (req, res) => {
    const { action } = req.body;
    const newState = await baileysEngine.toggleConnection(action || 'connect');
    res.json(newState);
  });

  // 3. Message Ingestion Engine (Text, Audio, Documents)
  app.post('/ingest/message', async (req, res) => {
    try {
      const {
        messageId,
        senderId,
        senderName,
        groupId,
        groupName,
        type,
        text,
        audioBase64,
        audioMimeType,
        isMention,
      } = req.body;

      const job = await baileysEngine.handleIncomingMessage({
        messageId: messageId || `msg-${Date.now()}`,
        senderId: senderId || '+971500000000',
        senderName: senderName || 'عضو القروب',
        groupId: groupId || '12036302849182371@g.us',
        groupName: groupName || 'قروب ميدان الوثبة 🐪🏁',
        type: type || 'text',
        text: text || '',
        audioBase64,
        audioMimeType: audioMimeType || 'audio/mp3',
        timestamp: Date.now(),
        isMention: Boolean(isMention),
      });

      res.json({ success: true, jobId: job.id, job });
    } catch (err: any) {
      console.error('Ingest error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3.1 WhatsApp In-Browser Simulation Hook (for direct testing in Simulator)
  app.post('/whatsapp/simulate-incoming', async (req, res) => {
    try {
      const {
        groupId,
        groupName,
        senderId,
        senderName,
        messageType,
        text,
        audioBase64,
        isMentionOrDM,
        wantsVoiceReply,
        preferredProvider,
      } = req.body;

      let processedText = text || '';

      // Transcribe audio if needed
      if (audioBase64) {
        processedText = await transcribeAudio(audioBase64, 'audio/webm');
      }

      // Ingest via Baileys engine
      const job = await baileysEngine.handleIncomingMessage({
        messageId: `sim-msg-${Date.now()}`,
        senderId: senderId || '+966500000000',
        senderName: senderName || 'عضو نشط',
        groupId: groupId || 'dm-user',
        groupName: groupName || 'محادثة خاصة',
        type: audioBase64 ? 'audio' : 'text',
        text: processedText,
        audioBase64,
        timestamp: Date.now(),
        isMention: Boolean(isMentionOrDM),
      });

      let botReply: string | undefined;
      let voiceReplyData: any = undefined;
      let intentType: string | undefined;
      let searchingMessage: string | undefined;
      let videoTimestampData: any = undefined;
      let generatedSql: string | undefined;

      if (isMentionOrDM) {
        const contextResults = dbService.getRaceResults();
        const contextEmbeddings = dbService.getChatEmbeddings();
        const rawUserName = req.body.userName || req.body.pushName || senderName;
        const rag = await handleUserQueryRAG(processedText, contextResults, contextEmbeddings, rawUserName);
        botReply = rag.responseMessage;
        intentType = rag.intentType;
        searchingMessage = rag.searchingMessage || 'جاري البحث...';
        videoTimestampData = rag.videoTimestampData;
        generatedSql = rag.generatedSql;

        // Check if voice reply requested or query is spoken / elderly preference
        const shouldVoice = Boolean(
          wantsVoiceReply ||
          audioBase64 ||
          processedText.includes('صوت') ||
          processedText.includes('فويس') ||
          processedText.includes('اسمع') ||
          processedText.includes('سمعني')
        );

        if (shouldVoice && botReply) {
          const tts = await synthesizeVoiceReply(botReply, {
            provider: preferredProvider || 'auto',
          });
          voiceReplyData = {
            audioBase64: tts.audioBase64,
            opusBase64: tts.opusBase64,
            mimeType: tts.mimeType,
            cacheKey: tts.cacheKey,
            isCached: tts.isCached,
            durationEstimateSec: tts.durationEstimateSec,
            providerUsed: tts.providerUsed,
            voiceIdUsed: tts.voiceIdUsed,
            voicePersona: tts.voicePersonaLabel,
            latencyMs: tts.latencyMs,
            ptt: true,
          };
        }
      }

      res.json({
        success: true,
        jobId: job.id,
        botReply,
        intentType,
        searchingMessage,
        videoTimestampData,
        generatedSql,
        voiceReply: voiceReplyData,
        processedText,
      });
    } catch (err: any) {
      console.error('Simulate incoming error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. AI Direct Testing Endpoints
  app.post('/ai/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required' });
      }
      const transcription = await transcribeAudio(audioBase64, mimeType || 'audio/mp3');
      res.json({ transcription, glossaryBiased: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/ai/extract', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'text is required' });
      }
      const extraction = await extractStructuredRaceResult(text);
      res.json(extraction);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // 4.5 HEADLESS MOBILE API (POST /api/chat & GET /api/bot/audio/:file)
  // Decoupled Architecture: Baileys acts strictly as a Passive Listener in
  // WhatsApp groups to populate PostgreSQL + pgvector, while external Mobile
  // Apps consume /api/chat with 0% WhatsApp Ban Risk and 0s Anti-Ban jitter delay.
  // =========================================================================
  app.get('/audio/:file', (req, res) => {
    try {
      const rawFile = req.params.file || '';
      const isOgg = rawFile.toLowerCase().endsWith('.ogg');
      const filePath = getCachedAudioFilePath(rawFile, isOgg ? 'ogg' : 'mp3');

      if (!filePath) {
        return res.status(404).json({ error: 'Audio file not found or expired from 24h cache' });
      }

      res.setHeader('Content-Type', isOgg ? 'audio/ogg; codecs=opus' : 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(filePath);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/chat', async (req, res) => {
    const requestStart = Date.now();
    try {
      // Optional API Key verification if MOBILE_APP_API_KEY is configured in environment
      const requiredApiKey = process.env.MOBILE_APP_API_KEY?.trim();
      if (requiredApiKey) {
        const providedKey =
          (req.headers['x-api-key'] as string) ||
          (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
        if (providedKey !== requiredApiKey) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid or missing X-API-Key / Bearer token for Headless Mobile API',
          });
        }
      }

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
        xttsEndpointUrl,
        referenceSpeakerPath,
        userId = 'mobile-user',
        userName,
        pushName,
        senderName,
        clientName,
        sessionId = 'mobile-session-1',
        channel = 'mobile_app',
      } = req.body || {};

      let userQuestion = (message || query || '').trim();

      // If mobile user sent a voice question, transcribe it first with Camel Racing Glossary biasing
      if (!userQuestion && audioBase64) {
        userQuestion = await transcribeAudio(audioBase64, audioMimeType || 'audio/mp3');
      }

      if (!userQuestion) {
        return res.status(400).json({
          success: false,
          error: 'حقل السؤال مطلوب: يرجى إرسال (message أو query) نصياً أو (audioBase64) صوتياً.',
        });
      }

      // 1. Retrieve ALL structured race results & semantic vectors stored in the Manager's central database
      const contextResults = dbService.getRaceResults();
      const contextEmbeddings = dbService.getChatEmbeddings();

      // 2. Run RAG & Intent Mapping Engine (Personalized Greeting + Bot Identity + Database Search + Gulf Dialect Response)
      const effectiveUserName = userName || pushName || senderName || clientName || '';
      const ragResult = await handleUserQueryRAG(
        userQuestion,
        contextResults,
        contextEmbeddings,
        effectiveUserName
      );

      // 3. Synthesize Voice Reply via XTTS-v2 (Serverless GPU / Local) or Hybrid Failover
      const shouldGenerateAudio = voiceReply !== undefined ? Boolean(voiceReply) : Boolean(includeAudio);
      let audioPayload: any = null;
      let userMessageAudioPayload: any = null;

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
      const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, '');

      if (shouldGenerateAudio && ragResult.responseMessage) {
        const ttsResult = await synthesizeVoiceReply(ragResult.responseMessage, {
          provider: provider || 'auto',
          voiceId,
          speed: typeof speed === 'number' ? speed : undefined,
          xttsEndpointUrl,
          referenceSpeakerPath,
        });

        const audioUrl = `${baseUrl}/api/bot/audio/${ttsResult.cacheKey}.mp3`;
        const opusUrl = `${baseUrl}/api/bot/audio/${ttsResult.cacheKey}.ogg`;

        audioPayload = {
          audioUrl,
          opusUrl,
          relativeAudioUrl: `/api/bot/audio/${ttsResult.cacheKey}.mp3`,
          relativeOpusUrl: `/api/bot/audio/${ttsResult.cacheKey}.ogg`,
          audioBase64: ttsResult.audioBase64,
          opusBase64: ttsResult.opusBase64,
          mimeType: 'audio/mpeg',
          opusMimeType: 'audio/ogg; codecs=opus',
          providerUsed: ttsResult.providerUsed,
          voicePersona: ttsResult.voicePersonaLabel,
          durationEstimateSec: ttsResult.durationEstimateSec,
          isCached: ttsResult.isCached,
          cacheKey: ttsResult.cacheKey,
          latencyMs: ttsResult.latencyMs,
        };
      }

      // Also generate audio for the user's pasted/sent text so clicking the speaker icon 🔊 next to the user's message reads it aloud for illiterate users
      if (shouldGenerateAudio && userQuestion) {
        try {
          const userTts = await synthesizeVoiceReply(userQuestion, {
            provider: provider || 'auto',
            voiceId,
            speed: typeof speed === 'number' ? speed : undefined,
            xttsEndpointUrl,
            referenceSpeakerPath,
          });
          userMessageAudioPayload = {
            audioUrl: `${baseUrl}/api/bot/audio/${userTts.cacheKey}.mp3`,
            opusUrl: `${baseUrl}/api/bot/audio/${userTts.cacheKey}.ogg`,
            audioBase64: userTts.audioBase64,
            mimeType: 'audio/mpeg',
            durationEstimateSec: userTts.durationEstimateSec,
            cacheKey: userTts.cacheKey,
          };
        } catch (userTtsErr) {
          console.warn('User message TTS warning:', userTtsErr);
        }
      }

      // Log every client query so the Manager can verify live public board activity
      dbService.logClientQuery({
        channel,
        inputType: audioBase64 ? 'voice' : 'text',
        query: userQuestion,
        answer: ragResult.responseMessage,
        matchedEntities: ragResult.matchedEntities || [],
        hasAudio: Boolean(audioPayload),
      });

      return res.json({
        success: true,
        requestId: `chat-${Date.now()}`,
        channel,
        userId,
        userName: ragResult.resolvedUserName || 'يا غالي',
        sessionId,
        query: userQuestion,
        transcribedText: userQuestion,
        intentType: ragResult.intentType || 'database_search',
        searchingMessage: 'جاري البحث...',
        answer: ragResult.responseMessage,
        sourceType: ragResult.sourceType,
        generatedSql: ragResult.generatedSql,
        matchedEntities: ragResult.matchedEntities,
        dialectDetected: ragResult.dialectDetected,
        videoTimestampData: ragResult.videoTimestampData || null,
        sourcesCount: {
          structuredRaceResults: contextResults.length,
          vectorEmbeddings: contextEmbeddings.length,
          dopingViolations: dbService.getDopingViolations().length,
        },
        audio: audioPayload,
        userMessageAudio: userMessageAudioPayload,
        ttsEndpoint: `${baseUrl}/api/bot/tts`,
        clientConfig: dbService.getClientBoardConfig(),
        architectureMeta: {
          mode: 'Headless REST API (Primary Mobile Channel)',
          baileysRole: 'Passive Listener Only (Zero Outbound WhatsApp Messages)',
          whatsappBanRisk: '0% (No Outbound WhatsApp Traffic)',
          antiBanDelayAppliedMs: 0,
          totalLatencyMs: Date.now() - requestStart,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Headless /api/chat error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error in /api/chat',
      });
    }
  });

  // 5. RAG Query & Chatbot Interaction with Hybrid Voice Note Synthesis Option (XTTS-v2 / ElevenLabs / OpenAI)
  app.post('/query/rag', async (req, res) => {
    try {
      const { query, voiceReply, voiceId, provider, userName, pushName, senderName } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'query is required' });
      }

      // Check anti-ban rate limiter first
      const rateCheck = antiBanManager.checkRateLimit();
      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: `تم كبح الطلب بواسطة محدد المعدل (Anti-Ban Rate Limiter: Max 15 msg/min). يرجى الانتظار ${rateCheck.resetInSeconds} ثانية.`,
        });
      }

      const contextResults = dbService.getRaceResults();
      const contextEmbeddings = dbService.getChatEmbeddings();

      const result = await handleUserQueryRAG(
        query,
        contextResults,
        contextEmbeddings,
        userName || pushName || senderName
      );

      // Synthesize Voice Note if requested or query implies voice preference
      let voiceData: any = null;
      const shouldSynthesizeVoice = Boolean(
        voiceReply ||
        query.includes('صوت') ||
        query.includes('فويس') ||
        query.includes('اسمع') ||
        query.includes('سمعني')
      );

      if (shouldSynthesizeVoice && result.responseMessage) {
        try {
          const ttsResult = await synthesizeVoiceReply(result.responseMessage, {
            provider: provider || 'auto',
            voiceId: voiceId,
          });

          voiceData = {
            audioBase64: ttsResult.audioBase64,
            opusBase64: ttsResult.opusBase64,
            mimeType: ttsResult.mimeType,
            cacheKey: ttsResult.cacheKey,
            isCached: ttsResult.isCached,
            durationEstimateSec: ttsResult.durationEstimateSec,
            providerUsed: ttsResult.providerUsed,
            voiceIdUsed: ttsResult.voiceIdUsed,
            voicePersona: ttsResult.voicePersonaLabel,
            latencyMs: ttsResult.latencyMs,
            ptt: true, // Baileys Voice Note flag
          };
        } catch (ttsErr) {
          console.error('TTS synthesis error:', ttsErr);
        }
      }

      // Execute safe send with delay simulation
      const sendResult = await antiBanManager.executeSafeSend(
        'user-dm',
        result.responseMessage,
        'direct_message'
      );

      res.json({
        ...result,
        voice: voiceData,
        delayAppliedMs: sendResult.delayMs,
        rateLimit: antiBanManager.checkRateLimit(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5.1 Voice Synthesis Endpoint (Hybrid XTTS-v2, ElevenLabs Voice Cloning & OpenAI TTS with Server-Side SHA-256 Caching)
  const handleSynthesizeRequest = async (req: any, res: any) => {
    try {
      const { text, message, voice, voiceId, provider, speed, xttsEndpointUrl, referenceSpeakerPath } = req.body || {};
      const textToRead = (text || message || '').trim();
      if (!textToRead) {
        return res.status(400).json({ success: false, error: 'حقل النص (text) مطلوب للقراءة الصوتية' });
      }

      const result = await synthesizeVoiceReply(textToRead, {
        provider: provider || 'auto',
        voice: voice,
        voiceId: voiceId,
        speed: typeof speed === 'number' ? speed : undefined,
        xttsEndpointUrl,
        referenceSpeakerPath,
      });

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
      const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, '');
      const audioUrl = `${baseUrl}/api/bot/audio/${result.cacheKey}.mp3`;

      res.json({
        success: true,
        text: textToRead,
        audioUrl,
        audioBase64: result.audioBase64,
        opusBase64: result.opusBase64,
        mimeType: result.mimeType,
        cacheKey: result.cacheKey,
        isCached: result.isCached,
        durationEstimateSec: result.durationEstimateSec,
        providerUsed: result.providerUsed,
        voiceIdUsed: result.voiceIdUsed,
        voicePersona: result.voicePersonaLabel,
        latencyMs: result.latencyMs,
        ptt: true,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  app.post('/voice/synthesize', handleSynthesizeRequest);
  app.post('/tts', handleSynthesizeRequest);

  // 5.2 Hybrid Voice Engine Configuration & Reference Speaker Upload Endpoints
  app.get('/voice/config', (req, res) => {
    res.json({
      config: getVoiceEngineConfig(),
      stats: getVoiceCacheStats(),
    });
  });

  app.post('/voice/config', (req, res) => {
    try {
      const updated = updateVoiceEngineConfig(req.body || {});
      res.json({
        success: true,
        config: updated,
        stats: getVoiceCacheStats(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/voice/upload-speaker', (req, res) => {
    try {
      const { fileName, audioBase64 } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required' });
      }
      const updatedConfig = saveReferenceSpeakerAudio(fileName || 'speaker_reference.wav', audioBase64);
      res.json({
        success: true,
        config: updatedConfig,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/voice/test', async (req, res) => {
    try {
      const { text, provider, xttsEndpointUrl, referenceSpeakerPath, speed } = req.body || {};
      const sampleText =
        text ||
        'يا مرحبا بك في ميدان الطائف! ناموس الشوط الأول كأس الثنايا بكار مفتوح للمطية بيه بتوقيت تسع دقائق وعشر ثواني.';

      const result = await synthesizeVoiceReply(sampleText, {
        provider: provider || undefined,
        xttsEndpointUrl,
        referenceSpeakerPath,
        speed: typeof speed === 'number' ? speed : undefined,
      });

      res.json({
        success: true,
        text: sampleText,
        audioBase64: result.audioBase64,
        opusBase64: result.opusBase64,
        providerUsed: result.providerUsed,
        voicePersona: result.voicePersonaLabel,
        isCached: result.isCached,
        cacheKey: result.cacheKey,
        durationEstimateSec: result.durationEstimateSec,
        latencyMs: result.latencyMs,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5.3 Server-side Voice Cache Stats & Purge
  app.get('/voice/cache-stats', (req, res) => {
    const stats = getVoiceCacheStats();
    res.json(stats);
  });

  app.post('/voice/cache-purge', (req, res) => {
    const purgedCount = purgeExpiredAudioCache();
    res.json({ success: true, purgedCount, currentStats: getVoiceCacheStats() });
  });

  // 6. Dual Database & External Client UI Sync Endpoints
  const enrichResultForClient = (r: any) => ({
    ...r,
    // CamelCase aliases for seamless compatibility with external Mobile / Web UIs ("هجن الخليج")
    camelName: r.winner_name,
    ownerName: r.owner_name,
    trainerName: r.trainer_name || '',
    trackName: r.track_name || 'ميدان المرموم',
    ageCategory: r.category,
    roundNumber: r.heat_number,
    roundTitle: r.roundTitle || `الشوط ${r.heat_number} — ${r.category} — البطلة: «${r.winner_name}»`,
    prizeTitle: r.prizeTitle || r.notes || 'شوط رئيسي',
    timing: r.time,
    secondPlace: r.second_place || '',
    thirdPlace: r.third_place || '',
    speed: r.speed_kmh || '40.8 كم/س',
    bestTimeFlag: Boolean(r.best_time_flag),
  });

  app.get('/db/results', (req, res) => {
    const { category, track, search, heat } = req.query;
    const results = dbService
      .getRaceResults({
        category: category as string,
        track: track as string,
        search: search as string,
        heat: heat ? parseInt(heat as string, 10) : undefined,
      })
      .map(enrichResultForClient);
    res.json(results);
  });

  app.post('/db/results', (req, res) => {
    try {
      const saved = dbService.saveRaceResult(req.body || {});
      res.json({
        success: true,
        result: enrichResultForClient(saved),
        totalResults: dbService.getRaceResults().length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/db/quick-buttons', (req, res) => {
    res.json({
      success: true,
      quickButtons: dbService.getQuickButtons(),
    });
  });

  app.post('/db/quick-buttons', (req, res) => {
    try {
      const { id, title, query, category } = req.body || {};
      if (!title || !query) {
        return res.status(400).json({ success: false, error: 'حقل العنوان (title) ونص السؤال (query) مطلوبان' });
      }
      const saved = dbService.saveQuickButton({ id, title, query, category });
      res.json({
        success: true,
        button: saved,
        quickButtons: dbService.getQuickButtons(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/db/quick-buttons/:id', (req, res) => {
    const deleted = dbService.deleteQuickButton(req.params.id);
    res.json({
      success: true,
      deleted,
      quickButtons: dbService.getQuickButtons(),
    });
  });

  // Doping / Violations List & SQL JOIN with race_results Endpoints
  app.get('/db/violations', (req, res) => {
    const { search } = req.query;
    const joined = dbService.getViolationsJoinedWithRaceResults(search as string);
    res.json({
      success: true,
      violations: dbService.getDopingViolations(),
      joined,
      violationsJoined: joined,
    });
  });

  app.post('/db/violations', (req, res) => {
    try {
      const { id, festival_name, category, race_day, heat_number, rank } = req.body || {};
      if (!festival_name || !heat_number) {
        return res.status(400).json({
          success: false,
          error: 'اسم المهرجان (festival_name) ورقم الشوط (heat_number) مطلوبان لإضافة مخالفة الفحص',
        });
      }
      const saved = dbService.saveDopingViolation({
        id,
        festival_name,
        category: category || 'فطامين',
        race_day: race_day || 'السبت',
        heat_number: Number(heat_number),
        rank: Number(rank || 1),
      });
      const joined = dbService.getViolationsJoinedWithRaceResults();
      res.json({
        success: true,
        violation: saved,
        violations: dbService.getDopingViolations(),
        joined,
        violationsJoined: joined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/db/violations/:id', (req, res) => {
    const deleted = dbService.deleteDopingViolation(req.params.id);
    const joined = dbService.getViolationsJoinedWithRaceResults();
    res.json({
      success: true,
      deleted,
      violations: dbService.getDopingViolations(),
      joined,
      violationsJoined: joined,
    });
  });

  // Social Media News Ingestion Pipeline (YouTube & Instagram via Apify -> Gemini AI Data Cleaning -> pgvector)
  app.get('/db/news', (req, res) => {
    const { platform } = req.query;
    res.json({
      success: true,
      news: dbService.getRaceNews(platform as string),
      hasApifyToken: Boolean(process.env.APIFY_TOKEN),
    });
  });

  app.post('/db/news/ingest', async (req, res) => {
    try {
      const { raw_text, source_url, platform, account_name } = req.body || {};
      if (raw_text && String(raw_text).trim().length > 0) {
        const cleanedRecord = await ingestAndCleanSocialPost({
          raw_text: String(raw_text).trim(),
          source_url: source_url ? String(source_url).trim() : undefined,
          platform: platform === 'instagram' ? 'instagram' : 'youtube',
          account_name: account_name ? String(account_name).trim() : undefined,
        });
        return res.json({
          success: true,
          mode: 'manual_clean',
          ingestedItem: cleanedRecord,
          news: dbService.getRaceNews(),
        });
      }

      const workerResult = await runIngestionWorker();
      return res.json({
        success: true,
        mode: workerResult.mode,
        ingestedCount: workerResult.ingestedCount,
        ingestedItems: workerResult.items,
        news: dbService.getRaceNews(),
      });
    } catch (err: any) {
      console.error('Social news ingest error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/db/news/:id', (req, res) => {
    try {
      const updated = dbService.updateRaceNews(req.params.id, req.body || {});
      if (!updated) {
        return res.status(404).json({ success: false, error: 'الخبر غير موجود' });
      }
      res.json({
        success: true,
        updated,
        news: dbService.getRaceNews(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/db/news/:id', (req, res) => {
    const deleted = dbService.deleteRaceNews(req.params.id);
    res.json({
      success: true,
      deleted,
      news: dbService.getRaceNews(),
    });
  });

  // =========================================================================
  // 6.5 Encrypted API Keys Management (api_settings with AES-256-GCM)
  // =========================================================================
  app.get('/admin/api-settings', (req, res) => {
    res.json({
      success: true,
      settings: dbService.getApiSettings(true),
      encryptionStandard: 'AES-256-GCM (Authenticated Encryption)',
    });
  });

  app.post('/admin/api-settings', (req, res) => {
    try {
      const { id, provider_key, company_name, service_role, plain_api_key, is_active, env_fallback_name, extra_config } =
        req.body || {};
      if (!company_name || !String(company_name).trim()) {
        return res.status(400).json({ success: false, error: 'اسم الشركة (company_name) مطلوب' });
      }
      const saved = dbService.saveApiSetting({
        id,
        provider_key,
        company_name: String(company_name).trim(),
        service_role,
        plain_api_key,
        is_active,
        env_fallback_name,
        extra_config,
      });
      res.json({
        success: true,
        saved,
        settings: dbService.getApiSettings(true),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/admin/api-settings/:id/toggle', (req, res) => {
    const updated = dbService.toggleApiSetting(req.params.id, req.body?.is_active);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });
    }
    res.json({
      success: true,
      updated,
      settings: dbService.getApiSettings(true),
    });
  });

  app.delete('/admin/api-settings/:id', (req, res) => {
    const deleted = dbService.deleteApiSetting(req.params.id);
    res.json({
      success: true,
      deleted,
      settings: dbService.getApiSettings(true),
    });
  });

  // =========================================================================
  // 6.6 Manual Knowledge Injection with Priority Weighting (manual_knowledge + pgvector)
  // =========================================================================
  app.get('/admin/manual-knowledge', (req, res) => {
    res.json({
      success: true,
      items: dbService.getManualKnowledge(),
    });
  });

  app.post('/admin/manual-knowledge', async (req, res) => {
    try {
      const { id, content_text, news_date, track_name, category } = req.body || {};
      if (!content_text || !String(content_text).trim()) {
        return res.status(400).json({ success: false, error: 'نص المعلومة أو الخبر (content_text) مطلوب للتلقين اليدوي' });
      }
      const textToEmbed = `${track_name || ''} ${category || ''} ${String(content_text).trim()}`;
      const vector = await generateEmbedding(textToEmbed);
      const saved = dbService.saveManualKnowledge({
        id,
        content_text: String(content_text).trim(),
        news_date,
        track_name,
        category,
        vector,
      });
      res.json({
        success: true,
        saved,
        items: dbService.getManualKnowledge(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/admin/manual-knowledge/:id', (req, res) => {
    const deleted = dbService.deleteManualKnowledge(req.params.id);
    res.json({
      success: true,
      deleted,
      items: dbService.getManualKnowledge(),
    });
  });

  // =========================================================================
  // 6.7 Engineer AI Gateway Integration Proxy & SSE Streaming (Spec v1.0)
  // =========================================================================
  app.get('/engineer-gateway/config', (req, res) => {
    res.json({
      success: true,
      config: engineerGatewayService.getGatewayConnectionInfo(),
      telemetry: engineerGatewayService.getPresenceAndFlagsSnapshot(),
    });
  });

  app.post('/engineer-gateway/config', (req, res) => {
    try {
      const { baseUrl, serviceKey, isActive } = req.body || {};
      const result = engineerGatewayService.updateGatewayConfig({ baseUrl, serviceKey, isActive });
      res.json({
        success: true,
        config: result.status,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/engineer-gateway/models', async (req, res) => {
    try {
      const data = await engineerGatewayService.getModels();
      res.json(data);
    } catch (err: any) {
      res.status(err.httpStatus || 500).json({
        success: false,
        code: err.code || 'GATEWAY_ERROR',
        error: err.message,
      });
    }
  });

  app.post('/engineer-gateway/conversations', async (req, res) => {
    try {
      const { userId, title, metadata } = req.body || {};
      const data = await engineerGatewayService.createConversation({
        userId: userId || 'usr_salem_hamad',
        title,
        metadata,
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(err.httpStatus || 500).json({
        success: false,
        code: err.code || 'GATEWAY_ERROR',
        error: err.message,
      });
    }
  });

  app.get('/engineer-gateway/conversations', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || 'usr_salem_hamad';
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const data = await engineerGatewayService.listConversations(userId, limit);
      res.json(data);
    } catch (err: any) {
      res.status(err.httpStatus || 500).json({
        success: false,
        code: err.code || 'GATEWAY_ERROR',
        error: err.message,
      });
    }
  });

  app.get('/engineer-gateway/conversations/:id/messages', async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const data = await engineerGatewayService.getConversationMessages(req.params.id, limit);
      res.json(data);
    } catch (err: any) {
      res.status(err.httpStatus || 500).json({
        success: false,
        code: err.code || 'GATEWAY_ERROR',
        error: err.message,
      });
    }
  });

  app.post('/engineer-gateway/chat/completions', async (req, res) => {
    try {
      const {
        userId,
        conversationId,
        model,
        messages,
        temperature,
        max_tokens,
        includeCamelRagContext,
        simulateFailover,
      } = req.body || {};

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'messages array is required' });
      }

      await engineerGatewayService.streamChatCompletion(
        {
          userId: (req.headers['x-user-id'] as string) || userId || 'usr_salem_hamad',
          conversationId:
            (req.headers['x-conversation-id'] as string) || conversationId || 'conv_camel_welcome_01',
          model: model || 'auto',
          messages,
          temperature,
          max_tokens,
          includeCamelRagContext,
          simulateFailover,
        },
        res
      );
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(err.httpStatus || 500).json({
          success: false,
          code: err.code || 'GATEWAY_ERROR',
          error: err.message,
        });
      } else {
        res.end();
      }
    }
  });

  app.post('/engineer-gateway/presence/heartbeat', async (req, res) => {
    try {
      const data = await engineerGatewayService.sendPresenceHeartbeat(req.body || {});
      res.json(data);
    } catch (err: any) {
      res.status(err.httpStatus || 500).json({
        success: false,
        code: err.code || 'GATEWAY_ERROR',
        error: err.message,
      });
    }
  });

  app.post('/engineer-gateway/conversations/:id/flag', async (req, res) => {
    try {
      const { messageId, reporterUserId, reason, details } = req.body || {};
      if (!messageId) {
        return res.status(400).json({ success: false, error: 'messageId is required' });
      }
      const data = await engineerGatewayService.flagMessage(req.params.id, {
        messageId,
        reporterUserId: reporterUserId || 'usr_salem_hamad',
        reason: reason || 'hallucination_or_harmful',
        details,
      });
      res.json(data);
    } catch (err: any) {
      res.status(err.httpStatus || 500).json({
        success: false,
        code: err.code || 'GATEWAY_ERROR',
        error: err.message,
      });
    }
  });

  app.post('/engineer-gateway/verify-acceptance', async (req, res) => {
    try {
      const userId = req.body?.userId || 'usr_salem_hamad';
      const report = await engineerGatewayService.runAcceptanceVerification(userId);
      res.json({ success: true, ...report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Full Two-Way Sync Endpoint for external UI ("هجن الخليج") to push/pull all race results & quick buttons
  app.post('/db/sync', (req, res) => {
    try {
      const syncStats = dbService.syncExternalData(req.body || {});
      res.json({
        success: true,
        message: 'تمت مزامنة وربط بيانات أشواط الهجن وأزرار الاستعلام السريع بنجاح مع قاعدة البيانات المركزية',
        syncedResults: syncStats.syncedResults,
        syncedButtons: syncStats.syncedButtons,
        totalResults: syncStats.totalResults,
        totalQuickButtons: syncStats.totalQuickButtons,
        totalViolations: syncStats.totalViolations,
        results: syncStats.results.map(enrichResultForClient),
        quickButtons: syncStats.quickButtons,
        violationsJoined: syncStats.violationsJoined,
        clientConfig: dbService.getClientBoardConfig(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Remote Client Board Configuration (Controlled exclusively by the Manager from this Admin Dashboard)
  app.get('/client-config', (req, res) => {
    res.json({
      success: true,
      config: dbService.getClientBoardConfig(),
    });
  });

  app.post('/client-config', (req, res) => {
    try {
      const updated = dbService.updateClientBoardConfig(req.body || {});
      res.json({
        success: true,
        config: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/client-logs', (req, res) => {
    res.json({
      success: true,
      logs: dbService.getClientQueryLogs(),
    });
  });

  app.get('/db/groups', (req, res) => {
    res.json(dbService.getGroups());
  });

  app.get('/db/embeddings', (req, res) => {
    res.json(dbService.getChatEmbeddings());
  });

  app.post('/db/semantic-search', async (req, res) => {
    try {
      const { query, limit } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'query is required' });
      }
      const queryVector = await generateEmbedding(query);
      const matches = dbService.searchSemanticVectors(queryVector, limit || 4);
      res.json({ query, matches });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/db/sql-query', (req, res) => {
    const { query } = req.body;
    const result = dbService.executeSqlSimulation(query || 'SELECT * FROM race_results LIMIT 5;');
    res.json(result);
  });

  // 7. Queue & Jobs Endpoints
  app.get('/queue/jobs', (req, res) => {
    res.json({
      metrics: queueService.getMetrics(),
      jobs: queueService.getJobs(30),
    });
  });

  // 8. Anti-Ban Protocols & Logs
  app.get('/anti-ban/status', (req, res) => {
    res.json({
      config: antiBanManager.getConfig(),
      rateLimit: antiBanManager.checkRateLimit(),
      logs: antiBanManager.getLogs(),
    });
  });

  app.post('/anti-ban/config', (req, res) => {
    antiBanManager.updateConfig(req.body);
    res.json(antiBanManager.getConfig());
  });

  // 9. Camel Racing Glossary & Sample Data
  app.get('/glossary', (req, res) => {
    res.json({
      terms: CAMEL_RACING_GLOSSARY,
      promptBiasingText: WHISPER_PROMPT_BIASING,
      sampleMessages: SAMPLE_RACE_MESSAGES,
      dialectIntentMappings: DIALECT_INTENT_MAPPINGS,
    });
  });

  // 10. Code Exporter & Technical Deliverables
  app.get('/export/schema', (req, res) => {
    res.type('text/plain').send(POSTGRES_PGVECTOR_DDL_SCHEMA);
  });

  return app;
}
