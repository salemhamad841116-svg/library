import React, { useState, useEffect, useRef } from 'react';
import { Activity, Radio, Volume2, RefreshCw, Search, Play, Pause, Clock, ShieldCheck, Zap } from 'lucide-react';
import { safeFetchJson } from '../../../admin/bot/lib/safeFetch';

interface ChatLog {
  id: number;
  sessionId?: string;
  channel: string;
  inputType: 'text' | 'voice';
  question: string;
  answer: string;
  source?: string;
  provider?: string;
  ruleId?: string;
  sources: string[];
  latencyMs?: number;
  createdAt: string;
}

export const BotLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchInitialLogs = async () => {
    const data = await safeFetchJson('/api/bot/admin/chat-logs?limit=50');
    if (data?.logs) setLogs(data.logs);
  };

  useEffect(() => {
    fetchInitialLogs();
  }, []);

  // Connect to SSE Live Stream
  useEffect(() => {
    if (!isLive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const es = new EventSource('/api/bot/admin/chat-logs/stream');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'chat_log' && payload.log) {
          setLogs((prev) => [payload.log, ...prev.slice(0, 99)]);
        }
      } catch {
        /* ignore parse */
      }
    };

    es.onerror = () => {
      console.warn('SSE stream disconnected, will reconnect automatically');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [isLive]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = selectedChannel === 'all' || log.channel === selectedChannel;
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <span>سجل المحادثات المباشر (Live Chat Logs & SSE Stream)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة فورية ومباشرة لكافة استفسارات الجمهور على الدومين العام مع قياس زمن الاستجابة ونوع المصدر.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isLive ? 'البث المباشر متصل (Live)' : 'البث متوقف'}</span>
          </button>

          <button
            onClick={fetchInitialLogs}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300"
            title="تحديث السجل"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في السؤال أو الإجابة..."
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">القناة:</span>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
          >
            <option value="all">كافة القنوات</option>
            <option value="public_web">واجهة الويب العامة (bot.misruq.com)</option>
            <option value="mobile_app">تطبيق الهواتف الذكية</option>
            <option value="whatsapp_simulator">محاكي واتساب</option>
          </select>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            لا توجد محادثات مسجلة حتى الآن. عند تحدث المستخدمين ستظهر فورياً هنا عبر البث المباشر.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {log.inputType === 'voice' ? <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> : null}
                      <span>س: {log.question}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                      {log.channel}
                    </span>
                    {log.latencyMs !== undefined && (
                      <span className="flex items-center gap-1 font-mono text-indigo-600 dark:text-indigo-400">
                        <Zap className="w-3 h-3" />
                        <span>{log.latencyMs}ms</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.createdAt).toLocaleTimeString('ar-EG')}</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 ml-1">ج:</span>
                  {log.answer}
                </p>

                <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 pt-0.5">
                  <span className="font-semibold text-slate-500">المصدر:</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold">
                    {log.source || 'محرك المعرفة'}
                  </span>
                  {log.provider && (
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      المزود: {log.provider}
                    </span>
                  )}
                  {log.sources && log.sources.length > 0 && (
                    <span className="text-slate-500">
                      المراجع: {log.sources.join('، ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
