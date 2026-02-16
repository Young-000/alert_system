export interface StopwatchRecord {
  id: string;
  startedAt: string;
  completedAt: string;
  totalDurationSeconds: number;
  type: 'morning' | 'evening' | 'custom';
  notes?: string;
}

export const STOPWATCH_STORAGE_KEY = 'commute_stopwatch_records';
export const MIN_DATA_FOR_BEHAVIOR = 5;

export function getStopwatchRecords(): StopwatchRecord[] {
  try {
    const data = localStorage.getItem(STOPWATCH_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
