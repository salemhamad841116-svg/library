/**
 * Device and Environment Detection Utility
 * Extracts detailed device specifications, OS, Browser, and hardware profile
 */

export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceModel: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  screenResolution: string;
  pixelRatio: number;
  isTouchDevice: boolean;
  isPWA: boolean;
  language: string;
  timeZone: string;
  platform: string;
  userAgent: string;
  detectedAt: string;
}

export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'desktop',
      deviceModel: 'Server Environment',
      os: 'Unknown',
      osVersion: '1.0',
      browser: 'Node.js',
      browserVersion: '1.0',
      screenResolution: '1920x1080',
      pixelRatio: 1,
      isTouchDevice: false,
      isPWA: false,
      language: 'ar-SA',
      timeZone: 'UTC',
      platform: 'Server',
      userAgent: 'Server',
      detectedAt: new Date().toISOString(),
    };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // 1. Detect Operating System & Version
  let os = 'Unknown';
  let osVersion = '';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS (\d+[_\d]*)/i);
    if (match && match[1]) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android (\d+(\.\d+)*)/i);
    if (match && match[1]) {
      osVersion = match[1];
    }
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[_\d]*)/i);
    if (match && match[1]) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    if (/Windows NT 10.0/i.test(ua)) osVersion = '10 / 11';
    else if (/Windows NT 6.3/i.test(ua)) osVersion = '8.1';
    else if (/Windows NT 6.2/i.test(ua)) osVersion = '8';
    else if (/Windows NT 6.1/i.test(ua)) osVersion = '7';
  } else if (/CrOS/i.test(ua)) {
    os = 'Chrome OS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // 2. Detect Browser & Version
  let browser = 'Unknown';
  let browserVersion = '';

  if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
    const match = ua.match(/SamsungBrowser\/(\d+(\.\d+)*)/i);
    if (match) browserVersion = match[1];
  } else if (/Edg\//i.test(ua) || /Edge\//i.test(ua)) {
    browser = 'Microsoft Edge';
    const match = ua.match(/Edg?\/(\d+(\.\d+)*)/i);
    if (match) browserVersion = match[1];
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    browser = 'Opera';
    const match = ua.match(/(?:OPR|Opera)\/(\d+(\.\d+)*)/i);
    if (match) browserVersion = match[1];
  } else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
    browser = 'Google Chrome';
    const match = ua.match(/Chrome\/(\d+(\.\d+)*)/i);
    if (match) browserVersion = match[1];
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Apple Safari';
    const match = ua.match(/Version\/(\d+(\.\d+)*)/i);
    if (match) browserVersion = match[1];
  } else if (/Firefox/i.test(ua)) {
    browser = 'Mozilla Firefox';
    const match = ua.match(/Firefox\/(\d+(\.\d+)*)/i);
    if (match) browserVersion = match[1];
  }

  // 3. Detect Device Type & Model
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let deviceModel = 'Personal Computer';

  const isTablet = /(iPad|Tablet|(Android(?!.*Mobile))|(Silk\/.*))/i.test(ua);
  const isMobile = /Mobile|iPhone|Android|iPod|BlackBerry|IEMobile|Silk/i.test(ua);

  if (isTablet) {
    deviceType = 'tablet';
    if (/iPad/i.test(ua)) deviceModel = 'Apple iPad';
    else deviceModel = 'Android Tablet';
  } else if (isMobile) {
    deviceType = 'mobile';
    if (/iPhone/i.test(ua)) deviceModel = 'Apple iPhone';
    else if (/Samsung/i.test(ua)) deviceModel = 'Samsung Galaxy';
    else if (/Pixel/i.test(ua)) deviceModel = 'Google Pixel';
    else if (/Xiaomi|Redmi/i.test(ua)) deviceModel = 'Xiaomi Device';
    else if (/Huawei|Honor/i.test(ua)) deviceModel = 'Huawei Device';
    else deviceModel = 'Mobile Smartphone';
  } else {
    deviceType = 'desktop';
    if (os === 'macOS') deviceModel = 'Apple Mac';
    else if (os === 'Windows') deviceModel = 'Windows PC';
    else if (os === 'Linux') deviceModel = 'Linux Workstation';
    else deviceModel = 'Desktop Computer';
  }

  // 4. Hardware & Display Profile
  const screenResolution = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;
  const pixelRatio = window.devicePixelRatio || 1;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // PWA standalone check
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;

  // Language & Timezone
  const language = navigator.language || 'ar';
  let timeZone = 'UTC';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    timeZone = 'UTC';
  }

  return {
    deviceType,
    deviceModel,
    os,
    osVersion: osVersion || 'Latest',
    browser,
    browserVersion: browserVersion || 'Latest',
    screenResolution,
    pixelRatio,
    isTouchDevice,
    isPWA,
    language,
    timeZone,
    platform: platform || os,
    userAgent: ua,
    detectedAt: new Date().toISOString(),
  };
}
