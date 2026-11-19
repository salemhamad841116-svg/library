/**
 * Flexible parser for bulk Q&A JSON import (استيراد جماعي).
 *
 * Accepts:
 *  1. Key→value map, WITH or WITHOUT the outer braces:
 *       "ما هي عاصمة الإمارات؟": "أبوظبي", "ما هي عاصمة مصر؟": "القاهرة"
 *  2. Array of objects: [{"question": "...", "answer": "...", "keywords": "..."}]
 *     (Arabic keys السؤال / الجواب / الإجابة / الكلمات_المفتاحية are accepted too, as are [q, a] tuples)
 *  3. Wrapper objects such as {"items": [...]} / {"rules": [...]} (e.g. older exports)
 *
 * Normalization: trims, strips BOM and trailing commas, wraps bare pairs in { }, and on failure
 * retries with smart quotes straightened and missing commas between lines inserted.
 */

export interface ParsedQaItem {
  question: string;
  answer: string;
  keywords?: string[];
}

export interface QaParseResult {
  ok: boolean;
  items: ParsedQaItem[];
  /** Arabic error message when the text cannot be parsed. */
  error: string | null;
  /** Entries that were skipped because the question or answer was empty. */
  invalidCount: number;
  /** Repeated questions inside the pasted input (last one wins). */
  duplicateCount: number;
}

const QUESTION_KEYS = ['question', 'q', 'query', 'سؤال', 'السؤال'];
const ANSWER_KEYS = ['answer', 'a', 'response', 'reply', 'جواب', 'الجواب', 'الاجابة', 'الإجابة'];
const KEYWORD_KEYS = ['keywords', 'tags', 'الكلمات_المفتاحية', 'الكلمات المفتاحية', 'كلمات'];

export function normalizeQaJsonInput(raw: string): string {
  let t = String(raw || '').replace(/^\uFEFF/, '').trim();
  if (!t) return '';
  // trailing separators at the very end: `..."القاهرة",` or `...;`
  t = t.replace(/[,،;\s]+$/u, '');
  if (!t.startsWith('{') && !t.startsWith('[')) t = `{${t}}`;
  // trailing commas before a closing bracket/brace
  t = t.replace(/,(\s*[}\]])/g, '$1');
  return t;
}

function lenientVariants(normalized: string): string[] {
  const out = [normalized];
  const straightQuotes = normalized.replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"');
  if (straightQuotes !== normalized) out.push(straightQuotes);
  // `"a": "b"\n"c": "d"` → insert the missing comma between lines
  const withCommas = straightQuotes.replace(/"\s*\n\s*"/g, '",\n"').replace(/}\s*\n\s*{/g, '},\n{');
  if (withCommas !== straightQuotes) out.push(withCommas);
  return out;
}

function pick(obj: Record<string, any>, keys: string[]): any {
  for (const k of Object.keys(obj)) {
    if (keys.includes(k.trim().toLowerCase()) || keys.includes(k.trim())) return obj[k];
  }
  return undefined;
}

