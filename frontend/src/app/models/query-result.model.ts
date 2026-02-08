export interface QueryResult {
  success: boolean;
  error?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  executionTimeMs: number;
}
