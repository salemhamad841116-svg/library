import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Note, ListCategory } from '../types';
import { getAppEnvironment } from './environment';

// Unique device identifier to distinguish update sources and prevent infinite loop writes
export const DEVICE_ID = (() => {
  if (typeof window === 'undefined') return 'server_device';
  let id = localStorage.getItem('app_device_id');
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('app_device_id', id);
  }
  return id;
})();

/**
 * Get target collection reference for user account according to Environment (Staging vs Production)
 */
function getCollectionRef(userId?: string) {
  const uid = userId || auth.currentUser?.uid;
  const env = getAppEnvironment();
  
  if (uid) {
    // Production uses isolated 'user_notes', Staging uses 'staging_notes'
    return collection(db, 'users', uid, env.dbCollection);
  }
  return collection(db, env.isProduction ? 'notes' : 'dev_notes');
}

function getListsCollectionRef(userId?: string) {
  const uid = userId || auth.currentUser?.uid;
  const env = getAppEnvironment();
  
  if (uid) {
    return collection(db, 'users', uid, env.isProduction ? 'user_lists' : 'staging_lists');
  }
  return collection(db, env.isProduction ? 'lists' : 'dev_lists');
}

export function mergeListsWithTimestampResolution(localLists: ListCategory[], remoteLists: ListCategory[]): ListCategory[] {
  if (!remoteLists || remoteLists.length === 0) return localLists || [];
  if (!localLists || localLists.length === 0) return remoteLists || [];

  const map = new Map<string, ListCategory>();

  remoteLists.forEach((rl) => {
    map.set(rl.id, rl);
  });

  localLists.forEach((ll) => {
    const existing = map.get(ll.id);
    if (!existing) {
      map.set(ll.id, ll);
    } else {
      const localTime = new Date(ll.updatedAt || 0).getTime();
      const remoteTime = new Date(existing.updatedAt || 0).getTime();
      if (localTime > remoteTime) {
        map.set(ll.id, ll);
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Helper to convert raw Firestore list document into ListCategory
 */
function parseListDoc(docId: string, data: any): ListCategory {
  let name = data.name || 'قائمة';
  let icon = data.icon || '📋';
  let color = data.color || 'slate';

  // If old encrypted payload existed, try base64 decode if plain JSON
  if (data.isEncrypted && data.encryptedPayload) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(data.encryptedPayload))));
      if (decoded.name) name = decoded.name;
      if (decoded.icon) icon = decoded.icon;
      if (decoded.color) color = decoded.color;
    } catch {
      // Keep defaults
    }
  }

  return {
    id: data.id || docId,
    userId: data.userId || 'guest_user',
    name,
    icon,
    color,
    parentId: data.parentId || null,
    depth: typeof data.depth === 'number' ? data.depth : 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
  };
}

export async function loadListsFromFirestoreAsync(userId?: string): Promise<ListCategory[] | null> {
  try {
    const colRef = getListsCollectionRef(userId);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return null;
    }
    const lists: ListCategory[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      lists.push(parseListDoc(docSnap.id, data));
    }
    return lists;
  } catch (error) {
    console.warn('Failed to load lists from Firestore:', error);
    return null;
  }
}

