import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { AppIcon } from '../components/Icons/AppIcon';

interface ForgotPasswordProps {
  onSwitchToLogin: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onSwitchToLogin }) => {
  const { resetPassword, authError, clearAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');
    clearAuthError();

    if (!email.trim()) {
      setValidationError('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSuccessMsg(`تم إرسال رابط إعادة تعيين كلمة المرور بنجاح إلى (${email}). يرجى مراجعة صندوق الوارد الخاص بك.`);
    } catch (err) {
      // Handled in provider
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl transition-all duration-300">
      {/* App Logo & Header */}
      <div className="text-center mb-8">
        <AppIcon className="w-16 h-16 mx-auto mb-3" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          استعادة كلمة المرور
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5">
          أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة التعيين مباشرة
        </p>
      </div>

      {/* Success Badge */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span className="leading-relaxed">{successMsg}</span>
        </div>
      )}

      {/* Error Badges */}
      {(validationError || authError) && (
        <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span>{validationError || authError}</span>
        </div>
      )}

      {/* Forgot Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 mr-1">
            البريد الإلكتروني المسجل
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              className="w-full px-4 py-3 pl-10 pr-11 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 disabled:opacity-60"
            />
            <Mail className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري إرسال الرابط...</span>
            </>
          ) : (
            <span>إرسال رابط إعادة التعيين</span>
          )}
        </button>
      </form>

      {/* Back to Login Link */}
      <div className="text-center mt-7">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لصفحة تسجيل الدخول</span>
        </button>
      </div>
    </div>
  );
};
