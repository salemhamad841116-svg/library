import React, { useState, useEffect } from 'react';
import { Cpu, Save, RefreshCw, CheckCircle2, Sliders, MessageSquare, Shield, Sparkles } from 'lucide-react';
import { safeFetchJson } from '../../../admin/bot/lib/safeFetch';

export const BotPromptTab: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    const data = await safeFetchJson('/api/bot/admin/settings');
    if (data?.settings) setSettings(data.settings);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setStatusMsg(null);

    const res = await safeFetchJson('/api/bot/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });

    setIsSaving(false);
    if (res?.success) {
      setSettings(res.settings);
      setStatusMsg('تم حفظ وتحديث تعليمات النظام وإعدادات الذكاء الاصطناعي بنجاح');
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        جاري تحميل إعدادات موجه النظام والذكاء الاصطناعي...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <span>تعليمات النظام والمزوّد الذكي (System Prompt & AI Models)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            التحكم في هوية البوت، تعليمات النظام الإلزامية (System Prompt)، واختيار مزود الذكاء الاصطناعي النشط (OpenAI / Gemini / Claude).
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity & Welcome Message */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            <span>هوية البوت والرسالة الترحيبية</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اسم البوت الظاهر للمستخدمين:
              </label>
              <input
                type="text"
                value={settings.botName || ''}
                onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رسالة الترحيب التلقائية في الشات:
              </label>
              <input
                type="text"
                value={settings.welcomeMessage || ''}
                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        </div>

        {/* System Prompt Editor */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <span>موجه النظام الرئيسي (System Prompt)</span>
            </h3>
            <span className="text-[11px] text-slate-400">ينفذ على كافة استعلامات الذكاء الاصطناعي</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            حدد قواعد الأسلوب، قيود عدم التأليف، طريقة الاستشهاد بالكتب والملاحظات، وطريقة الترحيب للمتحدثين صوتياً.
          </p>

          <textarea
            rows={6}
            value={settings.systemPrompt || ''}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
            required
          />
        </div>

        {/* Provider Selection & Models */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>محرك ومزود الذكاء الاصطناعي النشط</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                المزود المفضل للشات (Active AI Provider):
              </label>
              <select
                value={settings.chatProvider || 'auto'}
                onChange={(e) => setSettings({ ...settings, chatProvider: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="auto">تلقائي (حسب المفاتيح النشطة مع تجاوز الأعطال)</option>
                <option value="gemini">Google Gemini (الأسرع والأفضل للتفريغ والملاحظات)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet)</option>
                <option value="none">إيقاف التوليد الخارجي (الاعتماد فقط على القواعد والمكتبة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                درجة الإبداع والحرارة (Temperature: {settings.temperature}):
              </label>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={settings.temperature || 0.3}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="flex-1 accent-indigo-600"
                />
                <span className="font-mono text-xs font-bold text-indigo-600 w-10 text-center">
                  {settings.temperature}
                </span>
              </div>
            </div>
          </div>

          {/* Model Names */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">نموذج Gemini:</label>
              <input
                type="text"
                value={settings.models?.gemini || 'gemini-3.6-flash'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    models: { ...settings.models, gemini: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">نموذج OpenAI:</label>
              <input
                type="text"
                value={settings.models?.openai || 'gpt-4o-mini'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    models: { ...settings.models, openai: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">نموذج Anthropic Claude:</label>
              <input
                type="text"
                value={settings.models?.anthropic || 'claude-3-5-sonnet-20241022'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    models: { ...settings.models, anthropic: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">أقصى مقتطفات من المكتبة:</label>
              <input
                type="number"
                min="1"
                max="15"
                value={settings.maxContextNotes || 5}
                onChange={(e) => setSettings({ ...settings, maxContextNotes: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-4">
              <input
                type="checkbox"
                checked={settings.voiceRepliesDefault !== false}
                onChange={(e) => setSettings({ ...settings, voiceRepliesDefault: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الردود الصوتية مفعلة افتراضياً</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer pt-4">
              <input
                type="checkbox"
                checked={settings.publicUploadsEnabled !== false}
                onChange={(e) => setSettings({ ...settings, publicUploadsEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">السماح برفع المستندات والملفات</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ تعليمات وإعدادات الذكاء الاصطناعي'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
