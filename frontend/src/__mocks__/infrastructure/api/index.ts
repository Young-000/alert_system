// Mock API clients for Jest
export const apiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
};

// ApiClient class mock
export class ApiClient {
  constructor(_baseUrl: string) {
    // Mock - baseUrl not used
  }
  get = jest.fn();
  post = jest.fn();
  put = jest.fn();
  delete = jest.fn();
  patch = jest.fn();
}

export const alertApiClient = {
  createAlert: jest.fn().mockResolvedValue({}),
  getAlertsByUser: jest.fn().mockResolvedValue([]),
  getAlert: jest.fn().mockResolvedValue(null),
  deleteAlert: jest.fn().mockResolvedValue(undefined),
  toggleAlert: jest.fn().mockResolvedValue(undefined),
  updateAlert: jest.fn().mockResolvedValue({}),
};

export const userApiClient = {
  createUser: jest.fn(),
  getUser: jest.fn(),
  updateLocation: jest.fn(),
  exportData: jest.fn().mockResolvedValue({}),
  deleteAllData: jest.fn().mockResolvedValue({ success: true }),
};

export const subwayApiClient = {
  searchStations: jest.fn(),
};

export const busApiClient = {
  searchStops: jest.fn(),
};

export interface SubwayStation {
  id: string;
  name: string;
  line: string;
}

export interface BusStop {
  id: string;
  name: string;
  arsId: string;
}

export const commuteApiClient = {
  getUserRoutes: jest.fn().mockResolvedValue([]),
  createRoute: jest.fn().mockResolvedValue({}),
  updateRoute: jest.fn().mockResolvedValue({}),
  deleteRoute: jest.fn().mockResolvedValue(undefined),
  getInProgressSession: jest.fn().mockResolvedValue(null),
  startSession: jest.fn().mockResolvedValue({}),
  recordCheckpoint: jest.fn().mockResolvedValue({}),
  completeSession: jest.fn().mockResolvedValue({}),
  cancelSession: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue({
    userId: 'test-user-id',
    totalSessions: 0,
    recentSessions: 0,
    overallAverageDuration: 0,
    overallAverageWaitTime: 0,
    overallAverageDelay: 0,
    waitTimePercentage: 0,
    routeStats: [],
    dayOfWeekStats: [],
    weatherImpact: [],
    insights: [],
  }),
  getHistory: jest.fn().mockResolvedValue([]),
  getUserAnalytics: jest.fn().mockResolvedValue([]),
};

// Factory function for CommuteApiClient
export const getCommuteApiClient = jest.fn(() => commuteApiClient);

// Type exports
export type RouteType = 'commute_to_work' | 'commute_to_home' | 'other';
export type TransportMode = 'walk' | 'subway' | 'bus' | 'taxi';
export type CheckpointType = 'home' | 'subway' | 'bus' | 'transfer' | 'company' | 'other';

export interface CreateRouteDto {
  userId: string;
  name: string;
  type: RouteType;
  isDefault: boolean;
  checkpoints: {
    name: string;
    type: CheckpointType;
    travelTime: number;
    waitTime: number;
    transportMode: TransportMode;
    stationId?: string;
    stationName?: string;
  }[];
}

export interface RouteResponse {
  id: string;
  userId: string;
  name: string;
  type: RouteType;
  isDefault: boolean;
  checkpoints: {
    id: string;
    name: string;
    type: CheckpointType;
    travelTime: number;
    waitTime: number;
    transportMode: TransportMode;
    sequence: number;
  }[];
}

export const notificationApiClient = {
  getHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
};

export interface NotificationLog {
  id: string;
  alertId: string;
  alertName: string;
  alertTypes: string[];
  status: string;
  summary: string;
  sentAt: string;
}

export const authApiClient = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  verify: jest.fn(),
};

export type AlertType = 'weather' | 'airQuality' | 'bus' | 'subway';

export interface Alert {
  id: string;
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  enabled: boolean;
  busStopId?: string;
  subwayStationId?: string;
  routeId?: string;
}

export interface CreateAlertDto {
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  busStopId?: string;
  subwayStationId?: string;
}
