import { ApiClient } from './api-client';

// 상대 경로로 import 하므로 vitest.config.ts의 @infrastructure/api 목 별칭을 타지 않고
// 실제 ApiClient 구현이 로드된다.

const originalLocation = window.location;

function mockLocation(): { href: string } {
  const stub = { href: '' };
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: stub,
  });
  return stub;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('ApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    localStorage.clear();
  });

  describe('재시도 정책', () => {
    it('GET은 네트워크 오류 시 재시도한다', async () => {
      fetchMock
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const client = new ApiClient('http://api.test');
      const result = await client.get<{ ok: boolean }>('/routes');

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('POST는 네트워크 오류가 나도 재시도하지 않는다 (중복 생성 방지)', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      const client = new ApiClient('http://api.test');

      await expect(client.post('/commute/sessions', { routeId: 'r-1' })).rejects.toThrow(
        TypeError
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('PATCH도 재시도하지 않는다', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      const client = new ApiClient('http://api.test');

      await expect(client.patch('/alerts/a-1', { isActive: false })).rejects.toThrow(
        TypeError
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('HTTP 에러(500)는 재시도하지 않는다', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500));

      const client = new ApiClient('http://api.test');

      await expect(client.get('/routes')).rejects.toThrow('API Error 500');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('인증 만료 처리', () => {
    it('보호된 엔드포인트가 401이면 저장된 인증 정보를 지우고 로그인으로 보낸다', async () => {
      const location = mockLocation();
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('userId', 'user-1');
      fetchMock.mockResolvedValue(jsonResponse({ message: 'unauthorized' }, 401));

      const client = new ApiClient('http://api.test');

      await expect(client.get('/commute/routes')).rejects.toThrow('API Error 401');
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('userId')).toBeNull();
      expect(location.href).toBe('/login');
    });

    it('로그인 엔드포인트의 401은 세션을 지우지 않는다 (자격증명 오류일 뿐)', async () => {
      const location = mockLocation();
      localStorage.setItem('accessToken', 'token');
      fetchMock.mockResolvedValue(jsonResponse({ message: 'invalid password' }, 401));

      const client = new ApiClient('http://api.test');

      await expect(client.post('/auth/login', { email: 'a@b.c' })).rejects.toThrow(
        'API Error 401'
      );
      expect(localStorage.getItem('accessToken')).toBe('token');
      expect(location.href).toBe('');
    });
  });

  it('저장된 토큰을 Authorization 헤더로 보낸다', async () => {
    localStorage.setItem('accessToken', 'token-123');
    fetchMock.mockResolvedValue(jsonResponse({}));

    const client = new ApiClient('http://api.test');
    await client.get('/users/me');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer token-123'
    );
  });
});
