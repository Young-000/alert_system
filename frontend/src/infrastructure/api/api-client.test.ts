import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from './api-client';

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  }) as Response;

const timeoutError = (): DOMException =>
  new DOMException('The operation was aborted.', 'AbortError');

describe('ApiClient retry policy', () => {
  let client: ApiClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new ApiClient('http://api.test');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should retry GET after a timeout because reads are safe to repeat', async () => {
    fetchMock
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const promise = client.get('/alerts');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should NOT retry POST after a timeout — the server may already have created the resource', async () => {
    fetchMock
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(jsonResponse({ id: 'duplicate' }));

    const assertion = expect(client.post('/alerts', { name: 'morning' })).rejects.toThrow();
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry POST after a network error', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ id: 'duplicate' }));

    const assertion = expect(client.post('/community/tips', { content: 'hi' })).rejects.toThrow();
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry PATCH after a timeout', async () => {
    fetchMock
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const assertion = expect(client.patch('/alerts/1', { enabled: true })).rejects.toThrow();
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should retry DELETE after a timeout because DELETE is idempotent', async () => {
    fetchMock
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const promise = client.delete('/alerts/1');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should not retry HTTP error responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    } as Response);

    const assertion = expect(client.get('/alerts')).rejects.toThrow('API Error 500');
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
