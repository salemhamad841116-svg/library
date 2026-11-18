import { 
  AdminUserItem, 
  AdminNoteItem, 
  AuditLogItem, 
  SystemNotificationItem, 
  SystemSettings, 
  AdminSession, 
  SubscriptionPlan,
  AdminRole 
} from '../types/admin';

const ADMIN_USERS_KEY = 'notebook_admin_users_v1';
const ADMIN_NOTES_KEY = 'notebook_admin_notes_v1';
const ADMIN_LOGS_KEY = 'notebook_admin_logs_v1';
const ADMIN_NOTIFS_KEY = 'notebook_admin_notifs_v1';
const ADMIN_SETTINGS_KEY = 'notebook_admin_settings_v1';
const ADMIN_SESSION_KEY = 'notebook_admin_session_v1';
const ADMIN_PLANS_KEY = 'notebook_admin_plans_v1';

// Seed Initial Users
const SEED_USERS: AdminUserItem[] = [
  {
    id: 'usr-001',
    name: 'سالم أحمد',
    email: 'salem@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: 'admin',
    status: 'active',
    subscription: 'enterprise',
    registrationDate: '2025-01-10T10:00:00.000Z',
    lastLogin: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    notesCount: 24,
    filesCount: 12,
    storageUsedMB: 48.5,
    devicesCount: 3,
    ipAddress: '197.35.112.45',
    lastDevice: 'MacBook Pro (macOS 14.2)',
    language: 'العربية (ar)',
    timezone: 'Asia/Riyadh (GMT+3)'
  },
  {
    id: 'usr-002',
    name: 'سارة خالد',
    email: 'sara.khalid@domain.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    role: 'user',
    status: 'active',
    subscription: 'pro',
    registrationDate: '2025-02-14T14:30:00.000Z',
    lastLogin: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    notesCount: 15,
    filesCount: 8,
    storageUsedMB: 19.2,
    devicesCount: 2,
    ipAddress: '156.204.89.12',
    lastDevice: 'iPhone 15 Pro (iOS 17)',
    language: 'العربية (ar)',
    timezone: 'Asia/Dubai (GMT+4)'
  },
  {
    id: 'usr-003',
    name: 'محمد علي العمراني',
    email: 'm.omrani@tech.sa',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    role: 'vip',
    status: 'active',
    subscription: 'pro',
    registrationDate: '2025-03-01T08:15:00.000Z',
    lastLogin: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
    notesCount: 42,
    filesCount: 25,
    storageUsedMB: 112.4,
    devicesCount: 4,
    ipAddress: '213.166.130.5',
    lastDevice: 'Windows 11 Desktop (Chrome 122)',
    language: 'العربية (ar)',
    timezone: 'Asia/Riyadh (GMT+3)'
  },
  {
    id: 'usr-004',
    name: 'نورة المنصور',
    email: 'noura.almansoor@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    role: 'user',
    status: 'active',
    subscription: 'free',
    registrationDate: '2025-04-05T18:20:00.000Z',
    lastLogin: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
    notesCount: 6,
    filesCount: 1,
    storageUsedMB: 3.1,
    devicesCount: 1,
    ipAddress: '188.49.20.101',
    lastDevice: 'iPad Air (iPadOS 17)',
    language: 'العربية (ar)',
    timezone: 'Asia/Kuwait (GMT+3)'
  },
  {
    id: 'usr-005',
    name: 'عبدالله يوسف',
    email: 'abdullah.youssef@company.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    role: 'user',
    status: 'suspended',
    subscription: 'free',
    registrationDate: '2025-04-18T11:45:00.000Z',
    lastLogin: new Date(Date.now() - 1000 * 3600 * 120).toISOString(),
    notesCount: 2,
    filesCount: 0,
    storageUsedMB: 0.8,
    devicesCount: 1,
    ipAddress: '41.233.15.88',
    lastDevice: 'Android Galaxy S23',
    language: 'English (en)',
    timezone: 'Africa/Cairo (GMT+2)'
  },
  {
    id: 'usr-006',
    name: 'مريم الزهراني',
    email: 'maryam.zahrani@edu.sa',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    role: 'user',
    status: 'active',
    subscription: 'pro',
    registrationDate: '2025-05-12T09:10:00.000Z',
    lastLogin: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    notesCount: 19,
    filesCount: 14,
    storageUsedMB: 38.6,
    devicesCount: 2,
    ipAddress: '82.164.91.33',
    lastDevice: 'MacBook Air M2',
    language: 'العربية (ar)',
    timezone: 'Asia/Riyadh (GMT+3)'
  }
];

