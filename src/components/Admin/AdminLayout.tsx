import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Activity, 
  Settings, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  LogOut, 
  Sun, 
  Moon, 
  ExternalLink, 
  Menu, 
  X,
  Shield,
  Search,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { AdminSession, AdminUserItem, AdminNoteItem, AuditLogItem, SystemSettings } from '../../types/admin';
import { 
  getAdminSession, 
  saveAdminSession, 
  getAdminUsers, 
  saveAdminUsers, 
  getAdminNotes, 
  saveAdminNotes, 
  getAuditLogs, 
  getSystemSettings, 
  saveSystemSettings 
} from '../../services/adminStorage';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminNotesTab } from './AdminNotesTab';
import { AdminLogsTab } from './AdminLogsTab';
import { AdminSystemTab } from './AdminSystemTab';
import { AdminSubscriptionsTab } from './AdminSubscriptionsTab';
import { AdminNotificationsTab } from './AdminNotificationsTab';
import { AdminSecurityTab } from './AdminSecurityTab';
import { AdminUIBuilderTab } from './AdminUIBuilderTab';
import { BotQaTab } from './BotTabs/BotQaTab';
import { BotAudioTab } from './BotTabs/BotAudioTab';
import { BotPromptTab } from './BotTabs/BotPromptTab';
import { BotKeysTab } from './BotTabs/BotKeysTab';
import { BotLogsTab } from './BotTabs/BotLogsTab';
import { BotLibrarySyncTab } from './BotTabs/BotLibrarySyncTab';
import { BotAdvancedTab } from './BotTabs/BotAdvancedTab';
import { BookOpen, HelpCircle, Volume2, Cpu, KeyRound, Terminal } from 'lucide-react';

