import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, AlignRight, AlignCenter, AlignLeft, AlignJustify,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Code2, 
  Minus, Table, Link, Image, Video, Music, FileText, Calendar, Smile, Calculator, GitFork, 
  RotateCcw, RotateCw, Eraser, Search, Eye, Edit3, Plus, Highlighter, Palette,
  Indent, Outdent, ChevronDown, Check, X, Upload, MessageSquareWarning, Info, AlertTriangle, AlertCircle,
  SlidersHorizontal, ChevronUp, Camera, Mic, Paperclip
} from 'lucide-react';
import { Note, EditorViewMode } from '../../types';
import { MathEditorModal } from './MathEditorModal';
import { MermaidEditorModal } from './MermaidEditorModal';
import { TableModal } from './TableModal';
import { SearchReplaceDrawer } from './SearchReplaceDrawer';
import { getCleanPastedContent } from '../../utils/richPaste';

interface RichTextEditorProps {
  note: Note;
  onChangeContent: (content: string) => void;
  onChangeTitle: (title: string) => void;
  viewMode: EditorViewMode;
  isToolbarOpen?: boolean;
  onToggleToolbar?: () => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  note,
  onChangeContent,
  onChangeTitle,
  viewMode,
  isToolbarOpen = true,
  onToggleToolbar,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recordAudioInputRef = useRef<HTMLInputElement>(null);
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isMermaidModalOpen, setIsMermaidModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [fontSize, setFontSize] = useState('16px');
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);

  const onChangeContentRef = useRef(onChangeContent);
  onChangeContentRef.current = onChangeContent;

  const noteContentRef = useRef(note.content);
  noteContentRef.current = note.content;

  // Sync content into editable div when active note changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content || '';
    }
  }, [note.id]);

  // Flush editor changes on beforeunload / pagehide
  useEffect(() => {
    const handleUnloadOrHide = () => {
      if (editorRef.current && editorRef.current.innerHTML !== noteContentRef.current) {
        onChangeContentRef.current(editorRef.current.innerHTML);
      }
    };

    window.addEventListener('beforeunload', handleUnloadOrHide);
    window.addEventListener('pagehide', handleUnloadOrHide);

    return () => {
      window.removeEventListener('beforeunload', handleUnloadOrHide);
      window.removeEventListener('pagehide', handleUnloadOrHide);
    };
  }, []);

  // Initialize styleWithCSS so that font colors and highlights produce standard CSS inline styles
  useEffect(() => {
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      // Ignore if not supported in environment
    }
  }, []);

  // Execute formatting command on contentEditable
  const execCommand = (command: string, value: string | undefined = undefined) => {
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      // Ignore
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChangeContent(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChangeContent(editorRef.current.innerHTML);
    }
  };

  // Insert HTML snippet directly into editor while preserving cursor and selection
  const insertHTMLAtCursor = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    const isInsideEditor =
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer);

    if (isInsideEditor && sel) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('div');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      const el = document.createElement('div');
      el.innerHTML = html;
      while (el.firstChild) {
        editorRef.current.appendChild(el.firstChild);
      }
    }

    onChangeContent(editorRef.current.innerHTML);
  };

  // Smart paste handler that strictly preserves colors, styles, and formatting
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (viewMode === 'readonly') return;

    // Prevent default unstyled browser paste
    e.preventDefault();

    try {
      const result = await getCleanPastedContent(e);
      if (result.content) {
        insertHTMLAtCursor(result.content);
      }
    } catch (err) {
      console.error('Error handling paste with preserved styles:', err);
      const text = e.clipboardData?.getData('text/plain') || '';
      if (text) {
        const fallbackHtml = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r\n/g, '\n')
          .replace(/\n\n+/g, '</p><p>')
          .replace(/\n/g, '<br/>');
        insertHTMLAtCursor(fallbackHtml);
      }
    }
  };

  // Special block inserts
  const insertCallout = (type: 'info' | 'warning' | 'success' | 'alert') => {
    const configs = {
      info: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300', icon: '💡' },
      warning: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-300', icon: '⚠️' },
      success: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-800 dark:text-emerald-300', icon: '✅' },
      alert: { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-800 dark:text-rose-300', icon: '🚫' },
    };
    const cfg = configs[type];
    const html = `<div class="callout py-3 px-4 my-3 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.text} flex items-start gap-2.5">
      <span class="text-base shrink-0">${cfg.icon}</span>
      <div className="flex-1">أدخل نص الملاحظة الهامة هنا...</div>
    </div><p><br/></p>`;
    insertHTMLAtCursor(html);
  };

  const insertImage = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      let html = '';
      
      if (type === 'image' || file.type.startsWith('image/')) {
        html = `<div class="my-4 text-center"><img src="${src}" alt="${file.name}" class="max-w-full h-auto rounded-xl shadow-md mx-auto my-2 border border-slate-200 dark:border-slate-800" /><p class="text-xs text-slate-400 mt-1">${file.name}</p></div><p><br/></p>`;
      } else if (type === 'video' || file.type.startsWith('video/')) {
        html = `<div class="my-4 text-center"><video src="${src}" controls class="max-w-full h-auto rounded-xl shadow-md mx-auto my-2 border border-slate-200 dark:border-slate-800"></video><p class="text-xs text-slate-400 mt-1">${file.name}</p></div><p><br/></p>`;
      } else if (type === 'audio' || file.type.startsWith('audio/')) {
        html = `<div class="my-4"><audio src="${src}" controls class="w-full rounded-full shadow-sm my-2"></audio><p class="text-xs text-slate-400 mt-1 text-center">${file.name}</p></div><p><br/></p>`;
      } else {
        html = `<div class="my-4"><a href="${src}" download="${file.name}" class="inline-flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors no-underline font-bold text-sm" contenteditable="false"><span class="text-xl">📁</span> ${file.name}</a></div><p><br/></p>`;
      }
      
      insertHTMLAtCursor(html);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertLink = () => {
    const url = prompt('أدخل الرابط (URL):', 'https://');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertDate = () => {
    const dateStr = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    insertHTMLAtCursor(` <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-md font-semibold text-xs inline-flex items-center gap-1">📅 ${dateStr}</span> `);
  };

  const insertChecklist = () => {
    const html = `<ul class="task-list my-2 space-y-1">
      <li class="flex items-center gap-2"><input type="checkbox" class="w-4 h-4 text-blue-600 rounded-xs" /> <span>مهمة جديدة لتقوم بإنجازها</span></li>
    </ul><p><br/></p>`;
    insertHTMLAtCursor(html);
  };

  const insertCodeBlock = () => {
    const html = `<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs my-3 overflow-x-auto relative group"><code>// أدخل الكود البرمجي هنا
function example() {
  console.log("Hello Infinite Notes!");
}</code></pre><p><br/></p>`;
    insertHTMLAtCursor(html);
  };

  // Convert current selection into a checklist item task
  const convertSelectionToTask = () => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      const selectedText = sel.toString();
      insertHTMLAtCursor(`<div class="task-item flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 my-1"><input type="checkbox" class="w-4 h-4 text-blue-600" /> <span class="font-medium text-slate-800 dark:text-slate-200">${selectedText}</span></div><p><br/></p>`);
    } else {
      insertChecklist();
    }
  };

  const lastScrollTopRef = useRef(0);
  const isTogglingRef = useRef(false);

  const handleEditorScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onToggleToolbar || isTogglingRef.current) return;

    const currentScrollTop = e.currentTarget.scrollTop;
    const diff = currentScrollTop - lastScrollTopRef.current;

    // Only respond to deliberate, significant scroll gesture (not minor layout shifts)
    if (diff < -30 && currentScrollTop > 40) {
      // Scrolled up -> show toolbar if closed
      if (!isToolbarOpen) {
        isTogglingRef.current = true;
        onToggleToolbar();
        setTimeout(() => {
          isTogglingRef.current = false;
        }, 300);
      }
    } else if (diff > 40 && currentScrollTop > 100) {
      // Scrolled down -> hide toolbar if open to maximize reading space
      if (isToolbarOpen) {
        isTogglingRef.current = true;
        onToggleToolbar();
        setTimeout(() => {
          isTogglingRef.current = false;
        }, 300);
      }
    }
    lastScrollTopRef.current = currentScrollTop;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative">
            {/* Hidden File Inputs for Media Uploads */}
      <input type="file" ref={imageInputRef} onChange={(e) => handleMediaUpload(e, 'image')} accept="image/*" className="hidden" />
      <input type="file" ref={videoInputRef} onChange={(e) => handleMediaUpload(e, 'video')} accept="video/*" className="hidden" />
      <input type="file" ref={audioInputRef} onChange={(e) => handleMediaUpload(e, 'audio')} accept="audio/*" className="hidden" />
      <input type="file" ref={fileInputRef} onChange={(e) => handleMediaUpload(e, 'file')} accept="*" className="hidden" />
      <input type="file" ref={cameraInputRef} onChange={(e) => handleMediaUpload(e, 'image')} accept="image/*,video/*" capture="environment" className="hidden" />
      <input type="file" ref={recordAudioInputRef} onChange={(e) => handleMediaUpload(e, 'audio')} accept="audio/*" capture="user" className="hidden" />

      {/* Editor Toolbar (Visible in Edit and Split modes when toolbar is open) */}
      {(viewMode === 'edit' || viewMode === 'split') && isToolbarOpen && (
        <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex flex-wrap items-center gap-1 text-slate-700 dark:text-slate-300 shadow-2xs select-none">
          {/* Text Style Headings Select */}
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'p') execCommand('formatBlock', '<p>');
              else if (val) execCommand('formatBlock', `<${val}>`);
            }}
            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-hidden"
          >
            <option value="p">نص عادي (Normal)</option>
            <option value="h1">عنوان H1 ضخم</option>
            <option value="h2">عنوان H2 رئيسي</option>
            <option value="h3">عنوان H3 فرعي</option>
            <option value="h4">عنوان H4 صغيرة</option>
          </select>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Basic Formatting Buttons */}
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="خط عريض (Bold)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="خط مائل (Italic)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="تسطير (Underline)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('strikeThrough')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="يتوسطه خط (Strikethrough)"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Text Color & Highlight */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <label className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer relative" title="تغيير لون الخط (مخصص)">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    execCommand('foreColor', e.target.value);
                  }}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>

              {/* Quick Color Presets */}
              <div className="hidden sm:flex items-center gap-1 px-1">
                {[
                  { name: 'أحمر', color: '#ef4444' },
                  { name: 'أزرق', color: '#3b82f6' },
                  { name: 'أخضر', color: '#10b981' },
                  { name: 'برتقالي', color: '#f59e0b' },
                  { name: 'بنفسجي', color: '#8b5cf6' },
                ].map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => {
                      setTextColor(preset.color);
                      execCommand('foreColor', preset.color);
                    }}
                    className="w-3.5 h-3.5 rounded-full hover:scale-125 transition-transform cursor-pointer border border-slate-300 dark:border-slate-700 shadow-2xs"
                    style={{ backgroundColor: preset.color }}
                    title={`لون ${preset.name}`}
                  />
                ))}
              </div>
            </div>

            <label className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer relative" title="تمييز النص بالألوان (Highlight)">
              <Highlighter className="w-4 h-4 text-amber-500" />
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => {
                  setHighlightColor(e.target.value);
                  execCommand('hiliteColor', e.target.value);
                }}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="محاذاة لليمين"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="محاذاة في الوسط"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="محاذاة لليسار"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyFull')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="ضبط النص (Justify)"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Lists & Checklists */}
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="قائمة نقطية"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="قائمة رقمية"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertChecklist}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
            title="قائمة مهام (Checklist)"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Indent */}
          <button
            type="button"
            onClick={() => execCommand('indent')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="زيادة المسافة البادئة"
          >
            <Indent className="w-4 h-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('outdent')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="تقليل المسافة البادئة"
          >
            <Outdent className="w-4 h-4 rtl:rotate-180" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Rich Block Inserts */}
          <button
            type="button"
            onClick={() => execCommand('formatBlock', '<blockquote>')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="اقتباس (Quote)"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertCodeBlock}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertHorizontalRule')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="فاصل أفقي (Divider)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsTableModalOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
            title="إدراج جدول"
          >
            <Table className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Media & Advanced Inserts */}
          <button
            type="button"
            onClick={insertLink}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إدراج رابط"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertImage}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إدراج صورة"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsMathModalOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer"
            title="إدراج معادلة رياضية (KaTeX)"
          >
            <Calculator className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsMermaidModalOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
            title="إدراج مخطط Mermaid"
          >
            <GitFork className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertDate}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إدراج التاريخ والوقت"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertCallout('info')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-500 transition-colors cursor-pointer"
            title="إدراج مربع معلومات (Callout)"
          >
            <Info className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Tools */}
          <button
            type="button"
            onClick={() => setIsSearchDrawerOpen(!isSearchDrawerOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="البحث والاستبدال"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('removeFormat')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-rose-500 transition-colors cursor-pointer"
            title="مسح التنسيق"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('undo')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="تراجع (Undo)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('redo')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إعادة (Redo)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {onToggleToolbar && (
            <>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={onToggleToolbar}
                className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="إغلاق شريط الأدوات (الضغطة الثانية للإغلاق)"
              >
                <ChevronUp className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">إغلاق الأدوات</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Search & Replace Drawer */}
      <SearchReplaceDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        onSearch={(term) => {
          if (!editorRef.current) return 0;
          const text = editorRef.current.innerText || '';
          const matches = text.match(new RegExp(term, 'gi'));
          return matches ? matches.length : 0;
        }}
        onReplace={(search, replace, replaceAll) => {
          if (!editorRef.current || !search) return;
          const html = editorRef.current.innerHTML;
          const flag = replaceAll ? 'gi' : 'i';
          const newHtml = html.replace(new RegExp(search, flag), replace);
          editorRef.current.innerHTML = newHtml;
          onChangeContent(newHtml);
        }}
      />

      {/* Editor Main Content Area */}
      <div 
        onScroll={handleEditorScroll}
        className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center"
      >
        <div className="w-full max-w-4xl space-y-4">
          {/* Note Title Input */}
          <input
            type="text"
            value={note.title}
            onChange={(e) => onChangeTitle(e.target.value)}
            disabled={viewMode === 'readonly'}
            placeholder="عنوان الملاحظة..."
            className="w-full text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 bg-transparent border-none focus:outline-hidden placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />

          {/* Tags list pill rendering */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          
          {/* ContentEditable Editor Body */}

          <div
            ref={editorRef}
            contentEditable={viewMode !== 'readonly'}
            onInput={handleInput}
            onBlur={handleInput}
            onKeyUp={handleInput}
            onPaste={handlePaste}
            suppressContentEditableWarning
            className={`min-h-[400px] text-slate-800 dark:text-slate-200 text-sm leading-relaxed focus:outline-hidden prose dark:prose-invert max-w-none ${
              viewMode === 'readonly' ? 'cursor-default opacity-95' : ''
            }`}
          />
        </div>
      </div>

      
      {/* Floating Mini Media Bar */}
      {viewMode !== 'readonly' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl border border-slate-200/60 dark:border-slate-700/60 rounded-full px-2 py-1.5 flex items-center justify-center gap-1 transition-all">
            <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-500 transition-colors" title="إدراج صورة">
              <Image className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button type="button" onClick={() => videoInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-500 transition-colors" title="إدراج فيديو">
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button type="button" onClick={() => audioInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-500 transition-colors" title="ملف صوتي">
              <Music className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-500 transition-colors" title="إدراج ملف">
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-500 transition-colors" title="الكاميرا">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button type="button" onClick={() => recordAudioInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-purple-500 transition-colors" title="تسجيل صوت">
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Dialog Modals */}
      <MathEditorModal
        isOpen={isMathModalOpen}
        onClose={() => setIsMathModalOpen(false)}
        onInsert={(latex, html) => insertHTMLAtCursor(html)}
      />

      <MermaidEditorModal
        isOpen={isMermaidModalOpen}
        onClose={() => setIsMermaidModalOpen(false)}
        onInsert={(code, html) => insertHTMLAtCursor(html)}
      />

      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsert={(html) => insertHTMLAtCursor(html)}
      />
    </div>
  );
};
