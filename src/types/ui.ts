export type UIElementType = 'menu' | 'card' | 'button' | 'section' | 'tab' | 'filter' | 'search' | 'header' | 'text' | 'link' | 'custom';
export type UIElementStatus = 'published' | 'draft' | 'hidden';
export type UILocation = 'sidebar' | 'bottom_nav' | 'main_workspace' | 'settings_drawer' | 'header' | 'quick_actions' | 'custom';

export interface UIElementConfig {
  id: string;
  type: UIElementType;
  internalName: string;
  displayName: string;
  description?: string;
  icon?: string;
  location: UILocation;
  order: number;
  status: UIElementStatus; // draft vs published
  isVisible: boolean; // toggle for active/inactive
  permissions: string[]; // e.g. ['admin', 'user', 'guest']
  linkOrAction?: string;
  styleSettings?: {
    width?: string;
    height?: string;
    color?: string;
    customClasses?: string;
  };
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export type CustomFilterType = 'dropdown' | 'checkbox' | 'radio' | 'multi_select' | 'date' | 'search' | 'range' | 'sort';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  color?: string;
}

export interface UIFilterConfig {
  id: string;
  internalName: string;
  displayName: string;
  filterType: CustomFilterType;
  targetField: string; // e.g., 'category', 'status', 'createdAt', 'title', 'tags'
  options: FilterOption[];
  isActive: boolean;
  order: number;
}

export interface UIRootConfig {
  version: number;
  lastPublished: string | null;
  elements: UIElementConfig[];
  filters: UIFilterConfig[];
}

// Initial default state for the UI
export const DEFAULT_UI_CONFIG: UIRootConfig = {
  version: 1,
  lastPublished: null,
  elements: [
    {
      id: 'sidebar_my_notes',
      type: 'menu',
      internalName: 'sidebar_my_notes',
      displayName: 'ملاحظاتي',
      icon: 'Folder',
      location: 'sidebar',
      order: 1,
      status: 'published',
      isVisible: true,
      permissions: ['all'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'header_search',
      type: 'search',
      internalName: 'header_search',
      displayName: 'البحث الشامل',
      icon: 'Search',
      location: 'header',
      order: 1,
      status: 'published',
      isVisible: true,
      permissions: ['all'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  filters: [
    {
      id: 'filter_type',
      internalName: 'note_type',
      displayName: 'نوع الملاحظة',
      filterType: 'dropdown',
      targetField: 'category',
      isActive: true,
      order: 1,
      options: [
        { id: 'opt1', label: 'العمل', value: 'work', color: '#3b82f6' },
        { id: 'opt2', label: 'شخصي', value: 'personal', color: '#10b981' },
        { id: 'opt3', label: 'مهم', value: 'important', color: '#ef4444' }
      ]
    }
  ]
};
