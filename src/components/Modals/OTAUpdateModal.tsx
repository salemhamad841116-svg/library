import React, { useState } from 'react';
import { 
  Radio, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  DownloadCloud, 
  Layers, 
  ShieldCheck, 
  History, 
  X, 
  ExternalLink,
  RotateCcw,
  Zap,
  Check,
  Smartphone
} from 'lucide-react';
import { 
  OTAVersionManifest, 
  getUpdateHistory, 
  getOTASettings, 
  saveOTASettings, 
  OTASettings 
} from '../../services/otaUpdateService';

interface OTAUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  isChecking: boolean;
  hasUpdate: boolean;
  updateManifest: OTAVersionManifest | null;
  lastCheckedTime: Date | null;
  onCheckForUpdates: () => void;
  onApplyUpdate: () => void;
  onRollback: (reason?: string) => void;
  isUpdating: boolean;
}

export const OTAUpdateModal: React.FC<OTAUpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  isChecking,
  hasUpdate,
  updateManifest,
  lastCheckedTime,
  onCheckForUpdates,
  onApplyUpdate,
  onRollback,
  isUpdating
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'settings'>('status');
  const [settings, setSettings] = useState<OTASettings>(getOTASettings());
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false);
  const history = getUpdateHistory();

  if (!isOpen) return null;

  const handleToggleSetting = (key: keyof OTASettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveOTASettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">التحديثات عبر الهواء (OTA Live Updates)</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-bold">
                  PWA v{currentVersion}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                تحديث الواجهة والميزات البرمجية الحية فورياً دون رفع للمتاجر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'status'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            حالة الإصدار الحي
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'history'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            سجل التحديثات ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            سياسات الاستقرار والمزامنة
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'status' && (
            <div className="space-y-4 text-xs">
              {/* Current Version Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold block">الإصدار المثبت حالياً</span>
                  <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                    <span>v{currentVersion}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      نشط ومستقر
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    قناة الإطلاق: الإنتاج المباشر (Production Live Channel)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onCheckForUpdates}
                  disabled={isChecking}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'جاري الفحص...' : 'فحص التحديثات'}</span>
                </button>
              </div>

              {/* Update Available Banner OR Up-to-date Status */}
              {hasUpdate && updateManifest ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border-2 border-indigo-500/30 dark:border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                        <DownloadCloud className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">
                          تحديث حي جديد متوفر: v{updateManifest.version}
                        </div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                          تم تنزيل الحزمة وتجهيزها في الخلفية جاهزة للتطبيق الفوري
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Changelog */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{updateManifest.title || 'محتويات التحديث الحي:'}</span>
                    </div>
                    <ul className="space-y-1 pr-2">
                      {updateManifest.changelog.map((item, idx) => (
                        <li key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Apply Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onApplyUpdate}
                      disabled={isUpdating}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
                    >
                      <Zap className="w-4 h-4 text-yellow-300" />
                      <span>{isUpdating ? 'جاري تطبيق التحديث...' : 'تطبيق التحديث وإعادة التشغيل الفوري'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-emerald-900 dark:text-emerald-200">
                      التطبيق يعمل على أحدث إصدار معتمد
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {lastCheckedTime 
                        ? `آخر فحص صامت: ${lastCheckedTime.toLocaleTimeString('ar-SA')}`
                        : 'يتم فحص التحديثات في الخلفية تلقائياً عند كل إقلاع.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Crash-Guard & Rollback Safety Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      نظام الأمان والتراجع التلقائي (Crash-Guard Active)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950">
                    مفعّل
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  يقوم النظام بمراقبة أول 15 ثانية بعد أي تحديث، وفي حال حدوث 3 محاولات انهيار غير متوقعة (Crash Loop)، يتم التراجع التلقائي فوراً واستعادة النسخة المستقرة السابقة وتطهير الذاكرة المؤقتة.
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsRollbackConfirmOpen(true)}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تراجع يدوي طارئ وتفريغ التخزين المؤقت</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2 text-xs">
              {history.map((h, i) => (
                <div 
                  key={i}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      h.status === 'rolled_back'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                    }`}>
                      {h.status === 'rolled_back' ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {h.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(h.appliedAt).toLocaleString('ar-SA')} • إصدار {h.version}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    h.status === 'rolled_back'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    {h.status === 'rolled_back' ? 'تم التراجع' : 'مكتمل بنجاح'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    التحقق الصامت من التحديثات عند الفتح (Background Check)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    فحص وجود باتشات أو تحديثات تلقائياً دون إشغال المستخدم
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoCheckOnLaunch}
                  onChange={() => handleToggleSetting('autoCheckOnLaunch')}
                  className="w-5 h-5 text-blue-600 rounded-xs cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    تطبيق التحديث تلقائياً عند الإغلاق والفتح القادم (Seamless Apply)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    تثبيت الحزمة الجديدة عند إعادة تشغيل التطبيق بدون مقاطعة
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoApplyOnRestart}
                  onChange={() => handleToggleSetting('autoApplyOnRestart')}
                  className="w-5 h-5 text-blue-600 rounded-xs cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    إظهار إشعار عائم عند اكتمال تنزيل حزمة OTA
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    عرض زر سريع لإعادة التشغيل المباشر
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyOnBackgroundDownload}
                  onChange={() => handleToggleSetting('notifyOnBackgroundDownload')}
                  className="w-5 h-5 text-blue-600 rounded-xs cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            تحديثات الواجهة والمنطق البرمجي (OTA Logic & UI)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Emergency Rollback */}
      {isRollbackConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="font-bold text-sm">تأكيد التراجع اليدوي الطارئ</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              سيقوم هذا الإجراء بإلغاء تسجيل Service Worker وحذف الذاكرة المؤقتة (Cache Storage) وإعادة تحميل التطبيق على النسخة المستقرة الأساسية.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRollbackConfirmOpen(false)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRollbackConfirmOpen(false);
                  onRollback('تراجع يدوي بناءً على طلب المسؤول');
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                تأكيد التراجع الفوري
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
