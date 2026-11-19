/**
 * Shared platform database (one SQLite file for the whole server).
 *
 * Holds everything the public bot reads and the unified admin panel writes:
 * bot knowledge collections, Q&A rules, direct audio replies, bot settings,
 * live chat logs, and the published Books & Notes library.
 *
 * The bot reads these tables on every request (zero in-memory caching delay),
 * so an admin change is immediately visible to the next bot answer without a restart.
 */
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const DATA_DIR = path.resolve(process.env.PLATFORM_DATA_DIR || path.join(process.cwd(), 'data'));
export const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const DB_FILE = path.join(DATA_DIR, 'platform.db');

let db: DatabaseSync | null = null;

const MIGRATIONS: string[] = [
  // 1. bot knowledge store + settings
  `
  CREATE TABLE IF NOT EXISTS bot_store (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );
  CREATE TABLE IF NOT EXISTS bot_store_meta (
    collection TEXT PRIMARY KEY,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  `,
  // 2. Q&A rules, direct audio replies, chat logs
  `
  CREATE TABLE IF NOT EXISTS bot_audio_files (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bot_qa_rules (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    keywords TEXT NOT NULL DEFAULT '[]',
    answer TEXT NOT NULL,
    audio_file_id TEXT REFERENCES bot_audio_files(id) ON DELETE SET NULL,
    match_mode TEXT NOT NULL DEFAULT 'smart',
    priority INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    hits INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bot_chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    channel TEXT NOT NULL DEFAULT 'public_web',
    input_type TEXT NOT NULL DEFAULT 'text',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source TEXT,
    provider TEXT,
    rule_id TEXT,
    sources TEXT NOT NULL DEFAULT '[]',
    latency_ms INTEGER,
    client_hash TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON bot_chat_logs(created_at);
  `,
  // 3. published Books & Notes library
  `
  CREATE TABLE IF NOT EXISTS library_lists (
    id TEXT PRIMARY KEY,
    owner_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    bot_visible INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    published_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS library_notes (
    id TEXT PRIMARY KEY,
    owner_uid TEXT NOT NULL,
    list_id TEXT,
    parent_id TEXT,
    title TEXT NOT NULL,
    content_text TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    search_text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    published_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_library_notes_list ON library_notes(list_id);
  `,
  // 4. external source tagging (Waraqa sync), precomputed search text, sync state
  `
  ALTER TABLE bot_qa_rules ADD COLUMN source TEXT NOT NULL DEFAULT 'local';
  ALTER TABLE bot_qa_rules ADD COLUMN external_id TEXT;
  ALTER TABLE library_lists ADD COLUMN source TEXT NOT NULL DEFAULT 'local';
  ALTER TABLE library_lists ADD COLUMN external_id TEXT;
  ALTER TABLE library_notes ADD COLUMN source TEXT NOT NULL DEFAULT 'local';
  ALTER TABLE library_notes ADD COLUMN external_id TEXT;
  ALTER TABLE library_notes ADD COLUMN search_norm TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_source_ext ON bot_qa_rules(source, external_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_source_ext ON library_lists(source, external_id);
  CREATE INDEX IF NOT EXISTS idx_notes_source_ext ON library_notes(source, external_id);
  CREATE TABLE IF NOT EXISTS waraqa_sync_state (
    kind TEXT NOT NULL,
    external_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    synced_at TEXT NOT NULL,
    PRIMARY KEY (kind, external_id)
  );
  `,
];

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);');
  const row = db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as { v: number | null } | undefined;
  const current = row?.v || 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(i + 1, new Date().toISOString());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  backfillSearchNorm(db);
  return db;
}

