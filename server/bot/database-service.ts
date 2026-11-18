import crypto from 'crypto';
import { getVaultSecret, loadCollection, saveCollection } from '../db/platformDb.js';

/**
 * استراتيجية التخزين المزدوجة (Dual Storage Strategy):
 * 1. قاعدة بيانات علائقية (PostgreSQL Schema & Store)
 * 2. قاعدة بيانات متجهة (Vector DB with pgvector)
 * 3. خزنة المفاتيح المشفرة (api_settings with AES-256-GCM)
 * 4. قاعدة التلقين اليدوي الموثقة ذات الأولوية المرجعية (manual_knowledge)
 */

export interface DbRaceResult {
  id: string;
  category: string; // e.g. حقايق بكار، لقايا قعدان، إيذاع، ثنايا بكار مفتوح، ثنايا قعدان عام
  heat_number: number; // رقم الشوط
  roundTitle?: string; // مثال: الشوط الأول الرئيسي — بكار مفتوح
  prizeTitle?: string; // مثال: شوط الكأس الرئيسي / شوط البندقية
  winner_name: string; // اسم المطية الفائزة
  owner_name: string; // اسم المالك (Owner)
  trainer_name?: string; // المضمر (Trainer / Handler)
  second_place?: string; // المركز الثاني
  third_place?: string; // المركز الثالث
  speed_kmh?: string; // السرعة (مثال: 41.3 كم/س)
  sire_lineage?: string; // اسم الأب والسلالة والفحل
  former_name?: string; // الاسم السابق للمطية إن وجد
  time: string; // التوقيت الزمني المسجل (مثال: 05:48.2)
  time_seconds?: number; // التوقيت بالثواني للفرز الرياضي
  best_time_flag?: boolean; // صاحب التوقيت الأفضل
  distance?: string; // المسافة (مثال: 4 كم، 6 كم)
  track_name?: string; // الميدان (ميدان المرموم، ميدان الوثبة، ميدان الشحانية، ميدان الطائف)
  festival_name?: string; // اسم المهرجان
  media_urls?: string[]; // روابط اليوتيوب ولبرقة
  source_group_id: string;
  source_group_name: string;
  sender_id: string;
  sender_name: string;
  raw_message_text: string;
  notes: string;
  created_at: string;
}

export interface DbQuickButton {
  id: string;
  title: string;
  query: string;
  category?: string;
  created_at: string;
}

export interface ClientBoardConfig {
  largeFontForElderly: boolean;
  autoPlayVoice: boolean;
  demoMediaAttached: boolean;
  demoMediaUrl?: string;
  demoMediaTitle?: string;
  lastResetTimestamp: number;
  lastBroadcastMessage?: string;
  lastBroadcastAudioBase64?: string;
  updatedAt: string;
}

export interface ClientQueryLogEntry {
  id: string;
  channel: string;
  inputType: 'text' | 'voice';
  query: string;
  answer: string;
  matchedEntities: string[];
  hasAudio: boolean;
  timestamp: string;
}

export interface DbChatEmbedding {
  id: string;
  message_id: string;
  group_id: string;
  group_name: string;
  sender_id: string;
  sender_name: string;
  content_text: string;
  category: 'general_discussion' | 'weather_track' | 'price_sales' | 'announcement' | 'race_commentary' | 'manual_verified';
  is_manual_verified?: boolean;
  priority_weight?: number;
  vector: number[];
  created_at: string;
}

export interface DbApiSetting {
  id: string;
  provider_key: 'elevenlabs' | 'openai' | 'gemini' | 'anthropic' | 'apify' | 'youtube' | 'xtts' | 'engineer_gateway' | 'custom';
  company_name: string; // مثال: ElevenLabs, OpenAI, Apify, YouTube API, Engineer AI Gateway
  service_role: string; // وظيفة الشركة في النظام
  encrypted_api_key: string; // النص المشفر بمعيار AES-256-GCM (يمنع حفظ النص العادي Plain Text)
  iv: string; // Initialization Vector
  auth_tag: string; // GCM Authentication Tag
  masked_preview: string; // معاينة مقنعة (مثال: ••••••••••••a9f2)
  is_active: boolean; // زر التشغيل / الإيقاف الفوري
  env_fallback_name: string; // اسم متغير البيئة الاحتياطي
  extra_config?: string; // إعداد إضافي اختياري مثل Actor ID أو Voice ID
  updated_at: string;
}

export interface DbManualKnowledge {
  id: string;
  content_text: string; // النص الملقن يدوياً من المدير
  news_date?: string; // تاريخ الخبر (اختياري)
  track_name?: string; // الميدان (اختياري)
  category?: string; // الفئة أو السن (اختياري)
  is_manual_verified: true; // حقل الأولوية المرجعية (Manual/Verified Flag)
  priority_weight: number; // وزن أعلى في البحث الدلالي (مثال: 1.35 مقابل 1.0 للبيانات الآلية)
  vector: number[]; // متجه pgvector
  created_at: string;
}

export interface DbDopingViolation {
  id: string;
  festival_name: string; // اسم المهرجان أو السباق (مثال: مهرجان العين، مهرجان المرموم، مهرجان ولي العهد)
  category: string; // السن / الفئة (مثال: فطامين، حقايق قعدان، ثنايا قعدان)
  race_day: string; // اليوم (مثال: السبت، الأحد، اليوم الأول)
  heat_number: number; // رقم الشوط (مثال: 2)
  rank: number; // المركز (1 = الأول، 2 = الثاني، 3 = الثالث)
  created_at: string;
}

export interface DbRaceNews {
  id: string;
  platform: 'youtube' | 'instagram';
  account_name: string;
  source_url: string;
  raw_text: string; // النص الخام المسحوب من يوتيوب أو إنستقرام قبل التنظيف
  camel_name?: string;
  owner_name?: string;
  trainer_name?: string;
  race_event?: string;
  track_name?: string;
  heat_number?: number;
  time?: string;
  summary: string; // النص الصافي بعد معالجة Gemini وحذف الإعلانات والهاشتاجات
  vector: number[];
  created_at: string;
}

export interface DbJoinedDopingViolation extends DbDopingViolation {
  violation_id: string;
  matched_race_id?: string;
  track_name: string;
  camel_name: string; // مستخرج تلقائياً عبر SQL JOIN من جدول race_results حسب المركز
  owner_name: string; // مستخرج تلقائياً عبر SQL JOIN من جدول race_results
  trainer_name: string; // مستخرج تلقائياً عبر SQL JOIN من جدول race_results
  rank_label: string; // المركز الأول / المركز الثاني / المركز الثالث
  race_time?: string;
  formatted_statement: string;
  formatted_bot_response: string;
}

export interface DbGroup {
  id: string;
  name: string;
  participant_count: number;
  passive_mode: boolean;
  active_since: string;
  total_messages_processed: number;
  total_races_extracted: number;
}

/**
 * نص الـ SQL Schema الإنتاجي لقواعد بيانات PostgreSQL مع إضافة pgvector وجدول المخالفات والربط العلائقي (JOIN)
 */
