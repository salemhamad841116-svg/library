import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TopHeader } from './components/TopHeader';
import { NavigationDrawer, SESSION_ICONS } from './components/NavigationDrawer';
import { ChatStream } from './components/ChatStream';
import { VoiceTalkButton } from './components/VoiceTalkButton';
import { VoiceWaveform } from './components/VoiceWaveform';
import { MessageInputCard } from './components/MessageInputCard';
import { useVoiceRecorder, blobToBase64 } from './hooks/useVoiceRecorder';
import {
  GlassChatMessage,
  GlassChatSession,
  GlassChatSettings,
  PublicBotConfig,
  QuickPrompt,
} from './types';

const SESSIONS_KEY = 'glass_chat_sessions_v1';
const ACTIVE_KEY = 'glass_chat_active_v1';
const SETTINGS_KEY = 'glass_chat_settings_v1';
const CHANNEL = 'mobile_app';
const DEFAULT_WELCOME = 'أهلاً بك! كيف يمكنني مساعدتك اليوم؟';

const nowTime = () => new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function haptic(ms = 15) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

function pickAudioSrc(data: any): string | undefined {
  const a = data?.audio;
  if (a?.relativeAudioUrl) return a.relativeAudioUrl;
  if (a?.audioBase64) return `data:${a.mimeType || 'audio/mpeg'};base64,${a.audioBase64}`;
  if (a?.audioUrl) return a.audioUrl;
  if (data?.relativeAudioUrl) return data.relativeAudioUrl;
  if (data?.audioBase64) return `data:audio/mpeg;base64,${data.audioBase64}`;
  return data?.audioUrl;
}

