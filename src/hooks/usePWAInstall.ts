import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSInstruction, setShowIOSInstruction] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      return isStandaloneMedia || isNavStandalone;
    };

    setIsStandalone(checkStandalone());

    // Check if device is iOS (iPhone/iPad/iPod)
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    // Listen for beforeinstallprompt event (Android Chrome, Windows Edge/Chrome, macOS Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowIOSInstruction(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsStandalone(true);
        }
        return 'prompted';
      } catch (error) {
        console.error('Error triggering install prompt:', error);
        return 'error';
      }
    } else if (isIOS && !isStandalone) {
      setShowIOSInstruction(true);
      return 'ios';
    }
    return 'unavailable';
  };

  // The button should be shown if not standalone AND (we have a prompt OR we are on iOS)
  const isInstallable = !isStandalone && (deferredPrompt !== null || isIOS);

  return {
    isInstallable,
    isStandalone,
    hasDeferredPrompt: deferredPrompt !== null,
    installApp,
    showIOSInstruction,
    closeIOSInstruction: () => setShowIOSInstruction(false)
  };
}
