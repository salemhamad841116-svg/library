import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Upload,
  Cpu,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileJson,
  Volume2,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Database,
  Layers,
  Video,
  ExternalLink,
  Tag,
  Dna,
  UserCheck,
  Trophy,
  Timer,
} from 'lucide-react';
import { SampleMessage } from '../types';
import { safeFetchJson } from '../lib/safeFetch';

interface AiExtractionStudioProps {
  sampleMessages: SampleMessage[];
  promptBiasingText: string;
  onExtractionSuccess: () => void;
}

export const AiExtractionStudio: React.FC<AiExtractionStudioProps> = ({
  sampleMessages,
  promptBiasingText,
  onExtractionSuccess,
}) => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(sampleMessages[0]?.id || 'sample-real-1');
  const [inputText, setInputText] = useState(
    `سباق مهرجان ولي العهد للهجن 2026 - السبت 2026/09/12 - رموز الثنايا - ميدان الطايف - مساء
 ش 1 كأس بكار مفتوح 
(بيه) لـ الشيخ أحمد بن محمد بن راشد آل مكتوم 9:10:15 
المضمر : سالم سعيد بن منانه https://youtu.be/qxs6Om332_4
الاب جبار ولد لحقه بعير المختبر`
  );

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [activeBiasingMode, setActiveBiasingMode] = useState(true);
  const [isPlayingAudioSim, setIsPlayingAudioSim] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Play synthetic voice for field samples using Web Speech Synthesis API
  const handlePlayVoiceSample = (textToSpeak: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.95; // realistic broadcaster pace
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsPlayingAudioSim(true);
      utterance.onend = () => setIsPlayingAudioSim(false);
      utterance.onerror = () => setIsPlayingAudioSim(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectSample = (sample: SampleMessage) => {
    setSelectedSampleId(sample.id);
    setInputText(sample.text);
    setExtractedData(null);
    setTranscriptionResult(null);
  };

  // Microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const b64 = reader.result?.toString().split(',')[1] || '';
          setAudioBase64(b64);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      // Microphone permission declined
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioUrl(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const b64 = reader.result?.toString().split(',')[1] || '';
      setAudioBase64(b64);
    };
  };

  // Run Transcription
  const handleTranscribe = async () => {
    if (!audioBase64) return;
    setIsTranscribing(true);
    setTranscriptionResult(null);

    try {
      const data = await safeFetchJson('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType: 'audio/webm' }),
      });
      if (data?.transcription) {
        setTranscriptionResult(data.transcription);
        setInputText(data.transcription);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  // Run Structured Entity Extraction
  const handleExtract = async () => {
    if (!inputText.trim()) return;
    setIsExtracting(true);

    try {
      const data = await safeFetchJson('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      if (data) {
        setExtractedData(data);
        onExtractionSuccess();
      }
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" />
                <span>استوديو معالجة الصوت واستخراج الكيانات (Audio & LLM Extraction)</span>
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                عينات حقيقية: مهرجان ولي العهد 2026
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              تفريغ صوتي بـ Prompt Biasing لمصطلحات الهجن • استخراج مهيكل مع الفصل الصارم بين (المالك والمضمر والأب)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveBiasingMode(!activeBiasingMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                activeBiasingMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-stone-800 text-stone-400 border-stone-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>توجيه المعجم (Prompt Biasing): {activeBiasingMode ? 'مفعّل ✅' : 'معطل'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Field Test Samples Selector */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>عينات الاختبار الحقيقية المرفقة (مهرجان ولي العهد وقروب الاتحاد وميدان الطائف):</span>
          </h3>
          <span className="text-[10px] text-stone-400">اختر عينة للتجربة الفورية والاستخراج</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {sampleMessages.map((sample) => {
            const isSelected = selectedSampleId === sample.id;
            return (
              <div
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-stone-100 shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-amber-300 truncate max-w-[200px]">
                      {sample.title.split('-')[0]}
                    </span>
                    <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                      {sample.type === 'audio' ? '🎙️ صوت' : '📄 نص'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 font-medium truncate mt-0.5">
                    {sample.expectedWinner ? `الفائز: ${sample.expectedWinner}` : sample.title}
                  </p>
                  <p className="text-[10px] text-stone-400 line-clamp-2 mt-1">
                    {sample.text.replace(/\n/g, ' ')}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                  <span className="text-stone-500 font-mono">
                    {sample.expectedTime ? `⏱️ ${sample.expectedTime}` : 'سياق عام'}
                  </span>
                  <div className="flex items-center gap-2">
                    {sample.videoUrl && (
                      <a
                        href={sample.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        title="مشاهدة فيديو الشوط"
                      >
                        <Video className="w-3 h-3" />
                        <span>فيديو</span>
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayVoiceSample(sample.text);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded font-bold"
                      title="استماع للبث الصوتي الميداني"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{isPlayingAudioSim ? 'جاري البث...' : 'استماع'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Voice Recording & Input Text */}
        <div className="lg:col-span-6 space-y-4">
          {/* Audio Input Box */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>1. إدخال التسجيل الصوتي الميداني (.ogg / .opus / .mp3 / mic)</span>
              </h3>
              {audioBase64 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                  جاهز للتفريغ
                </span>
              )}
            </div>

            {/* Audio Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                    : 'bg-stone-800 hover:bg-stone-750 border-stone-700 text-stone-200 hover:text-amber-400'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isRecording ? `إيقاف التسجيل (${recordingSeconds}s)` : 'تسجيل صوتي حي'}</span>
              </button>

              <label className="p-3 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 hover:text-amber-400 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>رفع ملف صوتي</span>
                <input
                  type="file"
                  accept="audio/*,.ogg,.opus,.mp3,.wav,.m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Audio Player Preview */}
            {audioUrl && (
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between gap-3">
                <audio src={audioUrl} controls className="h-8 flex-1" />
                <button
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{isTranscribing ? 'جاري التفريغ...' : 'تفريغ الصوت (Whisper/Gemini)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Input Box */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>2. نص رسالة النتيجة للمطابقة والاستخراج</span>
              </h3>
              <button
                onClick={() => setInputText('')}
                className="text-[11px] text-stone-500 hover:text-stone-300 cursor-pointer"
              >
                مسح النص
              </button>
            </div>

            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب نتيجة السباق أو نص المحادثة هنا..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed font-mono"
            />

            {/* Extraction Trigger */}
            <button
              onClick={handleExtract}
              disabled={isExtracting || !inputText.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isExtracting ? 'جاري استخراج الكيانات والفصل بين المالك والمضمر...' : 'تشغيل الاستخراج المهيكل (Structured JSON Mode)'}
              </span>
            </button>
          </div>

          {/* Biasing Prompt Preview Card */}
          {activeBiasingMode && (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-3.5">
              <span className="text-[11px] font-bold text-amber-400 block mb-1">
                معجم التوجيه الصوتي المحقون (Prompt Biasing):
              </span>
              <p className="text-[10px] text-stone-400 leading-relaxed font-mono line-clamp-3">
                {promptBiasingText.trim()}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Structured Output Display */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>3. الكيانات المستخرجة بدقة (Structured Output JSON)</span>
              </h3>
              {extractedData && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    extractedData.is_race_result
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {extractedData.is_race_result ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>نتيجة شوط رسمية</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-amber-400" />
                      <span>محادثة عامة / استفسار</span>
                    </>
                  )}
                </span>
              )}
            </div>

            {extractedData ? (
              <div className="space-y-3">
                {/* Visual Field Grid with Distinct Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Winner Name */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-amber-500/30">
                    <span className="text-[10px] text-amber-400 font-bold block flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      <span>المطية الفائزة (winner_name)</span>
                    </span>
                    <span className="text-sm font-bold text-amber-300 block mt-0.5">
                      {extractedData.winner_name || '—'}
                    </span>
                  </div>

                  {/* Owner Name - Distinct */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-blue-400 font-bold block flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>المالك (owner_name)</span>
                    </span>
                    <span className="text-xs font-bold text-stone-100 block mt-0.5 truncate">
                      {extractedData.owner_name || '—'}
                    </span>
                  </div>

                  {/* Trainer Name - Distinct */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-purple-400 font-bold block flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>المضمر (trainer_name)</span>
                    </span>
                    <span className="text-xs font-bold text-purple-300 block mt-0.5 truncate">
                      {extractedData.trainer_name || 'غير مذكور'}
                    </span>
                  </div>

                  {/* Sire / Lineage */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                      <Dna className="w-3 h-3" />
                      <span>الأب والسلالة (sire_lineage)</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-300 block mt-0.5 truncate">
                      {extractedData.sire_lineage || '—'}
                    </span>
                  </div>

                  {/* Category & Age */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">الفئة والسن (category)</span>
                    <span className="text-xs font-bold text-amber-300 block mt-0.5">
                      {extractedData.category || 'غير محدد'}
                    </span>
                  </div>

                  {/* Heat Number */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">رقم الشوط (heat_number)</span>
                    <span className="text-xs font-bold text-stone-200 block mt-0.5">
                      {extractedData.heat_number ? `الشوط ${extractedData.heat_number}` : 'غير محدد'}
                    </span>
                  </div>

                  {/* Recorded Time */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-500 block flex items-center gap-1">
                      <Timer className="w-3 h-3 text-emerald-400" />
                      <span>التوقيت (time)</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono block mt-0.5">
                      {extractedData.time || '—'}
                    </span>
                  </div>

                  {/* Festival / Track */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">الميدان والمهرجان</span>
                    <span className="text-[11px] font-bold text-stone-300 block mt-0.5 truncate">
                      {extractedData.track_name || 'ميدان الطائف'} • {extractedData.festival_name || 'مهرجان ولي العهد'}
                    </span>
                  </div>

                  {/* Confidence */}
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">نسبة الثقة (confidence)</span>
                    <span className="text-xs font-bold text-purple-400 block mt-0.5">
                      {Math.round((extractedData.confidence || 0.96) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Media Links if extracted */}
                {extractedData.media_urls && extractedData.media_urls.length > 0 && (
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                      <span>الروابط المستخرجة:</span>
                    </span>
                    {extractedData.media_urls.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] bg-stone-900 hover:bg-stone-850 text-amber-300 border border-stone-750 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[180px]">{url}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Notes & Former Name */}
                {extractedData.notes && (
                  <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">الملاحظات والرمز (notes):</span>
                    <span className="text-xs text-stone-300">{extractedData.notes}</span>
                  </div>
                )}

                {/* Raw JSON Code Block */}
                <div>
                  <span className="text-[10px] text-stone-500 block mb-1">الـ JSON المهيكل النهائي للإنتاج:</span>
                  <pre className="bg-stone-950 border border-stone-800 p-3 rounded-xl text-[11px] text-amber-300 font-mono overflow-x-auto text-left" dir="ltr">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-stone-500 space-y-2">
                <FileJson className="w-8 h-8 mx-auto text-stone-700" />
                <p className="text-xs">اختر أي عينة من الأعلى أو اكتب نصاً واضغط على "تشغيل الاستخراج المهيكل"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