export async function deleteListFromFirestore(listId: string, userId?: string): Promise<void> {
  try {
    const colRef = getListsCollectionRef(userId);
    const docRef = doc(colRef, listId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting list from Firestore:', error);
  }
}

export async function syncListToFirestore(list: ListCategory, userId?: string, isDelete = false): Promise<void> {
  try {
    const uid = userId || auth.currentUser?.uid || list.userId;
    const colRef = getListsCollectionRef(uid);
    const docRef = doc(colRef, list.id);

    if (isDelete) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        id: list.id,
        name: list.name,
        icon: list.icon,
        color: list.color,
        parentId: list.parentId || null,
        depth: typeof list.depth === 'number' ? list.depth : 0,
        sortOrder: typeof list.sortOrder === 'number' ? list.sortOrder : 0,
        createdAt: list.createdAt || new Date().toISOString(),
        updatedAt: list.updatedAt || new Date().toISOString(),
        userId: uid || list.userId || 'guest_user',
        lastUpdatedByDevice: DEVICE_ID,
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error syncing list to Firestore:', error);
  }
}

export async function syncAllListsToFirestore(lists: ListCategory[], userId?: string): Promise<void> {
  try {
    const uid = userId || auth.currentUser?.uid;
    const colRef = getListsCollectionRef(uid);

    const localIds = new Set((lists || []).map((l) => l.id));
    const remoteDocIdsToDelete: string[] = [];
    const remoteTimestamps = new Map<string, string>();

    try {
      const snapshot = await getDocs(colRef);
      snapshot.forEach((docSnap) => {
        if (!localIds.has(docSnap.id)) {
          remoteDocIdsToDelete.push(docSnap.id);
        } else {
          remoteTimestamps.set(docSnap.id, docSnap.data().updatedAt);
        }
      });

      for (const deleteId of remoteDocIdsToDelete) {
        await deleteDoc(doc(colRef, deleteId)).catch(() => {});
      }
    } catch {
      // If reading remote fails (offline mode), proceed with local lists sync
    }

    if (!lists || lists.length === 0) return;

    const listsToSync = lists.filter((l) => {
      const remoteTime = remoteTimestamps.get(l.id);
      if (!remoteTime) return true; // New list
      return new Date(l.updatedAt || 0).getTime() > new Date(remoteTime).getTime();
    });

    if (listsToSync.length === 0) return;

    const CHUNK_SIZE = 450;
    
    for (let i = 0; i < listsToSync.length; i += CHUNK_SIZE) {
      const chunk = listsToSync.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((list) => {
        const docRef = doc(colRef, list.id);
        batch.set(docRef, {
          id: list.id,
          name: list.name,
          icon: list.icon,
          color: list.color,
          parentId: list.parentId || null,
          depth: typeof list.depth === 'number' ? list.depth : 0,
          sortOrder: typeof list.sortOrder === 'number' ? list.sortOrder : 0,
          createdAt: list.createdAt || new Date().toISOString(),
          updatedAt: list.updatedAt || new Date().toISOString(),
          userId: uid || list.userId || 'guest_user',
          lastUpdatedByDevice: DEVICE_ID,
        }, { merge: true });
      });

      await batch.commit().catch((err) => {
        console.warn('Batch commit lists offline warning:', err);
      });
    }
  } catch (error) {
    console.warn('Sync all lists to Firestore error (offline fallback active):', error);
  }
}

export function startListsRealtimeSync(
  onListsReceived: (lists: ListCategory[], senderDeviceId: string) => void,
  userId?: string
): () => void {
  const colRef = getListsCollectionRef(userId);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      let senderDevice = '';
      const lists: ListCategory[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lastUpdatedByDevice) {
          senderDevice = data.lastUpdatedByDevice;
        }
        lists.push(parseListDoc(docSnap.id, data));
      });

      onListsReceived(lists, senderDevice);
    },
    (error) => {
      console.warn('Firestore real-time lists sync snapshot error:', error);
    }
  );

  return unsubscribe;
}

/**
 * Merge local and remote notes based on updatedAt timestamps for conflict resolution
 */
