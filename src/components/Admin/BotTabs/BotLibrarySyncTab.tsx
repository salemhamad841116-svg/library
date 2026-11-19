import React, { useState, useEffect } from 'react';
import { BookOpen, RefreshCw, CheckCircle2, ShieldCheck, Eye, EyeOff, Layers, FileText, ArrowRight, Zap, Database, AlertTriangle, Link as LinkIcon, Clock } from 'lucide-react';
import { loadAllNotes, loadAllLists, saveAllLists } from '../../../services/storage';
import { publishEntireLibraryToBot, getBotLibraryStats, publishListToBot } from '../../../services/libraryPublisher';
import { safeFetchJson, adminFetch } from '../../../admin/bot/lib/safeFetch';
import { ListCategory, Note } from '../../../types';

interface WaraqaSyncStatus {
  configured: boolean;
  dbPath: string | null;
  intervalMs: number;
  running: boolean;
  mode: 'direct' | 'snapshot' | null;
  lastRunAt: string | null;
  lastSyncedAt: string | null;
  lastDurationMs: number | null;
  lastTrigger: string | null;
  lastError: string | null;
  lastRun: {
    booksImported: number;
    booksRemoved: number;
    booksPending: number;
    qaImported: number;
    qaRemoved: number;
    categories: number;
  };
  discovery: {
    booksTable: string | null;
    contentStrategy: string[];
    categoriesTable: string | null;
    qaTable: string | null;
    tables: string[];
  } | null;
  totals: { lists: number; books: number; sections: number; qa: number };
}

