export type WizardStep = 'type' | 'transport' | 'station' | 'routine' | 'confirm';

export const TOAST_DURATION_MS = 2000;
export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_SEARCH_RESULTS = 15;
export const TRANSPORT_NOTIFY_OFFSET_MIN = 15;

export interface TransportItem {
  type: 'subway' | 'bus';
  id: string;
  name: string;
  detail: string;
}

export interface Routine {
  wakeUp: string;
  leaveHome: string;
  leaveWork: string;
}

export interface GroupedStation {
  name: string;
  lines: TransportItem[];
}
