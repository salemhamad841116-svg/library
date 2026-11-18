import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  CheckCheck,
  Bot,
  User,
  Radio,
  Sparkles,
  RefreshCw,
  Clock,
  Volume2,
  VolumeX,
  Play,
  Pause,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Flame,
  Video,
  ExternalLink,
  Trophy,
  Headphones,
  Server,
  Upload,
  Settings2,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { SampleMessage } from '../types';
import { safeFetchJson } from '../lib/safeFetch';

interface WhatsAppSimulatorProps {
  sampleMessages: SampleMessage[];
  onMessageIngested: () => void;
}

type TTSProviderChoice = 'auto' | 'xtts' | 'elevenlabs' | 'openai';

interface VoiceEngineConfigState {
  preferredProvider: TTSProviderChoice;
  xttsEndpointUrl: string;
  xttsApiKey: string;
  referenceSpeakerPath: string;
  referenceSpeakerName: string;
  hasUploadedReferenceAudio: boolean;
  uploadedReferenceSizeKb: number;
  elevenLabsVoiceId: string;
  speed: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'audio';
  audioDuration?: string;
  audioBase64?: string;
  isPTT?: boolean;
  isCached?: boolean;
  voicePersona?: string;
  providerUsed?: string;
  latencyMs?: number;
  timestamp: string;
  isBot: boolean;
  isExtracted?: boolean;
  extractionData?: any;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  sampleMessages,
  onMessageIngested,
}) => {
  const [selectedGroup, setSelectedGroup] = useState('dm-user');
  const [simulatedUserName, setSimulatedUserName] = useState('سالم حمد');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [searchingStatusText, setSearchingStatusText] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [lastPipelineLog, setLastPipelineLog] = useState<string | null>(null);

  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(true);
  const [showVoiceConfigPanel, setShowVoiceConfigPanel] = useState(true);
  const [voiceConfig, setVoiceConfig] = useState<VoiceEngineConfigState>({
    preferredProvider: 'auto',
    xttsEndpointUrl: '',
    xttsApiKey: '',
    referenceSpeakerPath: 'speaker_camel_commentator.wav',
    referenceSpeakerName: 'صوت المعلق الخليجي المرجعي (Zero-Shot WAV)',
    hasUploadedReferenceAudio: false,
    uploadedReferenceSizeKb: 0,
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB',
    speed: 0.92,
  });
  const [isSavingVoiceConfig, setIsSavingVoiceConfig] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceTestStatus, setVoiceTestStatus] = useState<{
    message: string;
    latencyMs?: number;
    providerUsed?: string;
    isSuccess?: boolean;
  } | null>(null);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const speakerFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    safeFetchJson('/api/voice/config').then((data) => {
      if (data?.config) {
        setVoiceConfig((prev) => ({
          ...prev,
          ...data.config,
        }));
      }
    });
  }, []);

  const handleSaveVoiceConfig = async (customPartial?: Partial<VoiceEngineConfigState>) => {
    setIsSavingVoiceConfig(true);
    const payload = { ...voiceConfig, ...customPartial };
    try {
      const data = await safeFetchJson('/api/voice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (data?.config) {
        setVoiceConfig((prev) => ({ ...prev, ...data.config }));
        setVoiceTestStatus({
          message: 'تم حفظ إعدادات محرك الصوت الهجين (XTTS-v2 / ElevenLabs / OpenAI) بنجاح',
          isSuccess: true,
        });
      }
    } finally {
      setIsSavingVoiceConfig(false);
    }
  };

  const handleUploadReferenceSpeaker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result?.toString() || '';
      if (!base64String) return;

      setIsSavingVoiceConfig(true);
      try {
        const data = await safeFetchJson('/api/voice/upload-speaker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            audioBase64: base64String,
          }),
        });
        if (data?.config) {
          setVoiceConfig((prev) => ({
            ...prev,
            ...data.config,
            preferredProvider: prev.preferredProvider === 'openai' ? 'xtts' : prev.preferredProvider,
          }));
          setVoiceTestStatus({
            message: `تم رفع وحفظ ملف الصوت المرجعي (${file.name}) على سيرفرك بنجاح بدون أي اشتراكات خارجية!`,
            isSuccess: true,
          });
        }
      } finally {
        setIsSavingVoiceConfig(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTestVoiceEngine = async () => {
    setIsTestingVoice(true);
    setVoiceTestStatus({
      message: 'جاري توليد المقطع الصوتي وتحويله عبر FFmpeg إلى Ogg Opus (48kHz Mono)...',
      isSuccess: true,
    });
    try {
      await safeFetchJson('/api/voice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voiceConfig),
      });

      const data = await safeFetchJson('/api/voice/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: voiceConfig.preferredProvider,
          xttsEndpointUrl: voiceConfig.xttsEndpointUrl,
          referenceSpeakerPath: voiceConfig.referenceSpeakerPath,
          speed: voiceConfig.speed,
        }),
      });
      if (data?.audioBase64) {
        togglePlayAudio('voice-test-preview', data.audioBase64);
        setVoiceTestStatus({
          message: `تم توليد الصوت بنجاح عبر [${data.voicePersona}] وترميزه بصيغة WhatsApp PTT Ogg Opus 48kHz`,
          latencyMs: data.latencyMs,
          providerUsed: data.providerUsed,
          isSuccess: true,
        });
      }
    } finally {
      setIsTestingVoice(false);
    }
  };

  const togglePlayAudio = (msgId: string, audioBase64?: string) => {
    if (playingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioBase64) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(e => console.log('Playback error:', e));
      setPlayingAudioId(msgId);
    }
  };

  const groups = [
    {
      id: '12036302849182371@g.us',
      name: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
      members: 650,
      avatar: '🐪',
      status: 'رموز الثنايا - ميدان الطائف مسائي',
    },
    {
      id: '12036302919384729@g.us',
      name: 'ميدان الطائف - البث المباشر 🎥',
      members: 512,
      avatar: '🇸🇦',
      status: 'أشواط الكؤوس والرموز العامة والتقارير',
    },
    {
      id: '12036301827462819@g.us',
      name: 'قروب ميدان الوثبة 🐪🏁',
      members: 342,
      avatar: '🏆',
      status: 'تغطيات أشواط المهرجان والنتائج',
    },
    {
      id: 'dm-user',
      name: 'محادثة خاصة مع البوت (Direct Message)',
      members: 2,
      avatar: '🤖',
      status: 'استعلام مباشر عن النتائج والإحصائيات',
    },
  ];

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    '12036302849182371@g.us': [
      {
        id: 'msg-real-1',
        senderId: '+966501234567',
        senderName: 'قروب الاتحاد 🐪',
        text: `سباق مهرجان ولي العهد للهجن 2026 - السبت 2026/09/12 - رموز الثنايا - ميدان الطايف - مساء\n\nش 1 كأس بكار مفتوح\n(بيه) لـ الشيخ أحمد بن محمد بن راشد آل مكتوم 9:10:15\nالمضمر : سالم سعيد بن منانه https://youtu.be/qxs6Om332_4\nالاب جبار ولد لحقه بعير المختبر`,
        type: 'text',
        timestamp: '04:15 م',
        isBot: false,
        isExtracted: true,
        extractionData: {
          winner: 'بيه',
          owner: 'الشيخ أحمد بن محمد بن راشد آل مكتوم',
          trainer: 'سالم سعيد بن منانه',
          sire: 'جبار ولد لحقه بعير المختبر',
          heat: 1,
          time: '9:10:15',
          category: 'ثنايا بكار مفتوح',
        },
      },
      {
        id: 'msg-real-2',
        senderId: '+966501234567',
        senderName: 'قروب الاتحاد 🐪',
        text: `سباق مهرجان ولي العهد للهجن 2026 - رموز الثنايا - ميدان الطايف - مساء\n\nش 2 كأس قعدان مفتوح\n(الحساس) لـ راشد سعيد بن مروشد 9:14:18 https://youtu.be/SdbCgTn7Nys\nالاب سلفر بعير ابن قريع سابقا حاليا عند الرئاسه`,
        type: 'text',
        timestamp: '04:30 م',
        isBot: false,
        isExtracted: true,
        extractionData: {
          winner: 'الحساس',
          owner: 'راشد سعيد بن مروشد',
          sire: 'سلفر بعير ابن قريع',
          heat: 2,
          time: '9:14:18',
          category: 'ثنايا قعدان مفتوح',
        },
      },
      {
        id: 'msg-real-3',
        senderId: '+966501234567',
        senderName: 'قروب الاتحاد 🐪',
        text: `ش 3 كأس بكار عام\n(شوق) لـ مانع علي بن حماد الشامسي 9:22:77 https://youtu.be/lRF-NE30HTs\nالاب الحريثي العيده ولد ناصي المختبر\n(شوق هيه الصالحيه سابقأ)`,
        type: 'text',
        timestamp: '04:45 م',
        isBot: false,
        isExtracted: true,
        extractionData: {
          winner: 'شوق (الصالحية سابقاً)',
          owner: 'مانع علي بن حماد الشامسي',
          sire: 'الحريثي العيده ولد ناصي المختبر',
          heat: 3,
          time: '9:22:77',
          category: 'ثنايا بكار عام',
        },
      },
    ],
    '12036302919384729@g.us': [
      {
        id: 'msg-sh-4',
        senderId: '+966508877665',
        senderName: 'مراسل لبرقة',
        text: 'ش4 الذيب لـ مانع علي محمد حمد حماد الشامسي (مهرجان سمو ولي العهد السعودي 12-09-2026م) كأس الثنايا قعدان عام 9:34:69 labregah.com/v/201302 https://youtu.be/SdbCgTn7Nys',
        type: 'text',
        timestamp: '05:02 م',
        isBot: false,
        isExtracted: true,
        extractionData: {
          winner: 'الذيب',
          owner: 'مانع علي محمد حمد حماد الشامسي',
          heat: 4,
          time: '9:34:69',
          category: 'ثنايا قعدان عام',
        },
      },
    ],
    '12036301827462819@g.us': [
      {
        id: 'msg-mg-1',
        senderId: '+971501112233',
        senderName: 'أبو راشد المري',
        text: 'الشوط الأول الرئيسي حقايق بكار: فازت الشاهينية لـ محمد بن راشد المري بتوقيت 5:48.12',
        type: 'text',
        timestamp: '08:30 ص',
        isBot: false,
        isExtracted: true,
        extractionData: {
          winner: 'الشاهينية',
          owner: 'محمد بن راشد المري',
          heat: 1,
          time: '5:48.12',
          category: 'حقايق بكار',
        },
      },
    ],
    'dm-user': [
      {
        id: 'msg-dm-1',
        senderId: 'bot',
        senderName: 'بوت الهجن الذكي 🤖',
        text: 'مرحباً بك يا مرحبا! أنا بوت سباقات الهجن الذكي لفرز نتائج وأشواط مهرجان ولي العهد والميادين الخليجية. اسألني عن الفائزين، المضمرين، التوقيتات، أو السلالات.',
        type: 'text',
        timestamp: '08:00 ص',
        isBot: true,
      },
    ],
  });

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, selectedGroup, isComposing]);

  const currentGroupObj = groups.find((g) => g.id === selectedGroup) || groups[0];
  const currentMessages = messages[selectedGroup] || [];

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result?.toString().split(',')[1] || '';
          setRecordedAudioBase64(base64String);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setLastPipelineLog('❌ يرجى السماح بصلاحية الميكروفون في المتصفح لتسجيل المقاطع الصوتية.');
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Send message through Baileys ingestion pipeline
  const handleSendMessage = async (customPayload?: { text?: string; audioBase64?: string }) => {
    const textToSend = customPayload?.text ?? inputText;
    const audioToSend = customPayload?.audioBase64 ?? recordedAudioBase64;

    if (!textToSend.trim() && !audioToSend) return;

    setIsSending(true);
    setLastPipelineLog('جاري إرسال الرسالة إلى Baileys Ingestion Engine...');

    const isDM = selectedGroup === 'dm-user';
    const newMsgId = `msg-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // Local append for instant UI feedback
    const userMsg: ChatMessage = {
      id: newMsgId,
      senderId: '+966500000000',
      senderName: isDM ? (simulatedUserName.trim() || 'يا غالي') : 'عضو المجموعة',
      text: textToSend || (audioToSend ? '🎙️ [مقطع صوتي ميداني]' : ''),
      type: audioToSend ? 'audio' : 'text',
      audioDuration: audioToSend ? `${recordingSeconds || 4} ثواني` : undefined,
      timestamp,
      isBot: false,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedGroup]: [...(prev[selectedGroup] || []), userMsg],
    }));

    setInputText('');
    setRecordedAudioBase64(null);

    // Rule 3: Show immediate "جاري البحث..." state for DM / Mention queries
    if (isDM) {
      setIsComposing(true);
      setSearchingStatusText('جاري البحث...');
    }

    try {
      setLastPipelineLog('📥 تم استقبال الرسالة في Baileys -> معالجة النوايا (Intent Mapping)...');

      const data = await safeFetchJson('/api/whatsapp/simulate-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: isDM ? 'dm-user' : selectedGroup,
          groupName: currentGroupObj.name,
          senderId: '+966500000000',
          senderName: simulatedUserName.trim() || 'يا غالي',
          userName: simulatedUserName.trim(),
          messageType: audioToSend ? 'audioMessage' : 'conversation',
          text: textToSend,
          audioBase64: audioToSend,
          isMentionOrDM: isDM,
          wantsVoiceReply: isVoiceReplyEnabled,
          preferredProvider: voiceConfig.preferredProvider,
        }),
      });

      if (!data) {
        setIsComposing(false);
        setSearchingStatusText(null);
        return;
      }

      setLastPipelineLog(`⚡ مهمة الطابور (${data.jobId || 'OK'}): معالجة النوايا [${data.intentType || 'database_search'}]...`);

      // If DM or Mention, simulate Bot Response (Text + Optional PTT Voice Note)
      if (isDM && data.botReply) {
        const delayMs = data.intentType === 'greeting' || data.intentType === 'bot_identity' ? 350 : 950;
        setTimeout(() => {
          setIsComposing(false);
          setSearchingStatusText(null);
          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            senderId: 'bot',
            senderName: 'أنا مساعدك الذكي 🤖',
            text: data.botReply,
            type: data.voiceReply ? 'audio' : 'text',
            audioBase64: data.voiceReply?.audioBase64,
            isPTT: data.voiceReply?.ptt,
            isCached: data.voiceReply?.isCached,
            voicePersona: data.voiceReply?.voicePersona || 'XTTS-v2 / محرك الصوت الهجين',
            providerUsed: data.voiceReply?.providerUsed,
            latencyMs: data.voiceReply?.latencyMs,
            audioDuration: data.voiceReply?.durationEstimateSec ? `${data.voiceReply.durationEstimateSec} ثانية` : '0:08',
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            isBot: true,
          };
          setMessages((prev) => ({
            ...prev,
            [selectedGroup]: [...(prev[selectedGroup] || []), botMsg],
          }));

          // If voice returned and voice enabled, autoplay preview smoothly
          if (data.voiceReply?.audioBase64) {
            togglePlayAudio(botMsg.id, data.voiceReply.audioBase64);
          }
        }, delayMs);
      } else {
        setIsComposing(false);
        setSearchingStatusText(null);
      }

      onMessageIngested();
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectPredefinedSample = (sample: SampleMessage) => {
    setInputText(sample.text);
  };

  const providerLabelShort =
    voiceConfig.preferredProvider === 'xtts'
      ? 'XTTS-v2 محلي/خاص'
      : voiceConfig.preferredProvider === 'elevenlabs'
      ? 'ElevenLabs'
      : voiceConfig.preferredProvider === 'openai'
      ? 'OpenAI Onyx'
      : 'هجين تلقائي (XTTS / ElevenLabs)';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Group List (Sidebar) */}
      <div className="lg:col-span-4 space-y-3">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>مجموعات الواتساب المراقبة (Baileys)</span>
            </h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
              استماع سلبي نشط
            </span>
          </div>

          <div className="space-y-2">
            {groups.map((group) => {
              const isSelected = selectedGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`w-full p-3 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-stone-100 shadow-md'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-lg flex-shrink-0 border border-stone-700">
                    {group.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate text-stone-100">{group.name}</span>
                      <span className="text-[10px] text-stone-500 font-mono tabular-nums">{group.members} عضو</span>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">{group.status}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Sample Ingestion Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3">
          <h4 className="text-xs font-bold text-stone-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>حقن رسائل حقيقية سريعة (Real Race Samples):</span>
          </h4>
          <div className="space-y-2">
            {sampleMessages.slice(0, 4).map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectPredefinedSample(sample)}
                className="w-full text-right p-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/40 hover:bg-stone-850 transition-all text-xs cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 group-hover:text-amber-300 truncate max-w-[200px]">
                    {sample.title}
                  </span>
                  <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400">
                    {sample.type === 'audio' ? 'صوت' : 'نص'}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 line-clamp-1 mt-1 font-mono">
                  {sample.text.replace(/\n/g, ' ')}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Frame + Hybrid Voice Engine Control Panel */}
      <div className="lg:col-span-8 space-y-3">
        {/* Hybrid Voice Engine Control Panel (XTTS-v2 Serverless GPU + Reference Speaker WAV + ElevenLabs/OpenAI) */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-100 flex items-center gap-2">
                  <span>محرك الصوت الهجين واستنساخ الصوت بدون اشتراكات (Coqui XTTS-v2 + Failover)</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  ملكية كاملة للصوت عبر <span className="text-amber-300 font-mono">XTTS-v2 Serverless GPU</span> (الدفع بالثانية فقط) مع تحويل <span className="text-emerald-400 font-mono">FFmpeg Ogg Opus 48kHz</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowVoiceConfigPanel(!showVoiceConfigPanel)}
              className="text-[11px] bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{showVoiceConfigPanel ? 'إخفاء إعدادات المحرك' : 'إعدادات XTTS-v2 وملف الصوت المرجعي'}</span>
            </button>
          </div>

          {showVoiceConfigPanel && (
            <div className="pt-3 border-t border-stone-800/80 space-y-3.5">
              {/* Segmented Provider Choice */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-300 block">
                  استراتيجية توليد الصوت النشطة (TTS Routing Strategy):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'auto', label: 'تلقائي هجين (موصى به)', sub: 'XTTS-v2 ثم ElevenLabs ثم OpenAI' },
                    { id: 'xtts', label: 'XTTS-v2 محلي / خاص', sub: 'Serverless GPU بدون اشتراك' },
                    { id: 'elevenlabs', label: 'ElevenLabs API', sub: 'Multilingual v2 سحابي' },
                    { id: 'openai', label: 'OpenAI Onyx', sub: 'صوت رجولي وقور احتياطي' },
                  ].map((item) => {
                    const active = voiceConfig.preferredProvider === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const updated = { ...voiceConfig, preferredProvider: item.id as TTSProviderChoice };
                          setVoiceConfig(updated);
                          handleSaveVoiceConfig({ preferredProvider: item.id as TTSProviderChoice });
                        }}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500/15 border-amber-500 text-stone-100'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{item.label}</span>
                          {active && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5 truncate">{item.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* XTTS-v2 Endpoint URL & Reference Speaker WAV/MP3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-200 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-amber-400" />
                      <span>رابط سيرفر XTTS-v2 (Serverless GPU / Local URL):</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">RunPod / Modal / Docker</span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    value={voiceConfig.xttsEndpointUrl}
                    onChange={(e) => setVoiceConfig({ ...voiceConfig, xttsEndpointUrl: e.target.value })}
                    placeholder="https://api.runpod.ai/v2/YOUR_ID/runsync أو http://localhost:8020/tts_to_audio"
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-100 font-mono placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      dir="ltr"
                      value={voiceConfig.xttsApiKey}
                      onChange={(e) => setVoiceConfig({ ...voiceConfig, xttsApiKey: e.target.value })}
                      placeholder="Bearer API Key (اختياري لسيرفرات Serverless GPU)"
                      className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-[11px] text-stone-200 font-mono placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Reference Speaker Audio File (WAV/MP3) */}
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-stone-200 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ملف الصوت المرجعي (Reference Speaker WAV/MP3):</span>
                    </label>
                    {voiceConfig.hasUploadedReferenceAudio ? (
                      <span className="text-[10px] text-emerald-400 font-mono tabular-nums">
                        محفوظ بالسيرفر ({voiceConfig.uploadedReferenceSizeKb} KB)
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">6–15 ثانية (Zero-Shot)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={voiceConfig.referenceSpeakerPath}
                      onChange={(e) => setVoiceConfig({ ...voiceConfig, referenceSpeakerPath: e.target.value })}
                      placeholder="speaker_camel_commentator.wav"
                      className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-100 font-mono placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      ref={speakerFileInputRef}
                      type="file"
                      accept="audio/*,.wav,.mp3,.ogg,.m4a"
                      onChange={handleUploadReferenceSpeaker}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => speakerFileInputRef.current?.click()}
                      className="bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع عينة صوتك</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    العينة المرجعية تُحفظ محلياً على سيرفرك (<span className="font-mono text-stone-300">.audio_tts_cache</span>) ويستنسخ منها نموذج <span className="text-amber-300 font-bold">XTTS-v2</span> نبرة الصوت باللهجة الخليجية لحظياً بدون أي رسوم للشركات.
                  </p>
                </div>
              </div>

              {/* Action Bar & Status Feedback */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-3 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>FFmpeg Ogg Opus · 48kHz Mono · Baileys PTT</span>
                  </span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">كاش 24 ساعة (SHA-256)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveVoiceConfig()}
                    disabled={isSavingVoiceConfig}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1.5 rounded-xl text-xs font-bold border border-stone-700 cursor-pointer transition-colors"
                  >
                    {isSavingVoiceConfig ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestVoiceEngine}
                    disabled={isTestingVoice}
                    className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isTestingVoice ? 'جاري التوليد والترميز...' : 'اختبار وسماع الصوت الآن'}</span>
                  </button>
                </div>
              </div>

              {voiceTestStatus && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    voiceTestStatus.isSuccess
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <span>{voiceTestStatus.message}</span>
                  {voiceTestStatus.latencyMs !== undefined && (
                    <span className="font-mono tabular-nums text-[11px] text-amber-300 shrink-0">
                      {voiceTestStatus.latencyMs} ms
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl flex flex-col h-[650px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-lg border border-stone-700">
                {currentGroupObj.avatar}
              </div>
              <div>
                <h3 className="font-bold text-xs text-stone-100">{currentGroupObj.name}</h3>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>البوت يستمع بشكل سلبي صامت في القروبات ويرد صوتياً بالخاص</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Reply Toggle Switch */}
              <button
                onClick={() => setIsVoiceReplyEnabled(!isVoiceReplyEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  isVoiceReplyEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-stone-850 text-stone-500 border-stone-800'
                }`}
                title="تفعيل/تعطيل الردود الصوتية (PTT Voice Notes)"
              >
                {isVoiceReplyEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>الرد الصوتي PTT ({providerLabelShort}): {isVoiceReplyEnabled ? 'مفعّل' : 'معطّل'}</span>
              </button>

              <span className="text-[11px] bg-stone-800 text-stone-300 px-2.5 py-1 rounded-lg font-mono">
                {selectedGroup}
              </span>
            </div>
          </div>

          {/* Chat Message Stream */}
          <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-950/70">
            {currentMessages.map((msg) => {
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isBot ? 'items-start' : 'items-end'} transition-all`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-md space-y-1.5 ${
                      msg.isBot
                        ? 'bg-amber-500/15 border border-amber-500/40 text-stone-100 rounded-tr-none'
                        : 'bg-stone-900 border border-stone-800 text-stone-100 rounded-tl-none'
                    }`}
                  >
                    {/* Sender Tag */}
                    <div className="flex items-center justify-between gap-3 text-[10px]">
                      <span className={`font-bold ${msg.isBot ? 'text-amber-400' : 'text-blue-400'}`}>
                        {msg.senderName}
                      </span>
                      <span className="text-stone-500">{msg.timestamp}</span>
                    </div>

                    {/* Content */}
                    {msg.type === 'audio' ? (
                      <div className="space-y-2 py-1">
                        <div className="flex items-center gap-3 bg-stone-950/70 p-2.5 rounded-xl border border-stone-800">
                          <button
                            onClick={() => togglePlayAudio(msg.id, msg.audioBase64)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              playingAudioId === msg.id
                                ? 'bg-amber-500 text-stone-950 scale-105 shadow-md shadow-amber-500/20'
                                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            }`}
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1">
                              {/* Audio Waveform Simulation */}
                              <div className="flex items-center gap-0.5 h-6 flex-1">
                                {[30, 60, 45, 80, 95, 40, 70, 85, 30, 65, 90, 50, 75, 40, 60, 80, 35, 55, 90, 45, 65].map((h, i) => (
                                  <div
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-1 rounded-full transition-all ${
                                      playingAudioId === msg.id
                                        ? 'bg-amber-400 animate-pulse'
                                        : 'bg-stone-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <Headphones className="w-3 h-3" />
                                <span>PTT Voice Note ({msg.voicePersona || 'XTTS-v2 / محرك الصوت الهجين'})</span>
                              </span>
                              <span className="tabular-nums">{msg.audioDuration || '0:06'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Audio Transcription or Text Content */}
                        {msg.text && (
                          <div className="text-xs leading-relaxed whitespace-pre-line text-stone-200 bg-stone-950/40 p-2 rounded-lg border border-stone-850">
                            {msg.text}
                          </div>
                        )}

                        {/* Server Cache & PTT Meta */}
                        <div className="flex items-center justify-between text-[10px] text-stone-500 px-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>audio/ogg; codecs=opus · 48kHz Mono</span>
                          </span>
                          {msg.isCached && (
                            <span className="text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              ⚡ مخزن مؤقتاً بالسيرفر (SHA-256 Cached)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed whitespace-pre-line font-sans">{msg.text}</p>
                    )}

                    {/* Extracted Entity Badge if Available */}
                    {msg.extractionData && (
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>بيانات مفروزة ومحفوظة في قاعدة البيانات:</span>
                          </span>
                          <span className="font-mono text-stone-400">{msg.extractionData.time || '09:10.15'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-stone-950/60 p-2 rounded-lg border border-stone-800/80">
                          <div>
                            <span className="text-stone-500">المطية: </span>
                            <span className="text-amber-300 font-bold">{msg.extractionData.winner}</span>
                          </div>
                          <div>
                            <span className="text-stone-500">المالك: </span>
                            <span className="text-stone-200">{msg.extractionData.owner}</span>
                          </div>
                          {msg.extractionData.trainer && (
                            <div>
                              <span className="text-stone-500">المضمر: </span>
                              <span className="text-purple-300 font-bold">{msg.extractionData.trainer}</span>
                            </div>
                          )}
                          {msg.extractionData.sire && (
                            <div>
                              <span className="text-stone-500">الأب: </span>
                              <span className="text-emerald-300">{msg.extractionData.sire}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Immediate "جاري البحث..." Loading / Searching State (Rule 3) */}
            {isComposing && (
              <div className="flex flex-col items-start transition-all">
                <div className="bg-amber-500/20 border border-amber-500/50 text-amber-200 rounded-2xl rounded-tr-none px-4 py-2.5 shadow-md flex items-center gap-2.5 text-xs font-bold">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>{searchingStatusText || 'جاري البحث...'}</span>
                </div>
              </div>
            )}
          </div>

          {/* User Name Profile Input & Quick UX / Dialect Test Buttons */}
          {selectedGroup === 'dm-user' && (
            <div className="p-2.5 bg-stone-900/95 border-t border-stone-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-stone-300 font-bold">اسم المستخدم (للترحيب المخصص):</span>
                  <input
                    type="text"
                    value={simulatedUserName}
                    onChange={(e) => setSimulatedUserName(e.target.value)}
                    placeholder="اتركه فارغاً لتجربة (يا غالي)"
                    className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-bold w-40 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-stone-400">
                  الرد الثابت: «مرحبا بك {simulatedUserName.trim() || 'يا غالي'}، كيف يمكنني مساعدتك؟»
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] text-amber-400 font-bold shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>اختبار القواعد:</span>
                </span>
                <button
                  onClick={() => handleSendMessage({ text: 'عطني مركاض المرموم آخر 100 متر' })}
                  className="text-[10px] bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-lg shrink-0 font-bold transition-colors cursor-pointer"
                >
                  🎥 آخر 100 متر (خصم 25 ثانية + Timestamp)
                </button>
                <button
                  onClick={() => handleSendMessage({ text: 'من تم قبضه في الفحص والمواد المحظورة؟' })}
                  className="text-[10px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg shrink-0 font-bold transition-colors cursor-pointer"
                >
                  🧪 فحص عام (سؤال البوت: في أي سباق طال عمرك؟)
                </button>
                <button
                  onClick={() => handleSendMessage({ text: 'من تم قبضه في مهرجان العين فطامين شوط 2؟' })}
                  className="text-[10px] bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg shrink-0 font-bold transition-colors cursor-pointer"
                >
                  🚨 فحص محدد (SQL JOIN: مهرجان العين شوط 2)
                </button>
                <button
                  onClick={() => handleSendMessage({ text: 'مرحبا، كيف الحال؟' })}
                  className="text-[10px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0 font-bold transition-colors cursor-pointer"
                >
                  👋 اختبار الترحيب (مرحبا، كيف الحال؟)
                </button>
                <button
                  onClick={() => handleSendMessage({ text: 'من أنت؟' })}
                  className="text-[10px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg shrink-0 font-bold transition-colors cursor-pointer"
                >
                  🤖 اختبار الهوية (من أنت؟)
                </button>
                <button
                  onClick={() => handleSendMessage({ text: 'شوفلي مركاض اليوم من سبج في الشوط الأول؟' })}
                  className="text-[10px] bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-700 px-2.5 py-1 rounded-lg shrink-0 font-bold transition-colors cursor-pointer"
                >
                  🔍 اختبار جاري البحث (من سبج في الشوط الأول؟)
                </button>
              </div>
            </div>
          )}

          {/* Pipeline Status Indicator */}
          {lastPipelineLog && (
            <div className="bg-stone-950 px-4 py-1.5 border-t border-stone-850 text-[10px] text-stone-400 font-mono flex items-center justify-between">
              <span className="truncate">{lastPipelineLog}</span>
              <span className="text-emerald-400 font-bold">Queue Active</span>
            </div>
          )}

          {/* Message Input Box */}
          <div className="p-3 bg-stone-950 border-t border-stone-800 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="أرسل رسالة نصية أو نتيجة شوط..."
                className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
              />

              {/* Voice Record Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-800 text-stone-400 hover:text-amber-400'
                }`}
                title={isRecording ? 'إيقاف التسجيل' : 'تسجيل مقطع صوتي'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || (!inputText.trim() && !recordedAudioBase64)}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 p-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </div>

            {isRecording && (
              <div className="text-[11px] text-rose-400 font-mono flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>جاري التسجيل: {recordingSeconds} ثواني...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
