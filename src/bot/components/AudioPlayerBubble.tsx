import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

interface AudioPlayerBubbleProps {
  audioSrc: string; // url or base64
  onPlayStateChange?: (isPlaying: boolean) => void;
  speed?: number;
}

export const AudioPlayerBubble: React.FC<AudioPlayerBubbleProps> = ({
  audioSrc,
  onPlayStateChange,
  speed = 1.0,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        })
        .catch((e) => console.warn('Audio play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (audio.duration) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    onPlayStateChange?.(false);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 p-2.5 px-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/60 shadow-lg my-1.5 w-full max-w-sm text-slate-100">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-900/40 hover:scale-105 active:scale-95 transition-all"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current mr-0.5" />}
      </button>

      {/* Animated Waveform Progress */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-cyan-400">
            <Volume2 className="w-3 h-3" />
            <span>رسالة صوتية</span>
          </span>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Progress Bar with mini waves */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration) {
              audioRef.current.currentTime = clickPos * duration;
            }
          }}
          className="relative h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer group"
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
