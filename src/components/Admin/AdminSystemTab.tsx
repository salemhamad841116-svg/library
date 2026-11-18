import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Power, 
  UserPlus, 
  Database, 
  Download, 
  Upload, 
  HardDrive, 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  Save, 
  AlertTriangle,
  RefreshCw,
  Radio,
  DownloadCloud,
  RotateCcw,
  Zap,
  Check
} from 'lucide-react';
import { SystemSettings } from '../../types/admin';
import { saveSystemSettings, getAdminUsers, getAdminNotes, getAuditLogs } from '../../services/adminStorage';
import { 
  getInstalledVersion, 
  fetchRemoteVersionManifest, 
  applyOTAUpdate, 
  triggerEmergencyRollback, 
  OTAVersionManifest 
} from '../../services/otaUpdateService';

interface AdminSystemTabProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
}

export const AdminSystemTab: React.FC<AdminSystemTabProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');

  // OTA state in Admin Panel
  const [installedVersion] = useState<string>(getInstalledVersion());
  const [isCheckingOTA, setIsCheckingOTA] = useState(false);
  const [otaManifest, setOtaManifest] = useState<OTAVersionManifest | null>(null);
  const [otaStatusMsg, setOtaStatusMsg] = useState('');

  const handleCheckOTA = async () => {
    setIsCheckingOTA(true);
    setOtaStatusMsg('');
    try {
      const manifest = await fetchRemoteVersionManifest();
      if (manifest) {
        setOtaManifest(manifest);
        setOtaStatusMsg(`تم جلب حزمة الإصدار الحي بنجاح: v${manifest.version}`);
      } else {
        setOtaStatusMsg('تعذر جلب ملف المانيفست أو أن الاتصال غير متاح.');
      }
    } catch (e) {
      setOtaStatusMsg('حدث خطأ أثناء فحص الباتشات الحية.');
    } finally {
      setIsCheckingOTA(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(formData);
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportFullBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      settings: formData,
      users: getAdminUsers(),
      notes: getAdminNotes(),
      auditLogs: getAuditLogs()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `full-backup-system-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupStatus('تم تصدير النسخة الاحتياطية الشاملة بنجاح.');
    setTimeout(() => setBackupStatus(''), 3000);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.settings) {
            onUpdateSettings(parsed.settings);
            saveSystemSettings(parsed.settings);
            setBackupStatus('تمت استعادة إعدادات النظام وقواعد البيانات بنجاح!');
            setTimeout(() => setBackupStatus(''), 3000);
          } else {
            alert('ملف النسخة الاحتياطية غير صالح.');
          }
        } catch (err) {
          alert('خطأ في قراءة ملف النسخة الاحتياطية.');
        }
      };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      <form onSubmit={handleFormSubmit} className="space-y-6 text-xs">
        {/* Status Alert */}
        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>تم حفظ إعدادات التطبيق وتحديث سياسات التشغيل بنجاح!</span>
          </div>
        )}

        {/* Section 1: General & Maintenance */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Settings className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">إعدادات التطبيق العامة والصيانة الحية</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">اسم المنصة / التطبيق</label>
              <input
                type="text"
                value={formData.appName}
                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">بريد تنبيهات الأمان (Alert Email)</label>
              <input
                type="email"
                value={formData.securityAlertEmail}
                onChange={(e) => setFormData({ ...formData, securityAlertEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Maintenance Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Power className="w-4 h-4 text-amber-500" />
                  <span>وضع الصيانة الحية (Maintenance Mode)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">منع دخول المستخدمين العاديين وإظهار صفحة صيانة مؤقتة</p>
              </div>

              <input
                type="checkbox"
                checked={formData.maintenanceMode}
                onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded-xs cursor-pointer"
              />
            </div>

            {/* Registration Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-500" />
                  <span>السماح بالتسجيل الجديد (Registrations)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">تمكين زوار الجدد من إنشاء حسابات جديدة</p>
              </div>

              <input
                type="checkbox"
                checked={formData.allowRegistrations}
                onChange={(e) => setFormData({ ...formData, allowRegistrations: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded-xs cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Security & Storage Quotas */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">سياسات الأمان والحصص التخزينية (Quotas)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الحد الأقصى لرفع الملفات (MB)</label>
              <input
                type="number"
                value={formData.maxUploadSizeMB}
                onChange={(e) => setFormData({ ...formData, maxUploadSizeMB: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">المساحة المبدئية للمستخدم المجاني (MB)</label>
              <input
                type="number"
                value={formData.defaultUserStorageMB}
                onChange={(e) => setFormData({ ...formData, defaultUserStorageMB: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">مهلة انتهاء الجلسة (Minutes)</label>
              <input
                type="number"
                value={formData.sessionTimeoutMinutes}
                onChange={(e) => setFormData({ ...formData, sessionTimeoutMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>إلزامية التحقق الثنائي للمدراء (Enforce 2FA for Admin)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">فرض رمز التحقق 2FA عند كل عملية دخول لوحة الإدارة</p>
            </div>

            <input
              type="checkbox"
              checked={formData.require2FAForAdmin}
              onChange={(e) => setFormData({ ...formData, require2FAForAdmin: e.target.checked })}
              className="w-5 h-5 text-indigo-600 rounded-xs cursor-pointer"
            />
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-colors cursor-pointer flex items-center gap-2 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الإعدادات الفعالة</span>
          </button>
        </div>
      </form>

      {/* Section 3: Backup & Restore Engine */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">النسخ الاحتياطي واستعادة البيانات الشاملة</h3>
        </div>

        {backupStatus && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
            {backupStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>تصدير نسخة احتياطية كاملة (Full Data Dump)</span>
            </h4>
            <p className="text-slate-500 text-[11px]">
              تحميل كافة بيانات المستخدمين، الملاحظات، سجلات التدقيق والتكوين في ملف JSON مشفر.
            </p>
            <button
              onClick={handleExportFullBackup}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
            >
              تحميل نسخة الحفظ (Export JSON)
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>استعادة النسخة الاحتياطية (Restore Dump)</span>
            </h4>
            <p className="text-slate-500 text-[11px]">
              رفع ملف النسخة الاحتياطية لاسترجاع التكوين ومحتويات النظام.
            </p>
            <label className="inline-block px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl cursor-pointer">
              اختر ملف Backup JSON
              <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Section 4: OTA Live Updates & Crash-Guard */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                منظومة التحديثات عبر الهواء (OTA Live Deployment & Rollback)
              </h3>
              <p className="text-[11px] text-slate-500">
                إرسال وإدارة التعديلات البرمجية وتحديثات الواجهة مباشرة للأجهزة بدون رفع للمتاجر
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-extrabold text-[11px]">
            الإصدار المثبت: v{installedVersion}
          </span>
        </div>

        {otaStatusMsg && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>{otaStatusMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DownloadCloud className="w-4 h-4 text-blue-600" />
                <span>فحص الباتشات الحية (Check OTA Patches)</span>
              </h4>
              <button
                type="button"
                onClick={handleCheckOTA}
                disabled={isCheckingOTA}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingOTA ? 'animate-spin' : ''}`} />
                <span>{isCheckingOTA ? 'جاري الفحص...' : 'فحص الآن'}</span>
              </button>
            </div>

            <p className="text-slate-500 text-[11px]">
              التحقق من ملف المانيفست المباشر وتنزيل حزمة الواجهة والمنطق البرمجي في الخلفية.
            </p>

            {otaManifest && (
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 space-y-1.5">
                <div className="font-bold text-indigo-600 dark:text-indigo-400">
                  {otaManifest.title} (v{otaManifest.version})
                </div>
                <div className="text-[10px] text-slate-500">
                  نوع الباتش: {otaManifest.patchType} • القناة: {otaManifest.releaseChannel}
                </div>
                <button
                  type="button"
                  onClick={() => applyOTAUpdate(otaManifest.version)}
                  className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>تطبيق التحديث وإعادة التحميل الفوري</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>إجراءات الطوارئ والتراجع (Rollback Engine)</span>
            </h4>
            <p className="text-slate-500 text-[11px]">
              نظام الحماية من الانهيار (Crash-Guard) يراقب سلامة الإقلاع. يمكنك أيضاً إجراء تراجع يدوي وتطهير التخزين المؤقت فوراً.
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm('هل أنت متأكد من رغبتك في تفريغ الذاكرة المؤقتة والتراجع للإصدار المستقر السابق؟')) {
                  triggerEmergencyRollback('تراجع يدوي من لوحة الإدارة');
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراجع طارئ وتفريغ Service Worker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