// Seed Initial Notes
const SEED_NOTES: AdminNoteItem[] = [
  {
    id: 'note-admin-01',
    title: 'دليل البدء والتخفيضات 🚀',
    ownerId: 'usr-001',
    ownerName: 'سالم أحمد',
    ownerEmail: 'salem@example.com',
    createdAt: '2025-01-10T10:15:00.000Z',
    updatedAt: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
    sizeKB: 14.2,
    childrenCount: 3,
    tags: ['دليل', 'إدارة'],
    status: 'active',
    content: '<h1>خطط تطوير التطبيق وملاحظات الإدارة</h1><p>مرحباً بك في نظام إدارة الملاحظات المتقدم.</p>',
    isPinned: true,
    isFavorite: true
  },
  {
    id: 'note-admin-02',
    title: 'تخطيط الاستراتيجية التسويقية Q3',
    ownerId: 'usr-002',
    ownerName: 'سارة خالد',
    ownerEmail: 'sara.khalid@domain.com',
    createdAt: '2025-02-15T11:20:00.000Z',
    updatedAt: new Date(Date.now() - 1000 * 3600 * 12).toISOString(),
    sizeKB: 28.5,
    childrenCount: 5,
    tags: ['تسويق', 'استراتيجية'],
    status: 'active',
    content: '<h2>أهداف الربع الثالث</h2><ul><li>زيادة عدد الملاحظات اليومية</li><li>تحسين سرعة البحث</li></ul>',
    isPinned: true,
    isFavorite: false
  },
  {
    id: 'note-admin-03',
    title: 'معادلات الفيزياء والرياضيات 📐',
    ownerId: 'usr-003',
    ownerName: 'محمد علي العمراني',
    ownerEmail: 'm.omrani@tech.sa',
    createdAt: '2025-03-02T14:00:00.000Z',
    updatedAt: new Date(Date.now() - 1000 * 3600 * 36).toISOString(),
    sizeKB: 45.1,
    childrenCount: 2,
    tags: ['علوم', 'معادلات'],
    status: 'active',
    content: '<p>تحليل المقاطع البرمجية والمعادلات الهندسية.</p>',
    isPinned: false,
    isFavorite: true
  },
  {
    id: 'note-admin-04',
    title: 'مسودة قديمة - أفكار غير مكتملة',
    ownerId: 'usr-004',
    ownerName: 'نورة المنصور',
    ownerEmail: 'noura.almansoor@gmail.com',
    createdAt: '2025-04-06T19:00:00.000Z',
    updatedAt: '2025-04-10T08:00:00.000Z',
    sizeKB: 4.8,
    childrenCount: 0,
    tags: ['مسودات'],
    status: 'archived',
    content: '<p>أفكار تحت التجربة المبدئية.</p>',
    isPinned: false,
    isFavorite: false
  },
  {
    id: 'note-admin-05',
    title: 'ملاحظة محذوفة - اختبار السلة',
    ownerId: 'usr-005',
    ownerName: 'عبدالله يوسف',
    ownerEmail: 'abdullah.youssef@company.com',
    createdAt: '2025-04-19T12:00:00.000Z',
    updatedAt: '2025-04-20T10:00:00.000Z',
    sizeKB: 2.1,
    childrenCount: 0,
    tags: ['اختبار'],
    status: 'deleted',
    content: '<p>تم حذف هذه الملاحظة إلى سلة المهملات.</p>',
    isPinned: false,
    isFavorite: false
  }
];

