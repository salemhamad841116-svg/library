import type { ClipboardEvent } from 'react';

/**
 * Utility to process pasted content (HTML, RTF, Plain Text) and preserve all
 * colors, font formatting, highlights, and rich styles accurately.
 */

// Common framework color classes to inline hex values
const PRESET_COLOR_MAP: Record<string, string> = {
  // Tailwind Text Colors
  'text-red-400': '#f87171',
  'text-red-500': '#ef4444',
  'text-red-600': '#dc2626',
  'text-red-700': '#b91c1c',
  'text-rose-500': '#f43f5e',
  'text-rose-600': '#e11d48',
  'text-blue-400': '#60a5fa',
  'text-blue-500': '#3b82f6',
  'text-blue-600': '#2563eb',
  'text-blue-700': '#1d4ed8',
  'text-sky-500': '#0ea5e9',
  'text-cyan-500': '#06b6d4',
  'text-green-500': '#22c55e',
  'text-green-600': '#16a34a',
  'text-emerald-500': '#10b981',
  'text-emerald-600': '#059669',
  'text-teal-500': '#14b8a6',
  'text-amber-500': '#f59e0b',
  'text-amber-600': '#d97706',
  'text-yellow-500': '#eab308',
  'text-yellow-600': '#ca8a04',
  'text-orange-500': '#f97316',
  'text-orange-600': '#ea580c',
  'text-purple-500': '#a855f7',
  'text-purple-600': '#9333ea',
  'text-indigo-500': '#6366f1',
  'text-indigo-600': '#4f46e5',
  'text-pink-500': '#ec4899',
  'text-pink-600': '#db2777',
  'text-slate-500': '#64748b',
  'text-gray-500': '#6b7280',

  // Bootstrap Text Colors
  'text-danger': '#dc3545',
  'text-primary': '#0d6efd',
  'text-success': '#198754',
  'text-warning': '#ffc107',
  'text-info': '#0dcaf0',
  'text-secondary': '#6c757d',

  // Code Highlight Classes
  'hljs-keyword': '#cf222e',
  'hljs-string': '#0a3069',
  'hljs-comment': '#6e7781',
  'hljs-number': '#0550ae',
  'hljs-function': '#8250df',
  'token-keyword': '#cf222e',
  'token-string': '#0a3069',
  'token-comment': '#6e7781',
};

const PRESET_BG_COLOR_MAP: Record<string, string> = {
  'bg-yellow-100': '#fef9c3',
  'bg-yellow-200': '#fef08a',
  'bg-yellow-300': '#fde047',
  'bg-amber-100': '#fef3c7',
  'bg-amber-200': '#fde68a',
  'bg-red-100': '#fee2e2',
  'bg-red-200': '#fecaca',
  'bg-blue-100': '#dbeafe',
  'bg-blue-200': '#bfdbfe',
  'bg-green-100': '#dcfce7',
  'bg-green-200': '#bbf7d0',
  'bg-emerald-100': '#d1fae5',
  'bg-purple-100': '#f3e8ff',
  'bg-rose-100': '#ffe4e6',
};

/**
 * Inlines CSS rules from <style> tags onto matching elements in doc.
 * Crucial for Google Docs, MS Word, and web pages where colors are defined in <style> classes.
 */
function inlineCssRules(doc: Document) {
  const styleElements = Array.from(doc.querySelectorAll('style'));

  for (const styleEl of styleElements) {
    const cssText = styleEl.textContent || '';
    // Clean CSS comments
    const cleanCss = cssText
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Match rules: selector { declarations }
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match: RegExpExecArray | null;

    while ((match = ruleRegex.exec(cleanCss)) !== null) {
      const rawSelectors = match[1].trim();
      const rawDeclarations = match[2].trim();

      // Parse declarations
      const decls: Record<string, string> = {};
      const pairs = rawDeclarations.split(';');
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx !== -1) {
          const prop = pair.substring(0, colonIdx).trim().toLowerCase();
          const val = pair.substring(colonIdx + 1).trim();
          if (prop && val) {
            decls[prop] = val;
          }
        }
      }

      // If no relevant styling properties, continue
      const hasStyle =
        decls['color'] ||
        decls['background-color'] ||
        decls['background'] ||
        decls['font-weight'] ||
        decls['font-style'] ||
        decls['text-decoration'] ||
        decls['font-size'] ||
        decls['font-family'] ||
        decls['text-align'];

      if (!hasStyle) continue;

      // Apply to matching elements
      const selectors = rawSelectors.split(',');
      for (const sel of selectors) {
        const cleanSel = sel.trim();
        if (!cleanSel || cleanSel.startsWith('@')) continue;

        try {
          const matchedEls = doc.querySelectorAll(cleanSel);
          matchedEls.forEach((el) => {
            if (el instanceof HTMLElement) {
              if (decls['color'] && !el.style.color && decls['color'] !== 'windowtext') {
                el.style.color = decls['color'];
              }
              if (decls['background-color'] && !el.style.backgroundColor) {
                el.style.backgroundColor = decls['background-color'];
              } else if (decls['background'] && !el.style.background) {
                el.style.background = decls['background'];
              }
              if (decls['font-weight'] && !el.style.fontWeight) {
                el.style.fontWeight = decls['font-weight'];
              }
              if (decls['font-style'] && !el.style.fontStyle) {
                el.style.fontStyle = decls['font-style'];
              }
              if (decls['text-decoration'] && !el.style.textDecoration) {
                el.style.textDecoration = decls['text-decoration'];
              }
              if (decls['font-size'] && !el.style.fontSize) {
                el.style.fontSize = decls['font-size'];
              }
              if (decls['font-family'] && !el.style.fontFamily) {
                el.style.fontFamily = decls['font-family'];
              }
              if (decls['text-align'] && !el.style.textAlign) {
                el.style.textAlign = decls['text-align'];
              }
            }
          });
        } catch {
          // Ignore unsupported CSS selectors (e.g. MS Word specific pseudo-classes)
        }
      }
    }

    // Remove the style tag after inlining so it doesn't affect the parent page
    styleEl.remove();
  }
}

