import React from 'react';

interface AppIconProps {
  className?: string;
  size?: number;
  showWhiteBackdrop?: boolean;
}

export const AppIcon: React.FC<AppIconProps> = ({ 
  className = 'w-10 h-10', 
  size,
  showWhiteBackdrop = false 
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${showWhiteBackdrop ? 'bg-white rounded-2xl p-1 shadow-xs' : ''} ${className}`} 
      style={style}
    >
      <img
        src="/app-icon.svg"
        alt="شعار التطبيق"
        className="w-full h-full object-contain rounded-xl drop-shadow-xs transition-transform duration-200"
        style={{ aspectRatio: '1/1', objectFit: 'contain' }}
        referrerPolicy="no-referrer"
        loading="eager"
        onError={(e) => {
          // Fallback to PNG if SVG fails
          const target = e.currentTarget;
          if (target.src.endsWith('/app-icon.svg')) {
            target.src = '/icon-192.png';
          }
        }}
      />
    </div>
  );
};
