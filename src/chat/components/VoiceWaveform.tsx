import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  /** Whether the overlay is visible and animating. */
  active: boolean;
  /** Live mic level source (0..1). When absent, a synthetic "speaking" level is used. */
  levelRef?: React.MutableRefObject<number>;
  /** 'mic' = driven by levelRef, 'speaking' / 'thinking' = synthetic motion. */
  mode: 'mic' | 'speaking' | 'thinking';
}

/**
 * Dynamic AI voice overlay: neon mirrored bars + flowing sine lines drawn on a canvas,
 * extending horizontally from the talk button to the right edge.
 * Colors: violet → pink → blue/cyan → gold.
 */
export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ active, levelRef, mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const m = modeRef.current;

      // Target level
      let target: number;
      if (m === 'mic') {
        target = levelRef?.current ?? 0;
      } else if (m === 'speaking') {
        target = 0.45 + 0.3 * Math.abs(Math.sin(t * 2.7)) * Math.abs(Math.sin(t * 1.3 + 0.6));
      } else {
        target = 0.18 + 0.08 * Math.sin(t * 2);
      }
      smoothRef.current = smoothRef.current * 0.82 + target * 0.18;
      const level = smoothRef.current;

      ctx.clearRect(0, 0, width, height);
      const mid = height / 2;

      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#8a2be2');
      grad.addColorStop(0.3, '#ff3fd8');
      grad.addColorStop(0.55, '#3b82ff');
      grad.addColorStop(0.75, '#00f0ff');
      grad.addColorStop(1, '#ffd700');

      // 1) Mirrored neon bars
      const gap = 5;
      const barW = 2.6;
      const count = Math.floor(width / gap);
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(255, 63, 216, 0.85)';
      ctx.shadowBlur = 12;
      for (let i = 0; i < count; i++) {
        const p = i / Math.max(1, count - 1);
        // Strong near the button, tapering toward the right edge
        const env = Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.05 + 0.08)), 0.7) * (1 - p * 0.35);
        const noise =
          Math.abs(Math.sin(i * 0.37 + t * 7.5)) * 0.5 +
          Math.abs(Math.sin(i * 0.91 - t * 10.3)) * 0.3 +
          Math.abs(Math.sin(i * 0.13 + t * 2.4)) * 0.2;
        const h = Math.max(2, (0.08 + level * 0.92) * env * noise * height * 0.95);
        const x = i * gap;
        const y = mid - h / 2;
        const r = barW / 2;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, barW, h, r);
        } else {
          ctx.rect(x, y, barW, h);
        }
        ctx.fill();
      }

      // 2) Flowing sine ribbons
      ctx.shadowBlur = 16;
      const ribbons = [
        { color: 'rgba(0, 240, 255, 0.85)', freq: 2.2, speed: 2.6, amp: 0.34, phase: 0 },
        { color: 'rgba(255, 215, 0, 0.75)', freq: 3.1, speed: -3.4, amp: 0.26, phase: 1.3 },
        { color: 'rgba(255, 63, 216, 0.7)', freq: 1.6, speed: 1.8, amp: 0.4, phase: 2.4 },
      ];
      for (const rb of ribbons) {
        ctx.beginPath();
        ctx.strokeStyle = rb.color;
        ctx.shadowColor = rb.color;
        ctx.lineWidth = 1.6;
        for (let x = 0; x <= width; x += 3) {
          const p = x / width;
          const env = Math.sin(Math.PI * p) * (1 - p * 0.3);
          const y =
            mid +
            Math.sin(p * Math.PI * 2 * rb.freq + t * rb.speed + rb.phase) *
              height *
              rb.amp *
              (0.15 + level * 0.85) *
              env;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, levelRef]);

  return (
    <div className={`gc-wave ${active ? 'visible' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
};
