import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Camera, X, FileText, Film, Image as ImageIcon, Music } from 'lucide-react';
import { MediaActionSheet } from './MediaActionSheet';

interface ComposerProps {
  onSendMessage: (text: string, attachment?: File) => void;
  isSending: boolean;
  placeholder?: string;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isSending,
  placeholder = 'اكتب رسالتك أو استفسارك هنا...',
}) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMediaSheetOpen, setIsMediaSheetOpen] = useState(false);
  const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>('rtl');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto detect text direction based on first non-whitespace char
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setTextDirection('rtl');
      return;
    }
    const firstChar = trimmed[0];
    const isArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(firstChar);
    setTextDirection(isArabic ? 'rtl' : 'ltr');
  }, [text]);

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 140);
    textarea.style.height = `${Math.max(nextHeight, 44)}px`;
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !selectedFile) || isSending) return;

    onSendMessage(trimmed, selectedFile || undefined);
    setText('');
    setSelectedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (file.type.startsWith('video/')) return <Film className="w-4 h-4 text-violet-400" />;
    if (file.type.startsWith('audio/')) return <Music className="w-4 h-4 text-cyan-400" />;
    return <FileText className="w-4 h-4 text-amber-400" />;
  };

  return (
    <>
      <MediaActionSheet
        isOpen={isMediaSheetOpen}
        onClose={() => setIsMediaSheetOpen(false)}
        onFileSelected={(file) => setSelectedFile(file)}
      />

      {/* Hidden Document Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.csv,audio/*,image/*"
        className="hidden"
        onChange={handleDocumentSelect}
      />

      <div className="w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 px-3.5 py-2.5 sm:px-6 sm:py-3 transition-all">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* File Preview Badge */}
          {selectedFile && (
            <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-slate-800/80 border border-slate-700/60 w-fit text-xs text-slate-200 animate-in fade-in">
              {getFileIcon(selectedFile)}
              <span className="font-medium max-w-[200px] truncate">{selectedFile.name}</span>
              <span className="text-slate-400 text-[10px]">
                ({(selectedFile.size / 1024).toFixed(0)} KB)
              </span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Controls Bar */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* Attachment Button (+) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="إرفاق مستند أو ملف"
              title="إرفاق ملف أو مستند (PDF, Word, TXT...)"
              className="p-2.5 rounded-2xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700/50 hover:border-cyan-500/30 transition-all shrink-0 active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* ONE Unified Camera & Video Button */}
            <button
              type="button"
              onClick={() => setIsMediaSheetOpen(true)}
              aria-label="كاميرا وفيديو"
              title="التقاط صورة أو تسجيل فيديو"
              className="p-2.5 rounded-2xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/50 hover:border-emerald-500/30 transition-all shrink-0 active:scale-95"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Auto-expanding Input Area */}
            <div className="flex-1 relative rounded-2xl bg-slate-800/60 border border-slate-700/60 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                dir={textDirection}
                placeholder={placeholder}
                disabled={isSending}
                className="w-full resize-none bg-transparent px-4 py-2.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none min-h-[44px] max-h-[140px] leading-relaxed"
              />
            </div>

            {/* High-Contrast Send Button */}
            <button
              type="submit"
              disabled={(!text.trim() && !selectedFile) || isSending}
              aria-label="إرسال"
              className={`p-2.5 rounded-2xl font-semibold transition-all shrink-0 shadow-lg active:scale-95 flex items-center justify-center ${
                text.trim() || selectedFile
                  ? 'bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-cyan-600/30 hover:shadow-cyan-500/50 hover:brightness-110 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50'
              }`}
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
