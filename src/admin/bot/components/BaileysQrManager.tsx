import React, { useState } from 'react';
import {
  QrCode,
  Smartphone,
  RefreshCw,
  Power,
  CheckCircle2,
  FolderLock,
  Radio,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { BaileysState } from '../types';
import { adminFetch } from '../lib/safeFetch';

interface BaileysQrManagerProps {
  baileysState: BaileysState | null;
  onRefresh: () => void;
}

export const BaileysQrManager: React.FC<BaileysQrManagerProps> = ({
  baileysState,
  onRefresh,
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleAction = async (action: 'connect' | 'disconnect' | 'refresh_qr') => {
    setIsToggling(true);
    try {
      await adminFetch('/api/baileys/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                محرك الاتصال والاقتران (@whiskeysockets/baileys)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                إدارة الجلسات المستمرة (useMultiFileAuthState) • استماع متعدد المجموعات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction(baileysState?.status === 'connected' ? 'disconnect' : 'connect')}
              disabled={isToggling}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                baileysState?.status === 'connected'
                  ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>
                {isToggling
                  ? 'جاري التنفيذ...'
                  : baileysState?.status === 'connected'
                  ? 'قطع الاتصال (Disconnect)'
                  : 'بدء الاتصال (Connect)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: QR Code & Status */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-md text-center space-y-4">
          <h3 className="text-xs font-bold text-stone-200 flex items-center justify-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>مسح رمز الاستجابة السريعة (WhatsApp QR Code)</span>
          </h3>

          {/* QR Display Frame */}
          <div className="w-64 h-64 mx-auto bg-white p-4 rounded-2xl shadow-2xl flex items-center justify-center border-4 border-stone-800 relative group">
            {baileysState?.qrCodeDataUrl ? (
              <img
                src={baileysState.qrCodeDataUrl}
                alt="Baileys WhatsApp QR Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-stone-800 text-xs font-bold flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
                <span>جاري إنشاء رمز QR...</span>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => handleAction('refresh_qr')}
              disabled={isToggling}
              className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث رمز الـ QR</span>
            </button>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed max-w-xs mx-auto">
            افتح واتساب على هاتفك &gt; الأجهزة المرتبطة &gt; ربط جهاز &gt; امسح الرمز أعلاه لتفعيل استماع البوت.
          </p>
        </div>

        {/* Right Column: Connection State & MultiFile Auth Info */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-amber-400" />
              <span>حالة المصادقة وتخزين الجلسة (Auth State Persistence)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[10px] text-stone-500 block">حالة الاتصال بالخادم</span>
                <span
                  className={`font-bold mt-1 inline-flex items-center gap-1.5 ${
                    baileysState?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      baileysState?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {baileysState?.status === 'connected' ? 'متصل بنجاح (Session Active)' : 'بانتظار المسح'}
                </span>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[10px] text-stone-500 block">مسار تخزين مفاتيح الجلسة</span>
                <span className="font-mono text-amber-300 font-bold mt-1 block truncate">
                  {baileysState?.sessionPath || './auth_info_baileys'}
                </span>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[10px] text-stone-500 block">المجموعات المراقبة حالياً</span>
                <span className="text-stone-200 font-bold mt-1 block">
                  {baileysState?.monitoredGroupsCount || 3} مجموعات نشطة
                </span>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[10px] text-stone-500 block">وضع الاستماع (Passive Listening)</span>
                <span className="text-emerald-400 font-bold mt-1 block">
                  مفعّل (صامت بدون إزعاج)
                </span>
              </div>
            </div>

            {/* Architecture Details */}
            <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 block">
                كيفية تعامل Baileys مع الرسائل الواردة:
              </span>
              <ul className="text-[11px] text-stone-400 space-y-1 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-stone-300">الاستماع السلبي:</strong> استهلاك حدث{' '}
                  <code className="text-amber-300 font-mono">messages.upsert</code> وعزل المعالجة فوراً داخل
                  طابور BullMQ لتفادي حظر الـ Event Loop.
                </li>
                <li>
                  <strong className="text-stone-300">الرسائل الصوتية:</strong> تحميل الـ Buffer الصوتي عبر{' '}
                  <code className="text-amber-300 font-mono">downloadMediaMessage</code> وتمريره لخدمة التفريغ.
                </li>
                <li>
                  <strong className="text-stone-300">استمرارية الجلسة:</strong> حفظ بيانات التشفير{' '}
                  <code className="text-amber-300 font-mono">useMultiFileAuthState</code> على Docker Volume لتفادي
                  إعادة مسح الـ QR عند إعادة تشغيل الحاوية.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
