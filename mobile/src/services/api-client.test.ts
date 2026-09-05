import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiClient } from './api-client';

vi.mock('@/constants/config', () => ({ API_BASE_URL: 'https://api.test' }));
vi.mock('./token.service', () => ({
  tokenService: { getAccessToken: vi.fn(async () => 'test-token') },
}));

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

function errorResponse(status: number, body = 'boom'): Response {
  return { ok: false, status, text: async () => body } as Response;
}

/** fetch가 던지는 네트워크 오류. withRetry가 재시도 대상으로 보는 형태다. */
function networkError(): TypeError {
  return new TypeError('Network request failed');
}

describe('ApiClient 재시도 정책', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** 재시도 대기(setTimeout)를 건너뛰며 결과를 기다린다. */
  async function resolveWithTimers<T>(promise: Promise<T>): Promise<T> {
    const settled = promise.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    await vi.runAllTimersAsync();
    const result = await settled;
    if (!result.ok) throw result.error;
    return result.value;
  }

  it('GET은 네트워크 오류 시 재시도한다', async () => {
    fetchMock
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(jsonResponse({ id: 'a' }));

    await expect(resolveWithTimers(apiClient.get('/alerts'))).resolves.toEqual({ id: 'a' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('POST는 네트워크 오류가 나도 재시도하지 않는다 (중복 생성 방지)', async () => {
    fetchMock.mockRejectedValue(networkError());

    await expect(resolveWithTimers(apiClient.post('/alerts', { name: 'a' }))).rejects.toThrow(
      TypeError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('PATCH도 재시도하지 않는다 (toggle이 도로 뒤집히는 것을 막는다)', async () => {
    fetchMock.mockRejectedValue(networkError());

    await expect(resolveWithTimers(apiClient.patch('/alerts/1/toggle', {}))).rejects.toThrow(
      TypeError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('PUT·DELETE는 멱등이라 재시도한다', async () => {
    fetchMock
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }))
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(jsonResponse({ ok: 2 }));

    await expect(resolveWithTimers(apiClient.put('/routes/1', {}))).resolves.toEqual({ ok: 1 });
    await expect(resolveWithTimers(apiClient.delete('/routes/1'))).resolves.toEqual({ ok: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('HTTP 에러(500)는 재시도하지 않고 ApiError로 던진다', async () => {
    fetchMock.mockResolvedValue(errorResponse(500));

    await expect(resolveWithTimers(apiClient.get('/alerts'))).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('ApiClient 401 처리', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    apiClient.setOnUnauthorized(() => {});
  });

  it('401이면 등록된 콜백을 부른다', async () => {
    const onUnauthorized = vi.fn();
    apiClient.setOnUnauthorized(onUnauthorized);
    fetchMock.mockResolvedValue(errorResponse(401, 'unauthorized'));

    await expect(apiClient.get('/alerts')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('로그인 요청의 401은 로그아웃을 유발하지 않는다', async () => {
    const onUnauthorized = vi.fn();
    apiClient.setOnUnauthorized(onUnauthorized);
    fetchMock.mockResolvedValue(errorResponse(401, 'bad credentials'));

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
