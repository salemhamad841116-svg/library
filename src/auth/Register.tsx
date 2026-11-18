import React, { useState } from 'react';
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { GoogleIcon } from '../components/Icons/GoogleIcon';
import { AppIcon } from '../components/Icons/AppIcon';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { registerWithEmail, loginWithGoogle, loginAsGuest, authError, clearAuthError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    clearAuthError();

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setValidationError('يرجى كتابة الاسم الكامل.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setValidationError('يرجى كتابة بريد إلكتروني صحيح.');
      return;
    }

    if (!password) {
      setValidationError('يرجى كتابة كلمة المرور.');
      return;
    }

    if (password.length < 6) {
      setValidationError('يجب أن لا تقل كلمة المرور عن 6 أحرف أو أرقام.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setValidationError('كلمتا المرور غير متطابقتين.');
      return;
    }

    try {
      setLoading(true);
      await registerWithEmail(cleanName, cleanEmail, password);
    } catch (err) {
      // Error handled in provider authError state
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setValidationError('');
    clearAuthError();

    try {
      setGoogleLoading(true);
      await loginWithGoogle();
    } catch (err) {
      // Handled in provider
    } finally {
      setGoogleLoading(false);
    }
  };

  const isSubmitting = loading || googleLoading;

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl transition-all duration-300">
      {/* App Logo & Header */}
      <div className="text-center mb-8">
        <AppIcon className="w-16 h-16 mx-auto mb-3" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          إنشاء حساب جديد
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5">
          انضم إلينا وابدأ بتنظيم ملاحظاتك بدقة وأمان
        </p>
      </div>

      {/* Error Badges */}
      {(validationError || authError) && (
        <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span>{validationError || authError}</span>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleRegisterSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 mr-1">
            الاسم الكامل
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="سالم محمد"
              disabled={isSubmitting}
              className="w-full px-4 py-3 pl-10 pr-11 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 disabled:opacity-60"
            />
            <UserIcon className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 mr-1">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isSubmitting}
              className="w-full px-4 py-3 pl-10 pr-11 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 disabled:opacity-60"
            />
            <Mail className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 mr-1">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
              className="w-full px-4 py-3 pl-11 pr-11 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 disabled:opacity-60"
            />
            <Lock className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 mr-1">
            تأكيد كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
              className="w-full px-4 py-3 pl-10 pr-11 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 disabled:opacity-60"
            />
            <Lock className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Primary Register Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري إنشاء الحساب...</span>
            </>
          ) : (
            <span>إنشاء الحساب</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
        </div>
        <div className="relative flex justify-center text-xs font-semibold uppercase">
          <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500">
            أو التسجيل عبر
          </span>
        </div>
      </div>

      {/* Google Login & Guest Buttons */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleGoogleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
          ) : (
            <GoogleIcon className="w-5 h-5" />
          )}
          <span>المتابعة باستخدام Google</span>
        </button>

        <button
          type="button"
          onClick={loginAsGuest}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>المتابعة كزائر (بدون حساب)</span>
        </button>
      </div>

      {/* Bottom Switch Link */}
      <div className="text-center mt-7 text-xs font-semibold text-slate-500 dark:text-slate-400">
        لديك حساب بالفعل؟{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-extrabold cursor-pointer transition-colors"
        >
          تسجيل الدخول
        </button>
      </div>
    </div>
  );
};