export const POSTGRES_PGVECTOR_DDL_SCHEMA = `
-- ====================================================================
-- مخطط قاعدة البيانات المزدوجة لبوت سباقات الهجن (PostgreSQL + pgvector)
-- ====================================================================

-- 1. تفعيل ملحق المتجهات للبحث الدلالي
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. جدول مجموعات الواتساب (whatsapp_groups)
CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id VARCHAR(100) PRIMARY KEY, -- Group JID e.g. 12036304@g.us
    name VARCHAR(255) NOT NULL,
    participant_count INT DEFAULT 0,
    passive_mode BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. جدول الرسائل الواردة والميتاداتا (raw_messages)
CREATE TABLE IF NOT EXISTS raw_messages (
    id VARCHAR(100) PRIMARY KEY, -- WhatsApp Message ID
    group_id VARCHAR(100) REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255),
    message_type VARCHAR(50) NOT NULL, -- text, audioMessage, documentMessage
    raw_content TEXT,
    audio_url TEXT,
    transcription_text TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول الملاك والمؤسسات (camel_owners)
CREATE TABLE IF NOT EXISTS camel_owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    tribe VARCHAR(100),
    total_victories INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. جدول المضمرين (camel_trainers)
CREATE TABLE IF NOT EXISTS camel_trainers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    total_victories INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. جدول المطايا وسلالات الفحول (camels)
CREATE TABLE IF NOT EXISTS camels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    former_name VARCHAR(255),
    category VARCHAR(100), -- حقايق بكار، لقايا قعدان، ثنايا
    owner_id UUID REFERENCES camel_owners(id) ON DELETE SET NULL,
    trainer_id UUID REFERENCES camel_trainers(id) ON DELETE SET NULL,
    sire_lineage VARCHAR(255), -- الأب والسلالة (مثال: جبار ولد لحقه بعير المختبر)
    best_time VARCHAR(50),
    total_wins INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_camel_owner UNIQUE (name, owner_id)
);

-- 7. جدول النتائج المهيكلة للأشواط (race_results)
CREATE TABLE IF NOT EXISTS race_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(100) REFERENCES raw_messages(id) ON DELETE SET NULL,
    group_id VARCHAR(100) REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
    
    -- بيانات الشوط والسباق
    track_name VARCHAR(150), -- ميدان الطائف، ميدان الوثبة، ميدان الشحانية، ميدان العين
    festival_name VARCHAR(200), -- مهرجان ولي العهد للهجن 2026، مهرجان العين
    category VARCHAR(100) NOT NULL, -- فطامين، ثنايا بكار مفتوح، ثنايا قعدان عام
    heat_number INT NOT NULL, -- رقم الشوط
    distance VARCHAR(50), -- المسافة (مثال: 6 كم، 8 كم)
    
    -- بيانات الفائزين بالمراكز
    winner_name VARCHAR(255) NOT NULL, -- اسم المطية (المركز الأول)
    second_place VARCHAR(255), -- المركز الثاني
    third_place VARCHAR(255), -- المركز الثالث
    former_name VARCHAR(255), -- الاسم السابق إن وجد
    owner_name VARCHAR(255) NOT NULL, -- اسم المالك
    trainer_name VARCHAR(255), -- اسم المضمر المنفصل
    sire_lineage VARCHAR(255), -- الأب والسلالة
    
    -- التوقيت الزمني وحساب طابع آخر 100 متر
    time_recorded VARCHAR(50), -- 09:10.15
    time_in_seconds NUMERIC(8, 2), -- 550.15 لفرز أسرع توقيت وخصم آخر 25 ثانية للقطة النهاية
    
    -- الروابط والملاحظات
    media_urls TEXT[], -- روابط يوتيوب أو MP4
    notes TEXT, -- الرمز، الكأس، درك قوي، تسعيرة
    confidence_score NUMERIC(4, 3) DEFAULT 1.000,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. جدول قوائم المخالفات والفحص والمنشطات (doping_violations)
CREATE TABLE IF NOT EXISTS doping_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    festival_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    race_day VARCHAR(100) NOT NULL,
    heat_number INT NOT NULL,
    rank INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. جدول أخبار الهجن المسحوبة من السوشيال ميديا (race_news)
CREATE TABLE IF NOT EXISTS race_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_url TEXT UNIQUE NOT NULL,
    camel_name VARCHAR(255),
    owner_name VARCHAR(255),
    race_event VARCHAR(255),
    heat_number INT,
    time VARCHAR(50),
    summary TEXT NOT NULL, -- النص الصافي المعالج
    embedding vector(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس سريعة
CREATE INDEX IF NOT EXISTS idx_race_category ON race_results(category);
CREATE INDEX IF NOT EXISTS idx_race_heat ON race_results(heat_number);
CREATE INDEX IF NOT EXISTS idx_race_winner ON race_results(winner_name);
CREATE INDEX IF NOT EXISTS idx_race_owner ON race_results(owner_name);
CREATE INDEX IF NOT EXISTS idx_race_trainer ON race_results(trainer_name);
CREATE INDEX IF NOT EXISTS idx_race_time_sec ON race_results(time_in_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_race_festival ON race_results(festival_name);
CREATE INDEX IF NOT EXISTS idx_violations_lookup ON doping_violations(festival_name, category, heat_number);
CREATE INDEX IF NOT EXISTS idx_news_event ON race_news(race_event);
CREATE INDEX IF NOT EXISTS idx_news_embedding_hnsw ON race_news USING hnsw (embedding vector_cosine_ops);

-- 10. جدول التضمينات المتجهة للمحادثات غير المهيكلة (chat_embeddings)
CREATE TABLE IF NOT EXISTS chat_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(100) REFERENCES raw_messages(id) ON DELETE CASCADE,
    group_id VARCHAR(100) REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255),
    content_text TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general_discussion',
    is_manual_verified BOOLEAN DEFAULT FALSE,
    priority_weight NUMERIC(4, 2) DEFAULT 1.00,
    embedding vector(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. جدول إدارة مفاتيح الشركات المشفرة (api_settings - AES-256-GCM Encrypted)
CREATE TABLE IF NOT EXISTS api_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_key VARCHAR(50) UNIQUE NOT NULL, -- elevenlabs, openai, apify, youtube, xtts
    company_name VARCHAR(150) NOT NULL,
    service_role VARCHAR(255),
    encrypted_api_key TEXT NOT NULL, -- Ciphertext (Never Plain Text)
    iv VARCHAR(64) NOT NULL,
    auth_tag VARCHAR(64) NOT NULL,
    masked_preview VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    env_fallback_name VARCHAR(100),
    extra_config VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. جدول تلقين البوت اليدوي ذي الأولوية المرجعية (manual_knowledge)
CREATE TABLE IF NOT EXISTS manual_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_text TEXT NOT NULL,
    news_date VARCHAR(50),
    track_name VARCHAR(150),
    category VARCHAR(100),
    is_manual_verified BOOLEAN DEFAULT TRUE NOT NULL,
    priority_weight NUMERIC(4, 2) DEFAULT 1.35 NOT NULL,
    embedding vector(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهرس HNSW فائق السرعة للبحث الدلالي
CREATE INDEX IF NOT EXISTS idx_chat_embedding_hnsw 
ON chat_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_manual_knowledge_hnsw 
ON manual_knowledge 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 13. جداول عزل محادثات بوابة Engineer AI Gateway (Privacy & Strict Isolation)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(100) PRIMARY KEY,
    conversation_id VARCHAR(100) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    model_used VARCHAR(100),
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

/**
 * محرك خدمة قاعدة البيانات المزدوجة (In-Memory Simulation + SQL Engine)
 */
class DatabaseService {
  private groups: DbGroup[] = [
    {
      id: '12036302849182371@g.us',
      name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      participant_count: 650,
      passive_mode: true,
      active_since: '2026-08-01',
      total_messages_processed: 3120,
      total_races_extracted: 142,
    },
    {
      id: '12036302919384729@g.us',
      name: 'ميدان الطائف - البث المباشر 🎥',
      participant_count: 512,
      passive_mode: true,
      active_since: '2026-09-01',
      total_messages_processed: 1420,
      total_races_extracted: 88,
    },
    {
      id: '12036301827462819@g.us',
      name: 'قروب ميدان الوثبة 🐪🏁',
      participant_count: 342,
      passive_mode: true,
      active_since: '2026-07-10',
      total_messages_processed: 2840,
      total_races_extracted: 110,
    },
  ];

  private clientBoardConfig: ClientBoardConfig = {
    largeFontForElderly: false,
    autoPlayVoice: true,
    demoMediaAttached: false,
    demoMediaUrl: 'https://youtu.be/qxs6Om332_4',
    demoMediaTitle: 'بث الشوط الأول الرئيسي — سبج (هجن الرئاسة)',
    lastResetTimestamp: 0,
    updatedAt: new Date().toISOString(),
  };

  private quickButtons: DbQuickButton[] = [
    {
      id: 'qb-1',
      title: 'نتيجة سبج في الشوط الأول',
      query: 'شوفلي مركاض اليوم من سبق في الشوط الأول وكم توقيته؟',
      category: 'ميدان المرموم',
      created_at: new Date().toISOString(),
    },
    {
      id: 'qb-2',
      title: 'لقطة النهاية (آخر 100 متر - المرموم)',
      query: 'عطني مركاض المرموم آخر 100 متر',
      category: 'لقطات النهاية 🎥',
      created_at: new Date().toISOString(),
    },
    {
      id: 'qb-3',
      title: 'فحص المنشطات (مهرجان العين)',
      query: 'من تم قبضه في الفحص في مهرجان العين شوط 2؟',
      category: 'الرقابة والفحص 🧪',
      created_at: new Date().toISOString(),
    },
    {
      id: 'qb-4',
      title: 'أفضل توقيت في مركاض اليوم',
      query: 'عطني أفضل توقيت اليوم في المركاض ومن صاحب الناموس؟',
      category: 'التوقيت الأفضل',
      created_at: new Date().toISOString(),
    },
  ];

  // جدول قوائم المخالفات والفحص (يحتوي فقط على: اسم المهرجان، السن، اليوم، الشوط، والمركز)
  private dopingViolations: DbDopingViolation[] = [
    {
      id: 'viol-alain-1',
      festival_name: 'مهرجان العين',
      category: 'فطامين',
      race_day: 'السبت',
      heat_number: 2,
      rank: 1,
      created_at: new Date(Date.now() - 3600000 * 0.4).toISOString(),
    },
    {
      id: 'viol-marmoom-2',
      festival_name: 'مهرجان المرموم',
      category: 'حقايق قعدان مفتوح',
      race_day: 'الأحد',
      heat_number: 2,
      rank: 1,
      created_at: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    },
    {
      id: 'viol-taif-6',
      festival_name: 'مهرجان ولي العهد للهجن 2026',
      category: 'ثنايا قعدان مفتوح',
      race_day: 'السبت',
      heat_number: 6,
      rank: 2,
      created_at: new Date(Date.now() - 3600000 * 2.0).toISOString(),
    },
  ];

  private raceResults: DbRaceResult[] = [
    // نتائج هجن الخليج المربوطة مباشرة مع لوحة العميل (ميدان المرموم، العين، الوثبة، الشحانية، الطائف)
    {
      id: 'race-marmoom-1',
      category: 'حقايق بكار مفتوح',
      heat_number: 1,
      roundTitle: 'الشوط الأول الرئيسي — بكار مفتوح — البطلة: «سبج»',
      prizeTitle: 'شوط الكأس الرئيسي',
      winner_name: 'سبج',
      owner_name: 'هجن الرئاسة',
      trainer_name: 'محمد عتيق بن زيتون المهيري',
      second_place: 'الشاهينية',
      third_place: 'الظبي',
      speed_kmh: '41.3 كم/س',
      sire_lineage: 'شاهين الرئاسة',
      time: '05:48.2',
      time_seconds: 348.2,
      best_time_flag: true,
      distance: '4 كم',
      track_name: 'ميدان المرموم',
      festival_name: 'مهرجان المرموم التراثي للهجن',
      media_urls: ['https://youtu.be/qxs6Om332_4'],
      source_group_id: '12036302849182371@g.us',
      source_group_name: 'قروب الاتحاد - تغطية الميادين الرسمية 🏆',
      sender_id: '+971501234567',
      sender_name: 'مراسل ميدان المرموم 🐪',
      raw_message_text: 'ميدان المرموم · حقايق · 4 كم · شوط الكأس الرئيسي: الشوط الأول الرئيسي — بكار مفتوح — البطلة: «سبج» | المالك: هجن الرئاسة · المضمر: محمد عتيق بن زيتون المهيري | التوقيت: 05:48.2 | المركز الثاني: الشاهينية · المركز الثالث: الظبي · السرعة: 41.3 كم/س',
      notes: 'شوط الكأس الرئيسي • التوقيت الأفضل في المركاض • السرعة: 41.3 كم/س',
      created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    },
    {
      id: 'race-alain-2',
      category: 'فطامين بكار',
      heat_number: 2,
      roundTitle: 'الشوط الثاني — فطامين بكار — البطلة: «الشاهينية»',
      prizeTitle: 'شوط فطامين الرئيسي',
      winner_name: 'الشاهينية',
      owner_name: 'سعيد بن مظفر العامري',
      trainer_name: 'محمد بن زيتون المهيري',
      second_place: 'الظبي',
      third_place: 'مذيار',
      speed_kmh: '41.8 كم/س',
      sire_lineage: 'شاهين المختبر',
      time: '02:55.4',
      time_seconds: 175.4,
      best_time_flag: false,
      distance: '2 كم',
      track_name: 'ميدان العين',
      festival_name: 'مهرجان العين',
      media_urls: ['https://youtu.be/SdbCgTn7Nys'],
      source_group_id: '12036302849182371@g.us',
      source_group_name: 'قروب الاتحاد - تغطية الميادين الرسمية 🏆',
      sender_id: '+971509876543',
      sender_name: 'مراسل ميدان العين 🐪',
      raw_message_text: 'مهرجان العين · فطامين · 2 كم · الشوط 2: المركز الأول «الشاهينية» لـ سعيد بن مظفر العامري والمضمر محمد بن زيتون المهيري بتوقيت 02:55.4',
      notes: 'مهرجان العين • شوط الفطامين الثاني • المركز الثاني: الظبي',
      created_at: new Date(Date.now() - 3600000 * 0.6).toISOString(),
    },
    {
      id: 'race-marmoom-2',
      category: 'حقايق قعدان مفتوح',
      heat_number: 2,
      roundTitle: 'الشوط الثاني — قعدان مفتوح — البطل: «الفارس»',
      prizeTitle: 'شوط البندقية',
      winner_name: 'الفارس',
      owner_name: 'هجن العاصفة',
      trainer_name: 'غياث الهلالي',
      second_place: 'شاهين',
      third_place: 'مياس',
      speed_kmh: '40.9 كم/س',
      sire_lineage: 'الشامي بعير العاصفة',
      time: '05:51.6',
      time_seconds: 351.6,
      best_time_flag: false,
      distance: '4 كم',
      track_name: 'ميدان المرموم',
      festival_name: 'مهرجان المرموم التراثي للهجن',
      media_urls: ['https://youtu.be/SdbCgTn7Nys'],
      source_group_id: '12036302849182371@g.us',
      source_group_name: 'قروب الاتحاد - تغطية الميادين الرسمية 🏆',
      sender_id: '+971501234567',
      sender_name: 'مراسل ميدان المرموم 🐪',
      raw_message_text: 'ميدان المرموم · حقايق · 4 كم · شوط البندقية: الشوط الثاني — قعدان مفتوح — البطل: «الفارس» | المالك: هجن العاصفة · المضمر: غياث الهلالي | التوقيت: 05:51.6 | المركز الثاني: شاهين · المركز الثالث: مياس · السرعة: 40.9 كم/س',
      notes: 'شوط البندقية • المركز الثاني: شاهين • المركز الثالث: مياس • السرعة: 40.9 كم/س',
      created_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    },
    {
      id: 'race-wathba-1',
      category: 'لقايا بكار محليات',
      heat_number: 3,
      roundTitle: 'الشوط الثالث — لقايا بكار محليات — البطلة: «الشاهينية»',
      prizeTitle: 'شوط خنجر المحليات',
      winner_name: 'الشاهينية',
      owner_name: 'محمد بن راشد المري',
      trainer_name: 'حمد بن سالم المري',
      second_place: 'مذيار',
      third_place: 'نوادر',
      speed_kmh: '40.5 كم/س',
      sire_lineage: 'شاهين الكليلي',
      time: '07:22.4',
      time_seconds: 442.4,
      best_time_flag: true,
      distance: '5 كم',
      track_name: 'ميدان الوثبة',
      festival_name: 'مهرجان الوثبة التراثي',
      media_urls: ['https://youtu.be/lRF-NE30HTs'],
      source_group_id: '12036301827462819@g.us',
      source_group_name: 'قروب ميدان الوثبة 🐪🏁',
      sender_id: '+971501112233',
      sender_name: 'أبو راشد المري',
      raw_message_text: 'ميدان الوثبة · لقايا · 5 كم · شوط خنجر المحليات: فازت «الشاهينية» لـ محمد بن راشد المري والمضمر حمد بن سالم المري بتوقيت 07:22.4',
      notes: 'شوط خنجر المحليات • المركز الثاني: مذيار • المركز الثالث: نوادر',
      created_at: new Date(Date.now() - 3600000 * 1.1).toISOString(),
    },
    {
      id: 'race-shahaniya-1',
      category: 'إيذاع بكار مفتوح',
      heat_number: 4,
      roundTitle: 'الشوط الرابع — إيذاع بكار مفتوح — البطلة: «الجزيرة»',
      prizeTitle: 'شوط الشلفة الذهبية',
      winner_name: 'الجزيرة',
      owner_name: 'هجن الشحانية',
      trainer_name: 'جارالله محمد بن عقيل (البرنس)',
      second_place: 'الدوحة',
      third_place: 'بروق',
      speed_kmh: '40.2 كم/س',
      sire_lineage: 'عجلان الشحانية',
      time: '08:54.1',
      time_seconds: 534.1,
      best_time_flag: false,
      distance: '6 كم',
      track_name: 'ميدان الشحانية',
      festival_name: 'مهرجان الأمير الوالد للهجن',
      media_urls: ['https://youtu.be/qxs6Om332_4'],
      source_group_id: '12036302849182371@g.us',
      source_group_name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      sender_id: '+97455112233',
      sender_name: 'مراسل الشحانية',
      raw_message_text: 'ميدان الشحانية · إيذاع · 6 كم · شوط الشلفة الذهبية: فازت «الجزيرة» لـ هجن الشحانية والمضمر جارالله محمد بن عقيل بتوقيت 08:54.1',
      notes: 'شوط الشلفة الذهبية • المركز الثاني: الدوحة • المركز الثالث: بروق',
      created_at: new Date(Date.now() - 3600000 * 1.4).toISOString(),
    },
    // عينات مهرجان سمو ولي العهد للهجن 2026 الحقيقية (ميدان الطائف)
    {
      id: 'race-crown-1',
      category: 'ثنايا بكار مفتوح',
      heat_number: 5,
      roundTitle: 'الشوط الخامس — ثنايا بكار مفتوح — البطلة: «بيه»',
      prizeTitle: 'كأس الثنايا بكار مفتوح',
      winner_name: 'بيه',
      owner_name: 'الشيخ أحمد بن محمد بن راشد آل مكتوم',
      trainer_name: 'سالم سعيد بن منانه',
      second_place: 'شديدة',
      third_place: 'غند',
      speed_kmh: '39.8 كم/س',
      sire_lineage: 'جبار ولد لحقه بعير المختبر',
      time: '09:10.15',
      time_seconds: 550.15,
      best_time_flag: true,
      distance: '6 كم',
      track_name: 'ميدان الطائف',
      festival_name: 'مهرجان ولي العهد للهجن 2026',
      media_urls: ['https://youtu.be/qxs6Om332_4'],
      source_group_id: '12036302849182371@g.us',
      source_group_name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      sender_id: '+966501234567',
      sender_name: 'قروب الاتحاد 🐪',
      raw_message_text: 'ش 1 كأس بكار مفتوح (بيه) لـ الشيخ أحمد بن محمد بن راشد آل مكتوم 9:10:15 المضمر: سالم سعيد بن منانه الاب جبار ولد لحقه بعير المختبر',
      notes: 'كأس بكار مفتوح • الأب: جبار ولد لحقه بعير المختبر',
      created_at: new Date(Date.now() - 3600000 * 2.0).toISOString(),
    },
    {
      id: 'race-crown-2',
      category: 'ثنايا قعدان مفتوح',
      heat_number: 6,
      roundTitle: 'الشوط السادس — ثنايا قعدان مفتوح — البطل: «الحساس»',
      prizeTitle: 'كأس الثنايا قعدان مفتوح',
      winner_name: 'الحساس',
      owner_name: 'راشد سعيد بن مروشد',
      trainer_name: 'سعيد بن مروشد المهيري',
      second_place: 'الذيب',
      third_place: 'شاهين',
      speed_kmh: '39.6 كم/س',
      sire_lineage: 'سلفر بعير ابن قريع سابقاً حالياً عند هجن الرئاسة',
      time: '09:14.18',
      time_seconds: 554.18,
      best_time_flag: false,
      distance: '6 كم',
      track_name: 'ميدان الطائف',
      festival_name: 'مهرجان ولي العهد للهجن 2026',
      media_urls: ['https://youtu.be/SdbCgTn7Nys'],
      source_group_id: '12036302849182371@g.us',
      source_group_name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      sender_id: '+966501234567',
      sender_name: 'قروب الاتحاد 🐪',
      raw_message_text: 'ش 2 كأس قعدان مفتوح (الحساس) لـ راشد سعيد بن مروشد 9:14:18 الاب سلفر بعير ابن قريع سابقا حاليا عند الرئاسه',
      notes: 'كأس قعدان مفتوح • الأب: سلفر بعير ابن قريع',
      created_at: new Date(Date.now() - 3600000 * 2.2).toISOString(),
    },
    {
      id: 'race-crown-3',
      category: 'ثنايا بكار عام',
      heat_number: 7,
      roundTitle: 'الشوط السابع — ثنايا بكار عام — البطلة: «شوق»',
      prizeTitle: 'كأس الثنايا بكار عام',
      winner_name: 'شوق',
      former_name: 'الصالحية سابقاً',
      owner_name: 'مانع علي بن حماد الشامسي',
      trainer_name: 'علي بن حماد الشامسي',
      second_place: 'الظبي',
      third_place: 'الوارية',
      speed_kmh: '39.1 كم/س',
      sire_lineage: 'الحريثي العيده ولد ناصي المختبر',
      time: '09:22.77',
      time_seconds: 562.77,
      distance: '6 كم',
      track_name: 'ميدان الطائف',
      festival_name: 'مهرجان ولي العهد للهجن 2026',
      media_urls: ['https://youtu.be/lRF-NE30HTs'],
      source_group_id: '12036302849182371@g.us',
      source_group_name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      sender_id: '+966501234567',
      sender_name: 'قروب الاتحاد 🐪',
      raw_message_text: 'ش 3 كأس بكار عام (شوق) لـ مانع علي بن حماد الشامسي 9:22:77 الاب الحريثي العيده ولد ناصي المختبر (شوق هيه الصالحيه سابقأ)',
      notes: 'كأس بكار عام • الأب: الحريثي العيده ولد ناصي المختبر • (الصالحية سابقاً)',
      created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    },
  ];

  private chatEmbeddings: DbChatEmbedding[] = [
    {
      id: 'emb-001',
      message_id: 'msg-weather-1',
      group_id: '12036302849182371@g.us',
      group_name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      sender_id: '+966509988776',
      sender_name: 'سلطان الدوسري',
      content_text: 'أرضية مضمار الطائف (عرفه) ممتازة اليوم بعد الرش، والطقس معتدل ومناسب جداً لتحقيق أرقام قياسية في أشواط رموز الثنايا المسائية.',
      category: 'weather_track',
      vector: this.generateDeterministicVector('أرضية مضمار الطائف ممتازة بعد الرش وأشواط الرموز'),
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'emb-002',
      message_id: 'msg-price-1',
      group_id: '12036302849182371@g.us',
      group_name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      sender_id: '+971505544332',
      sender_name: 'مبارك العامري',
      content_text: 'تسعيرة أشواط الرموز في مهرجان ولي العهد معتمدة بـ مليوني ريال للمطية الفائزة بالكأس المفتوح، ومليون ونصف للشوط العام.',
      category: 'price_sales',
      vector: this.generateDeterministicVector('تسعيرة أشواط الرموز في مهرجان ولي العهد مليوني ريال'),
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'emb-003',
      message_id: 'msg-ann-1',
      group_id: '12036302919384729@g.us',
      group_name: 'ميدان الطائف - البث المباشر 🎥',
      sender_id: '+966551122334',
      sender_name: 'لجنة السباقات والتحكيم',
      content_text: 'تنويه: انطلاقة أشواط الثنايا العامة ستبدأ عند الساعة 2:30 ظهراً بمسافة 6 كيلومتر، مع تفعيل خاصية الراكب الآلي وفحص المنشطات الإلزامي لجميع الثلاثة الأوائل.',
      category: 'announcement',
      vector: this.generateDeterministicVector('انطلاقة أشواط الثنايا العامة الساعة 2:30 ظهراً 6 كم فحص المنشطات'),
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: 'emb-004',
      message_id: 'msg-lineage-1',
      group_id: '12036302849182371@g.us',
      group_name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      sender_id: '+966501234567',
      sender_name: 'قروب الاتحاد 🐪',
      content_text: 'سلالة الفحل جبار ولد لحقه بعير المختبر تثبت تفوقها التاريخي بانتزاع كأس الثنايا بكار مع المطية بيه لسمو الشيخ أحمد بن محمد بن راشد آل مكتوم.',
      category: 'race_commentary',
      vector: this.generateDeterministicVector('سلالة الفحل جبار ولد لحقه بعير المختبر كأس الثنايا بيه آل مكتوم'),
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  // جدول أخبار الهجن المسحوبة من يوتيوب وإنستقرام بعد فلترة الذكاء الاصطناعي (AI Data Cleaning + pgvector)
  private raceNews: DbRaceNews[] = [
    {
      id: 'news-yt-1',
      platform: 'youtube',
      account_name: 'قناة دبي ريسنج - نادي دبي لسباقات الهجن',
      source_url: 'https://www.youtube.com/watch?v=qxs6Om332_4',
      raw_text:
        '🔥 شاهد الآن أقوى أشواط الموسم!! لا تنسوا الاشتراك في القناة وتفعيل زر الجرس 🔔برعاية شركة الصقر لخدمات العزب والأعلاف (خصم 20% بكود CAMEL20) 📞050000000.. انتزعت المطية البطلة «سبج» لهجن الرئاسة بقيادة المضمر المجازف محمد عتيق بن زيتون المهيري ناموس الشوط الأول الرئيسي للحقايق بكار مفتوح في ميدان المرموم مسجلة أسرع توقيت 05:48.2! #هجن_الرئاسة #المرموم #سباقات_الهجن #دبي #اكسبلور #فولو #ترند_الخليج #ابل #ناموس',
      camel_name: 'سبج',
      owner_name: 'هجن الرئاسة',
      trainer_name: 'محمد عتيق بن زيتون المهيري',
      race_event: 'مهرجان المرموم التراثي للهجن',
      track_name: 'ميدان المرموم',
      heat_number: 1,
      time: '05:48.2',
      summary:
        'انتزعت المطية «سبج» المملوكة لـ هجن الرئاسة بقيادة المضمر محمد عتيق بن زيتون المهيري ناموس الشوط الأول الرئيسي (حقايق بكار مفتوح) في ميدان المرموم بتوقيت قياسي بلغ 05:48.2.',
      vector: this.generateDeterministicVector('سبج هجن الرئاسة محمد بن زيتون المهيري ميدان المرموم الشوط 1 05:48.2'),
      created_at: new Date(Date.now() - 3600000 * 0.3).toISOString(),
    },
    {
      id: 'news-ig-1',
      platform: 'instagram',
      account_name: 'حساب اتحاد سباقات الهجن الرسمي (@uaecamelracing)',
      source_url: 'https://www.instagram.com/reel/C8xCamelRaceWathba/',
      raw_text:
        '✨ ريلز حصري من قلب ميدان الوثبة! للطلب والإعلان على صفحتنا تواصل دايركت 📩 برعاية مختبر الخليج البيطري.. تألقت «الشاهينية» بشعار محمد بن راشد المري والمضمر حمد بن سالم المري لتخطف خنجر اللقايا بكار محليات في الشوط الثالث بميدان الوثبة بتوقيت 07:22.4 وسط منافسة نارية في آخر 100 متر! #الوثبة #ابوظبي #هجن_الخليج #ريلز_انستقرام #اعلانات_الامارات #فولو_باك #اكسبلور_2026',
      camel_name: 'الشاهينية',
      owner_name: 'محمد بن راشد المري',
      trainer_name: 'حمد بن سالم المري',
      race_event: 'مهرجان الوثبة التراثي',
      track_name: 'ميدان الوثبة',
      heat_number: 3,
      time: '07:22.4',
      summary:
        'حققت المطية «الشاهينية» لمالكها محمد بن راشد المري والمضمر حمد بن سالم المري الفوز بخنجر اللقايا بكار محليات في الشوط الثالث بميدان الوثبة مسجلة توقيتاً قدره 07:22.4.',
      vector: this.generateDeterministicVector('الشاهينية محمد بن راشد المري خنجر اللقايا ميدان الوثبة الشوط 3 07:22.4'),
      created_at: new Date(Date.now() - 3600000 * 0.7).toISOString(),
    },
    {
      id: 'news-yt-2',
      platform: 'youtube',
      account_name: 'قناة الاتحاد السعودي للهجن - ميدان الطائف',
      source_url: 'https://www.youtube.com/watch?v=SdbCgTn7Nys',
      raw_text:
        '🎥 تغطية خاصة ومباشرة | اشترك الآن في باقة شاهد VIP لمتابعة جميع الأشواط بدون فواصل إعلانية! في الشوط الخامس لسن الثنايا بكار مفتوح بميدان الطائف ضمن مهرجان ولي العهد للهجن، خطفت «بيه» لسمو الشيخ أحمد بن محمد بن راشد آل مكتوم مع المضمر سالم سعيد بن منانه كأس الثنايا بكار بتوقيت 09:10.15، وتنحدر سلالتها من الأب جبار ولد لحقه بعير المختبر. #مهرجان_ولي_العهد_للهجن #الطائف #السعودية #لايك #شير #سبسكرايب',
      camel_name: 'بيه',
      owner_name: 'الشيخ أحمد بن محمد بن راشد آل مكتوم',
      trainer_name: 'سالم سعيد بن منانه',
      race_event: 'مهرجان ولي العهد للهجن 2026',
      track_name: 'ميدان الطائف',
      heat_number: 5,
      time: '09:10.15',
      summary:
        'توجت المطية «بيه» لسمو الشيخ أحمد بن محمد بن راشد آل مكتوم والمضمر سالم سعيد بن منانه بكأس الثنايا بكار مفتوح (الشوط 5) في ميدان الطائف ضمن مهرجان ولي العهد للهجن بتوقيت 09:10.15، وهي من سلالة الأب جبار ولد لحقه بعير المختبر.',
      vector: this.generateDeterministicVector('بيه الشيخ أحمد بن محمد بن راشد آل مكتوم سالم بن منانه ميدان الطائف كأس الثنايا 09:10.15'),
      created_at: new Date(Date.now() - 3600000 * 1.3).toISOString(),
    },
    {
      id: 'news-ig-2',
      platform: 'instagram',
      account_name: 'شبكة لبرقة لسباقات الهجن (@labregah)',
      source_url: 'https://www.instagram.com/p/C9ShahaniyaGold/',
      raw_text:
        '🌟 تغطية ميدان الشحانية.. عروض خاصة من متجر السنام لمستلزمات الهجن والركبي الآلي (الرابط في البايو 👆).. انتزعت «الجزيرة» لهجن الشحانية مع المضمر البرنس جارالله محمد بن عقيل الشلفة الذهبية لسن الإيذاع بكار مفتوح في الشوط الرابع بميدان الشحانية بتوقيت 08:54.1! #الشحانية #قطر #لبرقة #هجن_الشحانية #البرنس #ريلز #تصويري #اكسبلور',
      camel_name: 'الجزيرة',
      owner_name: 'هجن الشحانية',
      trainer_name: 'جارالله محمد بن عقيل (البرنس)',
      race_event: 'مهرجان الأمير الوالد للهجن',
      track_name: 'ميدان الشحانية',
      heat_number: 4,
      time: '08:54.1',
      summary:
        'فازت المطية «الجزيرة» المملوكة لـ هجن الشحانية بقيادة المضمر جارالله محمد بن عقيل بالشلفة الذهبية للإيذاع بكار مفتوح في الشوط الرابع بميدان الشحانية بتوقيت 08:54.1.',
      vector: this.generateDeterministicVector('الجزيرة هجن الشحانية جارالله بن عقيل الشلفة الذهبية ميدان الشحانية الشوط 4 08:54.1'),
      created_at: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    },
  ];

  // مفتاح التشفير الرئيسي للخادم (AES-256-GCM) لحماية مفاتيح الشركات في جدول api_settings
  private readonly encryptionSecretKey: Buffer = crypto
    .createHash('sha256')
    .update(getVaultSecret())
    .digest();

  private apiSettings: DbApiSetting[] = [];

  // جدول التلقين اليدوي الموثق ذي الأولوية المرجعية القصوى (Manual/Verified Knowledge Base)
  private manualKnowledge: DbManualKnowledge[] = [
    {
      id: 'mk-verified-1',
      content_text:
        'قرار رسمي معتمد من اللجنة العليا للميدان: تم اعتماد فوز المطية «سبج» لـ هجن الرئاسة بقيادة المضمر محمد عتيق بن زيتون المهيري في الشوط الأول الرئيسي بميدان المرموم بتوقيت رسمي نهائي قدره 05:48.2 بعد اجتياز الفحص الطبي بنجاح تام، والجائزة المعتمدة هي كأس الحقايق المفتوح ومليون درهم.',
      news_date: '2026-11-03',
      track_name: 'ميدان المرموم',
      category: 'حقايق بكار مفتوح',
      is_manual_verified: true,
      priority_weight: 1.35,
      vector: this.generateDeterministicVector(
        'قرار رسمي معتمد سبج هجن الرئاسة بن زيتون المهيري ميدان المرموم الشوط الأول كأس الحقايق 05:48.2'
      ),
      created_at: new Date(Date.now() - 3600000 * 0.2).toISOString(),
    },
    {
      id: 'mk-verified-2',
      content_text:
        'تعميم حصري من إدارة المهرجان: تنطلق أشواط الرموز المسائية غداً في تمام الساعة 3:00 عصراً بدلاً من الساعة 2:30 ظهراً نظراً لاعتدال الأجواء، ويُشترط حضور المضمرين قبل الشوط بـ 45 دقيقة في منطقة التحضير.',
      news_date: '2026-11-03',
      track_name: 'ميدان الطائف',
      category: 'ثنايا رموز',
      is_manual_verified: true,
      priority_weight: 1.35,
      vector: this.generateDeterministicVector(
        'تعميم حصري انطلاقة أشواط الرموز المسائية الساعة 3:00 عصراً ميدان الطائف حضور المضمرين'
      ),
      created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    },
  ];

  constructor() {
    this.initDefaultEncryptedApiSettings();
  }

  /**
   * تشفير المفتاح بمعيار AES-256-GCM قبل حفظه في جدول api_settings
   */
  public encryptApiKey(plainKey: string): {
    encrypted_api_key: string;
    iv: string;
    auth_tag: string;
    masked_preview: string;
  } {
    const clean = (plainKey || '').trim();
    if (!clean) {
      return {
        encrypted_api_key: '',
        iv: '',
        auth_tag: '',
        masked_preview: 'غير مضبوط (يعتمد على .env الاحتياطي)',
      };
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionSecretKey, iv);
    const encrypted = Buffer.concat([cipher.update(clean, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const visibleTail = clean.length > 4 ? clean.slice(-4) : '••••';
    return {
      encrypted_api_key: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      auth_tag: authTag.toString('hex'),
      masked_preview: `••••••••••••${visibleTail}`,
    };
  }

  /**
   * فك تشفير المفتاح المحفوظ في جدول api_settings عند طلبه من محرك الصوت أو محرك السحب
   */
  public decryptApiKey(record: DbApiSetting): string {
    if (!record.encrypted_api_key || !record.iv || !record.auth_tag) {
      return '';
    }
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionSecretKey,
        Buffer.from(record.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(record.auth_tag, 'hex'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(record.encrypted_api_key, 'hex')),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (err) {
      console.error('Failed to decrypt API key for', record.company_name, err);
      return '';
    }
  }

  private initDefaultEncryptedApiSettings() {
    const initialProviders: Array<{
      id: string;
      provider_key: DbApiSetting['provider_key'];
      company_name: string;
      service_role: string;
      initialPlainKey: string;
      is_active: boolean;
      env_fallback_name: string;
      extra_config: string;
    }> = [
      {
        id: 'api-elevenlabs',
        provider_key: 'elevenlabs',
        company_name: 'ElevenLabs',
        service_role: 'محرك استنساخ صوت المعلق الخليجي (Multilingual v2 TTS)',
        initialPlainKey: process.env.ELEVENLABS_API_KEY || '',
        is_active: true,
        env_fallback_name: 'ELEVENLABS_API_KEY',
        extra_config: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
      },
      {
        id: 'api-openai',
        provider_key: 'openai',
        company_name: 'OpenAI',
        service_role: 'محرك النطق الصوتي المساند (OpenAI Onyx TTS-1)',
        initialPlainKey: process.env.OPENAI_API_KEY || '',
        is_active: true,
        env_fallback_name: 'OPENAI_API_KEY',
        extra_config: 'onyx',
      },
      {
        id: 'api-gemini',
        provider_key: 'gemini',
        company_name: 'Google Gemini',
        service_role: 'Chat / RAG answers, transcription and document reading',
        initialPlainKey: process.env.GEMINI_API_KEY || '',
        is_active: true,
        env_fallback_name: 'GEMINI_API_KEY',
        extra_config: '',
      },
      {
        id: 'api-anthropic',
        provider_key: 'anthropic',
        company_name: 'Anthropic Claude',
        service_role: 'Chat / RAG answers (Claude)',
        initialPlainKey: process.env.ANTHROPIC_API_KEY || '',
        is_active: true,
        env_fallback_name: 'ANTHROPIC_API_KEY',
        extra_config: '',
      },
      {
        id: 'api-apify',
        provider_key: 'apify',
        company_name: 'Apify',
        service_role: 'محرك سحب منشورات وريلز إنستقرام ويوتيوب كل ساعة (Scraper)',
        initialPlainKey: process.env.APIFY_TOKEN || '',
        is_active: true,
        env_fallback_name: 'APIFY_TOKEN',
        extra_config: process.env.APIFY_ACTOR_ID || 'apify/instagram-scraper',
      },
      {
        id: 'api-youtube',
        provider_key: 'youtube',
        company_name: 'YouTube Data API v3',
        service_role: 'سحب عناوين ووصف وروابط فيديوهات أشواط الهجن فور نشرها',
        initialPlainKey: process.env.YOUTUBE_API_KEY || '',
        is_active: true,
        env_fallback_name: 'YOUTUBE_API_KEY',
        extra_config: 'UC_DubaiCamelRacingOfficial',
      },
      {
        id: 'api-xtts',
        provider_key: 'xtts',
        company_name: 'XTTS-v2 Serverless GPU',
        service_role: 'خادم GPU الخاص لاستنساخ الصوت الخليجي (RunPod / Modal)',
        initialPlainKey: process.env.XTTS_API_KEY || '',
        is_active: Boolean(process.env.XTTS_ENDPOINT_URL),
        env_fallback_name: 'XTTS_API_KEY',
        extra_config: process.env.XTTS_ENDPOINT_URL || 'https://api.runpod.ai/v2/xtts-camel/runsync',
      },
      {
        id: 'api-engineer-gateway',
        provider_key: 'engineer_gateway',
        company_name: 'Engineer AI Gateway',
        service_role: 'بوابة الذكاء الاصطناعي المركزية للشات والبث التدفقي (SSE & Failover v1.0)',
        initialPlainKey: process.env.ENGINEER_SERVICE_KEY || '',
        is_active: Boolean(process.env.ENGINEER_SERVICE_KEY && process.env.ENGINEER_GATEWAY_URL),
        env_fallback_name: 'ENGINEER_SERVICE_KEY',
        extra_config: process.env.ENGINEER_GATEWAY_URL || '',
      },
    ];

    this.apiSettings = initialProviders.map((p) => {
      const enc = this.encryptApiKey(p.initialPlainKey);
      return {
        id: p.id,
        provider_key: p.provider_key,
        company_name: p.company_name,
        service_role: p.service_role,
        encrypted_api_key: enc.encrypted_api_key,
        iv: enc.iv,
        auth_tag: enc.auth_tag,
        masked_preview: enc.masked_preview,
        is_active: p.is_active,
        env_fallback_name: p.env_fallback_name,
        extra_config: p.extra_config,
        updated_at: new Date().toISOString(),
      };
    });
  }

  private generateDeterministicVector(text: string): number[] {
    const vec = new Array(128).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[i % 128] += text.charCodeAt(i) * 0.001;
    }
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  // Operations
  public saveRaceResult(result: Partial<DbRaceResult> & Record<string, any>): DbRaceResult {
    const winnerName = result.winner_name || result.camelName || result.winner || 'مطية غير مسماة';
    const ownerName = result.owner_name || result.ownerName || result.owner || 'غير محدد';
    const trainerName = result.trainer_name || result.trainerName || result.trainer || '';
    const trackName = result.track_name || result.trackName || result.track || 'ميدان المرموم';
    const timeStr = result.time || result.timing || '05:50.0';
    const heatNum = Number(result.heat_number || result.roundNumber || 1);
    const categoryStr = result.category || result.ageCategory || 'حقايق بكار';

    const newRecord: DbRaceResult = {
      id: result.id || `race-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category: categoryStr,
      heat_number: heatNum,
      roundTitle: result.roundTitle || result.title || `الشوط ${heatNum} — ${categoryStr} — البطلة: «${winnerName}»`,
      prizeTitle: result.prizeTitle || result.prize || 'شوط رئيسي',
      winner_name: winnerName,
      owner_name: ownerName,
      trainer_name: trainerName,
      second_place: result.second_place || result.secondPlace || '',
      third_place: result.third_place || result.thirdPlace || '',
      speed_kmh: result.speed_kmh || result.speed || '',
      sire_lineage: result.sire_lineage || result.sireLineage || '',
      former_name: result.former_name || result.formerName || '',
      time: timeStr,
      time_seconds: result.time_seconds || this.parseTimeToSeconds(timeStr),
      best_time_flag: Boolean(result.best_time_flag ?? result.bestTimeFlag ?? false),
      distance: result.distance || '4 كم',
      track_name: trackName,
      festival_name: result.festival_name || result.festivalName || 'مهرجان الهجن الرسمي',
      media_urls: Array.isArray(result.media_urls) && result.media_urls.length > 0 ? result.media_urls : ['https://youtu.be/qxs6Om332_4'],
      source_group_id: result.source_group_id || 'external-app-sync',
      source_group_name: result.source_group_name || 'لوحة هجن الخليج (مزامنة مباشرة)',
      sender_id: result.sender_id || 'client-ui',
      sender_name: result.sender_name || 'لوحة هجن الخليج',
      raw_message_text:
        result.raw_message_text ||
        `${trackName} · ${categoryStr} · الشوط ${heatNum}: الفائزة ${winnerName} لـ ${ownerName} والمضمر ${trainerName} بتوقيت ${timeStr}`,
      notes: result.notes || '',
      created_at: result.created_at || new Date().toISOString(),
    };

    const existingIdx = this.raceResults.findIndex(
      r => r.id === newRecord.id || (r.winner_name === newRecord.winner_name && r.heat_number === newRecord.heat_number && r.track_name === newRecord.track_name)
    );
    if (existingIdx >= 0) {
      this.raceResults[existingIdx] = newRecord;
    } else {
      this.raceResults.unshift(newRecord);
    }
    return newRecord;
  }

  public parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(/[:.]/).map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const mins = parts[0];
      const secs = parts[1];
      const frac = parts[2] ? parts[2] / 100 : 0;
      return mins * 60 + secs + frac;
    }
    return 350;
  }

  // =========================================================================
  // جدول قوائم المخالفات والربط العلائقي (SQL JOIN: doping_violations ⋈ race_results)
  // =========================================================================
  public getDopingViolations(): DbDopingViolation[] {
    return this.dopingViolations;
  }

  public saveDopingViolation(input: Partial<DbDopingViolation>): DbDopingViolation {
    const record: DbDopingViolation = {
      id: input.id || `viol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      festival_name: (input.festival_name || 'مهرجان العين').trim(),
      category: (input.category || 'فطامين').trim(),
      race_day: (input.race_day || 'السبت').trim(),
      heat_number: Number(input.heat_number || 1),
      rank: Number(input.rank || 1),
      created_at: input.created_at || new Date().toISOString(),
    };
    const existingIdx = this.dopingViolations.findIndex(
      v =>
        v.id === record.id ||
        (v.festival_name === record.festival_name &&
          v.category === record.category &&
          v.heat_number === record.heat_number &&
          v.rank === record.rank)
    );
    if (existingIdx >= 0) {
      this.dopingViolations[existingIdx] = record;
    } else {
      this.dopingViolations.unshift(record);
    }
    return record;
  }

  public deleteDopingViolation(id: string): boolean {
    const before = this.dopingViolations.length;
    this.dopingViolations = this.dopingViolations.filter(v => v.id !== id);
    return this.dopingViolations.length < before;
  }

  /**
   * تنفيذ عملية الربط العلائقي (SQL JOIN) بين جدول المخالفات وجدول نتائج الأشواط الأساسي
   * لاستخراج (اسم المطية، اسم المالك، والمضمر) تلقائياً
   */
  public getViolationsJoinedWithRaceResults(filterText?: string): DbJoinedDopingViolation[] {
    const rankToArabicLabel = (rank: number): string => {
      if (rank === 1) return 'المركز الأول';
      if (rank === 2) return 'المركز الثاني';
      if (rank === 3) return 'المركز الثالث';
      return `المركز ${rank}`;
    };

    const stripPrefix = (s: string) =>
      (s || '')
        .replace(/^(مهرجان|ميدان|سباق|ريس)\s+/g, '')
        .trim()
        .toLowerCase();

    const joined = this.dopingViolations.map((v): DbJoinedDopingViolation => {
      const vFestKey = stripPrefix(v.festival_name);
      const vCatKey = (v.category || '').trim().toLowerCase();

      // البحث عن الشوط المطابق في جدول race_results (JOIN Condition)
      const matchedRace =
        this.raceResults.find(r => {
          const rFest = stripPrefix(r.festival_name || '');
          const rTrack = stripPrefix(r.track_name || '');
          const festMatches =
            vFestKey &&
            (rFest.includes(vFestKey) || vFestKey.includes(rFest) || rTrack.includes(vFestKey) || vFestKey.includes(rTrack));
          const heatMatches = r.heat_number === v.heat_number;
          const catMatches =
            !vCatKey ||
            r.category.toLowerCase().includes(vCatKey) ||
            vCatKey.includes(r.category.split(' ')[0].toLowerCase());
          return festMatches && heatMatches && catMatches;
        }) ||
        this.raceResults.find(r => {
          const rFest = stripPrefix(r.festival_name || '');
          const rTrack = stripPrefix(r.track_name || '');
          const festMatches =
            vFestKey &&
            (rFest.includes(vFestKey) || vFestKey.includes(rFest) || rTrack.includes(vFestKey) || vFestKey.includes(rTrack));
          return festMatches && r.heat_number === v.heat_number;
        });

      const camelName = matchedRace
        ? v.rank === 1
          ? matchedRace.winner_name
          : v.rank === 2
          ? matchedRace.second_place || matchedRace.winner_name
          : matchedRace.third_place || matchedRace.winner_name
        : 'مطية قيد التحديث بالجدول الأساسي';

      const ownerName = matchedRace?.owner_name || 'غير مسجل بعد';
      const trainerName = matchedRace?.trainer_name || 'غير محدد';
      const rankLabel = rankToArabicLabel(v.rank);

      const formattedStatement = `في ${v.festival_name}، الشوط ${v.heat_number}، تم ضبط المطية (${camelName}) لمالكها (${ownerName})${
        trainerName && trainerName !== 'غير محدد' ? ` والمضمر (${trainerName})` : ''
      } الحاصلة على ${rankLabel}`;

      return {
        ...v,
        violation_id: v.id,
        matched_race_id: matchedRace?.id,
        track_name: matchedRace?.track_name || v.festival_name,
        camel_name: camelName,
        owner_name: ownerName,
        trainer_name: trainerName,
        rank_label: rankLabel,
        race_time: matchedRace?.time,
        formatted_statement: formattedStatement,
        formatted_bot_response: formattedStatement,
      };
    });

    if (!filterText || !filterText.trim()) {
      return joined;
    }

    const q = filterText.toLowerCase();
    return joined.filter(item => {
      const festCore = stripPrefix(item.festival_name);
      return (
        q.includes(festCore) ||
        q.includes(item.festival_name.toLowerCase()) ||
        q.includes(item.track_name.toLowerCase()) ||
        q.includes(item.category.toLowerCase()) ||
        q.includes(item.camel_name.toLowerCase()) ||
        q.includes(item.owner_name.toLowerCase())
      );
    });
  }

  private clientQueryLogs: ClientQueryLogEntry[] = [];

  public logClientQuery(entry: Omit<ClientQueryLogEntry, 'id' | 'timestamp'>): ClientQueryLogEntry {
    const record: ClientQueryLogEntry = {
      ...entry,
      id: `qlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.clientQueryLogs.unshift(record);
    if (this.clientQueryLogs.length > 30) {
      this.clientQueryLogs = this.clientQueryLogs.slice(0, 30);
    }
    return record;
  }

  public getClientQueryLogs(): ClientQueryLogEntry[] {
    return this.clientQueryLogs;
  }

  public getClientBoardConfig(): ClientBoardConfig {
    return this.clientBoardConfig;
  }

  public updateClientBoardConfig(patch: Partial<ClientBoardConfig> & { triggerReset?: boolean }): ClientBoardConfig {
    if (patch.triggerReset) {
      this.clientBoardConfig.lastResetTimestamp = Date.now();
      this.clientBoardConfig.demoMediaAttached = false;
      this.clientBoardConfig.lastBroadcastMessage = undefined;
      this.clientBoardConfig.lastBroadcastAudioBase64 = undefined;
    }
    const { triggerReset, ...rest } = patch;
    this.clientBoardConfig = {
      ...this.clientBoardConfig,
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    return this.clientBoardConfig;
  }

  public getQuickButtons(): DbQuickButton[] {
    return this.quickButtons;
  }

  public saveQuickButton(btn: { id?: string; title: string; query: string; category?: string }): DbQuickButton {
    const newBtn: DbQuickButton = {
      id: btn.id || `qb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: btn.title,
      query: btn.query,
      category: btn.category || 'استعلام سريع',
      created_at: new Date().toISOString(),
    };
    const existingIdx = this.quickButtons.findIndex(b => b.id === newBtn.id || b.title === newBtn.title);
    if (existingIdx >= 0) {
      this.quickButtons[existingIdx] = newBtn;
    } else {
      this.quickButtons.push(newBtn);
    }
    return newBtn;
  }

  public deleteQuickButton(id: string): boolean {
    const before = this.quickButtons.length;
    this.quickButtons = this.quickButtons.filter(b => b.id !== id);
    return this.quickButtons.length < before;
  }

  public syncExternalData(payload: { results?: any[]; quickButtons?: any[]; violations?: any[]; replaceAll?: boolean }) {
    let syncedResults = 0;
    let syncedButtons = 0;

    if (Array.isArray(payload.results)) {
      if (payload.replaceAll) {
        this.raceResults = [];
      }
      for (const item of payload.results) {
        this.saveRaceResult(item);
        syncedResults++;
      }
    }

    if (Array.isArray(payload.quickButtons)) {
      if (payload.replaceAll) {
        this.quickButtons = [];
      }
      for (const btn of payload.quickButtons) {
        if (btn && btn.title && btn.query) {
          this.saveQuickButton(btn);
          syncedButtons++;
        }
      }
    }

    if (Array.isArray(payload.violations)) {
      for (const v of payload.violations) {
        if (v && v.festival_name) {
          this.saveDopingViolation(v);
        }
      }
    }

    return {
      syncedResults,
      syncedButtons,
      totalResults: this.raceResults.length,
      totalQuickButtons: this.quickButtons.length,
      totalViolations: this.dopingViolations.length,
      results: this.raceResults,
      quickButtons: this.quickButtons,
      violationsJoined: this.getViolationsJoinedWithRaceResults(),
    };
  }

  public saveChatEmbedding(embedding: Omit<DbChatEmbedding, 'id' | 'created_at'>): DbChatEmbedding {
    const newRecord: DbChatEmbedding = {
      ...embedding,
      id: `emb-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.chatEmbeddings.unshift(newRecord);
    return newRecord;
  }

  public getRaceResults(filters?: { category?: string; track?: string; search?: string; heat?: number }): DbRaceResult[] {
    return this.raceResults.filter(r => {
      if (filters?.category && filters.category !== 'all' && filters.category !== 'الكل' && !r.category.includes(filters.category)) return false;
      if (filters?.track && filters.track !== 'all' && filters.track !== 'الكل' && (!r.track_name || !r.track_name.includes(filters.track))) return false;
      if (filters?.heat && r.heat_number !== filters.heat) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          r.winner_name.toLowerCase().includes(q) ||
          r.owner_name.toLowerCase().includes(q) ||
          (r.trainer_name && r.trainer_name.toLowerCase().includes(q)) ||
          (r.sire_lineage && r.sire_lineage.toLowerCase().includes(q)) ||
          (r.track_name && r.track_name.toLowerCase().includes(q)) ||
          (r.festival_name && r.festival_name.toLowerCase().includes(q)) ||
          r.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  // =========================================================================
  // إدارة جدول أخبار السوشيال ميديا المفلترة بالذكاء الاصطناعي (race_news + pgvector)
  // =========================================================================
  public getRaceNews(platformFilter?: string): DbRaceNews[] {
    if (!platformFilter || platformFilter === 'all' || platformFilter === 'الكل') {
      return this.raceNews;
    }
    return this.raceNews.filter(n => n.platform === platformFilter);
  }

  public saveRaceNews(input: Partial<DbRaceNews>): DbRaceNews {
    const summaryText = (input.summary || '').trim() || 'خبر سباق هجن معالج بالذكاء الاصطناعي';
    const rawText = (input.raw_text || summaryText).trim();
    const detectedPlatform: 'youtube' | 'instagram' =
      input.platform ||
      (input.source_url && input.source_url.toLowerCase().includes('instagram') ? 'instagram' : 'youtube');

    const record: DbRaceNews = {
      id: input.id || `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: detectedPlatform,
      account_name:
        input.account_name ||
        (detectedPlatform === 'instagram' ? 'حساب سباقات الهجن الرسمي (Instagram)' : 'قناة سباقات الهجن الرسمية (YouTube)'),
      source_url:
        (input.source_url || '').trim() ||
        (detectedPlatform === 'instagram'
          ? `https://www.instagram.com/reel/CamelNews${Date.now().toString().slice(-4)}/`
          : `https://www.youtube.com/watch?v=qxs6Om332_4`),
      raw_text: rawText,
      camel_name: input.camel_name || '',
      owner_name: input.owner_name || '',
      trainer_name: input.trainer_name || '',
      race_event: input.race_event || 'مهرجان الهجن الرسمي',
      track_name: input.track_name || 'ميدان المرموم',
      heat_number: input.heat_number ? Number(input.heat_number) : undefined,
      time: input.time || '',
      summary: summaryText,
      vector:
        Array.isArray(input.vector) && input.vector.length > 0
          ? input.vector
          : this.generateDeterministicVector(
              `${input.camel_name || ''} ${input.owner_name || ''} ${input.race_event || ''} ${summaryText}`
            ),
      created_at: input.created_at || new Date().toISOString(),
    };

    const existingIdx = this.raceNews.findIndex(
      n => n.id === record.id || (n.source_url === record.source_url && n.summary === record.summary)
    );
    if (existingIdx >= 0) {
      this.raceNews[existingIdx] = record;
    } else {
      this.raceNews.unshift(record);
    }
    return record;
  }

  public updateRaceNews(id: string, patch: Partial<DbRaceNews>): DbRaceNews | null {
    const idx = this.raceNews.findIndex(n => n.id === id);
    if (idx < 0) return null;
    const current = this.raceNews[idx];
    const updatedSummary = patch.summary !== undefined ? patch.summary : current.summary;
    const updated: DbRaceNews = {
      ...current,
      ...patch,
      id: current.id,
      summary: updatedSummary,
      vector: this.generateDeterministicVector(
        `${patch.camel_name ?? current.camel_name ?? ''} ${patch.owner_name ?? current.owner_name ?? ''} ${updatedSummary}`
      ),
    };
    this.raceNews[idx] = updated;
    return updated;
  }

  public deleteRaceNews(id: string): boolean {
    const before = this.raceNews.length;
    this.raceNews = this.raceNews.filter(n => n.id !== id);
    return this.raceNews.length < before;
  }

  // =========================================================================
  // إدارة جدول مفاتيح الشركات المشفرة (api_settings + Dynamic Injection)
  // =========================================================================
  public getApiSettings(includeDecryptedForAdmin: boolean = true) {
    return this.apiSettings.map((item) => ({
      ...item,
      decrypted_api_key: includeDecryptedForAdmin ? this.decryptApiKey(item) : undefined,
      cipher_preview: item.encrypted_api_key
        ? `${item.encrypted_api_key.slice(0, 16)}...${item.encrypted_api_key.slice(-8)}`
        : '—',
    }));
  }

  public saveApiSetting(input: {
    id?: string;
    provider_key?: DbApiSetting['provider_key'];
    company_name: string;
    service_role?: string;
    plain_api_key?: string;
    is_active?: boolean;
    env_fallback_name?: string;
    extra_config?: string;
  }) {
    const existingIdx = this.apiSettings.findIndex(
      (s) =>
        (input.id && s.id === input.id) ||
        (input.provider_key && input.provider_key !== 'custom' && s.provider_key === input.provider_key) ||
        s.company_name.toLowerCase() === input.company_name.trim().toLowerCase()
    );

    if (existingIdx >= 0) {
      const current = this.apiSettings[existingIdx];
      const enc =
        input.plain_api_key !== undefined && input.plain_api_key.trim() !== ''
          ? this.encryptApiKey(input.plain_api_key)
          : {
              encrypted_api_key: current.encrypted_api_key,
              iv: current.iv,
              auth_tag: current.auth_tag,
              masked_preview: current.masked_preview,
            };

      const updated: DbApiSetting = {
        ...current,
        company_name: input.company_name.trim() || current.company_name,
        service_role: input.service_role !== undefined ? input.service_role : current.service_role,
        encrypted_api_key: enc.encrypted_api_key,
        iv: enc.iv,
        auth_tag: enc.auth_tag,
        masked_preview: enc.masked_preview,
        is_active: input.is_active !== undefined ? Boolean(input.is_active) : current.is_active,
        extra_config: input.extra_config !== undefined ? input.extra_config : current.extra_config,
        updated_at: new Date().toISOString(),
      };
      this.apiSettings[existingIdx] = updated;
      return updated;
    }

    const enc = this.encryptApiKey(input.plain_api_key || '');
    const detectedProvider: DbApiSetting['provider_key'] =
      input.provider_key ||
      (input.company_name.toLowerCase().includes('engineer')
        ? 'engineer_gateway'
        : input.company_name.toLowerCase().includes('eleven')
        ? 'elevenlabs'
        : input.company_name.toLowerCase().includes('openai')
        ? 'openai'
        : input.company_name.toLowerCase().includes('gemini')
        ? 'gemini'
        : /claude|anthropic/.test(input.company_name.toLowerCase())
        ? 'anthropic'
        : input.company_name.toLowerCase().includes('apify')
        ? 'apify'
        : input.company_name.toLowerCase().includes('youtube')
        ? 'youtube'
        : input.company_name.toLowerCase().includes('xtts')
        ? 'xtts'
        : 'custom');

    const newSetting: DbApiSetting = {
      id: input.id || `api-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      provider_key: detectedProvider,
      company_name: input.company_name.trim(),
      service_role: input.service_role || 'مزود خدمة خارجي (API Provider)',
      encrypted_api_key: enc.encrypted_api_key,
      iv: enc.iv,
      auth_tag: enc.auth_tag,
      masked_preview: enc.masked_preview,
      is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
      env_fallback_name: input.env_fallback_name || `${detectedProvider.toUpperCase()}_API_KEY`,
      extra_config: input.extra_config || '',
      updated_at: new Date().toISOString(),
    };

    this.apiSettings.push(newSetting);
    return newSetting;
  }

  public toggleApiSetting(id: string, isActive?: boolean): DbApiSetting | null {
    const idx = this.apiSettings.findIndex((s) => s.id === id);
    if (idx < 0) return null;
    this.apiSettings[idx] = {
      ...this.apiSettings[idx],
      is_active: isActive !== undefined ? Boolean(isActive) : !this.apiSettings[idx].is_active,
      updated_at: new Date().toISOString(),
    };
    return this.apiSettings[idx];
  }

  public deleteApiSetting(id: string): boolean {
    const before = this.apiSettings.length;
    this.apiSettings = this.apiSettings.filter((s) => s.id !== id);
    return this.apiSettings.length < before;
  }

  /**
   * الربط الديناميكي (Dynamic Key Injection):
   * يقرأ المفتاح النشط والمشفر من قاعدة البيانات في كل مرة يعمل فيها محرك الصوت أو محرك السحب،
   * وفي حال إيقاف الشركة من الجدول أو ترك المفتاح فارغاً، يرجع تلقائياً لمفاتيح البيئة الاحتياطية (.env)
   */
  public getActiveProviderKey(
    providerKey: DbApiSetting['provider_key'],
    envFallbackName: string
  ): {
    key: string;
    source: 'database_encrypted' | 'env_fallback' | 'disabled_fallback_env' | 'none';
    isActiveInDb: boolean;
    extraConfig?: string;
  } {
    const record = this.apiSettings.find((s) => s.provider_key === providerKey);
    if (record && record.is_active) {
      const decrypted = this.decryptApiKey(record);
      // نتأكد أن المفتاح ليس مجرد مفتاح تجريبي وهمي إذا كان هناك مفتاح حقيقي في البيئة، أو نستخدم المفتاح الذي أدخله المدير
      const isDemoSeed =
        decrypted.includes('camel8891') ||
        decrypted.includes('camel99x88') ||
        decrypted.includes('camel88scraper') ||
        decrypted.includes('CamelRacingYouTubeKey');
      if (decrypted && (!isDemoSeed || !process.env[envFallbackName])) {
        return {
          key: decrypted,
          source: 'database_encrypted',
          isActiveInDb: true,
          extraConfig: record.extra_config,
        };
      }
    }

    const envVal = process.env[envFallbackName] || '';
    return {
      key: envVal,
      source: record && !record.is_active ? 'disabled_fallback_env' : envVal ? 'env_fallback' : 'none',
      isActiveInDb: Boolean(record?.is_active),
      extraConfig: record?.extra_config,
    };
  }

  // =========================================================================
  // إدارة جدول تلقين البوت اليدوي ذي الأولوية المرجعية (manual_knowledge + pgvector)
  // =========================================================================
  public getManualKnowledge(): DbManualKnowledge[] {
    return this.manualKnowledge;
  }

  public saveManualKnowledge(input: {
    id?: string;
    content_text: string;
    news_date?: string;
    track_name?: string;
    category?: string;
    vector?: number[];
  }): DbManualKnowledge {
    const textClean = (input.content_text || '').trim();
    const record: DbManualKnowledge = {
      id: input.id || `mk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content_text: textClean,
      news_date: input.news_date || new Date().toISOString().slice(0, 10),
      track_name: input.track_name || 'جميع الميادين',
      category: input.category || 'خبر / نتيجة رسمية موثقة',
      is_manual_verified: true,
      priority_weight: 1.35, // وزن أعلى (+35%) في البحث الدلالي والـ RAG
      vector:
        Array.isArray(input.vector) && input.vector.length > 0
          ? input.vector
          : this.generateDeterministicVector(`${input.track_name || ''} ${input.category || ''} ${textClean}`),
      created_at: new Date().toISOString(),
    };

    const existingIdx = this.manualKnowledge.findIndex((m) => m.id === record.id);
    if (existingIdx >= 0) {
      this.manualKnowledge[existingIdx] = record;
    } else {
      this.manualKnowledge.unshift(record);
    }
    return record;
  }

  public deleteManualKnowledge(id: string): boolean {
    const before = this.manualKnowledge.length;
    this.manualKnowledge = this.manualKnowledge.filter((m) => m.id !== id);
    return this.manualKnowledge.length < before;
  }

  public getChatEmbeddings(): DbChatEmbedding[] {
    return this.chatEmbeddings;
  }

  public getGroups(): DbGroup[] {
    return this.groups;
  }

  /**
   * البحث الدلالي المتجهي (Vector Cosine Search) مع تطبيق الأولوية المرجعية (Priority Weighting):
   * تحصل البيانات الملقنة يدوياً (is_manual_verified = true) على وزن إضافي (+0.30) لتتصدر نتائج البحث دائماً
   */
  public searchSemanticVectors(
    queryVector: number[],
    limit: number = 5
  ): { item: DbChatEmbedding; score: number; isManualVerified: boolean; rawScore: number }[] {
    const manualAsEmbeddings: DbChatEmbedding[] = this.manualKnowledge.map((m) => ({
      id: m.id,
      message_id: m.id,
      group_id: 'manual_verified',
      group_name: `تلقين يدوي موثق ★ (${m.track_name || 'إدارة الميدان'} - ${m.news_date || ''})`,
      sender_id: 'manager_verified',
      sender_name: 'تلقين المدير الموثق (مرجع أساسي ★)',
      content_text: m.content_text,
      category: 'manual_verified',
      is_manual_verified: true,
      priority_weight: m.priority_weight || 1.35,
      vector: m.vector || this.generateDeterministicVector(m.content_text),
      created_at: m.created_at,
    }));

    const newsAsEmbeddings: DbChatEmbedding[] = this.raceNews.map((n) => ({
      id: n.id,
      message_id: n.source_url,
      group_id: n.platform,
      group_name: `${n.account_name} (${n.source_url})`,
      sender_id: n.platform,
      sender_name: n.account_name,
      content_text: `${n.summary} [المصدر: ${n.source_url}]`,
      category: 'announcement',
      is_manual_verified: false,
      priority_weight: 1.0,
      vector: n.vector || this.generateDeterministicVector(n.summary),
      created_at: n.created_at,
    }));

    const combined = [...manualAsEmbeddings, ...newsAsEmbeddings, ...this.chatEmbeddings];
    const scored = combined.map((emb) => {
      let dotProduct = 0;
      for (let i = 0; i < Math.min(queryVector.length, emb.vector.length); i++) {
        dotProduct += queryVector[i] * emb.vector[i];
      }
      const baseScore = Math.max(0.68, Math.min(0.92, dotProduct));
      const isManual = Boolean(emb.is_manual_verified);
      // إعطاء البيانات اليدوية الموثقة وزناً أعلى (+0.30 Priority Boost) لتكون المرجع الأول
      const weightedScore = isManual ? Math.min(0.99, baseScore + 0.30) : baseScore;
      return {
        item: emb,
        score: weightedScore,
        rawScore: baseScore,
        isManualVerified: isManual,
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  public getStats() {
    return {
      totalResults: this.raceResults.length,
      totalQuickButtons: this.quickButtons.length,
      totalViolations: this.dopingViolations.length,
      totalNews: this.raceNews.length,
      totalManualKnowledge: this.manualKnowledge.length,
      totalApiSettings: this.apiSettings.length,
      totalEmbeddings: this.chatEmbeddings.length + this.raceNews.length + this.manualKnowledge.length,
      totalGroups: this.groups.length,
      fastestTime: this.raceResults.reduce((min, r) => (r.time_seconds && r.time_seconds < (min.time_seconds || 9999) ? r : min), this.raceResults[0]),
    };
  }

  public executeSqlSimulation(query: string): { columns: string[]; rows: any[]; queryUsed: string } {
    const lower = query.toLowerCase();
    let rows: any[] = [];
    let columns: string[] = ['الشوط', 'الفئة', 'اسم المطية', 'المالك', 'المضمر', 'التوقيت', 'سلالة الأب'];

    if (lower.includes('api_settings')) {
      columns = ['اسم الشركة', 'الوظيفة', 'المفتاح المشفر (AES-256-GCM Cipher)', 'معاينة مقنعة', 'الحالة (is_active)', 'البديل الاحتياطي'];
      rows = this.apiSettings.map((s) => ({
        'اسم الشركة': s.company_name,
        'الوظيفة': s.service_role,
        'المفتاح المشفر (AES-256-GCM Cipher)': s.encrypted_api_key
          ? `${s.encrypted_api_key.slice(0, 22)}... [IV:${s.iv.slice(0, 8)}]`
          : '---',
        'معاينة مقنعة': s.masked_preview,
        'الحالة (is_active)': s.is_active ? 'مفعل (Active ✓)' : 'معطل (Fallback to .env)',
        'البديل الاحتياطي': s.env_fallback_name,
      }));
    } else if (lower.includes('manual_knowledge')) {
      columns = ['المعلومة الموثقة (تلقين يدوي)', 'الميدان', 'الفئة', 'تاريخ الخبر', 'علم التوثيق (is_manual_verified)', 'وزن الأولوية'];
      rows = this.manualKnowledge.map((m) => ({
        'المعلومة الموثقة (تلقين يدوي)': m.content_text,
        'الميدان': m.track_name || '---',
        'الفئة': m.category || '---',
        'تاريخ الخبر': m.news_date || '---',
        'علم التوثيق (is_manual_verified)': 'TRUE (مرجع نهائي معتمد ★)',
        'وزن الأولوية': `${m.priority_weight}x (+35% Boost)`,
      }));
    } else if (lower.includes('race_news')) {
      columns = ['المنصة', 'اسم المطية', 'المالك', 'المهرجان/الميدان', 'الشوط', 'التوقيت', 'الملخص المنظف (AI)', 'رابط المصدر (source_url)'];
      rows = this.raceNews.map(n => ({
        'المنصة': n.platform === 'youtube' ? 'YouTube' : 'Instagram',
        'اسم المطية': n.camel_name || '---',
        'المالك': n.owner_name || '---',
        'المهرجان/الميدان': n.race_event || n.track_name || '---',
        'الشوط': n.heat_number ? `الشوط ${n.heat_number}` : '---',
        'التوقيت': n.time || '---',
        'الملخص المنظف (AI)': n.summary,
        'رابط المصدر (source_url)': n.source_url,
      }));
    } else if (lower.includes('doping_violations') || lower.includes('join')) {
      const joined = this.getViolationsJoinedWithRaceResults();
      columns = ['المهرجان', 'السن', 'اليوم', 'الشوط', 'المركز', 'اسم المطية (JOIN)', 'اسم المالك (JOIN)', 'المضمر (JOIN)'];
      rows = joined.map(j => ({
        'المهرجان': j.festival_name,
        'السن': j.category,
        'اليوم': j.race_day,
        'الشوط': `الشوط ${j.heat_number}`,
        'المركز': j.rank_label,
        'اسم المطية (JOIN)': j.camel_name,
        'اسم المالك (JOIN)': j.owner_name,
        'المضمر (JOIN)': j.trainer_name,
      }));
    } else if (lower.includes('coalesce(trainer_name') || lower.includes('order by heat_number')) {
      const sorted = [...this.raceResults].sort((a, b) => a.heat_number - b.heat_number);
      columns = ['الشوط', 'الفئة', 'اسم المطية', 'المالك', 'المضمر', 'التوقيت', 'سلالة الأب'];
      rows = sorted.map(r => ({
        'الشوط': `شوط ${r.heat_number}`,
        'الفئة': r.category,
        'اسم المطية': r.winner_name + (r.former_name ? ` (${r.former_name})` : ''),
        'المالك': r.owner_name,
        'المضمر': r.trainer_name || '---',
        'التوقيت': r.time,
        'سلالة الأب': r.sire_lineage || '---',
      }));
    } else if (lower.includes('order by time_in_seconds') || lower.includes('أسرع') || lower.includes('asc')) {
      columns = ['winner_name', 'owner_name', 'trainer_name', 'sire_lineage', 'category', 'time', 'track_name'];
      rows = [...this.raceResults].sort((a, b) => (a.time_seconds || 9999) - (b.time_seconds || 9999)).slice(0, 5);
    } else if (lower.includes('group by owner_name')) {
      columns = ['owner_name', 'wins_count', 'camels_list'];
      const map = new Map<string, { owner_name: string; wins_count: number; camels_list: string[] }>();
      this.raceResults.forEach(r => {
        const cur = map.get(r.owner_name) || { owner_name: r.owner_name, wins_count: 0, camels_list: [] };
        cur.wins_count += 1;
        cur.camels_list.push(r.winner_name);
        map.set(r.owner_name, cur);
      });
      rows = Array.from(map.values()).map(v => ({ ...v, camels_list: v.camels_list.join(', ') }));
    } else if (lower.includes('where heat_number = 1') || lower.includes('كأس')) {
      columns = ['winner_name', 'owner_name', 'trainer_name', 'sire_lineage', 'category', 'time', 'track_name'];
      rows = this.raceResults.filter(r => r.heat_number === 1 || r.notes.includes('كأس'));
    } else {
      columns = ['winner_name', 'owner_name', 'trainer_name', 'sire_lineage', 'category', 'time', 'track_name'];
      rows = this.raceResults.slice(0, 10);
    }

    return { columns, rows, queryUsed: query };
  }
}

/**
 * Persistence layer: every collection of the original in-memory service is
 * mirrored to the shared SQLite database (table bot_store). Mutating methods are
 * wrapped so each change is written through immediately; on boot the collections
 * are hydrated from SQLite (seed data is only written the very first time).
 */
const PERSISTED_COLLECTIONS = [
  'groups', 'quickButtons', 'dopingViolations', 'raceResults', 'chatEmbeddings',
  'raceNews', 'apiSettings', 'manualKnowledge',
] as const;

const MUTATIONS: Record<string, Array<(typeof PERSISTED_COLLECTIONS)[number]>> = {
  saveRaceResult: ['raceResults'],
  saveDopingViolation: ['dopingViolations'],
  deleteDopingViolation: ['dopingViolations'],
  saveQuickButton: ['quickButtons'],
  deleteQuickButton: ['quickButtons'],
  syncExternalData: ['raceResults', 'quickButtons', 'dopingViolations'],
  saveChatEmbedding: ['chatEmbeddings'],
  saveRaceNews: ['raceNews'],
  updateRaceNews: ['raceNews'],
  deleteRaceNews: ['raceNews'],
  saveApiSetting: ['apiSettings'],
  toggleApiSetting: ['apiSettings'],
  deleteApiSetting: ['apiSettings'],
  saveManualKnowledge: ['manualKnowledge'],
  deleteManualKnowledge: ['manualKnowledge'],
};

function attachPersistence(service: DatabaseService): DatabaseService {
  const target = service as any;
  for (const name of PERSISTED_COLLECTIONS) {
    const stored = loadCollection(name);
    if (stored) {
      target[name] = stored;
    } else {
      saveCollection(name, target[name] || []);
    }
  }
  // Keys added in newer versions (e.g. Gemini / Claude) are appended once.
  const defaults = new DatabaseService() as any;
  const known = new Set((target.apiSettings as DbApiSetting[]).map((s) => s.id));
  const missing = (defaults.apiSettings as DbApiSetting[]).filter((s) => !known.has(s.id));
  if (missing.length) {
    target.apiSettings = [...target.apiSettings, ...missing];
    saveCollection('apiSettings', target.apiSettings);
  }

  for (const [method, collections] of Object.entries(MUTATIONS)) {
    const original = target[method];
    if (typeof original !== 'function') continue;
    target[method] = function (...args: any[]) {
      const result = original.apply(target, args);
      for (const c of collections) saveCollection(c, target[c] || []);
      return result;
    };
  }
  return service;
}

export const dbService = attachPersistence(new DatabaseService());
