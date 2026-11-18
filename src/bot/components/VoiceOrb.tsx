import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Square, Sparkles } from 'lucide-react';

interface VoiceOrbProps {
  onTranscript: (text: string) => void;
  isProcessing: boolean;
  isPlayingAudio: boolean;
  onStopAudio?: () => void;
  disabled?: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  onTranscript,
  isProcessing,
  isPlayingAudio,
  onStopAudio,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Check for Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInterimText(currentTranscript);
        if (event.results[event.results.length - 1].isFinal) {
          const finalVal = currentTranscript.trim();
          if (finalVal) {
            onTranscript(finalVal);
          }
          setIsListening(false);
          setInterimText('');
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('SpeechRecognition error:', err?.error);
        setIsListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [onTranscript]);

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Upload to server transcribe endpoint
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'speech.webm');
          const res = await fetch('/api/bot/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data?.text?.trim()) {
            onTranscript(data.text.trim());
          }
        } catch (e) {
          console.warn('Transcribe error:', e);
        } finally {
          setIsListening(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    } catch (err) {
      console.warn('Mic access error:', err);
      setIsListening(false);
    }
  };

  const handleToggleVoice = () => {
    if (disabled || isProcessing) return;

    if (isPlayingAudio && onStopAudio) {
      onStopAudio();
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Start listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Fallback
        startMediaRecorderFallback();
      }
    } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startMediaRecorderFallback();
    } else {
      alert('الميكروفون أو التعرف على الصوت غير مدعوم في متصفحك حالياً.');
    }
  };

  return (
    <div
      className="fixed z-40 flex items-center gap-3 transition-all duration-300"
      style={{
        left: '1.25rem', // STRICT REQUIREMENT: Physically on the LEFT
        bottom: '5.25rem', // Directly ABOVE the message composer bar
      }}
    >
      {/* Speech prompt popup when listening or processing */}
      {(isListening || isProcessing || interimText) && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-slate-100 text-xs px-3 py-1.5 rounded-full shadow-xl shadow-cyan-950/50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          {isProcessing ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>جاري المعالجة والتحضير...</span>
            </>
          ) : isListening ? (
            <>
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <span className="max-w-[180px] truncate text-cyan-200">
                {interimText || 'أنا أستمع إليك، تفضل...'}
              </span>
            </>
          ) : null}
        </div>
      )}

      {/* Main Glowing Neon Voice Button */}
      <div className="relative group">
        {/* Pulsing neon ripples when active */}
        {isListening && (
          <>
            <span className="absolute -inset-2.5 rounded-full bg-cyan-500/30 animate-ping duration-1000 pointer-events-none" />
            <span className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-emerald-400 opacity-75 blur-sm animate-pulse pointer-events-none" />
          </>
        )}

        {isPlayingAudio && (
          <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping duration-1500 pointer-events-none" />
        )}

        <button
          type="button"
          onClick={handleToggleVoice}
          disabled={disabled || isProcessing}
          aria-label={isListening ? 'إيقاف الاستماع' : isPlayingAudio ? 'إيقاف الصوت' : 'تحدث صوتياً'}
          title={isListening ? 'اضغط للإيقاف' : 'تحدث صوتياً مع المساعد'}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-cyan-500/40 ${
            isListening
              ? 'bg-gradient-to-tr from-red-600 via-pink-600 to-rose-500 text-white shadow-rose-500/50 scale-105 ring-2 ring-red-400'
              : isPlayingAudio
              ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-emerald-500/50 ring-2 ring-emerald-400 animate-pulse'
              : 'bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-cyan-600/40 hover:shadow-cyan-500/60 hover:scale-105 border border-cyan-300/30'
          }`}
        >
          {isListening ? (
            <Square className="w-5 h-5 fill-current animate-pulse" />
          ) : isPlayingAudio ? (
            <Volume2 className="w-6 h-6 animate-bounce" />
          ) : (
            <div className="relative">
              <Mic className="w-6 h-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
              {/* Subtle inner pulse indicator */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
