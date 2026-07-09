'use client';

import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────
export type OutputStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'ready'
  | 'summarizing'
  | 'done';

interface SummaryOutputProps {
  transcript: string;
  summary: string;
  status: OutputStatus;
  onSummarize: () => void;
  onClear?: () => void;
}

// ─── Skeleton loader ──────────────────────────────────────
function Skeleton({ lines = 3 }: { lines?: number }) {
  const widths = ['90%', '70%', '80%', '60%', '75%'];
  return (
    <div className='flex flex-col gap-2 mt-1' aria-hidden='true'>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className='h-2.5 rounded'
          style={{
            width: widths[i % widths.length],
            background:
              'linear-gradient(90deg, #232328 25%, #2a2a35 50%, #232328 75%)',
            backgroundSize: '200% 100%',
            animation: `shimmer 1.4s infinite ${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={handleCopy}
      className='
        flex items-center gap-1.5 px-3 h-8 rounded-md
        border border-[#232328] bg-transparent
        font-mono text-[11px] tracking-wide text-[#6b6878]
        hover:border-amber-400 hover:text-amber-400
        transition-colors duration-200 focus-visible:outline-1 focus-visible:outline-amber-400
      '
      aria-label='Copy summary to clipboard'
    >
      {copied ? (
        <>
          <CheckIcon />
          Copied
        </>
      ) : (
        <>
          <CopyIcon />
          Copy
        </>
      )}
    </button>
  );
}

// ─── Export button ────────────────────────────────────────
function ExportButton({
  transcript,
  summary,
}: {
  transcript: string;
  summary: string;
}) {
  const handleExport = () => {
    const content = [
      'ECHO.AI — Speech Summary',
      '─'.repeat(40),
      '',
      'TRANSCRIPT:',
      transcript,
      '',
      'SUMMARY:',
      summary,
      '',
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echo-summary-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className='
        flex items-center gap-1.5 px-3 h-8 rounded-md
        bg-amber-400 border border-amber-400
        font-mono text-[11px] tracking-wide font-semibold text-[#0d0d0f]
        hover:bg-amber-300 hover:border-amber-300
        transition-colors duration-200
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-200
      '
      aria-label='Export summary as text file'
    >
      <DownloadIcon />
      Export .txt
    </button>
  );
}

// ─── Panel component ──────────────────────────────────────
interface PanelProps {
  label: string;
  tag?: string;
  isLoading: boolean;
  hasContent: boolean;
  placeholder: string;
  children: React.ReactNode;
}

function Panel({
  label,
  tag,
  isLoading,
  hasContent,
  placeholder,
  children,
}: PanelProps) {
  return (
    <div className='bg-[#0d0d0f] border border-[#232328] rounded-xl p-4 min-h-[128px] flex flex-col'>
      {/* Label row */}
      <div className='flex items-center gap-2 mb-3'>
        <span className='font-mono text-[10px] tracking-[0.2em] uppercase text-[#6b6878]'>
          {label}
        </span>
        {tag && (
          <span className='font-mono text-[9px] tracking-wider bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded'>
            {tag}
          </span>
        )}
      </div>

      {/* Content */}
      <div className='flex-1'>
        {isLoading ? (
          <Skeleton lines={4} />
        ) : hasContent ? (
          children
        ) : (
          <p className='font-mono text-[12px] text-[#6b6878] leading-relaxed'>
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function SummaryOutput({
  transcript,
  summary,
  status,
  onSummarize,
  onClear,
}: SummaryOutputProps) {
  const isTranscriptLoading = status === 'processing';
  const isSummaryLoading = status === 'summarizing';
  const hasTranscript = transcript.length > 0;
  const hasSummary = summary.length > 0;
  const showActions = status === 'ready' || status === 'done';
  const showSummarizeBtn = status === 'ready';
  const showExportRow = status === 'done';

  return (
    <div>
      {/* Divider */}
      <div className='h-px bg-[#232328] my-6' />

      {/* Output panels */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4'>
        {/* Transcript */}
        <Panel
          label='Transcript'
          isLoading={isTranscriptLoading}
          hasContent={hasTranscript}
          placeholder='Your transcript will appear here once you stop recording.'
        >
          <p className='font-mono text-[12px] text-[#f0ede8] leading-relaxed whitespace-pre-wrap'>
            {transcript}
          </p>
        </Panel>

        {/* Summary */}
        <Panel
          label='Summary'
          tag='AI'
          isLoading={isSummaryLoading}
          hasContent={hasSummary}
          placeholder='AI summary appears here after you click Summarize.'
        >
          {/* Render bullet lines */}
          <ul className='space-y-2'>
            {summary
              .split('\n')
              .filter(Boolean)
              .map((line, i) => (
                <li
                  key={i}
                  className='font-mono text-[12px] text-[#f0ede8] leading-relaxed flex gap-2'
                >
                  <span className='text-amber-400 shrink-0 mt-0.5'>•</span>
                  <span>{line.replace(/^[•\-]\s*/, '')}</span>
                </li>
              ))}
          </ul>
        </Panel>
      </div>

      {/* Action rows */}
      {showActions && (
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          {/* Left: clear */}
          {onClear && (
            <button
              onClick={onClear}
              className='
                flex items-center gap-1.5 px-3 h-8 rounded-md
                border border-[#232328] bg-transparent
                font-mono text-[11px] tracking-wide text-[#6b6878]
                hover:border-red-400/50 hover:text-red-400
                transition-colors duration-200
              '
              aria-label='Clear all output'
            >
              <TrashIcon />
              Clear
            </button>
          )}

          {/* Right: summarize / copy / export */}
          <div className='flex items-center gap-2 ml-auto'>
            {showSummarizeBtn && (
              <button
                onClick={onSummarize}
                className='
                  flex items-center gap-1.5 px-4 h-8 rounded-md
                  border border-amber-400/40 bg-amber-400/10
                  font-mono text-[11px] tracking-wide text-amber-400
                  hover:bg-amber-400/20 hover:border-amber-400
                  transition-colors duration-200
                  focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-400
                '
                aria-label='Generate AI summary'
              >
                <SparkleIcon />
                Summarize
              </button>
            )}

            {showExportRow && (
              <>
                <CopyButton text={summary} />
                <ExportButton transcript={transcript} summary={summary} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline SVG icons ─────────────────────────────────────
function CopyIcon() {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='9' y='9' width='13' height='13' rx='2' />
      <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='20 6 9 17 4 12' />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
      <polyline points='7 10 12 15 17 10' />
      <line x1='12' y1='15' x2='12' y2='3' />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v6M14 11v6' />
      <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z' />
    </svg>
  );
}
