import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  UserX, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Key, 
  Send, 
  ShieldAlert, 
  HardDrive, 
  FileText, 
  Smartphone, 
  Globe, 
  Clock, 
  Check, 
  AlertCircle,
  MoreVertical,
  X
} from 'lucide-react';
import { AdminUserItem } from '../../types/admin';

interface AdminUsersTabProps {
  users: AdminUserItem[];
  onUpdateUsers: (users: AdminUserItem[]) => void;
  onSendNotification: (userId: string, userName: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onUpdateUsers,
  onSendNotification
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'deleted'>('all');
  const [subFilter, setSubFilter] = useState<'all' | 'free' | 'pro' | 'enterprise'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  
  // Modals state
  const [editModalUser, setEditModalUser] = useState<AdminUserItem | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Filtering Logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesSub = subFilter === 'all' || u.subscription === subFilter;
    return matchesSearch && matchesStatus && matchesSub;
  });

  // Action Handlers
  const handleToggleStatus = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'active' ? 'suspended' : 'active';
        return { ...u, status: nextStatus as any };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('هل أنت تأكد من إيقاف وحذف حساب المستخدم نهائياً؟')) {
      const updated = users.map((u) => u.id === userId ? { ...u, status: 'deleted' as const } : u);
      onUpdateUsers(updated);
    }
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    const updated = users.map((u) => u.id === editModalUser.id ? editModalUser : u);
    onUpdateUsers(updated);
    setEditModalUser(null);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword) return;
    setPasswordSuccess(`تم تغيير كلمة المرور للمستخدم (${passwordModalUser.name}) بنجاح.`);
    setTimeout(() => {
      setPasswordSuccess('');
      setPasswordModalUser(null);
      setNewPassword('');
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Search & Control Header */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            placeholder="بحث عن مستخدم بالاسم، البريد أو ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">حالة الحساب:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">الكل ({users.length})</option>
              <option value="active">نشط</option>
              <option value="suspended">موقوف</option>
              <option value="deleted">محذوف</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">الباقة:</span>
            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">جميع الباقات</option>
              <option value="free">المجانية Free</option>
              <option value="pro">الاحترافية Pro</option>
              <option value="enterprise">الشركات Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-3">المستخدم</th>
                <th className="py-3 px-3">ID الحساب</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-3">الباقة</th>
                <th className="py-3 px-3">الملاحظات والملفات</th>
                <th className="py-3 px-3">التخزين</th>
                <th className="py-3 px-3">IP / الجهاز</th>
                <th className="py-3 px-3">التسجيل / آخر ظهور</th>
                <th className="py-3 px-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* User Profile Info */}
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.role === 'admin' && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* ID */}
                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                    {user.id}
                  </td>

                  {/* Account Status */}
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                        user.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : user.status === 'suspended'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`} />
                      {user.status === 'active' ? 'نشط' : user.status === 'suspended' ? 'موقوف' : 'محذوف'}
                    </span>
                  </td>

                  {/* Subscription */}
                  <td className="py-3 px-3 font-bold">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase ${
                      user.subscription === 'enterprise'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : user.subscription === 'pro'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {user.subscription}
                    </span>
                  </td>

                  {/* Stats */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-semibold">
                      <span className="flex items-center gap-1" title="عدد الملاحظات">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {user.notesCount}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400" title="عدد الملفات">
                        <HardDrive className="w-3.5 h-3.5" />
                        {user.filesCount}
                      </span>
                    </div>
                  </td>

                  {/* Storage Used */}
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {user.storageUsedMB} MB
                  </td>

                  {/* IP & Device */}
                  <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
                    <div className="font-mono">{user.ipAddress}</div>
                    <div className="truncate text-slate-400">{user.lastDevice}</div>
                  </td>

                  {/* Dates */}
                  <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <div>تسجيل: {new Date(user.registrationDate).toLocaleDateString('ar-SA')}</div>
                    <div className="text-slate-400">آخر دخول: {new Date(user.lastLogin).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* View / Detail */}
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="عرض كرت التفاصيل الكاملة"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => setEditModalUser(user)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="تعديل بيانات الحساب"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Send Notif */}
                      <button
                        onClick={() => onSendNotification(user.id, user.name)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="إرسال إشعار مباشر للمستخدم"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {/* Reset Pass */}
                      <button
                        onClick={() => setPasswordModalUser(user)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="إعادة تعيين كلمة المرور"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {/* Suspend / Reactivate */}
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          user.status === 'active' 
                            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' 
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                        title={user.status === 'active' ? 'إيقاف الحساب مؤقتاً' : 'تفعيل الحساب'}
                      >
                        {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="حذف الحساب نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Full Detailed Card Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden select-none">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selectedUser.avatar} alt={selectedUser.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400" />
                <div>
                  <h3 className="text-base font-bold">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-300">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="text-slate-400 font-semibold mb-1">معرف الحساب (User ID)</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedUser.id}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="text-slate-400 font-semibold mb-1">نوع الاشتراك الحالي</div>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{selectedUser.subscription}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="text-slate-400 font-semibold mb-1">عدد الملاحظات</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.notesCount} ملاحظة</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="text-slate-400 font-semibold mb-1">المساحة المستخدمة</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.storageUsedMB} MB</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="text-slate-400 font-semibold mb-1">عدد الأجهزة المسجلة</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.devicesCount} أجهزة</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="text-slate-400 font-semibold mb-1">عنوان IP الحالي</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedUser.ipAddress}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <div className="text-slate-400 font-semibold">جهاز الدخول الأخير:</div>
                <div className="text-slate-800 dark:text-slate-200 font-bold">{selectedUser.lastDevice}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400">اللغة: </span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedUser.language}</strong>
                </div>
                <div>
                  <span className="text-slate-400">المنطقة الزمنية: </span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedUser.timezone}</strong>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit User Profile Modal */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden select-none">
            <div className="p-5 bg-indigo-600 text-white flex items-center justify-between font-bold">
              <span>تعديل بيانات المستخدم ({editModalUser.name})</span>
              <button onClick={() => setEditModalUser(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={editModalUser.name}
                  onChange={(e) => setEditModalUser({ ...editModalUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={editModalUser.email}
                  onChange={(e) => setEditModalUser({ ...editModalUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">نوع الاشتراك</label>
                <select
                  value={editModalUser.subscription}
                  onChange={(e) => setEditModalUser({ ...editModalUser, subscription: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="free">المجانية Free</option>
                  <option value="pro">الاحترافية Pro</option>
                  <option value="enterprise">الشركات Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">حالة الحساب</label>
                <select
                  value={editModalUser.status}
                  onChange={(e) => setEditModalUser({ ...editModalUser, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="active">نشط (Active)</option>
                  <option value="suspended">موقوف (Suspended)</option>
                  <option value="deleted">محذوف (Deleted)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs select-none">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <Key className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">إعادة تعيين كلمة المرور</h3>
            </div>
            <p className="text-slate-500">
              أدخل كلمة مرور جديدة للمستخدم <strong className="text-slate-800 dark:text-slate-200">{passwordModalUser.name}</strong>.
            </p>

            {passwordSuccess ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-center">
                {passwordSuccess}
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="كلمة المرور الجديدة..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                  >
                    تعيين وتأكيد
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
