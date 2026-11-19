import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { getDb } from './server/db/platformDb.js';
import { resolveDomainTier, botDomainSecurityGuard, BOT_PUBLIC_DOMAIN, ADMIN_BOOKS_DOMAINS } from './server/domainRouter.js';
import { createBotPublicRouter } from './server/bot/publicRouter.js';
import { createBotAdminRouter, createLibraryPublishRouter } from './server/bot/adminRouter.js';
import { runIngestionWorker } from './server/bot/ingestion-worker.js';
import { createInternalSyncRouter } from './server/sync/internalRouter.js';
import { startWaraqaSyncWorker } from './server/sync/waraqaSync.js';

dotenv.config();

// Ensure SQLite database and tables are ready on startup
getDb();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

// Body Parsers with generous limits for audio/media uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration for headless external mobile & web clients
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Client-Platform');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Host-based Security Guard (Zero Admin Exposure on bot.misruq.com)
app.use(botDomainSecurityGuard);

// ---------------------------------------------------------------------------
// 1. Bot Endpoints
// ---------------------------------------------------------------------------
// Dedicated /api/bot namespace
const botPublicRouter = createBotPublicRouter();
app.use('/api/bot', botPublicRouter);

// Headless compatibility aliases directly at /api/chat, /api/audio, /api/tts
app.use('/api/chat', (req, res, next) => {
  req.url = '/chat';
  botPublicRouter(req, res, next);
});
app.use('/api/audio', (req, res, next) => {
  req.url = `/audio${req.url}`;
  botPublicRouter(req, res, next);
});
app.use('/api/tts', (req, res, next) => {
  req.url = '/tts';
  botPublicRouter(req, res, next);
});

// Admin Bot Router (Q&A rules, Audio library, Model settings, API keys vault, SSE chat logs)
app.use('/api/bot/admin', createBotAdminRouter());

// Real-Time Publish-on-Save Router for Books & Notes
app.use('/api/library', createLibraryPublishRouter());

// Internal push webhook from masruq_rag_backend (Waraqa) — secret-protected, blocked on public domains
app.use('/api/internal', createInternalSyncRouter());

// ---------------------------------------------------------------------------
// 2. Existing Library Endpoints (Email, Health, Geo, Note AI)
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const tier = resolveDomainTier(req);
  res.json({
    status: 'ok',
    tier,
    activeDomains: {
      botDomain: BOT_PUBLIC_DOMAIN,
      adminDomains: ADMIN_BOOKS_DOMAINS,
    },
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/send-email', async (req, res) => {
  try {
    const apiKey = process.env.RESEND_API_KEY || '';
    if (!apiKey) {
      res.status(400).json({ error: 'مفتاح RESEND_API_KEY غير متاح في بيئة الخادم.' });
      return;
    }
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
      res.status(400).json({ error: 'البريد والموضوع والمحتوى حقول مطلوبة.' });
      return;
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'الملاحظات المتداخلة <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (result.error) {
      console.warn('Resend Email warning:', result.error);
      res.json({ success: true, warning: result.error.message });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Resend Email Error:', error);
    res.json({ success: true, warning: error.message || 'فشل إرسال البريد ببروتوكول Resend المباشر.' });
  }
});

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('مفتاح GEMINI_API_KEY غير متاح في بيئة التشغيل.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.get('/api/user/geo-info', (req, res) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';
    const cfCountry = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || req.headers['x-appengine-country'];
    const countryCode = typeof cfCountry === 'string' ? cfCountry.toUpperCase() : 'SA';
    const userAgent = req.headers['user-agent'] || '';

    res.json({
      ip,
      countryCode,
      country: countryCode === 'SA' ? 'المملكة العربية السعودية' : countryCode,
      city: req.headers['cf-ipcity'] || 'الرياض',
      region: req.headers['cf-region'] || 'المنطقة الوسطى',
      timezone: req.headers['cf-timezone'] || 'Asia/Riyadh',
      userAgent,
      detectedAt: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Failed to extract geo info' });
  }
});

