import React, { useState } from 'react';
import { Send, Bell, Trash2, CheckCircle2, AlertCircle, Info, ShieldAlert, Users } from 'lucide-react';
import { SystemNotificationItem, AdminUserItem } from '../../types/admin';
import { addSystemNotification, deleteSystemNotification, getSystemNotifications } from '../../services/adminStorage';

interface AdminNotificationsTabProps {
  users: AdminUserItem[];
  prefilledUserId?: string | null;
  onClearPrefilledUser?: () => void;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  users,
  prefilledUserId,
  onClearPrefilledUser
}) => {
  const [notifs, setNotifs] = useState<SystemNotificationItem[]>(getSystemNotifications());
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'pro' | 'free' | 'specific'>('all');
  const [targetUserId, setTargetUserId] = useState<string>(prefilledUserId || '');
  const [type, setType] = useState<'info' | 'warning' | 'alert'>('info');
  const [sentSuccess, setSentSuccess] = useState(false);

  // Sync prefilled target if passed from user table
  React.useEffect(() => {
    if (prefilledUserId) {
      setTarget('specific');
      setTargetUserId(prefilledUserId);
    }
  }, [prefilledUserId]);

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const newNotif = addSystemNotification({
      title,
      message,
      target,
      targetUserId: target === 'specific' ? targetUserId : undefined,
      type,
      sentBy: 'المشرف العام'
    });

    setNotifs([newNotif, ...notifs]);
    setTitle('');
    setMessage('');
    setSentSuccess(true);
    if (onClearPrefilledUser) onClearPrefilledUser();
    setTimeout(() => setSentSuccess(false), 2500);
  };

  const handleDeleteNotif = (id: string) => {
    deleteSystemNotification(id);
    setNotifs(notifs.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Compose Notification Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Bell className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">إرسال إشعار للنظام أو لمستخدم محدد</h3>
        </div>

        {sentSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تم إرسال وتوجيه الإشعار بنجاح!</span>
          </div>
        )}

        <form onSubmit={handleSendNotification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">عنوان الإشعار</label>
              <input
                type="text"
                placeholder="تحديث جديد / تنبيه أمني..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">الفئة المستهدفة</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm md:text-base font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="all">جميع المستخدمين (Broadcast All)</option>
                <option value="pro">مشتركو باقة Pro فقط</option>
                <option value="free">مشتركو الباقة المجانية Free</option>
                <option value="specific">مستخدم محدد فقط</option>
              </select>
            </div>

            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">نوع التنبيه</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm md:text-base font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="info">معلومة عامة (Info)</option>
                <option value="warning">تنويه مهم (Warning)</option>
                <option value="alert">تحذير أمني (Alert)</option>
              </select>
            </div>
          </div>

          {target === 'specific' && (
            <div>
              <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">اختر المستخدم المستهدف</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100"
                required
              >
                <option value="">-- اختر مستخدماً من القائمة --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">نص ومحتوى الإشعار</label>
            <textarea
              rows={3}
              placeholder="اكتب نص الإشعار هنا..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-medium text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl text-base flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-5 h-5" />
              <span>إرسال الإشعار الآن</span>
            </button>
          </div>
        </form>
      </div>

      {/* History of Sent Notifications */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">سجل الإشعارات الموجهة للعملاء</h3>

        <div className="space-y-2.5">
          {notifs.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    n.type === 'alert'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : n.type === 'warning'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}>
                    {n.type.toUpperCase()}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                </div>

                <p className="text-slate-600 dark:text-slate-300">{n.message}</p>

                <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-1">
                  <span>المستهدف: <strong>{n.target}</strong></span>
                  <span>•</span>
                  <span>تاريخ الإرسال: {new Date(n.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteNotif(n.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                title="حذف الإشعار"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
