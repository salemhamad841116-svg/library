import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Settings, Cloud, Radio, Sun, Moon, Keyboard, Smartphone, 
  ShieldCheck, Download, Upload, LogOut, CheckCircle2, 
  ExternalLink, Sparkles, ChevronLeft, ChevronDown, ChevronRight,
  Folder, FolderPlus, FileText, Plus, Home, Layers, Hash, Search
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { AppIcon } from '../Icons/AppIcon';
import { ListCategory, ListTreeNode, Note } from '../../types';
import { buildListTree, COLOR_PRESETS } from '../../services/storage';

interface UserNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenBackupSync: () => void;
  onOpenOTAUpdate: () => void;
  onOpenShortcuts: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenAdmin?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline?: boolean;
  lastSyncedTime?: Date | null;
  currentVersion: string;
  hasOTAUpdate: boolean;
  isInstallable?: boolean;
  onInstallApp?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => Promise<void> | void;

  // Hierarchical Lists Integration
  lists?: ListCategory[];
  notes?: Note[];
  activeListId?: string | null;
  onSelectList?: (id: string | null) => void;
  onOpenCreateListModal?: (parentId?: string | null) => void;
}

// Tree node component for drawer
interface DrawerListTreeItemProps {
  node: ListTreeNode;
  depth?: number;
  activeListId: string | null;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onSelectList: (id: string) => void;
  onAddSubList: (parentId: string) => void;
}

