import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronRight, ChevronDown, ChevronLeft, Plus, Search, Folder, Star, Pin, Archive, 
  Trash2, Tag, Palette, MoreVertical, Copy, Move, RefreshCw, X, FileText,
  Filter, Sparkles, FolderPlus, Layers, CheckCircle2, SlidersHorizontal, Eye, ShieldCheck, Cloud, Smartphone, Settings,
  Keyboard, Download, Upload, Edit3, Check, ListPlus, GripVertical, ArrowUp, ArrowDown
} from 'lucide-react';
import { Note, NoteTreeNode, FilterType, FilterState, SortOption, TaskItem, AttachmentItem, EditorViewMode } from '../../types';
import { COLOR_PRESETS } from '../../services/storage';
import { NoteTasksManager } from '../Tasks/NoteTasksManager';
import { AttachmentsGallery } from '../Media/AttachmentsGallery';
import { AppIcon } from '../Icons/AppIcon';
import { CreateListModal } from '../Modals/CreateListModal';

interface NoteTreeSidebarProps {
  tree: NoteTreeNode[];
  allNotes: Note[];
  activeNoteId: string | null;
  activeNote?: Note | null;
  onUpdateTasks?: (tasks: TaskItem[]) => void;
  onUpdateAttachments?: (attachments: AttachmentItem[]) => void;
  onSelectNote: (id: string) => void;
  onCreateRootNote: () => void;
  onCreateSubNote: (parentId: string) => void;
  onCreateNewList?: (title: string, icon?: string, color?: string, parentId?: string | null) => void;
  onReorderNotes?: (sourceId: string, targetId: string) => void;
  onMoveNoteDirection?: (id: string, direction: 'up' | 'down') => void;
  onRenameNote: (id: string, newTitle: string) => void;
  onDuplicateNote: (id: string) => void;
  onMoveNoteClick: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDeleteNote: (id: string, permanent?: boolean) => void;
  onRestoreNote: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
  filterState: FilterState;
  onUpdateFilter: (updated: Partial<FilterState>) => void;
  allTags: string[];
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenAdmin?: () => void;
  onOpenBackupSync?: () => void;
  onOpenAppSettings?: () => void;
  isInstallable?: boolean;
  onInstallApp?: () => void;
  viewMode?: EditorViewMode;
  onChangeViewMode?: (mode: EditorViewMode) => void;
  onOpenShortcuts?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGoToHome?: () => void;
}

