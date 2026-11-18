import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Radio,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Volume2,
  Cpu,
  Activity,
  Lock,
  Database,
  Play,
  Server,
} from 'lucide-react';
import { safeFetchJson, adminFetch } from '../lib/safeFetch';

interface GatewayConfigInfo {
  mode: 'live_gateway' | 'local_sandbox';
  baseUrl: string;
  hasServiceKey: boolean;
  maskedKeyPreview: string;
  keySource: string;
  isActiveInDb: boolean;
  appId: string;
  encryptionStandard: string;
}

interface GatewayModel {
  id: string;
  name: string;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
}

interface GatewayConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  messagesCount?: number;
  lastMessageAt?: string;
}

interface GatewayMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  flagged?: boolean;
  flagReason?: string;
  createdAt: string;
}

interface AcceptanceCheck {
  id: string;
  title: string;
  endpoint: string;
  status: 'passed' | 'failed' | 'simulated';
  latencyMs: number;
  details: string;
}

function detectClientDevice() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const type = /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
  let os = 'Web';
  if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browser = 'Browser';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  return { type, os, browser };
}

export const EngineerGatewayChat: React.FC = () => {
  const [userId] = useState('usr_salem_hamad');
  const [sessionId] = useState(() => `sess_${Date.now().toString(36)}`);

  const [configInfo, setConfigInfo] = useState<GatewayConfigInfo | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [serviceKeyInput, setServiceKeyInput] = useState('');
  const [showServiceKey, setShowServiceKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [models, setModels] = useState<GatewayModel[]>([]);
  const [primaryModel, setPrimaryModel] = useState<string>('gemini-4-hydrogen');
  const [fallbackModel, setFallbackModel] = useState<string>('claude-3-5-haiku-20241022');
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  const [conversations, setConversations] = useState<GatewayConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv_camel_welcome_01');
  const [messages, setMessages] = useState<GatewayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [includeCamelRag, setIncludeCamelRag] = useState(true);
  const [simulateFailover, setSimulateFailover] = useState(false);
  const [gatewayError, setGatewayError] = useState<{ code?: string; message: string } | null>(null);

  // Presence Heartbeat (every 30 seconds)
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const [heartbeatStatus, setHeartbeatStatus] = useState<'online' | 'sending' | 'error'>('online');

  // Abuse / Flagging State
  const [flaggingMessageId, setFlaggingMessageId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('hallucination_or_harmful');
  const [flagDetails, setFlagDetails] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Acceptance Verification Suite State
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [isRunningChecks, setIsRunningChecks] = useState(false);
  const [acceptanceChecks, setAcceptanceChecks] = useState<AcceptanceCheck[]>([]);

  // Voice playback state
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const loadGatewayInitialData = async () => {
    const [cfgData, modelsData, convData] = await Promise.all([
      safeFetchJson('/api/engineer-gateway/config'),
      safeFetchJson('/api/engineer-gateway/models'),
      safeFetchJson(`/api/engineer-gateway/conversations?userId=${encodeURIComponent(userId)}&limit=20`),
    ]);

    if (cfgData?.config) {
      setConfigInfo(cfgData.config);
      if (!baseUrlInput && cfgData.config.baseUrl) {
        setBaseUrlInput(cfgData.config.baseUrl);
      }
    }

    if (modelsData?.models) {
      setModels(modelsData.models);
      if (modelsData.primaryModel) setPrimaryModel(modelsData.primaryModel);
      if (modelsData.fallbackModel) setFallbackModel(modelsData.fallbackModel);
    }

    if (convData?.conversations) {
      setConversations(convData.conversations);
      if (convData.conversations.length > 0 && !convData.conversations.some((c: any) => c.id === activeConversationId)) {
        setActiveConversationId(convData.conversations[0].id);
      }
    }
  };

  const loadMessages = async (convId: string) => {
    if (!convId) return;
    const data = await safeFetchJson(`/api/engineer-gateway/conversations/${encodeURIComponent(convId)}/messages?limit=50`);
    if (data?.messages) {
      setMessages(data.messages);
    }
  };

  const sendPresenceHeartbeat = async () => {
    setHeartbeatStatus('sending');
    const data = await safeFetchJson('/api/engineer-gateway/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        sessionId,
        state: 'online',
        device: detectClientDevice(),
      }),
    });
    if (data?.success) {
      setHeartbeatStatus('online');
      setLastHeartbeatAt(new Date().toLocaleTimeString('ar-SA'));
      setHeartbeatCount((c) => c + 1);
    } else {
      setHeartbeatStatus('error');
    }
  };

  useEffect(() => {
    loadGatewayInitialData();
    sendPresenceHeartbeat();
    const hbInterval = setInterval(sendPresenceHeartbeat, 30000);
    return () => clearInterval(hbInterval);
  }, []);

  useEffect(() => {
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSaveGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const data = await safeFetchJson('/api/engineer-gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrlInput.trim(),
          serviceKey: serviceKeyInput.trim() || undefined,
          isActive: Boolean(baseUrlInput.trim()),
        }),
      });
      if (data?.config) {
        setConfigInfo(data.config);
        setServiceKeyInput('');
        setShowConfigDrawer(false);
        showToast(
          data.config.mode === 'live_gateway'
            ? 'تم تشفير Service Key بـ AES-256-GCM وتفعيل الربط الحي مع Engineer AI Gateway!'
            : 'تم حفظ الإعدادات. يعمل النظام حالياً في وضع الاختبار المحلي (Local Sandbox).'
        );
        await loadGatewayInitialData();
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateConversation = async () => {
    const data = await safeFetchJson('/api/engineer-gateway/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: `محادثة جديدة ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`,
        metadata: { client: 'web-aistudio' },
      }),
    });
    if (data?.conversation) {
      setConversations((prev) => [data.conversation, ...prev]);
      setActiveConversationId(data.conversation.id);
      setMessages([]);
      setGatewayError(null);
      showToast(`تم إنشاء محادثة معزولة جديدة (${data.conversation.id})`);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const text = (customText ?? inputText).trim();
    if (!text || isStreaming) return;

    setGatewayError(null);
    if (!customText) setInputText('');

    const userMsg: GatewayMessage = {
      id: `local_u_${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const tempAssistantId = `local_a_${Date.now() + 1}`;
    const assistantPlaceholder: GatewayMessage = {
      id: tempAssistantId,
      conversationId: activeConversationId,
      role: 'assistant',
      content: '',
      modelUsed: selectedModel === 'auto' ? primaryModel : selectedModel,
      createdAt: new Date().toISOString(),
    };

    const historyPayload = [...messages, userMsg].slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setIsStreaming(true);

    try {
      const response = await adminFetch('/api/engineer-gateway/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'X-User-Id': userId,
          'X-Conversation-Id': activeConversationId,
        },
        body: JSON.stringify({
          userId,
          conversationId: activeConversationId,
          model: selectedModel,
          messages: historyPayload,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
          includeCamelRagContext: includeCamelRag,
          simulateFailover,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let parsedErr: any = {};
        try {
          parsedErr = errText ? JSON.parse(errText) : {};
        } catch {
          parsedErr = { error: errText };
        }
        setGatewayError({
          code: parsedErr.code || `HTTP_${response.status}`,
          message: parsedErr.error || `خطأ من البوابة: HTTP ${response.status}`,
        });
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let finalModelUsed = selectedModel === 'auto' ? primaryModel : selectedModel;
      let finalUsage: GatewayMessage['usage'] | undefined;
      let resolvedMessageId = tempAssistantId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || !line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.model) finalModelUsed = parsed.model;
            if (parsed.messageId) resolvedMessageId = parsed.messageId;
            if (parsed.usage) finalUsage = parsed.usage;

            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              accumulated += deltaContent;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId
                    ? {
                        ...m,
                        id: tempAssistantId,
                        content: accumulated,
                        modelUsed: finalModelUsed,
                        usage: finalUsage,
                      }
                    : m
                )
              );
            } else if (finalUsage || parsed.messageId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId
                    ? {
                        ...m,
                        modelUsed: finalModelUsed,
                        usage: finalUsage || m.usage,
                      }
                    : m
                )
              );
            }
          } catch {
            // Skip partial JSON frames
          }
        }
      }

      if (resolvedMessageId !== tempAssistantId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempAssistantId ? { ...m, id: resolvedMessageId } : m))
        );
      }

      if (simulateFailover) {
        setSimulateFailover(false);
      }

      // Refresh conversation metadata
      const convData = await safeFetchJson(
        `/api/engineer-gateway/conversations?userId=${encodeURIComponent(userId)}&limit=20`
      );
      if (convData?.conversations) setConversations(convData.conversations);
    } catch (err: any) {
      setGatewayError({
        code: 'STREAM_NETWORK_ERROR',
        message: err?.message || 'تعذر استكمال البث التدفقي (SSE) من البوابة.',
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flaggingMessageId) return;
    setIsSubmittingFlag(true);
    try {
      const data = await safeFetchJson(
        `/api/engineer-gateway/conversations/${encodeURIComponent(activeConversationId)}/flag`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: flaggingMessageId,
            reporterUserId: userId,
            reason: flagReason,
            details: flagDetails.trim() || 'تم الإبلاغ من واجهة الشات',
          }),
        }
      );
      if (data?.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === flaggingMessageId ? { ...m, flagged: true, flagReason } : m
          )
        );
        setFlaggingMessageId(null);
        setFlagDetails('');
        showToast('تم إرسال البلاغ إلى تبويب "البلاغات" في لوحة إدارة Engineer بنجاح.');
      }
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  const handleRunVerificationChecks = async () => {
    setIsRunningChecks(true);
    setShowVerificationPanel(true);
    try {
      const data = await safeFetchJson('/api/engineer-gateway/verify-acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (data?.checks) {
        setAcceptanceChecks(data.checks);
      }
    } finally {
      setIsRunningChecks(false);
    }
  };

  const handleSpeakMessage = async (msgId: string, text: string) => {
    if (!text.trim()) return;
    if (playingMsgId === msgId) {
      audioRef.current?.pause();
      setPlayingMsgId(null);
      return;
    }
    setPlayingMsgId(msgId);
    const data = await safeFetchJson('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 800), provider: 'auto' }),
    });
    if (data?.audioUrl || data?.audioBase64) {
      const src = data.audioUrl || `data:audio/mpeg;base64,${data.audioBase64}`;
      audioRef.current?.pause();
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => setPlayingMsgId(null);
      audio.play().catch(() => setPlayingMsgId(null));
    } else {
      setPlayingMsgId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Gateway Status & Telemetry Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-stone-100">
                  بوابة الذكاء الاصطناعي الموحدة (Engineer AI Gateway v1.0)
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    configInfo?.mode === 'live_gateway'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {configInfo?.mode === 'live_gateway' ? 'متصل بالبوابة الحية (Live Gateway)' : 'وضع الاختبار المحلي (Local Sandbox)'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>بث SSE فوري</span> •
                <span>توجيه ذكي (Primary: <strong className="text-indigo-300 font-mono">{primaryModel}</strong> / Fallback: <strong className="text-amber-300 font-mono">{fallbackModel}</strong>)</span> •
                <span>Zero-Leak AES-256-GCM</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 30s Heartbeat Pill */}
            <button
              type="button"
              onClick={sendPresenceHeartbeat}
              className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-emerald-500/40 text-xs flex items-center gap-2 cursor-pointer transition-all"
              title="إرسال نبضة تواجد (/presence/heartbeat) — يتم إرسالها تلقائياً كل 30 ثانية"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  heartbeatStatus === 'online'
                    ? 'bg-emerald-400 animate-pulse'
                    : heartbeatStatus === 'sending'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-stone-300">نبضة التواجد (30ث):</span>
              <span className="font-mono text-emerald-300">{lastHeartbeatAt || '...'} ({heartbeatCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Key className="w-4 h-4" />
              <span>إعداد رابط ومفتاح Engineer</span>
            </button>

            <button
              type="button"
              onClick={handleRunVerificationChecks}
              disabled={isRunningChecks}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              {isRunningChecks ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>اختبارات القبول (6/6)</span>
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}

        {/* Encrypted Gateway Credentials Drawer */}
        {showConfigDrawer && (
          <form
            onSubmit={handleSaveGatewayConfig}
            className="bg-stone-950 border border-indigo-500/30 rounded-2xl p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-stone-100">
                  ربط بوابة Engineer المركزية (تخزين مشفر AES-256-GCM في جدول api_settings — سياسة Zero-Leak)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                X-Engineer-App-Id: {configInfo?.appId || 'chat-aistudio-client'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="block text-[11px] text-stone-400 mb-1">
                  رابط البوابة الأساسي (Base URL):
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  placeholder="https://<YOUR_ENGINEER_DOMAIN>/api/gateway/v1"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-[11px] text-stone-400 mb-1">
                  مفتاح الخدمة (Engineer Service Key — مشفر ولا يظهر للمتصفح):
                </label>
                <div className="relative">
                  <input
                    type={showServiceKey ? 'text' : 'password'}
                    dir="ltr"
                    value={serviceKeyInput}
                    onChange={(e) => setServiceKeyInput(e.target.value)}
                    placeholder={configInfo?.hasServiceKey ? `محفوظ مشفراً (${configInfo.maskedKeyPreview})` : 'eng_srv_live_xxxxxxxxxxxx'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 pl-9 text-xs text-stone-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowServiceKey(!showServiceKey)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-400 cursor-pointer"
                  >
                    {showServiceKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>حفظ وتشفير</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Section 7 Acceptance Verification Checklist Panel */}
        {showVerificationPanel && (
          <div className="bg-stone-950 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-amber-300">
                  نتائج خطة الاختبار والتحقق القياسية (Section 7 Acceptance Verification Checklist)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVerificationPanel(false)}
                className="text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {acceptanceChecks.map((chk) => (
                <div
                  key={chk.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    chk.status === 'passed'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : chk.status === 'simulated'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-stone-100 flex items-center gap-1.5">
                      {chk.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            chk.status === 'passed' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        />
                      )}
                      <span>{chk.title}</span>
                    </span>
                    <span className="font-mono text-[10px] text-stone-400">{chk.latencyMs}ms</span>
                  </div>
                  <div className="font-mono text-[10px] text-indigo-300" dir="ltr">
                    {chk.endpoint}
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">{chk.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Split Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sidebar: Isolated Conversations (chat_conversations) */}
        <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-stone-200">
                المحادثات المعزولة (chat_conversations)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCreateConversation}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>محادثة جديدة</span>
            </button>
          </div>

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-[11px] text-stone-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>X-User-Id:</span>
              <span className="text-stone-200">{userId}</span>
            </div>
            <div className="flex justify-between">
              <span>X-Conversation-Id:</span>
              <span className="text-amber-300 truncate max-w-[170px]">{activeConversationId}</span>
            </div>
          </div>

          <div className="space-y-2 max-h-[430px] overflow-y-auto">
            {conversations.map((conv) => {
              const isSelected = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-stone-100'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold truncate flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{conv.title}</span>
                    </span>
                    <span className="text-[10px] font-mono bg-stone-900 px-1.5 py-0.5 rounded text-stone-400">
                      {conv.messagesCount ?? 0}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-stone-500 truncate" dir="ltr">
                    {conv.id}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Chat Stream Area (SSE Streaming + Flagging + RAG Context) */}
        <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-2xl shadow-lg flex flex-col h-[620px] overflow-hidden">
          {/* Chat Header Controls */}
          <div className="p-3.5 border-b border-stone-800 bg-stone-950/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] text-stone-400">النموذج:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
                >
                  <option value="auto" className="bg-stone-900">
                    auto (الأساسي: {primaryModel} + احتياطي تلقائي)
                  </option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-stone-900">
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-[11px] text-stone-300 bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCamelRag}
                  onChange={(e) => setIncludeCamelRag(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>دمج بيانات الهجن الموثقة (RAG)</span>
              </label>

              {configInfo?.mode === 'local_sandbox' && (
                <label className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-2.5 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateFailover}
                    onChange={(e) => setSimulateFailover(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>تجربة Failover الاحتياطي</span>
                </label>
              )}
            </div>

            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3" />
              <span>SSE: text/event-stream</span>
            </span>
          </div>

          {/* Messages Feed */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-stone-400 p-6">
                <Sparkles className="w-10 h-10 text-amber-400/60" />
                <div className="space-y-1 max-w-md">
                  <p className="text-sm font-bold text-stone-200">
                    محادثة متصلة ببوابة Engineer AI Gateway
                  </p>
                  <p className="text-xs text-stone-400">
                    اكتب سؤالك عن سباقات الهجن أو أي استفسار عام، وسيتم بث الرد كلمة بكلمة عبر Server-Sent Events مع حفظ السجل في الجداول المعزولة.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {[
                    'من فاز بالشوط الأول في ميدان المرموم وكم التوقيت؟',
                    'عطني القرار الرسمي المعتمد عن جائزة كأس الحقايق',
                    'لخص لي مميزات الربط مع بوابة Engineer AI Gateway',
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="text-xs bg-stone-950 hover:bg-stone-800 border border-stone-800 text-amber-300 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 border ${
                        isUser
                          ? 'bg-stone-800/90 border-stone-700 text-stone-100'
                          : 'bg-stone-950 border-amber-500/30 text-stone-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-stone-400">
                        <span className="font-bold text-amber-400">
                          {isUser ? 'أنت' : 'مساعد بوابة Engineer AI'}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          {msg.modelUsed && (
                            <span className="bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded">
                              {msg.modelUsed}
                            </span>
                          )}
                          {msg.usage && (
                            <span className="text-stone-500">
                              {msg.usage.total_tokens} tokens
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content || (isStreaming && !isUser ? 'جاري البث...' : '')}
                      </p>

                      {!isUser && msg.content && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-stone-800/80">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSpeakMessage(msg.id, msg.content)}
                              className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{playingMsgId === msg.id ? 'إيقاف الصوت' : 'استماع صوتي'}</span>
                            </button>

                            {msg.flagged ? (
                              <span className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Flag className="w-3 h-3" />
                                <span>تم الإبلاغ للمشرفين</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setFlaggingMessageId(flaggingMessageId === msg.id ? null : msg.id)}
                                className="text-[11px] text-stone-400 hover:text-rose-300 bg-stone-900 border border-stone-800 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Flag className="w-3 h-3" />
                                <span>إبلاغ (/flag)</span>
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-stone-500">
                            {new Date(msg.createdAt).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}

                      {/* Inline Flag / Abuse Report Form (Section 2.5) */}
                      {flaggingMessageId === msg.id && (
                        <form
                          onSubmit={handleSubmitFlag}
                          className="mt-2 p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-2"
                        >
                          <div className="text-[11px] font-bold text-rose-300">
                            إبلاغ عن رسالة غير دقيقة أو مخالفة (POST /conversations/{activeConversationId}/flag)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={flagReason}
                              onChange={(e) => setFlagReason(e.target.value)}
                              className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                            >
                              <option value="hallucination_or_harmful">معلومات غير دقيقة (Hallucination)</option>
                              <option value="inappropriate_content">محتوى غير لائق</option>
                              <option value="wrong_race_data">خطأ في نتيجة شوط أو توقيت</option>
                            </select>
                            <input
                              type="text"
                              value={flagDetails}
                              onChange={(e) => setFlagDetails(e.target.value)}
                              placeholder="تفاصيل إضافية للمشرفين..."
                              className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setFlaggingMessageId(null)}
                              className="text-xs text-stone-400 px-3 py-1 cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingFlag}
                              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-lg cursor-pointer"
                            >
                              {isSubmittingFlag ? 'جاري الإرسال...' : 'إرسال البلاغ'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Error Banner (401 / 403 USER_BANNED / 429 Backoff / 503) */}
          {gatewayError && (
            <div className="mx-4 mb-2 bg-rose-500/15 border border-rose-500/40 text-rose-200 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong className="font-mono ml-1">[{gatewayError.code}]</strong>
                  {gatewayError.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGatewayError(null)}
                className="text-rose-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Chat Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3.5 border-t border-stone-800 bg-stone-950/80 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب رسالتك لبوابة Engineer AI Gateway (يدعم البث التدفقي المباشر SSE)..."
              className="flex-1 bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming || !inputText.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isStreaming ? 'جاري البث...' : 'إرسال'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
