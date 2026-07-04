// This is my idea on the json payload structure we will be sending to bijita and getting it back from her. also these are the states user will see.
// It acts as our dictionary so we don't make typos on the frontend.
export type ClaimStatus = 'PENDING' | 'COMPLETED' | 'DROPPED';
export type Verdict = 'VERIFIED' | 'DISPUTED' | null;

export interface Source {
  title: string;
  url: string;
}

export interface FactCheckEvent {
  event_id: string;
  type: 'CLAIM_DETECTED' | 'VERDICT_READY' | 'CLAIM_DISMISSED';
  status: ClaimStatus;
  timestamp: number;
  data: {
    extracted_quote: string;
    verdict?: Verdict;
    explanation?: string;
    sources?: Source[];
  };
}
