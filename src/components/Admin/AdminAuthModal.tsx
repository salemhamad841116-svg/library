import React, { useState } from 'react';
import { ShieldAlert, KeyRound, UserCheck, Lock, CheckCircle2, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AdminRole, AdminSession } from '../../types/admin';
import { saveAdminSession, addAuditLog } from '../../services/adminStorage';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (session: AdminSession) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated
}) => {
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [email, setEmail] = useState('admin@notebook.app');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور المشفرة.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      // Move to 2FA verification step
      setStep('2fa');
    }, 400);
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Demo check: accept code if 6 digits or empty demo bypass
    if (twoFactorCode && twoFactorCode.length !== 6 && twoFactorCode !== '123456') {
      setError('رمز التحقق غير صحيح. استعمل الرمز التجريبي: 123456');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const session: AdminSession = {
        isAuthenticated: true,
        currentUser: {
          id: 'usr-001',
          name: email.split('@')[0] || 'المشرف العام',
          email,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          role,
          is2FAVerified: true
        }
      };

      saveAdminSession(session);
      addAuditLog({
        userId: 'usr-001',
        userName: session.currentUser?.name || 'المشرف',
        action: `تسجيل دخول ناجح مع 2FA بدور (${role})`,
        category: 'auth',
        ip: '197.35.112.45',
        status: 'success',
        details: 'تم الدخول عبر نظام التحقق الثنائي المصرح به'
      });

      setIsSubmitting(false);
      onAuthenticated(session);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden select-none">
        
        {/* Header */}
        <div className="px-6 py-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-400/30 backdrop-blur-xs">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">بوابة الدخول لوحة الإدارة</h3>
              <p className="text-xs text-slate-300">منطقة مشفرة ومخصصة للمشرفين فقط</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  البريد الإلكتروني للإدارة
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    placeholder="admin@domain.com"
                    required
                  />
                  <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  كلمة المرور المشفرة
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  رتبة الصلاحيات المطلوبة (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminRole)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden"
                >
                  <option value="super_admin">مدير نظام أعلى (Super Admin) - كامل الصلاحيات</option>
                  <option value="admin">مدير عام (Admin)</option>
                  <option value="moderator">مشرف محتوى وملاحظات (Moderator)</option>
                  <option value="support">دعم فني ومستخدمين (Support)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>المتابعة للتحقق الثنائي 2FA</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-slate-700 dark:text-slate-300 text-center">
                <KeyRound className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                <p className="font-bold">أدخل رمز التحقق الثنائي (2FA)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  أرسلنا رمز الأمان إلى تطبيق المصادقة الخاص بك. (الرمز التجريبي: <span className="font-mono font-bold text-indigo-600">123456</span>)
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-widest text-lg font-mono py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="w-1/3 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد وتسجيل الدخول</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
