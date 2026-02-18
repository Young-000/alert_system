// ─── Notification History Types ──────────────────────

export type NotificationLog = {
  id: string;
  alertId: string;
  alertName: string;
  alertTypes: string[];
  status: string; // 'success' | 'fallback' | 'failed'
  summary: string;
  sentAt: string; // ISO datetime string
};

export type NotificationHistoryResponse = {
  items: NotificationLog[];
  total: number;
};

export type NotificationStatsDto = {
  total: number;
  success: number;
  fallback: number;
  failed: number;
  successRate: number; // 0-100
};
