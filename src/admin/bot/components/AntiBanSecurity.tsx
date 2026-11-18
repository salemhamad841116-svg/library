import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Clock,
  VolumeX,
  Server,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Radio,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { AntiBanConfig } from '../types';
import { safeFetchJson } from '../lib/safeFetch';

export const AntiBanSecurity: React.FC = () => {
  const [config, setConfig] = useState<AntiBanConfig>({
    minDelayMs: 1500,
    maxDelayMs: 3500,
    maxMessagesPerMinute: 15,
    enableComposingPresence: true,
    silentOnGroupJoin: true,
    passiveListeningOnly: true,
    proxyUrl: '',
  });

  const [rateStatus, setRateStatus] = useState<{ allowed: boolean; remaining: number; resetInSeconds: number }>({
    allowed: true,
    remaining: 15,
    resetInSeconds: 60,
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchStatus = async () => {
    const data = await safeFetchJson('/api/anti-ban/status');
    if (!data) return;
    if (data.config) setConfig(data.config);
    if (data.rateLimit) setRateStatus(data.rateLimit);
    if (data.logs) setLogs(data.logs);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const data = await safeFetchJson('/api/anti-ban/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (data) {
        setConfig(data);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Security Overview Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-850 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                بروتوكول الأمان وتفادي الحظر (Anti-Ban Protocols)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                محاكاة السلوك البشري الطبيعي • محدد معدل صارم (15 msg/min) • استماع سلبي صامت
              </p>
            </div>
          </div>

          {/* Rate limit status meter */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-center gap-4">
            <div>
              <span className="text-[10px] text-stone-500 block">رصيد الرسائل المسموحة بالدقيقة</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-amber-400 font-mono">
                  {rateStatus.remaining} / {config.maxMessagesPerMinute}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                  آمن
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin flex items-center justify-center text-[10px] font-mono text-stone-400">
              {rateStatus.resetInSeconds}s
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Anti-Ban Rules & Configuration */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>إعدادات وتخصيص قواعد الحماية</span>
              </h3>
              {savedSuccess && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تم حفظ التعديلات</span>
                </span>
              )}
            </div>

            {/* Rule 1: Human Jitter Delays */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. نطاق التأخير العشوائي البشري (Random Jitter Delay):</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {config.minDelayMs / 1000}s - {config.maxDelayMs / 1000}s
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                إضافة تأخير زمني طبيعي وغير منتظم قبل إرسال أي رد لمنع خوارزميات واتساب من اكتشاف الأتمتة.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">الحد الأدنى (ms):</label>
                  <input
                    type="number"
                    value={config.minDelayMs}
                    onChange={(e) => setConfig({ ...config, minDelayMs: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">الحد الأقصى (ms):</label>
                  <input
                    type="number"
                    value={config.maxDelayMs}
                    onChange={(e) => setConfig({ ...config, maxDelayMs: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Rule 2: Composing presence toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <div>
                <span className="text-xs font-semibold text-stone-200 block">
                  2. محاكاة إشعار "جاري الكتابة..." (Composing Presence)
                </span>
                <p className="text-[11px] text-stone-500">
                  إرسال sock.sendPresenceUpdate('composing') أثناء فترة التأخير
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enableComposingPresence}
                onChange={(e) => setConfig({ ...config, enableComposingPresence: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Rule 3: Rate Limiting Max Msg / Min */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-300">
                  3. محدد المعدل الأقصى (Rate Limiting):
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {config.maxMessagesPerMinute} رسالة / دقيقة
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                كبح فوري لأي رسائل تزيد عن 15 رسالة في الدقيقة للحساب لتفادي رصد النشاط غير المعتاد.
              </p>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={config.maxMessagesPerMinute}
                onChange={(e) => setConfig({ ...config, maxMessagesPerMinute: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Rule 4: Silent on Group Join */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <div>
                <span className="text-xs font-semibold text-stone-200 block">
                  4. الاستماع الصامت ومنع رسائل الترحيب
                </span>
                <p className="text-[11px] text-stone-500">
                  عدم إرسال رسائل ترحيبية عند انضمام أعضاء جدد لمنع إزعاج القروب والإبلاغ
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.silentOnGroupJoin}
                onChange={(e) => setConfig({ ...config, silentOnGroupJoin: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Rule 5: Residential Proxy */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <span className="text-xs font-semibold text-stone-200 block flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-stone-400" />
                <span>5. إعداد البروكسي المنزلي (Residential Proxy / Socks5)</span>
              </span>
              <input
                type="text"
                value={config.proxyUrl || ''}
                onChange={(e) => setConfig({ ...config, proxyUrl: e.target.value })}
                placeholder="socks5://user:pass@proxy-node.gulf-ip.com:1080"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder:text-stone-700 font-mono text-left"
                dir="ltr"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ وتطبيق بروتوكول الأمان'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Sent Audit Logs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>سجل تدقيق الرسائل الصادرة والأمان (Audit Trail)</span>
              </h3>
              <button
                onClick={fetchStatus}
                className="text-[11px] text-stone-500 hover:text-stone-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>تحديث</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    log.status === 'sent'
                      ? 'bg-stone-950 border-stone-800'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-stone-200">{log.recipient}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        log.status === 'sent'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {log.status === 'sent' ? `تم الإرسال (تأخير: ${log.delayAppliedMs}ms)` : 'مكبوح (Rate Limit)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed truncate">{log.text}</p>
                  <span className="text-[9px] text-stone-600 block">
                    {new Date(log.timestamp).toLocaleTimeString('ar-EG')} • trigger: {log.triggerType}
                  </span>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="py-12 text-center text-stone-500 text-xs">
                  لا توجد رسائل صادرة مسجلة في الجلسة الحالية
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
