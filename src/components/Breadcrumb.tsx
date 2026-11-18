import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Folder, Plus, Star, Pin, Tag, Layers, Share2, Palette, Download, Eye, Edit3, ChevronDown, SlidersHorizontal, FileText, X } from 'lucide-react';
import { BreadcrumbItem, Note } from '../types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  currentNote: Note | null;
  allNotes?: Note[];
  onSelectNote: (id: string) => void;
  onCreateSubNote: (parentId: string) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onOpenShortcuts?: () => void;
  viewMode: 'edit' | 'preview' | 'split' | 'readonly';
  onChangeViewMode: (mode: 'edit' | 'preview' | 'split' | 'readonly') => void;
  onSelectColor: (color: string) => void;
  isToolbarOpen?: boolean;
  onToggleToolbar?: () => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  currentNote,
  allNotes = [],
  onSelectNote,
  onCreateSubNote,
  onToggleFavorite,
  onTogglePin,
  viewMode,
  onChangeViewMode,
  isToolbarOpen = true,
  onToggleToolbar,
}) => {
  const [isSubNotesOpen, setIsSubNotesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSubNotesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentNote) return null;

  // Find sub-notes belonging to current note
  const childNotes = allNotes.filter(
    (n) => n.parentId === currentNote.id && !n.isDeleted
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-sm shadow-xs transition-colors relative z-30">
      {/* Breadcrumb path navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar max-w-full">
        <span className="flex items-center text-slate-400 dark:text-slate-500 shrink-0">
          <Folder className="w-4 h-4" />
        </span>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={item.id}>
              {idx > 0 && (
                <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0 rotate-180" />
              )}
              <button
                type="button"
                onClick={() => onSelectNote(item.id)}
                className={`max-w-[160px] truncate px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isLast
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={item.title}
              >
                {item.title || 'ملاحظة بدون عنوان'}
              </button>
            </React.Fragment>
          );
        })}

        {/* Depth Badge */}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          مستوى العمق: {currentNote.depth}
        </span>
      </nav>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Toggleable Sub-Notes Menu (Click 1 Open, Click 2 Close) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsSubNotesOpen(!isSubNotesOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer shadow-xs ${
              isSubNotesOpen
                ? 'bg-blue-700 text-white ring-1 ring-blue-300 dark:ring-blue-900'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title="انقر لفتح قائمة الملاحظات الفرعية / النقر الثاني للإغلاق"
          >
            <Plus className="w-3 h-3" />
            <span>ملاحظات فرعية</span>
            {childNotes.length > 0 && (
              <span className="px-1 py-0.2 rounded-full text-[9px] bg-blue-800/80 text-blue-100 leading-none">
                {childNotes.length}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSubNotesOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Sub Notes Dropdown */}
          {isSubNotesOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700 px-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-blue-500" />
                  الملاحظات الفرعية ({childNotes.length})
                </span>
                <button
                  onClick={() => setIsSubNotesOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action to create new subnote */}
              <button
                type="button"
                onClick={() => {
                  onCreateSubNote(currentNote.id);
                  setIsSubNotesOpen(false);
                }}
                className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-blue-200 dark:border-blue-800/50"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة ملاحظة فرعية جديدة +</span>
              </button>

              {/* Subnotes List */}
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {childNotes.length > 0 ? (
                  childNotes.map((cn) => (
                    <button
                      key={cn.id}
                      type="button"
                      onClick={() => {
                        onSelectNote(cn.id);
                        setIsSubNotesOpen(false);
                      }}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate flex-1">{cn.title || 'ملاحظة فرعية بدون عنوان'}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 text-center py-2">لا توجد ملاحظات فرعية حالية.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pin & Favorite */}
        <button
          type="button"
          onClick={() => onTogglePin(currentNote.id)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            currentNote.isPinned
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={currentNote.isPinned ? 'إلغاء التثبيت' : 'تثبيت الملاحظة'}
        >
          <Pin className={`w-4 h-4 ${currentNote.isPinned ? 'fill-amber-500' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onToggleFavorite(currentNote.id)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            currentNote.isFavorite
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={currentNote.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <Star className={`w-4 h-4 ${currentNote.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* View mode buttons */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onChangeViewMode('edit')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
            title="وضع التحرير"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('preview')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
            title="وضع المعاينة"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
            title="تقسيم الشاشة (تحرير ومعاينة)"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toolbar Toggle Button - Far Left (أقصى اليسار) */}
        {onToggleToolbar && (
          <button
            type="button"
            onClick={onToggleToolbar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs border ${
              isToolbarOpen
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="إظهار / إخفاء شريط أدوات التنسيق (الضغطة الأولى يفتح، الضغطة الثانية يغلق)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">شريط الأدوات</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isToolbarOpen ? 'bg-emerald-300' : 'bg-slate-400'}`} />
          </button>
        )}
      </div>
    </div>
  );
};
