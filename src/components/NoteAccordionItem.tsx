import React, { useState } from 'react';
import { 
  Pin, Star, Trash2, ChevronDown, MoreVertical, 
  Plus, FileText, Copy, Move, ArrowUp, ArrowDown, Archive 
} from 'lucide-react';
import { NoteTreeNode } from '../types';
import { COLOR_PRESETS } from '../services/storage';

interface NoteAccordionItemProps {
  node: NoteTreeNode;
  level?: number;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onCreateSubNote?: (parentId: string) => void;
  onDuplicateNote?: (id: string) => void;
  onMoveNoteClick?: (id: string) => void;
  onMoveNoteDirection?: (id: string, direction: 'up' | 'down') => void;
  onToggleArchive?: (id: string) => void;
  onChangeColor?: (id: string, color: string) => void;
}

export const NoteAccordionItem: React.FC<NoteAccordionItemProps> = ({
  node,
  level = 0,
  onSelect,
  onTogglePin,
  onToggleFavorite,
  onRename,
  onDelete,
  onCreateSubNote,
  onDuplicateNote,
  onMoveNoteClick,
  onMoveNoteDirection,
  onToggleArchive,
  onChangeColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    const newTitle = window.prompt('تعديل اسم الملاحظة:', node.title);
    if (newTitle !== null && newTitle.trim() !== '') onRename(node.id, newTitle.trim());
  };

  return (
    <div className={`flex flex-col mb-1 w-full relative ${isMenuOpen ? 'z-30' : 'z-10'}`}>
      <div
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          } else {
            onSelect(node.id);
          }
        }}
        className={`group flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer shadow-sm hover:shadow-md ${
          level > 0 ? 'mr-4 rtl:mr-0 rtl:ml-4 border-r-2 rtl:border-r-0 rtl:border-l-2 border-indigo-200 dark:border-indigo-800' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
            className="text-lg shrink-0 hover:scale-110 transition-transform"
            title="فتح الملاحظة في المحرر"
          >
            {node.icon || '📄'}
          </button>
          <span
            className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
          >
            {node.title || 'بدون عنوان'}
          </span>
          {node.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
          {node.isFavorite && <Star className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />}
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            data-state={isMenuOpen ? 'open' : 'closed'}
            title="خيارات الملاحظة"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Context Menu Dropdown */}
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1 z-50 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-slate-700 dark:text-slate-200 text-xs animate-in fade-in zoom-in-95"
              >
                <button
                  type="button"
                  onClick={handleStartRename}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>إعادة تسمية</span>
                </button>

                {onCreateSubNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreateSubNote(node.id);
                      setIsMenuOpen(false);
                      if (!isExpanded) setIsExpanded(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>إضافة ملاحظة فرعية</span>
                  </button>
                )}

                {onDuplicateNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateNote(node.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>تكرار الملاحظة والشجرة</span>
                  </button>
                )}

                {onMoveNoteClick && (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveNoteClick(node.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                  >
                    <Move className="w-3.5 h-3.5 text-slate-500" />
                    <span>نقل لملاحظة أخرى</span>
                  </button>
                )}

                {onMoveNoteDirection && (
                  <>
                    <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                    <div className="px-3 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      تبديل الترتيب
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onMoveNoteDirection(node.id, 'up');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>نقل للأعلى (Move Up)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMoveNoteDirection(node.id, 'down');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>نقل للأسفل (Move Down)</span>
                    </button>
                  </>
                )}

                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    onTogglePin(node.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  <span>{node.isPinned ? 'إلغاء التثبيت' : 'تثبيت بالقمة'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleFavorite(node.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 text-rose-500" />
                  <span>{node.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
                </button>

                {onToggleArchive && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleArchive(node.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>{node.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}</span>
                  </button>
                )}

                {onChangeColor && (
                  <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">تصنيف بالألوان:</span>
                    <div className="flex items-center gap-1.5">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onChangeColor(node.id, c.id);
                            setIsMenuOpen(false);
                          }}
                          className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    onDelete(node.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-right cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>نقل إلى سلة المهملات</span>
                </button>
              </div>
            </>
          )}

          {hasChildren && (
            <div className="p-1 ml-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-1 flex flex-col gap-1 animate-in slide-in-from-top-2 fade-in duration-200">
          {node.children.map((child) => (
            <NoteAccordionItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onTogglePin={onTogglePin}
              onToggleFavorite={onToggleFavorite}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSubNote={onCreateSubNote}
              onDuplicateNote={onDuplicateNote}
              onMoveNoteClick={onMoveNoteClick}
              onMoveNoteDirection={onMoveNoteDirection}
              onToggleArchive={onToggleArchive}
              onChangeColor={onChangeColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