export function mergeNotesWithTimestampResolution(localNotes: Note[], remoteNotes: Note[]): Note[] {
  if (!remoteNotes || remoteNotes.length === 0) return localNotes || [];
  if (!localNotes || localNotes.length === 0) return remoteNotes || [];

  const map = new Map<string, Note>();

  // Populate remote notes first
  remoteNotes.forEach((rn) => {
    map.set(rn.id, rn);
  });

  // Merge local notes
  localNotes.forEach((ln) => {
    const existing = map.get(ln.id);
    if (!existing) {
      map.set(ln.id, ln);
    } else {
      const localTime = new Date(ln.updatedAt || 0).getTime();
      const remoteTime = new Date(existing.updatedAt || 0).getTime();
      if (localTime > remoteTime) {
        map.set(ln.id, ln);
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Helper to convert raw Firestore note document into unencrypted Note
 */
function parseNoteDoc(docId: string, data: any): Note {
  let title = data.title || 'ملاحظة';
  let content = data.content || '';
  let tasks = data.tasks || [];
  let attachments = data.attachments || [];
  let tags = data.tags || [];
  let icon = data.icon || '📄';
  let coverImage = data.coverImage || null;
  let wordCount = data.wordCount || 0;
  let characterCount = data.characterCount || 0;
  let readingTime = data.readingTime || 1;

  // If old encrypted payload existed, try base64 decode
  if (data.isEncrypted && data.encryptedPayload) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(data.encryptedPayload))));
      if (decoded.title !== undefined) title = decoded.title;
      if (decoded.content !== undefined) content = decoded.content;
      if (decoded.tasks !== undefined) tasks = decoded.tasks;
      if (decoded.attachments !== undefined) attachments = decoded.attachments;
      if (decoded.tags !== undefined) tags = decoded.tags;
      if (decoded.icon !== undefined) icon = decoded.icon;
      if (decoded.coverImage !== undefined) coverImage = decoded.coverImage;
      if (decoded.wordCount !== undefined) wordCount = decoded.wordCount;
      if (decoded.characterCount !== undefined) characterCount = decoded.characterCount;
      if (decoded.readingTime !== undefined) readingTime = decoded.readingTime;
    } catch {
      // Keep current
    }
  }

  return {
    id: data.id || docId,
    userId: data.userId,
    listId: data.listId || null,
    parentId: data.parentId || null,
    path: data.path || `/${docId}`,
    depth: typeof data.depth === 'number' ? data.depth : 0,
    title,
    content,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    tags,
    color: data.color || 'blue',
    icon,
    isPinned: Boolean(data.isPinned),
    isFavorite: Boolean(data.isFavorite),
    isArchived: Boolean(data.isArchived),
    isDeleted: Boolean(data.isDeleted),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    childrenCount: typeof data.childrenCount === 'number' ? data.childrenCount : 0,
    tasks,
    attachments,
    coverImage,
    wordCount,
    characterCount,
    readingTime,
  };
}

/**
 * Fetch all notes from Firestore asynchronously (Direct unencrypted storage)
 */
export async function loadNotesFromFirestoreAsync(userId?: string): Promise<Note[] | null> {
  try {
    const colRef = getCollectionRef(userId);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return null;
    }
    const notes: Note[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      notes.push(parseNoteDoc(docSnap.id, data));
    }
    return notes;
  } catch (error) {
    console.warn('Failed to load notes from Firestore:', error);
    return null;
  }
}

/**
 * Delete a single note document from Firestore
 */
