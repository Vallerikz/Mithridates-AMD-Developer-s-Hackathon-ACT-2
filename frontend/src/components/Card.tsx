"use client";

import { FactCheckEvent } from "../types";
import { motion } from "framer-motion";

interface CardProps {
  /** The FactCheckEvent emitted by the engine */
  event: FactCheckEvent;
}

/**
 * A highly styled, minimalist presentation component for a single Fact-Check result.
 * Determines accent colors dynamically based on the AI's true/false verdict.
 */
export function Card({ event }: CardProps) {
  const isFalse = event.verdict.toLowerCase() === "false";
  const isTrue = event.verdict.toLowerCase() === "true";
  
  // Dynamic typographical accent color
  const accentText = isFalse 
    ? "text-rose-500" 
    : isTrue 
      ? "text-emerald-500" 
      : "text-slate-500";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full bg-white rounded-2xl border border-slate-200/60 shadow-[0px_4px_24px_rgba(0,0,0,0.02)] p-10 flex flex-col items-center justify-center text-center space-y-6 transition-colors hover:border-slate-300"
    >
      <p className="text-2xl font-medium tracking-tight text-black max-w-xl leading-snug">
        "{event.sentence}"
      </p>

      <div className={`text-xs font-semibold tracking-widest uppercase ${accentText}`}>
        {event.verdict} • {Math.round(event.confidence * 100)}% Match
      </div>

      <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
        {event.explanation}
      </p>
    </motion.div>
  );
}
