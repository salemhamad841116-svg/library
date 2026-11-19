/**
 * Waraqa → Bot live sync bridge.
 *
 * waraqa.misruq.com (masruq_rag_backend) is the primary data-entry portal. It stores books,
 * documents, OCR pages, chunks and (optionally) Q&A pairs in its own SQLite file. This worker
 * opens that file STRICTLY READ-ONLY (WARAQA_DB_PATH, mounted `:ro` into this container) and
 * mirrors the content into this server's platform.db:
 *
 *   - documents / books  → library_notes sections (one per page or chunk) → Layer 3/4 answers
 *   - categories         → library_lists (book title + category attribution)
 *   - Q&A tables         → bot_qa_rules → Layer 1 instant answers
 *
 * Every synced row is tagged `source = 'waraqa'` + `external_id`, so admin/local content is never
 * touched. Sync is incremental: each record has a fingerprint stored in waraqa_sync_state and only
 * changed records are re-imported; records deleted in Waraqa are removed here.
 *
 * Table discovery is schema-tolerant (sqlite_master + PRAGMA table_info) with env overrides
 * WARAQA_BOOKS_TABLE and WARAQA_QA_TABLE. Missing/empty optional tables are skipped, never fatal.
 */
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getDb,
  transaction,
  upsertPublishedList,
  upsertPublishedNote,
  deleteExternalNotes,
  deleteExternalList,
  upsertExternalQaRule,
  deleteExternalQaRule,
  getExternalSourceStats,
} from '../db/platformDb.js';

export const WARAQA_SOURCE = 'waraqa';
const OWNER_UID = 'waraqa';
const DEFAULT_LIST_EXT = 'library';
const DEFAULT_LIST_ID = 'waraqa-library';
const DEFAULT_LIST_NAME = 'مكتبة ورقة';
const SECTION_TARGET_CHARS = 1500;

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
export interface WaraqaDiscovery {
  booksTable: string | null;
  contentStrategy: string[];
  categoriesTable: string | null;
  qaTable: string | null;
  tables: string[];
}

export interface WaraqaSyncStatus {
  configured: boolean;
  dbPath: string | null;
  intervalMs: number;
  running: boolean;
  mode: 'direct' | 'snapshot' | null;
  lastRunAt: string | null;
  lastSyncedAt: string | null;
  lastDurationMs: number | null;
  lastTrigger: string | null;
  lastError: string | null;
  lastRun: {
    booksImported: number;
    booksRemoved: number;
    booksPending: number;
    qaImported: number;
    qaRemoved: number;
    categories: number;
  };
  discovery: WaraqaDiscovery | null;
  totals: { lists: number; books: number; sections: number; qa: number };
}

function emptyRun(): WaraqaSyncStatus['lastRun'] {
  return { booksImported: 0, booksRemoved: 0, booksPending: 0, qaImported: 0, qaRemoved: 0, categories: 0 };
}

const status: WaraqaSyncStatus = {
  configured: false,
  dbPath: null,
  intervalMs: 15000,
  running: false,
  mode: null,
  lastRunAt: null,
  lastSyncedAt: null,
  lastDurationMs: null,
  lastTrigger: null,
  lastError: null,
  lastRun: emptyRun(),
  discovery: null,
  totals: { lists: 0, books: 0, sections: 0, qa: 0 },
};

function resolveConfig(): { dbPath: string | null; intervalMs: number } {
  const dbPath = (process.env.WARAQA_DB_PATH || '').trim() || null;
  const interval = parseInt(process.env.WARAQA_SYNC_INTERVAL_MS || '', 10);
  return { dbPath, intervalMs: Number.isFinite(interval) && interval >= 3000 ? interval : 15000 };
}