interface AdminLayoutProps {
  onSwitchToUserApp: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  onSwitchToUserApp,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<string>('bot_qa');
  const [session, setSession] = useState<AdminSession>(getAdminSession());
  const [users, setUsers] = useState<AdminUserItem[]>(getAdminUsers());
  const [notes, setNotes] = useState<AdminNoteItem[]>(getAdminNotes());
  const [logs, setLogs] = useState<AuditLogItem[]>(getAuditLogs());
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notificationPrefilledUser, setNotificationPrefilledUser] = useState<string | null>(null);

  // Sync back to storage when states update
  const handleUpdateUsers = (updatedUsers: AdminUserItem[]) => {
    setUsers(updatedUsers);
    saveAdminUsers(updatedUsers);
  };

  const handleUpdateNotes = (updatedNotes: AdminNoteItem[]) => {
    setNotes(updatedNotes);
    saveAdminNotes(updatedNotes);
  };

  const handleUpdateLogs = (updatedLogs: AuditLogItem[]) => {
    setLogs(updatedLogs);
  };

  const handleUpdateSettings = (updatedSettings: SystemSettings) => {
    setSettings(updatedSettings);
    saveSystemSettings(updatedSettings);
  };

  const handleSendNotificationToUser = (userId: string, userName: string) => {
    setNotificationPrefilledUser(userId);
    setActiveTab('notifications');
  };

  const handleLogout = () => {
    const emptySession: AdminSession = { isAuthenticated: false, currentUser: null };
    setSession(emptySession);
    saveAdminSession(emptySession);
    onSwitchToUserApp();
  };

  const NAV_ITEMS = [
    // قسم إدارة البوت والذكاء الاصطناعي
    { id: 'bot_qa', label: 'أسئلة وأجوبة البوت', icon: HelpCircle, group: 'bot' },
    { id: 'bot_audio', label: 'مكتبة الردود الصوتية', icon: Volume2, group: 'bot' },
    { id: 'bot_prompt', label: 'تعليمات النظام والمزوّد', icon: Cpu, group: 'bot' },
    { id: 'bot_keys', label: 'مفاتيح الذكاء الاصطناعي', icon: KeyRound, group: 'bot' },
    { id: 'bot_logs', label: 'سجل المحادثات المباشر', icon: Activity, group: 'bot' },
    { id: 'bot_sync', label: 'مزامنة المكتبة للبوت', icon: BookOpen, group: 'bot' },
    { id: 'bot_advanced', label: 'أدوات البوت المتقدمة', icon: Terminal, group: 'bot' },

    // قسم إدارة الكتب والملاحظات
    { id: 'notes', label: 'إدارة الملاحظات والكتب', icon: FileText, badge: notes.length, group: 'library' },
    { id: 'overview', label: 'لوحة الإحصائيات', icon: LayoutDashboard, group: 'library' },
    { id: 'users', label: 'إدارة المستخدمين', icon: Users, badge: users.length, group: 'library' },
    { id: 'uibuilder', label: 'إدارة واجهة المستخدم', icon: Sparkles, group: 'library' },

    // قسم النظام والأمان
    { id: 'system', label: 'الإعدادات العامة والنظام', icon: Settings, group: 'system' },
    { id: 'subscriptions', label: 'الباقات والاشتراكات', icon: CreditCard, group: 'system' },
    { id: 'notifications', label: 'مركز الإشعارات', icon: Bell, group: 'system' },
    { id: 'security', label: 'الأمان والصلاحيات', icon: ShieldCheck, group: 'system' },
  ];

  return (
    <div className={`min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans dir-rtl select-none transition-colors duration-200`}>
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-l border-slate-800 text-slate-300 flex-col shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide">لوحة الإدارة المستقلة</h1>
              <p className="text-[10px] text-slate-400 font-mono">Control Center v2.4</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const prevItem = NAV_ITEMS[idx - 1];
            const showHeader = !prevItem || prevItem.group !== item.group;
            const groupTitle =
              item.group === 'bot'
                ? 'إدارة البوت والذكاء الاصطناعي'
                : item.group === 'library'
                ? 'إدارة الكتب والملاحظات'
                : 'إعدادات النظام والأمان';

            return (
              <React.Fragment key={item.id}>
                {showHeader && (
                  <div className="pt-3 pb-1 px-3 text-[10px] font-black tracking-wider text-slate-500 uppercase">
                    {groupTitle}
                  </div>
                )}
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Admin Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={session.currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt="Admin"
                className="w-9 h-9 rounded-full object-cover border border-indigo-500 shrink-0"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{session.currentUser?.name || 'المشرف العام'}</div>
                <div className="text-[10px] text-indigo-400 font-mono uppercase">{session.currentUser?.role || 'SUPER ADMIN'}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="تسجيل الخروج من لوحة الإدارة"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="relative w-72 bg-slate-900 border-l border-slate-800 text-slate-300 flex flex-col z-10">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-sm">قائمة التحكم الإدارية</span>
              <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-slate-100">
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Dark Mode */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="تغيير المظهر"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Return to App Button */}
            <button
              onClick={onSwitchToUserApp}
              className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">العودة لتطبيق الملاحظات</span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {activeTab === 'bot_qa' && <BotQaTab />}
          {activeTab === 'bot_audio' && <BotAudioTab />}
          {activeTab === 'bot_prompt' && <BotPromptTab />}
          {activeTab === 'bot_keys' && <BotKeysTab />}
          {activeTab === 'bot_logs' && <BotLogsTab />}
          {activeTab === 'bot_sync' && <BotLibrarySyncTab />}
          {activeTab === 'bot_advanced' && <BotAdvancedTab />}

          {activeTab === 'overview' && (
            <AdminOverviewTab
              users={users}
              notes={notes}
              logs={logs}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersTab
              users={users}
              onUpdateUsers={handleUpdateUsers}
              onSendNotification={handleSendNotificationToUser}
            />
          )}

          {activeTab === 'notes' && (
            <AdminNotesTab
              notes={notes}
              onUpdateNotes={handleUpdateNotes}
            />
          )}

          {activeTab === 'logs' && (
            <AdminLogsTab
              logs={logs}
              onUpdateLogs={handleUpdateLogs}
            />
          )}

          {activeTab === 'uibuilder' && (
            <AdminUIBuilderTab />
          )}

          {activeTab === 'system' && (
            <AdminSystemTab
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {activeTab === 'subscriptions' && (
            <AdminSubscriptionsTab />
          )}

          {activeTab === 'notifications' && (
            <AdminNotificationsTab
              users={users}
              prefilledUserId={notificationPrefilledUser}
              onClearPrefilledUser={() => setNotificationPrefilledUser(null)}
            />
          )}

          {activeTab === 'security' && (
            <AdminSecurityTab logs={logs} />
          )}
        </main>
      </div>
    </div>
  );
};