/**
 * Normalizes legacy <font> tags to modern <span style="..."> tags.
 */
function normalizeFontTags(doc: Document) {
  const fontEls = Array.from(doc.querySelectorAll('font'));
  const sizeMap: Record<string, string> = {
    '1': '0.75rem',
    '2': '0.875rem',
    '3': '1rem',
    '4': '1.125rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '7': '2rem',
  };

  for (const font of fontEls) {
    const span = doc.createElement('span');
    // Copy existing inline styles
    span.style.cssText = font.style.cssText;

    if (font.hasAttribute('color')) {
      span.style.color = font.getAttribute('color')!;
    }
    if (font.hasAttribute('face')) {
      span.style.fontFamily = font.getAttribute('face')!;
    }
    if (font.hasAttribute('size')) {
      const s = font.getAttribute('size')!;
      span.style.fontSize = sizeMap[s] || `${s}px`;
    }

    // Move child nodes
    while (font.firstChild) {
      span.appendChild(font.firstChild);
    }

    font.parentNode?.replaceChild(span, font);
  }
}

/**
 * Inlines known framework classes (Tailwind, Bootstrap, etc.) to explicit inline styles.
 */
function inlineFrameworkClasses(doc: Document) {
  const allEls = Array.from(doc.querySelectorAll('*'));
  for (const el of allEls) {
    if (el instanceof HTMLElement && el.className) {
      const classes = el.className.split(/\s+/);
      for (const cls of classes) {
        if (PRESET_COLOR_MAP[cls] && !el.style.color) {
          el.style.color = PRESET_COLOR_MAP[cls];
        }
        if (PRESET_BG_COLOR_MAP[cls] && !el.style.backgroundColor) {
          el.style.backgroundColor = PRESET_BG_COLOR_MAP[cls];
        }
      }
    }
  }
}

/**
 * Sanitizes and cleans up pasted HTML while strictly preserving colors,
 * fonts, images, tables, and typography.
 */
export function processPastedHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // 1. Remove dangerous or non-content tags
  doc
    .querySelectorAll('script, link, meta, title, xml, iframe, object, embed, applet')
    .forEach((el) => el.remove());

  // 2. Inline all CSS from <style> blocks before removing them
  inlineCssRules(doc);

  // 3. Normalize legacy <font> tags to styled <span>
  normalizeFontTags(doc);

  // 4. Inline color classes from common frameworks
  inlineFrameworkClasses(doc);

  // 5. Unwrap Google Docs wrappers (e.g. <b id="docs-internal-guid-...">)
  doc.querySelectorAll('b[id^="docs-internal-guid"]').forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      el.remove();
    }
  });

  // 6. Clean MS Word namespace elements like <o:p>
  doc.querySelectorAll('o\\:p, p\\:p').forEach((el) => {
    const span = doc.createElement('span');
    while (el.firstChild) {
      span.appendChild(el.firstChild);
    }
    el.parentNode?.replaceChild(span, el);
  });

  // 7. Remove full-page solid white background on root <body> or direct children
  // to prevent a blinding white box in Dark Mode, while keeping highlights on spans/marks.
  if (doc.body) {
    if (
      doc.body.style.backgroundColor === 'rgb(255, 255, 255)' ||
      doc.body.style.backgroundColor === '#ffffff' ||
      doc.body.style.backgroundColor === 'white'
    ) {
      doc.body.style.backgroundColor = '';
    }
  }

  // 8. Ensure images have responsive styling
  doc.querySelectorAll('img').forEach((img) => {
    img.classList.add('max-w-full', 'h-auto', 'rounded-xl', 'my-2');
  });

  // 9. Ensure tables have neat borders
  doc.querySelectorAll('table').forEach((table) => {
    table.classList.add('border-collapse', 'my-3', 'w-full');
    table.querySelectorAll('th, td').forEach((cell) => {
      (cell as HTMLElement).classList.add('border', 'border-slate-300', 'p-2');
    });
  });

  return doc.body.innerHTML.trim();
}