// Seed Initial Audit Logs
const SEED_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    userId: 'usr-001',
    userName: 'سالم أحمد (Super Admin)',
    action: 'تسجيل دخول نجاح مع 2FA',
    category: 'auth',
    ip: '197.35.112.45',
    status: 'success',
    details: 'تم الدخول من متصفح Chrome على جهاز macOS'
  },
  {
    id: 'log-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    userId: 'usr-006',
    userName: 'مريم الزهراني',
    action: 'رفع ملف مرفق جديد',
    category: 'file',
    ip: '82.164.91.33',
    status: 'success',
    details: 'تم رفع مستند PDF بحجم 4.2MB'
  },
  {
    id: 'log-003',
    timestamp: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
    userId: 'usr-003',
    userName: 'محمد علي العمراني',
    action: 'تعديل ملاحظة فرعية',
    category: 'note',
    ip: '213.166.130.5',
    status: 'success',
    details: 'تحديث محتوى الملاحظة "معادلات الفيزياء"'
  },
  {
    id: 'log-004',
    timestamp: new Date(Date.now() - 1000 * 3600 * 5).toISOString(),
    userId: 'usr-005',
    userName: 'عبدالله يوسف',
    action: 'محاولة تسجيل دخول فاشلة',
    category: 'auth',
    ip: '41.233.15.88',
    status: 'warning',
    details: 'إدخال كلمة مرور غير صحيحة 3 مرات'
  },
  {
    id: 'log-005',
    timestamp: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
    userId: 'usr-001',
    userName: 'سالم أحمد (Super Admin)',
    action: 'تغيير إعدادات الأمان',
    category: 'admin',
    ip: '197.35.112.45',
    status: 'success',
    details: 'تفعيل خيار التحقق الثنائي الإجباري للمدراء'
  }
];

// Seed System Notifications
const SEED_NOTIFS: SystemNotificationItem[] = [
  {
    id: 'notif-001',
    title: 'تحديث أمني هادي للنظام',
    message: 'تم تطبيق تحديث الأمن السحابي بنجاح على خوادم قاعدة البيانات.',
    target: 'all',
    createdAt: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
    sentBy: 'نظام الأمان الذاتي',
    type: 'info',
    readCount: 42
  },
  {
    id: 'notif-002',
    title: 'تنويه لمشتركي الباقة الاحترافية Pro',
    message: 'تمت زيادة المساحة التخزينية المجانية لكل حساب إلى 10GB.',
    target: 'pro',
    createdAt: new Date(Date.now() - 1000 * 3600 * 48).toISOString(),
    sentBy: 'إدارة التطبيق',
    type: 'warning',
    readCount: 18
  }
];

// Seed System Settings
const DEFAULT_SETTINGS: SystemSettings = {
  appName: 'نظام الملاحظات الذكي - لوحة الإدارة',
  maintenanceMode: false,
  allowRegistrations: true,
  require2FAForAdmin: true,
  maxUploadSizeMB: 50,
  defaultUserStorageMB: 500,
  sessionTimeoutMinutes: 60,
  securityAlertEmail: 'admin-security@notebook.app',
  enableAuditLogs: true,
  backupFrequency: 'daily'
};

// Seed Subscription Plans
const SEED_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'الباقة المجانية (Free)',
    priceMonthly: 0,
    storageMB: 500,
    maxNotes: 100,
    maxAttachments: 20,
    features: ['ملاحظات غير محدودة', 'شجرة ملاحظات هرمية', 'تنسيق غني'],
    activeUsersCount: 312
  },
  {
    id: 'plan-pro',
    name: 'الباقة الاحترافية (Pro)',
    priceMonthly: 9.99,
    storageMB: 10240, // 10GB
    maxNotes: 5000,
    maxAttachments: 500,
    features: ['تخزين 10GB', 'مساعد ذكاء اصطناعي', 'تصدير PDF وتنسيقات متعددة', 'دعم فني سريع'],
    activeUsersCount: 145
  },
  {
    id: 'plan-enterprise',
    name: 'باقة الشركات (Enterprise)',
    priceMonthly: 29.99,
    storageMB: 102400, // 100GB
    maxNotes: 50000,
    maxAttachments: 5000,
    features: ['تخزين 100GB', '2FA إجباري', 'سجل تدقيق خاص', 'مدير حساب مخصص', 'نسخ احتياطي لحظي'],
    activeUsersCount: 38
  }
];

// Getters & Setters
export function getAdminUsers(): AdminUserItem[] {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load admin users', e);
  }
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

