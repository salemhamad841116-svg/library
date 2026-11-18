/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache
} from 'firebase/firestore';

const getEnv = (val: string | undefined, fallback: string): string => {
  return val && val.trim().length > 0 ? val.trim() : fallback;
};

// Configuration for Firebase Auth and Firestore Database
export const firebaseConfig = {
  apiKey: getEnv(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyCWeW3zRr1Bd30DnRy2SNN9bF1BNPS45WI"),
  authDomain: getEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "studio-7402484998-5170a.firebaseapp.com"),
  projectId: getEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "studio-7402484998-5170a"),
  storageBucket: getEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "studio-7402484998-5170a.firebasestorage.app"),
  messagingSenderId: getEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "566124283185"),
  appId: getEnv(import.meta.env.VITE_FIREBASE_APP_ID, "1:566124283185:web:4b48c0f9b988bc7053dc10")
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with robust multi-tab offline persistence & auto long-polling for iframes/proxies
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;
export const googleProvider = new GoogleAuthProvider();

// Custom Google provider setup
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;

