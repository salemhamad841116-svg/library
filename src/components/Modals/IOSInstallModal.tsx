import React from 'react';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { AppIcon } from '../Icons/AppIcon';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in dir-rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppIcon className="w-8 h-8" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              تثبيت التطبيق على iPhone / iPad
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
            لتثبيت التطبيق على جهازك وإضافته لشاشتك الرئيسية في Safari:
          </p>

          <ol className="space-y-3 font-semibold text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4" />
              </div>
              <span>1. اضغط على زر <strong className="text-indigo-600 dark:text-indigo-400">مشاركة (Share)</strong> أسفل المتصفح.</span>
            </li>

            <li className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
              <span>2. انزل للقائمة واختر <strong className="text-indigo-600 dark:text-indigo-400">إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</span>
            </li>

            <li className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <span>3. اضغط <strong className="text-emerald-600 dark:text-emerald-400">إضافة (Add)</strong> أعلى الشاشة وسيظهر التطبيق على هاتفك فوراً!</span>
            </li>
          </ol>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
          >
            حسناً، فهمت
          </button>
        </div>
      </div>
    </div>
  );
};
