import { useState, useCallback, useRef } from 'react';
import { FactCheckEvent } from '../types';

// TODO: Replace mock queue with actual Socket.IO listener once backend Websocket is ready
const MOCK_FIXTURES = [
  {
    quote: "We've seen a 40% reduction in carbon emissions this quarter.",
    verdict: 'DISPUTED',
    explanation: "EPA reports show only a 12% reduction over the specified time period.",
    sources: [{ title: "EPA 2023 Q3 Report", url: "https://epa.gov/reports" }]
  },
  {
    quote: "The new infrastructure bill will create 2 million jobs.",
    verdict: 'VERIFIED',
    explanation: "CBO estimates project 2.1M jobs created over 5 years.",
    sources: [{ title: "CBO Infrastructure Analysis", url: "https://cbo.gov" }]
  }
];

export function useStream() {
  const [events, setEvents] = useState<FactCheckEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isStreaming = useRef(false);
  const mockIdx = useRef(0);

  const sendAudioChunk = useCallback((blob: Blob) => {
    if (!isStreaming.current) return;

    try {
      // TODO: ws.send(blob)

      // temp mock behavior
      if (Math.random() > 0.05) return;

      const fixture = MOCK_FIXTURES[mockIdx.current % MOCK_FIXTURES.length];
      mockIdx.current += 1;
      const id = `evt_${Date.now().toString(36)}`;

      const pending: FactCheckEvent = {
        event_id: id,
        type: 'CLAIM_DETECTED',
        status: 'PENDING',
        timestamp: Date.now(),
        data: { extracted_quote: fixture.quote }
      };

      setEvents(prev => [pending, ...prev]);

      setTimeout(() => {
        setEvents(prev => prev.map(ev =>
          ev.event_id === id
            ? {
              ...ev,
              type: 'VERDICT_READY',
              status: 'COMPLETED',
              data: {
                ...ev.data,
                verdict: fixture.verdict as any,
                explanation: fixture.explanation,
                sources: fixture.sources
              }
            }
            : ev
        ));
      }, 6500);

    } catch (err) {
      console.error("Stream error:", err);
      setError("Failed to stream audio chunk");
    }
  }, []);

  const startStream = useCallback(() => {
    setError(null);
    isStreaming.current = true;
  }, []);

  const stopStream = useCallback(() => {
    isStreaming.current = false;
  }, []);

  return { events, error, sendAudioChunk, startStream, stopStream };
}
