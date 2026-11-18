import React from 'react';
import { Settings, X, Volume2, Gauge, Trash2, CheckCircle2, Shield } from 'lucide-react';
import { UserVoiceSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserVoiceSettings;
  onUpdateSettings: (newSettings: Partial<UserVoiceSettings>) => void;
  onClearAllSessions: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllSessions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">إعدادات المحادثة والصوت</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Auto voice playback toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold">تشغيل الردود الصوتية تلقائياً</div>
                <div className="text-[10px] text-slate-400">نطق الإجابة فور استلامها</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoPlayVoice}
                onChange={(e) => onUpdateSettings({ autoPlayVoice: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Speech speed selector */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">سرعة قراءة الصوت:</span>
              </div>
              <span className="text-xs text-cyan-400 font-mono font-bold">
                {settings.speechSpeed}x
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[0.8, 1.0, 1.25].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onUpdateSettings({ speechSpeed: speed })}
                  className={`py-1.5 rounded-xl text-xs font-medium transition-all ${
                    settings.speechSpeed === speed
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/40'
                  }`}
                >
                  {speed === 1.0 ? 'طبيعي (1.0x)' : `${speed}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Clear all chats */}
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <Trash2 className="w-4 h-4" />
              <span>سجل المحادثات المؤقت</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يتم حفظ رسائلك محلياً في متصفحك فقط. يمكنك مسح جميع الجلسات القديمة بنقرة واحدة:
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('هل أنت متأكد من رغبتك في حذف جميع المحادثات السابقة؟')) {
                  onClearAllSessions();
                  onClose();
                }
              }}
              className="w-full py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium transition-colors"
            >
              مسح جميع المحادثات
            </button>
          </div>
        </div>

        {/* Security / Privacy badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
          <Shield className="w-3.5 h-3.5 text-cyan-500/70" />
          <span>محادثة آمنة ومشفرة تماماً عبر منصة مسرق</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
        >
          تم
        </button>
      </div>
    </div>
  );
};
