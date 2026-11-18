import React from 'react';
import { Radio, Zap, X, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';
import { OTAVersionManifest } from '../../services/otaUpdateService';

interface OTANotificationToastProps {
  hasUpdate: boolean;
  updateManifest: OTAVersionManifest | null;
  onApplyUpdate: () => void;
  onOpenModal: () => void;
  onDismiss: () => void;
  showRollbackNotice: boolean;
  onDismissRollback: () => void;
  isUpdating: boolean;
}

export const OTANotificationToast: React.FC<OTANotificationToastProps> = ({
  hasUpdate,
  updateManifest,
  onApplyUpdate,
  onOpenModal,
  onDismiss,
  showRollbackNotice,
  onDismissRollback,
  isUpdating,
}) => {
  if (showRollbackNotice) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in slide-in-from-top-4 duration-300 select-none">
        <div className="p-3.5 rounded-2xl bg-amber-500 text-white shadow-xl flex items-center justify-between gap-3 border border-amber-400">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-black">تم التراجع التلقائي بنجاح (Auto-Rollback)</div>
              <div className="text-[11px] text-amber-100 truncate">
                تم استعادة النسخة المستقرة السابقة وتطهير الذاكرة المؤقتة لحماية بياناتك.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissRollback}
            className="p-1 rounded-lg hover:bg-black/10 text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!hasUpdate || !updateManifest) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in slide-in-from-top-4 duration-300 select-none">
      <div className="p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-indigo-500/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black flex items-center gap-1.5 truncate">
              <span>تحديث حي جديد متوفر (v{updateManifest.version})</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[10px]">OTA</span>
            </div>
            <div className="text-[10px] text-slate-300 truncate">
              تم تنزيل الحزمة في الخلفية • سيتم تطبيقها تلقائياً عند الإغلاق
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors cursor-pointer"
          >
            تفاصيل
          </button>
          <button
            type="button"
            onClick={onApplyUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-[11px] font-extrabold text-white shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span>{isUpdating ? 'تطبيق...' : 'إعادة التشغيل'}</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
