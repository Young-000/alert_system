import { safeSetItem, saveCredentials } from './safe-storage';

/**
 * `vi.stubGlobal`로 localStorage 자체를 갈아끼운다.
 * 실제 localStorage 인스턴스에 스파이를 거는 방식은 환경에 따라
 * (jsdom의 Proxy 기반 Storage vs setupTests.ts의 MemoryStorage) 가로채기가 갈린다.
 */
describe('safe-storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubStorage = (setItem: (key: string, value: string) => void): void => {
    vi.stubGlobal('localStorage', { setItem, getItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() });
  };

  describe('safeSetItem', () => {
    it('저장에 성공하면 true를 반환한다', () => {
      stubStorage(vi.fn());
      expect(safeSetItem('k', 'v')).toBe(true);
    });

    it('저장이 실패하면 던지지 않고 false를 반환한다', () => {
      stubStorage(() => {
        throw new Error('QuotaExceededError');
      });
      expect(safeSetItem('k', 'v')).toBe(false);
    });
  });

  describe('saveCredentials', () => {
    it('두 값을 모두 저장하면 true를 반환한다', () => {
      const setItem = vi.fn();
      stubStorage(setItem);

      expect(saveCredentials('token-1', 'user-1')).toBe(true);
      expect(setItem).toHaveBeenCalledWith('accessToken', 'token-1');
      expect(setItem).toHaveBeenCalledWith('userId', 'user-1');
    });

    it('저장소가 막혀 있으면 false를 반환한다', () => {
      stubStorage(() => {
        throw new Error('QuotaExceededError');
      });
      expect(saveCredentials('token-1', 'user-1')).toBe(false);
    });

    it('토큰만 실패해도 false다 — 단축 평가로 두 번째 쓰기를 건너뛰지 않는다', () => {
      const setItem = vi.fn((key: string) => {
        if (key === 'accessToken') throw new Error('QuotaExceededError');
      });
      stubStorage(setItem);

      expect(saveCredentials('token-1', 'user-1')).toBe(false);
      // userId 쓰기는 시도돼야 한다 (첫 실패로 중단되면 안 됨)
      expect(setItem).toHaveBeenCalledWith('userId', 'user-1');
    });

    it('userId만 실패해도 false다', () => {
      const setItem = vi.fn((key: string) => {
        if (key === 'userId') throw new Error('QuotaExceededError');
      });
      stubStorage(setItem);

      expect(saveCredentials('token-1', 'user-1')).toBe(false);
    });
  });
});
