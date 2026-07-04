// This acts as the bridge between the UI and Bijita's backend.
// It takes audio chunks (from a mic or a Spotify tab) and sends them over WebSocket.
// By decoupling this, the UI cards don't need to know where the data comes from.
import { useState, useCallback, useRef } from 'react';
import { FactCheckEvent, ClaimStatus, Verdict } from '../types';

export function useStream() {
  const [events, setEvents] = useState<FactCheckEvent[]>([]);
  const isStreaming = useRef(false);

  // Helper to generate a random ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // This is the function the AudioStreamController will call every ~1 second
  const sendAudioChunk = useCallback((audioBlob: Blob) => {
    if (!isStreaming.current) return;

    // --- MOCK BACKEND LOGIC ---
    // In production, this will be: socket.emit('audio_chunk', audioBlob);
    
    // We randomly simulate the backend detecting a claim (e.g., a 10% chance per audio chunk)
    const isClaimDetected = Math.random() < 0.1;

    if (isClaimDetected) {
      const newEventId = `claim_${generateId()}`;
      
      // 1. Simulate receiving a 'CLAIM_DETECTED' event from the backend
      const pendingEvent: FactCheckEvent = {
        event_id: newEventId,
        type: 'CLAIM_DETECTED',
        status: 'PENDING',
        timestamp: Date.now(),
        data: {
          extracted_quote: "Simulated claim extracted from audio stream...",
        }
      };

      setEvents((prev) => [pendingEvent, ...prev]);

      // 2. Simulate the 5-15 second LLM latency to verify the claim
      const latencyMs = Math.floor(Math.random() * 10000) + 5000; 

      setTimeout(() => {
        // 3. Randomly decide the outcome: 40% Verified, 40% Disputed, 20% Dropped
        const rand = Math.random();
        let status: ClaimStatus = 'COMPLETED';
        let verdict: Verdict = null;
        let type: FactCheckEvent['type'] = 'VERDICT_READY';

        if (rand < 0.4) {
          verdict = 'VERIFIED';
        } else if (rand < 0.8) {
          verdict = 'DISPUTED';
        } else {
          status = 'DROPPED';
          type = 'CLAIM_DISMISSED';
        }

        // Update the specific event in our state
        setEvents((prevEvents) => 
          prevEvents.map((ev) => 
            ev.event_id === newEventId
              ? {
                  ...ev,
                  type,
                  status,
                  data: {
                    ...ev.data,
                    verdict,
                    explanation: status === 'DROPPED' 
                      ? undefined 
                      : `The AI reviewed this statement and determined it is ${verdict}.`,
                    sources: status === 'DROPPED' ? undefined : [
                      { title: "Source 1", url: "#" },
                      { title: "Source 2", url: "#" }
                    ]
                  }
                }
              : ev
          )
        );
      }, latencyMs);
    }
  }, []);

  const startStream = useCallback(() => {
    isStreaming.current = true;
    console.log("Started streaming audio chunks to backend...");
  }, []);

  const stopStream = useCallback(() => {
    isStreaming.current = false;
    console.log("Stopped streaming.");
  }, []);

  return {
    events,
    sendAudioChunk,
    startStream,
    stopStream
  };
}
