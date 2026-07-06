"use client";

import { FactCheckEvent } from "../types";
import { Card } from "./Card";
import { motion, AnimatePresence } from "framer-motion";

interface FeedProps {
  /** List of sequential fact-check events to render */
  events: FactCheckEvent[];
  /** Whether the engine is manually paused */
  isEnginePaused?: boolean;
  /** Number of successful audio transmissions */
  chunksSent?: number;
  /** Whether Voice Activity Detection detected silence (video paused) */
  isVadSilent?: boolean;
}

/**
 * A chronological list component that gracefully animates new fact-check cards 
 * into view as they arrive from the backend engine.
 */
export function Feed({ events, isEnginePaused = false, chunksSent = 0, isVadSilent = false, streamName }: FeedProps) {
  if (events.length === 0) {
    const isLive = chunksSent > 0 && !isEnginePaused && !isVadSilent;
    
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center space-y-6">
        {isLive ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 rounded-full" />
              <svg className="w-8 h-8 text-emerald-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <p className="text-xs font-bold tracking-widest uppercase text-emerald-500">
              {streamName ? `Analyzing ${streamName}` : 'Listening & Analyzing...'}
            </p>
          </>
        ) : isEnginePaused ? (
          <>
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Engine Paused</p>
          </>
        ) : isVadSilent && chunksSent > 0 ? (
          <>
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Audio Paused (VAD)</p>
          </>
        ) : (
          <>
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Awaiting Audio Stream...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 w-full">
      <AnimatePresence mode="popLayout">
        {events.map((event, index) => (
          <motion.div
            layout
            key={index} // Using index as key is acceptable here since the array is immutable/append-only
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <Card event={event} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
