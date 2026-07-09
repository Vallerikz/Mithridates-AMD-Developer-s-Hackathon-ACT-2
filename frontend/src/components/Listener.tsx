"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ListenerProps {
  /** Callback fired every 5 seconds with the raw audio ArrayBuffer */
  onChunk: (buffer: ArrayBuffer) => void;
  /** Callback fired when VAD detects absolute silence (e.g. video paused) */
  onSilence: () => void;
  /** Callback fired immediately when the stream is successfully established, returning the captured tab name */
  onStreamStart: (streamName?: string) => void;
  /** Callback fired when the user manually stops or Chrome revokes access */
  onStreamStop: () => void;
}

/**
 * A highly specialized microphone/tab audio capture component.
 * Uses MediaRecorder to capture audio, integrates Web Audio API for Voice Activity Detection (VAD),
 * and safely slices it into exactly 5-second `ArrayBuffer` chunks.
 */
export function Listener({ onChunk, onSilence, onStreamStart, onStreamStop }: ListenerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadAnimationRef = useRef<number | null>(null);

  /**
   * Safely dismounts the recorder, VAD engine, and terminates all hardware tracks.
   * Reads liveness from the refs rather than `isRecording`: Chrome's native
   * "Stop sharing" fires through a handler captured while `isRecording` was still false.
   */
  const stopListening = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (vadAnimationRef.current) {
      cancelAnimationFrame(vadAnimationRef.current);
      vadAnimationRef.current = null;
    }
    setIsRecording(false);
    onStreamStop();
  }, [onStreamStop]);

  /**
   * Initializes the native browser Screen Share API, extracts the audio track,
   * mounts the VAD engine, and starts the MediaRecorder chunking engine.
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true
      });
      
      const videoTrack = stream.getVideoTracks()[0];

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error("No audio shared. Please check 'Share tab audio' in the popup.");
      }

      onStreamStart(videoTrack.label);

      // Isolate audio track to prevent heavy video data transmission
      const audioOnlyStream = new MediaStream([audioTracks[0]]);
      streamRef.current = stream;

      // Handle native "Stop Sharing" events from Chrome's UI overlay
      stream.getVideoTracks()[0].onended = () => {
        stopListening();
      };

      // --- VAD (Voice Activity Detection) Engine ---
      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(audioOnlyStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxAmplitude = 0;

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const currentMax = Math.max(...Array.from(dataArray));
        if (currentMax > maxAmplitude) {
          maxAmplitude = currentMax;
        }
        vadAnimationRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();
      // --------------------------------------------

      const mediaRecorder = new MediaRecorder(audioOnlyStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          // VAD Gatekeeper: Only send chunk if volume spiked above threshold (2 out of 255)
          if (maxAmplitude > 2) {
            const arrayBuffer = await e.data.arrayBuffer();
            onChunk(arrayBuffer);
          } else {
            console.log("🔇 VAD: Silence detected (Video Paused). Chunk dropped to save tokens.");
            onSilence();
          }
          // Reset amplitude tracker for the next 5-second chunk window
          maxAmplitude = 0;
        }
      };

      // Slice the incoming audio stream into perfectly sized chunks
      mediaRecorder.start(5000);
      setIsRecording(true);

    } catch (err: unknown) {
      console.error("Screen share access denied or failed", err);
      const error = err instanceof Error ? err : null;
      if (error?.name !== "NotAllowedError") {
        setError(error?.message || "Failed to capture stream.");
      }
    }
  }, [onChunk, onSilence, onStreamStart, stopListening]);

  // Mirror the latest stopListening so the unmount cleanup never runs a stale one,
  // and never re-fires just because a parent callback changed identity.
  // Assigning happens in an effect (post-render), not during render, per react-hooks/refs.
  const stopListeningRef = useRef(stopListening);
  useEffect(() => {
    stopListeningRef.current = stopListening;
  });

  // Dismount safety cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopListeningRef.current();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 relative z-50">
      <button
        onClick={isRecording ? stopListening : startListening}
        className={`group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold tracking-wide transition-all duration-300 ${
          isRecording 
            ? "bg-white border-rose-200 text-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.1)] hover:border-rose-300"
            : "bg-black text-white hover:bg-slate-900 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
        }`}
      >
        {isRecording && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
        )}
        
        {isRecording ? "Stop Overlay" : "Start Live Fact-Check"}
      </button>

      {error && (
        <div className="bg-rose-50 text-rose-500 px-4 py-2 rounded-lg text-sm font-medium tracking-wide shadow-sm border border-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}
