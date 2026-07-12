"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Listener } from "../components/Listener";
import { Feed } from "../components/Feed";
import { useStream } from "../hooks/useStream";
import { useDocumentPip } from "../hooks/useDocumentPip";
import { SummaryCard } from "../components/SummaryCard";
import { AnimatedGradient } from "@/components/AnimatedGradient";
import { PremiumScrollSection } from "@/components/PremiumScrollSection";
import { TutorialScrollSection } from "@/components/TutorialScrollSection";

/**
 * The main application page.
 * Manages the layout state and teleports the Fact-Check Feed into the PiP window when active.
 * When PiP is unsupported or the user closed the overlay, the same feed renders inline instead.
 */
export default function Home() {
  const { events, sendAudioChunk, startStream, chunksSent, engineError, resetStream, fetchSessionSummary } = useStream();
  const { pipWindow, isPipSupported, openPipOverlay, closePipOverlay } = useDocumentPip();

  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isEnginePaused, setIsEnginePaused] = useState(false);
  const [isVadSilent, setIsVadSilent] = useState(false);
  const [streamName, setStreamName] = useState<string | null>(null);

  // Summary UI State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);

  // Ref to hold the synchronous pause state to prevent stale closures in the MediaRecorder callback
  const isEnginePausedRef = useRef(false);

  const toggleEngine = () => {
    setIsEnginePaused((prev) => {
      isEnginePausedRef.current = !prev;
      return !prev;
    });
  };

  /**
   * Handles incoming 5-second audio chunks from the Listener component.
   */
  const handleChunk = (buffer: ArrayBuffer) => {
    if (isEnginePausedRef.current) return; // Drop chunks if user paused the engine
    setIsVadSilent(false);
    sendAudioChunk(buffer);
  };

  /**
   * Fired when VAD drops a chunk due to absolute silence (e.g. video paused).
   */
  const handleSilence = () => {
    if (isEnginePausedRef.current) return;
    setIsVadSilent(true);
  };

  const handleStreamStart = useCallback(async (name?: string) => {
    if (name) {
      setStreamName(name.split(' - ')[0].replace('screen:', ''));
    }
    setIsStreamActive(true);
    startStream();
    // A failed or unsupported PiP request is not fatal: the feed falls back to the page.
    await openPipOverlay();
  }, [openPipOverlay, startStream]);

  const handleStreamStop = useCallback(() => {
    // Clean up the session completely
    setIsStreamActive(false);
    setStreamName(null);
    setIsEnginePaused(false);
    isEnginePausedRef.current = false;
    setIsVadSilent(false);
    setSummaryText(null);
    resetStream();
    closePipOverlay();
  }, [resetStream, closePipOverlay]);

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    const summary = await fetchSessionSummary();
    setSummaryText(summary);
    setIsSummarizing(false);
  };

  /**
   * The overlay body, rendered either inside the PiP window or inline on the page.
   * Built as a plain JSX value rather than a nested component so that moving it
   * between the two containers never remounts the Feed and drops its events.
   */
  const renderOverlay = (inPip: boolean) => (
    <div className={`flex flex-col items-center w-full bg-white ${inPip ? "min-h-screen p-6" : ""}`}>

      <div className="w-full mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-black">TruLens Overlay</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleEngine}
            className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border transition-colors active:scale-95 ${isEnginePaused
                ? "bg-slate-900 text-white border-slate-900 hover:bg-black"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            {isEnginePaused ? "Start Stream" : "Stop Stream"}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Transmissions: {chunksSent}
          </span>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isEnginePaused ? '' : 'animate-ping bg-slate-900'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isEnginePaused ? 'bg-slate-300' : 'bg-slate-900'}`}></span>
            </span>
            <span className={`text-xs font-bold uppercase tracking-widest ${isEnginePaused ? 'text-slate-400' : 'text-slate-900'}`}>
              {isEnginePaused ? "Stopped" : "Live"}
            </span>
          </div>
        </div>
      </div>

      <div className={`w-full relative ${inPip ? "pb-32" : ""}`}>
        {engineError && (
          <div className="mb-4 bg-rose-50 text-rose-500 px-4 py-2 rounded-lg text-sm font-medium tracking-wide shadow-sm border border-rose-100">
            {engineError}
          </div>
        )}
        <Feed events={events} isEnginePaused={isEnginePaused} chunksSent={chunksSent} isVadSilent={isVadSilent} streamName={streamName} />

        {/* The Summary Card renders right after the feed if available */}
        <div className="mt-8">
          <SummaryCard summary={summaryText} isLoading={isSummarizing} />
        </div>
      </div>

      {/* Floating in the PiP window, but part of the flow when rendered inline */}
      <div className={inPip ? "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto" : "mt-8 flex justify-center"}>
        <button
          onClick={handleGenerateSummary}
          disabled={!isEnginePaused || isSummarizing}
          className={`flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-full shadow-lg border ${
            !isEnginePaused
              ? "bg-white text-slate-300 cursor-not-allowed border-slate-200 shadow-sm"
              : "bg-slate-900 text-white hover:bg-black border-slate-900 hover:shadow-xl active:scale-95"
          }`}
        >
          {isSummarizing ? "Processing..." : summaryText ? "Update Summary" : "Generate Summary"}
        </button>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-white selection:bg-slate-100">

      {/* Top Navbar */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <div className="text-xl font-bold tracking-tighter text-black flex items-center gap-2">
          TruLens.
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 relative flex flex-col items-center w-full ${isStreamActive ? 'pt-32 pb-24' : ''}`}>

        {/* Master Wrapper to keep Hero and Button pinned during the first scroll section, but scroll away afterwards */}
        <div className={`w-full ${!isStreamActive ? 'relative z-40 mb-24' : ''}`}>

          {/* Sticky Header Wrapper */}
          <div className={`w-full flex flex-col items-center z-40 ${!isStreamActive ? 'sticky top-0 h-screen pointer-events-none pt-32' : ''}`}>

            {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-24 space-y-4 max-w-3xl mx-auto px-6 pointer-events-auto"
        >
          <h1 className="text-5xl font-bold tracking-tight text-black sm:text-6xl">
            Truth in Real-Time.
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Connect any live audio stream and let our AI engine instantly detect and verify political claims before they become misinformation.
          </p>
        </motion.div>

          {/* Action Area (Listener Button) */}
          <div className="w-full flex justify-center mb-0 z-50 max-w-3xl mx-auto px-6 pointer-events-auto">
            <Listener
              onChunk={handleChunk}
              onSilence={handleSilence}
              onStreamStart={handleStreamStart}
              onStreamStop={handleStreamStop}
            />
          </div>

        </div>

        {/* Local Feed: the session must stay visible whenever the PiP window is not. */}
        {isStreamActive && !pipWindow && (
          <div className="w-full max-w-3xl mx-auto px-6">
            {isPipSupported ? (
              <div className="mb-6 flex justify-center">
                <button
                  onClick={openPipOverlay}
                  className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-white hover:border-slate-300 hover:bg-slate-50 transition-colors active:scale-95"
                >
                  Pop out overlay
                </button>
              </div>
            ) : (
              <div className="mb-6 text-center text-xs text-slate-400 tracking-wide">
                Picture-in-Picture is unavailable in this browser. Showing the feed inline.
              </div>
            )}
            {renderOverlay(false)}
          </div>
        )}

        {/* Hide PremiumScrollSection when the stream is active so it doesn't get in the way */}
        {!isStreamActive && <PremiumScrollSection key="premium-scroll" />}
        
        </div> {/* End of Master Wrapper */}

        {/* Horizontal Tutorial Section */}
        {!isStreamActive && <TutorialScrollSection key="tutorial-scroll" />}
      </main>



      {/* --- THE MAGIC PORTAL --- */}
      {/* If the PiP window exists, teleport the Feed directly into its body */}
      {pipWindow && createPortal(renderOverlay(true), pipWindow.document.body)}
    </div>
  );
}
