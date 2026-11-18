import React from 'react';
import { Menu, SlidersHorizontal } from 'lucide-react';
import { AISphere } from './AISphere';

interface TopHeaderProps {
  onToggleDrawer: () => void;
  onOpenSettings: () => void;
  statusText: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleDrawer, onOpenSettings, statusText }) => (
  <header className="gc-header gc-glass">
    <button
      type="button"
      className="gc-icon-btn gc-drawer-toggle"
      onClick={onToggleDrawer}
      aria-label="فتح القائمة الجانبية"
    >
      <Menu size={20} />
    </button>

    <div className="gc-mini-avatar">
      <AISphere size={40} round icon />
    </div>

    <div className="gc-live">
      <span className="gc-live-status">
        <span className="gc-live-dot" />
        {statusText}
      </span>
    </div>

    <div style={{ flex: 1 }} />

    <button type="button" className="gc-icon-btn" onClick={onOpenSettings} aria-label="الإعدادات">
      <SlidersHorizontal size={18} />
    </button>
  </header>
);
