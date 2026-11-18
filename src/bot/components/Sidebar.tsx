import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  X,
  User,
  Settings,
  Sparkles,
  ChevronLeft,
  Bot,
} from 'lucide-react';
import { ChatSession, QuickButton } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  quickButtons: QuickButton[];
  onSelectQuickButton: (prompt: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  botName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  quickButtons,
  onSelectQuickButton,
  onOpenProfile,
  onOpenSettings,
  botName,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-72 sm:w-80 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:static'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{botName}</h2>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                متصل وجاهز للمساعدة
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-800/70">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-950/40 hover:shadow-cyan-900/40 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>محادثة جديدة</span>
          </button>
        </div>

        {/* Sessions & History */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            سجل المحادثات
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs px-4">
              لا توجد محادثات سابقة بعد. ابدأ محادثة جديدة الآن!
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs font-medium ${
                    isActive
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-cyan-400' : 'text-slate-500'
                      }`}
                    />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleSaveRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-cyan-500/50 outline-none w-full text-xs"
                      />
                    ) : (
                      <span className="truncate">{session.title || 'محادثة بدون عنوان'}</span>
                    )}
                  </div>

                  {/* Actions (Rename / Delete) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(session, e)}
                      title="إعادة تسمية"
                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-700/60 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      title="حذف المحادثة"
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Quick Questions Section */}
          {quickButtons.length > 0 && (
            <div className="pt-4 mt-3 border-t border-slate-800/60">
              <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>مواضيع مقترحة</span>
              </div>
              <div className="space-y-1">
                {quickButtons.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => {
                      onSelectQuickButton(btn.prompt);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className="w-full text-right p-2 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 text-xs flex items-center gap-2 transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Profile & Settings Only - NO ADMIN) */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/80 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>الملف الشخصي</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>الإعدادات</span>
          </button>
        </div>
      </aside>
    </>
  );
};
