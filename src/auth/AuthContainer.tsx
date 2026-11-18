import React, { useState } from 'react';
import { Login } from './Login';
import { Register } from './Register';
import { ForgotPassword } from './ForgotPassword';
import { Moon, Sun } from 'lucide-react';
import { AppIcon } from '../components/Icons/AppIcon';

export const AuthContainer: React.FC<{ isDarkMode: boolean; onToggleDarkMode: () => void }> = ({
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden dir-rtl font-sans">
      {/* Background Ambient Glow Effects */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-indigo-500/15 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-blue-500/15 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Bar */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <AppIcon className="w-10 h-10" />
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Library
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
          title="تبديل الوضع الداكن / الفاتح"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        {view === 'login' && (
          <Login
            onSwitchToRegister={() => setView('register')}
            onSwitchToForgotPassword={() => setView('forgot')}
          />
        )}
        {view === 'register' && (
          <Register onSwitchToLogin={() => setView('login')} />
        )}
        {view === 'forgot' && (
          <ForgotPassword onSwitchToLogin={() => setView('login')} />
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-600">
        تطبيق Library الذكي &copy; {new Date().getFullYear()} &bull; جميع الحقوق محفوظة
      </footer>
    </div>
  );
};
