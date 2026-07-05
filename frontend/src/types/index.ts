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
