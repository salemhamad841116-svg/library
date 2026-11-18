import React, { useState, useEffect } from 'react';
import { 
  Cloud, CloudCheck, CloudOff, RefreshCw, DownloadCloud, ShieldCheck, 
  Check, X, AlertCircle, HardDrive, Cpu, Laptop, ToggleLeft, ToggleRight, Smartphone, Download
} from 'lucide-react';
import { Note } from '../../types';
import { AppIcon } from '../Icons/AppIcon';
import { 
  syncAllNotesToFirestore, 
  loadNotesFromFirestoreAsync, 
  DEVICE_ID 
} from '../../services/accountBoundSync';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  userId: string;
  userEmail: string;
  onRestoreNotes: (restoredNotes: Note[]) => void;
  isOnline: boolean;
  lastSyncedTime: Date | null;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  isInstallable?: boolean;
  onInstallApp?: () => void;
}

export const BackupSyncModal: React.FC<BackupSyncModalProps> = ({
  isOpen,
  onClose,
  notes,
  userId,
  userEmail,
  onRestoreNotes,
  isOnline,
  lastSyncedTime,
  autoSyncEnabled,
  onToggleAutoSync,
  isInstallable,
  onInstallApp,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);
    setErrorMessage(null);

    try {
      await syncAllNotesToFirestore(notes, userId);
      setSyncSuccessMessage('تمت المزامنة بنجاح مع السحابة!');
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setErrorMessage('تعذر المزامنة حالياً. يرجى التحقق من الاتصال بالإنترنت.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!window.confirm('هل أنت تأكد من استعادة النسخة السحابية المحدثة؟ سيتم تحديث جميع الملاحظات في جهازك.')) {
      return;
    }

    setIsRestoring(true);
    setSyncSuccessMessage(null);
    setErrorMessage(null);

    try {
      const cloudNotes = await loadNotesFromFirestoreAsync(userId);
      if (cloudNotes && cloudNotes.length > 0) {
        onRestoreNotes(cloudNotes);
        setSyncSuccessMessage(`تمت استعادة ${cloudNotes.length} ملاحظة بنجاح من السحابة!`);
      } else {
        setErrorMessage('لم يتم العثور على ملاحظات سابقة مقترنة بهذا الحساب في السحابة.');
      }
    } catch (err) {
      console.error('Cloud restore error:', err);
      setErrorMessage('حدث خطأ أثناء تحميل البيانات السحابية.');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncedTime) return 'لم تتم المزامنة بعد';
    const diffSec = Math.floor((new Date().getTime() - lastSyncedTime.getTime()) / 1000);
    if (diffSec < 15) return 'الآن (منذ لحظات)';
    if (diffSec < 60) return `منذ ${diffSec} ثانية`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    return lastSyncedTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in dir-rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <AppIcon className="w-9 h-9" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                النسخ الاحتياطي والمزامنة السحابية
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مزامنة وحفظ تلقائي مرتبط بحسابك على جميع الأجهزة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Messages */}
          {syncSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{syncSuccessMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Account & Status Overview Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">حالة الاتصال والشبكة:</span>
              <div className="flex items-center gap-1.5 font-extrabold text-xs">
                {isOnline ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    متصل بالإنترنت ✓
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <CloudOff className="w-3.5 h-3.5" />
                    عمل بدون إنترنت (أوفلاين)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">حالة المزامنة السحابية:</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {isSyncing ? (
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    جاري المزامنة...
                  </span>
                ) : autoSyncEnabled ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CloudCheck className="w-4 h-4" />
                    متزامن ✓
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    موقوفة موقتاً
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">آخر مزامنة ناجحة:</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {formatLastSync()}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400">الحساب السحابي المربوط:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 dir-ltr truncate max-w-[180px]">
                {userEmail}
              </span>
            </div>
          </div>

          {/* Auto Backup Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                النسخ الاحتياطي السحابي التلقائي
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                حفظ وحماية الملاحظات تلقائياً في السحابة عند التعديل
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleAutoSync(!autoSyncEnabled)}
              className="text-indigo-600 dark:text-indigo-400 cursor-pointer"
            >
              {autoSyncEnabled ? (
                <ToggleRight className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>

          {/* Device & Security Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                <span>الملاحظات المحلية:</span>
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {notes.length} ملاحظة
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>الأمان والخصوصية:</span>
              </div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                حفظ سحابي مباشر ومخصص لحسابك
              </div>
            </div>
          </div>

          {/* PWA App Installation Box (Visible when installable) */}
          {isInstallable && onInstallApp && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                    تثبيت تطبيق الملاحظات (PWA)
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                    قم بتثبيت التطبيق على الشاشة الرئيسية لاستخدامه بدون متصفح
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onInstallApp}
                className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تثبيت</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              disabled={isSyncing || !isOnline}
              onClick={handleManualSync}
              className="w-full flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة سحابية الآن'}</span>
            </button>

            <button
              type="button"
              disabled={isRestoring || !isOnline}
              onClick={handleRestoreFromCloud}
              className="w-full flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <DownloadCloud className={`w-4 h-4 ${isRestoring ? 'animate-bounce' : ''}`} />
              <span>{isRestoring ? 'جاري التحميل...' : 'استعادة النسخة السحابية'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
