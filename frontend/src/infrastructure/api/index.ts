import { ApiClient } from './api-client';
import { AlertApiClient } from './alert-api.client';
import { UserApiClient } from './user-api.client';
import { SubwayApiClient } from './subway-api.client';
import { BusApiClient } from './bus-api.client';
import { AuthApiClient } from './auth-api.client';
import { WeatherApiClient } from './weather-api.client';
import { AirQualityApiClient } from './air-quality-api.client';
import { NotificationApiClient } from './notification-api.client';
import { getCommuteApiClient } from './commute-api.client';

// 싱글톤 인스턴스
export const apiClient = new ApiClient();
export const alertApiClient = new AlertApiClient(apiClient);
export const userApiClient = new UserApiClient(apiClient);
export const subwayApiClient = new SubwayApiClient(apiClient);
export const busApiClient = new BusApiClient(apiClient);
export const authApiClient = new AuthApiClient(apiClient);
export const weatherApiClient = new WeatherApiClient(apiClient);
export const airQualityApiClient = new AirQualityApiClient(apiClient);
export const notificationApiClient = new NotificationApiClient(apiClient);
export const commuteApiClient = getCommuteApiClient();

// 클래스 및 타입 재export
export { ApiClient } from './api-client';
export { AlertApiClient } from './alert-api.client';
export { UserApiClient } from './user-api.client';
export { SubwayApiClient } from './subway-api.client';
export { BusApiClient } from './bus-api.client';
export { AuthApiClient } from './auth-api.client';
export { WeatherApiClient } from './weather-api.client';
export { AirQualityApiClient } from './air-quality-api.client';
export type { AirQualityData } from './air-quality-api.client';
export type { Alert, AlertType, CreateAlertDto } from './alert-api.client';
export type { User, CreateUserDto } from './user-api.client';
export type { SubwayStation, SubwayArrival } from './subway-api.client';
export type { BusStop, BusArrival } from './bus-api.client';
export type { WeatherData, HourlyForecast, DailyForecast } from './weather-api.client';
export type { AuthResponse, RegisterDto, LoginDto } from './auth-api.client';
export { NotificationApiClient } from './notification-api.client';
export type { NotificationLog, NotificationHistoryResponse } from './notification-api.client';
export { CommuteApiClient, getCommuteApiClient } from './commute-api.client';
export type {
  RouteType, CheckpointType, TransportMode, SessionStatus,
  CreateCheckpointDto, CreateRouteDto, UpdateRouteDto,
  CheckpointResponse, RouteResponse, StartSessionDto,
} from './commute-api.client';
