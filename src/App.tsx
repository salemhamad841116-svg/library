import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Menu, Moon, Sun, Plus, Download, Upload, Keyboard, 
  Folder, FolderPlus, Layers, AlertCircle, FileText, Settings, Check, HelpCircle, SlidersHorizontal, Cloud, LogOut, User as UserIcon, Loader2, RefreshCw, Smartphone, Radio,
  ArrowRight, ChevronLeft, ChevronDown, Pin, Star, Edit3, Eye, X, Palette, List, Sparkles, Trash2, Search, MoreVertical, Copy, Move, ArrowUp, ArrowDown, Archive
} from 'lucide-react';
import { Note, NoteTreeNode, FilterState, EditorViewMode, TaskItem, AttachmentItem, ListCategory } from './types';
import { 
  loadAllNotes, saveAllNotes, buildNoteTree, getBreadcrumbPath, 
  createNewNote, createNewList, moveNoteToParent, setNoteDeleteStatus, duplicateNoteWithSubtree, 
  filterAndSearchNotes, getAllUniqueTags, calculateNoteStats, updateChildrenCounts,
  reorderNotesList, moveNoteDirection, loadAllLists, saveAllLists, COLOR_PRESETS,
  getListBreadcrumbPath, deleteListWithSubtree, duplicateListWithSubtree, moveListDirectionAction
} from './services/storage';
import { 
  loadNotesFromFirestoreAsync, 
  startRealtimeSync, 
  syncAllNotesToFirestore, 
  deleteNoteFromFirestore,
  mergeNotesWithTimestampResolution,
  loadListsFromFirestoreAsync,
  startListsRealtimeSync,
  syncAllListsToFirestore,
  deleteListFromFirestore,
  mergeListsWithTimestampResolution,
  syncListToFirestore,
  DEVICE_ID 
} from './services/accountBoundSync';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthContainer } from './auth/AuthContainer';
import { NoteTreeSidebar } from './components/Sidebar/NoteTreeSidebar';
import { Breadcrumb } from './components/Breadcrumb';
import { RichTextEditor } from './components/Editor/RichTextEditor';
import { NoteTasksManager } from './components/Tasks/NoteTasksManager';
import { AttachmentsGallery } from './components/Media/AttachmentsGallery';
import { MoveNoteModal } from './components/Modals/MoveNoteModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { BackupSyncModal } from './components/Modals/BackupSyncModal';
import { AppSettingsModal } from './components/Modals/AppSettingsModal';
import { CreateListModal } from './components/Modals/CreateListModal';
import { PrivacyPolicyModal } from './components/Modals/PrivacyPolicyModal';
import { UserNavigationDrawer } from './components/Navigation/UserNavigationDrawer';
import { IOSInstallModal } from './components/Modals/IOSInstallModal';
import { InstallAppModal } from './components/Modals/InstallAppModal';
import { OTAUpdateModal } from './components/Modals/OTAUpdateModal';
import { OTANotificationToast } from './components/Navigation/OTANotificationToast';
import { SplashScreen } from './components/Splash/SplashScreen';
import { AdminLayout } from './components/Admin/AdminLayout';
import { AdminAuthModal } from './components/Admin/AdminAuthModal';
import { useUIConfig } from './hooks/useUIConfig';
import { DynamicFilterBar } from './components/DynamicFilterBar';
import { BottomNavBar } from './components/Navigation/BottomNavBar';
import { NoteAccordionItem } from './components/NoteAccordionItem';
import { getAdminSession } from './services/adminStorage';
import { AppIcon } from './components/Icons/AppIcon';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOTAUpdates } from './hooks/useOTAUpdates';
import { publishEntireLibraryToBot } from './services/libraryPublisher';

