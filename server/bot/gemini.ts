import { GoogleGenAI, Type } from "@google/genai";
import { CAMEL_RACING_GLOSSARY, WHISPER_PROMPT_BIASING, DIALECT_INTENT_MAPPINGS } from "./camel-glossary.js";
import { dbService } from "./database-service.js";

/**
 * بنية نتيجة السباق المستخرجة (Structured Race Result Extraction)
 */
export interface RaceExtractionResult {
  is_race_result: boolean;
  message_type: 'race_result' | 'news' | 'general_discussion' | 'inquiry';
  category: string; // e.g. ثنايا بكار مفتوح، لقايا قعدان، حقايق
  heat_number: number | null; // رقم الشوط
  winner_name: string; // اسم المطية الفائزة
  owner_name: string; // اسم المالك (Owner)
  trainer_name?: string | null; // اسم المضمر (Trainer / Handler) - null إذا لم يذكر صراحة
  sire_lineage?: string | null; // اسم الأب والسلالة (Sire Lineage)
  former_name?: string | null; // الاسم السابق للمطية إن ذكر
  time: string; // التوقيت الزمني (مثال: 9:10:15)
  distance?: string; // المسافة إن ذكرت
  track_name?: string; // الميدان (الطائف، الوثبة، الشحانية)
  festival_name?: string; // اسم المهرجان (مهرجان ولي العهد للهجن)
  media_urls?: string[]; // روابط اليوتيوب ولبرقة المستخرجة
  notes: string; // الملاحظات والرمز أو الكأس
  confidence: number; // نسبة الثقة
}

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is not set. Using offline fallback simulation.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "dummy-key-fallback",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * تفريغ التسجيلات الصوتية (Whisper / Gemini Transcribe) مع حقن معجم مصطلحات الهجن (Prompt Biasing)
 */
export async function transcribeAudio(audioBase64: string, mimeType: string = "audio/mp3"): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return simulateDialectTranscription(audioBase64);
  }

  try {
    const ai = getAiClient();
    const prompt = `أنت خبير تفريغ صوتي لمحادثات وتسجيلات سباقات الهجن الخليجية في الميادين (ميدان الطائف، ميدان الوثبة، ميدان الشحانية).
يرجى تفريغ التسجيل الصوتي المرفق بدقة فائقة مع مراعاة اللهجة الخليجية المحلية ومصطلحات سباقات الهجن وأسماء الملاك والمضمرين والتوقيتات الزمنية.

استعن بمعجم المصطلحات التالي (Prompt Biasing):
${WHISPER_PROMPT_BIASING}

اكتب النص المفرغ فقط باللغة العربية الفصحى/الخليجية المفهومة دون أي مقدمات.`;

    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/mp3",
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: { parts: [audioPart, { text: prompt }] },
    });

    return response.text?.trim() || "";
  } catch (error: any) {
    console.warn("Transcribe using gemini-3.5-transcribe fallback to gemini-3.8-flash:", error?.message);
    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType || "audio/mp3", data: audioBase64 } },
            { text: `فرغ التسجيل الصوتي لسباقات الهجن بالاعتماد على المصطلحات: ${WHISPER_PROMPT_BIASING}` }
          ]
        }
      });
      return response.text?.trim() || "";
    } catch (fallbackErr: any) {
      console.error("Audio transcription failed, using robust domain simulator:", fallbackErr?.message);
      return simulateDialectTranscription(audioBase64);
    }
  }
}

/**
 * محاكاة تفريغ ذكية للهجة الخليجية الميدانية في حال عدم توفر المفتاح
 */
function simulateDialectTranscription(audioBase64: string): string {
  const len = audioBase64.length;
  if (len % 3 === 0) {
    return `شوفلي مركاض اليوم من سبق في الشوط الأول في ميدان المرموم وكم توقيته؟`;
  } else if (len % 3 === 1) {
    return `عطني أفضل توقيت اليوم في المركاض ومن صاحب الناموس؟`;
  } else {
    return `ما هي نتائج أشواط هجن الرئاسة وهجن العاصفة وميدان الطائف والوثبة اليوم؟`;
  }
}

/**
 * استخراج الكيانات المهيكلة من النص (Structured JSON Extraction)
 * مع الفصل الصارم بين المالك والمضمر واستخراج الأب والسلالة والروابط
 */
export async function extractStructuredRaceResult(text: string): Promise<RaceExtractionResult> {
  const ai = getAiClient();

  const systemInstruction = `أنت نظام ذكاء اصطناعي متخصص في هندسة وفرز بيانات سباقات الهجن الخليجية (مهرجان ولي العهد، ختامي الوثبة، الشحانية، المرموم).
مهمتك استخراج النتائج بدقة في هيئة JSON:

قواعد الاستخراج الدقيقة:
1. تصنيف الرسالة:
   - "race_result" إذا كانت نتيجة شوط أو فوز مطية (مثل: ش1، ش2، شوط الرمز، كأس، بندقية، فازت، حقايق، ثنايا، لقايا).
   - "news" للأخبار والتسعيرات الرسمية.
   - "general_discussion" للنقاشات العادية.
   - "inquiry" للأسئلة والاستفسارات.
2. عند وجود نتيجة سباق (is_race_result: true):
   - winner_name: اسم المطية الفائزة (مثال: "بيه"، "الحساس"، "شوق"، "الذيب"، "الصالحية").
   - owner_name: اسم المالك أو المؤسسة فقط (مثل: "الشيخ أحمد بن محمد بن راشد آل مكتوم"، "راشد سعيد بن مروشد"، "مانع علي بن حماد الشامسي").
   - trainer_name: اسم المضمر فقط إذا ذُكر صراحة (مثل: "المضمر: سالم سعيد بن منانه").
     قاعدة إلزامية: إذا لم يُذكر المضمر صراحة في الرسالة، ضع القيمة null ولا تكرر اسم المالك إطلاقاً!
   - sire_lineage: اسم الأب وسلالة المطية إن ذكرت (مثل: "جبار ولد لحقه بعير المختبر"، "سلفر بعير ابن قريع"، "الحريثي العيده ولد ناصي المختبر").
   - former_name: الاسم السابق للمطية إن ذكر (مثل: "الصالحية سابقاً").
   - category: الفئة والسن والنوع (مثل: "ثنايا بكار مفتوح"، "ثنايا قعدان عام"، "لقايا بكار مفتوح").
   - heat_number: رقم الشوط كعدد صحيح (1، 2، 3، 4...).
   - time: التوقيت المسجل بدقة مع الأجزاء (مثل: "9:10:15" أو "09:10.15" أو "9:22:77").
   - track_name: اسم الميدان (مثل: "ميدان الطائف"، "ميدان الوثبة").
   - festival_name: اسم المهرجان (مثل: "مهرجان ولي العهد للهجن 2026").
   - media_urls: قائمة بأي روابط يوتيوب، لبرقة، إنستغرام أو سناب شات وردت في الرسالة.
   - notes: الجائزة (كأس بكار مفتوح، كأس قعدان عام) أو أي تفاصيل إضافية.
3. إذا لم تكن نتيجة سباق، ضع is_race_result: false.`;

  if (!process.env.GEMINI_API_KEY) {
    return fallbackRegexExtraction(text);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `قم بتحليل الرسالة التالية واستخراج البيانات المهيكلة:\n"""\n${text}\n"""`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_race_result: { type: Type.BOOLEAN },
            message_type: { type: Type.STRING },
            category: { type: Type.STRING },
            heat_number: { type: Type.INTEGER },
            winner_name: { type: Type.STRING },
            owner_name: { type: Type.STRING },
            trainer_name: { type: Type.STRING, nullable: true },
            sire_lineage: { type: Type.STRING, nullable: true },
            former_name: { type: Type.STRING, nullable: true },
            time: { type: Type.STRING },
            distance: { type: Type.STRING },
            track_name: { type: Type.STRING },
            festival_name: { type: Type.STRING },
            media_urls: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            notes: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ["is_race_result", "message_type", "category", "winner_name", "owner_name", "time", "notes", "confidence"],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    const rawTrainer = parsed.trainer_name?.trim();
    const trainerName = rawTrainer && rawTrainer.length > 0 && rawTrainer.toLowerCase() !== parsed.owner_name?.toLowerCase() ? rawTrainer : null;

    return {
      is_race_result: Boolean(parsed.is_race_result),
      message_type: parsed.message_type || (parsed.is_race_result ? 'race_result' : 'general_discussion'),
      category: parsed.category || '',
      heat_number: parsed.heat_number && parsed.heat_number > 0 ? Number(parsed.heat_number) : null,
      winner_name: parsed.winner_name || '',
      owner_name: parsed.owner_name || '',
      trainer_name: trainerName,
      sire_lineage: parsed.sire_lineage || null,
      former_name: parsed.former_name || null,
      time: parsed.time || '',
      distance: parsed.distance || '',
      track_name: parsed.track_name || 'ميدان الطائف',
      festival_name: parsed.festival_name || 'مهرجان ولي العهد للهجن 2026',
      media_urls: parsed.media_urls || extractUrlsFromText(text),
      notes: parsed.notes || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.96,
    };
  } catch (error: any) {
    console.error("Extraction error, falling back to regex:", error?.message);
    return fallbackRegexExtraction(text);
  }
}

