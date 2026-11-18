import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  fetchRemoteVersionManifest, 
  getInstalledVersion, 
  setInstalledVersion,
  isNewerVersion, 
  applyOTAUpdate, 
  triggerEmergencyRollback, 
  getRollbackNotice,
  getOTASettings,
  OTAVersionManifest
} from '../services/otaUpdateService';

export function useOTAUpdates() {
  const [currentVersion, setCurrentVersion] = useState<string>(getInstalledVersion());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [updateManifest, setUpdateManifest] = useState<OTAVersionManifest | null>(null);
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState<boolean>(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<Date | null>(null);
  const [showRollbackNotice, setShowRollbackNotice] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Check for updates against remote /version.json and SW
  const checkForUpdates = useCallback(async (silent = true) => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      // 1. Check Service Worker registration update safely
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            registrationRef.current = reg;
            await reg.update().catch((swErr) => {
              console.warn('[OTA] SW update probe warning:', swErr);
            });
          }
        } catch (swErr) {
          console.warn('[OTA] SW registration access warning:', swErr);
        }
      }

      // 2. Query remote version manifest
      const manifest = await fetchRemoteVersionManifest();
      setLastCheckedTime(new Date());

      if (manifest) {
        const local = getInstalledVersion();
        const newer = isNewerVersion(manifest.version, local);

        if (newer) {
          console.log('[OTA] New version discovered:', manifest.version, 'Local version:', local);
          setUpdateManifest(manifest);
          setHasUpdate(true);
          setIsUpdateDownloaded(true);
        } else {
          setHasUpdate(false);
          setUpdateManifest(null);
        }
      }
    } catch (err) {
      console.warn('[OTA] Check for updates encountered an error:', err);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Apply update immediately
  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);
    const targetVersion = updateManifest?.version || 'latest';
    try {
      await applyOTAUpdate(targetVersion);
    } catch (e) {
      console.warn('[OTA] Apply update error:', e);
      setIsUpdating(false);
    }
  }, [updateManifest]);

  // Emergency rollback
  const rollbackToSafeVersion = useCallback(async (reason?: string) => {
    try {
      await triggerEmergencyRollback(reason);
    } catch (e) {
      console.warn('[OTA] Emergency rollback error:', e);
    }
  }, []);

  // Listen to Service Worker messages and registration lifecycle
  useEffect(() => {
    // Check if previous session just completed an auto-rollback
    if (getRollbackNotice()) {
      setShowRollbackNotice(true);
    }

    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessages = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'OTA_SW_INSTALLED' || event.data.type === 'OTA_SW_ACTIVATED') {
        console.log('[OTA Hook] SW Message received:', event.data);
        setIsUpdateDownloaded(true);
        checkForUpdates(true).catch(() => {});
      }
    };

    try {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages);

      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (!reg) return;
          registrationRef.current = reg;

          // Detect waiting worker (new bundle ready in background)
          if (reg.waiting) {
            setIsUpdateDownloaded(true);
            checkForUpdates(true).catch(() => {});
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[OTA] New content is available and cached in background.');
                  setIsUpdateDownloaded(true);
                  checkForUpdates(true).catch(() => {});
                }
              });
            }
          });
        })
        .catch((swErr) => {
          console.warn('[OTA Hook] SW getRegistration error caught:', swErr);
        });
    } catch (e) {
      console.warn('[OTA Hook] Service Worker event listener error:', e);
    }

    return () => {
      try {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessages);
      } catch {
        // Ignore
      }
    };
  }, [checkForUpdates]);

  // On App Launch: Check for updates silently in background (if enabled in settings)
  useEffect(() => {
    const settings = getOTASettings();
    if (settings.autoCheckOnLaunch) {
      // Small timeout to allow critical initial boot to finish seamlessly
      const timer = setTimeout(() => {
        checkForUpdates(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [checkForUpdates]);

  return {
    currentVersion,
    isChecking,
    hasUpdate,
    updateManifest,
    isUpdateDownloaded,
    lastCheckedTime,
    showRollbackNotice,
    isUpdating,
    dismissRollbackNotice: () => setShowRollbackNotice(false),
    checkForUpdates,
    applyUpdate,
    rollbackToSafeVersion
  };
}