/** Fill library_notes.search_norm for rows created before migration 4. */
function backfillSearchNorm(handle: DatabaseSync): void {
  const rows = handle
    .prepare('SELECT id, title, content_text, tags FROM library_notes WHERE search_norm IS NULL')
    .all() as Array<{ id: string; title: string; content_text: string; tags: string }>;
  if (rows.length === 0) return;
  const upd = handle.prepare('UPDATE library_notes SET search_norm = ? WHERE id = ?');
  handle.exec('BEGIN');
  try {
    for (const r of rows) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(r.tags || '[]');
      } catch {
        /* ignore */
      }
      upd.run(buildSearchNorm(r.title, r.content_text, tags), r.id);
    }
    handle.exec('COMMIT');
  } catch (err) {
    handle.exec('ROLLBACK');
    throw err;
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function transaction<T>(fn: () => T): T {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const out = fn();
    d.exec('COMMIT');
    return out;
  } catch (err) {
    d.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Secret for AES-256-GCM encryption of provider API keys.
 * Uses API_VAULT_SECRET when set; otherwise a random secret generated once and
 * stored next to the database (mode 0600), so keys stay decryptable after restarts.
 */
export function getVaultSecret(): string {
  if (process.env.API_VAULT_SECRET && process.env.API_VAULT_SECRET.trim()) {
    return process.env.API_VAULT_SECRET.trim();
  }
  const file = path.join(DATA_DIR, '.vault_secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

// ---------------------------------------------------------------------------
// bot_store: generic persistence for the bot's original collections
// ---------------------------------------------------------------------------
export function loadCollection<T = any>(collection: string): T[] | null {
  const d = getDb();
  const meta = d.prepare('SELECT collection FROM bot_store_meta WHERE collection = ?').get(collection);
  if (!meta) return null;
  const rows = d
    .prepare('SELECT data FROM bot_store WHERE collection = ? ORDER BY position ASC')
    .all(collection) as Array<{ data: string }>;
  return rows.map((r) => JSON.parse(r.data) as T);
}

export function saveCollection(collection: string, items: any[]): void {
  transaction(() => {
    const d = getDb();
    d.prepare('DELETE FROM bot_store WHERE collection = ?').run(collection);
    const ins = d.prepare('INSERT OR REPLACE INTO bot_store (collection, id, position, data) VALUES (?, ?, ?, ?)');
    items.forEach((item, i) => {
      const id = String(item?.id ?? `idx-${i}`);
      ins.run(collection, id, i, JSON.stringify(item));
    });
    d.prepare('INSERT OR REPLACE INTO bot_store_meta (collection, updated_at) VALUES (?, ?)').run(
      collection,
      new Date().toISOString()
    );
  });
}

// ---------------------------------------------------------------------------
// bot_settings
// ---------------------------------------------------------------------------
export interface BotSettings {
  botName: string;
  welcomeMessage: string;
  systemPrompt: string;
  chatProvider: 'auto' | 'openai' | 'gemini' | 'anthropic' | 'none';
  models: { openai: string; gemini: string; anthropic: string };
  temperature: number;
  voiceRepliesDefault: boolean;
  publicUploadsEnabled: boolean;
  maxContextNotes: number;
}

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  botName: 'مساعد المكتبة الذكي',
  welcomeMessage: 'مرحباً بك! أنا جاهز للإجابة على استفساراتك من واقع مكتبة الكتب والملاحظات أو التحدث معك مباشرة بالصوت.',
  systemPrompt:
    'أنت مساعد ذكي متخصص وموثوق يمثل مركز المعرفة ومكتبة الكتب والملاحظات. ' +
    'أجب دائماً بدقة وبأسلوب عربي راقٍ واحترافي. ' +
    'إذا توفرت مقتطفات من الكتب أو الملاحظات، استند إليها واذكر اسم الكتاب أو الملاحظة كمرجع موثق. ' +
    'إذا كان السؤال يتضمن طلباً صوتياً أو لهجة خليجية، رحب بالمتحدث وتفاعل معه بكل سلاسة ودفء.',
  chatProvider: 'auto',
  models: { openai: 'gpt-4o-mini', gemini: 'gemini-3.6-flash', anthropic: 'claude-3-5-sonnet-20241022' },
  temperature: 0.3,
  voiceRepliesDefault: true,
  publicUploadsEnabled: true,
  maxContextNotes: 5,
};

export function getBotSettings(): BotSettings {
  const rows = getDb().prepare('SELECT key, value FROM bot_settings').all() as Array<{ key: string; value: string }>;
  const out: any = { ...DEFAULT_BOT_SETTINGS, models: { ...DEFAULT_BOT_SETTINGS.models } };
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      /* ignore */
    }
  }
  out.models = { ...DEFAULT_BOT_SETTINGS.models, ...(out.models || {}) };
  return out as BotSettings;
}

export function updateBotSettings(patch: Partial<BotSettings>): BotSettings {
  const allowed = Object.keys(DEFAULT_BOT_SETTINGS) as Array<keyof BotSettings>;
  const now = new Date().toISOString();
  transaction(() => {
    const stmt = getDb().prepare('INSERT OR REPLACE INTO bot_settings (key, value, updated_at) VALUES (?, ?, ?)');
    for (const key of allowed) {
      if (patch[key] !== undefined) stmt.run(key, JSON.stringify(patch[key]), now);
    }
  });
  return getBotSettings();
}

// ---------------------------------------------------------------------------
// bot_qa_rules (أسئلة وأجوبة البوت المباشرة)
// ---------------------------------------------------------------------------
export interface DbQaRule {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  audio_file_id?: string | null;
  audio_url?: string | null;
  match_mode: 'smart' | 'exact' | 'contains';
  priority: number;
  enabled: boolean;
  hits: number;
  source?: string;
  external_id?: string | null;
  created_at: string;
  updated_at: string;
}

function mapQaRow(r: any): DbQaRule {
  let keywords: string[] = [];
  try {
    keywords = JSON.parse(r.keywords || '[]');
  } catch {
    /* ignore malformed keywords */
  }
  return {
    id: r.id,
    question: r.question,
    keywords,
    answer: r.answer,
    audio_file_id: r.audio_file_id,
    audio_url: r.audio_file_name ? `/api/bot/audio/${r.audio_file_name}` : null,
    match_mode: r.match_mode || 'smart',
    priority: Number(r.priority || 0),
    enabled: Boolean(r.enabled),
    hits: Number(r.hits || 0),
    source: r.source || 'local',
    external_id: r.external_id ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function listQaRules(): DbQaRule[] {
  const rows = getDb()
    .prepare(
      `SELECT r.*, a.file_name as audio_file_name 
       FROM bot_qa_rules r 
       LEFT JOIN bot_audio_files a ON r.audio_file_id = a.id 
       ORDER BY r.priority DESC, r.created_at DESC`
    )
    .all() as any[];
  return rows.map(mapQaRow);
}

export function getQaRule(id: string): DbQaRule | null {
  const r = getDb()
    .prepare(
      `SELECT r.*, a.file_name as audio_file_name 
       FROM bot_qa_rules r 
       LEFT JOIN bot_audio_files a ON r.audio_file_id = a.id 
       WHERE r.id = ?`
    )
    .get(id) as any;
  return r ? mapQaRow(r) : null;
}

export function saveQaRule(rule: Partial<DbQaRule> & { question: string; answer: string }): DbQaRule {
  const now = new Date().toISOString();
  const id = rule.id || `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const keywordsJson = JSON.stringify(Array.isArray(rule.keywords) ? rule.keywords : []);
  const priority = typeof rule.priority === 'number' ? rule.priority : 0;
  const enabled = rule.enabled !== undefined ? (rule.enabled ? 1 : 0) : 1;
  const matchMode = rule.match_mode || 'smart';

  // INSERT OR REPLACE re-creates the row, so carry over hits/created_at/source/external_id.
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO bot_qa_rules 
       (id, question, keywords, answer, audio_file_id, match_mode, priority, enabled, hits, source, external_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?,
         COALESCE((SELECT hits FROM bot_qa_rules WHERE id = ?), 0),
         COALESCE(?, (SELECT source FROM bot_qa_rules WHERE id = ?), 'local'),
         COALESCE(?, (SELECT external_id FROM bot_qa_rules WHERE id = ?)),
         COALESCE((SELECT created_at FROM bot_qa_rules WHERE id = ?), ?), ?)`
    )
    .run(
      id,
      rule.question.trim(),
      keywordsJson,
      rule.answer.trim(),
      rule.audio_file_id || null,
      matchMode,
      priority,
      enabled,
      id,
      rule.source || null,
      id,
      rule.external_id || null,
      id,
      id,
      now,
      now
    );

  return getQaRule(id)!;
}

export function deleteQaRule(id: string): boolean {
  const res = getDb().prepare('DELETE FROM bot_qa_rules WHERE id = ?').run(id);
  return res.changes > 0;
}

/**
 * Arabic-aware normalization used for Q&A matching, duplicate detection and library search.
 * Removes tashkeel, unifies hamza/ta-marbuta/alef-maqsura, and strips Arabic + Latin punctuation
 * (including ؟ ، ؛ « ») so "ما هي عاصمة مصر؟" == "ما هي عاصمه مصر".
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u060C\u061B\u061F\u066A-\u066D\u06D4«»]/g, ' ') // Arabic punctuation
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchNorm(title: string, content: string, tags: string[] = []): string {
  return normalizeArabicText(`${title || ''} ${content || ''} ${tags.join(' ')}`);
}

/**
 * Match a user question against the Q&A rules table.
 * Pass 1: exact normalized match on any enabled rule (so a specific rule always wins over a
 * longer rule that merely contains the query). Pass 2: contains / keyword logic by priority.
 */
export function matchQaRule(rawQuery: string): DbQaRule | null {
  const clean = normalizeArabicText(rawQuery);
  if (!clean) return null;

  const rules = listQaRules().filter((r) => r.enabled);
  const normalized = rules.map((r) => ({ rule: r, q: normalizeArabicText(r.question) }));

  let found: DbQaRule | null = normalized.find((n) => n.q === clean)?.rule || null;

  if (!found) {
    for (const { rule, q: qClean } of normalized) {
      if (!qClean) continue;
      let matched = false;
      if (rule.match_mode === 'exact') {
        matched = false; // exact handled in pass 1
      } else if (rule.match_mode === 'contains') {
        matched = clean.includes(qClean) || qClean.includes(clean);
      } else {
        if (clean.includes(qClean) || qClean.includes(clean)) {
          matched = true;
        } else if (rule.keywords.length > 0) {
          const queryTokens = new Set(clean.split(' '));
          matched = rule.keywords.some((kw) => {
            const kwClean = normalizeArabicText(kw);
            return Boolean(kwClean) && (clean.includes(kwClean) || queryTokens.has(kwClean));
          });
        }
      }
      if (matched) {
        found = rule;
        break;
      }
    }
  }

  if (found) {
    try {
      getDb().prepare('UPDATE bot_qa_rules SET hits = hits + 1 WHERE id = ?').run(found.id);
      found.hits += 1;
    } catch {
      /* ignore */
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Bulk Q&A import (استيراد جماعي)
// ---------------------------------------------------------------------------
export interface BulkQaItem {
  question: string;
  answer: string;
  keywords?: string[] | string;
}

export interface BulkQaResult {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  invalidCount: number;
  totalRules: number;
}

function toKeywordArray(kw: unknown): string[] {
  if (Array.isArray(kw)) return kw.map((k) => String(k).trim()).filter(Boolean);
  if (typeof kw === 'string') return kw.split(/[,،\n]+/).map((k) => k.trim()).filter(Boolean);
  return [];
}

/**
 * Import many Q&A pairs in ONE atomic transaction.
 * Duplicates are detected on the normalized question text (against existing rules and within the batch).
 * mode 'upsert' updates the existing answer (and keywords when supplied); 'skip' leaves it untouched.
 */
export function bulkImportQaRules(items: BulkQaItem[], mode: 'upsert' | 'skip' = 'upsert'): BulkQaResult {
  const d = getDb();
  const existing = d.prepare('SELECT id, question FROM bot_qa_rules').all() as Array<{ id: string; question: string }>;
  const byNorm = new Map<string, string>();
  for (const r of existing) {
    const n = normalizeArabicText(r.question);
    if (n && !byNorm.has(n)) byNorm.set(n, r.id);
  }

  const result: BulkQaResult = { importedCount: 0, updatedCount: 0, skippedCount: 0, invalidCount: 0, totalRules: 0 };
  const now = new Date().toISOString();
  const ins = d.prepare(
    `INSERT INTO bot_qa_rules (id, question, keywords, answer, audio_file_id, match_mode, priority, enabled, hits, source, external_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, 'smart', 0, 1, 0, 'bulk_import', NULL, ?, ?)`
  );
  const updWithKw = d.prepare('UPDATE bot_qa_rules SET answer = ?, keywords = ?, updated_at = ? WHERE id = ?');
  const updAnswer = d.prepare('UPDATE bot_qa_rules SET answer = ?, updated_at = ? WHERE id = ?');

  transaction(() => {
    items.forEach((item, i) => {
      const question = typeof item?.question === 'string' ? item.question.trim() : '';
      const answer = typeof item?.answer === 'string' ? item.answer.trim() : '';
      const norm = normalizeArabicText(question);
      if (!question || !answer || !norm) {
        result.invalidCount++;
        return;
      }
      const keywords = toKeywordArray(item.keywords);
      const existingId = byNorm.get(norm);
      if (existingId) {
        if (mode === 'skip') {
          result.skippedCount++;
          return;
        }
        if (keywords.length > 0) updWithKw.run(answer, JSON.stringify(keywords), now, existingId);
        else updAnswer.run(answer, now, existingId);
        result.updatedCount++;
        return;
      }
      const id = `qa-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      ins.run(id, question, JSON.stringify(keywords), answer, now, now);
      byNorm.set(norm, id);
      result.importedCount++;
    });
  });

  result.totalRules = Number((d.prepare('SELECT COUNT(*) AS c FROM bot_qa_rules').get() as any)?.c || 0);
  return result;
}

/** Upsert a Q&A rule owned by an external source (e.g. Waraqa), keyed by (source, external_id). */
export function upsertExternalQaRule(
  source: string,
  externalId: string,
  data: { question: string; answer: string; keywords?: string[] }
): void {
  const now = new Date().toISOString();
  const id = `${source}-qa-${externalId}`.slice(0, 200);
  getDb()
    .prepare(
      `INSERT INTO bot_qa_rules (id, question, keywords, answer, audio_file_id, match_mode, priority, enabled, hits, source, external_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, 'smart', 0, 1, 0, ?, ?, ?, ?)
       ON CONFLICT(source, external_id) DO UPDATE SET
         question = excluded.question, keywords = excluded.keywords, answer = excluded.answer, updated_at = excluded.updated_at`
    )
    .run(id, data.question.trim(), JSON.stringify(data.keywords || []), data.answer.trim(), source, externalId, now, now);
}

export function deleteExternalQaRule(source: string, externalId: string): number {
  return Number(
    getDb().prepare('DELETE FROM bot_qa_rules WHERE source = ? AND external_id = ?').run(source, externalId).changes || 0
  );
}

// ---------------------------------------------------------------------------
// bot_audio_files (مكتبة الأصوات والردود المباشرة)
// ---------------------------------------------------------------------------
export interface DbAudioFile {
  id: string;
  label: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url: string;
}

export function listAudioFiles(): DbAudioFile[] {
  const rows = getDb()
    .prepare('SELECT * FROM bot_audio_files ORDER BY created_at DESC')
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    file_name: r.file_name,
    mime_type: r.mime_type,
    size_bytes: Number(r.size_bytes || 0),
    created_at: r.created_at,
    url: `/api/bot/audio/${r.file_name}`,
  }));
}

export function getAudioFile(id: string): DbAudioFile | null {
  const r = getDb().prepare('SELECT * FROM bot_audio_files WHERE id = ?').get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    label: r.label,
    file_name: r.file_name,
    mime_type: r.mime_type,
    size_bytes: Number(r.size_bytes || 0),
    created_at: r.created_at,
    url: `/api/bot/audio/${r.file_name}`,
  };
}

export function saveAudioFile(
  label: string,
  originalName: string,
  mimeType: string,
  buffer: Buffer
): DbAudioFile {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const ext = path.extname(originalName) || (mimeType.includes('ogg') ? '.ogg' : '.mp3');
  const id = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const fileName = `${id}${ext}`;
  const filePath = path.join(AUDIO_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO bot_audio_files (id, label, file_name, mime_type, size_bytes, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, label.trim() || originalName, fileName, mimeType, buffer.length, now);

  return {
    id,
    label: label.trim() || originalName,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: buffer.length,
    created_at: now,
    url: `/api/bot/audio/${fileName}`,
  };
}

export function deleteAudioFile(id: string): boolean {
  const file = getAudioFile(id);
  if (!file) return false;
  try {
    const filePath = path.join(AUDIO_DIR, file.file_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore unlink error */
  }
  const res = getDb().prepare('DELETE FROM bot_audio_files WHERE id = ?').run(id);
  return res.changes > 0;
}

export function getAudioFilePath(fileName: string): string | null {
  const safeName = path.basename(fileName);
  const filePath = path.join(AUDIO_DIR, safeName);
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

// ---------------------------------------------------------------------------
// Published Library (مكتبة الكتب والملاحظات المنشورة للبوت)
// ---------------------------------------------------------------------------
export interface PublishedList {
  id: string;
  owner_uid: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string | null;
  sort_order: number;
  is_archived: boolean;
  bot_visible: boolean;
  source?: string;
  external_id?: string | null;
  updated_at: string;
  published_at: string;
}

export interface PublishedNote {
  id: string;
  owner_uid: string;
  list_id?: string | null;
  parent_id?: string | null;
  title: string;
  content_text: string;
  tags: string[];
  is_pinned: boolean;
  search_text: string;
  source?: string;
  external_id?: string | null;
  updated_at: string;
  published_at: string;
}

export function upsertPublishedList(list: Partial<PublishedList> & { id: string; name: string; owner_uid: string }): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO library_lists 
       (id, owner_uid, name, icon, color, parent_id, sort_order, is_archived, bot_visible, source, external_id, updated_at, published_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      list.id,
      list.owner_uid,
      list.name.trim(),
      list.icon || 'Folder',
      list.color || '#6366f1',
      list.parent_id || null,
      list.sort_order || 0,
      list.is_archived ? 1 : 0,
      list.bot_visible !== false ? 1 : 0,
      list.source || 'local',
      list.external_id || null,
      list.updated_at || now,
      now
    );
}

export function deletePublishedList(id: string): void {
  getDb().prepare('DELETE FROM library_lists WHERE id = ?').run(id);
  getDb().prepare('DELETE FROM library_notes WHERE list_id = ?').run(id);
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function upsertPublishedNote(note: Partial<PublishedNote> & { id: string; title: string; owner_uid: string }): void {
  const now = new Date().toISOString();
  const plainContent = stripHtml(note.content_text || '');
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const searchText = `${note.title} ${plainContent} ${tags.join(' ')}`;

  getDb()
    .prepare(
      `INSERT OR REPLACE INTO library_notes 
       (id, owner_uid, list_id, parent_id, title, content_text, tags, is_pinned, search_text, search_norm, source, external_id, updated_at, published_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      note.id,
      note.owner_uid,
      note.list_id || null,
      note.parent_id || null,
      note.title.trim(),
      plainContent,
      JSON.stringify(tags),
      note.is_pinned ? 1 : 0,
      searchText,
      buildSearchNorm(note.title, plainContent, tags),
      note.source || 'local',
      note.external_id || null,
      note.updated_at || now,
      now
    );
}

/** Remove every published note owned by an external record (e.g. all sections of one Waraqa book). */
export function deleteExternalNotes(source: string, externalId: string): number {
  return Number(
    getDb().prepare('DELETE FROM library_notes WHERE source = ? AND external_id = ?').run(source, externalId).changes || 0
  );
}

export function deleteExternalList(source: string, externalId: string): number {
  return Number(
    getDb().prepare('DELETE FROM library_lists WHERE source = ? AND external_id = ?').run(source, externalId).changes || 0
  );
}

export function getExternalSourceStats(source: string): { lists: number; books: number; sections: number; qa: number } {
  const d = getDb();
  const l = d.prepare('SELECT COUNT(*) AS c FROM library_lists WHERE source = ?').get(source) as any;
  const n = d
    .prepare('SELECT COUNT(*) AS c, COUNT(DISTINCT external_id) AS b FROM library_notes WHERE source = ?')
    .get(source) as any;
  const q = d.prepare('SELECT COUNT(*) AS c FROM bot_qa_rules WHERE source = ?').get(source) as any;
  return { lists: Number(l?.c || 0), books: Number(n?.b || 0), sections: Number(n?.c || 0), qa: Number(q?.c || 0) };
}

export function deletePublishedNote(id: string): void {
  getDb().prepare('DELETE FROM library_notes WHERE id = ?').run(id);
}

export function getPublishedStats(): { listsCount: number; notesCount: number; lastPublishedAt: string | null } {
  const lRow = getDb().prepare('SELECT COUNT(*) as c FROM library_lists').get() as any;
  const nRow = getDb().prepare('SELECT COUNT(*) as c, MAX(published_at) as last_p FROM library_notes').get() as any;
  return {
    listsCount: Number(lRow?.c || 0),
    notesCount: Number(nRow?.c || 0),
    lastPublishedAt: nRow?.last_p || null,
  };
}

export function clearPublishedLibrary(ownerUid?: string): void {
  if (ownerUid) {
    getDb().prepare('DELETE FROM library_notes WHERE owner_uid = ?').run(ownerUid);
    getDb().prepare('DELETE FROM library_lists WHERE owner_uid = ?').run(ownerUid);
  } else {
    getDb().prepare('DELETE FROM library_notes').run();
    getDb().prepare('DELETE FROM library_lists').run();
  }
}

export interface LibrarySearchResult {
  id: string;
  title: string;
  snippet: string;
  listName?: string;
  tags: string[];
  relevance: number;
}

// Very common Arabic question/function words (already normalized). Used only to narrow the SQL
// pre-filter, so a query like "ما هي عاصمة مصر" does not scan every note just because of "ما"/"هي".
const SEARCH_STOPWORDS = new Set([
  'ما', 'ماذا', 'هي', 'هو', 'هل', 'في', 'من', 'على', 'عن', 'الي', 'الى', 'كيف', 'لماذا', 'متي', 'اين', 'كم',
  'او', 'ثم', 'ان', 'لا', 'لم', 'لن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'يا', 'قد', 'كان', 'بين',
]);

export function searchPublishedLibrary(query: string, limit = 5): LibrarySearchResult[] {
  const clean = normalizeArabicText(query);
  if (!clean) return [];

  const tokens = clean.split(' ').filter((t) => t.length > 1);
  if (tokens.length === 0) return [];
  const significant = tokens.filter((t) => !SEARCH_STOPWORDS.has(t));
  const filterTokens = (significant.length > 0 ? significant : tokens).slice(0, 12);

  const d = getDb();
  // Lists whose (normalized) name matches a token also contribute their notes.
  const lists = d.prepare('SELECT id, name FROM library_lists').all() as Array<{ id: string; name: string }>;
  const matchingListIds = lists
    .filter((l) => {
      const n = normalizeArabicText(l.name);
      return filterTokens.some((t) => n.includes(t));
    })
    .map((l) => l.id);

  // SQL pre-filter on the precomputed normalized text (fast C-level LIKE scan).
  const likeClauses = filterTokens.map(() => "COALESCE(n.search_norm, '') LIKE ?");
  const params: string[] = filterTokens.map((t) => `%${t.replace(/[%_]/g, '')}%`);
  if (matchingListIds.length > 0) {
    likeClauses.push(`n.list_id IN (${matchingListIds.map(() => '?').join(',')})`);
    params.push(...matchingListIds);
  }

  // Notes must be in visible lists (or not assigned to a list)
  const rows = d
    .prepare(
      `SELECT n.id, n.title, n.content_text, n.tags, n.search_norm, l.name as list_name 
       FROM library_notes n 
       LEFT JOIN library_lists l ON n.list_id = l.id 
       WHERE (l.bot_visible IS NULL OR l.bot_visible = 1) 
         AND (l.is_archived IS NULL OR l.is_archived = 0)
         AND (${likeClauses.join(' OR ')})`
    )
    .all(...params) as any[];

  const scored: LibrarySearchResult[] = [];

  for (const row of rows) {
    const titleNorm = normalizeArabicText(row.title);
    const bodyNorm: string = row.search_norm || normalizeArabicText(row.content_text);
    const listNorm = normalizeArabicText(row.list_name || '');
    let score = 0;

    if (titleNorm.includes(clean)) score += 10;
    if (bodyNorm.includes(clean)) score += 5;

    for (const t of tokens) {
      const weight = SEARCH_STOPWORDS.has(t) ? 0.25 : 1;
      if (titleNorm.includes(t)) score += 3 * weight;
      if (listNorm.includes(t)) score += 2 * weight;
      if (bodyNorm.includes(t)) score += 1 * weight;
    }

    if (score > 0) {
      // Extract a ~400-character snippet around the first significant match
      let snippet: string = row.content_text || '';
      if (snippet.length > 400) {
        const contentNorm = normalizeArabicText(snippet);
        const idx = contentNorm.indexOf(filterTokens[0]);
        const ratio = contentNorm.length > 0 ? snippet.length / contentNorm.length : 1;
        const approx = idx > 0 ? Math.floor(idx * ratio) : 0;
        const start = Math.max(0, approx - 60);
        snippet = (start > 0 ? '...' : '') + snippet.slice(start, start + 400) + '...';
      }

      let tags: string[] = [];
      try {
        tags = JSON.parse(row.tags || '[]');
      } catch {
        /* ignore */
      }
      scored.push({
        id: row.id,
        title: row.title,
        snippet,
        listName: row.list_name || undefined,
        tags,
        relevance: score,
      });
    }
  }

  scored.sort((a, b) => b.relevance - a.relevance);
  return scored.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Chat Logs & Live SSE Event Subscriptions
// ---------------------------------------------------------------------------
type ChatLogListener = (log: any) => void;
const logListeners = new Set<ChatLogListener>();

export function subscribeChatLogs(listener: ChatLogListener): () => void {
  logListeners.add(listener);
  return () => {
    logListeners.delete(listener);
  };
}

export function logBotChat(entry: {
  sessionId?: string;
  channel?: string;
  inputType?: 'text' | 'voice';
  question: string;
  answer: string;
  source?: string;
  provider?: string;
  ruleId?: string;
  sources?: string[];
  latencyMs?: number;
  clientHash?: string;
}): void {
  const now = new Date().toISOString();
  try {
    const res = getDb()
      .prepare(
        `INSERT INTO bot_chat_logs 
         (session_id, channel, input_type, question, answer, source, provider, rule_id, sources, latency_ms, client_hash, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.sessionId || null,
        entry.channel || 'public_web',
        entry.inputType || 'text',
        entry.question,
        entry.answer,
        entry.source || null,
        entry.provider || null,
        entry.ruleId || null,
        JSON.stringify(entry.sources || []),
        entry.latencyMs || null,
        entry.clientHash || null,
        now
      );

    const logRecord = {
      id: Number(res.lastInsertRowid),
      sessionId: entry.sessionId,
      channel: entry.channel || 'public_web',
      inputType: entry.inputType || 'text',
      question: entry.question,
      answer: entry.answer,
      source: entry.source,
      provider: entry.provider,
      ruleId: entry.ruleId,
      sources: entry.sources || [],
      latencyMs: entry.latencyMs,
      createdAt: now,
    };

    // Broadcast to SSE clients
    for (const listener of logListeners) {
      try {
        listener(logRecord);
      } catch {
        /* ignore failed listener */
      }
    }
  } catch (err) {
    console.error('Failed to log bot chat:', err);
  }
}

export function getBotChatLogs(limit = 100, offset = 0): any[] {
  const rows = getDb()
    .prepare('SELECT * FROM bot_chat_logs ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as any[];
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    channel: r.channel,
    inputType: r.input_type,
    question: r.question,
    answer: r.answer,
    source: r.source,
    provider: r.provider,
    ruleId: r.rule_id,
    sources: JSON.parse(r.sources || '[]'),
    latencyMs: r.latency_ms,
    createdAt: r.created_at,
  }));
}
