'use client';
import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  isRecording: boolean;
}

export default function Waveform({ analyser, isRecording }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    if (isRecording && analyser) {
      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        analyser.getByteTimeDomainData(buffer);
        canvas.width = canvas.offsetWidth * devicePixelRatio;
        canvas.height = canvas.offsetHeight * devicePixelRatio;
        const W = canvas.width,
          H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, 'rgba(245,166,35,0)');
        grad.addColorStop(0.5, 'rgba(245,166,35,0.9)');
        grad.addColorStop(1, 'rgba(245,166,35,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(245,166,35,0.4)';
        ctx.beginPath();

        const sliceW = W / buffer.length;
        let x = 0;
        buffer.forEach((val, i) => {
          const y = (val / 128) * (H / 2);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += sliceW;
        });
        ctx.stroke();
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
    } else {
      // Idle gentle sine
      let phase = 0;
      const idle = () => {
        canvas.width = canvas.offsetWidth * devicePixelRatio;
        canvas.height = canvas.offsetHeight * devicePixelRatio;
        const W = canvas.width,
          H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(107,104,120,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < W; x++) {
          const y = H / 2 + Math.sin((x / W) * Math.PI * 6 + phase) * 4;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        phase += 0.02;
        rafRef.current = requestAnimationFrame(idle);
      };
      idle();
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [isRecording, analyser]);

  return (
    <canvas
      ref={canvasRef}
      className='w-full h-28 rounded-xl bg-black/40 border border-[#232328] mb-6'
    />
  );
}
