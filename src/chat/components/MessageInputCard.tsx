import React, { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Paperclip, SendHorizontal, X } from 'lucide-react';

interface MessageInputCardProps {
  disabled: boolean;
  isRecording: boolean;
  onSend: (text: string, file?: File) => void;
  onToggleMic: () => void;
}

/** Capsule glass input with attachments, mic, camera and the flying cyan send button. */
export const MessageInputCard: React.FC<MessageInputCardProps> = ({
  disabled,
  isRecording,
  onSend,
  onToggleMic,
}) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const canSend = !disabled && (text.trim().length > 0 || !!file);

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim(), file || undefined);
    setText('');
    setFile(null);
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  };

  return (
    <div className="gc-bottom">
      <div className="gc-input-label">صندوق الرسائل</div>
      <div className="gc-input-card gc-glass">
        {/* Send button — far right (first child in RTL) */}
        <button type="button" className="gc-send" onClick={submit} disabled={!canSend} aria-label="إرسال">
          <SendHorizontal size={20} strokeWidth={2.6} style={{ transform: 'scaleX(-1)' }} />
        </button>

        <div className="gc-input-main">
          {file && (
            <div className="gc-attachment-chip">
              <Paperclip size={12} />
              <span>{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="إزالة المرفق">
                <X size={13} />
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            className="gc-textarea"
            rows={1}
            value={text}
            placeholder="اكتب رسالتك..."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as any).isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            dir="auto"
          />
          <div className="gc-input-tools">
            <button type="button" className="gc-tool" onClick={() => fileRef.current?.click()} aria-label="إرفاق ملف">
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              className={`gc-tool ${isRecording ? 'recording' : ''}`}
              onClick={onToggleMic}
              aria-label="تسجيل صوتي"
            >
              <Mic size={18} />
            </button>
            <button type="button" className="gc-tool" onClick={() => cameraRef.current?.click()} aria-label="الكاميرا">
              <Camera size={18} />
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pdf,.docx,.txt,.md,.csv,.json,image/*,audio/*,video/*"
          onChange={pickFile}
        />
        <input ref={cameraRef} type="file" hidden accept="image/*,video/*" capture="environment" onChange={pickFile} />
      </div>
    </div>
  );
};
