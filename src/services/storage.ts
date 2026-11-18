import { Note, NoteTreeNode, BreadcrumbItem, FilterState, TaskItem, AttachmentItem, ListCategory, ListTreeNode, ListBreadcrumbItem } from '../types';

const STORAGE_KEY = 'infinite_notes_db_v1';
const LISTS_STORAGE_KEY = 'infinite_notes_lists_v1';

export const COLOR_PRESETS = [
  { id: 'slate', name: 'رمادي', bgClass: 'bg-slate-100 dark:bg-slate-800', textClass: 'text-slate-700 dark:text-slate-300', borderClass: 'border-slate-300 dark:border-slate-700', hex: '#64748b' },
  { id: 'blue', name: 'أزرق', bgClass: 'bg-blue-50 dark:bg-blue-950/40', textClass: 'text-blue-700 dark:text-blue-300', borderClass: 'border-blue-300 dark:border-blue-800', hex: '#3b82f6' },
  { id: 'emerald', name: 'زمردي', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40', textClass: 'text-emerald-700 dark:text-emerald-300', borderClass: 'border-emerald-300 dark:border-emerald-800', hex: '#10b981' },
  { id: 'amber', name: 'كهرماني', bgClass: 'bg-amber-50 dark:bg-amber-950/40', textClass: 'text-amber-700 dark:text-amber-300', borderClass: 'border-amber-300 dark:border-amber-800', hex: '#f59e0b' },
  { id: 'purple', name: 'بنفسجي', bgClass: 'bg-purple-50 dark:bg-purple-950/40', textClass: 'text-purple-700 dark:text-purple-300', borderClass: 'border-purple-300 dark:border-purple-800', hex: '#a855f7' },
  { id: 'rose', name: 'وردي', bgClass: 'bg-rose-50 dark:bg-rose-950/40', textClass: 'text-rose-700 dark:text-rose-300', borderClass: 'border-rose-300 dark:border-rose-800', hex: '#f43f5e' },
  { id: 'indigo', name: 'نيلي', bgClass: 'bg-indigo-50 dark:bg-indigo-950/40', textClass: 'text-indigo-700 dark:text-indigo-300', borderClass: 'border-indigo-300 dark:border-indigo-800', hex: '#6366f1' },
];

export const loadAllLists = (): ListCategory[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LISTS_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => {
      let cleanName = item.name;
      if (!cleanName || cleanName === '🔒 قائمة مشفرة' || cleanName === 'قائمة مشفرة') {
        cleanName = 'قائمة ملاحظات';
      }
      return {
        id: item.id || `list-${Date.now()}`,
        userId: item.userId || 'local_user',
        name: cleanName,
        icon: item.icon && item.icon !== '🔒' ? item.icon : '📋',
        color: item.color || 'indigo',
        parentId: item.parentId || null,
        depth: typeof item.depth === 'number' ? item.depth : 0,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
      };
    });
  } catch (err) {
    console.error('Error parsing lists from local storage', err);
    return [];
  }
};

