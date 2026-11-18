import React, { useState, useEffect } from 'react';
import {
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { QueueJobItem, QueueMetrics } from '../types';
import { safeFetchJson } from '../lib/safeFetch';

export const QueueMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<QueueJobItem[]>([]);
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchQueueData = async () => {
    const data = await safeFetchJson('/api/queue/jobs');
    if (!data) return;
    setJobs(data.jobs || []);
    setMetrics(data.metrics || null);
  };

  useEffect(() => {
    fetchQueueData();
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchQueueData, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>المهام النشطة</span>
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <span className="text-2xl font-bold text-amber-400">{metrics?.active ?? 0}</span>
          <span className="text-[10px] text-stone-500 block mt-1">جاري المعالجة بواسطة Worker</span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>قيد الانتظار</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-bold text-blue-400">{metrics?.waiting ?? 0}</span>
          <span className="text-[10px] text-stone-500 block mt-1">في طابور BullMQ</span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>المكتملة بنجاح</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-400">{metrics?.completed ?? 0}</span>
          <span className="text-[10px] text-stone-500 block mt-1">تم الفرز والتخزين</span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>متوسط زمن المعالجة</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl font-bold text-purple-400 font-mono">
            {metrics?.avgDurationMs ?? 850} ms
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">FFmpeg + Whisper + LLM</span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>إجمالي المعالج</span>
            <Layers className="w-4 h-4 text-stone-400" />
          </div>
          <span className="text-2xl font-bold text-stone-100">{metrics?.totalProcessed ?? 0}</span>
          <span className="text-[10px] text-stone-500 block mt-1">رسائل ومقاطع صوتية</span>
        </div>
      </div>

      {/* Jobs List Header & Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-stone-200">
            سجل مهام الطابور اللاتزامني (BullMQ Workers Stream)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-stone-800 text-stone-400 border-stone-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'}`} />
            <span>تحديث حي: {autoRefresh ? 'مفعّل' : 'متوقف'}</span>
          </button>

          <button
            onClick={fetchQueueData}
            className="p-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl border border-stone-700 cursor-pointer"
            title="تحديث يدوي"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Jobs Stream */}
      <div className="space-y-3">
        {jobs.map((job) => {
          const isExpanded = expandedJobId === job.id;
          return (
            <div
              key={job.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-md transition-all hover:border-stone-700"
            >
              <div
                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      job.status === 'completed'
                        ? 'bg-emerald-400'
                        : job.status === 'active'
                        ? 'bg-amber-400 animate-pulse'
                        : job.status === 'failed'
                        ? 'bg-rose-500'
                        : 'bg-blue-400'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-200">{job.id}</span>
                      <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded">
                        {job.type === 'audio_message' ? '🎙️ تسجيل صوتي' : '💬 رسالة نصية'}
                      </span>
                      {job.data.isMentionOrDM && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                          استدعاء بالمنشن / DM
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 truncate max-w-md">
                      {job.data.senderName} • {job.data.groupName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {job.durationMs !== undefined && (
                    <span className="text-xs font-mono text-stone-400">
                      ⏱️ {job.durationMs} ms
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      job.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : job.status === 'active'
                        ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                        : job.status === 'failed'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {job.status === 'completed'
                      ? 'مكتمل ✅'
                      : job.status === 'active'
                      ? `جاري المعالجة (${job.progress}%)`
                      : job.status === 'failed'
                      ? 'فشل ❌'
                      : 'قيد الانتظار'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-950 h-1">
                <div
                  style={{ width: `${job.progress}%` }}
                  className={`h-full transition-all duration-300 ${
                    job.status === 'completed'
                      ? 'bg-emerald-500'
                      : job.status === 'active'
                      ? 'bg-amber-500'
                      : 'bg-stone-700'
                  }`}
                />
              </div>

              {/* Expanded Step-by-Step Logs */}
              {isExpanded && (
                <div className="bg-stone-950 p-4 border-t border-stone-800 space-y-3">
                  <h4 className="text-xs font-bold text-stone-300">سجل خطوات خط المعالجة (Step Logs):</h4>
                  <div className="space-y-1.5 font-mono text-[11px] text-stone-400">
                    {job.logs.map((log, lIdx) => (
                      <div key={lIdx} className="flex items-start gap-2">
                        <span className="text-amber-500 select-none">›</span>
                        <span className="text-stone-300">{log}</span>
                      </div>
                    ))}
                  </div>

                  {job.result && (
                    <div className="mt-3 pt-3 border-t border-stone-800">
                      <span className="text-[11px] text-stone-500 block mb-1">المخرجات النهائية (Result Object):</span>
                      <pre className="bg-stone-900 p-3 rounded-xl text-[10px] text-emerald-400 font-mono overflow-x-auto text-left" dir="ltr">
                        {JSON.stringify(job.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {jobs.length === 0 && (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-500 space-y-2">
            <Layers className="w-8 h-8 mx-auto text-stone-700" />
            <p className="text-xs">طابور المعالجة فارغ حالياً، أرسل رسالة من محاكي المجموعات لتشغيله</p>
          </div>
        )}
      </div>
    </div>
  );
};
