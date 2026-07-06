"use client";

import { useState, useRef, useCallback } from "react";
import { FactCheckEvent } from "../types";

/**
 * Custom hook to manage the WebSocket connection to the fact-checking engine.
 * Currently mocked for the hackathon UI development phase.
 */
export function useStream() {
  const [events, setEvents] = useState<FactCheckEvent[]>([]);
  const [chunksSent, setChunksSent] = useState(0);
  const isStreaming = useRef(false);

  /**
   * Sends a 5-second audio ArrayBuffer to the engine for processing.
   */
  const sendAudioChunk = useCallback((buffer: ArrayBuffer) => {
    if (!isStreaming.current) return;
    
    setChunksSent((prev) => prev + 1);
    
    // TODO: Replace with actual WebSocket `socket.send(buffer)`
    console.log("Sending ArrayBuffer of size:", buffer.byteLength);

    // Mock Engine Logic: Randomly trigger a fact check 5% of the time
    if (Math.random() < 0.05) {
      const mockEvent: FactCheckEvent = {
        sentence: "The Federal Reserve just printed 5 trillion dollars yesterday.",
        verdict: "False",
        confidence: 0.98,
        explanation: "The Federal Reserve did not print 5 trillion dollars yesterday. Monetary policy reports indicate standard liquidity operations.",
      };
      setEvents((prev) => [mockEvent, ...prev]);
    }
  }, []);

  /**
   * Initializes the stream state.
   */
  const startStream = useCallback(() => {
    isStreaming.current = true;
  }, []);

  /**
   * Terminates the stream state.
   */
  const stopStream = useCallback(() => {
    isStreaming.current = false;
  }, []);

  /**
   * Hard resets the engine state, clearing all events and counters.
   */
  const resetStream = useCallback(() => {
    isStreaming.current = false;
    setEvents([]);
    setChunksSent(0);
  }, []);

  return {
    events,
    chunksSent,
    sendAudioChunk,
    startStream,
    stopStream,
    resetStream,
  };
}