function toKeywords(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const arr = v.map((x) => String(x).trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof v === 'string' && v.trim()) {
    const arr = v.split(/[,،\n]+/).map((x) => x.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
}

const asText = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

function itemsFromValue(value: any): { items: ParsedQaItem[]; invalid: number } | null {
  const items: ParsedQaItem[] = [];
  let invalid = 0;

  if (Array.isArray(value)) {
    for (const el of value) {
      if (Array.isArray(el) && el.length >= 2) {
        const question = asText(el[0]);
        const answer = asText(el[1]);
        if (question && answer) items.push({ question, answer });
        else invalid++;
      } else if (el && typeof el === 'object') {
        const question = asText(pick(el, QUESTION_KEYS));
        const answer = asText(pick(el, ANSWER_KEYS));
        const keywords = toKeywords(pick(el, KEYWORD_KEYS));
        if (question && answer) items.push(keywords ? { question, answer, keywords } : { question, answer });
        else invalid++;
      } else {
        invalid++;
      }
    }
    return { items, invalid };
  }

  if (value && typeof value === 'object') {
    // wrapper: {"items": [...]} / {"rules": [...]} / {"qa": [...]}
    for (const key of ['items', 'rules', 'qa', 'data']) {
      if (Array.isArray(value[key]) && Object.keys(value).length <= 3) return itemsFromValue(value[key]);
    }
    // single object {"question": "...", "answer": "..."}
    const singleQ = pick(value, QUESTION_KEYS);
    const singleA = pick(value, ANSWER_KEYS);
    if (typeof singleQ === 'string' && typeof singleA === 'string' && Object.keys(value).length <= 4) {
      return itemsFromValue([value]);
    }
    // key → value map
    for (const [k, v] of Object.entries(value)) {
      const question = k.trim();
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const answer = asText(pick(v as any, ANSWER_KEYS));
        const keywords = toKeywords(pick(v as any, KEYWORD_KEYS));
        if (question && answer) items.push(keywords ? { question, answer, keywords } : { question, answer });
        else invalid++;
      } else {
        const answer = asText(v);
        if (question && answer) items.push({ question, answer });
        else invalid++;
      }
    }
    return { items, invalid };
  }
  return null;
}

function describeSyntaxError(err: unknown, text: string): string {
  const msg = String((err as any)?.message || err || '');
  const m = msg.match(/position\s+(\d+)/i);
  if (m) {
    const pos = Number(m[1]);
    const before = text.slice(0, pos);
    const line = before.split('\n').length;
    const near = text.slice(Math.max(0, pos - 25), pos + 25).replace(/\s+/g, ' ');
    return `صيغة JSON غير صحيحة قرب السطر ${line}: «${near}». تأكد من وضع كل سؤال وجواب بين علامتي تنصيص "..." والفصل بينها بفاصلة.`;
  }
  return 'صيغة JSON غير صحيحة. استخدم الشكل: "السؤال": "الجواب", "سؤال آخر": "جواب آخر" أو مصفوفة [{"question": "...", "answer": "..."}].';
}

export function parseQaImport(raw: string): QaParseResult {
  const normalized = normalizeQaJsonInput(raw);
  if (!normalized) {
    return { ok: false, items: [], error: null, invalidCount: 0, duplicateCount: 0 };
  }

  let parsed: any;
  let firstError: unknown = null;
  let parsedOk = false;
  for (const variant of lenientVariants(normalized)) {
    try {
      parsed = JSON.parse(variant);
      parsedOk = true;
      break;
    } catch (err) {
      if (!firstError) firstError = err;
    }
  }
  if (!parsedOk) {
    return { ok: false, items: [], error: describeSyntaxError(firstError, normalized), invalidCount: 0, duplicateCount: 0 };
  }

  const extracted = itemsFromValue(parsed);
  if (!extracted) {
    return {
      ok: false,
      items: [],
      error: 'لم يتم التعرف على أي سؤال وجواب. الصيغة المدعومة: كائن "سؤال": "جواب" أو مصفوفة كائنات question/answer.',
      invalidCount: 0,
      duplicateCount: 0,
    };
  }

  // de-duplicate questions inside the input (last occurrence wins)
  const norm = (q: string) =>
    q
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[؟?!.,،؛:«»"'()\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  const map = new Map<string, ParsedQaItem>();
  let duplicateCount = 0;
  for (const it of extracted.items) {
    const key = norm(it.question);
    if (map.has(key)) duplicateCount++;
    map.set(key, it);
  }
  const items = [...map.values()];

  return {
    ok: items.length > 0,
    items,
    error: items.length === 0 ? 'لم يتم العثور على أي سؤال وجواب صالح (السؤال والجواب يجب ألا يكونا فارغين).' : null,
    invalidCount: extracted.invalid,
    duplicateCount,
  };
}

/** Build the export payload — the same array format the importer accepts. */
export function buildQaExport(rules: Array<{ question: string; answer: string; keywords?: string[] }>): string {
  return JSON.stringify(
    rules.map((r) => ({
      question: r.question,
      answer: r.answer,
      keywords: (r.keywords || []).join('، '),
    })),
    null,
    2
  );
}
