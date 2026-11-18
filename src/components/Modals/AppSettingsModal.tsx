import React from 'react';
import { 
  Settings, X, Cloud, Radio, Moon, Sun, Keyboard, 
  Smartphone, LogOut, Check, RefreshCw, Sparkles, Shield,
  HardDrive, ChevronLeft, Laptop, Info
} from 'lucide-react';
import { AppIcon } from '../Icons/AppIcon';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackupSync: () => void;
  onOpenOTAUpdate: () => void;
  onOpenShortcuts: () => void;
  onOpenPrivacyPolicy?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  isOnline: boolean;
  lastSyncedTime: Date | null;
  currentVersion: string;
  hasOTAUpdate: boolean;
  isInstallable?: boolean;
  onInstallApp?: () => void;
  userNameDisplay: string;
  userEmail: string;
  onLogout: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenBackupSync,
  onOpenOTAUpdate,
  onOpenShortcuts,
  onOpenPrivacyPolicy,
  isDarkMode,
  onToggleDarkMode,
  autoSyncEnabled,
  onToggleAutoSync,
  isOnline,
  lastSyncedTime,
  currentVersion,
  hasOTAUpdate,
  isInstallable,
  onInstallApp,
  userNameDisplay,
  userEmail,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                إعدادات التطبيق
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                التحكم بالنسخ الاحتياطي، التحديثات، المظهر والأمان
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Backup & Cloud Sync (النسخة الاحتياطية والمزامنة) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                النسخ الاحتياطي والمزامنة السحابية
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {isOnline ? 'متصل بالسحابة' : 'غير متصل'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                      النسخة الاحتياطية ومزامنة Firestore
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lastSyncedTime 
                        ? `آخر مزامنة: ${lastSyncedTime.toLocaleTimeString('ar-SA')}` 
                        : 'لم تتم المزامنة بعد'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBackupSync();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
                >
                  <span>فتح الإدارة</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Auto Sync Toggle */}
              <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    المزامنة التلقائية الحية
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    حفظ ومزامنة فورية لأي تعديل أو ملاحظة جديدة
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleAutoSync(!autoSyncEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    autoSyncEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: OTA Live Updates (تحديثات التطبيق الحية) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                تحديثات التطبيق الحية (OTA)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[10px] font-black font-mono">
                الإصدار v{currentVersion}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                    hasOTAUpdate ? 'bg-blue-600 animate-pulse' : 'bg-blue-600'
                  }`}>
                    <Radio className={`w-5 h-5 ${hasOTAUpdate ? 'text-yellow-300 animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>تحديثات التطبيق عبر الهواء</span>
                      {hasOTAUpdate && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold animate-bounce">
                          تحديث جديد متاح!
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {hasOTAUpdate 
                        ? 'إصدار جديد جاهز للتطبيق الفوري بدون إعادة تحميل' 
                        : 'التطبيق يعمل على أحدث إصدار برمجي مستقر'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOTAUpdate();
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer ${
                    hasOTAUpdate ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <span>مركز التحديثات</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Appearance & Display (المظهر والسمات) */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              المظهر والسمة
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => isDarkMode && onToggleDarkMode()}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  !isDarkMode
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Sun className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-black">الوضع الفاتح</div>
                  <div className="text-[10px] text-slate-400">إضاءة واضحة ومريحة</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => !isDarkMode && onToggleDarkMode()}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border-indigo-600 bg-indigo-950/50 text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-black">الوضع الداكن</div>
                  <div className="text-[10px] text-slate-400">توفير البطارية وراحة العين</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 4: Extra Tools (الاختصارات وتثبيت التطبيق) */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              أدوات مساعدة وأمان البيانات
            </span>

            <div className="space-y-2">
              {onOpenPrivacyPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPrivacyPolicy();
                  }}
                  className="w-full p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60 flex items-center justify-between transition-colors cursor-pointer text-indigo-950 dark:text-indigo-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black">
                        سياسة الخصوصية وبيانات الجهاز (Metadata)
                      </div>
                      <div className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80">
                        معاينة مواصفات جهازك، موقع الاتصال وقواعد حماية البيانات
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-indigo-500" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShortcuts();
                }}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <Keyboard className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      اختصارات لوحة المفاتيح
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      تصفح الأوامر السريعة للتنقل والتحرير (Ctrl + /)
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>

              {onInstallApp && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onInstallApp();
                  }}
                  className="w-full p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 hover:bg-blue-100/70 flex items-center justify-between transition-colors cursor-pointer text-blue-950 dark:text-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-blue-950 dark:text-blue-200">
                        تثبيت التطبيق الآن
                      </div>
                      <div className="text-[10px] text-blue-700/70 dark:text-blue-300/70">
                        تشغيل كتطبيق مستقل فائق السرعة وبدون شريط المتصفح
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black">
                    تثبيت التطبيق
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Section 5: User Session (الحساب) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                👤
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {userNameDisplay}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {userEmail}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200/80 dark:border-rose-800/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <AppIcon className="w-4 h-4" />
            <span>إصدار التطبيق {currentVersion}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
