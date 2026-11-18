import React, { useState, useEffect } from 'react';
import { BookOpen, RefreshCw, CheckCircle2, ShieldCheck, Eye, EyeOff, Layers, FileText, ArrowRight, Zap } from 'lucide-react';
import { loadAllNotes, loadAllLists, saveAllLists } from '../../../services/storage';
import { publishEntireLibraryToBot, getBotLibraryStats, publishListToBot } from '../../../services/libraryPublisher';
import { ListCategory, Note } from '../../../types';

export const BotLibrarySyncTab: React.FC = () => {
  const [stats, setStats] = useState<{ listsCount: number; notesCount: number; lastPublishedAt: string | null } | null>(null);
  const [lists, setLists] = useState<ListCategory[]>(() => loadAllLists());
  const [notes, setNotes] = useState<Note[]>(() => loadAllNotes());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    const data = await getBotLibraryStats();
    if (data?.stats) setStats(data.stats);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const currentNotes = loadAllNotes();
      const currentLists = loadAllLists();
      const res = await publishEntireLibraryToBot(currentLists, currentNotes);
      if (res?.success) {
        setStats(res.stats);
        setStatusMsg('تم نشر ومزامنة كافة الكتب والملاحظات بنجاح إلى مركز المعرفة الخاص بالبوت!');
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (err: any) {
      alert('فشلت المزامنة: ' + (err?.message || err));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleListVisibility = async (list: ListCategory) => {
    const newVisibility = list.bot_visible === false ? true : false;
    const updated = lists.map((l) => (l.id === list.id ? { ...l, bot_visible: newVisibility } : l));
    setLists(updated);
    saveAllLists(updated);

    await publishListToBot({ ...list, bot_visible: newVisibility });
    fetchStats();
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span>مزامنة ونشر المكتبة للبوت (Books &amp; Notes → Bot Live Sync)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ربط فوري بين كتب وملاحظات لوحة الإدارة ومحرك إجابات البوت العام مع خيار تحديد القوائم المرئية للبوت.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-base font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث الحالة</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>الكتب والقوائم المنشورة للبوت</span>
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats?.listsCount ?? '...'}
          </div>
          <span className="text-xs text-slate-500">من أصل {lists.length} قائمة محلية</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>الملاحظات المفهرسة والمتاحة للبحث</span>
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats?.notesCount ?? '...'}
          </div>
          <span className="text-xs text-slate-500">من أصل {notes.filter((n) => !n.isDeleted).length} ملاحظة نشطة</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>آخر تاريخ نشر مكتمل</span>
          </span>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 pt-1">
            {stats?.lastPublishedAt ? new Date(stats.lastPublishedAt).toLocaleString('ar-EG') : 'لم تنشر بعد'}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">مزامنة فورية عند كل حفظ (Publish-on-Save)</span>
        </div>
      </div>

      {/* Sync All Action Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl text-white shadow-xl shadow-indigo-600/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-right">
          <h3 className="text-base md:text-lg font-black">نشر ومزامنة كافة الكتب والملاحظات دفعة واحدة</h3>
          <p className="text-sm text-indigo-100 font-medium">
            يقوم بإرسال وتحديث كافة الملاحظات والقوائم الموجودة في التطبيق لتكون مرجعاً مباشراً للبوت في ثوانٍ معدودة.
          </p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="px-7 py-3.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-base rounded-2xl shadow-lg transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-2.5 active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'جاري النشر والمزامنة...' : 'نشر المكتبة كاملة للبوت الآن'}</span>
        </button>
      </div>

      {/* Lists Visibility Manager */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
            التحكم في خصوصية وظهور القوائم والكتب للبوت (Bot Visibility)
          </h4>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            القوائم المحددة كـ «مرئية للبوت» سيقرأ محتواها محرك الإجابة، أما القوائم المخفية فلن تظهر مطلقاً في ردود البوت.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {lists.map((list) => {
            const isVisible = list.bot_visible !== false;
            const count = notes.filter((n) => n.listId === list.id && !n.isDeleted).length;
            return (
              <div key={list.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base shadow-xs"
                    style={{ backgroundColor: `${list.color || '#6366f1'}20`, color: list.color || '#6366f1' }}
                  >
                    {list.icon || '📁'}
                  </div>
                  <div>
                    <h5 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">{list.name}</h5>
                    <span className="text-xs text-slate-400">{count} ملاحظة تابعة</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleListVisibility(list)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm md:text-base font-bold transition-colors cursor-pointer ${
                    isVisible
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>{isVisible ? 'مرئي للبوت' : 'مخفي عن البوت'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
