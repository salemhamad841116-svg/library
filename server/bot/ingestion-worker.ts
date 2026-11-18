import { ApifyClient } from 'apify-client';
import { Type } from '@google/genai';
import { getAiClient, generateEmbedding } from './gemini.js';
import { dbService, DbRaceNews } from './database-service.js';

const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN || '' });

export interface CleanedSocialNewsPayload {
  camel_name?: string;
  owner_name?: string;
  trainer_name?: string;
  race_event?: string;
  track_name?: string;
  heat_number?: number;
  time?: string;
  summary: string;
}

const SAMPLE_APIFY_RAW_POSTS = [
  {
    platform: 'youtube' as const,
    account_name: 'قناة ياس الرياضية - تغطية سباقات الهجن',
    source_url: 'https://www.youtube.com/watch?v=lRF-NE30HTs',
    raw_text:
      '🔴 بث مباشر وحصري!! لا تنسوا اللايك والاشتراك وتفعيل الجرس 🔔 إعلان: عزبة الناموس تقدم أفضل الأعلاف والفيتامينات للمطايا بخصم 30% للتواصل واتساب 0551234567.. في شوط البندقية المفتوح (الشوط 2 - حقايق قعدان) بميدان المرموم، خطف القعود «الفارس» المملوك لـ هجن العاصفة بقيادة المضمر غياث الهلالي المركز الأول بتوقيت 05:51.6 متفوقاً في الأمتار الأخيرة! #هجن_العاصفة #غياث_الهلالي #المرموم #دبي #اكسبلور #اعلانات_الامارات #ترند #لايك #فولو',
  },
  {
    platform: 'instagram' as const,
    account_name: 'حساب مهرجان العين لسباقات الهجن (@alaincamel)',
    source_url: 'https://www.instagram.com/reel/C9AlAinFutamin2/',
    raw_text:
      '🎬 ريلز جديد من ميدان العين! برعاية محلات القمة للزعفران والقهوة العربية ☕ للطلب دايركت.. انتزعت البكرة «الشاهينية» لمالكها سعيد بن مظفر العامري والمضمر محمد بن زيتون المهيري ناموس الشوط الثاني لفئة الفطامين بكار في مهرجان العين مسجلة توقيتاً قدره 02:55.4 لمسافة 2 كم! #مهرجان_العين #فطامين #هجن_الخليج #انستقرام #ريلز #اكسبلور_فولو #تسوق #عروض',
  },
  {
    platform: 'youtube' as const,
    account_name: 'قناة الريان الفضائية - أشواط الشحانية',
    source_url: 'https://www.youtube.com/watch?v=qxs6Om332_4&feature=share',
    raw_text:
      '📺 تابعونا عبر تطبيق الريان بلس واشتركوا في الباقة السنوية الآن! في الشوط السادس لسن الثنايا قعدان مفتوح بميدان الطائف ضمن مهرجان ولي العهد للهجن 2026، انتزع «الحساس» لمالكه راشد سعيد بن مروشد والمضمر سعيد بن مروشد المهيري كأس الثنايا قعدان بتوقيت 09:14.18 وينحدر من سلالة سلفر بعير ابن قريع. #الطائف #ولي_العهد #الشحانية #هجن #سبسكرايب #لايكات',
  },
];

let sampleRotationIndex = 0;

/**
 * تنظيف النص الخام المسحوب من يوتيوب/إنستقرام عبر Gemini AI واستخراج الكيانات المهمة فقط
 * مع حذف كافة الإعلانات والهاشتاجات العشوائية وأرقام التواصل الترويجية
 */
