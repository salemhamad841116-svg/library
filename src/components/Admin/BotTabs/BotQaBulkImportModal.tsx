import React, { useState, useMemo, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw, Database } from 'lucide-react';
import { parseQaImport, ParsedQaItem } from './qaImportParser';
import { adminFetch } from '../../../admin/bot/lib/safeFetch';

interface BotQaBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { importedCount: number; updatedCount: number; skippedCount: number; totalRules: number }) => void;
}

export const BotQaBulkImportModal: React.FC<BotQaBulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'upsert' | 'skip'>('upsert');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseResult = useMemo(() => parseQaImport(rawText), [rawText]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setRawText(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteExample = () => {
    const example = `"ما هي عاصمة الإمارات؟": "أبوظبي",
"ما هي عاصمة السعودية؟": "الرياض",
"ما هي عاصمة مصر؟": "القاهرة"`;
    setRawText(example);
  };

  const handleConfirmImport = async () => {
    if (!parseResult.ok || parseResult.items.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await adminFetch('/api/bot/admin/qa/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parseResult.items,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشلت عملية الاستيراد الجماعي');
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'حدث خطأ أثناء إرسال البيانات للخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-right flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100">
                استيراد جماعي للأسئلة والأجوبة (Bulk JSON Import)
              </h3>
              <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                أدخل مئات الأسئلة والأجوبة دفعة واحدة بنظام التحليل الذكي المرن (يدعم القوائم المباشرة بدون أقواس خارجية).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Action Row & File Upload */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>الصيغ المدعومة: كائن "سؤال": "جواب" أو مصفوفة كائنات، أو رفع ملف .json مباشرة.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 font-bold text-sm rounded-xl transition-all shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>رفع ملف JSON</span>
              </button>
              <button
                type="button"
                onClick={handlePasteExample}
                className="text-xs text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold px-2"
              >
                تجربة نموذج بسيط
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
              الصق نص الـ JSON أو قائمة الأسئلة والأجوبة هنا:
            </label>
            <textarea
              dir="auto"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`"ما هي عاصمة الإمارات؟": "أبوظبي",\n"ما هي عاصمة السعودية؟": "الرياض",\n"ما هي عاصمة مصر؟": "القاهرة"`}
              rows={7}
              className="w-full font-mono text-sm md:text-base p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
            />
          </div>

          {/* Live Validation Banner */}
          {rawText.trim() && (
            <div>
              {parseResult.ok ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm md:text-base font-bold text-emerald-800 dark:text-emerald-300">
                      تم التعرف على {parseResult.items.length} سؤال وجواب جاهز للاستيراد!
                    </h4>
                    {parseResult.duplicateCount > 0 && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                        ملاحظة: تضمن النص {parseResult.duplicateCount} سؤالاً مكرراً تم دمجهم واختيار أحدث إجابة.
                      </p>
                    )}
                    {parseResult.invalidCount > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        تم تجاهل {parseResult.invalidCount} عنصراً غير صالح لعدم اكتمال السؤال أو الجواب.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm md:text-base font-bold text-rose-800 dark:text-rose-300">
                      تعذر التعرف على البيانات المدخلة
                    </h4>
                    <p className="text-xs md:text-sm text-rose-700 dark:text-rose-400 mt-1">
                      {parseResult.error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode Selection */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              طريقة التعامل مع الأسئلة المكررة الموجودة مسبقاً في النظام:
            </span>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm md:text-base font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="import_mode"
                  value="upsert"
                  checked={mode === 'upsert'}
                  onChange={() => setMode('upsert')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>تحديث الإجابة للسؤال الموجود مسبقاً (Upsert - افتراضي)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-sm md:text-base font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="import_mode"
                  value="skip"
                  checked={mode === 'skip'}
                  onChange={() => setMode('skip')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>تجاهل الأسئلة المكررة والإبقاء على القديم (Skip)</span>
              </label>
            </div>
          </div>

          {/* Preview Table */}
          {parseResult.ok && parseResult.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300">
                <span>معاينة العناصر ({Math.min(parseResult.items.length, 15)} من أصل {parseResult.items.length}):</span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs md:text-sm border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-12 text-center">#</th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-5/12">السؤال</th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-5/12">الجواب</th>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">الكلمات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                    {parseResult.items.slice(0, 15).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{item.question}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">{item.answer}</td>
                        <td className="p-2.5 text-slate-400">
                          {item.keywords && item.keywords.length > 0 ? (
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px]">
                              {item.keywords.join(', ')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {submitError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!parseResult.ok || parseResult.items.length === 0 || isSubmitting}
            className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-bold text-base transition-all shadow-md shadow-indigo-600/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>جاري الاستيراد والتحديث...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>بدء الاستيراد الفوري ({parseResult.items.length} سؤال)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
