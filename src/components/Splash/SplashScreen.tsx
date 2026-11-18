import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number; // Minimum display time in ms (default 1200ms)
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  minDuration = 1200 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [minDurationPassed, setMinDurationPassed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Minimum wait time
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDurationPassed(true);
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  // Fallback: If image takes more than 4 seconds to load, proceed anyway
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!imageLoaded) setImageLoaded(true);
    }, 4000);
    return () => clearTimeout(fallbackTimer);
  }, [imageLoaded]);

  // Check if image is already loaded (from cache)
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  // When both conditions are met, fade out
  useEffect(() => {
    if (minDurationPassed && imageLoaded) {
      setIsFading(true);
      const finishTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 400); // 400ms fade transition
      return () => clearTimeout(finishTimer);
    }
  }, [minDurationPassed, imageLoaded, onFinish]);

  if (!isVisible) return null;

  return (
    <div 
      id="app-splash-screen"
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        zIndex: 99999
      }}
      className={`fixed inset-0 flex flex-col items-center justify-center select-none transition-opacity duration-400 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center p-6 max-w-sm w-full">
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center">
          <img
            ref={imageRef}
            src="/app-icon.svg"
            alt="شعار التطبيق"
            className={`w-full h-full object-contain transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
               aspectRatio: '1/1', 
               objectFit: 'contain',
              filter: 'none'
            }}
            referrerPolicy="no-referrer"
            loading="eager"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.endsWith('/app-icon.svg')) {
                target.src = '/library-bg.png';
              } else {
                setImageLoaded(true);
              }
            }}
          />
        </div>
        
        <div className="mt-6 text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-sans">
            Library
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            مساحتك الذكية لتدوين وتنظيم الأفكار
          </p>
        </div>

        <div className="mt-8 w-36 sm:w-44 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full bg-slate-900 rounded-full transition-all duration-300 origin-right ${imageLoaded && minDurationPassed ? 'w-full' : 'animate-pulse w-3/4'}`} />
        </div>
      </div>
    </div>
  );
};