/**
 * Converts Rich Text Format (RTF) to HTML with color, bold, italic, underline preservation.
 * Crucial for native macOS applications (Apple Notes, TextEdit, Pages).
 */
export function convertRtfToHtml(rtf: string): string {
  if (!rtf || typeof rtf !== 'string') return '';

  // 1. Parse Color Table: {\colortbl;\red255\green0\blue0;\red0\green128\blue0;...}
  const colorTableMatch = rtf.match(/\{\\colortbl([\s\S]*?)\}/);
  const colorTable: string[] = []; // index 0 is before first semicolon (default color)

  if (colorTableMatch) {
    const rawEntries = colorTableMatch[1].split(';');
    for (const entry of rawEntries) {
      const r = entry.match(/\\red(\d+)/);
      const g = entry.match(/\\green(\d+)/);
      const b = entry.match(/\\blue(\d+)/);
      if (r && g && b) {
        colorTable.push(`rgb(${r[1]}, ${g[1]}, ${b[1]})`);
      } else {
        colorTable.push('');
      }
    }
  }

  // 2. Strip headers, font tables, stylesheet tables, generator metadata
  let content = rtf
    .replace(/\{\\\*[\s\S]*?\}/g, '') // remove extended groups
    .replace(/\{\\fonttbl[\s\S]*?\}/g, '') // remove font table
    .replace(/\{\\colortbl[\s\S]*?\}/g, '') // remove color table
    .replace(/\{\\stylesheet[\s\S]*?\}/g, '') // remove stylesheets
    .replace(/\{\\info[\s\S]*?\}/g, ''); // remove info

  // 3. Parse RTF tokens sequentially
  let html = '';
  let currentColor = '';
  let currentBgColor = '';
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;

  let spanOpen = false;

  const closeCurrentSpan = () => {
    if (spanOpen) {
      html += '</span>';
      spanOpen = false;
    }
  };

  const openCurrentSpan = () => {
    closeCurrentSpan();
    const styles: string[] = [];
    if (currentColor) styles.push(`color: ${currentColor}`);
    if (currentBgColor) styles.push(`background-color: ${currentBgColor}`);
    if (isBold) styles.push('font-weight: bold');
    if (isItalic) styles.push('font-style: italic');
    if (isUnderline && isStrike) styles.push('text-decoration: underline line-through');
    else if (isUnderline) styles.push('text-decoration: underline');
    else if (isStrike) styles.push('text-decoration: line-through');

    if (styles.length > 0) {
      html += `<span style="${styles.join('; ')}">`;
      spanOpen = true;
    }
  };

  // Match control words or text
  const tokenRegex = /\\([a-z]{1,32})(-?\d+)? ?|\\([\\'~{}])|([{}])|([^\\{}]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content)) !== null) {
    const word = match[1]?.toLowerCase();
    const arg = match[2] !== undefined ? parseInt(match[2], 10) : undefined;
    const specialChar = match[3];
    const brace = match[4];
    const text = match[5];

    if (word) {
      if (word === 'par' || word === 'line') {
        closeCurrentSpan();
        html += '<br/>';
      } else if (word === 'cf') {
        // Foreground color
        const colorIdx = arg ?? 0;
        currentColor = colorTable[colorIdx] || '';
        openCurrentSpan();
      } else if (word === 'highlight' || word === 'cb') {
        // Background color
        const bgIdx = arg ?? 0;
        currentBgColor = colorTable[bgIdx] || '';
        openCurrentSpan();
      } else if (word === 'b') {
        isBold = arg !== 0;
        openCurrentSpan();
      } else if (word === 'i') {
        isItalic = arg !== 0;
        openCurrentSpan();
      } else if (word === 'ul') {
        isUnderline = true;
        openCurrentSpan();
      } else if (word === 'ulnone') {
        isUnderline = false;
        openCurrentSpan();
      } else if (word === 'strike') {
        isStrike = arg !== 0;
        openCurrentSpan();
      } else if (word === 'u') {
        // Unicode character \uN
        if (arg !== undefined) {
          const char = String.fromCharCode(arg < 0 ? arg + 65536 : arg);
          html += char;
        }
      }
    } else if (specialChar) {
      if (specialChar === '~') html += '&nbsp;';
      else if (specialChar === '{' || specialChar === '}') html += specialChar;
      else if (specialChar.startsWith("'")) {
        // Hex byte \'xx
        const hex = specialChar.slice(1);
        const code = parseInt(hex, 16);
        if (!isNaN(code)) html += String.fromCharCode(code);
      }
    } else if (text) {
      // Escape HTML special characters
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      html += escaped;
    }
  }

  closeCurrentSpan();
  return html.trim();
}

/**
 * Converts ANSI color escape sequences (e.g. from terminal output/CLI) to colored HTML spans.
 */
export function convertAnsiToHtml(text: string): string {
  if (!text || !text.includes('\u001b[') && !text.includes('\x1b[')) {
    return '';
  }

  const ANSI_COLOR_MAP: Record<number, string> = {
    30: '#000000',
    31: '#ef4444', // Red
    32: '#22c55e', // Green
    33: '#eab308', // Yellow
    34: '#3b82f6', // Blue
    35: '#a855f7', // Magenta
    36: '#06b6d4', // Cyan
    37: '#f8fafc', // White
    90: '#64748b', // Bright Black / Gray
    91: '#f87171', // Bright Red
    92: '#4ade80', // Bright Green
    93: '#fde047', // Bright Yellow
    94: '#60a5fa', // Bright Blue
    95: '#c084fc', // Bright Magenta
    96: '#22d3ee', // Bright Cyan
    97: '#ffffff', // Bright White
  };

  let currentColor = '';
  let result = '';
  let spanOpen = false;

  const parts = text.split(/(\u001b\[[\d;]*m|\x1b\[[\d;]*m)/g);

  for (const part of parts) {
    if (part.startsWith('\u001b[') || part.startsWith('\x1b[')) {
      const codes = part
        .slice(2, -1)
        .split(';')
        .map(Number);
      for (const code of codes) {
        if (code === 0) {
          // Reset
          if (spanOpen) {
            result += '</span>';
            spanOpen = false;
          }
          currentColor = '';
        } else if (ANSI_COLOR_MAP[code]) {
          if (spanOpen) {
            result += '</span>';
          }
          currentColor = ANSI_COLOR_MAP[code];
          result += `<span style="color: ${currentColor}">`;
          spanOpen = true;
        }
      }
    } else {
      const escaped = part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
      result += escaped;
    }
  }

  if (spanOpen) {
    result += '</span>';
  }

  return result;
}

/**
 * Main function to process any paste event and return clean, color-preserving HTML.
 */
export async function getCleanPastedContent(e: ClipboardEvent): Promise<{
  type: 'html' | 'image' | 'text';
  content: string;
}> {
  const clipboardData = e.clipboardData;
  if (!clipboardData) {
    return { type: 'text', content: '' };
  }

  // 1. Check if an image or media file was pasted directly (e.g. screenshot)
  const items = clipboardData.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const base64 = await readFileAsDataURL(file);
          const imgHtml = `<div class="my-4 text-center"><img src="${base64}" alt="${file.name || 'Pasted Image'}" class="max-w-full h-auto rounded-xl shadow-md mx-auto my-2 border border-slate-200 dark:border-slate-800" /><p class="text-xs text-slate-400 mt-1">${file.name || 'صورة ملصقة'}</p></div><p><br/></p>`;
          return { type: 'image', content: imgHtml };
        }
      }
    }
  }

  // 2. Check for HTML content (Google Docs, Word, Browsers, VS Code, Webpages)
  const rawHtml = clipboardData.getData('text/html');
  if (rawHtml && rawHtml.trim()) {
    const cleanedHtml = processPastedHtml(rawHtml);
    if (cleanedHtml) {
      return { type: 'html', content: cleanedHtml };
    }
  }

  // 3. Check for RTF content (Apple Notes, TextEdit, Pages on macOS)
  const rawRtf = clipboardData.getData('text/rtf');
  if (rawRtf && rawRtf.trim()) {
    const rtfHtml = convertRtfToHtml(rawRtf);
    if (rtfHtml) {
      return { type: 'html', content: rtfHtml };
    }
  }

  // 4. Plain text fallback (check for ANSI colors or preserve line breaks)
  const rawText = clipboardData.getData('text/plain') || '';
  const ansiHtml = convertAnsiToHtml(rawText);
  if (ansiHtml) {
    return { type: 'html', content: ansiHtml };
  }

  // Plain text with line breaks converted into HTML paragraphs / breaks
  const escapedText = rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return { type: 'text', content: escapedText };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
