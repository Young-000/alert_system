// ─── Smart Departure Types ──────────────────────────

export type DepartureType = 'commute' | 'return';

export type SnapshotStatus =
  | 'scheduled'
  | 'notified'
  | 'departed'
  | 'cancelled'
  | 'expired';

// ─── Setting DTOs ───────────────────────────────────

export type SmartDepartureSettingDto = {
  id: string;
  userId: string;
  routeId: string;
  departureType: DepartureType;
  arrivalTarget: string; // 'HH:mm'
  prepTimeMinutes: number;
  isEnabled: boolean;
  activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  preAlerts: number[]; // e.g. [30, 10, 0]
  createdAt: string;
  updatedAt: string;
};

export type CreateSmartDepartureSettingDto = {
  routeId: string;
  departureType: DepartureType;
  arrivalTarget: string; // 'HH:mm'
  prepTimeMinutes?: number;
  activeDays?: number[];
  preAlerts?: number[];
};

export type UpdateSmartDepartureSettingDto = {
  routeId?: string;
  arrivalTarget?: string;
  prepTimeMinutes?: number;
  activeDays?: number[];
  preAlerts?: number[];
};

// ─── Snapshot DTOs ──────────────────────────────────

export type SmartDepartureSnapshotDto = {
  id: string;
  settingId: string;
  departureType: DepartureType;
  departureDate: string; // 'YYYY-MM-DD'
  arrivalTarget: string; // 'HH:mm'
  estimatedTravelMin: number;
  prepTimeMinutes: number;
  optimalDepartureAt: string; // ISO 8601
  minutesUntilDeparture: number;
  status: SnapshotStatus;
  baselineTravelMin?: number;
  historyAvgTravelMin?: number;
  realtimeAdjustmentMin?: number;
  alertsSent: number[];
  nextAlertMin?: number;
  calculatedAt: string;
  updatedAt: string;
};

export type SmartDepartureTodayResponse = {
  commute?: SmartDepartureSnapshotDto;
  return?: SmartDepartureSnapshotDto;
};

export type CalculateResponse = {
  recalculated: SmartDepartureSnapshotDto[];
  message: string;
};

// ─── Widget Extension ───────────────────────────────

export type WidgetDepartureData = {
  departureType: DepartureType;
  optimalDepartureAt: string; // ISO 8601
  minutesUntilDeparture: number;
  estimatedTravelMin: number;
  arrivalTarget: string; // 'HH:mm'
  status: 'scheduled' | 'notified' | 'departed';
  hasTrafficDelay: boolean;
};
