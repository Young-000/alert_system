import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.super-secret-jwt.signature';

function seedAuth(overrides: Record<string, string> = {}): void {
  const values: Record<string, string> = {
    userId: 'user-1',
    userName: '홍길동',
    userEmail: 'hong@example.com',
    accessToken: ACCESS_TOKEN,
    phoneNumber: '01012345678',
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) {
    localStorage.setItem(key, value);
  }
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('저장된 인증 정보를 그대로 읽는다', () => {
    seedAuth();
    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual({
      userId: 'user-1',
      userName: '홍길동',
      userEmail: 'hong@example.com',
      phoneNumber: '01012345678',
      isLoggedIn: true,
    });
  });

  it('비로그인 상태에서는 기본값을 돌려준다', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.userId).toBe('');
    expect(result.current.userName).toBe('회원');
    expect(result.current.isLoggedIn).toBe(false);
  });

  // 이름은 @MaxLength(50)만 걸려 있어 '|'를 그대로 담을 수 있다.
  // 구글 로그인 표시 이름(AuthCallbackPage)도 마찬가지로 무제약이다.
  describe("이름에 구분자('|')가 들어간 경우", () => {
    it('이름이 잘리거나 뒤 필드로 밀리지 않는다', () => {
      seedAuth({ userName: '홍|길동' });
      const { result } = renderHook(() => useAuth());

      expect(result.current.userName).toBe('홍|길동');
      expect(result.current.userEmail).toBe('hong@example.com');
    });

    it('accessToken이 phoneNumber 자리로 새지 않는다', () => {
      seedAuth({ userName: '홍|길동' });
      const { result } = renderHook(() => useAuth());

      expect(result.current.phoneNumber).toBe('01012345678');
      expect(Object.values(result.current)).not.toContain(ACCESS_TOKEN);
    });

    it('구분자가 여러 개여도 필드 정렬이 유지된다', () => {
      seedAuth({ userName: 'a|b|c|d' });
      const { result } = renderHook(() => useAuth());

      expect(result.current.userName).toBe('a|b|c|d');
      expect(result.current.userEmail).toBe('hong@example.com');
      expect(result.current.phoneNumber).toBe('01012345678');
    });

    it('이메일에 구분자가 있어도 phoneNumber는 정확하다', () => {
      seedAuth({ userEmail: 'we|ird@example.com' });
      const { result } = renderHook(() => useAuth());

      expect(result.current.userEmail).toBe('we|ird@example.com');
      expect(result.current.phoneNumber).toBe('01012345678');
    });
  });
});

/**
 * 사이트 데이터가 차단된 브라우저(또는 샌드박스 iframe)에서는 localStorage 접근이
 * SecurityError를 던진다. getSnapshot은 렌더 중에 불리고 17개 화면이 이 훅에 걸려
 * 있으므로, 던지면 앱 전체가 오류 화면이 된다 — 비로그인 화면은 이미 있는데도.
 */
describe('useAuth — 저장소 접근이 차단된 브라우저', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('읽기가 SecurityError를 던져도 렌더가 죽지 않고 비로그인으로 읽는다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.userId).toBe('');
    expect(result.current.userName).toBe('회원');
  });
});
