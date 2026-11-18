import React, { useState, useEffect } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Save, Trash2, CheckCircle2, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { safeFetchJson, adminFetch } from '../../../admin/bot/lib/safeFetch';

interface ApiSetting {
  id: string;
  provider_key: string;
  company_name: string;
  service_role: string;
  masked_preview: string;
  is_active: boolean;
  env_fallback_name: string;
  extra_config?: string;
  updated_at: string;
}

export const BotKeysTab: React.FC = () => {
  const [settings, setSettings] = useState<ApiSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plainKeyInput, setPlainKeyInput] = useState('');
  const [extraConfigInput, setExtraConfigInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    const data = await safeFetchJson('/api/bot/admin/api-settings');
    if (data?.settings) setSettings(data.settings);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (id: string, currentState: boolean) => {
    const res = await safeFetchJson(`/api/bot/admin/api-settings/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !currentState }),
    });
    if (res?.success) {
      setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !currentState } : s)));
    }
  };

  const handleSaveKey = async (id: string) => {
    if (!plainKeyInput.trim() && !extraConfigInput.trim()) {
      setEditingId(null);
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const setting = settings.find((s) => s.id === id);
    const res = await safeFetchJson('/api/bot/admin/api-settings', {
      method: 'POST',
      body: JSON.stringify({
        id,
        company_name: setting?.company_name,
        provider_key: setting?.provider_key,
        service_role: setting?.service_role,
        plain_api_key: plainKeyInput.trim() || undefined,
        extra_config: extraConfigInput.trim() || setting?.extra_config,
      }),
    });

    setIsSaving(false);
    if (res?.success) {
      setStatusMsg(`تم تشفير وتحديث مفتاح ${setting?.company_name} بنجاح`);
      setEditingId(null);
      setPlainKeyInput('');
      setExtraConfigInput('');
      fetchSettings();
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المزود من إعدادات المفاتيح؟')) return;
    await adminFetch(`/api/bot/admin/api-settings/${id}`, { method: 'DELETE' });
    fetchSettings();
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" />
            <span>خزينة مفاتيح الذكاء الاصطناعي (Encrypted API Keys Vault)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مفاتيح الشركات مشفرة بأعلى معايير الأمان AES-256-GCM مع التراجع التلقائي إلى متغيرات البيئة (.env).
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-base font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Keys List */}
      <div className="space-y-3">
        {settings.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition-all ${
                item.is_active
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 dark:text-slate-100">{item.company_name}</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.is_active ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {item.env_fallback_name}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.service_role}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(item.id, item.is_active)}
                    className={`px-4 py-2.5 rounded-xl text-base font-bold transition-colors cursor-pointer ${
                      item.is_active
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {item.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>

                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditingId(null);
                      } else {
                        setEditingId(item.id);
                        setPlainKeyInput('');
                        setExtraConfigInput(item.extra_config || '');
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-base font-bold transition-colors cursor-pointer"
                  >
                    {isEditing ? 'إلغاء' : 'تعديل المفتاح'}
                  </button>
                </div>
              </div>

              {/* Masked Preview or Inline Editor */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {isEditing ? (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-indigo-200 dark:border-indigo-900/60">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        أدخل المفتاح السري الجديد (سيتم تشفيره فورياً بمعيار AES-256):
                      </label>
                      <input
                        type="password"
                        value={plainKeyInput}
                        onChange={(e) => setPlainKeyInput(e.target.value)}
                        placeholder="sk-... أو xi-... أو مفتاح API"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        إعدادات إضافية أو معرف الصوت (Extra Config / Voice ID):
                      </label>
                      <input
                        type="text"
                        value={extraConfigInput}
                        onChange={(e) => setExtraConfigInput(e.target.value)}
                        placeholder="Voice ID أو Endpoint URL أو إعداد إضافي"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-mono text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-base font-bold rounded-xl cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleSaveKey(item.id)}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>تشفير وحفظ</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm font-mono text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-300 font-sans font-bold">المفتاح الحالي:</span>
                      <span className="font-bold tracking-wider text-slate-800 dark:text-slate-200">
                        {item.masked_preview || 'غير مضبوط'}
                      </span>
                    </div>

                    {item.extra_config && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        إعداد إضافي: {item.extra_config}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
