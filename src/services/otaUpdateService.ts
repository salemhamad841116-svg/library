export interface OTAVersionManifest {
  version: string;
  buildNumber: number;
  releaseChannel: string;
  releaseDate: string;
  minSupportedVersion?: string;
  title: string;
  changelog: string[];
  requiresNativeUpdate: boolean;
  patchType: 'ui_logic_bundle' | 'native_app' | 'critical_hotfix';
}

export interface OTASettings {
  autoCheckOnLaunch: boolean;
  autoApplyOnRestart: boolean;
  notifyOnBackgroundDownload: boolean;
  releaseChannel: 'production' | 'beta';
}

export interface UpdateHistoryItem {
  version: string;
  appliedAt: string;
  status: 'applied' | 'rolled_back' | 'skipped';
  title: string;
}

const LOCAL_VERSION_KEY = 'ota_installed_version';
const CRASH_COUNT_KEY = 'ota_boot_crash_count';
const LAST_BOOT_TIMESTAMP_KEY = 'ota_last_boot_time';
const OTA_SETTINGS_KEY = 'ota_app_settings';
const OTA_HISTORY_KEY = 'ota_update_history';
const ROLLBACK_ALERT_KEY = 'ota_rollback_alert_shown';

export const CURRENT_BUILD_VERSION = '2.5.0';

export function getInstalledVersion(): string {
  try {
    return localStorage.getItem(LOCAL_VERSION_KEY) || CURRENT_BUILD_VERSION;
  } catch {
    return CURRENT_BUILD_VERSION;
  }
}

export function setInstalledVersion(ver: string): void {
  try {
    localStorage.setItem(LOCAL_VERSION_KEY, ver);
  } catch (e) {
    console.warn('Failed to save installed version in storage', e);
  }
}

