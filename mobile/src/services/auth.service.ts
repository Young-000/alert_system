import { serverMessage } from '@/utils/api-error';
import { apiClient, ApiError } from './api-client';

import type { AuthResponse, LoginDto, RegisterDto, UserProfile } from '@/types/auth';

export const authService = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', dto);
  },

  async register(dto: RegisterDto): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', dto);
  },

  async getUser(userId: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/users/${userId}`);
  },
};

/** API 에러를 사용자 친화적 메시지로 변환 */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // 서버가 보낸 메시지가 있으면 그게 가장 정확하다.
    const fromServer = serverMessage(error);
    if (fromServer) return fromServer;

    // 없을 때만 상태 코드별 기본 메시지 — 아래 표는 인증 화면 기준이다.
    const messages: Record<number, string> = {
      400: '잘못된 요청입니다.',
      401: '이메일 또는 비밀번호가 올바르지 않습니다.',
      403: '권한이 없습니다.',
      404: '요청한 데이터를 찾을 수 없습니다.',
      409: '이미 가입된 이메일입니다.',
      429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
    return messages[error.status] ?? '알 수 없는 오류가 발생했습니다.';
  }

  if (error instanceof TypeError) {
    return '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
  }

  return '오류가 발생했습니다.';
}
