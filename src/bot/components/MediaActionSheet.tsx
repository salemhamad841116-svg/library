import React, { useRef } from 'react';
import { Camera, Video, Image, X } from 'lucide-react';

interface MediaActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
}

export const MediaActionSheet: React.FC<MediaActionSheetProps> = ({
  isOpen,
  onClose,
  onFileSelected,
}) => {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Hidden file inputs for hardware capture */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100">الوسائط والكاميرا</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {/* 1. Capture Photo */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 transition-all text-right group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">التقاط صورة فوتوغرافية</div>
              <div className="text-xs text-slate-400">فتح الكاميرا والتقاط صورة مباشرة</div>
            </div>
          </button>

          {/* 2. Record Video */}
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 hover:border-violet-500/40 text-slate-200 hover:text-violet-300 transition-all text-right group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">تسجيل فيديو قصير</div>
              <div className="text-xs text-slate-400">تشغيل تسجيل الفيديو من الكاميرا</div>
            </div>
          </button>

          {/* 3. Choose from Gallery */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 transition-all text-right group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">اختيار من المعرض والملفات</div>
              <div className="text-xs text-slate-400">رفع الصور أو مقاطع الفيديو المخزنة</div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
};
