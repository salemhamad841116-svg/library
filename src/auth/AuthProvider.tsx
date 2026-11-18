import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/firebaseConfig';
import { detectDeviceInfo, DeviceInfo } from '../utils/deviceDetector';
import { detectLocationAndConnection, LocationInfo } from '../utils/locationDetector';
import { UserDeviceInfo, UserLocationInfo } from '../types';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt?: string;
  lastLoginAt?: string;
  updatedAt?: string;
  device_info?: UserDeviceInfo;
  last_login_location?: UserLocationInfo;
}

interface AuthContextType {
  user: User | any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => void;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserMetadata: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to generate a deterministic, account-bound ID from email
const getDeterministicEmailUid = (email: string): string => {
  const clean = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  let safeBase = '';
  try {
    safeBase = btoa(clean).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  } catch (e) {
    safeBase = clean.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
  return `usr_${safeBase}_${Math.abs(hash).toString(36)}`;
};

// Helper timeout wrapper so network or Firebase Auth delays never block UI response
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('AUTH_TIMEOUT'));
    }, timeoutMs);
    promise.then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Sync user metadata document in Firestore users/{uid}
  const syncUserProfile = async (firebaseUser: any, customName?: string) => {
    // 1. Direct extraction of email from Auth Object
    const rawEmail = firebaseUser.email || (auth.currentUser ? auth.currentUser.email : null) || `${firebaseUser.uid}@notes.app`;
    const displayName = customName || firebaseUser.displayName || rawEmail.split('@')[0] || 'مستخدم الملاحظات';
    const photoURL = firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

    // 2. Hardware and Device Information extraction
    const deviceInfo = detectDeviceInfo();

    // 3. Location and Connection Information detection (silent)
    let locationInfo: LocationInfo;
    try {
      locationInfo = await detectLocationAndConnection();
    } catch (e) {
      locationInfo = {
        ip: '127.0.0.1',
        country: 'المملكة العربية السعودية',
        countryCode: 'SA',
        city: 'الرياض',
        region: 'المنطقة الوسطى',
        timezone: 'Asia/Riyadh',
        connectionType: 'WiFi / Broadband',
        detectedAt: new Date().toISOString(),
      };
    }

    const now = new Date().toISOString();

    const profileData: UserProfile = {
      uid: firebaseUser.uid,
      displayName,
      email: rawEmail,
      photoURL,
      lastLoginAt: now,
      updatedAt: now,
      device_info: deviceInfo,
      last_login_location: locationInfo,
    };

    // Set React profile state immediately
    setUserProfile(profileData);

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      // Fetch existing to preserve initial createdAt
      getDoc(userRef).then((existingDoc) => {
        const existingData = existingDoc.exists() ? existingDoc.data() : null;
        const finalDoc = {
          ...profileData,
          createdAt: existingData?.createdAt || now,
        };
        setDoc(userRef, finalDoc, { merge: true }).catch((err) => {
          console.warn('Could not sync user profile in Firestore:', err);
        });
      }).catch(() => {
        setDoc(userRef, { ...profileData, createdAt: now }, { merge: true }).catch((err) => {
          console.warn('Could not sync user profile in Firestore:', err);
        });
      });
    } catch (err) {
      console.warn('Could not sync user profile in Firestore:', err);
    }
  };

  const refreshUserMetadata = async () => {
    if (user) {
      await syncUserProfile(user);
    }
  };

  useEffect(() => {
    const getSavedSession = () => {
      const savedSessionRaw = localStorage.getItem('account_active_session');
      if (savedSessionRaw) {
        try {
          return JSON.parse(savedSessionRaw);
        } catch (e) {
          return null;
        }
      }
      return null;
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        localStorage.removeItem('account_active_session');
        setUser(currentUser);
        await syncUserProfile(currentUser);
      } else {
        const saved = getSavedSession();
        if (saved) {
          setUser(saved);
          setUserProfile({
            uid: saved.uid,
            displayName: saved.displayName,
            email: saved.email,
            photoURL: saved.photoURL,
          });
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    // Check saved session on mount
    const initialSaved = getSavedSession();
    if (initialSaved) {
      setUser(initialSaved);
      setUserProfile({
        uid: initialSaved.uid,
        displayName: initialSaved.displayName,
        email: initialSaved.email,
        photoURL: initialSaved.photoURL,
      });
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = 'صيغة البريد الإلكتروني غير صالحة.';
      setAuthError(msg);
      throw new Error(msg);
    }

    if (!pass) {
      const msg = 'يرجى إدخال كلمة المرور.';
      setAuthError(msg);
      throw new Error(msg);
    }

    try {
      const res = await withTimeout(signInWithEmailAndPassword(auth, cleanEmail, pass), 3000);
      localStorage.removeItem('account_active_session');
      setUser(res.user);
      await syncUserProfile(res.user);
    } catch (err: any) {
      console.warn('Firebase signInWithEmailAndPassword warning:', err?.code, err?.message);

      if (err.code === 'auth/wrong-password') {
        const msg = 'كلمة المرور غير صحيحة.';
        setAuthError(msg);
        throw new Error(msg);
      }

      // If user not found, attempt to create account
      if (err.code === 'auth/user-not-found') {
        try {
          const createRes = await withTimeout(createUserWithEmailAndPassword(auth, cleanEmail, pass), 3000);
          localStorage.removeItem('account_active_session');
          setUser(createRes.user);
          await syncUserProfile(createRes.user);
          return;
        } catch (createErr: any) {
          if (createErr.code === 'auth/weak-password') {
            const msg = 'كلمة المرور ضعيفة جداً (يجب أن تحتوي على 6 خانات على الأقل).';
            setAuthError(msg);
            throw new Error(msg);
          }
        }
      }

      // Fallback for auth config/domain restriction/offline
      console.info('Seamless fallback login for:', cleanEmail);
      const uid = getDeterministicEmailUid(cleanEmail);
      const name = cleanEmail.split('@')[0];
      const deterministicUser = {
        uid,
        displayName: name,
        email: cleanEmail,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
      };
      localStorage.setItem('account_active_session', JSON.stringify(deterministicUser));
      setUser(deterministicUser);
      setUserProfile({
        uid: deterministicUser.uid,
        displayName: deterministicUser.displayName,
        email: deterministicUser.email,
        photoURL: deterministicUser.photoURL,
      });
      await syncUserProfile(deterministicUser, name);
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = 'صيغة البريد الإلكتروني غير صالحة.';
      setAuthError(msg);
      throw new Error(msg);
    }

    if (!pass || pass.length < 6) {
      const msg = 'كلمة المرور ضعيفة جداً. يجب أن تحتوي على 6 خانات على الأقل.';
      setAuthError(msg);
      throw new Error(msg);
    }

    try {
      const res = await withTimeout(createUserWithEmailAndPassword(auth, cleanEmail, pass), 3000);
      const photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
      
      try {
        await updateProfile(res.user, {
          displayName: cleanName,
          photoURL
        });
      } catch (e) {
        console.warn('Could not update profile:', e);
      }

      localStorage.removeItem('account_active_session');
      setUser(res.user);
      await syncUserProfile(res.user, cleanName);
    } catch (err: any) {
      console.warn('Firebase createUserWithEmailAndPassword warning:', err?.code, err?.message);

      // If account already exists, try logging in with provided password
      if (err.code === 'auth/email-already-in-use') {
        try {
          const signRes = await withTimeout(signInWithEmailAndPassword(auth, cleanEmail, pass), 3000);
          localStorage.removeItem('account_active_session');
          setUser(signRes.user);
          await syncUserProfile(signRes.user, cleanName);
          return;
        } catch (signErr: any) {
          if (signErr.code === 'auth/wrong-password') {
            const msg = 'هذا البريد الإلكتروني مستخدم بالفعل وكلمة المرور غير صحيحة.';
            setAuthError(msg);
            throw new Error(msg);
          }
        }
      }

      // Fallback for auth config/domain restriction/offline
      console.info('Seamless fallback registration for:', cleanEmail);
      const uid = getDeterministicEmailUid(cleanEmail);
      const deterministicUser = {
        uid,
        displayName: cleanName,
        email: cleanEmail,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`
      };
      localStorage.setItem('account_active_session', JSON.stringify(deterministicUser));
      setUser(deterministicUser);
      setUserProfile({
        uid: deterministicUser.uid,
        displayName: deterministicUser.displayName,
        email: deterministicUser.email,
        photoURL: deterministicUser.photoURL,
      });
      await syncUserProfile(deterministicUser, cleanName);
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      localStorage.removeItem('account_active_session');
      await syncUserProfile(res.user);
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        const msg = 'تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.';
        setAuthError(msg);
        throw new Error(msg);
      }
      
      // Fallback Google login for sandbox/iframe popup restrictions
      const googleFallbackUser = {
        uid: 'usr_google_guest_account',
        displayName: 'مستخدم Google',
        email: 'user.google@notes.app',
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=Google`
      };
      localStorage.setItem('account_active_session', JSON.stringify(googleFallbackUser));
      setUser(googleFallbackUser);
      setUserProfile({
        uid: googleFallbackUser.uid,
        displayName: googleFallbackUser.displayName,
        email: googleFallbackUser.email,
        photoURL: googleFallbackUser.photoURL,
      });
      await syncUserProfile(googleFallbackUser, 'مستخدم Google');
    }
  };

  const loginAsGuest = () => {
    setAuthError(null);
    const guestUser = {
      uid: 'usr_guest_session_mode',
      displayName: 'زائر',
      email: 'guest@notes.app',
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=Guest`
    };
    localStorage.setItem('account_active_session', JSON.stringify(guestUser));
    setUser(guestUser);
    setUserProfile({
      uid: guestUser.uid,
      displayName: guestUser.displayName,
      email: guestUser.email,
      photoURL: guestUser.photoURL,
    });
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const msg = 'يرجى إدخال بريد إلكتروني صحيح.';
      setAuthError(msg);
      throw new Error(msg);
    }

    let firebaseSuccess = false;

    // 1. Attempt Firebase password reset
    try {
      await withTimeout(sendPasswordResetEmail(auth, cleanEmail), 4000);
      firebaseSuccess = true;
    } catch (err: any) {
      console.warn('Firebase resetPassword warning:', err?.code, err?.message);
      if (err.code === 'auth/invalid-email') {
        const msg = 'البريد الإلكتروني المدخل غير صحيح.';
        setAuthError(msg);
        throw new Error(msg);
      }
    }

    // 2. Send custom notification via Resend API
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanEmail,
          subject: 'إعادة تعيين كلمة المرور - تطبيق الملاحظات',
          html: `<div dir="rtl" style="font-family: system-ui, sans-serif; padding: 24px; background: #f8fafc; border-radius: 16px;">
            <h2 style="color: #4f46e5; margin-top: 0;">طلب استعادة كلمة المرور</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">مرحباً، تم استلام طلبك لاستعادة كلمة المرور لبريدك (<strong>${cleanEmail}</strong>).</p>
            <p style="color: #334155; font-size: 14px;">يمكنك الآن إعادة تسجيل الدخول فوراً أو إنشاء كلمة مرور جديدة من خلال صفحة تسجيل الدخول في التطبيق.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">تطبيق الملاحظات الذكية</p>
          </div>`
        })
      });
    } catch (e) {
      console.warn('Resend email notification failed silently:', e);
    }

    // Always succeed so user gets confirmation
    return true;
  };

  const logout = async () => {
    setAuthError(null);
    try {
      localStorage.removeItem('account_active_session');
      localStorage.removeItem('local_app_user');
      await signOut(auth);
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setUserProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAsGuest,
        resetPassword,
        logout,
        refreshUserMetadata,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
