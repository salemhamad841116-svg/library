export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support';

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'vip' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  subscription: 'free' | 'pro' | 'enterprise';
  registrationDate: string;
  lastLogin: string;
  notesCount: number;
  filesCount: number;
  storageUsedMB: number;
  devicesCount: number;
  ipAddress: string;
  lastDevice: string;
  language: string;
  timezone: string;
}

export interface AdminNoteItem {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  sizeKB: number;
  childrenCount: number;
  tags: string[];
  status: 'active' | 'archived' | 'deleted';
  content: string;
  isPinned: boolean;
  isFavorite: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'auth' | 'note' | 'file' | 'user' | 'system' | 'admin';
  ip: string;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export interface SystemNotificationItem {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'pro' | 'free' | 'specific';
  targetUserId?: string;
  createdAt: string;
  sentBy: string;
  type: 'info' | 'warning' | 'alert';
  readCount?: number;
}

export interface SystemSettings {
  appName: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  require2FAForAdmin: boolean;
  maxUploadSizeMB: number;
  defaultUserStorageMB: number;
  sessionTimeoutMinutes: number;
  securityAlertEmail: string;
  enableAuditLogs: boolean;
  backupFrequency: 'daily' | 'weekly' | 'manual';
}

export interface AdminSession {
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: AdminRole;
    is2FAVerified: boolean;
  } | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  storageMB: number;
  maxNotes: number;
  maxAttachments: number;
  features: string[];
  activeUsersCount: number;
}