export const ChatApp: React.FC = () => {
  const [sessions, setSessions] = useState<GlassChatSession[]>(() => loadJson(SESSIONS_KEY, []));
  const [activeId, setActiveId] = useState<string | null>(() => loadJson<string | null>(ACTIVE_KEY, null));
  const [settings, setSettings] = useState<GlassChatSettings>(() =>
    loadJson(SETTINGS_KEY, { userName: 'المستخدم', autoVoice: true })
  );
  const [config, setConfig] = useState<PublicBotConfig>({});
  const [suggestions, setSuggestions] = useState<QuickPrompt[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorder = useVoiceRecorder();

  // ---------- persistence ----------
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));
    } catch {
      /* quota */
    }
  }, [sessions]);
  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeId));
  }, [activeId]);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // ---------- public config ----------
  useEffect(() => {
    fetch('/api/bot/config')
      .then((r) => r.json())
      .then((d) => setConfig(d || {}))
      .catch(() => {});
    fetch('/api/bot/quick-buttons')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.buttons)) {
          setSuggestions(
            d.buttons
              .map((b: any) => ({
                id: String(b.id ?? b.title ?? b.label),
                title: b.title || b.label || '',
                query: b.query || b.prompt || b.title || '',
              }))
              .filter((b: QuickPrompt) => b.title && b.query)
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (recorder.error) setNotice(recorder.error);
  }, [recorder.error]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const messages = activeSession?.messages || [];

  // ---------- session helpers ----------
  const createSession = useCallback((): string => {
    const id = uid('s');
    const session: GlassChatSession = {
      id,
      title: 'محادثة جديدة',
      iconIndex: Math.floor(Math.random() * SESSION_ICONS.length),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const ensureSession = useCallback((): string => {
    if (activeId && sessions.some((s) => s.id === activeId)) return activeId;
    return createSession();
  }, [activeId, sessions, createSession]);

  const appendMessage = (sessionId: string, msg: GlassChatMessage, titleSeed?: string) => {
    setSessions((prev) =>
      prev
        .map((s) => {
          if (s.id !== sessionId) return s;
          const title =
            s.messages.length === 0 && titleSeed
              ? titleSeed.slice(0, 30) + (titleSeed.length > 30 ? '…' : '')
              : s.title;
          return { ...s, title, updatedAt: Date.now(), messages: [...s.messages, msg] };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  const patchMessage = (sessionId: string, msgId: string, patch: Partial<GlassChatMessage>, titleSeed?: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const isFirst = s.messages[0]?.id === msgId;
        const title = isFirst && titleSeed ? titleSeed.slice(0, 30) + (titleSeed.length > 30 ? '…' : '') : s.title;
        return {
          ...s,
          title,
          messages: s.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
        };
      })
    );
  };

  // ---------- audio playback ----------
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const playAudio = useCallback(
    (src?: string) => {
      if (!src) return;
      stopAudio();
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      audio.play().catch(() => setIsSpeaking(false));
    },
    [stopAudio]
  );

  const speakMessage = async (msg: GlassChatMessage) => {
    if (msg.audioSrc) {
      playAudio(msg.audioSrc);
      return;
    }
    try {
      const res = await fetch('/api/bot/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text }),
      });
      const data = await res.json();
      const src = data?.relativeAudioUrl || (data?.audioBase64 ? `data:audio/mpeg;base64,${data.audioBase64}` : data?.audioUrl);
      if (src) playAudio(src);
      else setNotice('تعذّر توليد الصوت حالياً.');
    } catch {
      setNotice('تعذّر توليد الصوت حالياً.');
    }
  };

  // ---------- core request ----------
  const requestAnswer = async (sessionId: string, payload: Record<string, unknown>) => {
    const res = await fetch('/api/bot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        channel: CHANNEL,
        userName: settings.userName,
        voiceReply: settings.autoVoice,
        ...payload,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || 'تعذّر الحصول على إجابة.');
    }
    return data;
  };

  const pushBotReply = (sessionId: string, data: any) => {
    const audioSrc = pickAudioSrc(data);
    appendMessage(sessionId, {
      id: uid('b'),
      role: 'bot',
      text: data?.answer || 'عذراً، لم أجد إجابة مناسبة.',
      time: nowTime(),
      audioSrc,
    });
    if (settings.autoVoice && audioSrc) playAudio(audioSrc);
  };

  const pushError = (sessionId: string, message: string) => {
    appendMessage(sessionId, { id: uid('e'), role: 'bot', text: message, time: nowTime(), isError: true });
  };

  // ---------- text / attachment send ----------
  const handleSend = async (text: string, file?: File) => {
    if (isProcessing || (!text && !file)) return;
    const sessionId = ensureSession();
    setDrawerOpen(false);

    appendMessage(
      sessionId,
      { id: uid('u'), role: 'user', text: text || `مرفق: ${file?.name}`, time: nowTime(), attachmentName: file?.name },
      text || file?.name
    );
    setIsProcessing(true);

    try {
      let message = text;
      if (file) {
        const fileBase64 = await blobToBase64(file);
        const up = await fetch('/api/bot/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileType: file.type, fileBase64 }),
        }).then((r) => r.json());
        const extracted = String(up?.extractedText || '').slice(0, 6000);
        message = [text || `حلّل هذا المرفق: ${file.name}`, extracted && `\n\n[محتوى المرفق «${file.name}»]:\n${extracted}`]
          .filter(Boolean)
          .join('');
      }
      const data = await requestAnswer(sessionId, { message });
      pushBotReply(sessionId, data);
    } catch (err: any) {
      pushError(sessionId, err?.message || 'حدث خطأ في الاتصال بالخادم.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- voice ----------
  const handleVoicePress = async () => {
    if (isSpeaking && !recorder.isRecording) {
      stopAudio();
      return;
    }

    if (!recorder.isRecording) {
      if (isProcessing) return;
      stopAudio();
      haptic(15);
      await recorder.start();
      return;
    }

    haptic(10);
    const recorded = await recorder.stop();
    if (!recorded) {
      setNotice('التسجيل قصير جداً، اضغط «تحدث» وتكلّم ثم اضغط مرة أخرى للإرسال.');
      return;
    }

    const sessionId = ensureSession();
    const pendingId = uid('u');
    appendMessage(sessionId, { id: pendingId, role: 'user', text: '', time: nowTime(), isVoice: true, isPending: true });
    setIsProcessing(true);

    try {
      const data = await requestAnswer(sessionId, {
        audioBase64: recorded.base64,
        audioMimeType: recorded.mimeType,
        voiceReply: true,
      });
      const heard = String(data?.query || '🎤 رسالة صوتية');
      patchMessage(sessionId, pendingId, { text: heard, isPending: false }, heard);
      pushBotReply(sessionId, { ...data });
    } catch (err: any) {
      patchMessage(sessionId, pendingId, { text: '🎤 رسالة صوتية', isPending: false });
      pushError(sessionId, err?.message?.includes('مطلوب') ? 'لم أتمكن من فهم التسجيل، حاول مرة أخرى بصوت أوضح.' : err?.message || 'حدث خطأ.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- session actions ----------
  const handleNewChat = () => {
    stopAudio();
    if (activeSession && activeSession.messages.length === 0) {
      setDrawerOpen(false);
      return;
    }
    createSession();
    setDrawerOpen(false);
  };

  const handleDelete = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === activeId) setActiveId(null);
  };

  const clearAll = () => {
    if (!window.confirm('حذف جميع الدردشات المحفوظة على هذا الجهاز؟')) return;
    setSessions([]);
    setActiveId(null);
    setSettingsOpen(false);
  };

  // ---------- waveform mode ----------
  const waveActive = recorder.isRecording || isSpeaking || (isProcessing && messages.some((m) => m.isPending));
  const waveMode: 'mic' | 'speaking' | 'thinking' = recorder.isRecording ? 'mic' : isSpeaking ? 'speaking' : 'thinking';
  const waveCaption = recorder.isRecording
    ? 'أستمع إليك… اضغط للإرسال'
    : isSpeaking
      ? 'المساعد يتحدث…'
      : waveActive
        ? 'جارٍ تحليل صوتك…'
        : '';

  const userInitial = (settings.userName || 'م').trim().charAt(0) || 'م';

  return (
    <div className="gc-container">
      <div className="gc-chat-column">
        <TopHeader
          onToggleDrawer={() => setDrawerOpen((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
          statusText={isProcessing ? 'يكتب الآن…' : 'متصل / Online'}
        />

        <ChatStream
          messages={messages}
          isProcessing={isProcessing}
          welcomeMessage={config.welcomeMessage || DEFAULT_WELCOME}
          userInitial={userInitial}
          suggestions={suggestions}
          onSuggestion={(q) => handleSend(q)}
          onSpeak={speakMessage}
        />

        {/* Dynamic AI voice overlay */}
        <VoiceWaveform active={waveActive} mode={waveMode} levelRef={recorder.levelRef} />
        <div className={`gc-wave-caption ${waveCaption ? 'visible' : ''}`}>{waveCaption}</div>

        <VoiceTalkButton
          isRecording={recorder.isRecording}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          onPress={handleVoicePress}
        />

        <MessageInputCard
          disabled={isProcessing || recorder.isRecording}
          isRecording={recorder.isRecording}
          onSend={handleSend}
          onToggleMic={handleVoicePress}
        />

        {notice && (
          <div
            className="gc-glass"
            role="status"
            style={{
              position: 'absolute',
              top: 70,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 70,
              padding: '10px 16px',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              maxWidth: '90%',
              textAlign: 'center',
              background: 'rgba(40, 20, 80, 0.85)',
            }}
          >
            {notice}
          </div>
        )}
      </div>

      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessions={sessions}
        activeSessionId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setDrawerOpen(false);
        }}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        userName={settings.userName}
        onOpenSettings={() => {
          setDrawerOpen(false);
          setSettingsOpen(true);
        }}
      />

      {settingsOpen && (
        <div className="gc-modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="gc-modal gc-glass" onClick={(e) => e.stopPropagation()}>
            <h3>الإعدادات</h3>
            <label className="gc-field">
              الاسم المعروض
              <input
                type="text"
                value={settings.userName}
                maxLength={30}
                onChange={(e) => setSettings((s) => ({ ...s, userName: e.target.value }))}
              />
            </label>
            <label className="gc-toggle-row">
              <span>تشغيل ردود المساعد صوتياً تلقائياً</span>
              <input
                type="checkbox"
                checked={settings.autoVoice}
                onChange={(e) => setSettings((s) => ({ ...s, autoVoice: e.target.checked }))}
              />
            </label>
            <div className="gc-modal-actions">
              <button type="button" className="gc-btn-ghost gc-btn-danger" onClick={clearAll}>
                حذف كل الدردشات
              </button>
              <button type="button" className="gc-btn-ghost" onClick={() => setSettingsOpen(false)}>
                تم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
