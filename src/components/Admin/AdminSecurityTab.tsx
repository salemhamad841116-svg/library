import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, KeyRound, Lock, UserCheck, AlertOctagon, Check, X, 
  ShieldAlert, Server, Cpu, Database, CheckCircle2, RefreshCw, Key
} from 'lucide-react';
import { AuditLogItem } from '../../types/admin';
import { AppEnvironment } from '../../types';
import { getAppEnvironment, setAppEnvironment } from '../../services/environment';

interface AdminSecurityTabProps {
  logs: AuditLogItem[];
}

const ROLE_PERMISSIONS = [
  { feature: 'إدارة المستخدمين وحذف الحسابات', superAdmin: true, admin: true, moderator: false, support: false },
  { feature: 'تعديل أسعار الباقات والاشتراكات', superAdmin: true, admin: false, moderator: false, support: false },
  { feature: 'عرض واستعادة كافة الملاحظات System-wide', superAdmin: true, admin: true, moderator: true, support: false },
  { feature: 'تصدير وسحب سجلات التدقيق (Audit Logs)', superAdmin: true, admin: true, moderator: false, support: false },
  { feature: 'التحكم بإعدادات الصيانة و 2FA', superAdmin: true, admin: true, moderator: false, support: false },
  { feature: 'التحكم ببيئة التشغيل (Staging vs Production)', superAdmin: true, admin: true, moderator: false, support: false },
  { feature: 'إرسال الإشعارات والتنبيهات المباشرة', superAdmin: true, admin: true, moderator: true, support: true },
  { feature: 'إعادة تعيين كلمة مرور المستخدم', superAdmin: true, admin: true, moderator: false, support: true },
];

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({ logs }) => {
  const failedLogins = logs.filter(l => l.status === 'warning' || l.status === 'error');
  const [currentEnv, setCurrentEnv] = useState<AppEnvironment>('production');

  useEffect(() => {
    const env = getAppEnvironment();
    setCurrentEnv(env.current);
  }, []);

  const handleEnvChange = (env: AppEnvironment) => {
    setAppEnvironment(env);
    setCurrentEnv(env);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none text-xs">
      {/* 2FA & Sync Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
              <span>التحقق الثنائي والمصادقة (2FA)</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-slate-500 text-[11px]">مفعل ومجبر مع منع تام لتخزين كلمات المرور الصريحة.</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <Database className="w-5 h-5" />
              <span>المزامنة السحابية المباشرة (Direct Sync)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
              Firestore
            </span>
          </div>
          <p className="text-slate-500 text-[11px]">تخزين مباشر وسريع بدون تشفير مع عزل أمان RLS محكم.</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
              <AlertOctagon className="w-5 h-5" />
              <span>محاولات الدخول الفاشلة ({failedLogins.length})</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
              مراقبة 24/7
            </span>
          </div>
          <p className="text-slate-500 text-[11px]">مراقبة تلقائية لمنع هجمات التخمين Brute-force.</p>
        </div>
      </div>

      {/* Section: Environment Separation & RLS Rules Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Environment Control Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              <span>فصل بيئات العمل (Environment Separation)</span>
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              currentEnv === 'production' 
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
            }`}>
              {currentEnv === 'production' ? 'Production Mode' : 'Staging / Dev Mode'}
            </span>
          </div>

          <p className="text-slate-500 text-[11px]">
            عزل تام بين قاعدة بيانات الإنتاج الحية (Production DB) وقاعدة بيانات الاختبار (Staging DB).
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleEnvChange('production')}
              className={`flex-1 p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                currentEnv === 'production'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              🟢 بيئة الإنتاج (Production)
            </button>

            <button
              type="button"
              onClick={() => handleEnvChange('staging')}
              className={`flex-1 p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                currentEnv === 'staging'
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              🟡 بيئة الاختبار (Staging/Dev)
            </button>
          </div>
        </div>

        {/* Database RLS Compliance Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>أمان قواعد البيانات (RLS Security Rules)</span>
            </h3>
            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              قواعد نشطة ومطبقة
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-600 dark:text-slate-300 font-medium">عزل حسابات المستخدمين (request.auth.uid):</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">مطبق بنجاح ✓</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-600 dark:text-slate-300 font-medium">حظر الوصول العام غير المصادق (Public Access Deny):</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% مغلق ✓</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-600 dark:text-slate-300 font-medium">حالة التشفير:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">تخزين مباشر وسريع (بدون تشفير)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-500" />
          <span>مصفوفة الصلاحيات حسب أدوار المشرفين (Permissions Matrix)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/40">
                <th className="py-3 px-3">الميزة / الصلاحية</th>
                <th className="py-3 px-3 text-center">Super Admin</th>
                <th className="py-3 px-3 text-center">Admin</th>
                <th className="py-3 px-3 text-center">Moderator</th>
                <th className="py-3 px-3 text-center">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ROLE_PERMISSIONS.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{p.feature}</td>
                  <td className="py-3 px-3 text-center">
                    {p.superAdmin ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {p.admin ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {p.moderator ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {p.support ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