export const BotLibrarySyncTab: React.FC = () => {
  const [stats, setStats] = useState<{ listsCount: number; notesCount: number; lastPublishedAt: string | null } | null>(null);
  const [lists, setLists] = useState<ListCategory[]>(() => loadAllLists());
  const [notes, setNotes] = useState<Note[]>(() => loadAllNotes());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Waraqa Live Bridge State
  const [waraqaStatus, setWaraqaStatus] = useState<WaraqaSyncStatus | null>(null);
  const [isWaraqaSyncing, setIsWaraqaSyncing] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    const data = await getBotLibraryStats();
    if (data?.stats) setStats(data.stats);

    const wData = await safeFetchJson('/api/bot/admin/waraqa-sync/status');
    if (wData?.status) setWaraqaStatus(wData.status);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
    // Poll Waraqa sync status every 15s
    const interval = setInterval(async () => {
      const wData = await safeFetchJson('/api/bot/admin/waraqa-sync/status');
      if (wData?.status) setWaraqaStatus(wData.status);
    }, 15000);
    return () => clearInterval(interval);
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

  const handleSyncWaraqa = async () => {
    setIsWaraqaSyncing(true);
    try {
      const res = await adminFetch('/api/bot/admin/sync-waraqa', { method: 'POST' });
      const data = await res.json();
      if (data?.status) {
        setWaraqaStatus(data.status);
        if (data.status.lastError) {
          alert('تنبيه أثناء مزامنة ورقة: ' + data.status.lastError);
        } else {
          setStatusMsg(`تمت المزامنة من ورقة بنجاح! تم استيراد ${data.status.lastRun?.booksImported || 0} كتاب، و ${data.status.lastRun?.qaImported || 0} سؤال وجواب.`);
          setTimeout(() => setStatusMsg(null), 5000);
        }
      }
      fetchStats();
    } catch (err: any) {
      alert('فشل استدعاء مزامنة ورقة: ' + (err?.message || err));
    } finally {
      setIsWaraqaSyncing(false);
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
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span>مزامنة ونشر المكتبة للبوت (Books &amp; Notes → Bot Live Sync)</span>
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
            ربط فوري بين كتب وملاحظات لوحة الإدارة ومحرك إجابات البوت العام مع خيار تحديد القوائم المرئية للبوت.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-base font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث الحالة</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-base font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TASK 3: Waraqa Live Sync Bridge Section */}
      {/* ========================================================================= */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl border border-indigo-900/60 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <LinkIcon className="w-5 h-5" />
              </span>
              <h3 className="text-lg md:text-xl font-black">
                جسر المزامنة المباشر من منصة ورقة (waraqa.misruq.com)
              </h3>
              {waraqaStatus?.configured ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  نشط وتلقائي (كل {Math.round((waraqaStatus.intervalMs || 15000) / 1000)} ثانية)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  غير مهيأ (WARAQA_DB_PATH)
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-300">
              قراءة حية بصيغة (Read-Only) لقاعدة بيانات ورقة المربوطة بمحرك RAG لاستيراد الكتب والمستندات والأسئلة تلقائياً.
            </p>
          </div>

          <button
            onClick={handleSyncWaraqa}
            disabled={isWaraqaSyncing || !waraqaStatus?.configured}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl text-base font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${isWaraqaSyncing ? 'animate-spin' : ''}`} />
            <span>{isWaraqaSyncing ? 'جاري المزامنة من ورقة...' : 'مزامنة من ورقة الآن'}</span>
          </button>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <span className="text-xs font-bold text-indigo-300 block mb-1">الكتب والمستندات من ورقة</span>
            <div className="text-2xl md:text-3xl font-black text-white">
              {waraqaStatus?.totals?.books ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">مقسمة إلى {waraqaStatus?.totals?.sections ?? 0} صفحة/جزء</span>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <span className="text-xs font-bold text-indigo-300 block mb-1">أسئلة وأجوبة ورقة المباشرة</span>
            <div className="text-2xl md:text-3xl font-black text-white">
              {waraqaStatus?.totals?.qa ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">مربوطة بالطبقة الأولى الفورية</span>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <span className="text-xs font-bold text-indigo-300 block mb-1">وضع الاتصال بالقاعدة</span>
            <div className="text-lg md:text-xl font-bold text-emerald-400 mt-1">
              {waraqaStatus?.mode === 'direct' ? 'مباشر (Direct :ro)' : waraqaStatus?.mode === 'snapshot' ? 'لقطة آمنة (Snapshot)' : '—'}
            </div>
            <span className="text-[11px] text-slate-400">
              {waraqaStatus?.dbPath ? waraqaStatus.dbPath.split('/').slice(-2).join('/') : 'المسار غير محدد'}
            </span>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <span className="text-xs font-bold text-indigo-300 block mb-1">آخر فحص مزامنة</span>
            <div className="text-sm md:text-base font-bold text-white mt-1">
              {waraqaStatus?.lastSyncedAt
                ? new Date(waraqaStatus.lastSyncedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'لم تتم بعد'}
            </div>
            <span className="text-[11px] text-slate-400">
              {waraqaStatus?.lastDurationMs ? `استغرقت ${waraqaStatus.lastDurationMs}ms` : '—'}
            </span>
          </div>
        </div>

        {/* Discovery & Last Error Alert */}
        {waraqaStatus?.lastError && (
          <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>خطأ في المزامنة: {waraqaStatus.lastError}</span>
          </div>
        )}

        {waraqaStatus?.discovery && (
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-white/10">
            <span>الجداول المكتشفة: <strong>{waraqaStatus.discovery.booksTable || 'لا يوجد كتب'}</strong> (استراتيجية النصوص: {waraqaStatus.discovery.contentStrategy.join(', ') || 'نص خام'})</span>
            <span>جدول الأسئلة: <strong>{waraqaStatus.discovery.qaTable || 'غير مفعل'}</strong></span>
            <span>جدول التصنيفات: <strong>{waraqaStatus.discovery.categoriesTable || 'تلقائي'}</strong></span>
          </div>
        )}
      </div>

      {/* Local Books & Notes Sync Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>الكتب والقوائم المنشورة للبوت</span>
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats?.listsCount ?? '...'}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">من أصل {lists.length} قائمة محلية</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>الملاحظات المفهرسة والمتاحة للبحث</span>
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats?.notesCount ?? '...'}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">من أصل {notes.filter((n) => !n.isDeleted).length} ملاحظة نشطة</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>آخر تاريخ نشر محلي</span>
          </span>
          <div className="text-base font-bold text-slate-800 dark:text-slate-200 pt-1">
            {stats?.lastPublishedAt ? new Date(stats.lastPublishedAt).toLocaleString('ar-EG') : 'لم تنشر بعد'}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">مزامنة فورية عند كل حفظ (Publish-on-Save)</span>
        </div>
      </div>

      {/* Sync All Action Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl text-white shadow-xl shadow-indigo-600/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-right">
          <h3 className="text-base md:text-lg font-black">نشر ومزامنة كافة الكتب والملاحظات المحلية دفعة واحدة</h3>
          <p className="text-sm text-indigo-100 font-medium">
            يقوم بإرسال وتحديث كافة الملاحظات والقوائم المحلية لتكون مرجعاً موثقاً للبوت في ثوانٍ معدودة.
          </p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="px-7 py-3.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-base rounded-2xl shadow-lg transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-2.5 active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'جاري النشر والمزامنة...' : 'نشر المكتبة المحلية للبوت الآن'}</span>
        </button>
      </div>

      {/* Lists Visibility Manager */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-200">
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
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm md:text-base font-bold transition-colors cursor-pointer ${
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
