import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Volume2, CheckCircle2, Play, Search, AlertCircle, HelpCircle, Save, Sparkles, RefreshCw, Upload, Download, Database } from 'lucide-react';
import { safeFetchJson, adminFetch } from '../../../admin/bot/lib/safeFetch';
import { BotQaBulkImportModal } from './BotQaBulkImportModal';
import { buildQaExport } from './qaImportParser';

interface QaRule {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  audio_file_id?: string | null;
  audio_url?: string | null;
  match_mode: 'smart' | 'exact' | 'contains';
  priority: number;
  enabled: boolean;
  hits: number;
  created_at: string;
}

interface AudioFile {
  id: string;
  label: string;
  file_name: string;
  url: string;
}

export const BotQaTab: React.FC = () => {
  const [rules, setRules] = useState<QaRule[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [matchMode, setMatchMode] = useState<'smart' | 'exact' | 'contains'>('smart');
  const [priority, setPriority] = useState<number>(10);
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Test Match State
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fetchRules = async () => {
    setIsLoading(true);
    const data = await safeFetchJson('/api/bot/admin/qa-rules');
    if (data?.rules) setRules(data.rules);

    const aData = await safeFetchJson('/api/bot/admin/audio-files');
    if (aData?.files) setAudioFiles(aData.files);
    setIsLoading(false);
  };

  const handleExportJson = () => {
    if (rules.length === 0) {
      alert('لا توجد أي قواعد محفوظة لتصديرها حالياً.');
      return;
    }
    const jsonStr = buildQaExport(rules);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `bot-qa-rules-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkSuccess = (result: { importedCount: number; updatedCount: number; skippedCount: number; totalRules: number }) => {
    setStatusMsg(`تمت عملية الاستيراد بنجاح! تم استيراد ${result.importedCount} قاعدة جديدة، وتحديث ${result.updatedCount}، وتخطي ${result.skippedCount}.`);
    fetchRules();
    setTimeout(() => setStatusMsg(null), 5000);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setQuestion('');
    setKeywordsText('');
    setAnswer('');
    setSelectedAudioId('');
    setMatchMode('smart');
    setPriority(10);
    setEnabled(true);
  };

  const handleEdit = (r: QaRule) => {
    setEditingId(r.id);
    setQuestion(r.question);
    setKeywordsText((r.keywords || []).join('، '));
    setAnswer(r.answer);
    setSelectedAudioId(r.audio_file_id || '');
    setMatchMode(r.match_mode || 'smart');
    setPriority(r.priority || 0);
    setEnabled(r.enabled !== false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    setIsSaving(true);
    setStatusMsg(null);

    const keywords = keywordsText
      .split(/[,،\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      id: editingId || undefined,
      question: question.trim(),
      keywords,
      answer: answer.trim(),
      audio_file_id: selectedAudioId || null,
      match_mode: matchMode,
      priority: Number(priority),
      enabled,
    };

    const res = await safeFetchJson('/api/bot/admin/qa-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setIsSaving(false);
    if (res?.success) {
      setStatusMsg(editingId ? 'تم تحديث القاعدة بنجاح' : 'تمت إضافة القاعدة الجديدة بنجاح');
      resetForm();
      fetchRules();
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة من أسئلة وأجوبة البوت؟')) return;
    await adminFetch(`/api/bot/admin/qa-rules/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  const handleTestMatch = async () => {
    if (!testQuery.trim()) return;
    setIsTesting(true);
    const res = await safeFetchJson('/api/bot/admin/qa-rules/test-match', {
      method: 'POST',
      body: JSON.stringify({ query: testQuery }),
    });
    setTestResult(res);
    setIsTesting(false);
  };

  const filteredRules = rules.filter(
    (r) =>
      r.question.includes(searchQuery) ||
      r.answer.includes(searchQuery) ||
      (r.keywords || []).some((k) => k.includes(searchQuery))
  );

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <span>أسئلة وأجوبة البوت المباشرة (Direct Q&A Rules)</span>
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
            إجابات فورية ذات أولوية عليا مع إمكانية إرفاق رد صوتي مسجل مسبقاً (Zero LLM Cost &amp; Zero Latency).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-base font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Upload className="w-5 h-5" />
            <span>استيراد جماعي (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-slate-800 dark:text-slate-200 transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-5 h-5" />
            <span>تصدير JSON</span>
          </button>

          <button
            type="button"
            onClick={fetchRules}
            className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-base font-bold text-slate-800 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث القواعد</span>
          </button>
        </div>
      </div>

      <BotQaBulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handleBulkSuccess}
      />

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Editor & Creation Form */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>{editingId ? 'تعديل قاعدة السؤال والجواب' : 'إضافة سؤال وجواب مباشر للبوت'}</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                صيغة السؤال الشائع أو العبارة المفتاحية:
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="مثال: من هو مؤلف كتاب كذا؟ أو ما هي مواعيد العمل؟"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                الكلمات المفتاحية المرادفة (مفصولة بفاصلة):
              </label>
              <input
                type="text"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="مؤلف، كاتب، صاحب، متى يفتح"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              الإجابة النموذجية المعتمدة (النصية):
            </label>
            <textarea
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="اكتب الإجابة الدقيقة التي سيعرضها البوت مباشرة للمستخدم..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                الرد الصوتي المباشر (اختياري من مكتبة الأصوات):
              </label>
              <select
                value={selectedAudioId}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="">بدون ملف صوتي (توليد TTS ديناميكي)</option>
                {audioFiles.map((af) => (
                  <option key={af.id} value={af.id}>
                    🎙️ {af.label} ({af.file_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                طريقة المطابقة (Match Mode):
              </label>
              <select
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="smart">ذكية (مطابقة النص والكلمات المفتاحية)</option>
                <option value="exact">تطابق تام حصري (Exact Match)</option>
                <option value="contains">احتواء السؤال (Contains)</option>
              </select>
            </div>

            <div className="flex items-center gap-4 pt-4 sm:pt-6">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">الأولوية (Priority):</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">مفعلة</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-base font-bold rounded-2xl transition-colors cursor-pointer"
              >
                إلغاء التعديل
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-2xl flex items-center gap-2.5 shadow-lg hover:shadow-indigo-500/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Save className="w-5 h-5" />
              <span>{editingId ? 'حفظ التعديلات' : 'إضافة القاعدة للبوت'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Test Match Playground */}
      <div className="p-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-3xl border border-indigo-200 dark:border-indigo-900/40">
        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500" />
          <span>اختبار مطابقة الأسئلة المباشرة (Test Match Runner)</span>
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="اكتب سؤالاً لتجربة كيف سيطابقه البوت..."
            className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100"
            onKeyDown={(e) => e.key === 'Enter' && handleTestMatch()}
          />
          <button
            type="button"
            onClick={handleTestMatch}
            disabled={isTesting || !testQuery.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-base flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            <span>فحص المطابقة</span>
          </button>
        </div>

        {testResult && (
          <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {testResult.matched ? (
              <div className="space-y-1 text-emerald-700 dark:text-emerald-400">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم التطابق بنجاح مع القاعدة: «{testResult.rule.question}»</span>
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-1">الرد المباشر: {testResult.rule.answer}</div>
                {testResult.rule.audio_url && (
                  <div className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>ملف صوتي مرفق: {testResult.rule.audio_url}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>لم يتطابق مع أي قاعدة مباشرة (سيمر إلى البحث في المكتبة ونموذج الذكاء الاصطناعي).</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rules List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            القواعد المسجلة حالياً ({filteredRules.length})
          </span>
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في القواعد..."
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>

        {filteredRules.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            لا توجد قواعد مسجلة حالياً. أضف أول سؤال وجواب من النموذج أعلاه.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRules.map((r) => (
              <div key={r.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{r.question}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {r.enabled ? 'نشط' : 'معطل'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">الأولوية: {r.priority}</span>
                    <span className="text-[10px] font-mono text-slate-400">الاستخدام: {r.hits} مرة</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{r.answer}</p>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {r.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[10px]">
                        #{kw}
                      </span>
                    ))}
                    {r.audio_url && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                        <Volume2 className="w-3 h-3" />
                        <span>رد صوتي مرفق</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(r)}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="تعديل"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