export const NoteTreeSidebar: React.FC<NoteTreeSidebarProps> = ({
  tree,
  allNotes,
  activeNoteId,
  activeNote,
  onUpdateTasks,
  onUpdateAttachments,
  onSelectNote,
  onCreateRootNote,
  onCreateSubNote,
  onCreateNewList,
  onReorderNotes,
  onMoveNoteDirection,
  onRenameNote,
  onDuplicateNote,
  onMoveNoteClick,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDeleteNote,
  onRestoreNote,
  onChangeColor,
  filterState,
  onUpdateFilter,
  allTags,
  isOpenMobile,
  onCloseMobile,
  onOpenAdmin,
  onOpenBackupSync,
  onOpenAppSettings,
  isInstallable,
  onInstallApp,
  viewMode,
  onChangeViewMode,
  onOpenShortcuts,
  onExportBackup,
  onImportBackup,
  onGoToHome,
}) => {
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const listsScrollContainerRef = useRef<HTMLDivElement>(null);

  // Drag and drop & Long-press reordering state
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);
  const [isLongPressActive, setIsLongPressActive] = useState<boolean>(false);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeTouchNoteIdRef = useRef<string | null>(null);

  // Top-level created lists (non-deleted, parentId === null) filtered by search query
  const createdLists = useMemo(() => {
    const rootLists = allNotes.filter((n) => !n.isDeleted && n.parentId === null);
    if (!filterState.query.trim()) return rootLists;
    const q = filterState.query.toLowerCase().trim();
    return rootLists.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [allNotes, filterState.query]);

  const scrollLists = (direction: 'left' | 'right') => {
    if (listsScrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      listsScrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Touch Long-Press and Drag-to-Reorder handlers (اللمس المطول والسحب لإعادة الترتيب)
  const handleTouchStart = (nodeId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    activeTouchNoteIdRef.current = nodeId;

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    touchTimerRef.current = setTimeout(() => {
      setIsLongPressActive(true);
      setDraggedNoteId(nodeId);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (_) {}
      }
    }, 280);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    if (!isLongPressActive) {
      // Cancel long press if user is scrolling normally
      if (dx > 8 || dy > 8) {
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
      }
      return;
    }

    // Long press is active: track element under finger
    if (e.cancelable) {
      e.preventDefault();
    }

    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elem) return;

    const noteRow = elem.closest('[data-note-id]') as HTMLElement | null;
    if (noteRow) {
      const targetId = noteRow.getAttribute('data-note-id');
      if (targetId && targetId !== activeTouchNoteIdRef.current) {
        setDragOverNoteId(targetId);
        const rect = noteRow.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        setDragPosition(touch.clientY < midY ? 'before' : 'after');
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (isLongPressActive && draggedNoteId && dragOverNoteId && draggedNoteId !== dragOverNoteId) {
      onReorderNotes?.(draggedNoteId, dragOverNoteId);
    }

    setIsLongPressActive(false);
    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setDragPosition(null);
    touchStartPosRef.current = null;
    activeTouchNoteIdRef.current = null;
  };

  // HTML5 Drag & Drop handlers for desktop
  const handleDragStart = (nodeId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoteId(nodeId);
  };

  const handleDragOver = (nodeId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNoteId && draggedNoteId !== nodeId) {
      setDragOverNoteId(nodeId);
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setDragPosition(e.clientY < midY ? 'before' : 'after');
    }
  };

  const handleDrop = (nodeId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNoteId && draggedNoteId !== nodeId) {
      onReorderNotes?.(draggedNoteId, nodeId);
    }
    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setDragPosition(null);
  };

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'note-root-1': true,
    'note-design-1': true,
    'note-coding-1': true,
  });

  const [contextMenuNoteId, setContextMenuNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [colorPickerNoteId, setColorPickerNoteId] = useState<string | null>(null);

  // Auto-expand all matching branches when searching
  useEffect(() => {
    if (filterState.query.trim()) {
      const newExpanded: Record<string, boolean> = {};
      const markExpanded = (nodes: NoteTreeNode[]) => {
        nodes.forEach((n) => {
          newExpanded[n.id] = true;
          if (n.children && n.children.length > 0) {
            markExpanded(n.children);
          }
        });
      };
      markExpanded(tree);
      setExpandedIds((prev) => ({ ...prev, ...newExpanded }));
    }
  }, [filterState.query, tree]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
    setContextMenuNoteId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameNote(id, editingTitle.trim());
    }
    setEditingNoteId(null);
  };

  // Helper to render tree node recursively
  const renderTreeNode = (node: NoteTreeNode) => {
    const isSelected = activeNoteId === node.id;
    const isExpanded = expandedIds[node.id] || false;
    const hasChildren = node.children && node.children.length > 0;
    const isEditing = editingNoteId === node.id;
    const isBeingDragged = draggedNoteId === node.id;
    const isDragTarget = dragOverNoteId === node.id;

    const colorConfig = COLOR_PRESETS.find((c) => c.id === node.color) || COLOR_PRESETS[0];

    return (
      <div 
        key={node.id} 
        data-note-id={node.id}
        className={`select-none my-0.5 relative transition-all duration-150 ${contextMenuNoteId === node.id ? 'z-40' : 'z-10'} ${
          isBeingDragged 
            ? 'opacity-40 scale-[0.98]' 
            : ''
        } ${
          isDragTarget && dragPosition === 'before'
            ? 'before:content-[""] before:absolute before:-top-1 before:right-2 before:left-2 before:h-1 before:bg-indigo-500 before:rounded-full before:z-30 before:shadow-sm before:shadow-indigo-500/50'
            : ''
        } ${
          isDragTarget && dragPosition === 'after'
            ? 'after:content-[""] after:absolute after:-bottom-1 after:right-2 after:left-2 after:h-1 after:bg-indigo-500 after:rounded-full after:z-30 after:shadow-sm after:shadow-indigo-500/50'
            : ''
        }`}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(node.id, e)}
        onDragOver={(e) => handleDragOver(node.id, e)}
        onDrop={(e) => handleDrop(node.id, e)}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(node.id, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          onClick={() => onSelectNote(node.id)}
          className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 ${
            isSelected
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          } ${
            isDragTarget ? 'ring-2 ring-indigo-400/50 bg-indigo-50/50 dark:bg-indigo-950/40' : ''
          }`}
          style={{ paddingRight: `${Math.min(node.depth * 14 + 8, 120)}px` }}
        >
          {/* Left info & toggle & Drag grip handle */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Drag Handle (مقبض السحب واللمس المطول) */}
            <span
              className={`cursor-grab active:cursor-grabbing p-0.5 rounded-xs transition-opacity shrink-0 ${
                isSelected 
                  ? 'text-white/70 hover:text-white' 
                  : 'text-slate-300 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 opacity-60 group-hover:opacity-100'
              }`}
              title="اضغط مطولاً ثم اسحب للتبديل لأعلى أو لأسفل"
            >
              <GripVertical className="w-3 h-3" />
            </span>

            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className={`p-0.5 rounded-xs hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 ${
                  isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 shrink-0 inline-block" />
            )}

            {/* Note icon or color dot */}
            <span className="text-sm shrink-0">
              {node.icon || '📄'}
            </span>

            {/* Title inline edit or text */}
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleSaveRename(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(node.id);
                  if (e.key === 'Escape') setEditingNoteId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-1.5 py-0.5 rounded-md border border-blue-400 focus:outline-hidden text-xs"
              />
            ) : (
              <div className="truncate flex-1 text-right flex items-center gap-1.5 min-w-0" title={node.title}>
                <span className="truncate">
                  {node.title || 'بدون عنوان'}
                </span>
                {filterState.query.trim() && (
                  node.content.toLowerCase().includes(filterState.query.toLowerCase().trim()) &&
                  !node.title.toLowerCase().includes(filterState.query.toLowerCase().trim()) && (
                    <span className={`text-[9px] px-1 py-0.2 rounded-xs shrink-0 font-normal ${
                      isSelected ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                    }`}>
                      تطابق في المحتوى
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          {/* Right badges & Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Color indicator dot if not default */}
            {node.color && node.color !== 'slate' && !isSelected && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorConfig.hex }}
              />
            )}

            {/* Badges */}
            {node.isPinned && (
              <Pin className={`w-3 h-3 ${isSelected ? 'text-amber-200 fill-amber-200' : 'text-amber-500 fill-amber-500'}`} />
            )}
            {node.isFavorite && (
              <Star className={`w-3 h-3 ${isSelected ? 'text-rose-200 fill-rose-200' : 'text-rose-500 fill-rose-500'}`} />
            )}
            
            {node.childrenCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {node.childrenCount}
              </span>
            )}

            {/* Menu button (3 dots - Always visible) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setContextMenuNoteId(contextMenuNoteId === node.id ? null : node.id);
              }}
              className={`p-1 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${
                isSelected ? 'text-white hover:text-white' : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
              }`}
              title="خيارات الملاحظة (٣ نقط)"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Context Menu Dropdown */}
          {contextMenuNoteId === node.id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-2 top-full mt-1 z-30 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-slate-700 dark:text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={(e) => handleStartRename(node, e)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>إعادة تسمية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCreateSubNote(node.id);
                  setContextMenuNoteId(null);
                  if (!expandedIds[node.id]) {
                    setExpandedIds(prev => ({ ...prev, [node.id]: true }));
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>إضافة ملاحظة فرعية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicateNote(node.id);
                  setContextMenuNoteId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>تكرار الملاحظة والشجرة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onMoveNoteClick(node.id);
                  setContextMenuNoteId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
              >
                <Move className="w-3.5 h-3.5 text-slate-500" />
                <span>نقل لملاحظة أخرى</span>
              </button>

              {/* Move Up & Move Down Reorder Actions */}
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
                      setContextMenuNoteId(null);
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
                      setContextMenuNoteId(null);
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
                  setContextMenuNoteId(null);
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
                  setContextMenuNoteId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-rose-500" />
                <span>{node.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleArchive(node.id);
                  setContextMenuNoteId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-slate-500" />
                <span>{node.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}</span>
              </button>

              {/* Color sub-picker */}
              <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">تصنيف بالألوان:</span>
                <div className="flex items-center gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChangeColor(node.id, c.id);
                        setContextMenuNoteId(null);
                      }}
                      className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

              <button
                type="button"
                onClick={() => {
                  onDeleteNote(node.id);
                  setContextMenuNoteId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-right cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نقل إلى سلة المهملات</span>
              </button>
            </div>
          )}
        </div>

        {/* Children Sub-Tree */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Tree branch guide line */}
            <div className="absolute right-3.5 top-0 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const activeNotesCount = allNotes.filter((n) => !n.isDeleted).length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static top-0 bottom-0 right-0 z-50 w-72 md:w-80 bg-slate-50 dark:bg-slate-900/95 border-l border-slate-200/80 dark:border-slate-800 flex flex-col h-full shadow-lg md:shadow-none transition-transform duration-200 ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <AppIcon className="w-8 h-8" />
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
                Library
              </h1>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Notes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onGoToHome && (
              <button
                type="button"
                onClick={onGoToHome}
                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800 flex flex-row items-center gap-1"
                title="العودة إلى لوحة القوائم"
              >
                <Folder className="w-4 h-4" />
                <span className="text-[10px] font-bold hidden xl:inline">الرئيسية</span>
              </button>
            )}
            {isInstallable && onInstallApp && (
              <button
                type="button"
                onClick={onInstallApp}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1 animate-pulse"
                title="تثبيت التطبيق على جهازك"
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-[11px] font-black hidden xl:inline">تثبيت</span>
              </button>
            )}
            {onOpenAppSettings && (
              <button
                type="button"
                onClick={onOpenAppSettings}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="إعدادات التطبيق (النسخ الاحتياطي، التحديثات، المظهر)"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Notes Input Box (صندوق البحث في الملاحظات والمتداخلات) */}
        <div className="p-2.5 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex items-center">
            <div className="absolute right-2.5 text-slate-400 pointer-events-none flex items-center justify-center">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={filterState.query}
              onChange={(e) => onUpdateFilter({ query: e.target.value })}
              placeholder="ابحث عن كلمة في الملاحظات..."
              className="w-full pr-8 pl-8 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all shadow-2xs"
            />
            {filterState.query && (
              <button
                type="button"
                onClick={() => onUpdateFilter({ query: '' })}
                className="absolute left-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {filterState.query.trim() && (
            <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                البحث عن: <strong className="text-blue-600 dark:text-blue-400 truncate max-w-[120px]">"{filterState.query}"</strong>
              </span>
              <button
                type="button"
                onClick={() => onUpdateFilter({ query: '' })}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold text-[10px]"
              >
                مسح
              </button>
            </div>
          )}
        </div>

        {/* Created Lists Column & Carousel (عمود وشريط القوائم المنشأة بالأسماء وتمريرها) */}
        <div className="p-2.5 bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          {/* Header row with title, count, scroll arrows & Create List button */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                القوائم المنشأة بالأسماء
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                {createdLists.length}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Scroll buttons for smooth carousel navigation */}
              {createdLists.length > 2 && (
                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => scrollLists('right')}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="تمرير لليمين"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollLists('left')}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="تمرير لليسار"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Scrollable Carousel of Lists (شريط التمرير بين القوائم) */}
          <div
            ref={listsScrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth snap-x select-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {createdLists.map((list) => {
              const isSelected = activeNoteId === list.id;
              const colorConfig = COLOR_PRESETS.find((c) => c.id === list.color) || COLOR_PRESETS[0];
              const isBeingDragged = draggedNoteId === list.id;
              const isDragTarget = dragOverNoteId === list.id;

              return (
                <button
                  key={list.id}
                  data-note-id={list.id}
                  type="button"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(list.id, e)}
                  onDragOver={(e) => handleDragOver(list.id, e)}
                  onDrop={(e) => handleDrop(list.id, e)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(list.id, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onClick={() => {
                    onSelectNote(list.id);
                    setExpandedIds((prev) => ({ ...prev, [list.id]: true }));
                  }}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer shrink-0 snap-start max-w-[170px] ${
                    isBeingDragged ? 'opacity-40 scale-95 border-dashed border-indigo-400' : ''
                  } ${
                    isDragTarget ? 'ring-2 ring-indigo-500 bg-indigo-100/60 dark:bg-indigo-900/60' : ''
                  } ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/80 border-indigo-500 text-indigo-950 dark:text-indigo-100 font-bold shadow-xs ring-2 ring-indigo-400/30'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300'
                  }`}
                  title={`${list.title} (${list.childrenCount || 0} ملاحظات فرعية) - اضغط مطولاً وسحب لتبديل الترتيب`}
                >
                  {/* Grip or Icon */}
                  <span className="text-base shrink-0 select-none flex items-center gap-0.5">
                    <GripVertical className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-slate-400" />
                    <span>{list.icon || '📋'}</span>
                  </span>

                  {/* List Name & Count */}
                  <div className="flex flex-col text-right min-w-0 flex-1">
                    <span className="truncate text-[11px] font-extrabold leading-tight">
                      {list.title || 'قائمة بدون اسم'}
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                      {list.childrenCount > 0 ? `${list.childrenCount} فرعية` : 'فارغة'}
                    </span>
                  </div>

                  {/* Dot Color */}
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorConfig.hex }}
                  />
                </button>
              );
            })}

          </div>
        </div>

        {/* Active Note Controls & View Mode (محدد العرض ولوحة الألوان وأدوات التحرير) */}
        {onChangeViewMode && (
          <div className="p-2.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                وضع العرض:
              </span>
              {/* Segmented View Mode */}
              <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => onChangeViewMode('edit')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    viewMode === 'edit'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="وضع التحرير"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>تحرير</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeViewMode('preview')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="وضع المعاينة"
                >
                  <Eye className="w-3 h-3" />
                  <span>معاينة</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeViewMode('split')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="تقسيم الشاشة"
                >
                  <Layers className="w-3 h-3" />
                  <span>تقسيم</span>
                </button>
              </div>
            </div>

            {/* Note Color Palette Picker */}
            {activeNote && (
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-indigo-500" />
                  لون الملاحظة:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {COLOR_PRESETS.map((preset) => {
                    const isCurrent = (activeNote.color || 'slate') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onChangeColor(activeNote.id, preset.id)}
                        className={`w-5 h-5 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 ${preset.bgClass} ${preset.borderClass} ${
                          isCurrent
                            ? 'ring-2 ring-blue-500 scale-110 shadow-xs'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        title={preset.name}
                      >
                        {isCurrent && <Check className="w-2.5 h-2.5 text-slate-800 dark:text-slate-200 font-black" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Tools & Backup Strip (دليل الاختصارات، التصدير، الاستيراد، تثبيت التطبيق) */}
        <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
              title="دليل اختصارات لوحة المفاتيح"
            >
              <Keyboard className="w-3 h-3 text-slate-500" />
              <span>اختصارات</span>
            </button>
          )}

          {onExportBackup && (
            <button
              type="button"
              onClick={onExportBackup}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
              title="تصدير نسخة احتياطية JSON"
            >
              <Download className="w-3 h-3 text-emerald-500" />
              <span>تصدير</span>
            </button>
          )}

          {onImportBackup && (
            <label
              className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
              title="استيراد نسخة احتياطية JSON"
            >
              <Upload className="w-3 h-3 text-blue-500" />
              <span>استيراد</span>
              <input type="file" accept=".json" onChange={onImportBackup} className="hidden" />
            </label>
          )}

          {isInstallable && onInstallApp && (
            <button
              type="button"
              onClick={onInstallApp}
              className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-colors cursor-pointer shadow-2xs animate-pulse"
              title="تثبيت التطبيق على جهازك (PWA)"
            >
              <Smartphone className="w-3 h-3" />
              <span>تثبيت</span>
            </button>
          )}
        </div>

        {/* Nav Filters & Categories */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/50 flex flex-wrap gap-1 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => onUpdateFilter({ filterType: 'all', selectedTag: null, selectedColor: null })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterState.filterType === 'all'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Folder className="w-3 h-3" />
            <span>الكل ({activeNotesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilter({ filterType: 'pinned', selectedTag: null, selectedColor: null })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterState.filterType === 'pinned'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Pin className="w-3 h-3 text-amber-500" />
            <span>المثبتة</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilter({ filterType: 'favorite', selectedTag: null, selectedColor: null })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterState.filterType === 'favorite'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Star className="w-3 h-3 text-rose-500" />
            <span>المفضلة</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilter({ filterType: 'archived', selectedTag: null, selectedColor: null })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterState.filterType === 'archived'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Archive className="w-3 h-3" />
            <span>الأرشيف</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilter({ filterType: 'trash', selectedTag: null, selectedColor: null })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterState.filterType === 'trash'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>السلة</span>
          </button>
        </div>

        {/* Tags horizontal scroll if tags exist */}
        {allTags.length > 0 && (
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">الوسوم:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  onUpdateFilter({
                    filterType: filterState.selectedTag === tag ? 'all' : 'tag',
                    selectedTag: filterState.selectedTag === tag ? null : tag,
                  })
                }
                className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-colors cursor-pointer ${
                  filterState.selectedTag === tag
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Active Drag & Drop Reordering Banner */}
        {draggedNoteId && (
          <div className="mx-2 mt-1.5 mb-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-between shadow-md animate-pulse">
            <span className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-indigo-200" />
              <span>وضع السحب والترتيب نشط</span>
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              اسحب وأفلت في الموضع المطلوب ↕️
            </span>
          </div>
        )}

        {/* Note Tree Scrollable Section */}
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {tree.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <FolderPlus className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                لا توجد ملاحظات تطابق البحث أو الفلتر الحريري.
              </p>
              <p className="text-xs text-slate-400 mt-1">استخدم زر (+) بالأسفل لإضافة محتوى جديد.</p>
            </div>
          ) : (
            tree.map((node) => renderTreeNode(node))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            إجمالي الملاحظات: <strong>{activeNotesCount}</strong>
          </span>

          {onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/50"
              title="الدخول إلى لوحة الإدارة"
            >
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              <span>لوحة الإدارة</span>
            </button>
          )}

          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            حفظ تلقائي
          </span>
        </div>
      </aside>

      {/* Create List Named Modal (نافذة إنشاء قائمة بالاسم وتخصيصها) */}
      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreateList={(title, icon, color, parentId) => {
          if (onCreateNewList) {
            onCreateNewList(title, icon, color, parentId);
          } else {
            onCreateRootNote();
          }
          setIsCreateListModalOpen(false);
        }}
        availableParents={allNotes}
        defaultParentId={activeNoteId}
      />
    </>
  );
};
