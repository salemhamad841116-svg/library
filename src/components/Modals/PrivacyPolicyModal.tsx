import React from 'react';
import { 
  ShieldCheck, X, Smartphone, Globe, Lock, Cpu, 
  MapPin, CheckCircle2, RefreshCw, Server, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, refreshUserMetadata, user } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserMetadata();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const deviceInfo = userProfile?.device_info;
  const locationInfo = userProfile?.last_login_location;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                سياسة الخصوصية وبيانات الحساب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                شفافية جمع البيانات الوصفية (Metadata) لحماية الحساب ومزامنة الأجهزة
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-right">
          {/* Policy Disclosure Card */}
          <div className="p-4.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>إشعار جمع واستخدام البيانات الوصفية (Privacy Disclosure)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              يقوم التطبيق تلقائياً بالتقاط نوع الجهاز (Device Type &amp; OS) وموقع الاتصال التقريبي (Approximate IP &amp; Country) وقت تسجيل الدخول والمزامنة. نستخدم هذه البيانات حصرياً للأغراض التالية:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              <li className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/50 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>حماية وتأمين الحساب من الدخول غير المصرح</span>
              </li>
              <li className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/50 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>تخصيص الواجهة لتناسب دقة شاشة جهازك</span>
              </li>
              <li className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/50 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>مزامنة الملاحظات بدقة وتفادي تعارض التعديلات</span>
              </li>
              <li className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/50 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>عزل البيانات عبر قواعد أمان مشددة (ABAC)</span>
              </li>
            </ul>
          </div>

          {/* Live Device & Location Metadata Inspector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                البيانات الوصفية المسجلة لحسابك حالياً
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span>تحديث البيانات الآن</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Device Specs Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                      مواصفات الجهاز ونظام التشغيل
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {deviceInfo?.deviceModel || 'جهاز متصل'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">نوع الجهاز:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {deviceInfo?.deviceType === 'mobile' ? 'هاتف ذكي (Mobile)' : deviceInfo?.deviceType === 'tablet' ? 'جهاز لوحي (Tablet)' : 'كمبيوتر مكتبي (Desktop)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">نظام التشغيل:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {deviceInfo?.os || 'Unknown'} {deviceInfo?.osVersion || ''}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">المتصفح:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {deviceInfo?.browser || 'Browser'} ({deviceInfo?.browserVersion?.split('.')[0] || 'Latest'})
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 dark:text-slate-400">أبعاد الشاشة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {deviceInfo?.screenResolution || '1920x1080'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Network Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                      موقع الاتصال والشبكة
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      تحليل صامت بدون GPS
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">الدولة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {locationInfo?.country || 'المملكة العربية السعودية'} ({locationInfo?.countryCode || 'SA'})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">المدينة / المنطقة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {locationInfo?.city || 'الرياض'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">المنطقة الزمنية:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {locationInfo?.timezone || 'Asia/Riyadh'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 dark:text-slate-400">نوع الاتصال:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                      {locationInfo?.connectionType || 'WiFi / High-Speed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Document Information */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-black text-amber-950 dark:text-amber-200">
                مستند المستخدم في قاعدة البيانات (users/{userProfile?.uid || user?.uid})
              </h5>
              <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed font-mono">
                البريد المستخرج من المصادقة: {userProfile?.email || user?.email || 'غير محدد'}
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                تاريخ آخر تسجيل دخول: {userProfile?.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleString('ar-SA') : 'الآن'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>بياناتك مشفرة ومحمية بقواعد أمان Firestore Zero-Trust</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
          >
            فهمت ذلك
          </button>
        </div>
      </div>
    </div>
  );
};
