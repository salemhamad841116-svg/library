import React, { useEffect, useRef } from 'react';
import { Mic, Paperclip, Volume2 } from 'lucide-react';
import { AISphere } from './AISphere';
import { GlassChatMessage, QuickPrompt } from '../types';

interface ChatStreamProps {
  messages: GlassChatMessage[];
  isProcessing: boolean;
  welcomeMessage: string;
  userInitial: string;
  suggestions: QuickPrompt[];
  onSuggestion: (text: string) => void;
  onSpeak: (msg: GlassChatMessage) => void;
}

/** Minimal inline formatting: **bold** and line breaks. */
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

const BotAvatar = () => (
  <div className="gc-avatar" style={{ border: 'none' }}>
    <AISphere size={34} round icon />
  </div>
);

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  isProcessing,
  welcomeMessage,
  userInitial,
  suggestions,
  onSuggestion,
  onSpeak,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isProcessing, messages[messages.length - 1]?.text]);

  return (
    <div className="gc-stream">
      {messages.length === 0 ? (
        <>
          <div className="gc-row bot">
            <BotAvatar />
            <div className="gc-bubble bot">{welcomeMessage}</div>
          </div>
          <div className="gc-empty">
            <AISphere size={64} />
            <h2>كيف يمكنني مساعدتك؟</h2>
            <p>اكتب رسالتك أو اضغط «تحدث» للمحادثة الصوتية</p>
            {suggestions.length > 0 && (
              <div className="gc-suggestions">
                {suggestions.slice(0, 4).map((s) => (
                  <button key={s.id} type="button" className="gc-chip gc-glass" onClick={() => onSuggestion(s.query)}>
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={`gc-row ${m.role}`}>
            {m.role === 'bot' ? (
              <BotAvatar />
            ) : (
              <div className="gc-avatar user">{userInitial}</div>
            )}
            <div className={`gc-bubble ${m.role} ${m.isError ? 'error' : ''}`}>
              {m.attachmentName && (
                <div className="gc-attachment-chip" style={{ marginBottom: 6 }}>
                  <Paperclip size={12} />
                  <span>{m.attachmentName}</span>
                </div>
              )}
              {m.isPending ? (
                <span className="gc-typing" aria-label="جارٍ المعالجة">
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                renderText(m.text)
              )}
              {!m.isPending && (
                <div className="gc-bubble-meta">
                  {m.isVoice && <Mic size={11} />}
                  <span>{m.time}</span>
                  {m.role === 'bot' && !m.isError && (
                    <button type="button" className="gc-speak-btn" onClick={() => onSpeak(m)}>
                      <Volume2 size={11} />
                      استمع
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {isProcessing && messages[messages.length - 1]?.role !== 'bot' && !messages.some((m) => m.isPending && m.role === 'user') && (
        <div className="gc-row bot">
          <BotAvatar />
          <div className="gc-bubble bot">
            <span className="gc-typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
};
