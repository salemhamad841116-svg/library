import React, { useState, useEffect } from 'react';
import { 
  X, Download, Smartphone, Laptop, Share, PlusSquare, 
  CheckCircle2, Sparkles, ArrowDown, ExternalLink, Globe 
} from 'lucide-react';
import { AppIcon } from '../Icons/AppIcon';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => Promise<string | undefined>;
  hasNativePrompt?: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onNativeInstall,
  hasNativePrompt = false,
}) => {
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('android');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      setDeviceType('ios');
    } else if (/Android/.test(ua)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (hasNativePrompt && onNativeInstall) {
      try {
        setIsInstalling(true);
        const res = await onNativeInstall();
        if (res === 'prompted') {
          onClose();
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Brand */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 dark:bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30">
              <AppIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>تنزيل وتثبيت التطبيق</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تشغيل كامل كتطبيق هاتف وحاسوب أصلي (PWA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Quick 1-Click Install Button if supported */}
          {hasNativePrompt && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div className="font-extrabold text-sm">تثبيت فوري مباشر بضغطة زر</div>
              </div>
              <p className="text-[11px] text-blue-100 leading-relaxed mb-3">
                متصفحك يدعم تثبيت التطبيق على الشاشة الرئيسية مباشرة كأي تطبيق من المتجر.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full py-2.5 px-4 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{isInstalling ? 'جاري التثبيت...' : 'تثبيت التطبيق الآن على الجهاز'}</span>
              </button>
            </div>
          )}

          {/* Device Tabs for step-by-step instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-slate-700 dark:text-slate-200 text-xs">
                طريقة التثبيت حسب نظام جهازك:
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setDeviceType('android')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  deviceType === 'android'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>أندرويد</span>
              </button>

              <button
                type="button"
                onClick={() => setDeviceType('ios')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  deviceType === 'ios'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>آيفون (iOS)</span>
              </button>

              <button
                type="button"
                onClick={() => setDeviceType('desktop')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  deviceType === 'desktop'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>الكمبيوتر</span>
              </button>
            </div>

            {/* Android Instructions */}
            {deviceType === 'android' && (
              <div className="space-y-2.5 font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <div>
                    افتح القائمة <strong className="text-blue-600 dark:text-blue-400"> ( ⋮ ) </strong> أعلى زاوية متصفح Chrome أو المتصفح لديك.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <div>
                    اضغط على <strong className="text-blue-600 dark:text-blue-400">"تثبيت التطبيق" (Install app)</strong> أو <strong className="text-blue-600 dark:text-blue-400">"إضافة إلى الشاشة الرئيسية"</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <div>
                    اضغط <strong className="text-emerald-600 dark:text-emerald-400">"تثبيت"</strong> وسيظهر التطبيق في شاشة التطبيقات كأي تطبيق عادي بدون شريط المتصفح!
                  </div>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {deviceType === 'ios' && (
              <div className="space-y-2.5 font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    <Share className="w-3 h-3" />
                  </div>
                  <div>
                    اضغط على زر <strong className="text-blue-600 dark:text-blue-400">مشاركة (Share)</strong> في شريط متصفح Safari أسفل الشاشة.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    <PlusSquare className="w-3 h-3" />
                  </div>
                  <div>
                    مرر للأسفل واختر <strong className="text-blue-600 dark:text-blue-400">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                  <div>
                    اضغط <strong className="text-emerald-600 dark:text-emerald-400">"إضافة" (Add)</strong> أعلى اليسار وسيفتح كتطبيق مستقل بشاشة كاملة.
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Instructions */}
            {deviceType === 'desktop' && (
              <div className="space-y-2.5 font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <div>
                    انظر إلى شريط العنوان في متصفح Chrome أو Edge وستجد أيقونة <strong className="text-blue-600 dark:text-blue-400">تثبيت التطبيق (شاشة مع سهم لأسفل)</strong> في أقصى اليمين أو اليسار.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <div>
                    اضغط على الأيقونة ثم اختر <strong className="text-emerald-600 dark:text-emerald-400">"تثبيت" (Install)</strong> وسيتم إنشاء أيقونة على سطح المكتب وقائمة ابدأ.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key Advantages Checklist */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>مزايا التثبيت كتطبيق:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>شاشة كاملة سريعة بدون إطار وشريط المتصفح</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>يعمل بدون إنترنت (Offline-First) ويحفظ تلقائياً</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>أيقونة خاصة على شاشة هاتفك وسطح المكتب لسرعة الوصول</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
