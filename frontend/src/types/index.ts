/**
 * Represents a single validated fact-check event emitted by the AI engine.
 */
export interface FactCheckEvent {
  /** Stable identifier assigned on the client when the event is received. */
  id: number;
  /** The specific spoken claim extracted from the audio stream. */
  sentence: string;
  /** The engine's determination (e.g., "True", "False"). */
  verdict: string;
  /** The engine's confidence score ranging from 0 to 1. */
  confidence: number;
  /** The detailed rationale explaining the verdict. */
  explanation: string;
}
