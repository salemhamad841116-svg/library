import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initCrashGuard } from './services/otaUpdateService';

// Initialize OTA Crash-Guard and Auto-Rollback Safety Mechanism
initCrashGuard();

// Register PWA Service Worker for OTA Updates & Offline Persistence
try {
  if ('serviceWorker' in navigator && typeof navigator.serviceWorker.register === 'function') {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[OTA-SW] Service Worker registered successfully with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('[OTA-SW] Service Worker registration notice:', error);
          });
      } catch (e) {
        console.warn('[OTA-SW] Service Worker register call notice:', e);
      }
    });
  }
} catch (e) {
  console.warn('[OTA-SW] Service Worker unavailable in current environment:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

