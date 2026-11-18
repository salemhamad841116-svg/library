import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, List, ChevronUp, FileText, FolderPlus, Folder, 
  Layers, Search, SlidersHorizontal, Sparkles, Check, X, 
  CornerDownLeft, FilePlus, ListPlus, FolderTree, ArrowUpDown, Settings, User,
  ArrowRight, ChevronRight, MoreVertical, Copy, Move, ArrowUp, ArrowDown, Pin, Star, Archive, Trash2
} from 'lucide-react';
import { Note, NoteTreeNode, ListCategory } from '../../types';
import { CreateListModal } from '../Modals/CreateListModal';
import { COLOR_PRESETS } from '../../services/storage';

interface BottomNavBarProps {
  notes: Note[];
  tree: NoteTreeNode[];
  activeNoteId: string | null;
  activeNote: Note | null;
  lists?: ListCategory[];
  activeListId?: string | null;
  onSelectNote: (id: string) => void;
  onSelectList?: (id: string | null) => void;
  onCreateRootNote: () => void;
  onCreateSubNote: (parentId: string) => void;
  onCreateNewList?: (title: string, icon: string, color: string, parentId: string | null) => void;
  onOpenMobileSidebar: () => void;
  onOpenUserDrawer?: () => void;
  isToolbarOpen?: boolean;
  onToggleToolbar?: () => void;
  onRenameNote?: (id: string, newTitle: string) => void;
  onDuplicateNote?: (id: string) => void;
  onMoveNoteClick?: (id: string) => void;
  onMoveNoteDirection?: (id: string, direction: 'up' | 'down') => void;
  onTogglePin?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onChangeColor?: (id: string, color: string) => void;
  onDeleteNote?: (id: string) => void;
  onRenameList?: (id: string, newTitle: string) => void;
  onDuplicateList?: (id: string) => void;
  onMoveListDirection?: (id: string, direction: 'up' | 'down') => void;
  onToggleListPin?: (id: string) => void;
  onToggleListFavorite?: (id: string) => void;
  onToggleListArchive?: (id: string) => void;
  onChangeListColor?: (id: string, color: string) => void;
  onDeleteList?: (id: string) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  notes,
  tree,
  activeNoteId,
  activeNote,
  lists = [],
  activeListId = null,
  onSelectNote,
  onSelectList,
  onCreateRootNote,
  onCreateSubNote,
  onCreateNewList,
  onOpenMobileSidebar,
  onOpenUserDrawer,
  isToolbarOpen = false,
  onToggleToolbar,
  onRenameNote,
  onDuplicateNote,
  onMoveNoteClick,
  onMoveNoteDirection,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onChangeColor,
  onDeleteNote,
  onRenameList,
  onDuplicateList,
  onMoveListDirection,
  onToggleListPin,
  onToggleListFavorite,
  onToggleListArchive,
  onChangeListColor,
  onDeleteList,
}) => {
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isQuickIndexOpen, setIsQuickIndexOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [modalParentListId, setModalParentListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'lists' | 'roots' | 'subnotes' | 'starred'>('all');
  const [contextMenuNoteId, setContextMenuNoteId] = useState<string | null>(null);
  const [contextMenuListId, setContextMenuListId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLDivElement>(null);

  // Close modals on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsActionModalOpen(false);
      }
      if (indexRef.current && !indexRef.current.contains(e.target as Node)) {
        setIsQuickIndexOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeList = lists.find((l) => l.id === activeListId) || null;

  // Filter notes for quick index
  const nonDeletedNotes = notes.filter((n) => !n.isDeleted);
  
  const filteredNotes = nonDeletedNotes.filter((n) => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterCategory === 'roots') return n.depth === 0;
    if (filterCategory === 'subnotes') return n.depth > 0;
    if (filterCategory === 'starred') return n.isFavorite || n.isPinned;
    return true;
  });

  const filteredLists = lists.filter((l) => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Direct sub-notes of current active note
  const currentSubNotes = activeNote
    ? nonDeletedNotes.filter((n) => n.parentId === activeNote.id)
    : [];

  const handleOpenCreateList = (parentId?: string | null) => {
    setModalParentListId(parentId ?? activeListId ?? null);
    setIsActionModalOpen(false);
    setIsQuickIndexOpen(false);
    setIsCreateListModalOpen(true);
  };

  const handleConfirmCreateList = (title: string, icon: string, color: string, parentId: string | null) => {
    if (onCreateNewList) {
      onCreateNewList(title, icon, color, parentId);
    } else {
      onCreateRootNote();
    }
  };

  const handleStartRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
    setContextMenuNoteId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim() && onRenameNote) {
      onRenameNote(id, editingTitle.trim());
    }
    setEditingNoteId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleSaveRename(id);
    if (e.key === 'Escape') setEditingNoteId(null);
  };

  return (
    <>
      {/* 1. Modal / Centered Dialog for Action Button '+' */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div 
            ref={modalRef}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    مركز الإنشاء والإضافة
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Context-aware Sub-List creation if activeList is present */}
              {activeList && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateList(activeList.id)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/50 dark:to-teal-950/30 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/60 dark:hover:to-teal-900/40 border border-emerald-200/90 dark:border-emerald-800/80 transition-all text-right group cursor-pointer shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform shrink-0">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                      <span>إنشاء قائمة فرعية (Sub-list)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                        داخل المجلد
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70 truncate mt-0.5">
                      إضافة مجلد/قائمة فرعية تابعة لـ "{activeList.name}"
                    </div>
                  </div>
                </button>
              )}

              {/* Action: Create Root List */}
              <button
                type="button"
                onClick={() => handleOpenCreateList(null)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-all text-right group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center justify-between">
                    <span>{activeList ? 'إنشاء قائمة رئيسية منفصلة' : 'إنشاء قائمة جديدة (New List)'}</span>
                  </div>
                  <div className="text-[11px] text-indigo-800/70 dark:text-indigo-300/70 truncate mt-0.5">
                    تخصيص اسم وأيقونة ولون لقائمة في المستوى الرئيسي
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal / Centered Dialog for Quick Notes & Lists Index (فهرس القوائم في منتصف الشاشة) */}
      {isQuickIndexOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div 
            ref={indexRef}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
          >
            {/* Header with quick creation button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    فهرس القوائم والملاحظات
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    استعراض سريع لكافة المجلدات والملاحظات مع دعم التصفية
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreateList(activeListId)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                  title="إنشاء قائمة جديدة"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>قائمة جديدة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickIndexOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في أسماء القوائم والملاحظات..."
                className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categories filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 select-none">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                الكل ({lists.length + nonDeletedNotes.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterCategory('lists')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterCategory === 'lists'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                📁 القوائم ({lists.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterCategory('roots')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterCategory === 'roots'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                📄 الملاحظات الرئيسية
              </button>

              <button
                type="button"
                onClick={() => setFilterCategory('subnotes')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterCategory === 'subnotes'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                ↳ الملاحظات المتفرعة
              </button>
            </div>

            {/* List of items */}
            <div 
              className="flex-1 overflow-y-auto space-y-1.5 max-h-64 pr-1"
              onClick={() => {
                setContextMenuNoteId(null);
                setContextMenuListId(null);
              }}
            >
              {/* If category is lists or all, show lists */}
              {(filterCategory === 'all' || filterCategory === 'lists') && filteredLists.length > 0 && (
                <div className="space-y-1 mb-2">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2">
                    📁 المجلدات والقوائم
                  </div>
                  {filteredLists.map((l) => {
                    const isSelected = activeListId === l.id;
                    const listNoteCount = notes.filter((n) => n.listId === l.id && !n.isDeleted).length;
                    return (
                      <div
                        key={l.id}
                        className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-colors relative ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                        style={{ paddingRight: `${Math.min((l.depth || 0) * 12 + 8, 36)}px` }}
                      >
                        <div 
                          className="flex items-center gap-2 truncate cursor-pointer flex-1"
                          onClick={() => {
                            if (onSelectList) onSelectList(l.id);
                            setIsQuickIndexOpen(false);
                          }}
                        >
                          <span className="text-sm shrink-0">{l.icon || '📁'}</span>
                          <span className="text-xs font-bold truncate">{l.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                            {listNoteCount} ملاحظة
                          </span>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenuListId(contextMenuListId === l.id ? null : l.id);
                            }}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {contextMenuListId === l.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenuListId(null);
                                }}
                              />
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 top-full mt-1 z-50 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95"
                              >
                                {onRenameList && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newName = window.prompt('تعديل اسم القائمة:', l.name);
                                      if (newName && newName.trim()) onRenameList(l.id, newName.trim());
                                      setContextMenuListId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-xs"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>إعادة تسمية</span>
                                  </button>
                                )}

                                {onDuplicateList && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDuplicateList(l.id);
                                      setContextMenuListId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-xs"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>تكرار القائمة والشجرة</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    alert("ميزة نقل المجلدات قيد التطوير!");
                                    setContextMenuListId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-xs"
                                >
                                  <Move className="w-3.5 h-3.5 text-slate-500" />
                                  <span>نقل لقائمة أخرى</span>
                                </button>

                                {onMoveListDirection && (
                                  <>
                                    <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                      تبديل الترتيب
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onMoveListDirection(l.id, 'up');
                                        setContextMenuListId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium text-xs"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                      <span>نقل للأعلى (Move Up)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onMoveListDirection(l.id, 'down');
                                        setContextMenuListId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium text-xs"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                      <span>نقل للأسفل (Move Down)</span>
                                    </button>
                                  </>
                                )}

                                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                                {onToggleListPin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onToggleListPin(l.id);
                                      setContextMenuListId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-xs"
                                  >
                                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{l.isPinned ? 'إلغاء التثبيت' : 'تثبيت بالقمة'}</span>
                                  </button>
                                )}

                                {onToggleListFavorite && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onToggleListFavorite(l.id);
                                      setContextMenuListId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-xs"
                                  >
                                    <Star className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{l.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
                                  </button>
                                )}

                                {onToggleListArchive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onToggleListArchive(l.id);
                                      setContextMenuListId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-xs"
                                  >
                                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{l.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}</span>
                                  </button>
                                )}

                                {onChangeListColor && (
                                  <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">تصنيف بالألوان:</span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {COLOR_PRESETS.map((c) => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => {
                                            onChangeListColor(l.id, c.id);
                                            setContextMenuListId(null);
                                          }}
                                          className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer hover:scale-110 transition-transform"
                                          style={{ backgroundColor: c.hex }}
                                          title={c.name}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {onDeleteList && (
                                  <>
                                    <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteList(l.id);
                                        setContextMenuListId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-right cursor-pointer text-xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>نقل إلى سلة المهملات</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Show Notes */}
              {filterCategory !== 'lists' && (
                filteredNotes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    لا توجد ملاحظات تطابق معايير البحث.
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2">
                      📄 الملاحظات
                    </div>
                    {filteredNotes.map((n) => {
                      const isSelected = activeNoteId === n.id;
                      return (
                        <div
                          key={n.id}
                          className={`relative w-full flex items-center justify-between p-1.5 rounded-xl transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          style={{ paddingRight: `${Math.min(n.depth * 12 + 4, 32)}px` }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectNote(n.id);
                              setIsQuickIndexOpen(false);
                            }}
                            className={`flex-1 flex items-center gap-2 truncate text-right cursor-pointer ${
                              isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {editingNoteId === n.id ? (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={() => handleSaveRename(n.id)}
                                onKeyDown={(e) => handleKeyDown(e, n.id)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="flex-1 text-xs bg-white dark:bg-slate-800 border border-blue-400 rounded-md px-2 py-0.5"
                              />
                            ) : (
                              <span className="text-xs font-medium truncate">
                                {n.title || 'ملاحظة بدون عنوان'}
                              </span>
                            )}
                            {n.childrenCount > 0 && editingNoteId !== n.id && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 shrink-0 ml-auto">
                                {n.childrenCount} فرعي
                              </span>
                            )}
                          </button>

                          {/* Options Button */}
                          <div className="relative shrink-0 pr-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuNoteId(contextMenuNoteId === n.id ? null : n.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Context Menu Dropdown */}
                            {contextMenuNoteId === n.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-[60] animate-in fade-in zoom-in-95"
                              >
                                {onRenameNote && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleStartRename(n, e)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-slate-700 dark:text-slate-200 text-xs"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>إعادة تسمية</span>
                                  </button>
                                )}

                                {onCreateSubNote && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onCreateSubNote(n.id);
                                      setContextMenuNoteId(null);
                                      setIsQuickIndexOpen(false); // Close index after creating subnote
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-slate-700 dark:text-slate-200 text-xs"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                                    <span>إضافة ملاحظة فرعية</span>
                                  </button>
                                )}

                                {onDuplicateNote && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDuplicateNote(n.id);
                                      setContextMenuNoteId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-slate-700 dark:text-slate-200 text-xs"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>تكرار الملاحظة والشجرة</span>
                                  </button>
                                )}

                                {onMoveNoteClick && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onMoveNoteClick(n.id);
                                      setContextMenuNoteId(null);
                                      setIsQuickIndexOpen(false); // Close index when opening move modal
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-slate-700 dark:text-slate-200 text-xs"
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
                                        onMoveNoteDirection(n.id, 'up');
                                        setContextMenuNoteId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium text-xs"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                      <span>نقل للأعلى (Move Up)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onMoveNoteDirection(n.id, 'down');
                                        setContextMenuNoteId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium text-xs"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                      <span>نقل للأسفل (Move Down)</span>
                                    </button>
                                  </>
                                )}

                                {onTogglePin && (
                                  <>
                                    <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onTogglePin(n.id);
                                        setContextMenuNoteId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-slate-700 dark:text-slate-200 text-xs"
                                    >
                                      <Pin className="w-3.5 h-3.5 text-amber-500" />
                                      <span>{n.isPinned ? 'إلغاء التثبيت' : 'تثبيت بالقمة'}</span>
                                    </button>
                                  </>
                                )}

                                {onToggleFavorite && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onToggleFavorite(n.id);
                                      setContextMenuNoteId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-slate-700 dark:text-slate-200 text-xs"
                                  >
                                    <Star className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{n.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
                                  </button>
                                )}

                                {onToggleArchive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onToggleArchive(n.id);
                                      setContextMenuNoteId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-slate-700 dark:text-slate-200 text-xs"
                                  >
                                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{n.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}</span>
                                  </button>
                                )}

                                {onChangeColor && (
                                  <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-semibold text-slate-400 block mb-1 text-right">تصنيف بالألوان:</span>
                                    <div className="flex items-center justify-end gap-1.5">
                                      {COLOR_PRESETS.map((c) => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => {
                                            onChangeColor(n.id, c.id);
                                            setContextMenuNoteId(null);
                                          }}
                                          className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer hover:scale-110 transition-transform"
                                          style={{ backgroundColor: c.hex }}
                                          title={c.name}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {onDeleteNote && (
                                  <>
                                    <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteNote(n.id);
                                        setContextMenuNoteId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-right cursor-pointer text-xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>نقل إلى سلة المهملات</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              {contextMenuNoteId && <div className="h-48" />}
            </div>

            {/* Bottom Actions inside Index */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                إجمالي المعروض: <strong>{filteredNotes.length + filteredLists.length}</strong> عنصر
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsQuickIndexOpen(false);
                  onOpenMobileSidebar();
                }}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                شجرة المجلدات الكاملة ←
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Dedicated Create List Dialog Modal */}
      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreateList={handleConfirmCreateList}
        allLists={lists}
        defaultParentId={modalParentListId}
        parentList={lists.find((l) => l.id === modalParentListId) || null}
      />

      {/* 4. Fixed Bottom Navigation Bar (Compact Width & Height) */}
      <div className="shrink-0 w-full flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 shadow-sm">
        <nav 
          aria-label="Bottom Bar" 
          className="w-full max-w-md px-3 py-1 flex items-center justify-around gap-1 select-none"
        >
          {/* Back Button (Only visible if activeNoteId is set) */}
          {activeNoteId && (
            <button
              type="button"
              onClick={() => {
                if (activeNote?.parentId) {
                  onSelectNote(activeNote.parentId);
                } else {
                  if (onSelectList) onSelectList(activeListId);
                }
              }}
              className="flex flex-col items-center justify-center gap-0.5 py-0.5 px-2 rounded-lg transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              title="الرجوع للقائمة"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-[9px] font-bold">رجوع</span>
            </button>
          )}

          {/* Button 1: Notes & Lists Index (فهرس القوائم والتنقل السريع) */}
          <button
            type="button"
            onClick={() => setIsQuickIndexOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-0.5 px-2 rounded-lg transition-all cursor-pointer ${
              isQuickIndexOpen
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
            title="فتح فهرس وعناوين القوائم والملاحظات للتنقل السريع"
          >
            <List className="w-4 h-4" />
            <span className="text-[9px] font-bold">فهرس</span>
          </button>

          {/* Center Button: Main Action Button '+' (Compact Floating Style) */}
          <div className="relative -top-2">
            <button
              type="button"
              onClick={() => setIsActionModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 hover:scale-105 active:scale-95 transition-transform cursor-pointer border-2 border-white dark:border-slate-900"
              title="إنشاء قائمة جديدة أو ملاحظات أساسية وفرعية (+)"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Button 2: Profile & Account Drawer (الملف الشخصي والحساب والإعدادات) */}
          <button
            type="button"
            onClick={onOpenUserDrawer}
            className="flex flex-col items-center justify-center gap-0.5 py-0.5 px-2 rounded-lg transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
            title="الملف الشخصي والحساب والإعدادات (≡)"
          >
            <User className="w-4 h-4" />
            <span className="text-[9px] font-bold">الحساب</span>
          </button>
        </nav>
      </div>
    </>
  );
};