// Note Editor AI tools (Summarize, Rephrase, Grammar, Translate, Tasks, Titles, Table)
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'محتوى الملاحظة مطلوب.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `قم بتلخيص النص والملاحظة التالية بشكل احترافي، دقيق، ومنظم في نقاط رئيسية بلغة نص الملاحظة نفسها:\n\n${content}`,
    });
    res.json({ result: response.text || 'تعذر إنشاء التلخيص.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

app.post('/api/ai/rephrase', async (req, res) => {
  try {
    const { text, style } = req.body;
    if (!text) {
      res.status(400).json({ error: 'النص مطلوب للإعادة الصياغة.' });
      return;
    }
    const stylePromptMap: Record<string, string> = {
      professional: 'بأسلوب رسمي واحترافي ممتاز',
      concise: 'بأسلوب مختصر، موجز، ومباشر دون حشو',
      expanded: 'مع التوسع والشرح المفصل وإضافة تفاصيل توضيحية',
      simplified: 'بأسلوب مبسط جداً وسهل الفهم',
      creative: 'بأسلوب إبداعي وجذاب',
    };
    const targetStyle = stylePromptMap[style] || stylePromptMap.professional;
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `أعد صياغة النص التالي ${targetStyle}:\n\n${text}\n\nأرجع النص المعدل فقط دون تعليقات إضافية.`,
    });
    res.json({ result: response.text || text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

app.post('/api/ai/fix-grammar', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'النص مطلوب للتصحيح.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `قم بتصحيح كافة الأخطاء النحوية والإملائية والمطبعية في النص التالي مع الحفاظ على المعنى الأصلي كاملاً:\n\n${text}\n\nأرجع النص المصحح فقط.`,
    });
    res.json({ result: response.text || text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

app.post('/api/ai/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ error: 'النص ولغة الهدف مطلوبان.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `ترجم النص التالي بدقة واحترافية إلى اللغة (${targetLang}):\n\n${text}\n\nأرجع الترجمة فقط.`,
    });
    res.json({ result: response.text || text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

app.post('/api/ai/extract-tasks', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: 'المحتوى مطلوب لاستخراج المهام.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `استخرج جميع المهام والإجراءات المطلوبة من الملاحظة التالية كقائمة مهام منظمة JSON:\n\n${content}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'نص المهمة' },
              priority: { type: Type.STRING, description: 'الأولوية: high, medium, low' },
            },
            required: ['text', 'priority'],
          },
        },
      },
    });

    let tasks = [];
    if (response.text) {
      try {
        tasks = JSON.parse(response.text.trim());
      } catch {
        /* ignore parse */
      }
    }
    res.json({ tasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

app.post('/api/ai/suggest-titles', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: 'المحتوى مطلوب لاقتراح العناوين.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `اقترح 5 عناوين قصيرة وجذابة ومناسبة جداً للملاحظة التالية:\n\n${content}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    let titles: string[] = [];
    if (response.text) {
      try {
        titles = JSON.parse(response.text.trim());
      } catch {
        /* ignore parse */
      }
    }
    res.json({ titles });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

app.post('/api/ai/generate-table', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'وصف الجدول مطلوب.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `قم بإنشاء جدول HTML غني أو جدول Markdown منظم ينفذ الوصف التالي:\n\n${prompt}\n\nأرجع كود الجدول بتنسيق HTML نظيف ومناسب للعرض مباشرة في محرر الملاحظات.`,
    });
    res.json({ result: response.text || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, noteContext } = req.body;
    if (!message) {
      res.status(400).json({ error: 'السؤال مطلوب.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `أنت مساعد ذكي متخصص في إدارة وتنسيق الملاحظات. إنسق مع المستخدم بناءً على سياق الملاحظة المرفق.\n\nسياق الملاحظة:\n${noteContext || 'لا يوجد محتوى حالي'}\n\nسؤال المستخدم:\n${message}`,
    });
    res.json({ result: response.text || 'لم يتم استلام رد من النموذج.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

// Hourly Social Ingestion Runner
setInterval(() => {
  runIngestionWorker().catch((err) => console.warn('Ingestion worker cycle warning:', err?.message || err));
}, 3600000);

// ---------------------------------------------------------------------------
// 3. Multi-Domain SPA Serving (bot.html for bot, index.html for library)
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      // Don't intercept API routes
      if (req.originalUrl.startsWith('/api')) {
        next();
        return;
      }

      try {
        const tier = resolveDomainTier(req);
        const htmlFileName = tier === 'bot' ? 'bot.html' : tier === 'chat' ? 'chat.html' : 'index.html';
        const htmlPath = path.resolve(process.cwd(), htmlFileName);
        let template = fs.readFileSync(htmlPath, 'utf-8');
        const transformUrl = tier === 'library' ? req.originalUrl : `/${htmlFileName}`;
        template = await vite.transformIndexHtml(transformUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // index:false so '/' falls through to the tier-aware handler (bot.html on bot.*, chat.html on chat.*)
    app.use(express.static(distPath, { index: false }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      const tier = resolveDomainTier(req);
      const htmlFileName = tier === 'bot' ? 'bot.html' : tier === 'chat' ? 'chat.html' : 'index.html';
      const targetFile = path.join(distPath, htmlFileName);
      if (fs.existsSync(targetFile)) {
        res.sendFile(targetFile);
      } else {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Unified Books & Bot Server running on http://0.0.0.0:${PORT}`);
    console.log(`   ├─ Public Bot Domain:     http://${BOT_PUBLIC_DOMAIN} (or ?app=bot / /bot)`);
    console.log(`   └─ Admin & Books Domain:  http://${ADMIN_BOOKS_DOMAINS[0]} (index.html)`);
  });

  // Read-only live sync from waraqa.misruq.com (masruq_rag_backend) when WARAQA_DB_PATH is set
  startWaraqaSyncWorker();
}

startServer();