export function getWaraqaSyncStatus(): WaraqaSyncStatus {
  const cfg = resolveConfig();
  status.configured = Boolean(cfg.dbPath);
  status.dbPath = cfg.dbPath;
  status.intervalMs = cfg.intervalMs;
  try {
    status.totals = getExternalSourceStats(WARAQA_SOURCE);
  } catch {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(status));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sha1 = (s: string) => crypto.createHash('sha1').update(s).digest('hex');
const qi = (ident: string) => `"${ident.replace(/"/g, '""')}"`;
const yieldTick = () => new Promise<void>((r) => setImmediate(r));

function pickColumn(cols: string[], candidates: string[], fuzzy?: RegExp): string | null {
  const lower = new Map(cols.map((c) => [c.toLowerCase(), c]));
  for (const c of candidates) {
    const hit = lower.get(c.toLowerCase());
    if (hit) return hit;
  }
  if (fuzzy) {
    const f = cols.find((c) => fuzzy.test(c));
    if (f) return f;
  }
  return null;
}

interface ColInfo {
  name: string;
  type: string;
}

/** Open the Waraqa DB read-only; fall back to a private temp snapshot if WAL on a :ro mount blocks it. */
function openWaraqa(dbPath: string): { db: DatabaseSync; mode: 'direct' | 'snapshot'; close: () => void } {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`ملف قاعدة بيانات ورقة غير موجود: ${dbPath}`);
  }
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      db.exec('PRAGMA busy_timeout = 3000');
      db.prepare('SELECT COUNT(*) AS c FROM sqlite_master').get();
      return { db, mode: 'direct', close: () => db.close() };
    } catch (err) {
      try {
        db.close();
      } catch {
        /* ignore */
      }
      throw err;
    }
  } catch (directErr: any) {
    // Snapshot fallback: copy db (+ -wal) into a private temp dir and read the copy.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waraqa-snap-'));
    const target = path.join(dir, 'waraqa.db');
    try {
      fs.copyFileSync(dbPath, target);
      if (fs.existsSync(`${dbPath}-wal`)) fs.copyFileSync(`${dbPath}-wal`, `${target}-wal`);
      const db = new DatabaseSync(target);
      db.prepare('SELECT COUNT(*) AS c FROM sqlite_master').get();
      return {
        db,
        mode: 'snapshot',
        close: () => {
          try {
            db.close();
          } finally {
            fs.rmSync(dir, { recursive: true, force: true });
          }
        },
      };
    } catch (snapErr: any) {
      fs.rmSync(dir, { recursive: true, force: true });
      throw new Error(`تعذر فتح قاعدة بيانات ورقة للقراءة: ${directErr?.message || directErr} / ${snapErr?.message || snapErr}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Schema discovery
// ---------------------------------------------------------------------------
interface ChildTable {
  table: string;
  fk: string;
  text: string;
  order: string | null;
  page: string | null;
}

interface Discovered {
  public: WaraqaDiscovery;
  books: null | {
    table: string;
    id: string;
    title: string;
    content: string | null;
    category: string | null;
    status: string | null;
    deletedAt: string | null;
    isDeleted: string | null;
    metaCols: string[];
  };
  chunks: ChildTable | null;
  pages: ChildTable | null;
  categories: null | { table: string; id: string; name: string };
  qa: null | {
    table: string;
    id: string;
    question: string;
    answer: string;
    keywords: string | null;
    enabled: string | null;
    deletedAt: string | null;
  };
}

function discover(w: DatabaseSync): Discovered {
  const tables = (
    w.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{
      name: string;
    }>
  ).map((r) => r.name);
  const colsOf = (t: string): ColInfo[] =>
    (w.prepare(`PRAGMA table_info(${qi(t)})`).all() as Array<{ name: string; type: string }>).map((c) => ({
      name: c.name,
      type: String(c.type || '').toUpperCase(),
    }));
  const names = (t: string) => colsOf(t).map((c) => c.name);
  const has = (t: string | undefined | null) => Boolean(t && tables.includes(t));

  const TITLE = ['title', 'name', 'book_title', 'عنوان', 'العنوان'];
  const CONTENT = ['raw_text', 'content', 'content_text', 'text', 'body', 'extracted_text', 'ocr_text'];

  // --- books / documents table
  let booksTable: string | null = null;
  const envBooks = (process.env.WARAQA_BOOKS_TABLE || '').trim();
  if (envBooks && has(envBooks)) booksTable = envBooks;
  else if (has('documents')) booksTable = 'documents';
  else if (has('books')) booksTable = 'books';
  else {
    booksTable =
      tables.find((t) => {
        const c = names(t);
        return pickColumn(c, TITLE) && pickColumn(c, CONTENT) && !/user|session|audit|event|invitation|setting/i.test(t);
      }) || null;
  }

  let books: Discovered['books'] = null;
  if (booksTable) {
    const info = colsOf(booksTable);
    const c = info.map((x) => x.name);
    const title = pickColumn(c, TITLE);
    if (title) {
      const content = pickColumn(c, CONTENT);
      books = {
        table: booksTable,
        id: pickColumn(c, ['id', 'uuid', 'document_id', 'book_id']) || 'rowid',
        title,
        content,
        category: pickColumn(c, ['category_id', 'category', 'list_id']),
        status: pickColumn(c, ['index_status']),
        deletedAt: pickColumn(c, ['deleted_at']),
        isDeleted: pickColumn(c, ['is_deleted', 'deleted']),
        metaCols: info.filter((x) => x.name !== content && !x.type.includes('BLOB')).map((x) => x.name),
      };
    }
  }

  // --- child content tables (chunks, pages) referencing the books table
  const findChild = (preferred: string[], textCols: string[]): ChildTable | null => {
    const candidates = [...preferred.filter(has), ...tables.filter((t) => !preferred.includes(t))];
    for (const t of candidates) {
      if (t === booksTable) continue;
      const c = names(t);
      const fk = pickColumn(c, ['document_id', 'book_id', 'doc_id']);
      const text = pickColumn(c, textCols);
      if (fk && text) {
        return {
          table: t,
          fk,
          text,
          order: pickColumn(c, ['idx', 'chunk_index', 'position', 'page_number', 'page', 'id']),
          page: pickColumn(c, ['page', 'page_number']),
        };
      }
    }
    return null;
  };
  const chunks = books ? findChild(['chunks', 'document_chunks'], ['text', 'chunk_text', 'content']) : null;
  let pages = books ? findChild(['book_pages', 'pages', 'document_pages'], ['ocr_text', 'page_text']) : null;
  if (pages && chunks && pages.table === chunks.table) pages = null;

  // --- categories
  let categories: Discovered['categories'] = null;
  for (const t of ['categories', 'category', 'book_categories']) {
    if (!has(t)) continue;
    const c = names(t);
    const id = pickColumn(c, ['id']);
    const name = pickColumn(c, ['name', 'title']);
    if (id && name) {
      categories = { table: t, id, name };
      break;
    }
  }

  // --- Q&A
  let qa: Discovered['qa'] = null;
  const QUESTION = ['question', 'q', 'query', 'prompt', 'سؤال', 'السؤال'];
  const ANSWER = ['answer', 'a', 'response', 'reply', 'جواب', 'الجواب', 'الاجابة', 'الإجابة'];
  const envQa = (process.env.WARAQA_QA_TABLE || '').trim();
  const qaCandidates = envQa && has(envQa) ? [envQa] : tables.filter((t) => t !== booksTable);
  for (const t of qaCandidates) {
    const c = names(t);
    const question = pickColumn(c, QUESTION, /question/i);
    const answer = pickColumn(c, ANSWER, /answer/i);
    if (question && answer && question !== answer) {
      qa = {
        table: t,
        id: pickColumn(c, ['id', 'uuid']) || 'rowid',
        question,
        answer,
        keywords: pickColumn(c, ['keywords', 'tags', 'الكلمات_المفتاحية']),
        enabled: pickColumn(c, ['enabled', 'is_active', 'active']),
        deletedAt: pickColumn(c, ['deleted_at']),
      };
      break;
    }
  }

  const strategy: string[] = [];
  if (chunks) strategy.push(`${chunks.table}.${chunks.text}`);
  if (books?.content) strategy.push(`${books.table}.${books.content}`);
  if (pages) strategy.push(`${pages.table}.${pages.text}`);

  return {
    public: {
      booksTable: books?.table || null,
      contentStrategy: strategy,
      categoriesTable: categories?.table || null,
      qaTable: qa?.table || null,
      tables,
    },
    books,
    chunks,
    pages,
    categories,
    qa,
  };
}

// ---------------------------------------------------------------------------
// Sectioning
// ---------------------------------------------------------------------------
interface Section {
  label: string | null;
  text: string;
}

function splitText(text: string): Section[] {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) return [];
  if (clean.length <= SECTION_TARGET_CHARS * 1.3) return [{ label: null, text: clean }];
  const out: Section[] = [];
  let rest = clean;
  while (rest.length > 0) {
    if (rest.length <= SECTION_TARGET_CHARS * 1.3) {
      out.push({ label: null, text: rest });
      break;
    }
    let cut = rest.lastIndexOf('\n', SECTION_TARGET_CHARS);
    if (cut < SECTION_TARGET_CHARS * 0.5) cut = rest.lastIndexOf(' ', SECTION_TARGET_CHARS);
    if (cut < SECTION_TARGET_CHARS * 0.5) cut = SECTION_TARGET_CHARS;
    out.push({ label: null, text: rest.slice(0, cut).trim() });
    rest = rest.slice(cut).trim();
  }
  return out.map((s, i) => ({ label: `جزء ${i + 1}`, text: s.text }));
}

function sectionsFromChildRows(rows: Array<{ t: string; p: any }>, pageWord: string): Section[] {
  const hasPages = rows.some((r) => r.p !== null && r.p !== undefined && r.p !== '');
  if (hasPages) {
    const groups: Section[] = [];
    let current: { page: any; parts: string[] } | null = null;
    for (const r of rows) {
      if (!r.t || !String(r.t).trim()) continue;
      if (!current || current.page !== r.p) {
        if (current) groups.push({ label: `${pageWord} ${current.page}`, text: current.parts.join('\n') });
        current = { page: r.p, parts: [] };
      }
      current.parts.push(String(r.t).trim());
    }
    if (current) groups.push({ label: `${pageWord} ${current.page}`, text: current.parts.join('\n') });
    return groups;
  }
  const texts = rows.map((r) => String(r.t || '').trim()).filter(Boolean);
  return texts.map((t, i) => ({ label: texts.length > 1 ? `جزء ${i + 1}` : null, text: t }));
}

function writeDocumentSections(
  docExternalId: string,
  title: string,
  listId: string,
  sections: Section[],
  updatedAt?: string
): number {
  deleteExternalNotes(WARAQA_SOURCE, docExternalId);
  const safeId = sha1(docExternalId).slice(0, 16);
  sections.forEach((s, i) => {
    upsertPublishedNote({
      id: `waraqa-${safeId}-${i + 1}`,
      owner_uid: OWNER_UID,
      list_id: listId,
      parent_id: null,
      title: s.label ? `${title} — ${s.label}` : title,
      content_text: s.text,
      tags: ['ورقة', title],
      is_pinned: false,
      source: WARAQA_SOURCE,
      external_id: docExternalId,
      updated_at: updatedAt,
    });
  });
  return sections.length;
}

function ensureList(listExternalId: string, listId: string, name: string): void {
  upsertPublishedList({
    id: listId,
    owner_uid: OWNER_UID,
    name,
    icon: '📚',
    color: '#0ea5e9',
    is_archived: false,
    bot_visible: true,
    source: WARAQA_SOURCE,
    external_id: listExternalId,
  });
}

// ---------------------------------------------------------------------------
// Sync state
// ---------------------------------------------------------------------------
function loadState(kind: string): Map<string, string> {
  const rows = getDb()
    .prepare('SELECT external_id, fingerprint FROM waraqa_sync_state WHERE kind = ?')
    .all(kind) as Array<{ external_id: string; fingerprint: string }>;
  return new Map(rows.map((r) => [r.external_id, r.fingerprint]));
}

function setState(kind: string, externalId: string, fingerprint: string): void {
  getDb()
    .prepare(
      'INSERT OR REPLACE INTO waraqa_sync_state (kind, external_id, fingerprint, synced_at) VALUES (?, ?, ?, ?)'
    )
    .run(kind, externalId, fingerprint, new Date().toISOString());
}

function clearState(kind: string, externalId: string): void {
  getDb().prepare('DELETE FROM waraqa_sync_state WHERE kind = ? AND external_id = ?').run(kind, externalId);
}

// ---------------------------------------------------------------------------
// Main sync
// ---------------------------------------------------------------------------
export async function runWaraqaSync(trigger = 'manual'): Promise<WaraqaSyncStatus> {
  const cfg = resolveConfig();
  if (!cfg.dbPath) {
    status.lastError = 'WARAQA_DB_PATH غير مضبوط في متغيرات البيئة.';
    return getWaraqaSyncStatus();
  }
  if (status.running) return getWaraqaSyncStatus();

  status.running = true;
  status.lastTrigger = trigger;
  status.lastRunAt = new Date().toISOString();
  const started = Date.now();
  const run = emptyRun();
  let handle: ReturnType<typeof openWaraqa> | null = null;

  try {
    handle = openWaraqa(cfg.dbPath);
    status.mode = handle.mode;
    const w = handle.db;
    const d = discover(w);
    status.discovery = d.public;

    // ---------------- categories → lists
    const categoryNames = new Map<string, string>();
    if (d.categories) {
      const rows = w
        .prepare(`SELECT ${qi(d.categories.id)} AS id, ${qi(d.categories.name)} AS name FROM ${qi(d.categories.table)}`)
        .all() as Array<{ id: any; name: any }>;
      for (const r of rows) if (r.id !== null && r.name) categoryNames.set(String(r.id), String(r.name));
    }
    const catState = loadState('cat');
    const seenCats = new Set<string>();
    const listIdForCategory = (catId: any): string => {
      const key = catId === null || catId === undefined || catId === '' ? null : String(catId);
      const name = key ? categoryNames.get(key) || (d.categories ? null : key) : null;
      if (!key || !name) {
        seenCats.add(DEFAULT_LIST_EXT);
        if (catState.get(DEFAULT_LIST_EXT) !== DEFAULT_LIST_NAME) {
          ensureList(DEFAULT_LIST_EXT, DEFAULT_LIST_ID, DEFAULT_LIST_NAME);
          setState('cat', DEFAULT_LIST_EXT, DEFAULT_LIST_NAME);
          catState.set(DEFAULT_LIST_EXT, DEFAULT_LIST_NAME);
        }
        return DEFAULT_LIST_ID;
      }
      const ext = `cat:${key}`;
      const listId = `waraqa-cat-${sha1(key).slice(0, 16)}`;
      seenCats.add(ext);
      if (catState.get(ext) !== name) {
        ensureList(ext, listId, name);
        setState('cat', ext, name);
        catState.set(ext, name);
        run.categories++;
      }
      return listId;
    };

    // ---------------- documents / books
    const docState = loadState('doc');
    const seenDocs = new Set<string>();
    if (d.books) {
      const b = d.books;
      const where: string[] = [];
      if (b.deletedAt) where.push(`${qi(b.deletedAt)} IS NULL`);
      if (b.isDeleted) where.push(`COALESCE(${qi(b.isDeleted)}, 0) = 0`);
      const metaSelect = b.metaCols.map((c) => qi(c)).join(', ');
      const lenSelect = b.content ? `, LENGTH(${qi(b.content)}) AS __len` : '';
      const idSelect = b.id === 'rowid' ? 'rowid AS __id' : `${qi(b.id)} AS __id`;
      const rows = w
        .prepare(
          `SELECT ${idSelect}, ${metaSelect}${lenSelect} FROM ${qi(b.table)}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`
        )
        .all() as any[];

      const chunkStmt = d.chunks
        ? w.prepare(
            `SELECT ${qi(d.chunks.text)} AS t, ${d.chunks.page ? qi(d.chunks.page) : 'NULL'} AS p FROM ${qi(d.chunks.table)} WHERE ${qi(d.chunks.fk)} = ?${d.chunks.order ? ` ORDER BY ${qi(d.chunks.order)} ASC` : ''}`
          )
        : null;
      const pageStmt = d.pages
        ? w.prepare(
            `SELECT ${qi(d.pages.text)} AS t, ${d.pages.page ? qi(d.pages.page) : 'NULL'} AS p FROM ${qi(d.pages.table)} WHERE ${qi(d.pages.fk)} = ?${d.pages.order ? ` ORDER BY ${qi(d.pages.order)} ASC` : ''}`
          )
        : null;
      const contentStmt = b.content
        ? w.prepare(
            `SELECT ${qi(b.content)} AS t FROM ${qi(b.table)} WHERE ${b.id === 'rowid' ? 'rowid' : qi(b.id)} = ?`
          )
        : null;

      for (const row of rows) {
        const rawId = row.__id;
        if (rawId === null || rawId === undefined) continue;
        const ext = `doc:${rawId}`;
        seenDocs.add(ext);

        const statusVal = b.status ? String(row[b.status] ?? '') : 'completed';
        if (b.status && statusVal !== 'completed') {
          // Not indexed yet (or re-processing): keep any previous copy, import once completed.
          run.booksPending++;
          continue;
        }

        const { __id, ...meta } = row;
        const fp = sha1(JSON.stringify(meta));
        if (docState.get(ext) === fp) continue;

        const title = String(row[b.title] || 'كتاب بدون عنوان').trim();
        let sections: Section[] = [];
        if (chunkStmt) sections = sectionsFromChildRows(chunkStmt.all(rawId) as any[], 'صفحة');
        if (sections.length === 0 && contentStmt) {
          const c = contentStmt.get(rawId) as { t?: string } | undefined;
          sections = splitText(String(c?.t || ''));
        }
        if (sections.length === 0 && pageStmt) sections = sectionsFromChildRows(pageStmt.all(rawId) as any[], 'صفحة');

        const listId = listIdForCategory(b.category ? row[b.category] : null);
        const updatedAt = row.completed_at || row.updated_at || row.uploaded_at || undefined;
        transaction(() => {
          writeDocumentSections(ext, title, listId, sections, updatedAt ? String(updatedAt) : undefined);
          setState('doc', ext, fp);
          clearState('push-doc', ext);
        });
        run.booksImported++;
        await yieldTick();
      }
    }
    // Remove books deleted in Waraqa (only ones this poller imported).
    for (const ext of docState.keys()) {
      if (seenDocs.has(ext)) continue;
      transaction(() => {
        deleteExternalNotes(WARAQA_SOURCE, ext);
        clearState('doc', ext);
      });
      run.booksRemoved++;
    }

    // ---------------- Q&A
    const qaState = loadState('qa');
    const seenQa = new Set<string>();
    if (d.qa) {
      const q = d.qa;
      const where: string[] = [];
      if (q.deletedAt) where.push(`${qi(q.deletedAt)} IS NULL`);
      const idSelect = q.id === 'rowid' ? 'rowid' : qi(q.id);
      const rows = w
        .prepare(
          `SELECT ${idSelect} AS id, ${qi(q.question)} AS question, ${qi(q.answer)} AS answer${q.keywords ? `, ${qi(q.keywords)} AS keywords` : ''}${q.enabled ? `, ${qi(q.enabled)} AS enabled` : ''} FROM ${qi(q.table)}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`
        )
        .all() as any[];
      const changed: Array<{ ext: string; fp: string; question: string; answer: string; keywords: string[] }> = [];
      for (const r of rows) {
        const question = String(r.question ?? '').trim();
        const answer = String(r.answer ?? '').trim();
        if (r.id === null || r.id === undefined || !question || !answer) continue;
        if (q.enabled && (r.enabled === 0 || r.enabled === '0' || r.enabled === false)) continue;
        const ext = `qa:${r.id}`;
        seenQa.add(ext);
        let keywords: string[] = [];
        if (typeof r.keywords === 'string' && r.keywords.trim()) {
          try {
            const parsed = JSON.parse(r.keywords);
            keywords = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
          } catch {
            keywords = r.keywords.split(/[,،\n]+/).map((k: string) => k.trim()).filter(Boolean);
          }
        }
        const fp = sha1(JSON.stringify([question, answer, keywords]));
        if (qaState.get(ext) !== fp) changed.push({ ext, fp, question, answer, keywords });
      }
      if (changed.length > 0) {
        transaction(() => {
          for (const c of changed) {
            upsertExternalQaRule(WARAQA_SOURCE, c.ext, { question: c.question, answer: c.answer, keywords: c.keywords });
            setState('qa', c.ext, c.fp);
            clearState('push-qa', c.ext);
          }
        });
        run.qaImported += changed.length;
      }
    }
    const removedQa = [...qaState.keys()].filter((ext) => !seenQa.has(ext));
    if (removedQa.length > 0) {
      transaction(() => {
        for (const ext of removedQa) {
          deleteExternalQaRule(WARAQA_SOURCE, ext);
          clearState('qa', ext);
        }
      });
      run.qaRemoved += removedQa.length;
    }

    // ---------------- categories removed in Waraqa
    for (const ext of catState.keys()) {
      if (seenCats.has(ext)) continue;
      const stillUsed = getDb()
        .prepare(
          'SELECT COUNT(*) AS c FROM library_notes n JOIN library_lists l ON n.list_id = l.id WHERE l.source = ? AND l.external_id = ?'
        )
        .get(WARAQA_SOURCE, ext) as any;
      if (Number(stillUsed?.c || 0) > 0) continue;
      deleteExternalList(WARAQA_SOURCE, ext);
      clearState('cat', ext);
    }

    status.lastError = null;
    status.lastSyncedAt = new Date().toISOString();
    status.lastRun = run;
  } catch (err: any) {
    status.lastError = String(err?.message || err);
    status.lastRun = run;
    console.error('[waraqa-sync] failed:', status.lastError);
  } finally {
    try {
      handle?.close();
    } catch {
      /* ignore */
    }
    status.running = false;
    status.lastDurationMs = Date.now() - started;
  }
  return getWaraqaSyncStatus();
}

// ---------------------------------------------------------------------------
// Push API (used by the internal webhook)
// ---------------------------------------------------------------------------
export function pushWaraqaDocument(input: {
  externalId: string;
  title: string;
  content: string;
  category?: string | null;
}): { sections: number } {
  const ext = `doc:${input.externalId}`;
  const title = String(input.title || 'كتاب بدون عنوان').trim();
  const sections = splitText(String(input.content || ''));
  let listId = DEFAULT_LIST_ID;
  let count = 0;
  transaction(() => {
    if (input.category && String(input.category).trim()) {
      const name = String(input.category).trim();
      const listExt = `catname:${name}`;
      listId = `waraqa-catname-${sha1(name).slice(0, 16)}`;
      ensureList(listExt, listId, name);
    } else {
      ensureList(DEFAULT_LIST_EXT, DEFAULT_LIST_ID, DEFAULT_LIST_NAME);
    }
    count = writeDocumentSections(ext, title, listId, sections);
    setState('push-doc', ext, sha1(`${title}|${input.content}`));
  });
  return { sections: count };
}

export function pushWaraqaQa(input: { externalId: string; question: string; answer: string; keywords?: string[] | string }): void {
  const ext = `qa:${input.externalId}`;
  const keywords = Array.isArray(input.keywords)
    ? input.keywords.map(String)
    : typeof input.keywords === 'string'
      ? input.keywords.split(/[,،\n]+/).map((k) => k.trim()).filter(Boolean)
      : [];
  transaction(() => {
    upsertExternalQaRule(WARAQA_SOURCE, ext, { question: input.question, answer: input.answer, keywords });
    setState('push-qa', ext, sha1(`${input.question}|${input.answer}`));
  });
}

export function removeWaraqaRecord(externalId: string): { notes: number; qa: number } {
  const raw = String(externalId);
  const candidates = raw.startsWith('doc:') || raw.startsWith('qa:') ? [raw] : [`doc:${raw}`, `qa:${raw}`, raw];
  let notes = 0;
  let qa = 0;
  transaction(() => {
    for (const ext of candidates) {
      notes += deleteExternalNotes(WARAQA_SOURCE, ext);
      qa += deleteExternalQaRule(WARAQA_SOURCE, ext);
      for (const kind of ['doc', 'qa', 'push-doc', 'push-qa']) clearState(kind, ext);
    }
  });
  return { notes, qa };
}

// ---------------------------------------------------------------------------
// Background worker
// ---------------------------------------------------------------------------
let timer: NodeJS.Timeout | null = null;

export function startWaraqaSyncWorker(): void {
  const cfg = resolveConfig();
  status.configured = Boolean(cfg.dbPath);
  status.dbPath = cfg.dbPath;
  status.intervalMs = cfg.intervalMs;
  if (!cfg.dbPath) {
    console.log('[waraqa-sync] disabled (WARAQA_DB_PATH not set)');
    return;
  }
  if (timer) return;
  console.log(`[waraqa-sync] read-only sync from ${cfg.dbPath} every ${cfg.intervalMs / 1000}s`);
  setTimeout(() => void runWaraqaSync('startup'), 1500).unref();
  timer = setInterval(() => void runWaraqaSync('interval'), cfg.intervalMs);
  timer.unref();
}

export function stopWaraqaSyncWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
