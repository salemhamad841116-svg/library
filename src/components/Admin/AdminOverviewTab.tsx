import React from 'react';
import { 
  Users, 
  FileText, 
  HardDrive, 
  TrendingUp, 
  UserCheck, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Clock, 
  ArrowUpRight,
  Database,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { AdminUserItem, AdminNoteItem, AuditLogItem } from '../../types/admin';

interface AdminOverviewTabProps {
  users: AdminUserItem[];
  notes: AdminNoteItem[];
  logs: AuditLogItem[];
  onNavigateTab: (tab: string) => void;
}

const USER_GROWTH_DATA = [
  { day: 'السبت', users: 240, notes: 520 },
  { day: 'الأحد', users: 310, notes: 680 },
  { day: 'الإثنين', users: 380, notes: 890 },
  { day: 'الثلاثاء', users: 450, notes: 1120 },
  { day: 'الأربعاء', users: 520, notes: 1350 },
  { day: 'الخميس', users: 610, notes: 1580 },
  { day: 'الجمعة', users: 720, notes: 1940 },
];

const STORAGE_DISTRIBUTION = [
  { name: 'مستندات وتكست', value: 45, color: '#6366f1' },
  { name: 'صور وميديا', value: 30, color: '#3b82f6' },
  { name: 'ملفات مرفقة', value: 15, color: '#8b5cf6' },
  { name: 'نسخ احتياطية', value: 10, color: '#ec4899' },
];

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  users,
  notes,
  logs,
  onNavigateTab
}) => {
  const activeUsersCount = users.filter(u => u.status === 'active').length;
  const totalStorageUsed = users.reduce((acc, u) => acc + u.storageUsedMB, 0).toFixed(1);
  const totalNotesCount = notes.length;
  const totalFilesCount = users.reduce((acc, u) => acc + u.filesCount, 0);

  // Active Today Calculation
  const activeTodayCount = users.filter(u => {
    const diffHours = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 3600);
    return diffHours <= 24;
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              النظام يعمل بكفاءة 99.9%
            </span>
            <span className="text-xs text-slate-300">النسخة v2.4.0</span>
          </div>
          <h2 className="text-xl font-black">نظرة عامة على أداء نظام الملاحظات والخدمات</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            مراقبة شاملة ومباشرة للمستخدمين النشطين، إجمالي استهلاك التخزين، الملاحظات المنشأة، والعمليات الحساسة في مكان واحد.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('users')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>إدارة المستخدمين ({users.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المستخدمين</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{users.length}</h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              +12.4% <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            منهم <strong className="text-slate-700 dark:text-slate-300">{activeUsersCount}</strong> حساب نشط حالياً
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المستخدمون النشطون اليوم</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{activeTodayCount}</h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              نشاط مرتفع
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            آخر تسجيل دخول في خلال الـ 24 ساعة الماضية
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الملاحظات</span>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalNotesCount}</h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              +18% هذا الشهر
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            متوسط <strong className="text-slate-700 dark:text-slate-300">{(totalNotesCount / (users.length || 1)).toFixed(1)}</strong> ملاحظة لكل مستخدم
          </p>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">التخزين المستهلك</span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStorageUsed} MB</h3>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {totalFilesCount} ملف مرفق
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            السعة الإجمالية للخيارات المتاحة: 500 GB
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Growth Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>معدل نمو المستخدمين وإنشاء الملاحظات أسبوعياً</span>
              </h3>
              <p className="text-xs text-slate-400">تحليل مقارن بين زيادة الحسابات والملاحظات المضافة</p>
            </div>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
              أحدث البيانات
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={USER_GROWTH_DATA}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="notes" name="الملاحظات" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorNotes)" strokeWidth={2} />
                <Area type="monotone" dataKey="users" name="المستخدمون" stroke="#6366f1" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Storage Pie Chart */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-500" />
              <span>توزيع استهلاك التخزين</span>
            </h3>
            <p className="text-xs text-slate-400">نسب استخدام المساحة حسب نوع البيانات</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STORAGE_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {STORAGE_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {STORAGE_DISTRIBUTION.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Users Table & Audit Quick Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Users Summary */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-500" />
              <span>أكثر المستخدمين نشاطاً على المنصة</span>
            </h3>
            <button
              onClick={() => onNavigateTab('users')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              عرض الكل ({users.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2 px-3">المستخدم</th>
                  <th className="py-2 px-3">الباقة</th>
                  <th className="py-2 px-3">الملاحظات</th>
                  <th className="py-2 px-3">التخزين</th>
                  <th className="py-2 px-3">آخر ظهور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.slice(0, 4).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <div>{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.subscription === 'enterprise' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300' 
                          : u.subscription === 'pro'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {u.subscription.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{u.notesCount}</td>
                    <td className="py-2.5 px-3 font-semibold">{u.storageUsedMB} MB</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(u.lastLogin).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live System Logs Feed */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>آخر عمليات التدقيق والنشاط</span>
            </h3>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              السجل الكامل
            </button>
          </div>

          <div className="space-y-2.5">
            {logs.slice(0, 4).map((log) => (
              <div key={log.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{log.userName}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