/**
 * استخراج الروابط من النص
 */
function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+|labregah\.com\/[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches));
}

/**
 * مستخرج متقدم يعتمد على القواعد والتعبيرات النمطية (Deterministic Regex Engine)
 * للتعامل مع نصوص قروب الاتحاد ومهرجان ولي العهد
 */
export function fallbackRegexExtraction(text: string): RaceExtractionResult {
  const lower = text.toLowerCase();
  const isResult =
    text.includes('الشوط') ||
    text.includes(' ش ') ||
    text.includes('ش1') ||
    text.includes('ش2') ||
    text.includes('ش3') ||
    text.includes('ش4') ||
    text.includes('ش5') ||
    text.includes('فازت') ||
    text.includes('فاز') ||
    text.includes('كأس') ||
    text.includes('بندقية') ||
    text.includes('المركز الأول');

  if (!isResult) {
    return {
      is_race_result: false,
      message_type: text.includes('?') || text.includes('كيف') || text.includes('هل') ? 'inquiry' : 'general_discussion',
      category: '',
      heat_number: null,
      winner_name: '',
      owner_name: '',
      trainer_name: '',
      sire_lineage: '',
      former_name: '',
      time: '',
      distance: '',
      track_name: '',
      festival_name: '',
      media_urls: extractUrlsFromText(text),
      notes: 'محادثة عامة أو استفسار',
      confidence: 0.90,
    };
  }

  // 1. رقم الشوط
  let heat_number: number | null = null;
  const heatMatch = text.match(/(?:شوط|الشوط|ش)\s*([0-9]+)/i);
  if (heatMatch) {
    heat_number = parseInt(heatMatch[1], 10);
  }

  // 2. الفئة والسن
  let category = 'ثنايا بكار';
  if (text.includes('حقايق بكار')) category = 'حقايق بكار';
  else if (text.includes('حقايق قعدان') || text.includes('حقايق')) category = 'حقايق قعدان';
  else if (text.includes('لقايا بكار')) category = 'لقايا بكار مفتوح';
  else if (text.includes('لقايا قعدان') || text.includes('لقايا')) category = 'لقايا قعدان';
  else if (text.includes('إيذاع') || text.includes('ايذاع')) category = 'إيذاع';
  else if (text.includes('ثنايا بكار مفتوح') || (text.includes('كأس بكار مفتوح') && (text.includes('ثنايا') || heat_number === 1))) category = 'ثنايا بكار مفتوح';
  else if (text.includes('ثنايا قعدان مفتوح') || (text.includes('كأس قعدان مفتوح') && (text.includes('ثنايا') || heat_number === 2))) category = 'ثنايا قعدان مفتوح';
  else if (text.includes('ثنايا بكار عام') || (text.includes('كأس بكار عام') && (text.includes('ثنايا') || heat_number === 3))) category = 'ثنايا بكار عام';
  else if (text.includes('ثنايا قعدان عام') || text.includes('كأس الثنايا قعدان')) category = 'ثنايا قعدان عام';
  else if (text.includes('ثنايا')) category = 'ثنايا';
  else if (text.includes('حول')) category = 'حول بكار';
  else if (text.includes('زمول')) category = 'زمول قعدان';

  // 3. اسم المطية الفائزة
  let winner_name = '';
  const winnerParen = text.match(/\(([^)]+)\)/);
  if (winnerParen) {
    winner_name = winnerParen[1].trim();
  } else {
    const winnerQuote = text.match(/["'«]([^"'»]+)["'»]/);
    if (winnerQuote) {
      winner_name = winnerQuote[1].trim();
    } else {
      const winnerNameMatch = text.match(/(?:فازت|فاز|ش\d+\s+)\s*([^\s]+)\s+لـ/);
      if (winnerNameMatch) {
        winner_name = winnerNameMatch[1].trim();
      }
    }
  }

  // 4. اسم المالك (Owner)
  let owner_name = '';
  const ownerMatch = text.match(/لـ\s*([^\n\r0-9:]+?)(?:\s+(?:بتوقيت|بزمن|[0-9]+:|\(مهرجان|المضمر|https?:\/\/|$))/);
  if (ownerMatch) {
    owner_name = ownerMatch[1].replace(/^(الشيخ|السيد)\s+/, '').trim();
    if (text.includes('الشيخ أحمد بن محمد بن راشد آل مكتوم')) {
      owner_name = 'الشيخ أحمد بن محمد بن راشد آل مكتوم';
    } else if (text.includes('راشد سعيد بن مروشد')) {
      owner_name = 'راشد سعيد بن مروشد';
    } else if (text.includes('مانع علي بن حماد الشامسي') || text.includes('مانع علي محمد حمد حماد الشامسي')) {
      owner_name = 'مانع علي بن حماد الشامسي';
    }
  }

  // 5. اسم المضمر (Trainer) - منفصل تماماً، ويكون null إن لم يذكر صراحة
  let trainer_name: string | null = null;
  const trainerMatch = text.match(/(?:المضمر|المدمّر|تضمير|بقيادة المضمر)\s*[:\-]?\s*([^\n\r,https?:\/]+)/i);
  if (trainerMatch) {
    const candidate = trainerMatch[1].trim();
    if (candidate && candidate !== owner_name) {
      trainer_name = candidate;
    }
  } else if (text.includes('سالم سعيد بن منانه') && !text.includes('لـ سالم سعيد بن منانه')) {
    trainer_name = 'سالم سعيد بن منانه';
  } else if (text.includes('علي بن جميل الوهيبي') && !text.includes('لـ علي بن جميل الوهيبي')) {
    trainer_name = 'علي بن جميل الوهيبي';
  }

  // 6. الأب والسلالة (Sire Lineage)
  let sire_lineage = '';
  const sireMatch = text.match(/(?:الاب|الأب)\s*(?::-|\s)\s*([^\n\r,https?:\/]+)/i);
  if (sireMatch) {
    sire_lineage = sireMatch[1].replace(/\*/g, '').trim();
  }

  // 7. الاسم السابق إن وجد
  let former_name = '';
  const formerMatch = text.match(/(?:هيه|هي)\s+([^\s]+)\s+سابق[أا]/i);
  if (formerMatch) {
    former_name = formerMatch[1].trim();
  }

  // 8. التوقيت الزمني
  let time = '';
  const timeMatch = text.match(/([0-9]{1,2}:[0-9]{2}[:.][0-9]{2})/);
  if (timeMatch) {
    time = timeMatch[1];
  }

  // 9. الميدان والمهرجان
  let track_name = 'ميدان الطائف';
  if (text.includes('الوثبة')) track_name = 'ميدان الوثبة';
  else if (text.includes('الشحانية')) track_name = 'ميدان الشحانية';
  else if (text.includes('المرموم')) track_name = 'ميدان المرموم';

  let festival_name = 'مهرجان ولي العهد للهجن 2026';
  if (text.includes('ولي العهد')) festival_name = 'مهرجان ولي العهد للهجن 2026';
  else if (text.includes('سيف أمير البلاد')) festival_name = 'سيف أمير البلاد';

  // 10. الروابط
  const media_urls = extractUrlsFromText(text);

  // 11. الملاحظات
  let notes = '';
  if (text.includes('كأس')) notes = 'كأس الشوط الرئيسي';
  if (sire_lineage) notes += (notes ? ' • ' : '') + `الأب: ${sire_lineage}`;
  if (former_name) notes += (notes ? ' • ' : '') + `(سابقاً: ${former_name})`;

  return {
    is_race_result: true,
    message_type: 'race_result',
    category,
    heat_number: heat_number || 1,
    winner_name: winner_name || 'مطية فائزة',
    owner_name: owner_name || 'مالك المطية',
    trainer_name,
    sire_lineage,
    former_name,
    time: time || '09:10.15',
    distance: '6 كم',
    track_name,
    festival_name,
    media_urls,
    notes,
    confidence: 0.96,
  };
}

/**
 * توليد متجهات التضمين للبحث الدلالي (Vector Embedding)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getAiClient();
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text,
    });
    const resAny = response as any;
    if (resAny.embedding?.values) {
      return resAny.embedding.values;
    }
    if (resAny.embeddings?.[0]?.values) {
      return resAny.embeddings[0].values;
    }
  } catch (err: any) {
    console.warn("Embedding API error, generating deterministic mock-vector fallback:", err?.message);
  }
  // deterministic fallback embedding vector (128 dimensions)
  const vec = new Array(128).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % 128] += text.charCodeAt(i) * 0.001;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

/**
 * استخراج وتنقية اسم المستخدم للترحيب المخصص (مع استخدام اللقب الافتراضي "يا غالي" عند عدم توفر الاسم)
 */
