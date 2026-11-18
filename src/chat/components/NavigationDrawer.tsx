import React from 'react';
import {
  BarChart3,
  FileText,
  LineChart,
  MessageSquare,
  PenLine,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AISphere } from './AISphere';
import { GlassChatSession } from '../types';

export const SESSION_ICONS = [MessageSquare, LineChart, BarChart3, PenLine, FileText, Sparkles];

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  sessions: GlassChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  userName: string;
  onOpenSettings: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  onDelete,
  userName,
  onOpenSettings,
}) => (
  <>
    <div className={`gc-drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />

    <aside className={`gc-drawer gc-glass ${open ? 'open' : ''}`} aria-label="القائمة الجانبية">
      <div className="gc-logo">
        <AISphere size={76} />
        <span className="gc-logo-caption">مساعدك الذكي</span>
      </div>

      <button type="button" className="gc-new-chat" onClick={onNewChat}>
        <Plus size={18} strokeWidth={3} />
        <span>محادثة جديدة</span>
      </button>

      <div className="gc-section-title">الدردشات الأخيرة</div>

      <nav className="gc-history">
        {sessions.length === 0 && (
          <div style={{ padding: '12px 8px', fontSize: 13, color: 'var(--gc-muted)', fontWeight: 600 }}>
            لا توجد دردشات بعد
          </div>
        )}
        {sessions.map((s) => {
          const Icon = SESSION_ICONS[s.iconIndex % SESSION_ICONS.length];
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              className={`gc-history-item ${s.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
            >
              <span className="gc-history-icon">
                <Icon size={15} />
              </span>
              <span className="gc-history-label">{s.title}</span>
              <button
                type="button"
                className="gc-history-delete"
                aria-label="حذف المحادثة"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="gc-user-footer">
        <button type="button" className="gc-footer-btn" onClick={onOpenSettings}>
          <span className="gc-footer-avatar">{(userName || 'م').trim().charAt(0)}</span>
          <span>{userName || 'المستخدم'}</span>
        </button>
        <button type="button" className="gc-footer-btn" onClick={onOpenSettings}>
          <Settings size={18} style={{ margin: '0 6px' }} />
          <span>الإعدادات</span>
        </button>
      </div>
    </aside>
  </>
);