export function saveAdminUsers(users: AdminUserItem[]) {
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
}

export function getAdminNotes(): AdminNoteItem[] {
  try {
    const raw = localStorage.getItem(ADMIN_NOTES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load admin notes', e);
  }
  localStorage.setItem(ADMIN_NOTES_KEY, JSON.stringify(SEED_NOTES));
  return SEED_NOTES;
}

export function saveAdminNotes(notes: AdminNoteItem[]) {
  localStorage.setItem(ADMIN_NOTES_KEY, JSON.stringify(notes));
}

export function getAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(ADMIN_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load audit logs', e);
  }
  localStorage.setItem(ADMIN_LOGS_KEY, JSON.stringify(SEED_AUDIT_LOGS));
  return SEED_AUDIT_LOGS;
}

export function addAuditLog(log: Omit<AuditLogItem, 'id' | 'timestamp'>) {
  const logs = getAuditLogs();
  const newLog: AuditLogItem = {
    ...log,
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString()
  };
  const updated = [newLog, ...logs];
  localStorage.setItem(ADMIN_LOGS_KEY, JSON.stringify(updated));
  return newLog;
}

export function clearAuditLogs() {
  localStorage.setItem(ADMIN_LOGS_KEY, JSON.stringify([]));
}

export function getSystemNotifications(): SystemNotificationItem[] {
  try {
    const raw = localStorage.getItem(ADMIN_NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load system notifs', e);
  }
  localStorage.setItem(ADMIN_NOTIFS_KEY, JSON.stringify(SEED_NOTIFS));
  return SEED_NOTIFS;
}

export function addSystemNotification(notif: Omit<SystemNotificationItem, 'id' | 'createdAt'>) {
  const notifs = getSystemNotifications();
  const newNotif: SystemNotificationItem = {
    ...notif,
    id: 'notif-' + Date.now(),
    createdAt: new Date().toISOString()
  };
  const updated = [newNotif, ...notifs];
  localStorage.setItem(ADMIN_NOTIFS_KEY, JSON.stringify(updated));
  
  // Log event
  addAuditLog({
    userId: 'usr-admin',
    userName: 'المشرف',
    action: `إرسال إشعار جديد: ${notif.title}`,
    category: 'system',
    ip: '127.0.0.1',
    status: 'info' as any,
    details: notif.message
  });

  return newNotif;
}

export function deleteSystemNotification(id: string) {
  const notifs = getSystemNotifications().filter(n => n.id !== id);
  localStorage.setItem(ADMIN_NOTIFS_KEY, JSON.stringify(notifs));
}

export function getSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load system settings', e);
  }
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  return DEFAULT_SETTINGS;
}

export function saveSystemSettings(settings: SystemSettings) {
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
  addAuditLog({
    userId: 'usr-admin',
    userName: 'المشرف العام',
    action: 'تحديث إعدادات النظام العامة',
    category: 'system',
    ip: '127.0.0.1',
    status: 'success',
    details: `وضع الصيانات: ${settings.maintenanceMode ? 'مفعل' : 'معطل'} | السماح بالتسجيل: ${settings.allowRegistrations ? 'نعم' : 'لا'}`
  });
}

export function getSubscriptionPlans(): SubscriptionPlan[] {
  try {
    const raw = localStorage.getItem(ADMIN_PLANS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load plans', e);
  }
  localStorage.setItem(ADMIN_PLANS_KEY, JSON.stringify(SEED_PLANS));
  return SEED_PLANS;
}

export function saveSubscriptionPlans(plans: SubscriptionPlan[]) {
  localStorage.setItem(ADMIN_PLANS_KEY, JSON.stringify(plans));
}

// Admin Auth Session Handling
export function getAdminSession(): AdminSession {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load session', e);
  }
  // Default session for demo convenience (or unauthenticated state)
  const defaultSession: AdminSession = {
    isAuthenticated: true,
    currentUser: {
      id: 'usr-001',
      name: 'سالم أحمد',
      email: 'admin@notebook.app',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'super_admin',
      is2FAVerified: true
    }
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(defaultSession));
  return defaultSession;
}

export function saveAdminSession(session: AdminSession) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}
