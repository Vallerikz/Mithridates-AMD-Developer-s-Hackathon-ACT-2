"use client";

import { useState, useRef, useCallback } from "react";
import { FactCheckEvent } from "../types";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const NAMESPACE = "/data_receive_space";

// Shape emitted by the backend, before the client attaches a stable id.
type WireFactCheckEvent = Omit<FactCheckEvent, "id">;

/**
 * Custom hook to manage the WebSocket connection to the fact-checking engine.
 */
export function useStream() {
  const [events, setEvents] = useState<FactCheckEvent[]>([]);
  const [chunksSent, setChunksSent] = useState(0);

  const isStreaming = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const videoIdRef = useRef<number | null>(null);
  const nextEventId = useRef(0);

  /**
   * Initializes the stream state and connects to the backend.
   */
  const startStream = useCallback(() => {
    isStreaming.current = true;

    // Connect to Socket.IO namespace
    const socket = io(`${API_URL}${NAMESPACE}`, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Fact-Checking Engine");

      // Handshake: create a video session
      socket.emit("create_video_session", {});
    });

    socket.on("video_session_created", (data: { video_id: number }) => {
      console.log("Video Session Created:", data.video_id);
      videoIdRef.current = data.video_id;
    });

    socket.on("response", (data: WireFactCheckEvent | WireFactCheckEvent[]) => {
      console.log("Received AI Fact-Check:", data);
      const incoming = Array.isArray(data) ? data : [data];
      const withIds = incoming.map((event) => ({
        ...event,
        id: nextEventId.current++,
      }));
      // Newest first: reverse the batch, then prepend to the existing list
      setEvents((prev) => [...withIds.reverse(), ...prev]);
    });

    socket.on("error", (error: { message: string }) => {
      console.error("Engine Error:", error.message);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Fact-Checking Engine");
    });

  }, []);

  /**
   * Sends a 5-second audio ArrayBuffer to the engine for processing.
   */
  const sendAudioChunk = useCallback((buffer: ArrayBuffer) => {
    // Drop chunks if the engine is paused, disconnected, or handshake incomplete
    if (!isStreaming.current || !socketRef.current || videoIdRef.current === null) return;

    setChunksSent((prev) => prev + 1);

    console.log("Sending chunk size:", buffer.byteLength, "to video session:", videoIdRef.current);

    socketRef.current.emit("receive_audio_chunk", {
      video_id: videoIdRef.current,
      audio_chunk: buffer,
    });
  }, []);

  /**
   * Terminates the stream state.
   */
  const stopStream = useCallback(() => {
    isStreaming.current = false;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    videoIdRef.current = null;
  }, []);

  /**
   * Hard resets the engine state, clearing all events and counters.
   */
  const resetStream = useCallback(() => {
    isStreaming.current = false;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    videoIdRef.current = null;

    setEvents([]);
    setChunksSent(0);
  }, []);

  /**
   * Fetches the summary of the current video session from the backend.
   */
  const fetchSessionSummary = useCallback(async (): Promise<string | null> => {
    if (videoIdRef.current === null) return null;
    try {
      const response = await fetch(`${API_URL}/videos/${videoIdRef.current}/summary`);
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      const data = await response.json();
      if (data.summary === "") {
        return "No spoken claims or facts were detected in this session yet.";
      }
      return data.summary || null;
    } catch (error) {
      console.error("Error fetching summary:", error);
      return null;
    }
  }, []);

  return {
    events,
    chunksSent,
    sendAudioChunk,
    startStream,
    stopStream,
    resetStream,
    fetchSessionSummary,
  };
}