export function getOTASettings(): OTASettings {
  const defaults: OTASettings = {
    autoCheckOnLaunch: true,
    autoApplyOnRestart: true,
    notifyOnBackgroundDownload: true,
    releaseChannel: 'production'
  };

  try {
    const raw = localStorage.getItem(OTA_SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveOTASettings(settings: OTASettings): void {
  try {
    localStorage.setItem(OTA_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save OTA settings', e);
  }
}

export function getUpdateHistory(): UpdateHistoryItem[] {
  try {
    const raw = localStorage.getItem(OTA_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [
      {
        version: '2.5.0',
        appliedAt: new Date().toISOString(),
        status: 'applied',
        title: 'إصدار OTA الحي: شريط التنقل السفلي والتزامن الفوري'
      },
      {
        version: '2.4.0',
        appliedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        status: 'applied',
        title: 'نظام المصادقة والتخزين المحلي المتقدم'
      }
    ];
  } catch {
    return [];
  }
}

export function addUpdateHistoryItem(item: UpdateHistoryItem): void {
  try {
    const history = getUpdateHistory();
    history.unshift(item);
    localStorage.setItem(OTA_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    console.warn('Failed to append to update history', e);
  }
}

// Compare semantic versions (e.g. "2.5.0" vs "2.4.0")
export function isNewerVersion(remote: string, local: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0);
  const [rMajor, rMinor, rPatch] = parse(remote);
  const [lMajor, lMinor, lPatch] = parse(local);

  if (rMajor > lMajor) return true;
  if (rMajor === lMajor && rMinor > lMinor) return true;
  if (rMajor === lMajor && rMinor === lMinor && rPatch > lPatch) return true;
  return false;
}

// Fetch Remote Version Manifest from /version.json
export async function fetchRemoteVersionManifest(): Promise<OTAVersionManifest | null> {
  try {
    const response = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });

    if (!response.ok) {
      console.warn('[OTA] Remote version manifest responded with status:', response.status);
      return null;
    }

    const manifest: OTAVersionManifest = await response.json();
    return manifest;
  } catch (error) {
    console.warn('[OTA] Failed to fetch remote version manifest:', error);
    return null;
  }
}

// Apply OTA Update: tell SW to skipWaiting, update storage, and reload
export async function applyOTAUpdate(newVersion?: string): Promise<void> {
  console.log('[OTA] Applying live update to version:', newVersion || 'latest');
  
  if (newVersion) {
    setInstalledVersion(newVersion);
    addUpdateHistoryItem({
      version: newVersion,
      appliedAt: new Date().toISOString(),
      status: 'applied',
      title: `تحديث OTA تم تطبيقه بنجاح (v${newVersion})`
    });
  }

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  // Clear transient error counters
  resetCrashCounter();

  // Reload the client to activate the newly cached bundle
  setTimeout(() => {
    window.location.reload();
  }, 150);
}

// Emergency Rollback: Purge Service Worker & All Caches, restore safe version
export async function triggerEmergencyRollback(reason = 'فشل في الاستقرار أو طلب تراجع يدوي'): Promise<void> {
  console.warn('[OTA-CRASHGUARD] Initiating emergency rollback due to:', reason);

  try {
    // 1. Purge all CacheStorage
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      console.log('[OTA-CRASHGUARD] Purged all browser caches.');
    }

    // 2. Unregister Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
      console.log('[OTA-CRASHGUARD] Unregistered active service workers.');
    }

    // 3. Reset version flag & record rollback history
    const fallbackVersion = '2.4.0-stable';
    setInstalledVersion(fallbackVersion);
    sessionStorage.setItem(ROLLBACK_ALERT_KEY, 'true');

    addUpdateHistoryItem({
      version: fallbackVersion,
      appliedAt: new Date().toISOString(),
      status: 'rolled_back',
      title: `تراجع تلقائي آمن إلى النسخة المستقرة السابقة: ${reason}`
    });

    resetCrashCounter();

    // 4. Force reload from network without cache
    window.location.href = window.location.pathname + '?rollback=' + Date.now();
  } catch (err) {
    console.error('[OTA-CRASHGUARD] Rollback encountered error:', err);
    window.location.reload();
  }
}

// Crash-Loop Detection & Auto-Rollback Guard
export function initCrashGuard(): void {
  try {
    const now = Date.now();
    const lastBoot = parseInt(sessionStorage.getItem(LAST_BOOT_TIMESTAMP_KEY) || '0', 10);
    sessionStorage.setItem(LAST_BOOT_TIMESTAMP_KEY, now.toString());

    // Listen for uncaught fatal runtime errors during initial launch
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      let errorMsg = 'Unknown Error';
      if ('message' in event && typeof event.message === 'string') {
        errorMsg = event.message;
      } else if ('reason' in event && event.reason) {
        if (typeof event.reason === 'string') {
          errorMsg = event.reason;
        } else if (event.reason instanceof Error) {
          errorMsg = event.reason.message || event.reason.name;
        } else if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
          errorMsg = String(event.reason.message);
        } else {
          try {
            errorMsg = JSON.stringify(event.reason);
          } catch {
            errorMsg = String(event.reason);
          }
        }
      }

      // Ignore benign / non-fatal network noise, cancelled promises, Vite HMR, and sandbox warnings
      const lower = errorMsg.toLowerCase();
      const isBenign = (
        lower.includes('websocket') ||
        lower.includes('vite') ||
        lower.includes('resizeobserver') ||
        lower.includes('script error') ||
        lower.includes('aborted') ||
        lower.includes('abort') ||
        lower.includes('serviceworker') ||
        lower.includes('service worker') ||
        lower.includes('auth_timeout') ||
        lower.includes('failed to fetch') ||
        lower.includes('network') ||
        lower.includes('load failed') ||
        lower.includes('the user aborted a request') ||
        lower.includes('canceled') ||
        lower.includes('cancelled')
      );

      if (isBenign) {
        return;
      }

      console.error('[CrashGuard] Caught uncaught boot error:', errorMsg);

      // Increment crash counter only for genuine fatal runtime crashes
      const currentCrashes = parseInt(localStorage.getItem(CRASH_COUNT_KEY) || '0', 10) + 1;
      localStorage.setItem(CRASH_COUNT_KEY, currentCrashes.toString());

      // If 3 consecutive crashes happen within boot threshold -> Trigger Auto-Rollback!
      if (currentCrashes >= 3) {
        console.error('[CrashGuard] 3 consecutive boot crashes detected! Triggering Auto-Rollback...');
        triggerEmergencyRollback('3 consecutive boot crashes detected');
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    // If app runs successfully for 3 seconds, mark boot as healthy and clear crash count
    setTimeout(() => {
      resetCrashCounter();
    }, 3000);
  } catch (e) {
    console.warn('CrashGuard init error:', e);
  }
}

export function resetCrashCounter(): void {
  try {
    localStorage.setItem(CRASH_COUNT_KEY, '0');
  } catch {
    // Ignore
  }
}

export function getRollbackNotice(): boolean {
  try {
    const hasNotice = sessionStorage.getItem(ROLLBACK_ALERT_KEY) === 'true';
    if (hasNotice) {
      sessionStorage.removeItem(ROLLBACK_ALERT_KEY);
    }
    return hasNotice;
  } catch {
    return false;
  }
}
