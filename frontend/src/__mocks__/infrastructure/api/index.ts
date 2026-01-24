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
  createAlert: jest.fn(),
  getAlertsByUser: jest.fn(),
  getAlert: jest.fn(),
  deleteAlert: jest.fn(),
};

export const userApiClient = {
  createUser: jest.fn(),
  getUser: jest.fn(),
  updateLocation: jest.fn(),
};

export const subwayApiClient = {
  searchStations: jest.fn(),
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
}

export interface CreateAlertDto {
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  busStopId?: string;
  subwayStationId?: string;
}
