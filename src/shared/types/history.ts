export interface HistoryEntry {
  id: string;
  createdAt: number;
  screenshotPath?: string;
  answerSummary: string;
  answerFull: string;
  modelUsed: string;
  providerName: string;
  sourceType: string;
  sourceUrl?: string;
  sourceTitle?: string;
  latencyMs: number;
  status: 'success' | 'error' | 'cancelled';
  errorMessage?: string;
  tags: string[];
  isPinned: boolean;
}

export interface HistorySearchParams {
  query: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
