import React from 'react';
import { Bot } from 'lucide-react';

/** 3D-looking AI sphere logo (pure CSS). */
export const AISphere: React.FC<{ size?: number; round?: boolean; label?: string; icon?: boolean }> = ({
  size = 72,
  round = false,
  label = 'AI',
  icon = false,
}) => (
  <div
    className={`gc-sphere ${round ? 'round' : ''}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    {icon ? (
      <Bot size={Math.round(size * 0.52)} color="#fff" strokeWidth={2.2} />
    ) : (
      <span style={{ fontSize: Math.round(size * 0.34) }}>{label}</span>
    )}
  </div>
);
