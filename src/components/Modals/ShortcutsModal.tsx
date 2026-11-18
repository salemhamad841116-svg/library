import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + N', desc: 'إنشاء ملاحظة جديدة' },
    { key: 'Ctrl + Shift + N', desc: 'إنشاء ملاحظة فرعية داخل الملاحظة الحالية' },
    { key: 'Ctrl + F', desc: 'البحث والاستبدال داخل المحرر' },
    { key: 'Ctrl + S', desc: 'حفظ الملاحظة فوري (الحفظ تلقائي بالفعل)' },
    { key: 'Ctrl + B', desc: 'تنسيق خط عريض (Bold)' },
    { key: 'Ctrl + I', desc: 'تنسيق خط مائل (Italic)' },
    { key: 'Ctrl + U', desc: 'تنسيق تسطير (Underline)' },
    { key: 'Ctrl + K', desc: 'إدراج رابط شبكي' },
    { key: 'Ctrl + Shift + AI', desc: 'فتح مساعد الذكاء الاصطناعي (Gemini)' },
    { key: 'Esc', desc: 'إغلاق القوائم والنوافذ المنبثقة' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              اختصارات لوحة المفاتيح (Keyboard Shortcuts)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs"
            >
              <span className="text-slate-700 dark:text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
