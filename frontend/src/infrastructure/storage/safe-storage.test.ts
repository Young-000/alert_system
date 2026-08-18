import {
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  saveCredentials,
  safeSessionGetItem,
  safeSessionSetItem,
} from './safe-storage';

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

  /**
   * sessionStorage는 접근 자체가 막힐 수 있다(쿠키/사이트 데이터 차단 시 SecurityError).
   * 읽기가 렌더 중에 일어나므로, 던지면 화면 전체가 죽는다.
   */
  describe('safeSessionGetItem', () => {
    const stubSession = (getItem: (key: string) => string | null): void => {
      vi.stubGlobal('sessionStorage', { getItem, setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() });
    };

    it('저장된 값을 그대로 돌려준다', () => {
      stubSession(() => 'true');
      expect(safeSessionGetItem('k')).toBe('true');
    });

    it('저장소 접근이 막히면 던지지 않고 null을 반환한다', () => {
      stubSession(() => {
        throw new Error('SecurityError');
      });
      expect(safeSessionGetItem('k')).toBeNull();
    });
  });

  describe('safeSessionSetItem', () => {
    const stubSession = (setItem: (key: string, value: string) => void): void => {
      vi.stubGlobal('sessionStorage', { setItem, getItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() });
    };

    it('저장에 성공하면 true를 반환한다', () => {
      const setItem = vi.fn();
      stubSession(setItem);

      expect(safeSessionSetItem('k', 'v')).toBe(true);
      expect(setItem).toHaveBeenCalledWith('k', 'v');
    });

    it('저장이 실패하면 던지지 않고 false를 반환한다', () => {
      stubSession(() => {
        throw new Error('QuotaExceededError');
      });
      expect(safeSessionSetItem('k', 'v')).toBe(false);
    });
  });
});

/**
 * 사이트 데이터가 차단된 브라우저에서는 `localStorage.getItem` 자체가 SecurityError를
 * 던진다. 이 읽기는 렌더 중에 일어나므로(useAuth의 getSnapshot) 던지면 화면이 통째로
 * 죽는다. 저장 실패와 달리 되돌릴 것이 없으므로 "비로그인"으로 읽는 것이 유일한 복구다.
 */
describe('safe-storage — 접근이 차단된 저장소', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubBlockedStorage = (): void => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      removeItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      clear: vi.fn(),
    });
  };

  it('safeGetItem은 읽기가 막히면 던지지 않고 null을 반환한다', () => {
    stubBlockedStorage();
    expect(() => safeGetItem('accessToken')).not.toThrow();
    expect(safeGetItem('accessToken')).toBeNull();
  });

  it('safeGetItem은 값이 있으면 그대로 돌려준다', () => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k === 'userId' ? 'u-1' : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    expect(safeGetItem('userId')).toBe('u-1');
    expect(safeGetItem('userName')).toBeNull();
  });

  it('safeRemoveItem은 삭제가 막혀도 던지지 않는다 — 로그아웃이 멈추면 안 된다', () => {
    stubBlockedStorage();
    expect(() => safeRemoveItem('accessToken')).not.toThrow();
  });
});
