import React, { useState } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  Volume2,
  BookOpen,
  Sparkles,
  Zap,
  FileText,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import { BotMessage } from '../types';
import { AudioPlayerBubble } from './AudioPlayerBubble';

interface ChatMessageItemProps {
  message: BotMessage;
  userAvatar: string;
  botAvatar?: string;
  botName: string;
  onAudioPlayStateChange?: (isPlaying: boolean) => void;
  speechSpeed?: number;
  onRequestTts?: (text: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  userAvatar,
  botAvatar,
  botName,
  onAudioPlayStateChange,
  speechSpeed = 1.0,
  onRequestTts,
}) => {
  const isBot = message.sender === 'bot';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Basic markdown / text formatting
  const formatText = (content: string) => {
    const paragraphs = content.split('\n');
    return paragraphs.map((para, idx) => {
      if (!para.trim()) return <div key={idx} className="h-2" />;

      // Bullet lists
      if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
        const bulletText = para.trim().substring(2);
        return (
          <li key={idx} className="mr-4 list-disc text-slate-200">
            {renderInlineMarkdown(bulletText)}
          </li>
        );
      }

      // Numbered lists
      if (/^\d+\.\s/.test(para.trim())) {
        const match = para.trim().match(/^\d+\.\s/);
        const numText = para.trim().substring(match![0].length);
        return (
          <li key={idx} className="mr-4 list-decimal text-slate-200">
            {renderInlineMarkdown(numText)}
          </li>
        );
      }

      return (
        <p key={idx} className="leading-relaxed mb-1.5 last:mb-0">
          {renderInlineMarkdown(para)}
        </p>
      );
    });
  };

  // Bold & backtick inline formatting
  const renderInlineMarkdown = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`flex items-start gap-2.5 sm:gap-3.5 my-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isBot ? 'justify-start' : 'justify-end'
      }`}
    >
      {/* Bot Avatar */}
      {isBot && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-900/30 ring-1 ring-cyan-400/30">
          {botAvatar ? (
            <img src={botAvatar} alt={botName} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <Bot className="w-5 h-5 drop-shadow" />
          )}
        </div>
      )}

      {/* Message Content Bubble */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-3.5 sm:p-4 text-sm transition-all shadow-md ${
          isBot
            ? 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-sm shadow-slate-950/40'
            : 'bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white rounded-tr-sm shadow-indigo-900/40'
        }`}
      >
        {/* Source badge for bot messages */}
        {isBot && (message.source || message.sourceNoteTitle || message.matchedRuleTitle) && (
          <div className="mb-2 flex items-center gap-1.5 flex-wrap">
            {message.source === 'library' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <BookOpen className="w-3 h-3" />
                <span>مستند من مكتبة الملاحظات: {message.sourceNoteTitle || 'ملاحظة معتمدة'}</span>
              </span>
            )}
            {message.source === 'rule' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Zap className="w-3 h-3" />
                <span>إجابة فورية معتمدة: {message.matchedRuleTitle || 'قاعدة دقيقة'}</span>
              </span>
            )}
            {message.source === 'ai' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="w-3 h-3" />
                <span>تحليل الذكاء الاصطناعي</span>
              </span>
            )}
          </div>
        )}

        {/* User Attachments Preview */}
        {!isBot && message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {message.attachments.map((att, aIdx) => (
              <div
                key={aIdx}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-xs"
              >
                {att.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-emerald-200" />
                ) : att.type.startsWith('video/') ? (
                  <Film className="w-4 h-4 text-purple-200" />
                ) : (
                  <FileText className="w-4 h-4 text-cyan-200" />
                )}
                <span className="truncate max-w-[200px] font-medium">{att.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message Text */}
        <div className="text-slate-100 text-[13.5px] sm:text-sm font-normal leading-relaxed break-words">
          {formatText(message.text)}
        </div>

        {/* Bot Audio Player (Voice Message) */}
        {isBot && (message.audioUrl || message.audioBase64) && (
          <AudioPlayerBubble
            audioSrc={message.audioUrl || `data:audio/mp3;base64,${message.audioBase64}`}
            onPlayStateChange={onAudioPlayStateChange}
            speed={speechSpeed}
          />
        )}

        {/* Footer actions for message (Copy / TTS) */}
        {isBot && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[10px] text-slate-500 font-mono">{message.timestamp}</span>
            <div className="flex items-center gap-1.5">
              {/* Optional Read Aloud button if no audio */}
              {!message.audioUrl && !message.audioBase64 && onRequestTts && (
                <button
                  type="button"
                  onClick={() => onRequestTts(message.text)}
                  title="استماع صوتي للإجابة"
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Copy button */}
              <button
                type="button"
                onClick={handleCopy}
                title="نسخ النص"
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {!isBot && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 shadow-md text-base select-none">
          {userAvatar || '🐪'}
        </div>
      )}
    </div>
  );
};
