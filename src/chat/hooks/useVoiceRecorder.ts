import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecordedAudio {
  base64: string;
  mimeType: string;
  durationMs: number;
}

/**
 * Microphone capture with a live volume meter.
 * - MediaRecorder collects the audio for server-side transcription.
 * - An AnalyserNode exposes a smoothed 0..1 level (levelRef) that drives the waveform.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    levelRef.current = 0;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('المتصفح لا يدعم تسجيل الصوت.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Live level meter
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const target = Math.min(1, rms * 4.5);
        levelRef.current = levelRef.current * 0.75 + target * 0.25;
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Recorder
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = preferred.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setIsRecording(true);
      return true;
    } catch (err) {
      console.warn('Mic access error:', err);
      setError('تعذّر الوصول إلى الميكروفون. يرجى السماح بالإذن.');
      cleanup();
      return false;
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<RecordedAudio | null> => {
    const recorder = recorderRef.current;
    setIsRecording(false);
    if (!recorder || recorder.state === 'inactive') {
      cleanup();
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const durationMs = Date.now() - startedAtRef.current;
        const mimeType = (recorder.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recorderRef.current = null;
        cleanup();

        if (blob.size < 1200 || durationMs < 400) {
          resolve(null);
          return;
        }
        const base64 = await blobToBase64(blob);
        resolve({ base64, mimeType, durationMs });
      };
      recorder.stop();
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    setIsRecording(false);
    cleanup();
  }, [cleanup]);

  return { isRecording, error, levelRef, start, stop, cancel };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