export async function deleteNoteFromFirestore(noteId: string, userId?: string): Promise<void> {
  try {
    const colRef = getCollectionRef(userId);
    const docRef = doc(colRef, noteId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting note from Firestore:', error);
  }
}

/**
 * Sync a single note update to Firestore directly in clear-text without encryption
 */
export async function syncNoteToFirestore(note: Note, userId?: string, isDelete = false): Promise<void> {
  try {
    const uid = userId || auth.currentUser?.uid || note.userId;
    const colRef = getCollectionRef(uid);
    const docRef = doc(colRef, note.id);

    if (isDelete) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        id: note.id,
        userId: uid || note.userId || 'guest_user',
        listId: note.listId || null,
        parentId: note.parentId || null,
        path: note.path || `/${note.id}`,
        depth: typeof note.depth === 'number' ? note.depth : 0,
        title: note.title || '',
        content: note.content || '',
        tags: note.tags || [],
        color: note.color || 'blue',
        icon: note.icon || '📄',
        isPinned: Boolean(note.isPinned),
        isFavorite: Boolean(note.isFavorite),
        isArchived: Boolean(note.isArchived),
        isDeleted: Boolean(note.isDeleted),
        sortOrder: typeof note.sortOrder === 'number' ? note.sortOrder : 0,
        childrenCount: typeof note.childrenCount === 'number' ? note.childrenCount : 0,
        tasks: note.tasks || [],
        attachments: note.attachments || [],
        coverImage: note.coverImage || null,
        wordCount: typeof note.wordCount === 'number' ? note.wordCount : 0,
        characterCount: typeof note.characterCount === 'number' ? note.characterCount : 0,
        readingTime: typeof note.readingTime === 'number' ? note.readingTime : 1,
        lastUpdatedByDevice: DEVICE_ID,
        updatedAt: note.updatedAt || new Date().toISOString(),
        createdAt: note.createdAt || new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error syncing note to Firestore:', error);
  }
}

/**
 * Sync all notes to Firestore in batch writes directly in clear-text without encryption
 */
export async function syncAllNotesToFirestore(notes: Note[], userId?: string): Promise<void> {
  try {
    const uid = userId || auth.currentUser?.uid;
    const colRef = getCollectionRef(uid);

    const localIds = new Set((notes || []).map((n) => n.id));
    const remoteDocIdsToDelete: string[] = [];
    const remoteTimestamps = new Map<string, string>();

    try {
      const snapshot = await getDocs(colRef);
      snapshot.forEach((docSnap) => {
        if (!localIds.has(docSnap.id)) {
          remoteDocIdsToDelete.push(docSnap.id);
        } else {
          remoteTimestamps.set(docSnap.id, docSnap.data().updatedAt);
        }
      });

      for (const deleteId of remoteDocIdsToDelete) {
        await deleteDoc(doc(colRef, deleteId)).catch(() => {});
      }
    } catch {
      // If reading remote fails (offline mode), proceed with local notes sync
    }

    if (!notes || notes.length === 0) return;

    // Filter notes that need syncing
    const notesToSync = notes.filter((n) => {
      const remoteTime = remoteTimestamps.get(n.id);
      if (!remoteTime) return true; // New note
      return new Date(n.updatedAt || 0).getTime() > new Date(remoteTime).getTime();
    });

    if (notesToSync.length === 0) return;

    // 3. Write plain unencrypted note documents to Firestore (chunked into 450 per batch)
    const CHUNK_SIZE = 450;
    
    for (let i = 0; i < notesToSync.length; i += CHUNK_SIZE) {
      const chunk = notesToSync.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((note) => {
        const docRef = doc(colRef, note.id);
        batch.set(docRef, {
          id: note.id,
          userId: uid || note.userId || 'guest_user',
          listId: note.listId || null,
          parentId: note.parentId || null,
          path: note.path || `/${note.id}`,
          depth: typeof note.depth === 'number' ? note.depth : 0,
          title: note.title || '',
          content: note.content || '',
          tags: note.tags || [],
          color: note.color || 'blue',
          icon: note.icon || '📄',
          isPinned: Boolean(note.isPinned),
          isFavorite: Boolean(note.isFavorite),
          isArchived: Boolean(note.isArchived),
          isDeleted: Boolean(note.isDeleted),
          sortOrder: typeof note.sortOrder === 'number' ? note.sortOrder : 0,
          childrenCount: typeof note.childrenCount === 'number' ? note.childrenCount : 0,
          tasks: note.tasks || [],
          attachments: note.attachments || [],
          coverImage: note.coverImage || null,
          wordCount: typeof note.wordCount === 'number' ? note.wordCount : 0,
          characterCount: typeof note.characterCount === 'number' ? note.characterCount : 0,
          readingTime: typeof note.readingTime === 'number' ? note.readingTime : 1,
          lastUpdatedByDevice: DEVICE_ID,
          updatedAt: note.updatedAt || new Date().toISOString(),
          createdAt: note.createdAt || new Date().toISOString(),
        }, { merge: true });
      });

      await batch.commit().catch((err) => {
        console.warn('Batch commit notes offline warning:', err);
      });
    }
  } catch (error) {
    console.warn('Sync all notes to Firestore error (offline fallback active):', error);
  }
}

/**
 * Start real-time sync with Firestore onSnapshot (Direct unencrypted listening)
 */
export function startRealtimeSync(
  onNotesReceived: (notes: Note[], senderDeviceId: string) => void,
  userId?: string
): () => void {
  const colRef = getCollectionRef(userId);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        // Pending local write, skip echo callback to prevent write loops
        return;
      }

      let senderDevice = '';
      const notes: Note[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lastUpdatedByDevice) {
          senderDevice = data.lastUpdatedByDevice;
        }
        notes.push(parseNoteDoc(docSnap.id, data));
      });

      onNotesReceived(notes, senderDevice);
    },
    (error) => {
      console.warn('Firestore real-time sync snapshot error:', error);
    }
  );

  return unsubscribe;
}
