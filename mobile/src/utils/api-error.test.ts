import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api-client';
import { serverMessage } from './api-error';

// `token.service`는 expo-secure-store를 거쳐 react-native를 끌어온다. RN 소스는
// Flow라 vitest가 파싱하지 못하므로 여기서 끊는다 (`api-client.test.ts`와 같은 처리).
// `ApiError`는 실제 클래스를 그대로 써야 한다 — `instanceof` 판정이 이 계약의 핵심이다.
vi.mock('@/services/token.service', () => ({
  tokenService: { getAccessToken: vi.fn(async () => null) },
}));

/**
 * `serverMessage`는 장소·도전·스마트 출발 세 기능이 공유하는 계약이다 —
 * 서버가 문장으로 내려준 거절 사유를 화면까지 그대로 옮기는 유일한 통로다.
 * 여기가 조용히 null을 돌려주기 시작하면 세 화면이 한꺼번에 "잠시 후 다시
 * 시도해주세요"로 퇴화하고, 목록만 새로고침하면 될 사용자가 같은 버튼을 계속 누른다.
 */
describe('serverMessage', () => {
  it('AllExceptionsFilter의 문자열 message를 꺼낸다', () => {
    const error = new ApiError(
      409,
      JSON.stringify({ statusCode: 409, message: '이미 출근 설정이 존재합니다.', path: '/x' }),
    );
    expect(serverMessage(error)).toBe('이미 출근 설정이 존재합니다.');
  });

  it('ValidationPipe의 배열 message는 첫 항목을 꺼낸다', () => {
    const error = new ApiError(
      400,
      JSON.stringify({ statusCode: 400, message: ['routeId must be a UUID', 'x'] }),
    );
    expect(serverMessage(error)).toBe('routeId must be a UUID');
  });

  it('빈 배열이면 null (호출부가 자기 문구를 고르게 둔다)', () => {
    const error = new ApiError(400, JSON.stringify({ message: [] }));
    expect(serverMessage(error)).toBeNull();
  });

  it('본문이 JSON이 아니면 null', () => {
    expect(serverMessage(new ApiError(502, '<html>Bad Gateway</html>'))).toBeNull();
  });

  it('message 필드가 없으면 null', () => {
    expect(serverMessage(new ApiError(500, JSON.stringify({ statusCode: 500 })))).toBeNull();
  });

  it('ApiError가 아니면 null (네트워크 단절 등)', () => {
    expect(serverMessage(new TypeError('Network request failed'))).toBeNull();
    expect(serverMessage(null)).toBeNull();
  });
});