export const saveAllLists = (lists: any[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch (err) {
    console.error('Error saving lists to local storage', err);
  }
};

const INITIAL_SEED_NOTES: Note[] = [
  {
    id: 'note-root-1',
    parentId: null,
    path: '/note-root-1',
    depth: 0,
    title: '🚀 المشروع الرئيسي (Main Project)',
    content: `<h1>المشروع الرئيسي والتطوير</h1>
<p>مرحباً بك في نظام <strong>الملاحظات المتداخلة (Infinite Nested Notes)</strong> المحترف.</p>
<p>يمكنك إنشاء ملاحظات فرعية داخل هذه الملاحظة، ثم ملاحظات فرعية داخل الملاحظة الفرعية بدون أي حدود عمق!</p>
<div class="callout callout-info">
  💡 <strong>نصيحة:</strong> استخدم شجرة الملاحظات في الشريط الجانبي أو زر <code>+ إضافة ملاحظة داخلية</code> للتنقل وإنشاء شجرة أفكار غير محدودة.
</div>
<h2>الأهداف القادمة:</h2>
<ul>
  <li>تطوير الهوية البصرية والتصاميم</li>
  <li>إكمال هندسة الواجهة والخادم</li>
  <li>تكامل الذكاء الاصطناعي لتلخيص وتوليد المحتوى</li>
</ul>`,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    tags: [],
    color: 'blue',
    icon: '🚀',
    isPinned: true,
    isFavorite: true,
    isArchived: false,
    isDeleted: false,
    sortOrder: 1,
    childrenCount: 3,
    wordCount: 78,
    characterCount: 450,
    readingTime: 1,
    tasks: [
      { id: 't1', text: 'مراجعة خريطة الطريق للمشروع', completed: true, priority: 'high' },
      { id: 't2', text: 'تجهيز بيئة التطوير والاختبارات', completed: true, priority: 'medium' },
      { id: 't3', text: 'إضافة الملاحظات المتداخلة اللانهائية', completed: false, priority: 'high', dueDate: new Date(Date.now() + 86400000 * 2).toISOString() },
    ],
    attachments: [
      { id: 'a1', name: 'مخطط_المشروع.png', type: 'image', url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=60', size: 1024000, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'note-design-1',
    parentId: 'note-root-1',
    path: '/note-root-1/note-design-1',
    depth: 1,
    title: '🎨 التصميم والهوية البصرية',
    content: `<h2>دليل التصميم والأنماط</h2>
<p>هنا نقوم بتحديد كل ما يتصل بواجهة المستخدم والألوان وتجربة المستخدم.</p>
<blockquote>التصميم الاحترافي هو الذي يدمج البساطة بالسرعة والجمال.</blockquote>
<hr/>
<h3>ملاحظات التفاعل:</h3>
<p>يدعم النظام الخطوط النظيفة، التجاوب التام مع الأجهزة المحمولة، والدعم الكامل للوضع الداكن (Dark Mode).</p>`,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    tags: ['تصميم', 'UI/UX'],
    color: 'purple',
    icon: '🎨',
    isPinned: false,
    isFavorite: true,
    isArchived: false,
    isDeleted: false,
    sortOrder: 1,
    childrenCount: 2,
    wordCount: 42,
    characterCount: 260,
    readingTime: 1,
    tasks: [],
    attachments: [],
  },
  {
    id: 'note-colors-1',
    parentId: 'note-design-1',
    path: '/note-root-1/note-design-1/note-colors-1',
    depth: 2,
    title: '🎨 لوحة الألوان (Color Palette)',
    content: `<h3>درجات الألوان المستخدمة:</h3>
<table>
  <thead>
    <tr><th>الاسم</th><th>الكود</th><th>الاستخدام</th></tr>
  </thead>
  <tbody>
    <tr><td>الأزرق الأساسي</td><td>#2563eb</td><td>الأزرار والعناوين الرئيسية</td></tr>
    <tr><td>الزمردي</td><td>#10b981</td><td>حالات النجاح والتنبيهات الإيجابية</td></tr>
    <tr><td>الوردي/الورد</td><td>#f43f5e</td><td>المفضلة والتنبيهات الهامة</td></tr>
  </tbody>
</table>`,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    tags: ['تصميم', 'ألوان'],
    color: 'emerald',
    icon: '🎨',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    sortOrder: 1,
    childrenCount: 0,
    wordCount: 30,
    characterCount: 210,
    readingTime: 1,
    tasks: [],
    attachments: [],
  },
  {
    id: 'note-logo-1',
    parentId: 'note-design-1',
    path: '/note-root-1/note-design-1/note-logo-1',
    depth: 2,
    title: '💎 الشعار والرموز (Logo & Icons)',
    content: `<h3>إرشادات الشعار:</h3>
<p>استخدام أيقونات <strong>Lucide React</strong> المتناسقة مع أحجام 18px إلى 24px.</p>
<p>يجب أن يظهر الشعار بوضوح في كلا الوضعين الفاتح والداكن.</p>`,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    tags: ['شعار', 'هوية'],
    color: 'amber',
    icon: '💎',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    sortOrder: 2,
    childrenCount: 0,
    wordCount: 25,
    characterCount: 160,
    readingTime: 1,
    tasks: [],
    attachments: [],
  },
  {
    id: 'note-coding-1',
    parentId: 'note-root-1',
    path: '/note-root-1/note-coding-1',
    depth: 1,
    title: '💻 البرمجة والتكوين (Programming)',
    content: `<h2>المعمارية التقنية للبرنامج</h2>
<p>يعتمد النظام على <strong>React 19</strong> و <strong>Express Node.js Backend</strong> مع <strong>Tailwind CSS v4</strong>.</p>
<pre><code>// هيكل البيانات الأساسي للملاحظة
interface Note {
  id: string;
  parentId: string | null; // Infinite tree hierarchy
  path: string;
  depth: number;
}</code></pre>`,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    tags: ['برمجة', 'كود', 'TypeScript'],
    color: 'indigo',
    icon: '💻',
    isPinned: false,
    isFavorite: true,
    isArchived: false,
    isDeleted: false,
    sortOrder: 2,
    childrenCount: 2,
    wordCount: 45,
    characterCount: 310,
    readingTime: 1,
    tasks: [
      { id: 'ct1', text: 'ربط المحرر المتقدم مع محرك التنسيق', completed: true, priority: 'high' },
      { id: 'ct2', text: 'اختبار شجرة الملاحظات المتداخلة حتى عمق 100', completed: true, priority: 'high' },
    ],
    attachments: [],
  },
  {
    id: 'note-frontend-1',
    parentId: 'note-coding-1',
    path: '/note-root-1/note-coding-1/note-frontend-1',
    depth: 2,
    title: '🖥️ الواجهة الأمامية (Frontend Framework)',
    content: `<h3>مكونات الواجهة الرئيسية:</h3>
<ul>
  <li><strong>RichTextEditor:</strong> محرر نصوص غني ومتطور مع كافة خيارات التنسيق والوسائط.</li>
  <li><strong>NoteTreeSidebar:</strong> شجرة متداخلة تفاعلية يدعم السحب والإفلات والبحث السريع.</li>
  <li><strong>Breadcrumb:</strong> شريط تتبع المسار السريع لأي مستوى عمق.</li>
  <li><strong>AIAssistantModal:</strong> أدوات الذكاء الاصطناعي للتخيص والترجمة وإعادة الصياغة.</li>
</ul>`,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    tags: ['React', 'Frontend'],
    color: 'blue',
    icon: '🖥️',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    sortOrder: 1,
    childrenCount: 1,
    wordCount: 48,
    characterCount: 320,
    readingTime: 1,
    tasks: [],
    attachments: [],
  },
  {
    id: 'note-deep-editor-1',
    parentId: 'note-frontend-1',
    path: '/note-root-1/note-coding-1/note-frontend-1/note-deep-editor-1',
    depth: 3,
    title: '📝 مكونات المحرر المتقدم (Sub-Level 3)',
    content: `<h4>اختبار العمق الثالث المباشر</h4>
<p>هذه الملاحظة موجودة داخل: <em>المشروع الرئيسي &gt; البرمجة &gt; الواجهة الأمامية &gt; مكونات المحرر المتقدم</em>.</p>
<p>هذا يثبت دعم الملاحظات المتداخلة بلا حدود (Infinite Nesting) بسهولة تامة.</p>`,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['محرر', 'عمق-عالي'],
    color: 'rose',
    icon: '📝',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    sortOrder: 1,
    childrenCount: 0,
    wordCount: 35,
    characterCount: 220,
    readingTime: 1,
    tasks: [],
    attachments: [],
  },
  {
    id: 'note-backend-1',
    parentId: 'note-coding-1',
    path: '/note-root-1/note-coding-1/note-backend-1',
    depth: 2,
    title: '⚙️ الخادم و الذكاء الاصطناعي (Backend & AI)',
    content: `<h3>ميزات الخادم:</h3>
<p>تكامل خادم Express مع نموذج <strong>Gemini 3.6 Flash</strong> لإتاحة عمليات التلخيص، الترجمة، تصحيح الأخطاء واستخراج المهام بكفاءة سرعة قصوى.</p>`,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    tags: ['Express', 'Gemini-AI'],
    color: 'slate',
    icon: '⚙️',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    sortOrder: 2,
    childrenCount: 0,
    wordCount: 28,
    characterCount: 190,
    readingTime: 1,
    tasks: [],
    attachments: [],
  },
];

// Helper to count words, chars, reading time
export function calculateNoteStats(content: string) {
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const characterCount = plainText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  return { wordCount, characterCount, readingTime };
}

// Storage Operations
export function getStorageKey(userId?: string): string {
  if (userId) {
    return `infinite_notes_db_user_${userId}`;
  }
  if (typeof window !== 'undefined') {
    try {
      const savedSessionRaw = localStorage.getItem('account_active_session');
      if (savedSessionRaw) {
        const parsed = JSON.parse(savedSessionRaw);
        if (parsed && parsed.uid) {
          return `infinite_notes_db_user_${parsed.uid}`;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return `infinite_notes_db_guest`;
}

export function loadAllNotes(userId?: string): Note[] {
  const BANNED_TAGS = ['مشروع', 'تخطيط', 'أهمية-عالية'];
  const key = getStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((n: Note) => ({
          ...n,
          tags: (n.tags || []).filter((t: string) => !BANNED_TAGS.includes(t)),
        }));
      }
    }
  } catch (e) {
    console.error("Failed to parse stored notes:", e);
  }

  // If userId is provided and cache is empty, return [] so we don't pollute user account with default seed notes
  if (userId) {
    return [];
  }

  // For guest / fallback, load initial seed notes
  saveAllNotes(INITIAL_SEED_NOTES);
  return INITIAL_SEED_NOTES;
}

export function saveAllNotes(notes: Note[], userId?: string): void {
  const key = getStorageKey(userId);
  try {
    localStorage.setItem(key, JSON.stringify(notes));
    localStorage.setItem(`${key}_last_saved`, new Date().toISOString());
  } catch (e) {
    console.error("Failed to save notes to storage:", e);
  }
}

// Recalculate children count for all notes
export function updateChildrenCounts(notes: Note[]): Note[] {
  const countMap: Record<string, number> = {};
  
  notes.forEach((n) => {
    if (!n.isDeleted && n.parentId) {
      countMap[n.parentId] = (countMap[n.parentId] || 0) + 1;
    }
  });

  return notes.map((n) => ({
    ...n,
    childrenCount: countMap[n.id] || 0,
  }));
}

// Build Tree hierarchy from flat array
export function buildNoteTree(notes: Note[], parentId: string | null = null, filterDeleted = true): NoteTreeNode[] {
  const filtered = notes.filter((n) => {
    if (filterDeleted && n.isDeleted) return false;
    return n.parentId === parentId;
  });

  filtered.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.sortOrder - b.sortOrder || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return filtered.map((n) => ({
    ...n,
    children: buildNoteTree(notes, n.id, filterDeleted),
  }));
}

// Get Breadcrumb trail for a note
export function getBreadcrumbPath(noteId: string | null, notes: Note[]): BreadcrumbItem[] {
  if (!noteId) return [];
  const map = new Map<string, Note>();
  notes.forEach((n) => map.set(n.id, n));

  const path: BreadcrumbItem[] = [];
  let currentId: string | null = noteId;

  while (currentId) {
    const note = map.get(currentId);
    if (!note) break;
    path.unshift({ id: note.id, title: note.title });
    currentId = note.parentId;
  }

  return path;
}

// Create a new note under parentId with custom parameters
export function createNewNote(
  notes: Note[], 
  parentId: string | null = null, 
  title: string = 'ملاحظة جديدة',
  content: string = '',
  icon: string = '📝',
  color: string = 'blue',
  tags: string[] = [],
  userId?: string,
  listId?: string | null
): { newNote: Note; updatedNotes: Note[] } {
  const uniqueSuffix = Math.random().toString(36).substring(2, 9);
  const id = `note-${Date.now()}-${uniqueSuffix}`;
  
  let depth = 0;
  let path = `/${id}`;

  if (parentId) {
    const parent = notes.find((n) => n.id === parentId);
    if (parent) {
      depth = parent.depth + 1;
      path = `${parent.path}/${id}`;
    }
  }

  const stats = calculateNoteStats(content);

  const newNote: Note = {
    id,
    userId: userId || undefined,
    listId: listId || undefined,
    parentId,
    path,
    depth,
    title: title.trim() || 'ملاحظة جديدة',
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: tags || [],
    color: color || 'blue',
    icon: icon || '📝',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    sortOrder: notes.length + 1,
    childrenCount: 0,
    tasks: [],
    attachments: [],
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
    readingTime: stats.readingTime,
  };

  const updatedNotes = updateChildrenCounts([...notes, newNote]);
  saveAllNotes(updatedNotes, userId);
  return { newNote, updatedNotes };
}

// Create a new dynamic list/folder (supports parentId for hierarchy)
export function createNewList(
  lists: ListCategory[],
  title: string,
  icon: string = '📋',
  color: string = 'indigo',
  userId?: string,
  parentId: string | null = null
): { newList: ListCategory; updatedLists: ListCategory[] } {
  const cleanTitle = title.trim() || 'قائمة جديدة';
  const uniqueSuffix = Math.random().toString(36).substring(2, 9);
  
  let depth = 0;
  if (parentId) {
    const parent = lists.find((l) => l.id === parentId);
    if (parent) {
      depth = (parent.depth || 0) + 1;
    }
  }

  const newList: ListCategory = {
    id: `list-${Date.now()}-${uniqueSuffix}`,
    userId: userId || 'local_user',
    name: cleanTitle,
    icon,
    color,
    parentId: parentId || null,
    depth,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sortOrder: lists.length + 1,
  };

  const updatedLists = [...lists, newList];
  saveAllLists(updatedLists);
  return { newList, updatedLists };
}

// Build List Tree hierarchy from flat array of lists
export function buildListTree(
  lists: ListCategory[],
  parentId: string | null = null,
  notes: Note[] = []
): ListTreeNode[] {
  const filtered = lists.filter((l) => {
    const listParent = l.parentId || null;
    return listParent === parentId;
  });

  filtered.sort((a, b) => (a.sortOrder - b.sortOrder) || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));

  return filtered.map((l) => {
    const directNotesCount = notes.filter((n) => n.listId === l.id && !n.isDeleted).length;
    return {
      ...l,
      notesCount: directNotesCount,
      children: buildListTree(lists, l.id, notes),
    };
  });
}

// Get Breadcrumb trail for a list category
export function getListBreadcrumbPath(
  listId: string | null,
  lists: ListCategory[]
): ListBreadcrumbItem[] {
  if (!listId) return [];
  const map = new Map<string, ListCategory>();
  lists.forEach((l) => map.set(l.id, l));

  const path: ListBreadcrumbItem[] = [];
  let currentId: string | null = listId;

  while (currentId) {
    const list = map.get(currentId);
    if (!list) break;
    path.unshift({ id: list.id, name: list.name, icon: list.icon });
    currentId = list.parentId || null;
  }

  return path;
}

// Move List to new parent list or to root
export function moveListToParent(
  lists: ListCategory[],
  listId: string,
  newParentId: string | null
): ListCategory[] {
  if (listId === newParentId) return lists;

  const isListDescendant = (checkId: string, targetParentId: string | null): boolean => {
    if (!targetParentId) return false;
    if (targetParentId === checkId) return true;
    const parent = lists.find((l) => l.id === targetParentId);
    return parent ? isListDescendant(checkId, parent.parentId || null) : false;
  };

  if (isListDescendant(listId, newParentId)) {
    console.warn('Cannot move list into its own descendant');
    return lists;
  }

  const targetList = lists.find((l) => l.id === listId);
  if (!targetList) return lists;

  const newParent = newParentId ? lists.find((l) => l.id === newParentId) : null;
  const newDepth = newParent ? (newParent.depth || 0) + 1 : 0;
  const depthDiff = newDepth - (targetList.depth || 0);

  const getSubtreeListIds = (rootId: string): string[] => {
    const children = lists.filter((l) => (l.parentId || null) === rootId);
    return [rootId, ...children.flatMap((c) => getSubtreeListIds(c.id))];
  };

  const subtreeIds = new Set(getSubtreeListIds(listId));

  const updatedLists = lists.map((l) => {
    if (l.id === listId) {
      return {
        ...l,
        parentId: newParentId,
        depth: newDepth,
        updatedAt: new Date().toISOString(),
      };
    }
    if (subtreeIds.has(l.id)) {
      return {
        ...l,
        depth: (l.depth || 0) + depthDiff,
        updatedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  saveAllLists(updatedLists);
  return updatedLists;
}

// Delete List and all its sublists (returns list of deleted IDs)
export function deleteListWithSubtree(
  lists: ListCategory[],
  listId: string
): { updatedLists: ListCategory[]; deletedListIds: string[] } {
  const getSubtreeIds = (rootId: string): string[] => {
    const children = lists.filter((l) => (l.parentId || null) === rootId);
    return [rootId, ...children.flatMap((c) => getSubtreeIds(c.id))];
  };

  const deletedListIds = getSubtreeIds(listId);
  const deletedSet = new Set(deletedListIds);

  const updatedLists = lists.filter((l) => !deletedSet.has(l.id));
  saveAllLists(updatedLists);

  return { updatedLists, deletedListIds };
}

export function duplicateListWithSubtree(
  lists: ListCategory[],
  listId: string
): { updatedLists: ListCategory[]; newIdMap: Map<string, string> } {
  const sourceList = lists.find((l) => l.id === listId);
  if (!sourceList) return { updatedLists: lists, newIdMap: new Map() };

  const getSubtreeLists = (rootId: string): ListCategory[] => {
    const children = lists.filter((l) => (l.parentId || null) === rootId);
    const rootList = lists.find(l => l.id === rootId);
    if (!rootList) return [];
    return [rootList, ...children.flatMap((c) => getSubtreeLists(c.id))];
  };

  const affectedLists = getSubtreeLists(listId);
  const newIdMap = new Map<string, string>();
  
  affectedLists.forEach((l) => {
    newIdMap.set(l.id, 'list-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
  });

  const newLists: ListCategory[] = affectedLists.map((l) => {
    const newId = newIdMap.get(l.id)!;
    const newParentId = l.id === listId ? sourceList.parentId : (l.parentId ? newIdMap.get(l.parentId) || null : null);
    const isRootDuplicate = l.id === listId;
    return {
      ...l,
      id: newId,
      parentId: newParentId,
      name: isRootDuplicate ? `${l.name} (نسخة)` : l.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const updatedLists = [...lists, ...newLists];
  saveAllLists(updatedLists);
  return { updatedLists, newIdMap };
}

export function reorderListsCategory(lists: ListCategory[], sourceId: string, targetId: string): ListCategory[] {
  const source = lists.find(l => l.id === sourceId);
  const target = lists.find(l => l.id === targetId);
  
  if (!source || !target) return lists;
  
  const updated = lists.map(l => {
    if (l.id === sourceId) return { ...l, sortOrder: target.sortOrder, updatedAt: new Date().toISOString() };
    if (l.id === targetId) return { ...l, sortOrder: source.sortOrder, updatedAt: new Date().toISOString() };
    return l;
  });
  
  saveAllLists(updated);
  return updated;
}

export function moveListDirectionAction(lists: ListCategory[], listId: string, direction: 'up' | 'down'): ListCategory[] {
  const source = lists.find(l => l.id === listId);
  if (!source) return lists;
  
  const siblings = lists.filter(l => l.parentId === source.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const index = siblings.findIndex(l => l.id === listId);
  
  if (direction === 'up' && index > 0) {
    return reorderListsCategory(lists, listId, siblings[index - 1].id);
  } else if (direction === 'down' && index < siblings.length - 1) {
    return reorderListsCategory(lists, listId, siblings[index + 1].id);
  }
  return lists;
}

// Move Note to new parent (updates paths and depths recursively)
export function moveNoteToParent(notes: Note[], noteId: string, newParentId: string | null): Note[] {
  if (noteId === newParentId) return notes; // Cannot move to itself

  // Check if new parent is a child of the note (prevent cyclical dependency)
  const isDescendant = (checkId: string, targetParentId: string | null): boolean => {
    if (!targetParentId) return false;
    if (targetParentId === checkId) return true;
    const parent = notes.find((n) => n.id === targetParentId);
    return parent ? isDescendant(checkId, parent.parentId) : false;
  };

  if (isDescendant(noteId, newParentId)) {
    console.warn("Cannot move a parent node inside one of its own descendants!");
    return notes;
  }

  const targetNote = notes.find((n) => n.id === noteId);
  if (!targetNote) return notes;

  let newDepth = 0;
  let newBasePath = `/${noteId}`;

  if (newParentId) {
    const newParent = notes.find((n) => n.id === newParentId);
    if (newParent) {
      newDepth = newParent.depth + 1;
      newBasePath = `${newParent.path}/${noteId}`;
    }
  }

  const oldBasePath = targetNote.path;

  // Update target note & all sub-descendants paths/depths
  const updatedNotes = notes.map((n) => {
    if (n.id === noteId) {
      return {
        ...n,
        parentId: newParentId,
        depth: newDepth,
        path: newBasePath,
        updatedAt: new Date().toISOString(),
      };
    }
    if (n.path.startsWith(oldBasePath + '/')) {
      const suffix = n.path.substring(oldBasePath.length);
      const depthDiff = newDepth - targetNote.depth;
      return {
        ...n,
        path: `${newBasePath}${suffix}`,
        depth: n.depth + depthDiff,
        updatedAt: new Date().toISOString(),
      };
    }
    return n;
  });

  const finalNotes = updateChildrenCounts(updatedNotes);
  saveAllNotes(finalNotes);
  return finalNotes;
}

// Recursive delete / Trash note
export function setNoteDeleteStatus(notes: Note[], noteId: string, isDeleted: boolean, permanent = false): Note[] {
  const targetNote = notes.find((n) => n.id === noteId);
  if (!targetNote) return notes;

  if (permanent) {
    // Delete target note and all descendant children permanently
    const targetPath = targetNote.path;
    const remainingNotes = notes.filter((n) => n.id !== noteId && !n.path.startsWith(targetPath + '/'));
    const finalNotes = updateChildrenCounts(remainingNotes);
    saveAllNotes(finalNotes);
    return finalNotes;
  }

  // Soft delete / restore note and all its sub-notes
  const targetPath = targetNote.path;
  const updatedNotes = notes.map((n) => {
    if (n.id === noteId || n.path.startsWith(targetPath + '/')) {
      return { ...n, isDeleted, updatedAt: new Date().toISOString() };
    }
    return n;
  });

  const finalNotes = updateChildrenCounts(updatedNotes);
  saveAllNotes(finalNotes);
  return finalNotes;
}

// Duplicate note (and optionally its sub-tree)
export function duplicateNoteWithSubtree(notes: Note[], noteId: string): Note[] {
  const source = notes.find((n) => n.id === noteId);
  if (!source) return notes;

  const idMap = new Map<string, string>();
  const sourcePath = source.path;
  const affected = notes.filter((n) => n.id === noteId || n.path.startsWith(sourcePath + '/'));

  // Generate new IDs
  affected.forEach((n) => {
    idMap.set(n.id, 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
  });

  const newNotes: Note[] = affected.map((n) => {
    const newId = idMap.get(n.id)!;
    const newParentId = n.id === noteId ? source.parentId : (n.parentId ? idMap.get(n.parentId) || null : null);
    const isRootDuplicate = n.id === noteId;

    return {
      ...n,
      id: newId,
      parentId: newParentId,
      title: isRootDuplicate ? `${n.title} (نسخة)` : n.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const finalNotes = updateChildrenCounts([...notes, ...newNotes]);
  saveAllNotes(finalNotes);
  return finalNotes;
}

// Reorder notes within their siblings or swap positions
export function reorderNotesList(notes: Note[], sourceId: string, targetId: string): Note[] {
  const source = notes.find((n) => n.id === sourceId);
  const target = notes.find((n) => n.id === targetId);
  if (!source || !target || sourceId === targetId) {
    return notes;
  }

  // Find siblings of source & target
  const parentId = source.parentId;
  const siblings = notes
    .filter((n) => !n.isDeleted && n.parentId === parentId)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.sortOrder - b.sortOrder || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const sourceIndex = siblings.findIndex((n) => n.id === sourceId);
  const targetIndex = siblings.findIndex((n) => n.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return notes;
  }

  const reordered = [...siblings];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  // Re-index sortOrder
  const sortMap = new Map<string, number>();
  reordered.forEach((item, index) => {
    sortMap.set(item.id, index + 1);
  });

  const updatedNotes = notes.map((n) => {
    if (sortMap.has(n.id)) {
      return {
        ...n,
        sortOrder: sortMap.get(n.id)!,
        updatedAt: n.id === sourceId ? new Date().toISOString() : n.updatedAt,
      };
    }
    return n;
  });

  saveAllNotes(updatedNotes);
  return updatedNotes;
}

// Move single note up or down among siblings
export function moveNoteDirection(notes: Note[], noteId: string, direction: 'up' | 'down'): Note[] {
  const target = notes.find((n) => n.id === noteId);
  if (!target) return notes;

  const siblings = notes
    .filter((n) => !n.isDeleted && n.parentId === target.parentId)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.sortOrder - b.sortOrder || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const index = siblings.findIndex((n) => n.id === noteId);
  if (index === -1) return notes;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return notes;

  const swapTarget = siblings[swapIndex];
  return reorderNotesList(notes, noteId, swapTarget.id);
}

// Filter and Search Notes
export function filterAndSearchNotes(notes: Note[], state: FilterState): Note[] {
  let result = [...notes];

  // Trash filter
  if (state.filterType === 'trash') {
    result = result.filter((n) => n.isDeleted);
  } else {
    result = result.filter((n) => !n.isDeleted);
  }

  // Filter types
  switch (state.filterType) {
    case 'pinned':
      result = result.filter((n) => n.isPinned);
      break;
    case 'favorite':
      result = result.filter((n) => n.isFavorite);
      break;
    case 'archived':
      result = result.filter((n) => n.isArchived);
      break;
    case 'has_images':
      result = result.filter((n) => n.attachments.some((a) => a.type === 'image') || n.content.includes('<img'));
      break;
    case 'has_files':
      result = result.filter((n) => n.attachments.length > 0);
      break;
    case 'has_tasks':
      result = result.filter((n) => n.tasks.length > 0 || n.content.includes('type="checkbox"'));
      break;
    case 'tag':
      if (state.selectedTag) {
        result = result.filter((n) => n.tags.includes(state.selectedTag!));
      }
      break;
    case 'color':
      if (state.selectedColor) {
        result = result.filter((n) => n.color === state.selectedColor);
      }
      break;
    default:
      if (state.filterType !== 'trash') {
        result = result.filter((n) => !n.isArchived);
      }
      break;
  }

  // Query Search with hierarchical tree preservation
  if (state.query && state.query.trim()) {
    const q = state.query.toLowerCase().trim();
    const directMatches = result.filter((n) => {
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const contentMatch = (n.content || '').toLowerCase().includes(q);
      const tagMatch = (n.tags || []).some((t) => t.toLowerCase().includes(q));
      const taskMatch = (n.tasks || []).some((t) => t.text.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagMatch || taskMatch;
    });

    // Include ancestors of direct matches so tree building can reach child nodes
    const matchIds = new Set<string>();
    directMatches.forEach((m) => {
      matchIds.add(m.id);
      if (m.path) {
        const pathParts = m.path.split('/').filter(Boolean);
        pathParts.forEach((partId) => matchIds.add(partId));
      }
    });

    result = result.filter((n) => matchIds.has(n.id));
  }

  // Sorting
  result.sort((a, b) => {
    let comparison = 0;
    if (state.sortBy === 'title') {
      comparison = a.title.localeCompare(b.title, 'ar');
    } else if (state.sortBy === 'createdAt') {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (state.sortBy === 'updatedAt') {
      comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    } else if (state.sortBy === 'depth') {
      comparison = a.depth - b.depth;
    } else {
      comparison = a.sortOrder - b.sortOrder;
    }

    return state.sortDirection === 'asc' ? comparison : -comparison;
  });

  return result;
}

// Collect all unique tags
export function getAllUniqueTags(notes: Note[]): string[] {
  const set = new Set<string>();
  notes.forEach((n) => {
    if (!n.isDeleted) {
      n.tags.forEach((t) => set.add(t));
    }
  });
  return Array.from(set).sort();
}
