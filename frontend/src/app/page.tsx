'use client';
import { useState, useRef } from 'react';
import Waveform from './components/Waveform';
import RecordButton from './components/RecordButton';
import SummaryOutput from './components/SummaryOutput';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'recording' | 'processing' | 'done'
  >('idle');
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setStatus('recording');
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    analyserRef.current = null;
    setIsRecording(false);
    setStatus('processing');
    // → call your Whisper STT here, then setTranscript()
    simulateTranscript();
  };

  const simulateTranscript = () => {
    setTimeout(() => {
      setTranscript(
        'Today we discussed the Q3 roadmap and mobile-first priorities...',
      );
      setStatus('done');
    }, 1500);
  };

  const handleSummarize = async () => {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setSummary(data.summary);
  };

  return (
    <main className='min-h-screen bg-[#0d0d0f] text-white flex flex-col items-center px-6 py-16'>
      <h1 className='text-5xl font-extrabold tracking-tight mb-2'>
        Record. <span className='text-amber-400'>Understand.</span>
      </h1>
      <p className='text-gray-500 font-mono text-sm mb-12'>
        Speak freely — Echo turns your voice into clear summaries.
      </p>

      <div className='w-full max-w-2xl bg-[#141418] border border-[#232328] rounded-2xl p-8'>
        <Waveform analyser={analyserRef.current} isRecording={isRecording} />

        <RecordButton
          isRecording={isRecording}
          onStart={startRecording}
          onStop={stopRecording}
        />

        <SummaryOutput
          transcript={transcript}
          summary={summary}
          status={status}
          onSummarize={handleSummarize}
        />
      </div>
    </main>
  );
}