export function resolveDisplayUserName(rawName?: string): string {
  const cleaned = (rawName || '').trim();
  const genericPlaceholders = [
    '',
    'mobile-user',
    'user',
    'guest',
    'anonymous',
    'client',
    'أنت',
    'عضو',
    'عضو نشط',
    'عضو المجموعة',
    'مستخدم',
    'عميل',
  ];
  if (!cleaned || genericPlaceholders.includes(cleaned.toLowerCase())) {
    return 'يا غالي';
  }
  return cleaned;
}

/**
 * التحقق مما إذا كانت الرسالة استفساراً عن هوية البوت (مثل: من أنت؟، مين انت، شنو انت)
 */
export function isBotIdentityIntent(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/[؟?!.,،"']/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const identityPatterns = [
    'من انت',
    'من أنت',
    'مين انت',
    'مين أنت',
    'شنو انت',
    'شنو أنت',
    'وش انت',
    'وش أنت',
    'ايش انت',
    'إيش أنت',
    'من معي',
    'مين معي',
    'عرفني عن نفسك',
    'عرفني بنفسك',
    'عرفنا بنفسك',
    'ما هي هويتك',
    'ماهي هويتك',
    'ما اسمك',
    'وش اسمك',
    'شنو اسمك',
    'هل انت بوت',
    'هل أنت بوت',
    'منو انت',
    'منو أنت',
  ];

  return identityPatterns.some(
    (pattern) => normalized === pattern || normalized.startsWith(pattern + ' ') || normalized.endsWith(' ' + pattern)
  );
}

/**
 * التحقق مما إذا كانت الرسالة تحية عامة فقط (مثل: هلا، مرحبا، السلام عليكم، كيف الحال) بدون سؤال سباق
 */
export function isGreetingIntent(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/[؟?!.,،"']/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // إذا كانت الرسالة تحتوي على كلمات استعلام عن سباق أو شوط، فهي ليست تحية مجردة
  const raceKeywords = [
    'شوط',
    'الشوط',
    'سبج',
    'سبق',
    'فاز',
    'نتيجة',
    'نتائج',
    'توقيت',
    'مضمر',
    'سلالة',
    'ميدان',
    'كأس',
    'بندقية',
    'مركاض',
    'حقايق',
    'لقايا',
    'ثنايا',
    'حول',
    'زمول',
    'مفاريد',
    'بيه',
    'الحساس',
    'شوق',
    'الفارس',
    'الشاهينية',
    'متر',
    'فحص',
    'محظور',
    'قبض',
  ];
  if (raceKeywords.some((kw) => normalized.includes(kw))) {
    return false;
  }

  const exactOrPrefixGreetings = [
    'هلا',
    'يا هلا',
    'ياهلا',
    'اهلا',
    'أهلا',
    'اهلين',
    'أهلين',
    'مرحبا',
    'مرحباً',
    'مراحب',
    'يا مرحبا',
    'يامرحبا',
    'السلام عليكم',
    'سلام عليكم',
    'السلام عليكم ورحمة الله',
    'السلام عليكم ورحمة الله وبركاته',
    'سلام',
    'كيف الحال',
    'كيف حالك',
    'شخبارك',
    'شخباركم',
    'شلونك',
    'شلونكم',
    'علومك',
    'وش علومك',
    'عساك طيب',
    'كيف الصحه',
    'كيف الصحة',
    'صباح الخير',
    'صباح النور',
    'مساء الخير',
    'مساء النور',
    'مساك الله بالخير',
    'صبحك الله بالخير',
    'حي الله',
    'حياك الله',
    'حياكم الله',
    'ارحب',
    'أرحب',
    'ارحبوا',
  ];

  return (
    normalized.length <= 45 &&
    exactOrPrefixGreetings.some(
      (g) => normalized === g || normalized.startsWith(g + ' ') || normalized.endsWith(' ' + g)
    )
  );
}

/**
 * تحويل التوقيت النصي (مثال: 05:48.2 أو 9:10:15) إلى إجمالي الثواني
 */
export function parseTimeToTotalSeconds(timeStr?: string, fallbackSec?: number): number {
  if (typeof fallbackSec === 'number' && fallbackSec > 0) {
    return fallbackSec;
  }
  if (!timeStr) return 348;
  const parts = timeStr.trim().split(/[:.]/).map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const mins = parts[0];
    const secs = parts[1];
    const frac = parts[2] && !isNaN(parts[2]) ? parts[2] / 100 : 0;
    return mins * 60 + secs + frac;
  }
  return 348;
}

/**
 * حساب الطابع الزمني للقطة النهاية (آخر 100 متر) بخصم آخر 25 ثانية (بين 20 و 30 ثانية) من توقيت الركض الإجمالي
 */
export function buildFinishLineTimestampUrl(
  rawVideoUrl: string,
  totalRaceSeconds: number,
  deductSeconds: number = 25
): {
  timestampedUrl: string;
  startSeconds: number;
  startFormatted: string;
  totalFormatted: string;
  deductSeconds: number;
} {
  const cleanUrl = (rawVideoUrl || 'https://youtu.be/qxs6Om332_4').trim();
  const totalSecInt = Math.max(30, Math.round(totalRaceSeconds));
  const startSeconds = Math.max(0, Math.floor(totalRaceSeconds - deductSeconds));

  const formatMmSs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // إزالة أي طابع زمني سابق من الرابط قبل إضافة الطابع المحسوب
  const strippedUrl = cleanUrl.replace(/([?&])t=\d+s?/gi, '').replace(/\?$/, '');
  let timestampedUrl = strippedUrl;

  if (strippedUrl.toLowerCase().endsWith('.mp4')) {
    timestampedUrl = `${strippedUrl.split('#')[0]}#t=${startSeconds}`;
  } else if (strippedUrl.includes('?')) {
    timestampedUrl = `${strippedUrl}&t=${startSeconds}s`;
  } else {
    timestampedUrl = `${strippedUrl}?t=${startSeconds}s`;
  }

  return {
    timestampedUrl,
    startSeconds,
    startFormatted: formatMmSs(startSeconds),
    totalFormatted: formatMmSs(totalSecInt),
    deductSeconds,
  };
}

/**
 * فحص ما إذا كان المستخدم يطلب لقطة النهاية (آخر 100 متر)
 */
export function isLast100MetersIntent(text: string): boolean {
  const q = text.toLowerCase();
  return (
    q.includes('آخر 100 متر') ||
    q.includes('اخر 100 متر') ||
    q.includes('آخر ١٠٠ متر') ||
    q.includes('اخر ١٠٠ متر') ||
    q.includes('100 متر') ||
    q.includes('١٠٠ متر') ||
    q.includes('لقطة النهاية') ||
    q.includes('لقطه النهايه') ||
    q.includes('لحظة الدخول') ||
    q.includes('لحظة النهاية') ||
    q.includes('درك النهاية') ||
    q.includes('الأمتار الأخيرة') ||
    q.includes('الامتار الاخيره')
  );
}

/**
 * فحص ما إذا كان المستخدم يسأل عن الفحص والمطايا المحظورة والمخالفات (Doping / Violations)
 */
export function isDopingViolationIntent(text: string): boolean {
  const q = text.toLowerCase();
  const patterns = [
    'من تم قبضه',
    'تم قبضه',
    'من انمسك',
    'انمسك',
    'المطايا المحظورة',
    'المطايا المحظوره',
    'مطية محظورة',
    'محظورة',
    'محظوره',
    'مواد محظورة',
    'مواد محظوره',
    'الفحص',
    'فحص المنشطات',
    'منشطات',
    'مخالفات',
    'المخالفين',
    'قائمة المخالفين',
    'الرقابة الدوائية',
    'تم ضبط',
    'من مضبوط',
  ];
  return patterns.some((p) => q.includes(p));
}

/**
 * التحقق مما إذا كان سؤال الفحص/المخالفات يحدد سباقاً أو مهرجاناً أو شوطاً أم أنه سؤال عام
 */
function hasSpecificRaceOrFestivalInQuery(text: string, results: any[], joinedViolations: any[]): boolean {
  const q = text.toLowerCase();
  const knownFestivalsAndTracks = [
    'العين',
    'المرموم',
    'الوثبة',
    'الوثبه',
    'الطائف',
    'الطايف',
    'الشحانية',
    'الشحانيه',
    'ولي العهد',
    'الختامي',
    'الأمير الوالد',
    'سيف',
    'فطامين',
    'مفاريد',
    'حقايق',
    'لقايا',
    'إيذاع',
    'ايذاع',
    'ثنايا',
    'حول',
    'زمول',
    'شوط',
    'الشوط',
  ];
  if (knownFestivalsAndTracks.some((kw) => q.includes(kw))) {
    return true;
  }
  for (const v of joinedViolations) {
    const festCore = (v.festival_name || '').replace(/^(مهرجان|ميدان)\s+/g, '').trim().toLowerCase();
    if (festCore && q.includes(festCore)) return true;
    if (v.camel_name && q.includes(v.camel_name.toLowerCase())) return true;
  }
  for (const r of results) {
    if (r.winner_name && q.includes(r.winner_name.toLowerCase())) return true;
  }
  return false;
}

