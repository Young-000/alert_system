// ─── Live Activity Types (FE-1) ──────────────────────

/** Live Activity status, matching Swift ContentState.status. */
export type LiveActivityStatus =
  | 'preparing'
  | 'departureSoon'
  | 'departureNow'
  | 'inTransit'
  | 'arrived';

/** Commute mode for the Live Activity. */
export type LiveActivityMode = 'commute' | 'return';

// ─── Native Module Types ────────────────────────────

/** Info returned by the native module after starting or querying an activity. */
export type LiveActivityInfo = {
  activityId: string;
  pushToken: string;
  isActive: boolean;
};

/** Parameters for starting a new Live Activity. */
export type StartLiveActivityParams = {
  mode: LiveActivityMode;
  routeName: string;
  arrivalTarget: string;
  checkpoints: string[];
  optimalDepartureAt: string; // ISO 8601
  estimatedTravelMin: number;
  nextCheckpoint?: string;
  nextTransitInfo?: string;
};

/** Parameters for updating an existing Live Activity. */
export type UpdateLiveActivityParams = {
  activityId: string;
  optimalDepartureAt: string; // ISO 8601
  estimatedTravelMin: number;
  status: LiveActivityStatus;
  minutesUntilDeparture: number;
  minutesUntilArrival?: number;
  currentCheckpointIndex?: number;
  nextCheckpoint?: string;
  nextTransitInfo?: string;
  hasTrafficDelay: boolean;
  trafficDelayMessage?: string;
  estimatedArrivalTime?: string;
};

// ─── Server API Types ───────────────────────────────

/** Request body for registering a Live Activity push token on the server. */
export type RegisterLiveActivityDto = {
  pushToken: string;
  activityId: string;
  mode: LiveActivityMode;
  settingId: string;
};

/** Response from the server after push token registration. */
export type RegisterLiveActivityResponse = {
  id: string;
  registered: boolean;
};

// ─── Hook State Types ───────────────────────────────

/** State exposed by the useLiveActivity hook. */
export type LiveActivityState = {
  /** Whether Live Activities are supported on this device. */
  isSupported: boolean;
  /** Whether a Live Activity is currently active. */
  isActive: boolean;
  /** The current activity info, or null. */
  activityInfo: LiveActivityInfo | null;
  /** Start a Live Activity for the given parameters. */
  start: (params: StartLiveActivityParams, settingId: string) => Promise<boolean>;
  /** Update the currently active Live Activity. */
  update: (params: Omit<UpdateLiveActivityParams, 'activityId'>) => Promise<boolean>;
  /** End the currently active Live Activity. */
  end: () => Promise<boolean>;
  /** End all active Live Activities. */
  endAll: () => Promise<boolean>;
};
