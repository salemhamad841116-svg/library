import { UIRootConfig, DEFAULT_UI_CONFIG } from '../types/ui';
import { addAuditLog } from './adminStorage';

const UI_CONFIG_STORAGE_KEY = 'ais_note_ui_config';
const UI_DRAFT_CONFIG_STORAGE_KEY = 'ais_note_ui_draft_config';

export function getPublishedUIConfig(): UIRootConfig {
  const data = localStorage.getItem(UI_CONFIG_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error parsing published UI config', e);
    }
  }
  return DEFAULT_UI_CONFIG;
}

export function getDraftUIConfig(): UIRootConfig {
  const data = localStorage.getItem(UI_DRAFT_CONFIG_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error parsing draft UI config', e);
    }
  }
  // If no draft exists, start from published
  return getPublishedUIConfig();
}

export function saveDraftUIConfig(config: UIRootConfig, adminName: string = 'System') {
  config.version = (config.version || 1) + 1;
  localStorage.setItem(UI_DRAFT_CONFIG_STORAGE_KEY, JSON.stringify(config));
  
  addAuditLog({
    action: 'تعديل مسودة واجهة المستخدم',
    userName: adminName,
    userId: 'admin',
    category: 'system',
    ip: '127.0.0.1',
    status: 'success',
    details: `تم حفظ مسودة جديدة للواجهة (إصدار ${config.version})`,
  });
}

export function publishUIConfig(adminName: string = 'System'): UIRootConfig {
  const draft = getDraftUIConfig();
  draft.lastPublished = new Date().toISOString();
  
  // Make sure all elements are marked as published
  draft.elements = draft.elements.map(el => ({ ...el, status: 'published' }));

  localStorage.setItem(UI_CONFIG_STORAGE_KEY, JSON.stringify(draft));
  
  // Clear draft after publish or keep it in sync? Keep it in sync.
  localStorage.setItem(UI_DRAFT_CONFIG_STORAGE_KEY, JSON.stringify(draft));

  addAuditLog({
    action: 'نشر واجهة المستخدم',
    userName: adminName,
    userId: 'admin',
    category: 'system',
    ip: '127.0.0.1',
    status: 'success',
    details: `تم نشر تعديلات واجهة المستخدم (إصدار ${draft.version})`,
  });

  return draft;
}

export function discardDraftUIConfig(adminName: string = 'System') {
  const published = getPublishedUIConfig();
  localStorage.setItem(UI_DRAFT_CONFIG_STORAGE_KEY, JSON.stringify(published));
  
  addAuditLog({
    action: 'إلغاء مسودة واجهة المستخدم',
    userName: adminName,
    userId: 'admin',
    category: 'system',
    ip: '127.0.0.1',
    status: 'success',
    details: `تم التراجع عن مسودة الواجهة الحالية`,
  });
}