function NotesApp() {
  const { user, userProfile, logout, loading: authLoading } = useAuth();
  const { config: uiConfig, getActiveFilters, getElementsByLocation } = useUIConfig();
  const [activeUIFilters, setActiveUIFilters] = useState<Record<string, any>>({});
  const { isInstallable, installApp, hasDeferredPrompt, showIOSInstruction, closeIOSInstruction, isStandalone } = usePWAInstall();
  const { 
    currentVersion, 
    isChecking: isCheckingOTA, 
    hasUpdate: hasOTAUpdate, 
    updateManifest, 
    lastCheckedTime: otaLastCheckedTime, 
    showRollbackNotice, 
    isUpdating: isApplyingOTA, 
    dismissRollbackNotice, 
    checkForUpdates: handleCheckOTAUpdates, 
    applyUpdate: handleApplyOTAUpdate, 
    rollbackToSafeVersion: handleRollbackOTA 
  } = useOTAUpdates();

  const [notes, setNotes] = useState<Note[]>(() => loadAllNotes());
  const [lists, setLists] = useState<ListCategory[]>(() => loadAllLists());
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const [filterState, setFilterState] = useState<FilterState>({
    query: '',
    filterType: 'all',
    selectedTag: null,
    selectedColor: null,
    sortBy: 'updatedAt',
    sortDirection: 'desc',
  });

  const [viewMode, setViewMode] = useState<EditorViewMode>('edit');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_mode') === 'dark';
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isBackupSyncModalOpen, setIsBackupSyncModalOpen] = useState(false);
  const [isAppSettingsModalOpen, setIsAppSettingsModalOpen] = useState(false);
  const [isPrivacyPolicyModalOpen, setIsPrivacyPolicyModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isOTAModalOpen, setIsOTAModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [modalParentListId, setModalParentListId] = useState<string | null>(null);
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [listDashboardSearch, setListDashboardSearch] = useState<string>('');
  // Initial state: Toolbar is closed/hidden by default to maximize note view area
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [contextMenuListId, setContextMenuListId] = useState<string | null>(null);

  // Backup & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof window !== 'undefined' ? navigator.onLine : true);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(() => new Date());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('app_auto_sync') !== 'false';
  });

  // Edge Swipe Gesture Listener for Opening User Navigation Drawer (السحب من حافة الشاشة)
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isEdgeTouch = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // In RTL Arabic layout, detect touch near the right edge (or near left edge)
      const isRightEdge = touch.clientX > window.innerWidth - 35;
      const isLeftEdge = touch.clientX < 35;

      if (isRightEdge || isLeftEdge) {
        startX = touch.clientX;
        startY = touch.clientY;
        isEdgeTouch = true;
      } else {
        isEdgeTouch = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeTouch || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);

      // Horizontal swipe inward by > 40px
      if (deltaY < 60) {
        // Swiped inward from right edge (RTL) or left edge
        if ((startX > window.innerWidth - 35 && deltaX < -40) || (startX < 35 && deltaX > 40)) {
          setIsUserDrawerOpen(true);
          isEdgeTouch = false;
        }
      }
    };

    const handleTouchEnd = () => {
      isEdgeTouch = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Track Online / Offline network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('app_auto_sync', autoSyncEnabled ? 'true' : 'false');
  }, [autoSyncEnabled]);

  // Admin Portal State
  const [appMode, setAppMode] = useState<'user' | 'admin'>('user');
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);

  // Check URL query parameters for direct admin portal access: ?admin=true or ?mode=admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin' || params.get('admin') === 'true') {
      const session = getAdminSession();
      if (session.isAuthenticated) {
        setAppMode('admin');
      } else {
        setIsAdminAuthOpen(true);
      }
    }
  }, []);

  // Apply dark mode class to html document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [isDarkMode]);

  // Flag to prevent re-syncing incoming remote changes back to Firestore
  const isRemoteUpdateRef = useRef(false);
  const [isFirebaseSyncActive, setIsFirebaseSyncActive] = useState(false);
  const [isSyncReady, setIsSyncReady] = useState(false);

  // Keep latest refs for app lifecycle listeners (beforeunload / pagehide)
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const userRef = useRef(user);
  userRef.current = user;

  // App Lifecycle Listener: Force instant persistence before browser/app termination
  useEffect(() => {
    const handleAppTerminationOrHide = () => {
      if (notesRef.current) {
        saveAllNotes(notesRef.current, userRef.current?.uid);
      }
    };

    window.addEventListener('beforeunload', handleAppTerminationOrHide);
    window.addEventListener('pagehide', handleAppTerminationOrHide);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleAppTerminationOrHide();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleAppTerminationOrHide);
      window.removeEventListener('pagehide', handleAppTerminationOrHide);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Initialize and synchronize notes for logged-in user or guest
  useEffect(() => {
    let unsubscribeSync: (() => void) | null = null;
    let unsubscribeListsSync: (() => void) | null = null;
    setIsSyncReady(false);

    const initializeFirebaseSync = async () => {
      if (!user) {
        // Guest mode: load local guest notes & lists
        const guestNotes = loadAllNotes();
        const guestLists = loadAllLists();
        setNotes(guestNotes);
        setLists(guestLists);
        setActiveNoteId((prev) => (prev && guestNotes.some((n) => n.id === prev) ? prev : (guestNotes[0]?.id || null)));
        setIsFirebaseSyncActive(false);
        setIsSyncReady(true);
        return;
      }

      // User logged in: Load user-scoped local cache first
      const cachedUserNotes = loadAllNotes(user.uid);
      const cachedUserLists = loadAllLists();
      
      if (cachedUserNotes && cachedUserNotes.length > 0) {
        setNotes(cachedUserNotes);
        setActiveNoteId((prev) => (prev && cachedUserNotes.some((n) => n.id === prev) ? prev : cachedUserNotes[0].id));
      }
      if (cachedUserLists && cachedUserLists.length > 0) {
        setLists(cachedUserLists);
      }

      // Fetch user's canonical cloud notes and lists from Firestore
      const remoteNotes = await loadNotesFromFirestoreAsync(user.uid);
      const remoteLists = await loadListsFromFirestoreAsync(user.uid);

      if (remoteLists && remoteLists.length > 0) {
        const mergedLists = mergeListsWithTimestampResolution(cachedUserLists, remoteLists);
        setLists(mergedLists);
        saveAllLists(mergedLists);
        syncAllListsToFirestore(mergedLists, user.uid).catch((e) => console.warn('Sync back merged lists warning:', e));
      } else if (remoteLists && remoteLists.length === 0 && cachedUserLists.length > 0) {
        await syncAllListsToFirestore(cachedUserLists, user.uid);
      }

      if (remoteNotes && remoteNotes.length > 0) {
        // Merge cloud notes with local cache using timestamp resolution (Offline-First)
        const mergedNotes = mergeNotesWithTimestampResolution(cachedUserNotes, remoteNotes);
        isRemoteUpdateRef.current = true;
        setNotes(mergedNotes);
        saveAllNotes(mergedNotes, user.uid);
        setLastSyncedTime(new Date());

        // Sync back merged notes to Firestore to ensure cloud reflects any local offline changes
        syncAllNotesToFirestore(mergedNotes, user.uid).catch((e) => console.warn('Sync back merged notes warning:', e));

        setActiveNoteId((prevId) => {
          if (!prevId || !mergedNotes.some((n) => n.id === prevId)) {
            return mergedNotes[0]?.id || null;
          }
          return prevId;
        });
      } else if (remoteNotes && remoteNotes.length === 0 && cachedUserNotes.length === 0) {
        // Brand new account with no notes in Cloud or Local cache: seed initial workspace notes into user account
        const defaultNotes = loadAllNotes(); // default seed notes
        setNotes(defaultNotes);
        saveAllNotes(defaultNotes, user.uid);
        await syncAllNotesToFirestore(defaultNotes, user.uid);
        setLastSyncedTime(new Date());
        if (defaultNotes.length > 0) setActiveNoteId(defaultNotes[0].id);
      } else if (cachedUserNotes.length > 0 && (!remoteNotes || remoteNotes.length === 0)) {
        // Local offline updates exist before cloud write: sync local cache to Firestore
        await syncAllNotesToFirestore(cachedUserNotes, user.uid);
        setLastSyncedTime(new Date());
      }

      // Start real-time onSnapshot listener for user notes
      unsubscribeSync = startRealtimeSync((receivedNotes, senderDeviceId) => {
        if (senderDeviceId === DEVICE_ID) {
          return;
        }

        isRemoteUpdateRef.current = true;
        setNotes((prevNotes) => {
          const merged = mergeNotesWithTimestampResolution(prevNotes, receivedNotes);
          saveAllNotes(merged, user.uid);
          return merged;
        });
        setLastSyncedTime(new Date());
        setActiveNoteId((prevId) => {
          if (!prevId) return receivedNotes[0]?.id || null;
          return prevId;
        });
      }, user.uid);

      unsubscribeListsSync = startListsRealtimeSync((receivedLists, senderDeviceId) => {
        if (senderDeviceId === DEVICE_ID) return;
        isRemoteUpdateRef.current = true;
        setLists((prevLists) => {
          const merged = mergeListsWithTimestampResolution(prevLists, receivedLists);
          saveAllLists(merged);
          return merged;
        });
      }, user.uid);

      setIsFirebaseSyncActive(true);
      setIsSyncReady(true);
    };

    initializeFirebaseSync();

    return () => {
      if (unsubscribeSync) {
        unsubscribeSync();
      }
      if (unsubscribeListsSync) {
        unsubscribeListsSync();
      }
    };
  }, [user?.uid]);

  // Save notes and lists locally and sync changes to Firestore when modified
  useEffect(() => {
    saveAllNotes(notes, user?.uid);
    saveAllLists(lists);

    // Auto-publish library changes to the Bot Knowledge Base (Zero caching lag)
    const botSyncTimeout = setTimeout(() => {
      publishEntireLibraryToBot(lists, notes, user?.uid || 'admin').catch(() => {});
    }, 1200);

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return () => clearTimeout(botSyncTimeout);
    }

    if (!isSyncReady) {
      return () => clearTimeout(botSyncTimeout);
    }

    if (user && autoSyncEnabled && isOnline) {
      const timeoutId = setTimeout(() => {
        syncAllNotesToFirestore(notes, user.uid).then(() => {
          setLastSyncedTime(new Date());
        }).catch((e) => console.warn('Auto sync warning:', e));
        
        syncAllListsToFirestore(lists, user.uid).catch((e) => console.warn('Auto sync lists warning:', e));
      }, 2000);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(botSyncTimeout);
      };
    }

    return () => clearTimeout(botSyncTimeout);
  }, [notes, lists, user?.uid, autoSyncEnabled, isOnline, isSyncReady]);

  // Filtered and Tree notes
  const listFilteredNotes = useMemo(() => {
    if (activeListId) {
      return notes.filter(n => n.listId === activeListId);
    }
    // If no list is selected, don't show notes on the home dashboard (or show all notes if you prefer)
    return notes;
  }, [notes, activeListId]);

  const filteredNotes = useMemo(() => {
    let result = filterAndSearchNotes(listFilteredNotes, filterState);
    
    // Apply Dynamic UI Filters
    Object.entries(activeUIFilters).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        result = result.filter((note: any) => {
          const noteValue = note[field];
          if (Array.isArray(value)) {
             return value.includes(noteValue);
          }
          if (typeof value === 'string' && value.trim() !== '') {
             return String(noteValue).toLowerCase().includes(value.toLowerCase());
          }
          return noteValue === value;
        });
      }
    });

    return result;
  }, [listFilteredNotes, filterState, activeUIFilters]);

  const tree = useMemo(() => {
    return buildNoteTree(filteredNotes, null, filterState.filterType !== 'trash');
  }, [filteredNotes, filterState.filterType]);

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  const activeChildNotes = useMemo(() => {
    if (!activeNoteId) return [];
    return notes.filter((n) => n.parentId === activeNoteId && !n.isDeleted);
  }, [notes, activeNoteId]);

  const [isSubNotesMenuOpen, setIsSubNotesMenuOpen] = useState(false);
  const subNotesDropdownRef = useRef<HTMLDivElement>(null);

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subNotesDropdownRef.current && !subNotesDropdownRef.current.contains(event.target as Node)) {
        setIsSubNotesMenuOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const NOTE_COLOR_OPTIONS = [
    { id: 'default', label: 'افتراضي', color: '#f8fafc', bgClass: 'bg-slate-200 dark:bg-slate-700' },
    { id: 'amber', label: 'كهرماني', color: '#fef3c7', bgClass: 'bg-amber-300' },
    { id: 'rose', label: 'وردي', color: '#fee2e2', bgClass: 'bg-rose-300' },
    { id: 'emerald', label: 'زمردي', color: '#dcfce7', bgClass: 'bg-emerald-300' },
    { id: 'blue', label: 'أزرق', color: '#e0e7ff', bgClass: 'bg-blue-300' },
    { id: 'purple', label: 'بنفسجي', color: '#f3e8ff', bgClass: 'bg-purple-300' },
    { id: 'orange', label: 'برتقالي', color: '#ffedd5', bgClass: 'bg-orange-300' },
  ];

  const breadcrumbItems = useMemo(() => {
    return getBreadcrumbPath(activeNoteId, notes);
  }, [activeNoteId, notes]);

  const listBreadcrumbs = useMemo(() => {
    return getListBreadcrumbPath(activeListId, lists);
  }, [activeListId, lists]);

  const allTags = useMemo(() => {
    return getAllUniqueTags(notes);
  }, [notes]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (e.shiftKey && activeNoteId) {
          handleCreateSubNote(activeNoteId);
        } else {
          handleCreateRootNote();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNoteId, notes]);

  // Actions
  const handleCreateRootNote = () => {
    let targetListId = activeListId;
    if (!targetListId && lists.length > 0) {
      targetListId = lists[0].id;
    } else if (!targetListId) {
      alert('يرجى إنشاء قائمة أولاً قبل إضافة ملاحظة.');
      return;
    }
    const { newNote, updatedNotes } = createNewNote(notes, null, 'ملاحظة جديدة', '', '📝', 'blue', [], user?.uid, targetListId);
    setNotes(updatedNotes);
    setActiveListId(targetListId);
    setActiveNoteId(newNote.id);
  };

  const handleCreateSubNote = (parentId: string) => {
    // Find the parent note to inherit its listId
    const parentNote = notes.find(n => n.id === parentId);
    let targetListId = parentNote?.listId || activeListId;

    if (!targetListId && lists.length > 0) {
      targetListId = lists[0].id;
    } else if (!targetListId) {
      alert('يرجى إنشاء قائمة أولاً قبل إضافة ملاحظة.');
      return;
    }
    const { newNote, updatedNotes } = createNewNote(notes, parentId, 'ملاحظة فرعية جديدة', '', '📝', 'blue', [], user?.uid, targetListId);
    setNotes(updatedNotes);
    setActiveListId(targetListId);
    setActiveNoteId(newNote.id);
  };

  const handleCreateNewList = (
    title: string, 
    icon: string = '📋', 
    color: string = 'indigo', 
    parentId: string | null = null
  ) => {
    const { newList, updatedLists } = createNewList(lists, title, icon, color, user?.uid, parentId);
    setLists(updatedLists);
    if (autoSyncEnabled) {
      syncListToFirestore(newList, user?.uid);
    }
    setActiveListId(newList.id);
    setActiveNoteId(null);
  };

  const handleDeleteList = async (listId: string) => {
    const target = lists.find((l) => l.id === listId);
    const listName = target ? `"${target.name}"` : 'هذه القائمة';
    if (!confirm(`هل أنت متأكد من حذف ${listName} وكافة المجلدات والملاحظات المتفرعة منها؟`)) {
      return;
    }

    const { updatedLists, deletedListIds } = deleteListWithSubtree(lists, listId);
    setLists(updatedLists);

    const deletedSet = new Set(deletedListIds);
    const updatedNotes = notes.filter((n) => !n.listId || !deletedSet.has(n.listId));
    setNotes(updatedNotes);
    saveAllNotes(updatedNotes, user?.uid);

    if (autoSyncEnabled) {
      for (const dId of deletedListIds) {
        await deleteListFromFirestore(dId, user?.uid);
      }
    }

    if (activeListId && deletedSet.has(activeListId)) {
      setActiveListId(null);
    }
    setActiveNoteId(null);
  };

  const handleRenameList = (id: string, newName: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: newName, updatedAt: new Date().toISOString() } : l)));
  };

  const handleDuplicateList = (id: string) => {
    const { updatedLists } = duplicateListWithSubtree(lists, id);
    setLists(updatedLists);
  };

  const handleMoveListDirection = (id: string, direction: 'up' | 'down') => {
    const updated = moveListDirectionAction(lists, id, direction);
    setLists(updated);
  };

  const handleToggleListPin = (id: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, isPinned: !l.isPinned, updatedAt: new Date().toISOString() } : l)));
  };

  const handleToggleListFavorite = (id: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, isFavorite: !l.isFavorite, updatedAt: new Date().toISOString() } : l)));
  };

  const handleToggleListArchive = (id: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, isArchived: !l.isArchived, updatedAt: new Date().toISOString() } : l)));
  };

  const handleChangeListColor = (id: string, color: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, color, updatedAt: new Date().toISOString() } : l)));
  };

  const handleUpdateNoteContent = useCallback((content: string) => {
    if (!activeNoteId) return;
    setNotes((prev) => {
      const current = prev.find((n) => n.id === activeNoteId);
      if (current && current.content === content) {
        return prev;
      }
      const stats = calculateNoteStats(content);
      return prev.map((n) =>
        n.id === activeNoteId
          ? {
              ...n,
              content,
              updatedAt: new Date().toISOString(),
              wordCount: stats.wordCount,
              characterCount: stats.characterCount,
              readingTime: stats.readingTime,
            }
          : n
      );
    });
  }, [activeNoteId]);

  const handleUpdateNoteTitle = useCallback((title: string) => {
    if (!activeNoteId) return;
    setNotes((prev) => {
      const current = prev.find((n) => n.id === activeNoteId);
      if (current && current.title === title) {
        return prev;
      }
      return prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, title, updatedAt: new Date().toISOString() }
          : n
      );
    });
  }, [activeNoteId]);

  const handleRenameNote = (id: string, newTitle: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title: newTitle, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleDuplicateNote = (id: string) => {
    const updated = duplicateNoteWithSubtree(notes, id);
    setNotes(updated);
  };

  const handleConfirmMove = (noteId: string, newParentId: string | null) => {
    const updated = moveNoteToParent(notes, noteId, newParentId);
    setNotes(updated);
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleToggleFavorite = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleToggleArchive = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isArchived: !n.isArchived, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleDeleteNote = (id: string, permanent = false) => {
    const targetNote = notes.find((n) => n.id === id);
    if (permanent && targetNote) {
      // Find note and all descendant sub-notes
      const targetPath = targetNote.path;
      const idsToDelete = notes
        .filter((n) => n.id === id || n.path.startsWith(targetPath + '/'))
        .map((n) => n.id);

      // Permanently delete from Firestore for user account
      if (user?.uid) {
        idsToDelete.forEach((deletedId) => {
          deleteNoteFromFirestore(deletedId, user.uid);
        });
      }
    }

    const updated = setNoteDeleteStatus(notes, id, true, permanent);
    setNotes(updated);
    if (activeNoteId === id) {
      const remaining = updated.filter((n) => !n.isDeleted);
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRestoreNote = (id: string) => {
    const updated = setNoteDeleteStatus(notes, id, false);
    setNotes(updated);
  };

  const handleChangeColor = (id: string, color: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, color, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleUpdateTasks = (tasks: TaskItem[]) => {
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, tasks, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleUpdateAttachments = (attachments: AttachmentItem[]) => {
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, attachments, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleReorderNotes = (sourceId: string, targetId: string) => {
    const updated = reorderNotesList(notes, sourceId, targetId);
    setNotes(updated);
  };

  const handleMoveNoteDirection = (id: string, direction: 'up' | 'down') => {
    const updated = moveNoteDirection(notes, id, direction);
    setNotes(updated);
  };

  // Export / Import Backup JSON
  const handleExportBackup = () => {
    const json = JSON.stringify(notes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const updated = updateChildrenCounts(parsed);
            setNotes(updated);
            saveAllNotes(updated, user?.uid);
            if (updated.length > 0) setActiveNoteId(updated[0].id);
            alert('تم استيراد نسخة الملاحظات بنجاح!');
          }
        } catch (err) {
          alert('ملف النسخة الاحتياطية غير صالح.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleOpenAdminPortal = () => {
    const session = getAdminSession();
    if (session.isAuthenticated) {
      setAppMode('admin');
      
    } else {
      setIsAdminAuthOpen(true);
    }
  };

  // Loading indicator during auth state determination
  if (authLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans dir-rtl">
        <AppIcon className="w-16 h-16 mb-4 animate-bounce" />
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-600 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>جاري التحقق من بيانات الجلسة...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, render the Auth Container (Login / Register / Forgot Password)
  if (!user) {
    return (
      <AuthContainer
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  if (appMode === 'admin') {
    const adminSession = getAdminSession();
    if (adminSession.isAuthenticated) {
      return (
        <AdminLayout
          onSwitchToUserApp={() => {
            setAppMode('user');
            
          }}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
      );
    }
  }

  const userNameDisplay = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'مستخدم';
  const userAvatarUrl = userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userNameDisplay)}`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans dir-rtl">
      {/* Admin Auth Modal if triggered */}
      {isAdminAuthOpen && (
        <AdminAuthModal
          isOpen={isAdminAuthOpen}
          onClose={() => setIsAdminAuthOpen(false)}
          onLoginSuccess={() => {
            setIsAdminAuthOpen(false);
            setAppMode('admin');
            
          }}
        />
      )}

      {/* Backup & Sync Modal */}
      <BackupSyncModal
        isOpen={isBackupSyncModalOpen}
        onClose={() => setIsBackupSyncModalOpen(false)}
        notes={notes}
        userId={user.uid}
        userEmail={user.email || ''}
        onRestoreNotes={(restoredNotes) => {
          setNotes(restoredNotes);
          saveAllNotes(restoredNotes, user.uid);
          if (restoredNotes.length > 0) {
            setActiveNoteId(restoredNotes[0].id);
          }
        }}
        isOnline={isOnline}
        lastSyncedTime={lastSyncedTime}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={setAutoSyncEnabled}
        isInstallable={isInstallable}
        onInstallApp={installApp}
      />

      {/* iOS PWA Instruction Modal */}
      <IOSInstallModal
        isOpen={showIOSInstruction}
        onClose={closeIOSInstruction}
      />

      {/* Sidebar Tree Navigation */}
      <NoteTreeSidebar
        tree={tree}
        allNotes={notes}
        activeNoteId={activeNoteId}
        activeNote={activeNote}
        onUpdateTasks={handleUpdateTasks}
        onUpdateAttachments={handleUpdateAttachments}
        onSelectNote={(id) => {
          setActiveNoteId(id);
          setIsMobileSidebarOpen(false);
        }}
        onCreateRootNote={handleCreateRootNote}
        onCreateSubNote={handleCreateSubNote}
        onCreateNewList={handleCreateNewList}
        onReorderNotes={handleReorderNotes}
        onMoveNoteDirection={handleMoveNoteDirection}
        onRenameNote={handleRenameNote}
        onDuplicateNote={handleDuplicateNote}
        onMoveNoteClick={(id) => setMoveNoteId(id)}
        onTogglePin={handleTogglePin}
        onToggleFavorite={handleToggleFavorite}
        onToggleArchive={handleToggleArchive}
        onDeleteNote={handleDeleteNote}
        onRestoreNote={handleRestoreNote}
        onChangeColor={handleChangeColor}
        filterState={filterState}
        onUpdateFilter={(up) => setFilterState((prev) => ({ ...prev, ...up }))}
        allTags={allTags}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenAdmin={handleOpenAdminPortal}
        onOpenBackupSync={() => setIsBackupSyncModalOpen(true)}
        onOpenAppSettings={() => setIsAppSettingsModalOpen(true)}
        isInstallable={isInstallable}
        onInstallApp={installApp}
        viewMode={viewMode}
        onChangeViewMode={(mode) => setViewMode(mode)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onGoToHome={() => {
          setActiveListId(null);
          setActiveNoteId(null);
          setIsMobileSidebarOpen(false);
        }}
      />

      {/* Main App Workspace */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-white dark:bg-slate-900">
        {/* Top Navigation & Actions Header - Divided into Two Bars (شريطين علويين) */}
        <header className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 shadow-2xs select-none relative z-30 flex flex-col">
          {/* Bar 1: Main Navigation & Breadcrumb & Note Actions (الشريط العلوي الأول: التنقل والمسار وإجراءات الملاحظة) */}
          <div className="px-2.5 py-1.5 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-1.5 min-h-[44px] overflow-x-auto no-scrollbar">
            {/* Right section: زر Library (≡) بحجم كبير + Breadcrumb Path */}
            <div className="flex items-center gap-2 shrink-0">
              {/* زر Library بشعار ≡ بحجم أكبر وواضح */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center text-lg font-black leading-none select-none shrink-0"
                title="فتح شجرة Library (≡)"
                aria-label="Library"
              >
                ≡
              </button>

              {/* Breadcrumb Path navigation if active note exists */}
              {activeNote && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeNote.parentId) {
                        setActiveNoteId(activeNote.parentId);
                      } else {
                        setActiveNoteId(null);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    title="الرجوع للخلف"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>الرجوع</span>
                  </button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />
                  <nav aria-label="Breadcrumb" className="flex items-center gap-1">
                    {breadcrumbItems.map((item, idx) => {
                      const isLast = idx === breadcrumbItems.length - 1;
                      return (
                        <React.Fragment key={item.id}>
                          {idx > 0 && (
                            <ChevronLeft className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0 rotate-180" />
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveNoteId(item.id)}
                            className={`max-w-[100px] sm:max-w-[160px] truncate px-1.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                              isLast
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={item.title}
                          >
                            {item.title || 'ملاحظة بدون عنوان'}
                          </button>
                        </React.Fragment>
                      );
                    })}
                    {activeNote.depth > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                        عمق {activeNote.depth}
                      </span>
                    )}
                  </nav>
                </div>
              )}
            </div>

            {/* Header Install Button (if not installed) */}
            {!isStandalone && (
              <button
                type="button"
                onClick={async () => {
                  const result = await installApp();
                  if (result === 'unavailable' || result === 'error') {
                    alert('يتعذر تثبيت التطبيق تلقائياً من هذا الزر. يرجى تثبيته يدوياً من قائمة المتصفح (Add to Home Screen).');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                title="تثبيت التطبيق على الجهاز"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تثبيت التطبيق</span>
              </button>
            )}

            {/* Left section: Quick Note Actions (التثبيت والمفضلة) */}
            {activeNote && (
              <div className="flex items-center gap-1 shrink-0">
                {/* 1. Pin Button (زر التثبيت) */}
                <button
                  type="button"
                  onClick={() => handleTogglePin(activeNote.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeNote.isPinned
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={activeNote.isPinned ? 'إلغاء التثبيت' : 'تثبيت الملاحظة'}
                >
                  <Pin className={`w-4 h-4 ${activeNote.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>

                {/* 2. Favorite / Star Button (زر النجمة / المفضلة) */}
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(activeNote.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeNote.isFavorite
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={activeNote.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                >
                  <Star className={`w-4 h-4 ${activeNote.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* Bar 2: Secondary Controls & Formatting Strip (الشريط العلوي الثاني: شريط أدوات التنسيق والتحكم) */}
          {activeNote && (
            <div className="px-2.5 py-1 bg-white/70 dark:bg-slate-900/70 flex items-center justify-between gap-2 text-xs min-h-[38px] overflow-x-auto no-scrollbar">
              {/* Right side: زر ملاحظات فرعية */}
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                {/* زر ملاحظات فرعية (موجود في العمود/الشريط رقم ٢) */}
                <button
                  type="button"
                  onClick={() => setIsSubNotesMenuOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shrink-0"
                  title="الملاحظات الفرعية"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ملاحظات فرعية</span>
                  {activeChildNotes.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-800/90 text-blue-100 font-bold leading-none">
                      {activeChildNotes.length}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Toolbar toggle button */}
                <button
                  type="button"
                  onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                    isToolbarOpen
                      ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="إظهار / إخفاء شريط أدوات التنسيق"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{isToolbarOpen ? 'إخفاء أدوات التنسيق' : 'إظهار أدوات التنسيق'}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isToolbarOpen ? 'bg-emerald-300' : 'bg-slate-400'}`} />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Workspace Body */}
        {!activeNote ? (
          <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto w-full">
            <div className="w-full max-w-4xl mx-auto flex flex-col">
              <DynamicFilterBar 
                filters={getActiveFilters()} 
                activeFilters={activeUIFilters} 
                onFilterChange={(field, val) => setActiveUIFilters(prev => ({...prev, [field]: val}))} 
                onClearFilters={() => setActiveUIFilters({})} 
              />
              {/* List Breadcrumbs Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 text-xs select-none no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setActiveListId(null);
                    setActiveNoteId(null);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeListId === null
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>🏠 الرئيسية</span>
                </button>

                {listBreadcrumbs.map((bc, idx) => {
                  const isLast = idx === listBreadcrumbs.length - 1;
                  return (
                    <React.Fragment key={bc.id}>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400 rotate-180 shrink-0" />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveListId(bc.id);
                          setActiveNoteId(null);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold truncate max-w-[140px] sm:max-w-[200px] transition-colors cursor-pointer ${
                          isLast
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={bc.name}
                      >
                        <span className="shrink-0">{bc.icon}</span>
                        <span className="truncate">{bc.name}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Dynamic UI Filters Bar */}
              <DynamicFilterBar 
                filters={getActiveFilters()} 
                activeFilters={activeUIFilters} 
                onFilterChange={(field, val) => setActiveUIFilters(prev => ({...prev, [field]: val}))} 
                onClearFilters={() => setActiveUIFilters({})} 
              />

              {/* Header / Active List Banner */}
              {activeListId ? (
                (() => {
                  const currentList = lists.find((l) => l.id === activeListId);
                  if (!currentList) return null;
                  const listColorPreset = COLOR_PRESETS.find((c) => c.id === currentList.color) || COLOR_PRESETS[0];
                  const childLists = lists.filter((l) => l.parentId === activeListId).sort((a, b) => a.sortOrder - b.sortOrder);
                  const listNotes = tree.filter((n) => n.listId === activeListId);
                  const directNotesCount = notes.filter((n) => n.listId === activeListId && !n.isDeleted).length;

                  return (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                      {/* Current List Banner Card */}
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs shrink-0 ${listColorPreset.bgClass}`}>
                            {currentList.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                                {currentList.name}
                              </h2>
                              {currentList.depth > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                  مستوى {currentList.depth}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                              <span>📁 {childLists.length} مجلدات فرعية</span>
                              <span>•</span>
                              <span>📝 {directNotesCount} ملاحظات</span>
                            </p>
                          </div>
                        </div>

                        {/* Top Action Buttons inside List Banner */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setModalParentListId(currentList.id);
                              setIsCreateListModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-xs transition-all"
                            title="إضافة مجلد/قائمة فرعية تابعة"
                          >
                            <FolderPlus className="w-4 h-4" />
                            <span>مجلد فرعي</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCreateRootNote}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs shadow-blue-500/20 transition-all"
                            title="إضافة ملاحظة جديدة داخل هذا المجلد"
                          >
                            <Plus className="w-4 h-4" />
                            <span>ملاحظة جديدة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteList(currentList.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="حذف هذا المجلد والمجلدات التابعة له"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Section 1: Sub-Lists / Nested Folders */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4 text-slate-500" />
                            <h3 className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              المجلدات والقوائم الفرعية ({childLists.length})
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setModalParentListId(currentList.id);
                              setIsCreateListModalOpen(true);
                            }}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة مجلد فرعي</span>
                          </button>
                        </div>

                        {childLists.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {childLists.map((child) => {
                              const childColor = COLOR_PRESETS.find((c) => c.id === child.color) || COLOR_PRESETS[0];
                              const childSubCount = lists.filter((l) => l.parentId === child.id).length;
                              const childNotesCount = notes.filter((n) => n.listId === child.id && !n.isDeleted).length;

                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveListId(child.id);
                                    setActiveNoteId(null);
                                  }}
                                  className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all text-right cursor-pointer group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${childColor.bgClass} group-hover:scale-105 transition-transform`}>
                                      {child.icon}
                                    </span>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                        {child.name}
                                      </h4>
                                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                        <span>📁 {childSubCount}</span>
                                        <span>•</span>
                                        <span>📝 {childNotesCount} ملاحظات</span>
                                      </div>
                                    </div>
                                  </div>
                                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 bg-white/40 dark:bg-slate-800/40">
                            لا توجد مجلدات فرعية تابعة. يمكنك إضافة مجلد فرعي لتنظيم متقدم.
                          </div>
                        )}
                      </div>

                      {/* Section 2: Notes inside this List */}
                      <div className="flex flex-col gap-3 mt-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <h3 className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              ملاحظات هذا المجلد ({directNotesCount})
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateRootNote}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ملاحظة جديدة</span>
                          </button>
                        </div>

                        {listNotes.length === 0 ? (
                          <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center mb-3">
                              <FileText className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              لا توجد ملاحظات في مجلد "{currentList.name}"
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mb-4">
                              أنشئ ملاحظتك الأولى داخل هذا المجلد أو استخدم زر (+) بالأسفل.
                            </p>
                            <button
                              type="button"
                              onClick={handleCreateRootNote}
                              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 cursor-pointer"
                            >
                              + إنشاء ملاحظة جديدة الآن
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-xs">
                            {listNotes.map((node) => (
                              <NoteAccordionItem
                                key={node.id}
                                node={node}
                                onSelect={(noteId) => {
                                  setActiveListId(currentList.id);
                                  setActiveNoteId(noteId);
                                }}
                                onTogglePin={handleTogglePin}
                                onToggleFavorite={handleToggleFavorite}
                                onRename={handleRenameNote}
                                onDelete={(id) => handleDeleteNote(id)}
                                onCreateSubNote={handleCreateSubNote}
                                onDuplicateNote={handleDuplicateNote}
                                onMoveNoteClick={(id) => setMoveNoteId(id)}
                                onMoveNoteDirection={handleMoveNoteDirection}
                                onToggleArchive={handleToggleArchive}
                                onChangeColor={handleChangeColor}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Home View: Root Folders and Lists Overview */
                <div className="flex flex-col gap-6">
                  {/* Dynamic Custom UI Elements for Dashboard */}
                  {getElementsByLocation('main_workspace').length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                      {getElementsByLocation('main_workspace').map(el => (
                        <div 
                          key={el.id} 
                          className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          onClick={() => {
                            if (el.linkOrAction) {
                              try {
                                if (el.linkOrAction.startsWith('http')) window.open(el.linkOrAction, '_blank');
                                else console.log('Action triggered:', el.linkOrAction);
                              } catch(e) {}
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center text-indigo-500">
                               <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">{el.displayName}</h3>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">عنصر واجهة مخصص ومضاف ديناميكياً من مدير الواجهات (UI Builder).</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                        مرحباً بك، {userNameDisplay.split(' ')[0]} 👋
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
                        إدارة وتنظيم المجلدات والقوائم الشجرية العميقة. انقر على أي مجلد لفتحه واستعراض محتوياته.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setModalParentListId(null);
                        setIsCreateListModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-sm shadow-indigo-500/20 transition-all shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>قائمة رئيسية جديدة</span>
                    </button>
                  </div>

                  {/* Search Box in Lists Dashboard (صندوق البحث في القوائم والمجلدات الرئيسية) */}
                  {lists.length > 0 && (
                    <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 shadow-xs">
                      <div className="absolute right-4 text-slate-400 pointer-events-none flex items-center justify-center">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={listDashboardSearch}
                        onChange={(e) => setListDashboardSearch(e.target.value)}
                        placeholder="ابحث بالاسم في القوائم والمجلدات..."
                        className="w-full pr-11 pl-10 py-2.5 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden"
                      />
                      {listDashboardSearch && (
                        <button
                          type="button"
                          onClick={() => setListDashboardSearch('')}
                          className="absolute left-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="مسح البحث"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {lists.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-950/50 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                        <Folder className="w-10 h-10" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                        لا توجد مجلدات أو قوائم حالياً
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                        ابدأ بتنظيم بياناتك بنظام المجلدات والملفات الشجري عبر إنشاء أول قائمة رئيسية.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setModalParentListId(null);
                          setIsCreateListModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700 cursor-pointer"
                      >
                        + إنشاء أول قائمة رئيسية
                      </button>
                    </div>
                  ) : (() => {
                    const filteredLists = lists
                      .filter((l) => {
                        if (listDashboardSearch.trim()) {
                          const q = listDashboardSearch.toLowerCase().trim();
                          return l.name.toLowerCase().includes(q);
                        }
                        return !l.parentId;
                      })
                      .sort((a, b) => a.sortOrder - b.sortOrder);

                    if (filteredLists.length === 0) {
                      return (
                        <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mb-3">
                            <Search className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            لم يتم العثور على أي قائمة تطابق "{listDashboardSearch}"
                          </p>
                          <button
                            type="button"
                            onClick={() => setListDashboardSearch('')}
                            className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                          >
                            مسح البحث وعرض كافة القوائم
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-3">
                        {listDashboardSearch.trim() && (
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
                            <span>نتائج البحث في القوائم ({filteredLists.length})</span>
                            <button
                              type="button"
                              onClick={() => setListDashboardSearch('')}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              إلغاء التصفية
                            </button>
                          </div>
                        )}
                        {filteredLists.map((list) => {
                          const listColorPreset = COLOR_PRESETS.find((c) => c.id === list.color) || COLOR_PRESETS[0];
                          const listTree = tree.filter((n) => n.listId === list.id);
                          const directNoteCount = notes.filter((n) => n.listId === list.id && !n.isDeleted).length;
                          const childLists = lists.filter((l) => l.parentId === list.id);

                          return (
                            <div
                              key={list.id}
                              className={`flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-visible transition-all duration-200 ${contextMenuListId === list.id ? 'relative z-30' : 'relative z-10'}`}
                            >
                              {/* ListTile Header */}
                              <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-750/70 transition-colors">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveListId(list.id);
                                    setActiveNoteId(null);
                                  }}
                                  className="flex items-center gap-3.5 text-right flex-1 min-w-0 cursor-pointer"
                                >
                                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-xs shrink-0 ${listColorPreset.bgClass}`}>
                                    {list.icon}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                        {list.name}
                                      </h3>
                                      {list.parentId && (
                                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                                          قائمة فرعية
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      <span>📁 {childLists.length} مجلدات فرعية</span>
                                      <span>•</span>
                                      <span>📝 {directNoteCount} ملاحظات</span>
                                    </div>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2 shrink-0 relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveListId(list.id);
                                      setActiveNoteId(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 text-xs font-bold cursor-pointer transition-colors"
                                  >
                                    فتح المجلد ←
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setContextMenuListId(contextMenuListId === list.id ? null : list.id);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    title="خيارات القائمة"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {contextMenuListId === list.id && (
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
                                        className="absolute left-0 top-full mt-2 z-50 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-slate-700 dark:text-slate-200 text-xs animate-in fade-in zoom-in-95"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newName = window.prompt('تعديل اسم القائمة:', list.name);
                                            if (newName && newName.trim()) handleRenameList(list.id, newName.trim());
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                                        >
                                          <FileText className="w-4 h-4 text-slate-500" />
                                          <span>إعادة تسمية</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleDuplicateList(list.id);
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                                        >
                                          <Copy className="w-4 h-4 text-slate-500" />
                                          <span>تكرار القائمة والشجرة</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setModalParentListId(list.parentId || null);
                                            // Handle move logic via a modal or direct (not implemented fully for lists)
                                            alert("ميزة نقل المجلدات قيد التطوير!");
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                                        >
                                          <Move className="w-4 h-4 text-slate-500" />
                                          <span>نقل لقائمة أخرى</span>
                                        </button>

                                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                          تبديل الترتيب
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleMoveListDirection(list.id, 'up');
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium"
                                        >
                                          <ArrowUp className="w-4 h-4" />
                                          <span>نقل للأعلى (Move Up)</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleMoveListDirection(list.id, 'down');
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium"
                                        >
                                          <ArrowDown className="w-4 h-4" />
                                          <span>نقل للأسفل (Move Down)</span>
                                        </button>

                                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleToggleListPin(list.id);
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                                        >
                                          <Pin className="w-4 h-4 text-amber-500" />
                                          <span>{list.isPinned ? 'إلغاء التثبيت' : 'تثبيت بالقمة'}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleToggleListFavorite(list.id);
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                                        >
                                          <Star className="w-4 h-4 text-rose-500" />
                                          <span>{list.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleToggleListArchive(list.id);
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-right cursor-pointer"
                                        >
                                          <Archive className="w-4 h-4 text-slate-500" />
                                          <span>{list.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}</span>
                                        </button>

                                        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">
                                          <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">تصنيف بالألوان:</span>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            {COLOR_PRESETS.map((c) => (
                                              <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                  handleChangeListColor(list.id, c.id);
                                                  setContextMenuListId(null);
                                                }}
                                                className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer hover:scale-110 transition-transform"
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
                                            handleDeleteList(list.id);
                                            setContextMenuListId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-right cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>نقل إلى سلة المهملات</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Split view vs Single Editor */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 flex flex-col h-full min-w-0">
                <RichTextEditor
                  note={activeNote}
                  onChangeContent={handleUpdateNoteContent}
                  onChangeTitle={handleUpdateNoteTitle}
                  viewMode={viewMode}
                  isToolbarOpen={isToolbarOpen}
                  onToggleToolbar={() => setIsToolbarOpen(!isToolbarOpen)}
                />
              </div>

              {/* Split Mode Rendered Preview Panel */}
              {viewMode === 'split' && (
                <div className="w-full md:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    المعاينة المباشرة (Live Preview):
                  </h3>
                  <h1 className="text-2xl font-bold mb-4">{activeNote.title}</h1>
                  <div
                    dangerouslySetInnerHTML={{ __html: activeNote.content }}
                    className="prose dark:prose-invert max-w-none text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. Fixed Bottom Navigation Bar (شريط التنقل والإجراءات السفلي) */}
        <BottomNavBar
          notes={notes}
          tree={tree}
          activeNoteId={activeNoteId}
          activeNote={activeNote}
          lists={lists}
          activeListId={activeListId}
          onSelectNote={setActiveNoteId}
          onSelectList={(id) => {
            setActiveListId(id);
            setActiveNoteId(null);
          }}
          onCreateRootNote={handleCreateRootNote}
          onCreateSubNote={handleCreateSubNote}
          onCreateNewList={handleCreateNewList}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenUserDrawer={() => setIsUserDrawerOpen(true)}
          isToolbarOpen={isToolbarOpen}
          onToggleToolbar={() => setIsToolbarOpen(!isToolbarOpen)}
          onRenameNote={handleRenameNote}
          onDuplicateNote={handleDuplicateNote}
          onMoveNoteClick={(id) => setMoveNoteId(id)}
          onMoveNoteDirection={handleMoveNoteDirection}
          onTogglePin={handleTogglePin}
          onToggleFavorite={handleToggleFavorite}
          onToggleArchive={handleToggleArchive}
          onChangeColor={handleChangeColor}
          onDeleteNote={(id) => handleDeleteNote(id, false)}
          onRenameList={handleRenameList}
          onDuplicateList={handleDuplicateList}
          onMoveListDirection={handleMoveListDirection}
          onToggleListPin={handleToggleListPin}
          onToggleListFavorite={handleToggleListFavorite}
          onToggleListArchive={handleToggleListArchive}
          onChangeListColor={handleChangeListColor}
          onDeleteList={handleDeleteList}
        />
      </main>

      {/* Global Modals & Notifications */}
      <OTANotificationToast
        hasUpdate={hasOTAUpdate}
        updateManifest={updateManifest}
        onApplyUpdate={handleApplyOTAUpdate}
        onOpenModal={() => setIsOTAModalOpen(true)}
        onDismiss={() => {}}
        showRollbackNotice={showRollbackNotice}
        onDismissRollback={dismissRollbackNotice}
        isUpdating={isApplyingOTA}
      />

      {/* Navigation Drawer for User Profile & Settings (القائمة الجانبية المنزلقة) */}
      <UserNavigationDrawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        lists={lists}
        notes={notes}
        activeListId={activeListId}
        activeNoteId={activeNoteId}
        onSelectList={(id) => {
          setActiveListId(id);
          setActiveNoteId(null);
        }}
        onSelectNote={(noteId, listId) => {
          setActiveListId(listId);
          setActiveNoteId(noteId);
        }}
        onOpenCreateListModal={(parentId) => {
          setModalParentListId(parentId || null);
          setIsCreateListModalOpen(true);
        }}
        onOpenSettings={() => setIsAppSettingsModalOpen(true)}
        onOpenBackupSync={() => setIsBackupSyncModalOpen(true)}
        onOpenOTAUpdate={() => setIsOTAModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenPrivacyPolicy={() => setIsPrivacyPolicyModalOpen(true)}
        onOpenAdmin={handleOpenAdminPortal}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isOnline={isOnline}
        lastSyncedTime={lastSyncedTime}
        currentVersion={currentVersion}
        hasOTAUpdate={hasOTAUpdate}
        isInstallable={isInstallable}
        onInstallApp={() => setIsInstallModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onLogout={logout}
      />

      <AppSettingsModal
        isOpen={isAppSettingsModalOpen}
        onClose={() => setIsAppSettingsModalOpen(false)}
        onOpenBackupSync={() => setIsBackupSyncModalOpen(true)}
        onOpenOTAUpdate={() => setIsOTAModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenPrivacyPolicy={() => setIsPrivacyPolicyModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={setAutoSyncEnabled}
        isOnline={isOnline}
        lastSyncedTime={lastSyncedTime}
        currentVersion={currentVersion}
        hasOTAUpdate={hasOTAUpdate}
        isInstallable={isInstallable}
        onInstallApp={() => setIsInstallModalOpen(true)}
        userNameDisplay={userNameDisplay}
        userEmail={userProfile?.email || user?.email || 'user@notes.local'}
        onLogout={logout}
      />

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onNativeInstall={installApp}
        hasNativePrompt={hasDeferredPrompt}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyPolicyModalOpen}
        onClose={() => setIsPrivacyPolicyModalOpen(false)}
      />

      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => setIsCreateListModalOpen(false)}
        onCreateList={handleCreateNewList}
        allLists={lists}
        defaultParentId={modalParentListId}
        parentList={lists.find((l) => l.id === modalParentListId) || null}
      />

      <OTAUpdateModal
        isOpen={isOTAModalOpen}
        onClose={() => setIsOTAModalOpen(false)}
        currentVersion={currentVersion}
        isChecking={isCheckingOTA}
        hasUpdate={hasOTAUpdate}
        updateManifest={updateManifest}
        lastCheckedTime={otaLastCheckedTime}
        onCheckForUpdates={() => handleCheckOTAUpdates(false)}
        onApplyUpdate={handleApplyOTAUpdate}
        onRollback={handleRollbackOTA}
        isUpdating={isApplyingOTA}
      />

      <MoveNoteModal
        isOpen={!!moveNoteId}
        onClose={() => setMoveNoteId(null)}
        noteToMoveId={moveNoteId}
        tree={tree}
        allNotes={notes}
        onConfirmMove={handleConfirmMove}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Sub Notes Overlay Modal (يفتح في الخارج ويغطي الواجهة بوضوح تام) */}
      {isSubNotesMenuOpen && activeNote && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsSubNotesMenuOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-850 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-5 animate-in zoom-in-95 duration-150 relative z-50 text-right"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    الملاحظات الفرعية
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-extrabold">
                      {activeChildNotes.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate max-w-[240px]">
                    الملاحظة الحالية: {activeNote.title || 'ملاحظة بدون عنوان'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    handleCreateSubNote(activeNote.id);
                    setIsSubNotesMenuOpen(false);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-blue-200 dark:border-blue-800"
                  title="إضافة ملاحظة فرعية جديدة"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubNotesMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Subnotes List */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  قائمة الملاحظات التابعة ({activeChildNotes.length}):
                </span>
                {activeChildNotes.length > 0 && (
                  <span className="text-[10px] text-slate-400">انقر لفتح الملاحظة</span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                {activeChildNotes.length > 0 ? (
                  activeChildNotes.map((cn) => (
                    <button
                      key={cn.id}
                      type="button"
                      onClick={() => {
                        setActiveNoteId(cn.id);
                        setIsSubNotesMenuOpen(false);
                      }}
                      className="w-full text-right p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-pointer group hover:border-blue-300 dark:hover:border-blue-800"
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1">
                        <span className="text-base shrink-0">{cn.icon || '📄'}</span>
                        <div className="truncate">
                          <p className="truncate font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {cn.title || 'ملاحظة فرعية بدون عنوان'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {cn.content ? cn.content.slice(0, 40) : 'ملاحظة فارغة'}
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:-translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-7 px-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                    <Folder className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">لا توجد ملاحظات فرعية حالياً</p>
                    <p className="text-[11px] text-slate-400 mt-1 mb-4">يمكنك إنشاء ملاحظة فرعية تابعة لهذه الملاحظة لترتيب أفكارك.</p>
                    <button
                      type="button"
                      onClick={() => {
                        handleCreateSubNote(activeNote.id);
                        setIsSubNotesMenuOpen(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm mx-auto flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      إنشاء ملاحظة فرعية
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official App Launch Splash Screen */}
      <SplashScreen minDuration={1000} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotesApp />
    </AuthProvider>
  );
}
