export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high';
  reminder?: string | null;
}

export interface AttachmentItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'sheet' | 'ppt' | 'archive' | 'link' | 'file';
  url: string;
  size?: number;
  createdAt: string;
}

export interface ListCategory {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string | null;
  depth?: number;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  bot_visible?: boolean;
}

export interface ListTreeNode extends ListCategory {
  children: ListTreeNode[];
  notesCount?: number;
  isExpanded?: boolean;
}

export interface ListBreadcrumbItem {
  id: string | null;
  name: string;
  icon?: string;
}

export interface Note {
  id: string;
  userId?: string; // Bound to user UID for relational security & isolation
  listId?: string | null; // Relational foreign key binding to a ListCategory
  parentId: string | null;
  path: string; // e.g. "/root/child1/child2"
  depth: number; // 0 for root notes, 1, 2, 3... infinite depth
  title: string;
  content: string; // HTML or Markdown
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  tags: string[];
  color: string; // preset color name or hex
  icon?: string; // emoji or icon identifier
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean; // Trash status
  sortOrder: number;
  childrenCount: number;
  tasks: TaskItem[];
  attachments: AttachmentItem[];
  coverImage?: string | null;
  wordCount: number;
  characterCount: number;
  readingTime: number; // in minutes
}

export interface UserDeviceInfo {
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

export interface UserLocationInfo {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  timezone: string;
  connectionType?: string;
  isp?: string;
  detectedAt: string;
}

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  lastLoginAt: string;
  updatedAt: string;
  device_info: UserDeviceInfo;
  last_login_location: UserLocationInfo;
  appVersion?: string;
  isOnline?: boolean;
}

export interface NoteTreeNode extends Note {
  children: NoteTreeNode[];
  isExpanded?: boolean;
}

export type FilterType = 
  | 'all' 
  | 'pinned' 
  | 'favorite' 
  | 'archived' 
  | 'trash' 
  | 'has_images' 
  | 'has_files' 
  | 'has_tasks' 
  | 'tag' 
  | 'color'
  | 'recent';

export type SortOption = 'updatedAt' | 'createdAt' | 'title' | 'depth' | 'sortOrder';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  query: string;
  filterType: FilterType;
  selectedTag: string | null;
  selectedColor: string | null;
  sortBy: SortOption;
  sortDirection: SortDirection;
}

export type EditorViewMode = 'edit' | 'preview' | 'split' | 'readonly';

export interface BreadcrumbItem {
  id: string;
  title: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;
}

export interface AIServicePayload {
  content?: string;
  text?: string;
  style?: string;
  targetLang?: string;
  prompt?: string;
  message?: string;
  noteContext?: string;
}

export type AppEnvironment = 'production' | 'staging' | 'development';

export interface EnvironmentConfig {
  current: AppEnvironment;
  dbCollection: string;
  isProduction: boolean;
  allowTelemetry: boolean;
}
