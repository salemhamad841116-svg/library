import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Eye, 
  Download, 
  Tag, 
  User, 
  Clock, 
  Layers, 
  HardDrive, 
  CheckCircle2, 
  X,
  FileDown
} from 'lucide-react';
import { AdminNoteItem } from '../../types/admin';

interface AdminNotesTabProps {
  notes: AdminNoteItem[];
  onUpdateNotes: (notes: AdminNoteItem[]) => void;
}

export const AdminNotesTab: React.FC<AdminNotesTabProps> = ({
  notes,
  onUpdateNotes
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'deleted'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [previewNote, setPreviewNote] = useState<AdminNoteItem | null>(null);

  // Extract all unique tags across system notes
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  // Filtering Logic
  const filteredNotes = notes.filter((n) => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    const matchesTag = selectedTag === 'all' || n.tags.includes(selectedTag);
    return matchesSearch && matchesStatus && matchesTag;
  });

  // Action Handlers
  const handleArchiveNote = (noteId: string) => {
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        const nextStatus = n.status === 'archived' ? 'active' : 'archived';
        return { ...n, status: nextStatus as any };
      }
      return n;
    });
    onUpdateNotes(updated);
  };

  const handleSoftDeleteNote = (noteId: string) => {
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        const nextStatus = n.status === 'deleted' ? 'active' : 'deleted';
        return { ...n, status: nextStatus as any };
      }
      return n;
    });
    onUpdateNotes(updated);
  };

  const handlePermanentDelete = (noteId: string) => {
    if (window.confirm('هل أنت تأكد من الحذف النهائي لهذه الملاحظة من النظام بكافة محتوياتها؟')) {
      const updated = notes.filter((n) => n.id !== noteId);
      onUpdateNotes(updated);
    }
  };

  const handleExportNote = (note: AdminNoteItem) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(note, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `note-${note.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Search & Control Header */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            placeholder="بحث في عنوان الملاحظة أو صاحبها أو وسومها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">حالة الملاحظة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">الكل ({notes.length})</option>
              <option value="active">نشطة</option>
              <option value="archived">مؤرشفة</option>
              <option value="deleted">في سلة المهملات</option>
            </select>
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">الوسم:</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="all">جميع الوسوم</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Notes Table */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-3">عنوان الملاحظة</th>
                <th className="py-3 px-3">صاحب الملاحظة</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-3">الحجم / التفرعات</th>
                <th className="py-3 px-3">الوسوم</th>
                <th className="py-3 px-3">تاريخ الإنشاء / التعديل</th>
                <th className="py-3 px-3 text-center">الإجراءات الإدارية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Title & Preview */}
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100 max-w-[220px]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="truncate">{note.title}</span>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{note.ownerName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{note.ownerEmail}</div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      note.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : note.status === 'archived'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {note.status === 'active' ? 'نشطة' : note.status === 'archived' ? 'مؤرشفة' : 'في السلة'}
                    </span>
                  </td>

                  {/* Size & Children */}
                  <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    <div>{note.sizeKB} KB</div>
                    <div className="text-[10px] text-slate-400">{note.childrenCount} فرعية</div>
                  </td>

                  {/* Tags */}
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Dates */}
                  <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <div>إنشاء: {new Date(note.createdAt).toLocaleDateString('ar-SA')}</div>
                    <div className="text-slate-400">تعديل: {new Date(note.updatedAt).toLocaleDateString('ar-SA')}</div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Eye / Preview */}
                      <button
                        onClick={() => setPreviewNote(note)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="معاينة محتوى الملاحظة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Archive Toggle */}
                      <button
                        onClick={() => handleArchiveNote(note.id)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title={note.status === 'archived' ? 'إلغاء الأرشفة' : 'أرشفة الملاحظة'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      {/* Export */}
                      <button
                        onClick={() => handleExportNote(note)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="تصدير الملاحظة بصيغة JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Soft Delete / Restore */}
                      <button
                        onClick={() => handleSoftDeleteNote(note.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          note.status === 'deleted'
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        }`}
                        title={note.status === 'deleted' ? 'استعادة من سلة المهملات' : 'نقل إلى سلة المهملات'}
                      >
                        {note.status === 'deleted' ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>

                      {/* Permanent Delete */}
                      <button
                        onClick={() => handlePermanentDelete(note.id)}
                        className="p-1.5 text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                        title="حذف نهائي لا يمكن التراجع عنه"
                      >
                        <X className="w-3.5 h-3.5 font-bold" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Preview Modal */}
      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden select-none max-h-[85vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{previewNote.title}</h3>
                <p className="text-xs text-slate-300">المالك: {previewNote.ownerName} ({previewNote.ownerEmail})</p>
              </div>
              <button onClick={() => setPreviewNote(null)} className="p-2 text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="flex flex-wrap gap-2 text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span>تاريخ الإنشاء: <strong>{new Date(previewNote.createdAt).toLocaleString('ar-SA')}</strong></span>
                <span>•</span>
                <span>الحجم: <strong>{previewNote.sizeKB} KB</strong></span>
                <span>•</span>
                <span>الحالة: <strong className="uppercase">{previewNote.status}</strong></span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-slate-800 dark:text-slate-200 leading-relaxed font-sans min-h-[150px]">
                <div dangerouslySetInnerHTML={{ __html: previewNote.content }} />
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewNote(null)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-base cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
