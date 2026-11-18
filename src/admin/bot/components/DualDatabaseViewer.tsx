import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Trophy,
  Timer,
  Layers,
  Sparkles,
  Terminal,
  Play,
  Table,
  Video,
  Dna,
  Volume2,
  Type,
  Film,
  Trash2,
  Plus,
  Lock,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Edit3,
  Check,
  X,
  Filter,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  BookOpen,
  Star,
  Power,
} from 'lucide-react';
import { RaceResultItem, ChatEmbeddingItem } from '../types';
import { safeFetchJson } from '../lib/safeFetch';

interface QuickButtonItem {
  id: string;
  title: string;
  query: string;
  category?: string;
}

interface ClientBoardConfig {
  largeFontForElderly: boolean;
  autoPlayVoice: boolean;
  demoMediaAttached: boolean;
  demoMediaUrl?: string;
  demoMediaTitle?: string;
  lastResetTimestamp: number;
  lastBroadcastMessage?: string;
}

export const DualDatabaseViewer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'manager_board' | 'api_keys' | 'manual_knowledge' | 'relational' | 'vector' | 'sql'
  >('manager_board');
  const [raceResults, setRaceResults] = useState<any[]>([]);
  const [embeddings, setEmbeddings] = useState<ChatEmbeddingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Transferred Manager Controls & Quick Buttons State
  const [quickButtons, setQuickButtons] = useState<QuickButtonItem[]>([]);
  const [newBtnTitle, setNewBtnTitle] = useState('');
  const [newBtnQuery, setNewBtnQuery] = useState('');
  const [clientConfig, setClientConfig] = useState<ClientBoardConfig>({
    largeFontForElderly: false,
    autoPlayVoice: true,
    demoMediaAttached: false,
    lastResetTimestamp: 0,
  });
  const [managerStatusBanner, setManagerStatusBanner] = useState<string | null>(null);
  const [activeAudioResult, setActiveAudioResult] = useState<{ title: string; answer: string; audioUrl?: string } | null>(null);
  const [isPlayingQueryId, setIsPlayingQueryId] = useState<string | null>(null);
  const [clientLogs, setClientLogs] = useState<any[]>([]);

  // Doping / Violations (SQL JOIN Cross-Referencing) State
  const [violationsJoined, setViolationsJoined] = useState<any[]>([]);
  const [violFestival, setViolFestival] = useState('مهرجان العين');
  const [violCategory, setViolCategory] = useState('فطامين');
  const [violDay, setViolDay] = useState('السبت');
  const [violHeat, setViolHeat] = useState(2);
  const [violRank, setViolRank] = useState(1);

  // Social Media Ingestion & AI Data Cleaning (YouTube & Instagram -> Gemini -> pgvector) State
  const [raceNews, setRaceNews] = useState<any[]>([]);
  const [newsPlatformFilter, setNewsPlatformFilter] = useState<'all' | 'youtube' | 'instagram'>('all');
  const [isSyncingApify, setIsSyncingApify] = useState(false);
  const [isCleaningManualPost, setIsCleaningManualPost] = useState(false);
  const [rawSocialInput, setRawSocialInput] = useState('');
  const [rawSocialUrl, setRawSocialUrl] = useState('https://www.instagram.com/reel/C9CamelMarmoom/');
  const [rawSocialPlatform, setRawSocialPlatform] = useState<'youtube' | 'instagram'>('instagram');
  const [rawSocialAccount, setRawSocialAccount] = useState('حساب نادي دبي لسباقات الهجن (@dubaicamel)');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editNewsDraft, setEditNewsDraft] = useState<{
    summary: string;
    camel_name: string;
    owner_name: string;
    race_event: string;
    time: string;
    source_url: string;
  }>({
    summary: '',
    camel_name: '',
    owner_name: '',
    race_event: '',
    time: '',
    source_url: '',
  });

  // API Keys Management (api_settings with AES-256-GCM Encryption) State
  const [apiSettings, setApiSettings] = useState<any[]>([]);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [editingKeyValues, setEditingKeyValues] = useState<Record<string, string>>({});
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyRole, setNewCompanyRole] = useState('');
  const [newCompanyKey, setNewCompanyKey] = useState('');
  const [newCompanyExtra, setNewCompanyExtra] = useState('');
  const [showNewCompanyKey, setShowNewCompanyKey] = useState(false);

  // Manual Knowledge Injection (manual_knowledge + Priority Weighting) State
  const [manualKnowledge, setManualKnowledge] = useState<any[]>([]);
  const [manualText, setManualText] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualTrack, setManualTrack] = useState('ميدان المرموم');
  const [manualCategory, setManualCategory] = useState('حقايق بكار مفتوح');
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Add New Race Modal/Form State
  const [showAddRaceForm, setShowAddRaceForm] = useState(false);
  const [newRaceTrack, setNewRaceTrack] = useState('ميدان المرموم');
  const [newRaceCategory, setNewRaceCategory] = useState('حقايق بكار مفتوح');
  const [newRaceHeat, setNewRaceHeat] = useState(1);
  const [newRaceWinner, setNewRaceWinner] = useState('');
  const [newRaceOwner, setNewRaceOwner] = useState('');
  const [newRaceTrainer, setNewRaceTrainer] = useState('');
  const [newRaceTime, setNewRaceTime] = useState('05:48.2');
  const [newRacePrize, setNewRacePrize] = useState('شوط الكأس الرئيسي');

  // Semantic search state
  const [semanticQuery, setSemanticQuery] = useState<string>('سلالة الفحل جبار وأشواط رموز الثنايا بمهرجان ولي العهد');
  const [semanticResults, setSemanticResults] = useState<any[] | null>(null);
  const [isSearchingVector, setIsSearchingVector] = useState(false);

  // SQL Query simulator state
  const [sqlInput, setSqlInput] = useState<string>(
    'SELECT winner_name, owner_name, trainer_name, sire_lineage, category, time_recorded, track_name FROM race_results ORDER BY time_in_seconds ASC LIMIT 5;'
  );
  const [sqlOutput, setSqlOutput] = useState<{ columns: string[]; rows: any[]; queryUsed: string } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);

  const fetchResults = async () => {
    const data = await safeFetchJson<any[]>(
      `/api/db/results${selectedCategory !== 'all' ? `?category=${encodeURIComponent(selectedCategory)}` : ''}`
    );
    if (Array.isArray(data)) {
      setRaceResults(data);
    }
  };

  const fetchManagerAssets = async () => {
    const [qbData, cfgData, logsData, violData, newsData, apiData, mkData] = await Promise.all([
      safeFetchJson('/api/db/quick-buttons'),
      safeFetchJson('/api/client-config'),
      safeFetchJson('/api/client-logs'),
      safeFetchJson('/api/db/violations'),
      safeFetchJson('/api/db/news'),
      safeFetchJson('/api/admin/api-settings'),
      safeFetchJson('/api/admin/manual-knowledge'),
    ]);

    if (qbData?.quickButtons) setQuickButtons(qbData.quickButtons);
    if (cfgData?.config) setClientConfig(cfgData.config);
    if (logsData?.logs) setClientLogs(logsData.logs);
    if (violData?.joined || violData?.violationsJoined) {
      setViolationsJoined(violData.joined || violData.violationsJoined);
    }
    if (newsData?.news) setRaceNews(newsData.news);
    if (apiData?.settings) {
      setApiSettings(apiData.settings);
      setEditingKeyValues((prev) => {
        const next = { ...prev };
        for (const s of apiData.settings) {
          if (next[s.id] === undefined) {
            next[s.id] = s.decrypted_api_key || '';
          }
        }
        return next;
      });
    }
    if (mkData?.items) setManualKnowledge(mkData.items);
  };

  const handleSaveProviderKey = async (setting: any) => {
    const newPlainKey = editingKeyValues[setting.id] ?? setting.decrypted_api_key ?? '';
    const data = await safeFetchJson('/api/admin/api-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: setting.id,
        provider_key: setting.provider_key,
        company_name: setting.company_name,
        service_role: setting.service_role,
        plain_api_key: newPlainKey,
        is_active: setting.is_active,
        extra_config: setting.extra_config,
      }),
    });
    if (data?.settings) {
      setApiSettings(data.settings);
      setManagerStatusBanner(
        `تم تشفير مفتاح (${setting.company_name}) بمعيار AES-256-GCM وحفظه في جدول api_settings وتفعيله ديناميكياً!`
      );
      setTimeout(() => setManagerStatusBanner(null), 4000);
    }
  };

  const handleToggleProviderActive = async (setting: any) => {
    const data = await safeFetchJson(`/api/admin/api-settings/${setting.id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !setting.is_active }),
    });
    if (data?.settings) {
      setApiSettings(data.settings);
      setManagerStatusBanner(
        !setting.is_active
          ? `تم تفعيل شركة (${setting.company_name}) — سيقرأ الباك إند المفتاح المشفر من القاعدة مباشرة!`
          : `تم إيقاف مفتاح (${setting.company_name}) والتحول التلقائي لمفاتيح البيئة الاحتياطية (.env)`
      );
      setTimeout(() => setManagerStatusBanner(null), 4000);
    }
  };

  const handleAddNewCompanyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newCompanyKey.trim()) return;
    const data = await safeFetchJson('/api/admin/api-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: newCompanyName.trim(),
        service_role: newCompanyRole.trim() || 'مزود ربط خارجي (API Integration)',
        plain_api_key: newCompanyKey.trim(),
        extra_config: newCompanyExtra.trim(),
        is_active: true,
      }),
    });
    if (data?.settings) {
      setApiSettings(data.settings);
      setNewCompanyName('');
      setNewCompanyRole('');
      setNewCompanyKey('');
      setNewCompanyExtra('');
      setManagerStatusBanner('تم تشفير مفتاح الشركة الجديدة بمعيار AES-256-GCM وإضافتها لجدول api_settings بنجاح!');
      setTimeout(() => setManagerStatusBanner(null), 4000);
    }
  };

  const handleDeleteCompanyKey = async (id: string) => {
    const data = await safeFetchJson(`/api/admin/api-settings/${id}`, { method: 'DELETE' });
    if (data?.settings) setApiSettings(data.settings);
  };

  const handleSaveManualKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setIsSavingManual(true);
    try {
      const data = await safeFetchJson('/api/admin/manual-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_text: manualText.trim(),
          news_date: manualDate,
          track_name: manualTrack,
          category: manualCategory,
        }),
      });
      if (data?.items) {
        setManualKnowledge(data.items);
        setManualText('');
        await fetchEmbeddings();
        setManagerStatusBanner(
          'تم تحويل المعلومة إلى متجهات (pgvector Embeddings) وحفظها بعَلَم الأولوية المرجعية القصوى (Manual/Verified ★)!'
        );
        setTimeout(() => setManagerStatusBanner(null), 4500);
      }
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleDeleteManualKnowledge = async (id: string) => {
    const data = await safeFetchJson(`/api/admin/manual-knowledge/${id}`, { method: 'DELETE' });
    if (data?.items) setManualKnowledge(data.items);
  };

  const handleTriggerApifySync = async () => {
    setIsSyncingApify(true);
    try {
      const data = await safeFetchJson('/api/db/news/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (data?.news) {
        setRaceNews(data.news);
        await fetchEmbeddings();
        setManagerStatusBanner(
          'تم سحب منشور جديد من السوشيال ميديا وتنظيفه بالذكاء الاصطناعي وتوليد متجهات pgvector بنجاح!'
        );
        setTimeout(() => setManagerStatusBanner(null), 4500);
      }
    } finally {
      setIsSyncingApify(false);
    }
  };

  const handleCleanAndStoreSocialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawSocialInput.trim()) return;
    setIsCleaningManualPost(true);
    try {
      const data = await safeFetchJson('/api/db/news/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: rawSocialInput.trim(),
          source_url: rawSocialUrl.trim(),
          platform: rawSocialPlatform,
          account_name: rawSocialAccount.trim(),
        }),
      });
      if (data?.news) {
        setRaceNews(data.news);
        setRawSocialInput('');
        await fetchEmbeddings();
        setManagerStatusBanner(
          'تمت فلترة النص بالذكاء الاصطناعي (حذف الإعلانات والهاشتاجات) واستخراج الكيانات وتخزين المتجه في pgvector!'
        );
        setTimeout(() => setManagerStatusBanner(null), 4500);
      }
    } finally {
      setIsCleaningManualPost(false);
    }
  };

  const handleStartEditNews = (item: any) => {
    setEditingNewsId(item.id);
    setEditNewsDraft({
      summary: item.summary || '',
      camel_name: item.camel_name || '',
      owner_name: item.owner_name || '',
      race_event: item.race_event || '',
      time: item.time || '',
      source_url: item.source_url || '',
    });
  };

  const handleSaveEditNews = async (id: string) => {
    const data = await safeFetchJson(`/api/db/news/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editNewsDraft),
    });
    if (data?.news) {
      setRaceNews(data.news);
      setEditingNewsId(null);
      setManagerStatusBanner('تم تحديث واعتماد الخبر والكيانات في قاعدة بيانات pgvector بنجاح');
      setTimeout(() => setManagerStatusBanner(null), 3500);
    }
  };

  const handleDeleteNews = async (id: string) => {
    const data = await safeFetchJson(`/api/db/news/${id}`, { method: 'DELETE' });
    if (data?.news) {
      setRaceNews(data.news);
    }
  };

  const handleAddViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await safeFetchJson('/api/db/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        festival_name: violFestival,
        category: violCategory,
        race_day: violDay,
        heat_number: Number(violHeat) || 1,
        rank: Number(violRank) || 1,
      }),
    });
    if (data?.joined || data?.violationsJoined) {
      setViolationsJoined(data.joined || data.violationsJoined);
      setManagerStatusBanner('تم إدراج المخالفة في جدول الفحص وتنفيذ الربط التلقائي (SQL JOIN) مع جدول نتائج الأشواط!');
      setTimeout(() => setManagerStatusBanner(null), 4000);
    }
  };

  const handleDeleteViolation = async (id: string) => {
    const data = await safeFetchJson(`/api/db/violations/${id}`, { method: 'DELETE' });
    if (data?.joined || data?.violationsJoined) setViolationsJoined(data.joined || data.violationsJoined);
  };

  const fetchEmbeddings = async () => {
    const data = await safeFetchJson<ChatEmbeddingItem[]>('/api/db/embeddings');
    if (Array.isArray(data)) {
      setEmbeddings(data);
    }
  };

  useEffect(() => {
    fetchResults();
    fetchEmbeddings();
    fetchManagerAssets();
    const timer = setInterval(fetchManagerAssets, 4000);
    return () => clearInterval(timer);
  }, [selectedCategory]);

  const updateRemoteClientConfig = async (patch: Partial<ClientBoardConfig> & { triggerReset?: boolean }, statusMsg: string) => {
    const data = await safeFetchJson('/api/client-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (data?.config) {
      setClientConfig(data.config);
      setManagerStatusBanner(statusMsg);
      setTimeout(() => setManagerStatusBanner(null), 4000);
    }
  };

  const handleAddQuickButton = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBtnTitle.trim() || !newBtnQuery.trim()) return;
    const data = await safeFetchJson('/api/db/quick-buttons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newBtnTitle.trim(), query: newBtnQuery.trim() }),
    });
    if (data?.quickButtons) {
      setQuickButtons(data.quickButtons);
      setNewBtnTitle('');
      setNewBtnQuery('');
      setManagerStatusBanner('تم حفظ زر الاستعلام السريع في قاعدة البيانات المركزية للمدير');
      setTimeout(() => setManagerStatusBanner(null), 3500);
    }
  };

  const handleDeleteQuickButton = async (id: string) => {
    const data = await safeFetchJson(`/api/db/quick-buttons/${id}`, { method: 'DELETE' });
    if (data?.quickButtons) setQuickButtons(data.quickButtons);
  };

  const handleAddNewRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRaceWinner.trim() || !newRaceOwner.trim()) return;
    const data = await safeFetchJson('/api/db/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track_name: newRaceTrack,
        category: newRaceCategory,
        heat_number: Number(newRaceHeat),
        winner_name: newRaceWinner.trim(),
        owner_name: newRaceOwner.trim(),
        trainer_name: newRaceTrainer.trim(),
        time: newRaceTime.trim(),
        prizeTitle: newRacePrize.trim(),
      }),
    });
    if (data?.success) {
      await fetchResults();
      setShowAddRaceForm(false);
      setNewRaceWinner('');
      setNewRaceOwner('');
      setNewRaceTrainer('');
      setManagerStatusBanner('تمت إضافة الشوط الجديد إلى قاعدة البيانات المركزية بنجاح');
      setTimeout(() => setManagerStatusBanner(null), 3500);
    }
  };

  const handleTriggerVoiceQuery = async (id: string, title: string, queryText: string) => {
    setIsPlayingQueryId(id);
    setActiveAudioResult({
      title,
      answer: 'جاري البحث...',
    });
    try {
      const data = await safeFetchJson('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          userName: 'سالم حمد',
          includeAudio: true,
          provider: 'auto',
          channel: 'manager_dashboard',
        }),
      });
      if (data?.success) {
        const audioSrc = data.audio?.audioUrl || (data.audio?.audioBase64 ? `data:audio/mpeg;base64,${data.audio.audioBase64}` : undefined);
        setActiveAudioResult({
          title,
          answer: data.answer,
          audioUrl: audioSrc,
        });
        if (audioSrc && clientConfig.autoPlayVoice) {
          const audio = new Audio(audioSrc);
          audio.play().catch(() => {});
        }
      }
    } finally {
      setIsPlayingQueryId(null);
    }
  };

  const handleReadTextAloud = async (id: string, title: string, textToRead: string) => {
    if (!textToRead.trim()) return;
    setIsPlayingQueryId(id);
    try {
      const data = await safeFetchJson('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToRead,
          provider: 'auto',
        }),
      });
      if (data?.success || data?.audioBase64 || data?.audioUrl) {
        const audioSrc = data.audioUrl || (data.audioBase64 ? `data:audio/mpeg;base64,${data.audioBase64}` : undefined);
        setActiveAudioResult({
          title,
          answer: textToRead,
          audioUrl: audioSrc,
        });
        if (audioSrc) {
          const audio = new Audio(audioSrc);
          audio.play().catch(() => {});
        }
      }
    } finally {
      setIsPlayingQueryId(null);
    }
  };

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setIsSearchingVector(true);
    try {
      const data = await safeFetchJson('/api/db/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: semanticQuery }),
      });
      if (data) {
        setSemanticResults(data.matches || []);
      }
    } finally {
      setIsSearchingVector(false);
    }
  };

  const handleExecuteSql = async () => {
    setIsExecutingSql(true);
    try {
      const data = await safeFetchJson('/api/db/sql-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlInput }),
      });
      if (data) {
        setSqlOutput(data);
      }
    } finally {
      setIsExecutingSql(false);
    }
  };

  const filteredRaces = raceResults.filter((r) => {
    if (selectedTrack !== 'الكل' && (!r.track_name || !r.track_name.includes(selectedTrack.replace('ميدان ', '')))) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.winner_name.toLowerCase().includes(q) ||
      r.owner_name.toLowerCase().includes(q) ||
      (r.trainer_name && r.trainer_name.toLowerCase().includes(q)) ||
      (r.sire_lineage && r.sire_lineage.toLowerCase().includes(q)) ||
      r.category.toLowerCase().includes(q) ||
      (r.festival_name && r.festival_name.toLowerCase().includes(q)) ||
      (r.track_name && r.track_name.toLowerCase().includes(q))
    );
  });

  const categories = [
    'all',
    'حقايق بكار مفتوح',
    'حقايق قعدان مفتوح',
    'ثنايا بكار مفتوح',
    'ثنايا قعدان مفتوح',
    'ثنايا بكار عام',
    'لقايا بكار محليات',
    'إيذاع بكار مفتوح',
  ];

  const tracks = ['الكل', 'ميدان المرموم', 'ميدان الوثبة', 'ميدان الشحانية', 'ميدان الطائف'];

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('manager_board')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'manager_board'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>صفحة البيانات والأزرار 🔒</span>
          </button>

          <button
            onClick={() => setActiveSubTab('api_keys')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'api_keys'
                ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                : 'text-emerald-300/90 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>إدارة مفاتيح الشركات (API Keys)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('manual_knowledge')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'manual_knowledge'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>تلقين البوت / إضافة خبر يدوي ★</span>
          </button>

          <button
            onClick={() => setActiveSubTab('relational')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'relational'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>الجدول العلائقي (race_results)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vector')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'vector'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>قاعدة المتجهات (pgvector)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sql')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'sql'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>منفذ استعلامات SQL</span>
          </button>
        </div>

        <span className="text-xs text-amber-400 font-mono flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>محمية للمدير فقط • ممنوع وصول الجمهور</span>
        </span>
      </div>

      {/* Global Status Banner across all Admin Sub-tabs */}
      {managerStatusBanner && activeSubTab !== 'manager_board' && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{managerStatusBanner}</span>
        </div>
      )}

      {/* Active Audio Result Box when testing from Manual Knowledge or other tabs */}
      {activeAudioResult && activeSubTab !== 'manager_board' && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 block">
              رد المعلق الصوتي على: {activeAudioResult.title}
            </span>
            <p className="text-sm text-stone-100 leading-relaxed whitespace-pre-line">{activeAudioResult.answer}</p>
          </div>
          {activeAudioResult.audioUrl && (
            <audio controls autoPlay src={activeAudioResult.audioUrl} className="h-10 shrink-0" />
          )}
        </div>
      )}

      {/* =====================================================================
          NEW TAB 1: API KEYS MANAGEMENT (Encrypted api_settings + Dynamic Injection)
         ===================================================================== */}
      {activeSubTab === 'api_keys' && (
        <div className="space-y-6">
          <div className="bg-stone-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-xl font-bold text-stone-100">
                    إدارة مفاتيح الربط للشركات والاشتراكات (API Keys Management)
                  </h2>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  تُشفر جميع المفاتيح تلقائياً بمعيار <span className="text-emerald-400 font-mono font-bold">AES-256-GCM</span> داخل جدول <span className="text-amber-300 font-mono">api_settings</span> (يُمنع حفظها كنص عادي Plain Text). يقوم محرك الصوت (TTS) ومحرك السحب (Scraping) بقراءة المفتاح النشط من قاعدة البيانات في كل عملية تشغيل، مع التراجع التلقائي لملف <span className="font-mono">.env</span> عند الإيقاف.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
                  🔒 التشفير: AES-256-GCM (Cipher + IV + AuthTag)
                </span>
                <span className="text-[11px] text-stone-400">
                  الربط الديناميكي المباشر مفعل مع الباك إند
                </span>
              </div>
            </div>

            {/* Companies API Keys Table */}
            <div className="overflow-x-auto border border-stone-800 rounded-2xl bg-stone-950">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-900 text-stone-300 border-b border-stone-800">
                  <tr>
                    <th className="p-3.5 font-bold">اسم الشركة والوظيفة</th>
                    <th className="p-3.5 font-bold">صندوق إدخال المفتاح (مشفر بصرياً •••••••)</th>
                    <th className="p-3.5 font-bold">بصمة التشفير في القاعدة (Ciphertext)</th>
                    <th className="p-3.5 font-bold">حالة المفتاح (تشغيل / إيقاف فوري)</th>
                    <th className="p-3.5 font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/70">
                  {apiSettings.map((item) => {
                    const isVisible = Boolean(visibleKeyIds[item.id]);
                    const currentVal = editingKeyValues[item.id] ?? item.decrypted_api_key ?? '';
                    return (
                      <tr key={item.id} className="hover:bg-stone-900/50 transition-colors">
                        <td className="p-4 align-middle">
                          <div className="font-bold text-sm text-stone-100 flex items-center gap-2">
                            <Key className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{item.company_name}</span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">{item.service_role}</p>
                          {item.extra_config && (
                            <span className="inline-block mt-1 text-[10px] font-mono bg-stone-900 border border-stone-800 text-stone-400 px-2 py-0.5 rounded">
                              Config: {item.extra_config}
                            </span>
                          )}
                        </td>

                        <td className="p-4 align-middle min-w-[300px]">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type={isVisible ? 'text' : 'password'}
                                value={currentVal}
                                onChange={(e) =>
                                  setEditingKeyValues({
                                    ...editingKeyValues,
                                    [item.id]: e.target.value,
                                  })
                                }
                                placeholder="أدخل مفتاح الـ API للشركة..."
                                className="w-full bg-stone-900 border border-stone-700 focus:border-emerald-500 rounded-xl pl-10 pr-3 py-2 text-xs text-stone-100 font-mono focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setVisibleKeyIds({
                                    ...visibleKeyIds,
                                    [item.id]: !isVisible,
                                  })
                                }
                                title={isVisible ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-400 cursor-pointer p-1"
                              >
                                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveProviderKey(item)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs shrink-0 cursor-pointer transition-all"
                            >
                              تشفير وحفظ
                            </button>
                          </div>
                        </td>

                        <td className="p-4 align-middle font-mono text-[11px]">
                          <div className="bg-stone-900 border border-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg inline-block">
                            🔒 {item.cipher_preview || 'مشفر AES-256'}
                          </div>
                          <span className="block text-[10px] text-stone-500 mt-1">
                            IV: {item.iv ? `${item.iv.slice(0, 10)}...` : '—'} | البديل: {item.env_fallback_name}
                          </span>
                        </td>

                        <td className="p-4 align-middle">
                          <button
                            type="button"
                            onClick={() => handleToggleProviderActive(item)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                              item.is_active
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-stone-900 border-stone-700 text-stone-400 hover:bg-stone-800'
                            }`}
                          >
                            <Power className={`w-4 h-4 ${item.is_active ? 'text-emerald-400' : 'text-stone-500'}`} />
                            <span>{item.is_active ? 'مفعل (يقرأ من القاعدة ✓)' : 'معطل (يرجع لـ .env الاحتياطي)'}</span>
                          </button>
                        </td>

                        <td className="p-4 align-middle">
                          <button
                            type="button"
                            onClick={() => handleDeleteCompanyKey(item.id)}
                            title="حذف الشركة"
                            className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950/70 text-stone-400 hover:text-rose-300 border border-stone-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New Company / Subscription Form */}
            <form
              onSubmit={handleAddNewCompanyKey}
              className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-3"
            >
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>إضافة شركة أو اشتراك برمجي جديد إلى الخزنة المشفرة (api_settings):</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="اسم الشركة (مثال: ElevenLabs, Apify)"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="text"
                  value={newCompanyRole}
                  onChange={(e) => setNewCompanyRole(e.target.value)}
                  placeholder="وظيفة الشركة (مثال: نطق صوتي / سحب أخبار)"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                />
                <div className="relative">
                  <input
                    type={showNewCompanyKey ? 'text' : 'password'}
                    value={newCompanyKey}
                    onChange={(e) => setNewCompanyKey(e.target.value)}
                    placeholder="المفتاح السري (API Key) •••••••"
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewCompanyKey(!showNewCompanyKey)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-400 cursor-pointer"
                  >
                    {showNewCompanyKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  type="text"
                  value={newCompanyExtra}
                  onChange={(e) => setNewCompanyExtra(e.target.value)}
                  placeholder="إعداد إضافي (Voice ID / Actor ID اختياري)"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>تشفير وإضافة للجدول</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          NEW TAB 2: MANUAL KNOWLEDGE INJECTION (تلقين البوت / إضافة خبر يدوي ★)
         ===================================================================== */}
      {activeSubTab === 'manual_knowledge' && (
        <div className="space-y-6">
          <div className="bg-stone-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-stone-100">
                    تلقين البوت / إضافة خبر يدوي (Manual Knowledge Injection)
                  </h2>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  أي معلومة أو نتيجة تكتبها هنا تمر مباشرة بمسار التضمين المتجهي (<span className="text-purple-300 font-mono">pgvector Embeddings</span>) وتُختم تلقائياً بعَلَم مخفي (<span className="text-amber-300 font-mono font-bold">is_manual_verified = true</span>) يمنحها <span className="text-emerald-300 font-bold">وزناً أعلى (1.35x Priority Weight)</span> في البحث الدلالي والـ RAG لتكون المرجع النهائي الموثوق الذي يلغي أي خبر آلي متعارض.
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>الأولوية المرجعية القصوى مفعلة (Manual/Verified Flag)</span>
                </span>
                <span className="text-[11px] text-stone-400 font-mono">
                  Cosine Similarity Boost: +30% Over Scraped News
                </span>
              </div>
            </div>

            {/* Manual Knowledge Input Form */}
            <form
              onSubmit={handleSaveManualKnowledge}
              className="bg-stone-950 border border-purple-500/30 rounded-2xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-stone-200">
                  اكتب المعلومة الحصرية أو النتيجة أو التعميم المراد تلقينه لعقل البوت:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setManualDate(new Date().toISOString().slice(0, 10));
                    setManualTrack('ميدان الوثبة');
                    setManualCategory('حول وزمول رموز');
                    setManualText(
                      'خبر رسمي حصري وموثق من اللجنة المنظمة في ميدان الوثبة: تم رفع جائزة شوط السيف الذهبي للحول المفتوح إلى 5 ملايين درهم، وتصدرت المطية «الوارية» لهجن الرئاسة الترشيحات الرسمية بعد تسجيلها أسرع توقيت تجريبي 11:42.0.'
                    );
                  }}
                  className="text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-colors"
                >
                  ✨ تعبئة نموذج خبر حصري سريع للتجربة
                </button>
              </div>

              <textarea
                rows={4}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="اكتب هنا أي معلومة أو نتيجة شوط أو قرار لجنة أو تسعيرة حصرية... سيقوم النظام بتحويلها فوراً إلى Embeddings وتخزينها في pgvector بأعلى أولوية مرجعية للرد على العملاء."
                className="w-full bg-stone-900 border border-stone-700 focus:border-purple-500 rounded-2xl p-4 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none leading-relaxed"
                required
              />

              {/* Optional Metadata Fields (Date, Track, Category) + Hidden Flag Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">تاريخ الخبر (اختياري):</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">الميدان (اختياري):</label>
                  <input
                    type="text"
                    value={manualTrack}
                    onChange={(e) => setManualTrack(e.target.value)}
                    placeholder="مثال: ميدان المرموم / ميدان الوثبة"
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">الفئة أو السن (اختياري):</label>
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    placeholder="مثال: حقايق بكار / قرار لجنة"
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSavingManual || !manualText.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-500/20"
                  >
                    {isSavingManual ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>اعتماد وحفظ</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of Verified Manual Knowledge Entries */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-stone-200 flex items-center justify-between">
                <span>سجل المعلومات والأخبار الملقنة يدوياً والمعتمدة في عقل البوت ({manualKnowledge.length}):</span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Flag: is_manual_verified = TRUE (Priority Weight 1.35x)
                </span>
              </h3>

              <div className="space-y-3">
                {manualKnowledge.map((mk) => (
                  <div
                    key={mk.id}
                    className="bg-stone-950 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 space-y-3 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>مرجع يدوي موثق (Manual/Verified)</span>
                        </span>
                        {mk.track_name && (
                          <span className="bg-stone-900 border border-stone-800 text-stone-200 px-2.5 py-0.5 rounded-lg">
                            📍 {mk.track_name}
                          </span>
                        )}
                        {mk.category && (
                          <span className="bg-stone-900 border border-stone-800 text-purple-300 px-2.5 py-0.5 rounded-lg">
                            🏷️ {mk.category}
                          </span>
                        )}
                        {mk.news_date && (
                          <span className="text-stone-400 font-mono text-[11px]">📅 {mk.news_date}</span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                        pgvector 128-dim • Weight: {mk.priority_weight || 1.35}x
                      </span>
                    </div>

                    <p className="text-sm text-stone-100 leading-relaxed font-medium bg-stone-900/70 p-3.5 rounded-xl border border-stone-800">
                      {mk.content_text}
                    </p>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleTriggerVoiceQuery(
                            mk.id,
                            `اختبار التلقين اليدوي (${mk.track_name || 'عام'})`,
                            `عطني القرار أو الخبر الموثق عن ${mk.track_name || ''} ${mk.category || ''}: ${mk.content_text.slice(0, 45)}`
                          )
                        }
                        className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        {isPlayingQueryId === mk.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        <span>اختبار سؤال البوت والنطق الصوتي للمعلومة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteManualKnowledge(mk.id)}
                        className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950/70 text-stone-400 hover:text-rose-300 border border-stone-800 transition-colors cursor-pointer"
                        title="حذف المعلومة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 0: Manager Exclusive Data & Buttons Board (Transferred from Public App) */}
      {activeSubTab === 'manager_board' && (
        <div className="space-y-6">
          {/* Dark Navy Control Card (Transferred from Public App Screenshot 2) */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 block mb-1">
                  غرفة تحكم المدير الحصرية (تم سحبها وإخفاؤها من واجهة الجمهور)
                </span>
                <h2 className="text-xl font-bold text-white">
                  صفحة البيانات وأزرار قاعدة البيانات المركزية
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  API: https://ais-pre-4yl5qwvhfeaqbnhjpzjaa7-389032105292.europe-west2.run.app
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddRaceForm(!showAddRaceForm)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة شوط جديد للقاعدة</span>
                </button>
              </div>
            </div>

            {managerStatusBanner && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{managerStatusBanner}</span>
              </div>
            )}

            {/* Transferred Display, Audio & Demo Media Control Buttons */}
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400 font-semibold">
                أزرار التحكم عن بُعد في عرض وصوت لوحة الجمهور (تطبق فوراً على تطبيق العميل):
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() =>
                    updateRemoteClientConfig(
                      { largeFontForElderly: !clientConfig.largeFontForElderly },
                      !clientConfig.largeFontForElderly
                        ? 'تم تفعيل تكبير الخط لكبار السن في لوحة الجمهور'
                        : 'تم إيقاف تكبير الخط والعودة للحجم الطبيعي'
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    clientConfig.largeFontForElderly
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Type className="w-4 h-4 text-amber-400" />
                  <span>تكبير الخط لكبار السن {clientConfig.largeFontForElderly ? '(مفعل ✓)' : ''}</span>
                </button>

                <button
                  onClick={() =>
                    updateRemoteClientConfig(
                      { autoPlayVoice: !clientConfig.autoPlayVoice },
                      !clientConfig.autoPlayVoice
                        ? 'تم تفعيل القراءة الصوتية التلقائية للردود'
                        : 'تم إيقاف القراءة التلقائية للصوت'
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    clientConfig.autoPlayVoice
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>تفعيل القراءة التلقائية {clientConfig.autoPlayVoice ? '(مفعل ✓)' : ''}</span>
                </button>

                <button
                  onClick={() =>
                    updateRemoteClientConfig(
                      { demoMediaAttached: !clientConfig.demoMediaAttached },
                      !clientConfig.demoMediaAttached
                        ? 'تم إرفاق الوسائط التجريبية باللوحة بنجاح'
                        : 'تم إزالة الوسائط التجريبية من اللوحة'
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    clientConfig.demoMediaAttached
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>إرفاق وسائط تجريبية باللوحة {clientConfig.demoMediaAttached ? '(مرفق ✓)' : ''}</span>
                </button>

                <button
                  onClick={() =>
                    updateRemoteClientConfig(
                      { triggerReset: true },
                      'تم إرسال أمر تصفير اللوحة ومسح المحادثة الحالية'
                    )
                  }
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/60 text-rose-200 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>تصفير اللوحة</span>
                </button>
              </div>
            </div>

            {/* Add New Race Form (Manager Only) */}
            {showAddRaceForm && (
              <form onSubmit={handleAddNewRace} className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-400">إضافة نتيجة شوط جديد لقاعدة البيانات المركزية:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <select
                    value={newRaceTrack}
                    onChange={(e) => setNewRaceTrack(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="ميدان المرموم">ميدان المرموم</option>
                    <option value="ميدان الوثبة">ميدان الوثبة</option>
                    <option value="ميدان الشحانية">ميدان الشحانية</option>
                    <option value="ميدان الطائف">ميدان الطائف</option>
                  </select>
                  <input
                    type="text"
                    value={newRaceCategory}
                    onChange={(e) => setNewRaceCategory(e.target.value)}
                    placeholder="الفئة (حقايق بكار)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newRaceWinner}
                    onChange={(e) => setNewRaceWinner(e.target.value)}
                    placeholder="اسم المطية الفائزة (مثال: سبج)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    value={newRaceOwner}
                    onChange={(e) => setNewRaceOwner(e.target.value)}
                    placeholder="المالك (مثال: هجن الرئاسة)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    value={newRaceTrainer}
                    onChange={(e) => setNewRaceTrainer(e.target.value)}
                    placeholder="المضمر (بن زيتون المهيري)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRaceTime}
                      onChange={(e) => setNewRaceTime(e.target.value)}
                      placeholder="التوقيت 05:48.2"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Active Audio / RAG Reply Box when Manager clicks any button */}
          {activeAudioResult && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-400 block">
                  رد المعلق الصوتي على: {activeAudioResult.title}
                </span>
                <p className="text-sm text-stone-100 leading-relaxed">{activeAudioResult.answer}</p>
              </div>
              {activeAudioResult.audioUrl && (
                <audio controls autoPlay src={activeAudioResult.audioUrl} className="h-10 shrink-0" />
              )}
            </div>
          )}

          {/* Live Monitor of Incoming Questions / Voice Notes from the Public Board */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${clientLogs.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <h3 className="text-sm font-bold text-stone-100">
                  سجل الأسئلة والتسجيلات الصوتية الواردة من «لوحة الجمهور» ({clientLogs.length})
                </h3>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                POST /api/chat • تحديث حي كل 4 ثوانٍ
              </span>
            </div>

            {clientLogs.length === 0 ? (
              <p className="text-xs text-stone-400 bg-stone-950 border border-stone-800 rounded-xl p-3">
                بانتظار أول سؤال نصي أو تسجيل صوتي من لوحة الجمهور... بمجرد أن يكتب العميل أو يسجل صوته في الصفحة الثانية، سيظهر سؤاله والإجابة المسحوبة من بياناتك هنا فوراً.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {clientLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span className="font-bold text-amber-400">
                        {log.inputType === 'voice' ? '🎤 تسجيل صوتي من العميل' : '💬 كلام/سؤال مرسل من العميل'} ({log.channel})
                      </span>
                      <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString('ar-SA')}</span>
                    </div>

                    <div className="flex items-start justify-between gap-3 bg-stone-900/70 p-2.5 rounded-lg border border-stone-800/80">
                      <p className="text-stone-200 font-semibold leading-relaxed">
                        الكلام المرسل: {log.query}
                      </p>
                      <button
                        onClick={() => handleReadTextAloud(`${log.id}-q`, 'قراءة كلام العميل المرسل', log.query)}
                        title="اضغط لقراءة كلام العميل بالصوت"
                        className="shrink-0 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isPlayingQueryId === `${log.id}-q` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>اسمع الكلام</span>
                      </button>
                    </div>

                    <div className="flex items-start justify-between gap-3 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20">
                      <p className="text-emerald-400 leading-relaxed">
                        الرد المرسل من بياناتك: {log.answer}
                      </p>
                      <button
                        onClick={() => handleReadTextAloud(`${log.id}-a`, 'قراءة رد الذكاء الاصطناعي من البيانات', log.answer)}
                        title="اضغط لقراءة الرد الصادر من البيانات بالصوت"
                        className="shrink-0 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isPlayingQueryId === `${log.id}-a` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>اسمع الرد</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Query Buttons Card (Transferred from Public App Screenshot 2) */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>أزرار الاستعلام السريع في قاعدة البيانات ({quickButtons.length} أزرار)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  محفوظة هنا عند المدير فقط — اضغط على أي زر لتشغيل الاستعلام وسماع النتيجة، أو أضف أزراراً جديدة:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickButtons.map((btn) => (
                <div
                  key={btn.id}
                  className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all"
                >
                  <button
                    onClick={() => handleTriggerVoiceQuery(btn.id, btn.title, btn.query)}
                    className="text-right flex-1 cursor-pointer"
                  >
                    <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      {isPlayingQueryId === btn.id && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
                      <span>{btn.title}</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">{btn.query}</p>
                  </button>
                  <button
                    onClick={() => handleDeleteQuickButton(btn.id)}
                    title="حذف الزر"
                    className="p-2 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Quick Button Form */}
            <form onSubmit={handleAddQuickButton} className="pt-3 border-t border-stone-800 flex flex-wrap gap-2">
              <input
                type="text"
                value={newBtnTitle}
                onChange={(e) => setNewBtnTitle(e.target.value)}
                placeholder="عنوان الزر الجديد (مثال: نتيجة الشوط الثالث)"
                className="flex-1 min-w-[200px] bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100"
              />
              <input
                type="text"
                value={newBtnQuery}
                onChange={(e) => setNewBtnQuery(e.target.value)}
                placeholder="نص السؤال الذي يُرسل للمحرك (مثال: من فاز بالشوط الثالث وكم توقيته؟)"
                className="flex-[2] min-w-[260px] bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة زر للقاعدة</span>
              </button>
            </form>
          </div>

          {/* Doping / Banned Camels Violations Manager Card (SQL JOIN Cross-Referencing) */}
          <div className="bg-stone-900 border border-rose-500/30 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                  <Dna className="w-5 h-5 text-rose-400" />
                  <span>جدول قوائم المخالفات والفحص والربط العلائقي التلقائي (SQL JOIN: doping_violations ⋈ race_results)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  يدخل المدير فقط (المهرجان، السن، اليوم، الشوط، المركز)، ويقوم محرك SQL JOIN باستخراج (اسم المطية، اسم المالك، المضمر) تلقائياً من جدول النتائج الأساسي.
                </p>
              </div>
              <span className="text-[11px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full font-bold">
                {violationsJoined.length} حالات فحص مسجلة
              </span>
            </div>

            {/* Add New Violation Form (Only Festival, Age, Day, Heat, Rank) */}
            <form onSubmit={handleAddViolation} className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-rose-300">
                إدراج مخالفة جديدة في جدول المخالفات (بدون كتابة اسم المطية أو المالك — سيتم سحبهما عبر SQL JOIN):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <input
                  type="text"
                  value={violFestival}
                  onChange={(e) => setViolFestival(e.target.value)}
                  placeholder="اسم المهرجان (مثل: مهرجان العين)"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  value={violCategory}
                  onChange={(e) => setViolCategory(e.target.value)}
                  placeholder="السن (مثل: فطامين)"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  value={violDay}
                  onChange={(e) => setViolDay(e.target.value)}
                  placeholder="اليوم (مثل: السبت)"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-rose-500"
                />
                <input
                  type="number"
                  min={1}
                  value={violHeat}
                  onChange={(e) => setViolHeat(Number(e.target.value))}
                  placeholder="رقم الشوط"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-rose-500"
                />
                <select
                  value={violRank}
                  onChange={(e) => setViolRank(Number(e.target.value))}
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-rose-500"
                >
                  <option value={1}>المركز 1 (الأول)</option>
                  <option value={2}>المركز 2 (الثاني)</option>
                  <option value={3}>المركز 3 (الثالث)</option>
                </select>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة وربط (JOIN)</span>
                </button>
              </div>
            </form>

            {/* Joined Violations List */}
            <div className="space-y-2.5">
              {violationsJoined.map((v) => (
                <div
                  key={v.violation_id}
                  className="bg-stone-950 border border-stone-800/90 hover:border-rose-500/40 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                        بيانات جدول المخالفات: {v.festival_name} · سن {v.category} · يوم {v.race_day} · شوط {v.heat_number} · مركز {v.rank}
                      </span>
                      <span className="text-emerald-400 font-mono text-[11px]">
                        ➔ [SQL INNER JOIN race_results]
                      </span>
                    </div>
                    <p className="text-sm font-bold text-stone-100">
                      المطية المستخرجة تلقائياً: <span className="text-amber-400">«{v.camel_name}»</span>
                      {' · '}
                      المالك: <span className="text-white">{v.owner_name}</span>
                      {' · '}
                      المضمر: <span className="text-stone-300">{v.trainer_name}</span>
                    </p>
                    <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                      رد البوت المعتمد: «{v.formatted_bot_response}»
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        handleTriggerVoiceQuery(
                          v.violation_id || v.id,
                          `فحص ${v.festival_name} شوط ${v.heat_number}`,
                          `من تم قبضه في ${v.festival_name} ${v.category} الشوط ${v.heat_number}؟`
                        )
                      }
                      className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>اختبار ونطق النتيجة</span>
                    </button>
                    <button
                      onClick={() => handleDeleteViolation(v.violation_id || v.id)}
                      className="bg-stone-900 hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-stone-800 p-2 rounded-xl transition-colors cursor-pointer"
                      title="حذف السجل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media Data Ingestion Pipeline & AI Data Cleaning Manager Card (YouTube & Instagram -> Gemini -> pgvector) */}
          <div className="bg-stone-900 border border-purple-500/30 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-stone-100">
                    خط سحب وفلترة أخبار السوشيال ميديا التلقائي (YouTube & Instagram ➔ Gemini AI Cleaning ➔ pgvector)
                  </h3>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  يمنع النظام تخزين النصوص المسحوبة مباشرة؛ حيث يمررها أولاً على نموذج Gemini لحذف الإعلانات والهاشتاجات واستخراج الكيانات وتحويلها إلى متجهات (Embeddings) مع حفظ رابط المصدر الأصلي (Source URL).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold">
                  ⏰ المزامنة التلقائية: كل ساعة (Apify Worker)
                </span>
                <button
                  onClick={handleTriggerApifySync}
                  disabled={isSyncingApify}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-600/20"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingApify ? 'animate-spin' : ''}`} />
                  <span>{isSyncingApify ? 'جاري السحب والفلترة...' : 'سحب ومزامنة منشور جديد الآن (Apify)'}</span>
                </button>
              </div>
            </div>

            {/* Live AI Data Cleaning Simulator Form */}
            <form
              onSubmit={handleCleanAndStoreSocialPost}
              className="bg-stone-950/90 border border-purple-500/25 rounded-2xl p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-purple-400" />
                  <span>مختبر الفلترة الفورية: الصق أي منشور خام من يوتيوب أو إنستقرام لتجربة تنظيفه بالذكاء الاصطناعي فوراً:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRawSocialPlatform('instagram');
                    setRawSocialAccount('حساب ميدان المرموم الرسمي (@marmoom_camel)');
                    setRawSocialUrl('https://www.instagram.com/reel/C9MarmoomGoldCup/');
                    setRawSocialInput(
                      '🔥 تغطية نارية من ميدان المرموم!! برعاية عزبة الخليج للأعلاف والركبي الآلي (خصم 25% كود HJN25) للتواصل 0509998877 📞 لا تنسوا اللايك والفولو.. خطفت البكرة «الظبي» المملوكة لـ هجن الرئاسة بقيادة المضمر محمد عتيق بن زيتون المهيري ناموس الشوط الثالث لفئة اللقايا بكار مفتوح في ميدان المرموم بتوقيت 05:49.8! #سباقات_الهجن #المرموم #دبي #اكسبلور #فولو #اعلانات #ترند_الخليج'
                    );
                  }}
                  className="text-[11px] bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg font-semibold cursor-pointer transition-colors"
                >
                  📋 تعبئة نموذج منشور مليء بالإعلانات والهاشتاجات للتجربة
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={rawSocialPlatform}
                  onChange={(e) => setRawSocialPlatform(e.target.value as 'youtube' | 'instagram')}
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="instagram">إنستقرام (Instagram Caption / Reels)</option>
                  <option value="youtube">يوتيوب (YouTube Video Description)</option>
                </select>
                <input
                  type="text"
                  value={rawSocialAccount}
                  onChange={(e) => setRawSocialAccount(e.target.value)}
                  placeholder="اسم القناة أو الحساب الرسمي"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={rawSocialUrl}
                  onChange={(e) => setRawSocialUrl(e.target.value)}
                  placeholder="رابط المنشور الأصلي (Source URL)"
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <textarea
                  rows={2}
                  value={rawSocialInput}
                  onChange={(e) => setRawSocialInput(e.target.value)}
                  placeholder="الصق هنا نص المنشور الخام من يوتيوب أو إنستقرام (مع الهاشتاجات والإعلانات ليقوم الذكاء الاصطناعي بحذفها واستخراج الكيانات فقط)..."
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={isCleaningManualPost || !rawSocialInput.trim()}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isCleaningManualPost ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>فلترة بالذكاء الاصطناعي وتخزين في pgvector</span>
                </button>
              </div>
            </form>

            {/* Platform Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-semibold">تصفية المنشورات المسحوبة حسب المنصة:</span>
                {[
                  { id: 'all', label: `الكل (${raceNews.length})` },
                  {
                    id: 'youtube',
                    label: `🎥 يوتيوب YouTube (${raceNews.filter((n) => n.platform === 'youtube').length})`,
                  },
                  {
                    id: 'instagram',
                    label: `📸 إنستقرام Instagram (${raceNews.filter((n) => n.platform === 'instagram').length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setNewsPlatformFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      newsPlatformFilter === tab.id
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-purple-300 font-mono">
                جدول: race_news • pgvector (128-dim HNSW)
              </span>
            </div>

            {/* Extracted & Cleaned News Comparison Cards */}
            <div className="space-y-4">
              {raceNews
                .filter((n) => newsPlatformFilter === 'all' || n.platform === newsPlatformFilter)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-stone-950 border border-stone-800/90 hover:border-purple-500/40 rounded-2xl p-5 space-y-4 transition-all"
                  >
                    {/* Header: Platform, Account, pgvector badge, Source URL */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            item.platform === 'youtube'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          }`}
                        >
                          {item.platform === 'youtube' ? '🎥 YouTube Data / RSS' : '📸 Instagram (Apify)'}
                        </span>
                        <span className="text-xs font-bold text-stone-200">{item.account_name}</span>
                        <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-mono">
                          pgvector Indexed ✓
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>رابط المصدر (Source URL)</span>
                        </a>
                      </div>
                    </div>

                    {/* Side-by-Side Comparison: Raw Social Media Caption vs AI-Cleaned Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Raw Text Box */}
                      <div className="bg-stone-900/70 border border-rose-500/20 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-rose-300">
                            ❌ النص الخام المسحوب (قبل الفلترة — يحتوي إعلانات وهاشتاجات):
                          </span>
                          <span className="text-[10px] text-stone-500">يُمنع تخزينه مباشرة</span>
                        </div>
                        <p className="text-xs text-stone-400 leading-relaxed line-through decoration-rose-500/40">
                          {item.raw_text}
                        </p>
                      </div>

                      {/* Cleaned Text Box */}
                      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-300">
                            ✅ النص الصافي المعتمد بعد فلترة Gemini AI (المخزن في pgvector):
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">Embeddings Ready</span>
                        </div>
                        {editingNewsId === item.id ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={editNewsDraft.summary}
                              onChange={(e) => setEditNewsDraft({ ...editNewsDraft, summary: e.target.value })}
                              className="w-full bg-stone-950 border border-emerald-500/50 rounded-lg p-2 text-xs text-stone-100"
                            />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <input
                                type="text"
                                value={editNewsDraft.camel_name}
                                onChange={(e) => setEditNewsDraft({ ...editNewsDraft, camel_name: e.target.value })}
                                placeholder="اسم المطية"
                                className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100"
                              />
                              <input
                                type="text"
                                value={editNewsDraft.owner_name}
                                onChange={(e) => setEditNewsDraft({ ...editNewsDraft, owner_name: e.target.value })}
                                placeholder="اسم المالك"
                                className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100"
                              />
                              <input
                                type="text"
                                value={editNewsDraft.race_event}
                                onChange={(e) => setEditNewsDraft({ ...editNewsDraft, race_event: e.target.value })}
                                placeholder="المهرجان/الميدان"
                                className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100"
                              />
                              <input
                                type="text"
                                value={editNewsDraft.time}
                                onChange={(e) => setEditNewsDraft({ ...editNewsDraft, time: e.target.value })}
                                placeholder="التوقيت"
                                className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100 font-mono"
                              />
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handleSaveEditNews(item.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>حفظ واعتماد</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNewsId(null)}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>إلغاء</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-100 font-medium leading-relaxed">{item.summary}</p>
                        )}
                      </div>
                    </div>

                    {/* Extracted Structured Entities Row & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-stone-400 font-semibold">الكيانات المستخرجة:</span>
                        {item.camel_name && (
                          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-bold">
                            🐪 المطية: {item.camel_name}
                          </span>
                        )}
                        {item.owner_name && (
                          <span className="bg-stone-800 text-stone-200 border border-stone-700 px-2.5 py-0.5 rounded-lg">
                            👤 المالك: {item.owner_name}
                          </span>
                        )}
                        {item.trainer_name && (
                          <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-lg">
                            🎯 المضمر: {item.trainer_name}
                          </span>
                        )}
                        {(item.race_event || item.track_name) && (
                          <span className="bg-stone-800 text-stone-300 border border-stone-700 px-2.5 py-0.5 rounded-lg">
                            🏁 {item.race_event || item.track_name}
                          </span>
                        )}
                        {item.heat_number && (
                          <span className="bg-stone-800 text-amber-300 border border-stone-700 px-2.5 py-0.5 rounded-lg font-bold">
                            الشوط {item.heat_number}
                          </span>
                        )}
                        {item.time && (
                          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg font-mono font-bold">
                            ⏱️ {item.time}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleTriggerVoiceQuery(
                              `news-${item.id}`,
                              `خبر ${item.camel_name || item.account_name}`,
                              `عطني خبر منشور ${item.camel_name || ''} من ${item.account_name} مع رابط المصدر`
                            )
                          }
                          className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isPlayingQueryId === `news-${item.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                          <span>اختبار سؤال البوت والنطق الصوتي</span>
                        </button>

                        <button
                          onClick={() => handleStartEditNews(item)}
                          className="bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="تعديل الخبر"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => handleDeleteNews(item.id)}
                          className="bg-stone-900 hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-stone-800 p-1.5 rounded-xl transition-colors cursor-pointer"
                          title="حذف الخبر من القاعدة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Today's Camel Race Results Cards (Transferred from Public App Screenshot 1) */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>نتائج أشواط الهجن اليوم (مخزنة عند المدير فقط)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  محدثة تلقائياً من قروبات الواتساب الرسمية عبر محرك Baileys ({filteredRaces.length} أشواط مسجلة)
                </p>
              </div>

              {/* Track Filter Pills (Matching Screenshot 1) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {tracks.map((trk) => (
                  <button
                    key={trk}
                    onClick={() => setSelectedTrack(trk)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedTrack === trk
                        ? 'bg-amber-500 text-stone-950 shadow-md'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {trk}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute right-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المطية (مثل: سبج، الشاهينية، الفارس) أو المضمر أو المالك..."
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl pr-11 pl-4 py-3 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Race Cards List */}
            <div className="space-y-4">
              {filteredRaces.map((race) => (
                <div
                  key={race.id}
                  className="bg-stone-950 border border-stone-800/90 hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-stone-400 font-medium">
                      <span className="text-stone-200 font-bold">{race.track_name || 'ميدان المرموم'}</span>
                      <span>·</span>
                      <span>{race.category}</span>
                      <span>·</span>
                      <span>{race.distance || '4 كم'}</span>
                      <span>·</span>
                      <span className="text-amber-400 font-bold">{race.prizeTitle || 'شوط رئيسي'}</span>
                    </div>
                    <div className="text-emerald-400 font-bold font-mono text-sm">
                      التوقيت: {race.time}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-stone-100">
                      {race.roundTitle || `الشوط ${race.heat_number} — ${race.category} — البطلة: «${race.winner_name}»`}
                    </h4>
                    <p className="text-xs text-stone-300 mt-1">
                      المالك: <span className="font-bold text-white">{race.owner_name}</span>
                      {' · '}
                      المضمر: <span className="font-bold text-amber-300">{race.trainer_name || '—'}</span>
                    </p>
                    {(race.second_place || race.third_place || race.speed_kmh) && (
                      <p className="text-[11px] text-stone-400 mt-1">
                        {race.second_place ? `المركز الثاني: ${race.second_place}` : ''}
                        {race.third_place ? ` · المركز الثالث: ${race.third_place}` : ''}
                        {race.speed_kmh ? ` · السرعة: ${race.speed_kmh}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                      onClick={() =>
                        handleTriggerVoiceQuery(
                          race.id,
                          `نتيجة ${race.winner_name}`,
                          `سمعني تفاصيل نتيجة الشوط ${race.heat_number} للمطية ${race.winner_name} في ${race.track_name || 'الميدان'} وكم التوقيت والمالك والمضمر؟`
                        )
                      }
                      className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isPlayingQueryId === race.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      <span>اسمع نتيجة الشوط</span>
                    </button>

                    <button
                      onClick={() =>
                        handleTriggerVoiceQuery(
                          `${race.id}-last100m`,
                          `آخر 100 متر — ${race.winner_name}`,
                          `عطني مركاض ${race.track_name || race.festival_name} الشوط ${race.heat_number} للمطية ${race.winner_name} آخر 100 متر`
                        )
                      }
                      className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-emerald-400" />
                      <span>لقطة آخر 100 متر (-25 ثانية)</span>
                    </button>

                    <button
                      onClick={() =>
                        handleTriggerVoiceQuery(
                          `${race.id}-ask`,
                          `استفسار عن ${race.winner_name}`,
                          `عطني تحليل كامل عن فوز المطية ${race.winner_name} لـ ${race.owner_name} وتوقيتها ${race.time}`
                        )
                      }
                      className="bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      <span>اسأل بالمحادثة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Relational Table View */}
      {activeSubTab === 'relational' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-stone-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المطية، المالك، المضمر، الأب، أو المهرجان..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pr-10 pl-4 py-2 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-750'
                  }`}
                >
                  {cat === 'all' ? 'جميع الفئات' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-950 text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="p-3.5 font-semibold">الشوط</th>
                    <th className="p-3.5 font-semibold">الفئة والسن</th>
                    <th className="p-3.5 font-semibold">المطية الفائزة</th>
                    <th className="p-3.5 font-semibold">المالك (Owner)</th>
                    <th className="p-3.5 font-semibold">المضمر (Trainer)</th>
                    <th className="p-3.5 font-semibold">الأب والسلالة</th>
                    <th className="p-3.5 font-semibold">التوقيت</th>
                    <th className="p-3.5 font-semibold">المهرجان والميدان</th>
                    <th className="p-3.5 font-semibold">الفيديو</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredRaces.map((race) => (
                    <tr key={race.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-amber-400 whitespace-nowrap">الشوط {race.heat_number}</td>
                      <td className="p-3.5">
                        <span className="bg-stone-800 text-stone-200 px-2 py-1 rounded-md text-[11px] font-medium border border-stone-700 whitespace-nowrap">
                          {race.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-stone-100">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-amber-300">{race.winner_name}</span>
                        </div>
                        {race.former_name && (
                          <span className="text-[10px] text-stone-500 block mr-5">
                            ({race.former_name})
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-stone-200 font-medium">
                        {race.owner_name}
                      </td>
                      <td className="p-3.5 text-purple-300 font-medium">
                        {race.trainer_name ? (
                          <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded text-[11px]">
                            {race.trainer_name}
                          </span>
                        ) : (
                          <span className="text-stone-600 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-emerald-400 text-[11px]">
                        {race.sire_lineage ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Dna className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span>{race.sire_lineage}</span>
                          </span>
                        ) : (
                          <span className="text-stone-600">—</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{race.time}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-stone-400 text-[11px] whitespace-nowrap">
                        <span className="text-stone-300 block">{race.track_name || 'ميدان الطائف'}</span>
                        <span className="text-[10px] text-stone-500">{race.festival_name || 'مهرجان ولي العهد'}</span>
                      </td>
                      <td className="p-3.5">
                        {race.media_urls && race.media_urls.length > 0 ? (
                          <a
                            href={race.media_urls[0].startsWith('http') ? race.media_urls[0] : `https://${race.media_urls[0]}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2 py-1 rounded text-[10px] flex items-center gap-1 w-fit transition-colors"
                          >
                            <Video className="w-3 h-3" />
                            <span>بث الشوط</span>
                          </a>
                        ) : (
                          <span className="text-stone-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRaces.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-stone-500">
                        لا توجد نتائج مطابقة لخيارات البحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Vector DB & Semantic Search */}
      {activeSubTab === 'vector' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Search Box */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3">
              <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>البحث بالمعنى والدلالة (Semantic Cosine Search)</span>
              </h3>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                يتم تحويل استفسار المستخدم إلى متجه رقمي عبر Gemini Embedding ومطابقته مع محادثات
                المجموعات غير المهيكلة (مثل أحوال الطقس، سلالات الفحول، التسعيرات، التأجيلات).
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="اسأل بالمعنى (مثال: ما هي سلالة الفحل جبار؟)"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-purple-500 font-sans"
                />

                <button
                  onClick={handleSemanticSearch}
                  disabled={isSearchingVector}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSearchingVector ? 'جاري البحث الدلالي المتجهي...' : 'بحث دلالي فوري (Vector Cosine Distance)'}</span>
                </button>
              </div>
            </div>

            {/* Embeddings in DB List */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3">
              <h4 className="text-xs font-bold text-stone-300 flex items-center justify-between">
                <span>المحادثات المضمنة في pgvector ({embeddings.length}):</span>
                <span className="text-[10px] text-stone-500 font-mono">128-dim HNSW Index</span>
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {embeddings.map((emb) => (
                  <div key={emb.id} className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-stone-400 text-[10px]">
                      <span className="font-bold text-stone-300">{emb.sender_name}</span>
                      <span className="bg-stone-900 px-1.5 py-0.5 rounded text-stone-500">{emb.category}</span>
                    </div>
                    <p className="text-stone-300 leading-relaxed">{emb.content_text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search Output */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3">
              <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>نتائج المطابقة المتجهية (Top Matched Semantic Vectors)</span>
              </h3>

              {semanticResults ? (
                <div className="space-y-3">
                  {semanticResults.map((match, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-stone-950 rounded-xl border border-purple-500/30 space-y-2 text-right"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-200">{match.item?.sender_name || 'عضو المجموعة'}</span>
                        <span className="bg-purple-500/20 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                          دقة التشابه: {Math.round(match.score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        {match.item?.content_text}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-900">
                        <span>المجموعة: {match.item?.group_name}</span>
                        <span className="font-mono">{match.item?.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-stone-500 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-stone-700" />
                  <p className="text-xs">اضغط على "بحث دلالي فوري" لتجربة استرجاع السياق عبر المتجهات</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: SQL Terminal */}
      {activeSubTab === 'sql' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>محرر استعلامات PostgreSQL التفاعلي:</span>
            </h3>
            <span className="text-[10px] text-stone-400 font-mono">
              جداول: race_results, camel_owners, camel_trainers, camels
            </span>
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-amber-500 leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    setSqlInput(
                      `SELECT company_name, service_role, encrypted_api_key, masked_preview, is_active, env_fallback_name FROM api_settings;`
                    )
                  }
                  className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 px-2.5 py-1 rounded cursor-pointer font-bold"
                >
                  جدول مفاتيح الشركات المشفرة (api_settings)
                </button>
                <button
                  onClick={() =>
                    setSqlInput(
                      `SELECT content_text, track_name, category, news_date, is_manual_verified, priority_weight FROM manual_knowledge ORDER BY created_at DESC;`
                    )
                  }
                  className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 px-2.5 py-1 rounded cursor-pointer font-bold"
                >
                  جدول التلقين اليدوي الموثق ★ (manual_knowledge)
                </button>
                <button
                  onClick={() =>
                    setSqlInput(
                      `SELECT platform, camel_name, owner_name, race_event, heat_number, time, summary, source_url FROM race_news ORDER BY created_at DESC;`
                    )
                  }
                  className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 px-2.5 py-1 rounded cursor-pointer font-bold"
                >
                  جدول أخبار يوتيوب وإنستقرام المفلترة (race_news)
                </button>
                <button
                  onClick={() =>
                    setSqlInput(
                      `SELECT v.festival_name AS "المهرجان", v.category AS "السن", v.race_day AS "اليوم", v.heat_number AS "الشوط", v.rank AS "المركز", r.winner_name AS "اسم المطية", r.owner_name AS "المالك", COALESCE(r.trainer_name, '---') AS "المضمر" FROM doping_violations v INNER JOIN race_results r ON r.festival_name = v.festival_name AND r.heat_number = v.heat_number;`
                    )
                  }
                  className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 px-2.5 py-1 rounded cursor-pointer font-bold"
                >
                  ربط جدول المخالفات مع النتائج (SQL JOIN)
                </button>
                <button
                  onClick={() =>
                    setSqlInput(
                      `SELECT heat_number AS "الشوط", category AS "الفئة", winner_name AS "اسم المطية", owner_name AS "المالك", COALESCE(trainer_name, '---') AS "المضمر", time AS "التوقيت", sire_lineage AS "سلالة الأب" FROM race_results WHERE DATE(created_at) = CURRENT_DATE ORDER BY heat_number ASC;`
                    )
                  }
                  className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 px-2.5 py-1 rounded cursor-pointer font-bold"
                >
                  استعلام التحقق الميداني (COALESCE + ترتيب الأشواط)
                </button>
                <button
                  onClick={() =>
                    setSqlInput(
                      'SELECT winner_name, owner_name, trainer_name, sire_lineage, time_recorded FROM race_results WHERE category LIKE \'%ثنايا%\' ORDER BY time_in_seconds ASC;'
                    )
                  }
                  className="text-[10px] bg-stone-800 hover:bg-stone-750 text-stone-300 px-2 py-1 rounded cursor-pointer"
                >
                  أسرع توقيت رموز الثنايا
                </button>
                <button
                  onClick={() =>
                    setSqlInput(
                      'SELECT owner_name, COUNT(*) as wins, STRING_AGG(winner_name, \', \') as camels FROM race_results GROUP BY owner_name ORDER BY wins DESC;'
                    )
                  }
                  className="text-[10px] bg-stone-800 hover:bg-stone-750 text-stone-300 px-2 py-1 rounded cursor-pointer"
                >
                  إحصائيات الملاك الأكثر فوزاً
                </button>
              </div>

              <button
                onClick={handleExecuteSql}
                disabled={isExecutingSql}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isExecutingSql ? 'جاري التنفيذ...' : 'تنفيذ الاستعلام (Execute SQL)'}</span>
              </button>
            </div>
          </div>

          {/* SQL Output Box */}
          {sqlOutput && (
            <div className="mt-4 border border-stone-800 rounded-xl overflow-hidden bg-stone-950">
              <div className="p-2.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs text-stone-400">
                <span className="font-mono text-[10px] text-emerald-400">
                  {sqlOutput.rows.length} rows returned successfully
                </span>
                <span className="text-[10px]">Execution Time: 4.2ms</span>
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-right text-xs font-mono">
                  <thead className="bg-stone-900/60 text-stone-400 border-b border-stone-800">
                    <tr>
                      {sqlOutput.columns.map((col) => (
                        <th key={col} className="p-2.5 font-bold text-amber-400">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/40">
                    {sqlOutput.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-stone-900/30">
                        {sqlOutput.columns.map((col) => (
                          <td key={col} className="p-2.5 text-stone-200">
                            {String(row[col] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
