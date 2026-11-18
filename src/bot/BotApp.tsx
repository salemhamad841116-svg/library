import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Plus,
  Volume2,
  VolumeX,
  Bot,
  Sparkles,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import {
  BotMessage,
  ChatSession,
  BotPublicConfig,
  QuickButton,
  UserVoiceSettings,
} from './types';
import { ChatMessageItem } from './components/ChatMessageItem';
import { VoiceOrb } from './components/VoiceOrb';
import { Composer } from './components/Composer';
import { Sidebar } from './components/Sidebar';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_CONFIG: BotPublicConfig = {
  botName: 'مساعد مسرق الذكي',
  welcomeMessage:
    'مرحباً بك! أنا المساعد الذكي المعتمد لمنصة مسرق. تفضل بطرح أي سؤال وسأجيبك فوراً من قاعدة المعرفة والملاحظات.',
  voiceEnabled: true,
};

const DEFAULT_SETTINGS: UserVoiceSettings = {
  autoPlayVoice: true,
  speechSpeed: 1.0,
  inputLanguage: 'ar-SA',
  soundEffects: true,
};

export const BotApp: React.FC = () => {
  const [config, setConfig] = useState<BotPublicConfig>(DEFAULT_CONFIG);
  const [quickButtons, setQuickButtons] = useState<QuickButton[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem('bot_chat_sessions');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('bot_active_session_id') || '';
  });

  const [settings, setSettings] = useState<UserVoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('bot_user_settings');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_SETTINGS;
  });

  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('bot_user_avatar') || '🐪';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bot_chat_sessions', JSON.stringify(sessions));
    } catch (_) {}
  }, [sessions]);

  // Sync activeSessionId to localStorage
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('bot_active_session_id', activeSessionId);
    }
  }, [activeSessionId]);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bot_user_settings', JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  // Initialize or fetch public config & quick buttons
  useEffect(() => {
    fetch('/api/bot/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.config) {
          setConfig((prev) => ({ ...prev, ...data.config }));
        }
      })
      .catch((e) => console.warn('Fetch bot config notice:', e));

    fetch('/api/bot/quick-buttons')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.buttons)) {
          setQuickButtons(data.buttons);
        }
      })
      .catch((e) => console.warn('Fetch quick buttons notice:', e));
  }, []);

  // Ensure an active session exists
  useEffect(() => {
    if (!activeSessionId || !sessions.find((s) => s.id === activeSessionId)) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      } else {
        handleCreateNewChat();
      }
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  const handleCreateNewChat = () => {
    const newId = 'session_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'محادثة جديدة',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (activeSessionId === id && filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    );
  };

  const handleClearAllSessions = () => {
    setSessions([]);
    localStorage.removeItem('bot_chat_sessions');
    handleCreateNewChat();
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, isProcessing]);

  // Handle scroll listener for "Scroll to bottom" button
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isFarFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const stopAllAudio = () => {
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const playReplyAudio = (audioUrl?: string, audioBase64?: string) => {
    if (!settings.autoPlayVoice) return;
    const src = audioUrl || (audioBase64 ? `data:audio/mp3;base64,${audioBase64}` : null);
    if (!src) return;

    stopAllAudio();
    try {
      const audio = new Audio(src);
      audio.playbackRate = settings.speechSpeed || 1.0;
      activeAudioPlayerRef.current = audio;
      setIsPlayingAudio(true);

      audio.onended = () => {
        setIsPlayingAudio(false);
        activeAudioPlayerRef.current = null;
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        activeAudioPlayerRef.current = null;
      };

      audio.play().catch((err) => {
        console.warn('Auto play audio notice:', err);
        setIsPlayingAudio(false);
      });
    } catch (e) {
      console.warn('Audio initialization notice:', e);
    }
  };

  const handleSendMessage = async (text: string, attachmentFile?: File) => {
    if (!text.trim() && !attachmentFile) return;
    if (isProcessing) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      targetSessionId = 'session_' + Date.now();
      handleCreateNewChat();
    }

    const timestamp = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Prepare user message
    const userMessage: BotMessage = {
      id: 'msg_' + Date.now() + '_user',
      sender: 'user',
      text: text || (attachmentFile ? `[مرفق: ${attachmentFile.name}]` : ''),
      timestamp,
      attachments: attachmentFile
        ? [
            {
              name: attachmentFile.name,
              type: attachmentFile.type,
              size: attachmentFile.size,
            },
          ]
        : undefined,
    };

    // Update active session messages
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === targetSessionId) {
          const isFirstMessage = s.messages.length === 0;
          const updatedTitle =
            isFirstMessage && text.trim()
              ? text.trim().slice(0, 32) + (text.length > 32 ? '...' : '')
              : s.title;

          return {
            ...s,
            title: updatedTitle,
            updatedAt: Date.now(),
            messages: [...s.messages, userMessage],
          };
        }
        return s;
      })
    );

    setIsProcessing(true);

    try {
      let uploadedAttachmentUrl: string | undefined = undefined;

      // If attachment exists, upload first
      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        try {
          const uploadRes = await fetch('/api/bot/upload', {
            method: 'POST',
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData?.url) {
            uploadedAttachmentUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.warn('File upload warning:', uploadErr);
        }
      }

      // 2. Query /api/bot/chat
      const res = await fetch('/api/bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: targetSessionId,
          voiceReply: settings.autoPlayVoice,
          attachmentUrl: uploadedAttachmentUrl,
          attachmentName: attachmentFile?.name,
        }),
      });

      const data = await res.json();

      const botReplyText =
        data?.answer ||
        data?.text ||
        'عذراً، لم أتمكن من العثور على إجابة في الوقت الحالي. يرجى إعادة المحاولة.';

      const botTimestamp = new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const botMessage: BotMessage = {
        id: 'msg_' + Date.now() + '_bot',
        sender: 'bot',
        text: botReplyText,
        timestamp: botTimestamp,
        audioUrl: data?.audioUrl,
        audioBase64: data?.audioBase64,
        source: data?.source || 'ai',
        matchedRuleTitle: data?.matchedRuleTitle,
        sourceNoteTitle: data?.sourceNoteTitle,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, botMessage],
            };
          }
          return s;
        })
      );

      // Play audio reply if available and voice reply is active
      if (data?.audioUrl || data?.audioBase64) {
        playReplyAudio(data.audioUrl, data.audioBase64);
      }
    } catch (err) {
      console.warn('Chat request error:', err);
      const errorMessage: BotMessage = {
        id: 'msg_' + Date.now() + '_err',
        sender: 'bot',
        text: 'حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        timestamp: new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isError: true,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, updatedAt: Date.now(), messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestTts = async (text: string) => {
    try {
      const res = await fetch('/api/bot/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data?.audioUrl || data?.audioBase64) {
        playReplyAudio(data.audioUrl, data.audioBase64);
      }
    } catch (e) {
      console.warn('TTS request error:', e);
    }
  };

  const totalMessagesCount = sessions.reduce((acc, s) => acc + s.messages.length, 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Sidebar with Chat History & Navigation (ZERO ADMIN CONTROLS) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewChat={handleCreateNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        quickButtons={quickButtons}
        onSelectQuickButton={(prompt) => handleSendMessage(prompt)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        botName={config.botName}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="القائمة الجانبية"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
              </div>

              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                  {config.botName}
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-medium">مباشر</span>
                  <span>•</span>
                  <span>إجابات معتمدة وفورية</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Voice Reply Audio Toggle */}
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({ ...prev, autoPlayVoice: !prev.autoPlayVoice }))
              }
              title={
                settings.autoPlayVoice
                  ? 'الرد الصوتي التلقائي مفعل (اضغط للتعطيل)'
                  : 'الرد الصوتي معطل (اضغط للتفعيل)'
              }
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
                settings.autoPlayVoice
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {settings.autoPlayVoice ? (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">صوت الإجابة</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">صامت</span>
                </>
              )}
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleCreateNewChat}
              title="محادثة جديدة"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Messages Body */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 space-y-2 relative"
        >
          {messages.length === 0 ? (
            /* Empty State / Welcome Hero */
            <div className="max-w-2xl mx-auto my-auto py-8 sm:py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative inline-block">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-cyan-600/30 ring-4 ring-cyan-500/20">
                  <Bot className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-2 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs ring-4 ring-slate-950 shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>24/7</span>
                </div>
              </div>

              <div className="space-y-2 px-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400">
                  {config.botName}
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                  {config.welcomeMessage}
                </p>
              </div>

              {/* Quick Topic Chips */}
              {quickButtons.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-slate-400 font-medium mb-3">
                    أو اختر من الأسئلة الشائعة للبدء:
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                    {quickButtons.map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => handleSendMessage(btn.prompt)}
                        className="py-2 px-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-medium shadow-sm transition-all transform hover:-translate-y-0.5 active:scale-95"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Message List */
            <div className="max-w-4xl mx-auto pb-6">
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  userAvatar={userAvatar}
                  botAvatar={config.avatarUrl}
                  botName={config.botName}
                  onAudioPlayStateChange={setIsPlayingAudio}
                  speechSpeed={settings.speechSpeed}
                  onRequestTts={handleRequestTts}
                />
              ))}

              {/* Typing indicator */}
              {isProcessing && (
                <div className="flex items-center gap-3 my-3">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="rounded-3xl p-3.5 bg-slate-900/90 border border-slate-800 text-slate-300 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span>المساعد يكتب الإجابة ويبحث في الملاحظات...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll To Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            aria-label="النزول للأسفل"
            className="absolute bottom-24 right-6 z-30 p-2.5 rounded-full bg-slate-900/90 border border-slate-700 text-cyan-400 hover:text-cyan-300 shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* GLOWING PULSING NEON VOICE ORB (Positioned ABOVE composer on the LEFT) */}
        <VoiceOrb
          onTranscript={(speechText) => handleSendMessage(speechText)}
          isProcessing={isProcessing}
          isPlayingAudio={isPlayingAudio}
          onStopAudio={stopAllAudio}
        />

        {/* BOTTOM MESSAGE COMPOSER */}
        <Composer
          onSendMessage={handleSendMessage}
          isSending={isProcessing}
          placeholder="اكتب رسالتك أو استفسارك هنا..."
        />
      </div>

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setUserAvatar(localStorage.getItem('bot_user_avatar') || '🐪');
        }}
        totalMessagesCount={totalMessagesCount}
        totalSessionsCount={sessions.length}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(part) => setSettings((prev) => ({ ...prev, ...part }))}
        onClearAllSessions={handleClearAllSessions}
      />
    </div>
  );
};
