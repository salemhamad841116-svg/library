import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Clock, 
  Terminal,
  FileSpreadsheet
} from 'lucide-react';
import { AuditLogItem } from '../../types/admin';
import { clearAuditLogs } from '../../services/adminStorage';

interface AdminLogsTabProps {
  logs: AuditLogItem[];
  onUpdateLogs: (logs: AuditLogItem[]) => void;
}

export const AdminLogsTab: React.FC<AdminLogsTabProps> = ({
  logs,
  onUpdateLogs
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip.includes(searchQuery);
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleClearLogs = () => {
    if (window.confirm('هل أنت تأكد من تفريغ كافة سجلات التدقيق والنشاط الحالية؟')) {
      clearAuditLogs();
      onUpdateLogs([]);
    }
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Search & Actions Header */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            placeholder="بحث في سجلات التدقيق بالاسم، الإجراء، أو IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">التصنيف:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">الكل ({logs.length})</option>
              <option value="auth">مصادقة (Auth)</option>
              <option value="note">ملاحظات (Notes)</option>
              <option value="file">ملفات (Files)</option>
              <option value="system">النظام (System)</option>
              <option value="admin">إدارة (Admin)</option>
            </select>
          </div>

          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-2xl text-base font-bold cursor-pointer transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>تصدير السجلات</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 rounded-2xl text-base font-bold cursor-pointer transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span>تفريغ السجل</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-3">الوقت والتاريخ</th>
                <th className="py-3 px-3">المستخدم / الفاعل</th>
                <th className="py-3 px-3">نوع العملية</th>
                <th className="py-3 px-3">عنوان العملية (Action)</th>
                <th className="py-3 px-3">عنوان IP</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-3">التفاصيل الكاملة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 text-[11px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString('ar-SA')}
                  </td>

                  <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                    {log.userName}
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                      {log.category}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {log.action}
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                    {log.ip}
                  </td>

                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      log.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : log.status === 'warning'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {log.status}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate text-[11px]" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