const DrawerListTreeItem: React.FC<DrawerListTreeItemProps> = ({
  node,
  depth = 0,
  activeListId,
  expandedMap,
  onToggleExpand,
  onSelectList,
  onAddSubList,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedMap[node.id] ?? true;
  const isSelected = activeListId === node.id;
  const preset = COLOR_PRESETS.find((c) => c.id === node.color) || COLOR_PRESETS[0];

  return (
    <div className="flex flex-col select-none">
      <div 
        className={`group flex items-center justify-between py-2 px-2.5 rounded-xl transition-all cursor-pointer ${
          isSelected 
            ? 'bg-indigo-100/90 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 font-black border border-indigo-300/80 dark:border-indigo-800' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
        }`}
        style={{ paddingRight: `${Math.min(depth * 14 + 10, 48)}px` }}
      >
        {/* Main List Info & Icon */}
        <div 
          className="flex items-center gap-2 min-w-0 flex-1"
          onClick={() => onSelectList(node.id)}
        >
          {/* Chevron expand/collapse toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-transform"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
            </button>
          ) : (
            <span className="w-3.5 h-3.5" />
          )}

          {/* List Icon */}
          <span 
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 shadow-2xs ${preset.bgClass}`}
          >
            {node.icon || '📁'}
          </span>

          {/* List Title */}
          <span className="text-xs truncate flex-1 leading-tight">
            {node.name}
          </span>
        </div>

        {/* Count Badge & Quick Sub-list button */}
        <div className="flex items-center gap-1 shrink-0 mr-1">
          {/* Notes count badge */}
          {(node.notesCount !== undefined && node.notesCount > 0) && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {node.notesCount}
            </span>
          )}

          {/* Quick Add Sub-list Button on hover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddSubList(node.id);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title={`إضافة قائمة فرعية تابعة لـ "${node.name}"`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recursive Children Items */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col border-r-2 border-indigo-100 dark:border-indigo-900/40 mr-3.5 space-y-0.5 mt-0.5">
          {node.children.map((child) => (
            <DrawerListTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeListId={activeListId}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
              onSelectList={onSelectList}
              onAddSubList={onAddSubList}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const UserNavigationDrawer: React.FC<UserNavigationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenBackupSync,
  onOpenOTAUpdate,
  onOpenShortcuts,
  onOpenPrivacyPolicy,
  onOpenAdmin,
  isDarkMode,
  onToggleDarkMode,
  isOnline = true,
  lastSyncedTime = null,
  currentVersion,
  hasOTAUpdate,
  isInstallable = false,
  onInstallApp,
  onExportBackup,
  onImportBackup,
  onLogout,
  lists = [],
  notes = [],
  activeListId = null,
  onSelectList,
  onOpenCreateListModal,
}) => {
  // Reactive Auth State
  const { user, userProfile } = useAuth();

  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);

  // State to track expanded folders in tree
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [listSearchQuery, setListSearchQuery] = useState<string>('');

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  // Build hierarchical list tree
  const rawListTree = useMemo(() => {
    return buildListTree(lists, null, notes);
  }, [lists, notes]);

  // Filter list tree based on search query
  const listTree = useMemo(() => {
    if (!listSearchQuery.trim()) return rawListTree;
    const query = listSearchQuery.toLowerCase().trim();

    const filterNode = (node: ListTreeNode): ListTreeNode | null => {
      const nameMatches = node.name.toLowerCase().includes(query);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((n): n is ListTreeNode => n !== null);

      if (nameMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return rawListTree.map(filterNode).filter((n): n is ListTreeNode => n !== null);
  }, [rawListTree, listSearchQuery]);

  // Auto-expand all matching branches when searching lists
  useEffect(() => {
    if (listSearchQuery.trim()) {
      const newExpanded: Record<string, boolean> = {};
      const markExpanded = (nodes: ListTreeNode[]) => {
        nodes.forEach((n) => {
          newExpanded[n.id] = true;
          if (n.children && n.children.length > 0) {
            markExpanded(n.children);
          }
        });
      };
      markExpanded(listTree);
      setExpandedMap((prev) => ({ ...prev, ...newExpanded }));
    }
  }, [listSearchQuery, listTree]);

  // Derive dynamic user display details reactively from auth state
  const userNameDisplay = 
    userProfile?.displayName || 
    user?.displayName || 
    (user?.email ? user.email.split('@')[0] : 'مستخدم التطبيق');

  const userEmailDisplay = 
    userProfile?.email || 
    user?.email || 
    'user@notes.cloud';

  const userAvatarUrl = 
    userProfile?.photoURL || 
    user?.photoURL || 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userNameDisplay)}`;

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Touch handlers for closing drawer via swipe gesture to the right edge (RTL)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchCurrentX.current !== null) {
      const deltaX = touchCurrentX.current - touchStartX.current;
      // In RTL drawer located on the right, swiping right (deltaX > 60) closes the drawer
      if (deltaX > 60) {
        onClose();
      }
    }
    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  if (!isOpen) return null;

  const handleItemClick = (action: () => void) => {
    onClose();
    setTimeout(() => {
      action();
    }, 120);
  };

  const handleSelectSpecificList = (id: string | null) => {
    onClose();
    if (onSelectList) {
      onSelectList(id);
    }
  };

  const handleCreateNewSubList = (parentId?: string | null) => {
    onClose();
    if (onOpenCreateListModal) {
      onOpenCreateListModal(parentId);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto select-none flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
    >
      {/* Dimmed Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Centered Modal Container in the Center of Screen (نافذة القوائم في منتصف الشاشة) */}
      <div 
        ref={drawerRef}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200 ease-out"
      >
        {/* ========================================================================= */}
        {/* 1. DRAWER HEADER: Reactive User Profile & Avatar                         */}
        {/* ========================================================================= */}
        <div className="relative p-5 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white overflow-hidden shrink-0 shadow-md">
          {/* Decorative background glow */}
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar inside Header with Close Button */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <AppIcon className="w-6 h-6" />
              <span className="text-xs font-bold text-indigo-200 tracking-wide">
                الملف الشخصي والحساب
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="إغلاق القائمة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="relative shrink-0">
              <img
                src={userAvatarUrl}
                alt={userNameDisplay}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-400/60 shadow-lg bg-indigo-950"
                referrerPolicy="no-referrer"
              />
              <span 
                className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-indigo-900 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={isOnline ? 'متصل بالإنترنت والمزامنة' : 'وضع عدم الاتصال'}
              />
            </div>

            <div className="flex-1 min-w-0">
              {/* Dynamic User Display Name */}
              <h2 className="text-base font-black text-white truncate leading-tight flex items-center gap-1.5">
                <span>{userNameDisplay}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              </h2>
              {/* Dynamic User Email */}
              <p className="text-xs text-indigo-200/80 truncate mt-0.5" dir="ltr">
                {userEmailDisplay}
              </p>

              {/* Status Badge */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-400/30 text-[10px] font-bold text-indigo-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>حساب موثق ومزامن</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. DRAWER LIST ITEMS: Tree Navigation & Settings                          */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* ===================================================================== */}
          {/* HIERARCHICAL FOLDERS & LISTS TREE SECTION (الهيكل الشجري للقوائم)     */}
          {/* ===================================================================== */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-500" />
                <span>شجرة المجلدات والقوائم ({lists.length})</span>
              </span>
              <button
                type="button"
                onClick={() => handleCreateNewSubList(null)}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                title="إنشاء قائمة رئيسية جديدة"
              >
                <Plus className="w-3 h-3" />
                <span>قائمة جديدة</span>
              </button>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-850/60 rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800 space-y-2">
              {/* Search Box in Lists (صندوق البحث في القوائم والمجلدات) */}
              {lists.length > 0 && (
                <div className="relative flex items-center">
                  <div className="absolute right-2.5 text-slate-400 pointer-events-none flex items-center justify-center">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    placeholder="ابحث في القوائم والمجلدات..."
                    className="w-full pr-8 pl-7 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden transition-all shadow-2xs"
                  />
                  {listSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setListSearchQuery('')}
                      className="absolute left-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="مسح البحث"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* All Lists / Home Dashboard Button */}
              <button
                type="button"
                onClick={() => handleSelectSpecificList(null)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeListId === null
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    activeListId === null ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    🏠
                  </span>
                  <span>الرئيسية (جميع القوائم)</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeListId === null ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {notes.filter(n => !n.isDeleted).length}
                </span>
              </button>

              {/* Recursive Tree of Lists */}
              {listTree.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  لا توجد قوائم حالياً. انقر على "+ قائمة جديدة" للبدء.
                </div>
              ) : (
                <div className="space-y-0.5 mt-1">
                  {listTree.map((rootNode) => (
                    <DrawerListTreeItem
                      key={rootNode.id}
                      node={rootNode}
                      depth={0}
                      activeListId={activeListId}
                      expandedMap={expandedMap}
                      onToggleExpand={toggleExpand}
                      onSelectList={handleSelectSpecificList}
                      onAddSubList={handleCreateNewSubList}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Action: Settings (إعدادات التطبيق) */}
          <div>
            <div className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1.5">
              الإعدادات الرئيسية
            </div>

            <button
              type="button"
              onClick={() => handleItemClick(onOpenSettings)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-100 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:rotate-45 transition-transform duration-300">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <div className="text-sm font-black flex items-center gap-1.5">
                    <span>إعدادات التطبيق</span>
                    {hasOTAUpdate && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-[11px] text-indigo-800/70 dark:text-indigo-300/70">
                    المزامنة، التحديثات، المظهر والأمان
                  </div>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-indigo-500 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Quick Access Navigation Section */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1.5">
              الخدمات والمزامنة
            </div>

            {/* Cloud Sync & Backup */}
            <button
              type="button"
              onClick={() => handleItemClick(onOpenBackupSync)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">النسخ الاحتياطي والمزامنة</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {lastSyncedTime ? `آخر مزامنة: ${lastSyncedTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : 'مزامنة سحابية نشطة'}
                  </div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {/* OTA Live Updates */}
            <button
              type="button"
              onClick={() => handleItemClick(onOpenOTAUpdate)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  <Radio className={`w-4 h-4 ${hasOTAUpdate ? 'animate-spin text-yellow-500' : ''}`} />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">التحديثات الحية (OTA)</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    الإصدار الحالي: v{currentVersion}
                  </div>
                </div>
              </div>
              {hasOTAUpdate ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black animate-pulse">
                  تحديث جاهز
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400">محدّث ✓</span>
              )}
            </button>

            {/* Privacy Policy & Device Info */}
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={() => handleItemClick(onOpenPrivacyPolicy)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">سياسة الخصوصية وبيانات الجهاز</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      مواصفات الجهاز وموقع الاتصال (Metadata)
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* Admin Portal (if supported) */}
            {onOpenAdmin && (
              <button
                type="button"
                onClick={() => handleItemClick(onOpenAdmin)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">لوحة الإدارة والتحكم</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      مراقبة الحسابات وقاعدة البيانات
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Preferences Section */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1.5">
              التفضيلات والمظهر
            </div>

            {/* Dark / Light Mode Switch */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-slate-700">
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">مظهر التطبيق</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isDarkMode ? 'الوضع الداكن مفعّل' : 'الوضع الفاتح مفعّل'}
                  </div>
                </div>
              </div>

              <div className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}>
                <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                  isDarkMode ? '-translate-x-4.5' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {/* Keyboard Shortcuts */}
            <button
              type="button"
              onClick={() => handleItemClick(onOpenShortcuts)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">اختصارات لوحة المفاتيح</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    تسريع التنقل والإنشاء
                  </div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                Ctrl + /
              </kbd>
            </button>

            {/* Install PWA App (Always available to guide users or trigger install) */}
            {onInstallApp && (
              <button
                type="button"
                onClick={() => handleItemClick(onInstallApp)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/90 dark:hover:bg-blue-900/60 text-blue-950 dark:text-blue-200 transition-colors cursor-pointer border border-blue-200/80 dark:border-blue-800/80"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">تثبيت التطبيق الآن</div>
                    <div className="text-[10px] text-blue-700/80 dark:text-blue-300/80">
                      تشغيل مستقل بشاشة كاملة بدون شريط المتصفح
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shadow-xs">
                  تثبيت
                </span>
              </button>
            )}
          </div>

          {/* Quick Import / Export */}
          {(onExportBackup || onImportBackup) && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              {onExportBackup && (
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  title="تصدير نسخة احتياطية JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير JSON</span>
                </button>
              )}

              {onImportBackup && (
                <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>استيراد JSON</span>
                  <input type="file" accept=".json" onChange={onImportBackup} className="hidden" />
                </label>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. DRAWER FOOTER: Logout & Version Tag                                    */}
        {/* ========================================================================= */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-black transition-colors cursor-pointer border border-rose-200/80 dark:border-rose-800/80 shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج من الحساب</span>
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1 font-medium">
            <span>Library Pro • v{currentVersion}</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isOnline ? 'سحابي متصل' : 'محلي'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
