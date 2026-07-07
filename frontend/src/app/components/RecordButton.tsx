'use client';

import { useEffect, useRef, useState } from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing?: boolean;
  onStart: () => void;
  onStop: () => void;
}

// ─── Mic Icon ─────────────────────────────────────────────
function MicIcon() {
  return (
    <svg
      width='28'
      height='28'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#0d0d0f'
      strokeWidth='2.2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <rect x='9' y='2' width='6' height='11' rx='3' />
      <path d='M5 10a7 7 0 0 0 14 0' />
      <line x1='12' y1='19' x2='12' y2='23' />
      <line x1='8' y1='23' x2='16' y2='23' />
    </svg>
  );
}

// ─── Stop Icon ────────────────────────────────────────────
function StopIcon() {
  return (
    <svg
      width='22'
      height='22'
      viewBox='0 0 24 24'
      fill='white'
      aria-hidden='true'
    >
      <rect x='4' y='4' width='16' height='16' rx='3' />
    </svg>
  );
}

// ─── Spinner Icon ─────────────────────────────────────────
function SpinnerIcon() {
  return (
    <svg
      width='22'
      height='22'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#0d0d0f'
      strokeWidth='2.5'
      strokeLinecap='round'
      aria-hidden='true'
      className='animate-spin'
    >
      <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' />
    </svg>
  );
}

// ─── Timer display ────────────────────────────────────────
function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Main Component ───────────────────────────────────────
export default function RecordButton({
  isRecording,
  isProcessing = false,
  onStart,
  onStop,
}: RecordButtonProps) {
  const time = useTimer(isRecording);

  const handleClick = () => {
    if (isProcessing) return;
    isRecording ? onStop() : onStart();
  };

  const label = isProcessing
    ? 'Processing…'
    : isRecording
      ? 'Stop recording'
      : 'Start recording';

  return (
    <div className='flex flex-col items-center gap-3 my-6'>
      {/* Timer */}
      <div
        className={`
          font-mono text-sm tracking-widest transition-all duration-300
          ${isRecording ? 'text-amber-400 opacity-100' : 'opacity-0 select-none'}
        `}
        aria-live='polite'
        aria-label={isRecording ? `Recording time: ${time}` : undefined}
      >
        {time}
      </div>

      {/* Button row */}
      <div className='flex items-center gap-5'>
        {/* Side hint — left */}
        <span
          className={`
            font-mono text-xs text-[#6b6878] tracking-wider transition-opacity duration-300
            ${isRecording ? 'opacity-100' : 'opacity-0'}
          `}
          aria-hidden='true'
        >
          REC
        </span>

        {/* Main button */}
        <button
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={label}
          className={`
            relative flex items-center justify-center
            w-[72px] h-[72px] rounded-full
            transition-transform duration-150 active:scale-95
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4
            focus-visible:outline-amber-400
            disabled:cursor-not-allowed disabled:opacity-60
            ${
              isRecording
                ? 'bg-red-500 shadow-[0_0_0_0_rgba(239,68,68,0.4)]'
                : isProcessing
                  ? 'bg-[#232328]'
                  : 'bg-amber-400 hover:scale-105 hover:bg-amber-300'
            }
          `}
          style={
            isRecording
              ? { animation: 'pulseRing 1.5s ease-out infinite' }
              : undefined
          }
        >
          {isProcessing ? (
            <SpinnerIcon />
          ) : isRecording ? (
            <StopIcon />
          ) : (
            <MicIcon />
          )}

          {/* Pulse rings (recording state) */}
          {isRecording && (
            <>
              <span className='absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping' />
              <span
                className='absolute inset-[-6px] rounded-full border border-red-400 opacity-20'
                style={{ animation: 'expandRing 1.5s ease-out infinite 0.3s' }}
              />
            </>
          )}
        </button>

        {/* Side hint — right */}
        <span
          className={`
            font-mono text-xs text-[#6b6878] tracking-wider transition-opacity duration-300
            ${isRecording ? 'opacity-100' : 'opacity-0'}
          `}
          aria-hidden='true'
        >
          LIVE
        </span>
      </div>

      {/* Status label */}
      <p className='font-mono text-xs text-[#6b6878] tracking-wide mt-1'>
        {isProcessing
          ? 'Transcribing audio…'
          : isRecording
            ? 'Tap to stop'
            : 'Tap to record'}
      </p>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 20px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes expandRing {
          0%   { transform: scale(1); opacity: 0.2; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