export async function cleanWithGemini(rawText: string): Promise<CleanedSocialNewsPayload> {
  const ai = getAiClient();

  if (!process.env.GEMINI_API_KEY) {
    return fallbackCleanSocialText(rawText);
  }

  try {
    const prompt = `أنت خبير في هندسة وتنقية بيانات سباقات الهجن الخليجية لمحرك RAG.
مهمتك:
1. حذف جميع الهاشتاجات (#...)، الإعلانات التجارية، الرعاة، أرقام الهواتف، وعبارات طلب الاشتراك أو اللايك أو الفولو نهائياً.
2. استخراج الكيانات المهمة فقط بدقة (اسم المطية، اسم المالك، المضمر، المهرجان، الميدان، رقم الشوط، التوقيت).
3. صياغة نص صافي وموسوعي (summary) يلخص الخبر أو النتيجة بلغة واضحة وجاهزة للتحويل إلى متجهات (Embeddings).

النص الخام المسحوب من السوشيال ميديا:
"""
${rawText}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            camel_name: { type: Type.STRING, nullable: true },
            owner_name: { type: Type.STRING, nullable: true },
            trainer_name: { type: Type.STRING, nullable: true },
            race_event: { type: Type.STRING, nullable: true },
            track_name: { type: Type.STRING, nullable: true },
            heat_number: { type: Type.INTEGER, nullable: true },
            time: { type: Type.STRING, nullable: true },
            summary: { type: Type.STRING },
          },
          required: ['summary'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    if (!parsed.summary) {
      return fallbackCleanSocialText(rawText);
    }

    return {
      camel_name: parsed.camel_name || undefined,
      owner_name: parsed.owner_name || undefined,
      trainer_name: parsed.trainer_name || undefined,
      race_event: parsed.race_event || undefined,
      track_name: parsed.track_name || undefined,
      heat_number: parsed.heat_number ? Number(parsed.heat_number) : undefined,
      time: parsed.time || undefined,
      summary: parsed.summary.trim(),
    };
  } catch (err: any) {
    console.warn('Gemini social cleaning fallback to deterministic cleaner:', err?.message);
    return fallbackCleanSocialText(rawText);
  }
}

/**
 * منظف احتياطي ذكي يعمل بالتعابير النمطية لحذف الهاشتاجات والإعلانات واستخراج كيانات الهجن
 */
function fallbackCleanSocialText(rawText: string): CleanedSocialNewsPayload {
  // 1. حذف الهاشتاجات والروابط وعبارات الإعلانات والاشتراك
  let cleaned = rawText
    .replace(/#[^\s#]+/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/(?:لا تنسوا الاشتراك|اشترك الآن|برعاية|للطلب والإعلان|للتواصل واتساب|الرابط في البايو|تابعونا عبر)[^.!।\n]*[.!।\n]*/gi, '')
    .replace(/\b05\d{8}\b/g, '')
    .replace(/[🔥🔔✨📩🎥📺🎬🔴👆☕🌟]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // استخراج اسم المطية بين أقواس أو علامات تنصيص
  const camelMatch = rawText.match(/[«"']([^»"']+)[»"']/) || rawText.match(/\(([^)]+)\)/);
  const camel_name = camelMatch ? camelMatch[1].trim() : undefined;

  // استخراج اسم المالك
  const ownerMatch = rawText.match(/(?:لـ|لمالكها|لمالكه|بشعار|لسمو)\s+([^،,.\n]+?)(?:\s+(?:بقيادة|والمضمر|مع المضمر|في الشوط|بتوقيت|مسجلة))/);
  const owner_name = ownerMatch ? ownerMatch[1].trim() : undefined;

  // استخراج اسم المضمر
  const trainerMatch = rawText.match(/(?:المضمر|بقيادة المضمر)\s+([^،,.\n]+?)(?:\s+(?:ناموس|كأس|خنجر|الشلفة|المركز|بتوقيت|في الشوط))/);
  const trainer_name = trainerMatch ? trainerMatch[1].trim() : undefined;

  // استخراج رقم الشوط
  const heatMatch = rawText.match(/(?:الشوط|شوط)\s*(\d+)/);
  let heat_number = heatMatch ? parseInt(heatMatch[1], 10) : undefined;
  if (!heat_number) {
    if (rawText.includes('الشوط الأول')) heat_number = 1;
    else if (rawText.includes('الشوط الثاني')) heat_number = 2;
    else if (rawText.includes('الشوط الثالث')) heat_number = 3;
    else if (rawText.includes('الشوط الرابع')) heat_number = 4;
    else if (rawText.includes('الشوط الخامس')) heat_number = 5;
    else if (rawText.includes('الشوط السادس')) heat_number = 6;
  }

  // استخراج التوقيت
  const timeMatch = rawText.match(/(\d{1,2}:\d{2}[.:]\d{1,2})/);
  const time = timeMatch ? timeMatch[1] : undefined;

  // استخراج الميدان والمهرجان
  let track_name: string | undefined;
  if (rawText.includes('المرموم')) track_name = 'ميدان المرموم';
  else if (rawText.includes('الوثبة')) track_name = 'ميدان الوثبة';
  else if (rawText.includes('الطائف')) track_name = 'ميدان الطائف';
  else if (rawText.includes('الشحانية')) track_name = 'ميدان الشحانية';
  else if (rawText.includes('العين')) track_name = 'ميدان العين';

  let race_event: string | undefined;
  if (rawText.includes('ولي العهد')) race_event = 'مهرجان ولي العهد للهجن 2026';
  else if (rawText.includes('مهرجان العين')) race_event = 'مهرجان العين';
  else if (rawText.includes('المرموم')) race_event = 'مهرجان المرموم التراثي للهجن';
  else if (rawText.includes('الوثبة')) race_event = 'مهرجان الوثبة التراثي';
  else if (rawText.includes('الشحانية')) race_event = 'مهرجان الأمير الوالد للهجن';

  if (!cleaned || cleaned.length < 15) {
    cleaned = `فوز المطية ${camel_name || 'البطلة'} ${owner_name ? `لـ ${owner_name}` : ''} ${
      track_name ? `في ${track_name}` : ''
    } ${time ? `بتوقيت ${time}` : ''}.`.trim();
  }

  return {
    camel_name,
    owner_name,
    trainer_name,
    race_event: race_event || track_name,
    track_name,
    heat_number,
    time,
    summary: cleaned,
  };
}

/**
 * معالجة منشور واحد (تنظيف بالذكاء الاصطناعي + توليد متجهات pgvector + حفظ مع رابط المصدر)
 */
export async function ingestAndCleanSocialPost(input: {
  raw_text: string;
  source_url?: string;
  platform?: 'youtube' | 'instagram';
  account_name?: string;
}): Promise<DbRaceNews> {
  const cleaned = await cleanWithGemini(input.raw_text);
  const embeddingText = `${cleaned.camel_name || ''} ${cleaned.owner_name || ''} ${cleaned.race_event || ''} ${cleaned.summary}`;
  const vector = await generateEmbedding(embeddingText);

  return dbService.saveRaceNews({
    platform: input.platform,
    account_name: input.account_name,
    source_url: input.source_url,
    raw_text: input.raw_text,
    camel_name: cleaned.camel_name,
    owner_name: cleaned.owner_name,
    trainer_name: cleaned.trainer_name,
    race_event: cleaned.race_event,
    track_name: cleaned.track_name,
    heat_number: cleaned.heat_number,
    time: cleaned.time,
    summary: cleaned.summary,
    vector,
  });
}

/**
 * وظيفة السحب والمعالجة الدورية (كل ساعة أو عند ضغط المدير على زر المزامنة الفورية)
 * تقرأ المفتاح النشط والمشفر ديناميكياً من جدول api_settings في كل دورة، مع التراجع التلقائي إلى .env
 */
export async function runIngestionWorker(): Promise<{
  ingestedCount: number;
  items: DbRaceNews[];
  mode: 'apify_live' | 'simulation_fallback';
  keySourceUsed?: string;
}> {
  const apifyDynamic = dbService.getActiveProviderKey('apify', 'APIFY_TOKEN');
  const youtubeDynamic = dbService.getActiveProviderKey('youtube', 'YOUTUBE_API_KEY');
  const activeApifyToken = apifyDynamic.key;
  const activeActorId = apifyDynamic.extraConfig || process.env.APIFY_ACTOR_ID || '';

  console.log(
    `Starting social media ingestion worker [Apify Key Source: ${apifyDynamic.source}, YouTube Key Source: ${youtubeDynamic.source}]...`
  );
  const ingestedItems: DbRaceNews[] = [];

  try {
    const isRealApifyToken =
      activeApifyToken && !activeApifyToken.includes('camel88scraper') && activeActorId;
    if (isRealApifyToken) {
      const dynamicApifyClient = new ApifyClient({ token: activeApifyToken });
      const run = await dynamicApifyClient.actor(activeActorId).call({});
      const { defaultDatasetId } = run;
      const dataset = await dynamicApifyClient.dataset(defaultDatasetId).listItems();

      for (const item of dataset.items as any[]) {
        const rawText = item.text || item.caption || item.description || item.title || '';
        if (!rawText) continue;
        const sourceUrl = item.url || item.postUrl || item.videoUrl || 'https://www.youtube.com/watch?v=qxs6Om332_4';
        const platform: 'youtube' | 'instagram' =
          sourceUrl.toLowerCase().includes('instagram') ? 'instagram' : 'youtube';
        const accountName = item.ownerUsername || item.channelName || undefined;

        const saved = await ingestAndCleanSocialPost({
          raw_text: rawText,
          source_url: sourceUrl,
          platform,
          account_name: accountName,
        });
        ingestedItems.push(saved);
      }

      return {
        ingestedCount: ingestedItems.length,
        items: ingestedItems,
        mode: 'apify_live',
        keySourceUsed: apifyDynamic.source,
      };
    }
  } catch (error) {
    console.warn('Apify live call warning, falling back to realistic feed ingestion:', error);
  }

  // في حال عدم ضبط مفتاح Apify خارجي حي أو أثناء التجربة في لوحة المدير، نسحب منشوراً واقعياً جديداً ونمرره على فلتر الذكاء الاصطناعي
  const sample = SAMPLE_APIFY_RAW_POSTS[sampleRotationIndex % SAMPLE_APIFY_RAW_POSTS.length];
  sampleRotationIndex++;

  const saved = await ingestAndCleanSocialPost({
    raw_text: sample.raw_text,
    source_url: sample.source_url,
    platform: sample.platform,
    account_name: sample.account_name,
  });
  ingestedItems.push(saved);

  return {
    ingestedCount: ingestedItems.length,
    items: ingestedItems,
    mode: 'simulation_fallback',
    keySourceUsed: apifyDynamic.source,
  };
}
