import { ApiClient } from './api-client';
import { AlertApiClient } from './alert-api.client';
import { UserApiClient } from './user-api.client';
import { SubwayApiClient } from './subway-api.client';

// 싱글톤 인스턴스
export const apiClient = new ApiClient();
export const alertApiClient = new AlertApiClient(apiClient);
export const userApiClient = new UserApiClient(apiClient);
export const subwayApiClient = new SubwayApiClient(apiClient);

// 클래스 및 타입 재export
export { ApiClient } from './api-client';
export { AlertApiClient } from './alert-api.client';
export { UserApiClient } from './user-api.client';
export { SubwayApiClient } from './subway-api.client';
export type { Alert, AlertType, CreateAlertDto } from './alert-api.client';
export type { User, CreateUserDto } from './user-api.client';
export type { SubwayStation } from './subway-api.client';
