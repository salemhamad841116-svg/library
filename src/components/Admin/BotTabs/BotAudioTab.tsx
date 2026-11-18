import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Upload, Trash2, Play, Pause, RefreshCw, FileAudio, CheckCircle2, AlertCircle } from 'lucide-react';
import { safeFetchJson, adminFetch } from '../../../admin/bot/lib/safeFetch';

interface AudioFile {
  id: string;
  label: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url: string;
}

export const BotAudioTab: React.FC = () => {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Upload Form State
  const [label, setLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Audio Playback State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    const data = await safeFetchJson('/api/bot/admin/audio-files');
    if (data?.files) setFiles(data.files);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!label.trim()) {
        setLabel(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await safeFetchJson('/api/bot/admin/audio-files', {
        method: 'POST',
        body: JSON.stringify({
          label: label.trim() || selectedFile.name,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'audio/mpeg',
          audioBase64: base64,
        }),
      });

      setIsUploading(false);
      if (res?.success) {
        setStatusMsg('تم رفع وحفظ الملف الصوتي في مكتبة البوت بنجاح');
        setLabel('');
        setSelectedFile(null);
        fetchFiles();
        setTimeout(() => setStatusMsg(null), 3000);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الملف الصوتي من المكتبة؟')) return;
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    await adminFetch(`/api/bot/admin/audio-files/${id}`, { method: 'DELETE' });
    fetchFiles();
  };

  const togglePlay = (file: AudioFile) => {
    if (playingId === file.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(file.url);
    audioRef.current = audio;
    setPlayingId(file.id);

    audio.onended = () => {
      setPlayingId(null);
    };

    audio.onerror = () => {
      alert('تعذر تشغيل الملف الصوتي');
      setPlayingId(null);
    };

    audio.play();
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-500" />
            <span>مكتبة الردود والأصوات المباشرة (Voice Library)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ملفات صوتية مرجعية وردود صوتية مسجلة مسبقاً لاستخدامها في قواعد الردود السريعة أو كمرجع للمحرك الصوتي (TTS Reference Audio).
          </p>
        </div>
        <button
          onClick={fetchFiles}
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

      {/* Upload Box */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-500" />
          <span>رفع ملف صوتي جديد (MP3 / WAV / OGG / M4A)</span>
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تسمية الرد أو المعلق (مثلاً: صوت المعلق، ترحيب خاص):
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="أدخل اسماً توضيحياً للملف الصوتي..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اختر الملف الصوتي من جهازك:
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-600 file:text-white"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'جاري الرفع والحفظ...' : 'رفع إلى مكتبة الأصوات'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Files List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            الملفات الصوتية المخزنة ({files.length})
          </span>
        </div>

        {files.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            لا توجد ملفات صوتية مسجلة حالياً في مكتبة الأصوات.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePlay(file)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                      playingId === file.id
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
                    }`}
                    title={playingId === file.id ? 'إيقاف مؤقت' : 'استماع'}
                  >
                    {playingId === file.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{file.label}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono">{file.file_name}</span>
                      <span>•</span>
                      <span>{(file.size_bytes / 1024).toFixed(1)} ك.ب</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                  >
                    رابط الملف
                  </a>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="حذف الملف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
