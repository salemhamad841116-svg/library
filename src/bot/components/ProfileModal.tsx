import React, { useState, useEffect } from 'react';
import { User, X, Check, Award, MessageSquare } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalMessagesCount: number;
  totalSessionsCount: number;
}

const AVATAR_OPTIONS = ['🐪', '🚀', '🧠', '🌟', '⚡', '🦅', '🎯', '💡'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  totalMessagesCount,
  totalSessionsCount,
}) => {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('bot_user_name') || 'زائر مسرق';
  });
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    return localStorage.getItem('bot_user_avatar') || '🐪';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserName(localStorage.getItem('bot_user_name') || 'زائر مسرق');
      setSelectedAvatar(localStorage.getItem('bot_user_avatar') || '🐪');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('bot_user_name', userName.trim() || 'زائر مسرق');
    localStorage.setItem('bot_user_avatar', selectedAvatar);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">الملف الشخصي للزائر</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Picker */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-cyan-500/50 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-cyan-950/40">
            {selectedAvatar}
          </div>
          <div className="text-xs text-slate-400">اختر الرمز التعبيري المفضل:</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedAvatar(emoji)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform active:scale-95 ${
                  selectedAvatar === emoji
                    ? 'bg-cyan-500/20 border border-cyan-400 scale-110'
                    : 'bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Nickname input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">الاسم المستعار:</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            placeholder="أدخل اسمك أو لقبك..."
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-100">{totalMessagesCount}</div>
              <div className="text-[10px] text-slate-400">الرسائل المتبادلة</div>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-100">{totalSessionsCount}</div>
              <div className="text-[10px] text-slate-400">جلسات المحادثة</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-1.5 transition-all"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>تم الحفظ!</span>
              </>
            ) : (
              <span>حفظ البيانات</span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
