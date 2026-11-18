/**
 * Real-time synchronization service for publishing Books & Notes to the Bot Knowledge Base.
 * Automatically called when notes/lists are created, updated, or deleted,
 * ensuring zero caching delay and immediate access for the public bot.
 */
import { Note, ListCategory } from '../types';

export async function publishNoteToBot(note: Note): Promise<void> {
  try {
    await fetch(`/api/library/notes/${encodeURIComponent(note.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        listId: note.listId,
        parentId: note.parentId,
        tags: note.tags,
        isPinned: note.isPinned,
        isArchived: note.isArchived,
        isDeleted: note.isDeleted,
        ownerUid: note.userId || 'admin',
      }),
    });
  } catch (err) {
    console.warn('Publish note to bot warning:', err);
  }
}

export async function deleteNoteFromBot(noteId: string): Promise<void> {
  try {
    await fetch(`/api/library/notes/${encodeURIComponent(noteId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Delete note from bot warning:', err);
  }
}

export async function publishListToBot(list: ListCategory): Promise<void> {
  try {
    await fetch(`/api/library/lists/${encodeURIComponent(list.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: list.name,
        icon: list.icon,
        color: list.color,
        parentId: list.parentId,
        sortOrder: list.sortOrder,
        isArchived: list.isArchived,
        bot_visible: list.bot_visible !== false,
        ownerUid: list.userId || 'admin',
      }),
    });
  } catch (err) {
    console.warn('Publish list to bot warning:', err);
  }
}

export async function deleteListFromBot(listId: string): Promise<void> {
  try {
    await fetch(`/api/library/lists/${encodeURIComponent(listId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Delete list from bot warning:', err);
  }
}

export async function publishEntireLibraryToBot(
  lists: ListCategory[],
  notes: Note[],
  ownerUid = 'admin'
): Promise<{ success: boolean; stats: { listsCount: number; notesCount: number; lastPublishedAt: string | null }; message?: string }> {
  const res = await fetch('/api/bot/admin/library/sync-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lists, notes, ownerUid }),
  });
  return res.json();
}

export async function getBotLibraryStats(): Promise<{ success: boolean; stats: { listsCount: number; notesCount: number; lastPublishedAt: string | null } }> {
  const res = await fetch('/api/bot/admin/library/stats');
  return res.json();
}
