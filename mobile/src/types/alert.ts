// ─── Alert Types (CRUD + Toggle) ──────────────────

export type AlertType = 'weather' | 'airQuality' | 'bus' | 'subway';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

export type Alert = {
  id: string;
  userId: string;
  name: string;
  schedule: string; // cron: "minute hour * * days"
  alertTypes: AlertType[];
  enabled: boolean;
  busStopId?: string;
  subwayStationId?: string;
  routeId?: string;
};

export type CreateAlertPayload = {
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  busStopId?: string;
  subwayStationId?: string;
  routeId?: string;
};

export type UpdateAlertPayload = {
  name?: string;
  schedule?: string;
  alertTypes?: AlertType[];
  enabled?: boolean;
};