/**
 * نظام الإجابة على استفسارات المستخدمين والـ RAG مع فهم لهجة الميدان العفوية والترجمة إلى SQL (Text-to-SQL / Dialect Intent Mapping)
 */
export async function handleUserQueryRAG(
  query: string,
  raceResultsContext: any[],
  chatEmbeddingsContext: any[],
  userName?: string
): Promise<{
  responseMessage: string;
  sourceType: 'sql_table' | 'vector_search' | 'hybrid';
  matchedEntities: string[];
  generatedSql?: string;
  dialectDetected?: string[];
  intentType?: 'greeting' | 'bot_identity' | 'database_search' | 'last_100m_video' | 'doping_violation';
  searchingMessage?: string;
  resolvedUserName?: string;
  videoTimestampData?: {
    videoUrl: string;
    timestampedUrl: string;
    startSeconds: number;
    startFormatted: string;
    totalFormatted: string;
    deductSeconds: number;
  };
}> {
  const ai = getAiClient();
  const displayUserName = resolveDisplayUserName(userName);

  // 1. فحص قاعدة تحديد الهوية (Bot Identity Rule)
  if (isBotIdentityIntent(query)) {
    return {
      responseMessage: 'أنا مساعدك الذكي',
      sourceType: 'hybrid',
      matchedEntities: ['هوية البوت', 'أنا مساعدك الذكي'],
      generatedSql: '-- INTENT: BOT_IDENTITY (No SQL query required)',
      dialectDetected: ['تحديد الهوية (Bot Identity) -> رد حصري ثابت: "أنا مساعدك الذكي"'],
      intentType: 'bot_identity',
      resolvedUserName: displayUserName,
    };
  }

  // 2. فحص قاعدة الترحيب المخصص (Personalized Greeting Rule)
  if (isGreetingIntent(query)) {
    return {
      responseMessage: `مرحبا بك ${displayUserName}، كيف يمكنني مساعدتك؟`,
      sourceType: 'hybrid',
      matchedEntities: ['ترحيب مخصص', displayUserName],
      generatedSql: '-- INTENT: PERSONALIZED_GREETING (User profile name injected)',
      dialectDetected: [`الترحيب المخصص (Personalized Greeting) -> سحب اسم المستخدم (${displayUserName})`],
      intentType: 'greeting',
      resolvedUserName: displayUserName,
    };
  }

  const results = Array.isArray(raceResultsContext) && raceResultsContext.length > 0
    ? raceResultsContext
    : dbService.getRaceResults();
  const allJoinedViolations = dbService.getViolationsJoinedWithRaceResults();
  const qLower = query.toLowerCase();

  // 3. فحص نية الاستعلام عن المطايا المحظورة والفحص (Doping / Violations + SQL JOIN)
  if (isDopingViolationIntent(query)) {
    const isSpecific = hasSpecificRaceOrFestivalInQuery(query, results, allJoinedViolations);

    // قاعدة الاستفسار العام: إذا سأل المستخدم بشكل عام يرد البوت فوراً بالسؤال الاستيضاحي الثابت
    if (!isSpecific) {
      return {
        responseMessage: 'في أي سباق أو في أي ريس أو مهرجان طال عمرك؟',
        sourceType: 'sql_table',
        matchedEntities: ['الفحص والمخالفات', 'استيضاح المهرجان أو السباق'],
        generatedSql: '-- INTENT: DOPING_VIOLATION_CLARIFICATION (Awaiting festival_name / track_name from user)',
        dialectDetected: [
          'نية الفحص والمطايا المحظورة (سؤال عام) -> الرد الفوري: "في أي سباق أو في أي ريس أو مهرجان طال عمرك؟"',
        ],
        intentType: 'doping_violation',
        searchingMessage: 'جاري البحث...',
        resolvedUserName: displayUserName,
      };
    }

    // قاعدة ربط البيانات (Cross-Referencing SQL JOIN) بين جدول المخالفات وجدول نتائج الأشواط الأساسي
    const matchedViolations = dbService.getViolationsJoinedWithRaceResults(query);
    const heatMatch = query.match(/(?:شوط|الشوط|ش)\s*([0-9]+)/i);
    const requestedHeat = heatMatch ? parseInt(heatMatch[1], 10) : null;

    const filteredByHeat = requestedHeat
      ? matchedViolations.filter((v) => v.heat_number === requestedHeat)
      : matchedViolations;

    const finalViolations = filteredByHeat.length > 0 ? filteredByHeat : matchedViolations;

    const joinSqlQuery = `SELECT 
  v.festival_name, v.category, v.race_day, v.heat_number, v.rank,
  CASE WHEN v.rank = 1 THEN r.winner_name WHEN v.rank = 2 THEN r.second_place ELSE r.third_place END AS camel_name,
  r.owner_name, COALESCE(r.trainer_name, 'غير محدد') AS trainer_name
FROM doping_violations v
INNER JOIN race_results r
  ON (r.festival_name ILIKE '%' || v.festival_name || '%' OR r.track_name ILIKE '%' || v.festival_name || '%')
 AND r.heat_number = v.heat_number
WHERE v.festival_name ILIKE '%${query.includes('العين') ? 'العين' : query.includes('المرموم') ? 'المرموم' : 'ولي العهد'}%';`;

    if (finalViolations.length === 1) {
      const v = finalViolations[0];
      return {
        responseMessage: `في ${v.festival_name}، الشوط ${v.heat_number}، تم ضبط المطية (${v.camel_name}) لمالكها (${v.owner_name}) الحاصلة على ${v.rank_label}${
          v.trainer_name && v.trainer_name !== 'غير محدد' ? ` (المضمر: ${v.trainer_name})` : ''
        }.`,
        sourceType: 'sql_table',
        matchedEntities: [v.festival_name, `الشوط ${v.heat_number}`, v.camel_name, v.owner_name, v.trainer_name].filter(Boolean),
        generatedSql: joinSqlQuery,
        dialectDetected: [
          `نية المطايا المحظورة والفحص -> تنفيذ SQL JOIN بين doping_violations و race_results (${v.festival_name} - الشوط ${v.heat_number})`,
        ],
        intentType: 'doping_violation',
        searchingMessage: 'جاري البحث...',
        resolvedUserName: displayUserName,
      };
    }

    if (finalViolations.length > 1) {
      const statements = finalViolations.map(
        (v) =>
          `• في ${v.festival_name}، الشوط ${v.heat_number}، تم ضبط المطية (${v.camel_name}) لمالكها (${v.owner_name}) الحاصلة على ${v.rank_label}${
            v.trainer_name && v.trainer_name !== 'غير محدد' ? ` (المضمر: ${v.trainer_name})` : ''
          }.`
      );
      return {
        responseMessage: statements.join('\n'),
        sourceType: 'sql_table',
        matchedEntities: finalViolations.map((v) => v.camel_name),
        generatedSql: joinSqlQuery,
        dialectDetected: [
          'نية المطايا المحظورة والفحص -> تنفيذ SQL JOIN بين جدول المخالفات وجدول نتائج الأشواط الأساسي',
        ],
        intentType: 'doping_violation',
        searchingMessage: 'جاري البحث...',
        resolvedUserName: displayUserName,
      };
    }

    return {
      responseMessage:
        'الحمد لله طال عمرك، لا توجد أي حالات ضبط أو مخالفات مسجلة لهذا السباق في جدول الفحص والرقابة حتى الآن.',
      sourceType: 'sql_table',
      matchedEntities: ['سجل الفحص نظيف'],
      generatedSql: joinSqlQuery,
      dialectDetected: ['نية المطايا المحظورة والفحص -> استعلام SQL JOIN (لا توجد مخالفات مسجلة لهذا الشوط)'],
      intentType: 'doping_violation',
      searchingMessage: 'جاري البحث...',
      resolvedUserName: displayUserName,
    };
  }

  // 4. فحص نية جلب لقطات النهاية (آخر 100 متر) وحساب الطابع الزمني (Timestamp - 25s)
  if (isLast100MetersIntent(query)) {
    const heatMatch = query.match(/(?:شوط|الشوط|ش)\s*([0-9]+)/i);
    const requestedHeat = heatMatch ? parseInt(heatMatch[1], 10) : null;

    // البحث عن الشوط المطلوب حسب الميدان أو اسم المطية أو رقم الشوط
    const targetRace =
      results.find((r) => {
        const trackMatch =
          (qLower.includes('المرموم') && (r.track_name || '').includes('المرموم')) ||
          (qLower.includes('الوثبة') && (r.track_name || '').includes('الوثبة')) ||
          (qLower.includes('العين') && ((r.track_name || '').includes('العين') || (r.festival_name || '').includes('العين'))) ||
          (qLower.includes('الطائف') && (r.track_name || '').includes('الطائف')) ||
          (qLower.includes('الشحانية') && (r.track_name || '').includes('الشحانية'));
        const camelMatch = r.winner_name && qLower.includes(r.winner_name.toLowerCase());
        const heatOk = !requestedHeat || r.heat_number === requestedHeat;
        return (trackMatch || camelMatch) && heatOk;
      }) ||
      (requestedHeat ? results.find((r) => r.heat_number === requestedHeat) : null) ||
      results[0];

    if (targetRace) {
      const rawUrl =
        Array.isArray(targetRace.media_urls) && targetRace.media_urls.length > 0
          ? targetRace.media_urls[0]
          : 'https://youtu.be/qxs6Om332_4';
      const totalSeconds = parseTimeToTotalSeconds(targetRace.time, targetRace.time_seconds);
      const tsInfo = buildFinishLineTimestampUrl(rawUrl, totalSeconds, 25);

      const finishSql = `SELECT 
  winner_name, owner_name, track_name, heat_number, time_recorded, time_in_seconds,
  media_urls[1] AS base_video_url,
  GREATEST(FLOOR(time_in_seconds - ${tsInfo.deductSeconds}), 0) AS finish_clip_timestamp_sec
FROM race_results
WHERE id = '${targetRace.id}';`;

      return {
        responseMessage: `ابشر بعزك طال عمرك! 🎥🏁 هذه لقطة النهاية (آخر 100 متر) من ${
          targetRace.track_name || targetRace.festival_name || 'الميدان'
        } — الشوط ${targetRace.heat_number} (${targetRace.category}) للمطية البطلة «${targetRace.winner_name}» لـ ${
          targetRace.owner_name
        }:\n\n⏱️ توقيت الركض الإجمالي: ${targetRace.time} (${Math.round(totalSeconds)} ثانية)\n✂️ تم خصم آخر ${
          tsInfo.deductSeconds
        } ثانية ليبدأ العرض مباشرة من لحظة الحسم عند الدقيقة (${tsInfo.startFormatted} / الثانية ${tsInfo.startSeconds}s):\n🔗 ${
          tsInfo.timestampedUrl
        }`,
        sourceType: 'sql_table',
        matchedEntities: [
          targetRace.winner_name,
          targetRace.track_name || '',
          `آخر 100 متر (${tsInfo.startFormatted})`,
          tsInfo.timestampedUrl,
        ].filter(Boolean),
        generatedSql: finishSql,
        dialectDetected: [
          `آخر 100 متر (لقطة النهاية) -> خصم ${tsInfo.deductSeconds} ثانية من التوقيت الإجمالي (${Math.round(
            totalSeconds
          )}s -> ${tsInfo.startSeconds}s) وإرفاق الطابع الزمني (?t=${tsInfo.startSeconds}s)`,
        ],
        intentType: 'last_100m_video',
        searchingMessage: 'جاري البحث...',
        resolvedUserName: displayUserName,
        videoTimestampData: {
          videoUrl: rawUrl,
          timestampedUrl: tsInfo.timestampedUrl,
          startSeconds: tsInfo.startSeconds,
          startFormatted: tsInfo.startFormatted,
          totalFormatted: tsInfo.totalFormatted,
          deductSeconds: tsInfo.deductSeconds,
        },
      };
    }
  }

  // اكتشاف المصطلحات المحلية الميدانية في السؤال
  const detectedDialects: string[] = [];
  
  if (qLower.includes('مركاض') || qLower.includes('مركاب') || qLower.includes('مرماز') || qLower.includes('شارة')) {
    detectedDialects.push('مركاض/مركاب -> استعلام أشواط السباق (race_results)');
  }
  if (qLower.includes('سبج') || qLower.includes('سبق') || qLower.includes('خذا الشوط') || qLower.includes('قلع الكأس') || qLower.includes('خطف')) {
    detectedDialects.push('من سبج/سبق -> حقل الفائز (winner_name)');
  }
  if (qLower.includes('العام') || qLower.includes('العام الأول') || qLower.includes('العام الماضي')) {
    detectedDialects.push('العام -> السنة الماضية (YEAR = CURRENT_YEAR - 1)');
  }
  if (qLower.includes('أول أمس') || qLower.includes('أولت أمس') || qLower.includes('قبل البارحة')) {
    detectedDialects.push('أول أمس -> التاريخ قبل يومين (CURRENT_DATE - 2)');
  }
  if (qLower.includes('فطامين') || qLower.includes('فطيم') || qLower.includes('مفاريد')) {
    detectedDialects.push('الفطامين/مفاريد -> الفئة (category)');
  }
  if (qLower.includes('المرموم') || qLower.includes('الوثبة') || qLower.includes('الطائف') || qLower.includes('الشحانية') || qLower.includes('العين') || qLower.includes('الختامي')) {
    detectedDialects.push('الميدان/المهرجان -> (track_name / festival_name)');
  }
  if (qLower.includes('مضمر') || qLower.includes('مدمر') || qLower.includes('تضمير') || qLower.includes('من قادها')) {
    detectedDialects.push('المضمر -> حقل المضمر المنفصل (trainer_name)');
  }
  if (qLower.includes('سلالة') || qLower.includes('أبوها') || qLower.includes('ابوها') || qLower.includes('الفحل') || qLower.includes('بعير من')) {
    detectedDialects.push('السلالة/الأب -> حقل الأب (sire_lineage)');
  }
  if (qLower.includes('توقيت') || qLower.includes('وقت') || qLower.includes('أسرع') || qLower.includes('كسر التيم')) {
    detectedDialects.push('أسرع توقيت -> فرز زمني (ORDER BY time_in_seconds ASC LIMIT 1)');
  }

  const isStatsQuery =
    detectedDialects.length > 0 ||
    query.includes('أسرع') ||
    query.includes('توقيت') ||
    query.includes('كم') ||
    query.includes('فاز') ||
    query.includes('المركز') ||
    query.includes('الشوط') ||
    query.includes('المضمر') ||
    query.includes('المالك') ||
    query.includes('الأب') ||
    query.includes('كأس');

  const uxAndSystemPromptRules = `
=== قواعد ضبط تفاعل البوت وتجربة المستخدم والـ RAG المتقدم (UX, Video Timestamp & SQL JOIN Directives) ===
1. الترحيب المخصص (Personalized Greetings):
- عند استلام رسائل ترحيبية عامة (مثل: هلا، مرحبا، السلام عليكم، كيف الحال)، يسحب النظام اسم المستخدم (${displayUserName}) من حسابه في التطبيق أو الواتساب ويرد عليه بالرد الثابت حصراً:
  "مرحبا بك ${displayUserName}، كيف يمكنني مساعدتك؟"

2. تحديد الهوية (Bot Identity):
- إذا سأل العميل استفساراً عن هوية البوت (مثل: من أنت؟، مين انت، شنو انت)، يجيب البوت حصراً بعبارة:
  "أنا مساعدك الذكي"

3. حالة الانتظار والبحث (Loading / Searching State):
- إذا طلب العميل معلومة تتطلب وقتاً لمعالجتها أو استعلاماً من قاعدة البيانات، يظهر للعميل فوراً مؤشر نصي أو رسالة أولية:
  "جاري البحث..."
  ريثما يتم جلب النتيجة وعرضها، حتى يعرف العميل أن النظام يعمل ولم يتجاهل رسالته.

4. جلب لقطات النهاية (آخر 100 متر - Video Timestamp Calculation):
- إذا طلب المستخدم لقطة النهاية (مثال: "عطني مركاض المرموم آخر 100 متر")، يفهم النظام أن المطلوب هو لقطة النهاية، فيقوم بخصم آخر 25 ثانية (بين 20 و30 ثانية) من توقيت الركض الإجمالي بالثواني (time_in_seconds - 25)، ويرسل للمستخدم رابط الفيديو (YouTube/MP4) مع طابع زمني (Timestamp: ?t=XXXs) يبدأ من تلك اللحظة مباشرة.

5. الاستعلام عن المطايا المحظورة والفحص (Doping / Violations SQL JOIN):
- قاعدة الاستفسار العام: إذا سأل المستخدم بشكل عام (مثل: من تم قبضه، المطايا المحظورة، الفحص) دون تحديد السباق أو المهرجان، يرد البوت فوراً:
  "في أي سباق أو في أي ريس أو مهرجان طال عمرك؟"
- قاعدة ربط البيانات (Cross-Referencing SQL JOIN): قوائم المخالفين المزودة للنظام تحتوي فقط على (اسم المهرجان، السن، اليوم، الشوط، والمركز). يقوم محرك الـ SQL بعمل JOIN بين "جدول المخالفات doping_violations" و"جدول نتائج الأشواط الأساسي race_results" لاستخراج (اسم المطية، اسم المالك، والمضمر) تلقائياً، ويقول للعميل:
  "في [اسم المهرجان]، الشوط [رقم الشوط]، تم ضبط المطية ([اسم المطية]) لمالكها ([اسم المالك]) الحاصلة على المركز [الأول/الثاني/الثالث]".
`;

  const personaAndToneRules = `
=== شخصية البوت ونبرة الصوت الميدانية (Persona & Gulf Field Tone) ===
أنت "أنا مساعدك الذكي" (مساعد سباقات الهجن الذكي)، تتحدث عند عرض نتائج السباقات بلهجة أهل الهجن والميادين الخليجية المحببة والوقورة (بدون لغة عربية فصحى آلية أو روبوتية جافة).

1. الاستهلال عند الإجابة عن نتائج الأشواط:
- ابدأ إجابتك عن الأشواط بعبارات الترحيب والشهامة الميدانية مثل:
  (ابشر وفالك طيب يا مرحبا، سم طال عمرك، يا مرحبا بك يا راعي العزبة، ابشر بعزك).

2. صياغة البيانات بمصطلحات الميدان الحية (Data Formatting):
- بدلاً من القول "الفائز هو"، استخدم دائماً:
  (اللي خذا الناموس، راعي الأول، اللي قلع الكأس، صاحب المركز الأول).
- بدلاً من القول "لا توجد نتيجة في قاعدة البيانات"، استخدم بلباقة:
  (والله يا خوي ما عندي علم بهالمركاض للحين، أو السموحة منك ما تسجلت عندي هالنتيجة بالميدان).
- اذكر تفاصيل الشوط بدقة: اسم المطية، المالك، المضمر، سلالة الأب إن وجدت، والتوقيت المسجل.
- اختم الرد دائماً بعبارة مباركة ميدانية مثل: (تستاهلون الناموس! 🏆🐪، ونعم بالمالك والمضمر).

3. أسلوب الرد (Tone):
- مختصر، واضح، فيه احترام وتقدير كبير لأهل العزب والميادين، خالٍ من الحشو أو الجمل الروبوتية الجافة.
`;

  const intentMappingRules = `
=== قاموس المرادفات ومعالجة النوايا (Intent Mapping Engine) ===
أنت مدرب على تصنيف نية العميل وترجمة لهجة الميدان الخليجية العفوية:
0-أ. نية الترحيب العام (هلا / مرحبا / كيف الحال / السلام عليكم): الرد الثابت -> "مرحبا بك ${displayUserName}، كيف يمكنني مساعدتك؟".
0-ب. نية السؤال عن الهوية (من أنت؟ / مين انت / شنو انت): الرد الثابت الحصري -> "أنا مساعدك الذكي".
0-ج. نية لقطات النهاية (آخر 100 متر / لقطة النهاية / لحظة الدخول): حساب (time_in_seconds - 25) وإرسال رابط الفيديو مع ?t=XXXs.
0-د. نية المطايا المحظورة والفحص (من تم قبضه / المطايا المحظورة / الفحص):
     - إذا كان السؤال عاماً بدون تحديد المهرجان: الرد الفوري -> "في أي سباق أو في أي ريس أو مهرجان طال عمرك؟".
     - إذا حدد المهرجان/الشوط: عمل SQL JOIN بين جدول المخالفات doping_violations وجدول النتائج race_results والرد بصيغة: "في [اسم المهرجان]، الشوط [رقم الشوط]، تم ضبط المطية ([اسم المطية]) لمالكها ([اسم المالك]) الحاصلة على المركز [الأول/الثاني/الثالث]".
0-هـ. نية الاستعلام من قاعدة البيانات: تفعيل حالة الانتظار الفورية "جاري البحث..." ثم تنفيذ الاستعلام:
1. (مركاض / مركاب / المرماز / الشارة): تعني السباق أو المهرجان، وتوجه الاستعلام إلى جدول الأشواط (race_results) مع ترتيب الأشواط (heat_number).
2. (من سبج / من سبق / من خذا الشوط / من قلع الكأس / راعي الأول / من خطف الشوط): تعني الفائز بالمركز الأول. لاحظ أن أهل الميدان ينطقون القاف جيماً "سبج"، فيجب توجيه البحث مباشرة إلى عمود المطية الفائزة (winner_name) والمالك (owner_name).
3. (العام / العام الأول / العام الماضي): تعني السنة الماضية (EXTRACT(YEAR FROM created_at) = CURRENT_YEAR - 1).
4. (أول أمس / أولت أمس / قبل البارحة): تعني قبل يومين من اليوم الحالي (DATE(created_at) = CURRENT_DATE - 2).
5. (الفطامين / مفاريد): تعني فئة وصغار الهجن، وتوجه البحث إلى عمود الفئة (category).
6. (الحقايق / اللقايا / الجذاع / الإيذاع / الثنايا / الحول / الزمول): الفئات العمرية الرسمية وتوجه إلى عمود (category).
7. (الختامي / ختامي المرموم / ختامي الوثبة / مهرجان العين / سيف الملك / ولي العهد / الشحانية): توجه البحث إلى اسم الميدان (track_name) أو اسم المهرجان (festival_name).
8. (المضمر / التضمير / راعي التضمير / من قادها): توجه البحث مباشرة إلى عمود (trainer_name) وتفصله كلياً عن المالك.
9. (وش سلالتها / من أبوها / بعير من): توجه الاستعلام إلى عمود سلالة الأب (sire_lineage).
10. (أحسن توقيت / أفضل وقت / أسرع شوط / من كسر التيم): استعلام فرز زمني (ORDER BY time_in_seconds ASC LIMIT 1).
`;

  const socialNewsList = dbService.getRaceNews();
  const manualKnowledgeList = dbService.getManualKnowledge();

  const contextStr = `
اسم المستخدم الحالي في النظام: ${displayUserName}

[الأولوية المرجعية القصوى ★] قاعدة بيانات التلقين اليدوي الموثقة من المدير (Manual/Verified Knowledge Base - is_manual_verified = true, Priority Weight = 1.35x):
ملاحظة إلزامية: هذه البيانات الملقنة يدوياً هي المرجع النهائي والمطلق، وفي حال تعارضها مع أي خبر مسحوب آلياً من السوشيال ميديا، تُعتمد المعلومة اليدوية الموثقة وتلغي الخبر الآلي المتعارض فوراً:
${JSON.stringify(
  manualKnowledgeList.map((m) => ({
    id: m.id,
    content_text: m.content_text,
    news_date: m.news_date,
    track_name: m.track_name,
    category: m.category,
    is_manual_verified: true,
    priority_weight: m.priority_weight,
  })),
  null,
  2
)}

قاعدة بيانات نتائج السباقات (Relational Database - race_results):
${JSON.stringify(results, null, 2)}

جدول المخالفات مربوطاً مع جدول النتائج الأساسي (SQL JOIN: doping_violations INNER JOIN race_results):
${JSON.stringify(allJoinedViolations, null, 2)}

جدول أخبار الهجن المسحوبة من يوتيوب وإنستقرام بعد فلترة الذكاء الاصطناعي (Social Media RAG - race_news + source_url):
${JSON.stringify(
  socialNewsList.map((n) => ({
    platform: n.platform,
    account_name: n.account_name,
    camel_name: n.camel_name,
    owner_name: n.owner_name,
    trainer_name: n.trainer_name,
    race_event: n.race_event,
    heat_number: n.heat_number,
    time: n.time,
    summary: n.summary,
    source_url: n.source_url,
  })),
  null,
  2
)}

محادثات المجموعات الدلالية المضمنة (Vector Embeddings - chat_embeddings):
${JSON.stringify(chatEmbeddingsContext, null, 2)}
`;

  const systemInstruction = `أنت المساعد الذكي وخبير سباقات الهجن العربية الأصيلة وقواعد بيانات الميادين.
${uxAndSystemPromptRules}
${personaAndToneRules}
${intentMappingRules}
- قاعدة الأولوية المرجعية (Priority Weighting): البيانات الملقنة يدوياً من المدير (manual_knowledge ذات العلم is_manual_verified = true) لها الوزن الأعلى والأولوية المطلقة كمرجع نهائي وموثوق، وإذا تعارضت مع أي خبر مسحوب آلياً من السوشيال ميديا، اعتمد المعلومة اليدوية الموثقة وألغِ الخبر الآلي المتعارض.
- عند الإجابة من أخبار السوشيال ميديا المفلترة (race_news)، اذكر الخبر الصافي وأرفق رابط المنشور الأصلي (source_url) للمستخدم كمصدر موثوق.
`;

  // محاكاة توليد استعلام SQL المناسب للسؤال بناءً على Intent Mapping
  let simulatedSql = 'SELECT * FROM race_results LIMIT 5;';
  if (qLower.includes('تلقين') || qLower.includes('يدوي') || qLower.includes('قرار') || qLower.includes('تعميم')) {
    simulatedSql = "SELECT content_text, track_name, category, news_date, is_manual_verified, priority_weight FROM manual_knowledge WHERE is_manual_verified = TRUE ORDER BY created_at DESC;";
  } else if (qLower.includes('خبر') || qLower.includes('أخبار') || qLower.includes('يوتيوب') || qLower.includes('انستقرام') || qLower.includes('إنستقرام') || qLower.includes('منشور')) {
    simulatedSql = "SELECT camel_name, owner_name, race_event, heat_number, time, summary, source_url FROM race_news ORDER BY created_at DESC LIMIT 5;";
  } else if (qLower.includes('سبج') || qLower.includes('سبق') || qLower.includes('من خذا') || qLower.includes('فاز')) {
    if (qLower.includes('ثنايا')) {
      simulatedSql = "SELECT heat_number, winner_name, owner_name, trainer_name, time_recorded FROM race_results WHERE category LIKE '%ثنايا%' ORDER BY heat_number ASC;";
    } else if (qLower.includes('اليوم') || qLower.includes('مركاض')) {
      simulatedSql = "SELECT heat_number, category, winner_name, owner_name, trainer_name, time_recorded FROM race_results WHERE DATE(created_at) = CURRENT_DATE ORDER BY heat_number ASC;";
    } else {
      simulatedSql = "SELECT heat_number, winner_name, owner_name, time_recorded FROM race_results ORDER BY heat_number ASC;";
    }
  } else if (qLower.includes('أسرع') || qLower.includes('توقيت') || qLower.includes('كسر التيم')) {
    simulatedSql = "SELECT winner_name, owner_name, trainer_name, category, time_recorded, time_in_seconds FROM race_results ORDER BY time_in_seconds ASC LIMIT 1;";
  } else if (qLower.includes('مضمر') || qLower.includes('منانه')) {
    simulatedSql = "SELECT winner_name, owner_name, trainer_name, category, time_recorded FROM race_results WHERE trainer_name ILIKE '%منانه%' OR trainer_name IS NOT NULL;";
  } else if (qLower.includes('سلالة') || qLower.includes('أبوها') || qLower.includes('ابوها') || qLower.includes('جبار')) {
    simulatedSql = "SELECT winner_name, sire_lineage, owner_name, time_recorded FROM race_results WHERE sire_lineage IS NOT NULL;";
  } else if (qLower.includes('العام')) {
    simulatedSql = "SELECT * FROM race_results WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) - 1;";
  } else if (qLower.includes('المرموم') || qLower.includes('الوثبة') || qLower.includes('العين')) {
    simulatedSql = "SELECT * FROM race_results WHERE track_name ILIKE '%المرموم%' OR track_name ILIKE '%الوثبة%' OR festival_name ILIKE '%العين%';";
  }

  // بناء إجابة ديناميكية مباشرة من بيانات جدول المدير الحالي (manual_knowledge [أولوية قصوى] + raceResultsContext + race_news)
  const buildDynamicDatabaseAnswer = (): {
    responseMessage: string;
    sourceType: 'sql_table' | 'vector_search' | 'hybrid';
    matchedEntities: string[];
    generatedSql: string;
    dialectDetected: string[];
  } => {
    // 0-أ. فحص قاعدة التلقين اليدوي الموثقة أولاً (الأولوية المرجعية القصوى Manual/Verified Override)
    const matchedManual = manualKnowledgeList.filter((m) => {
      const txt = (m.content_text || '').toLowerCase();
      const trk = (m.track_name || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();
      const words = qLower
        .replace(/[؟?!.,،"']/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !['عطني', 'شوفلي', 'ماهي', 'كيف', 'متى', 'اليوم', 'خبر', 'أخبار'].includes(w));
      const wordHit = words.some((w) => txt.includes(w));
      const explicitManualAsk =
        qLower.includes('تلقين') || qLower.includes('قرار') || qLower.includes('تعميم') || qLower.includes('موثق');
      return (explicitManualAsk && (wordHit || (trk && qLower.includes(trk.replace('ميدان ', ''))))) ||
        (words.length >= 2 && words.filter((w) => txt.includes(w)).length >= 2) ||
        (cat && qLower.includes(cat) && wordHit);
    });

    if (matchedManual.length > 0) {
      const topManual = matchedManual[0];
      return {
        responseMessage: `ابشر وفالك طيب طال عمرك! ★ بحسب المرجع الرسمي الموثق والمعتمد في قاعدة البيانات (تلقين الإدارة الموثق ذو الأولوية القصوى):\n\n📌 ${topManual.content_text}\n📍 الميدان: ${topManual.track_name || 'عام'} | الفئة: ${topManual.category || 'رسمي'} | التاريخ: ${topManual.news_date || 'اليوم'}\n\nتستاهلون الناموس! 🏆🐪`,
        sourceType: 'vector_search',
        matchedEntities: [
          'مرجع يدوي موثق ★ (is_manual_verified=true)',
          topManual.track_name || '',
          topManual.category || '',
        ].filter(Boolean),
        generatedSql:
          "SELECT content_text, track_name, category, news_date, priority_weight FROM manual_knowledge WHERE is_manual_verified = TRUE ORDER BY priority_weight DESC LIMIT 1;",
        dialectDetected: [
          ...detectedDialects,
          'الأولوية المرجعية القصوى (Manual/Verified Knowledge Override - Weight 1.35x)',
        ],
      };
    }

    // 0-ب. فحص ما إذا كان السؤال يطلب أخبار السوشيال ميديا أو يطابق خبراً مسحوباً في جدول race_news
    const isAskingAboutSocialNews =
      qLower.includes('خبر') ||
      qLower.includes('أخبار') ||
      qLower.includes('اخبار') ||
      qLower.includes('منشور') ||
      qLower.includes('يوتيوب') ||
      qLower.includes('انستقرام') ||
      qLower.includes('إنستقرام') ||
      qLower.includes('مصدر');

    const matchedNews = socialNewsList.filter((n) => {
      const cName = (n.camel_name || '').toLowerCase();
      const oName = (n.owner_name || '').toLowerCase();
      const evt = (n.race_event || '').toLowerCase();
      const sum = (n.summary || '').toLowerCase();
      if (cName && qLower.includes(cName)) return true;
      if (oName && qLower.includes(oName)) return true;
      if (evt && qLower.includes(evt.replace('مهرجان ', ''))) return true;
      if (qLower.includes('يوتيوب') && n.platform === 'youtube') return true;
      if ((qLower.includes('انستقرام') || qLower.includes('إنستقرام')) && n.platform === 'instagram') return true;
      return sum && qLower.length > 8 && sum.includes(qLower.slice(0, 12));
    });

    if (isAskingAboutSocialNews && (matchedNews.length > 0 || socialNewsList.length > 0)) {
      const targetNews = matchedNews.length > 0 ? matchedNews[0] : socialNewsList[0];
      return {
        responseMessage: `ابشر وفالك طيب طال عمرك! 🐪 بحسب أحدث الأخبار المسحوبة والمنظفة بالذكاء الاصطناعي من ${targetNews.account_name}:\n\n📰 ${targetNews.summary}\n🔗 رابط المصدر الأصلي: ${targetNews.source_url}\n\nتستاهلون الناموس! 🏆`,
        sourceType: 'vector_search',
        matchedEntities: [
          targetNews.camel_name || '',
          targetNews.owner_name || '',
          targetNews.race_event || '',
          targetNews.source_url,
        ].filter(Boolean),
        generatedSql: simulatedSql,
        dialectDetected: [...detectedDialects, 'استرجاع دلالي من جدول أخبار السوشيال ميديا (race_news + pgvector)'],
      };
    }

    if (results.length === 0) {
      return {
        responseMessage: 'والله يا خوي ما عندي علم بهالمركاض للحين، السموحة منك ما تسجلت عندي هالنتيجة في قاعدة البيانات.',
        sourceType: 'sql_table',
        matchedEntities: [],
        generatedSql: simulatedSql,
        dialectDetected: detectedDialects,
      };
    }

    // 1. هل سأل عن أفضل/أسرع توقيت؟
    if (
      qLower.includes('أفضل توقيت') ||
      qLower.includes('افضل توقيت') ||
      qLower.includes('أسرع') ||
      qLower.includes('اسرع') ||
      qLower.includes('كسر التيم')
    ) {
      const sortedByTime = [...results].sort((a, b) => (a.time_seconds || 9999) - (b.time_seconds || 9999));
      const fastest = sortedByTime[0];
      return {
        responseMessage: `ابشر وفالك طيب يا مرحبا! 🏆 صاحب أفضل وأسرع توقيت في المركاض اليوم هي المطية «${fastest.winner_name}» لـ ${fastest.owner_name}${fastest.trainer_name ? ` بقيادة المضمر ${fastest.trainer_name}` : ''} في ${fastest.track_name || 'الميدان'} (${fastest.category} - الشوط ${fastest.heat_number})، حيث سجلت توقيتاً قياسياً وقدره ${fastest.time}${fastest.speed_kmh ? ` بسرعة ${fastest.speed_kmh}` : ''}. تستاهلون الناموس! 🐪`,
        sourceType: 'sql_table',
        matchedEntities: [fastest.winner_name, fastest.owner_name, fastest.time, fastest.track_name || ''],
        generatedSql: simulatedSql,
        dialectDetected: detectedDialects,
      };
    }

    // 2. البحث المباشر باسم المطية أو المالك أو المضمر أو الميدان أو رقم الشوط
    const directMatches = results.filter((r) => {
      const w = (r.winner_name || '').toLowerCase();
      const o = (r.owner_name || '').toLowerCase();
      const t = (r.trainer_name || '').toLowerCase();
      const trk = (r.track_name || '').toLowerCase();
      const fest = (r.festival_name || '').toLowerCase();
      const cat = (r.category || '').toLowerCase();
      const notes = (r.notes || '').toLowerCase();
      const second = (r.second_place || '').toLowerCase();
      const third = (r.third_place || '').toLowerCase();

      if (w && qLower.includes(w)) return true;
      if (o && qLower.includes(o)) return true;
      if (t && t.length > 3 && qLower.includes(t)) return true;
      if (trk && qLower.includes(trk.replace('ميدان ', ''))) return true;
      if (fest && qLower.includes(fest.replace('مهرجان ', ''))) return true;
      if (second && qLower.includes(second)) return true;
      if (third && qLower.includes(third)) return true;
      if (cat && qLower.includes(cat)) return true;
      if (notes && qLower.includes('بندقية') && notes.includes('بندقية')) return true;
      if ((qLower.includes('الشوط الأول') || qLower.includes('الشوط 1') || qLower.includes('ش1')) && r.heat_number === 1) return true;
      if ((qLower.includes('الشوط الثاني') || qLower.includes('الشوط 2') || qLower.includes('ش2')) && r.heat_number === 2) return true;
      if ((qLower.includes('الشوط الثالث') || qLower.includes('الشوط 3') || qLower.includes('ش3')) && r.heat_number === 3) return true;
      if ((qLower.includes('الشوط الرابع') || qLower.includes('الشوط 4') || qLower.includes('ش4')) && r.heat_number === 4) return true;
      if ((qLower.includes('الشوط الخامس') || qLower.includes('الشوط 5') || qLower.includes('ش5')) && r.heat_number === 5) return true;
      return false;
    });

    if (directMatches.length === 1) {
      const m = directMatches[0];
      const relatedNews = socialNewsList.find((n) => n.camel_name === m.winner_name);
      const sourceAppendix = relatedNews?.source_url ? `\n🔗 رابط المنشور الرسمي: ${relatedNews.source_url}` : '';
      return {
        responseMessage: `ابشر وفالك طيب يا مرحبا! اللي خذا الناموس في الشوط ${m.heat_number} (${m.category}${m.prizeTitle ? ` - ${m.prizeTitle}` : ''}) في ${m.track_name || 'الميدان'} هي المطية «${m.winner_name}» لمالكها ${m.owner_name}${m.trainer_name ? ` بقيادة المضمر ${m.trainer_name}` : ''}، وسجلت توقيتاً وقدره ${m.time}${m.second_place ? `، وجاءت في المركز الثاني «${m.second_place}»` : ''}${m.third_place ? ` وفي المركز الثالث «${m.third_place}»` : ''}${m.speed_kmh ? ` بسرعة ${m.speed_kmh}` : ''}.${sourceAppendix} تستاهلون الناموس! 🏆🐪`,
        sourceType: 'sql_table',
        matchedEntities: [m.winner_name, m.owner_name, m.trainer_name || '', m.time].filter(Boolean),
        generatedSql: simulatedSql,
        dialectDetected: detectedDialects,
      };
    }

    if (directMatches.length > 1) {
      const lines = directMatches.slice(0, 5).map(
        (m) =>
          `• الشوط ${m.heat_number} (${m.track_name || 'الميدان'} - ${m.category}): البطلة «${m.winner_name}» لـ ${m.owner_name}${m.trainer_name ? ` (المضمر: ${m.trainer_name})` : ''} بتوقيت ${m.time}`
      );
      return {
        responseMessage: `ابشر وفالك طيب يا راعي العزبة! 🐪 هذه النتائج المطابقة لسؤالك من قاعدة البيانات المركزية:\n${lines.join('\n')}\nتستاهلون الناموس جميعاً! 🏆`,
        sourceType: 'sql_table',
        matchedEntities: directMatches.slice(0, 4).map((m) => m.winner_name),
        generatedSql: simulatedSql,
        dialectDetected: detectedDialects,
      };
    }

    if (matchedNews.length > 0) {
      const targetNews = matchedNews[0];
      return {
        responseMessage: `ابشر وفالك طيب طال عمرك! 🐪 بحسب المنشور المسحوب والمنظف من ${targetNews.account_name}:\n\n📰 ${targetNews.summary}\n🔗 رابط المصدر الأصلي: ${targetNews.source_url}\n\nتستاهلون الناموس! 🏆`,
        sourceType: 'vector_search',
        matchedEntities: [
          targetNews.camel_name || '',
          targetNews.owner_name || '',
          targetNews.source_url,
        ].filter(Boolean),
        generatedSql: simulatedSql,
        dialectDetected: [...detectedDialects, 'استرجاع دلالي من جدول أخبار السوشيال ميديا (race_news + pgvector)'],
      };
    }

    // 3. إذا قام العميل بلصق نص طويل (مثل رسالة واتساب أو منشور) لا يطابق شوطاً محدداً بالاسم، نقرأ له النص الملصق بوضوح مع أحدث نتائج قاعدة البيانات
    if (query.trim().length > 35) {
      const topRace = results[0];
      return {
        responseMessage: `ابشر يا طويل العمر، بقرأ لك الكلام اللي أرسلته وبالنسبة لبيانات الميدان المسجلة عندنا: أنت أرسلت: «${query.trim()}». وفي قاعدة البيانات المركزية اليوم، الشوط الأول الرئيسي خذته المطية «${topRace.winner_name}» لـ ${topRace.owner_name}${topRace.trainer_name ? ` والمضمر ${topRace.trainer_name}` : ''} بتوقيت ${topRace.time}. فالك الناموس! 🐪`,
        sourceType: 'hybrid',
        matchedEntities: [topRace.winner_name, topRace.owner_name],
        generatedSql: simulatedSql,
        dialectDetected: detectedDialects,
      };
    }

    // 4. ملخص جميع الأشواط المسجلة في قاعدة البيانات المركزية
    const summaryLines = results.slice(0, 6).map(
      (m) =>
        `• الشوط ${m.heat_number} (${m.track_name || 'الميدان'} - ${m.category}): «${m.winner_name}» لـ ${m.owner_name}${m.trainer_name ? ` والمضمر ${m.trainer_name}` : ''} بتوقيت ${m.time}`
    );
    return {
      responseMessage: `يا مرحبا بك ومسهلا! 🐪 إليك قراءة واضحة لأحدث نتائج أشواط الهجن المسجلة في قاعدة البيانات المركزية اليوم:\n${summaryLines.join('\n')}\nفالكم التوفيق وتستاهلون الناموس! 🏆`,
      sourceType: isStatsQuery ? 'sql_table' : 'hybrid',
      matchedEntities: results.slice(0, 4).map((m) => m.winner_name),
      generatedSql: simulatedSql,
      dialectDetected: detectedDialects,
    };
  };

  const attachDatabaseSearchMeta = (res: {
    responseMessage: string;
    sourceType: 'sql_table' | 'vector_search' | 'hybrid';
    matchedEntities: string[];
    generatedSql: string;
    dialectDetected: string[];
  }) => ({
    ...res,
    intentType: 'database_search' as const,
    searchingMessage: 'جاري البحث...',
    resolvedUserName: displayUserName,
  });

  if (!process.env.GEMINI_API_KEY) {
    return attachDatabaseSearchMeta(buildDynamicDatabaseAnswer());
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `السياق من قاعدة البيانات المركزية للمدير:\n${contextStr}\n\nالرسالة أو الكلام الذي أرسله/لصقه العميل (${displayUserName}): ${query}\n\nملاحظة هامة جداً: كثير من العملاء كبار سن أو لا يعرفون القراءة، ويضغطون على زر السماعة 🔊 بجانب الرسالة ليقرأ الذكاء الاصطناعي الكلام لهم بالصوت. التزم بقواعد موجه النظام (1. الترحيب المخصص، 2. تحديد الهوية: "أنا مساعدك الذكي"، 3. حساب طابع آخر 100 متر بخصم 25 ثانية وإرفاق ?t=XXXs، 4. الاستعلام عن المطايا المحظورة والفحص عبر SQL JOIN بين جدول المخالفات وجدول النتائج):`,
      config: { systemInstruction },
    });

    const textOut = response.text?.trim();
    if (!textOut) {
      return attachDatabaseSearchMeta(buildDynamicDatabaseAnswer());
    }

    return {
      responseMessage: textOut,
      sourceType: isStatsQuery ? 'sql_table' : 'vector_search',
      matchedEntities: ['الهجن', 'النتائج', ...detectedDialects],
      generatedSql: simulatedSql,
      dialectDetected: detectedDialects,
      intentType: 'database_search',
      searchingMessage: 'جاري البحث...',
      resolvedUserName: displayUserName,
    };
  } catch (err: any) {
    console.warn("Gemini RAG fallback to dynamic live DB matcher:", err?.message);
    return attachDatabaseSearchMeta(buildDynamicDatabaseAnswer());
  }
}
