import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

/**
 * `findBy*`/`waitFor`의 기본 재시도 예산은 1,000ms인데, 전체 실행에서는 워커들이 CPU를
 * 나눠 쓰느라 한 번의 리렌더까지 그보다 오래 걸리는 구간이 생긴다. 그러면 vitest의
 * testTimeout을 올려도 이쪽이 먼저 끊겨 "Unable to find an element"로 실패한다
 * (MyComparisonSection: 전체 실행에서만 실패, 단독 실행 시 317ms 통과).
 *
 * 요소가 끝내 나타나지 않는 진짜 실패는 이 예산을 다 쓰고 나서 동일하게 실패한다.
 */
configure({ asyncUtilTimeout: 5_000 });

// Node.js 25+ exposes a built-in localStorage that conflicts with jsdom's implementation.
// The Node localStorage requires --localstorage-file to function, and without it,
// all methods (getItem, setItem, clear, etc.) are missing. This polyfill provides
// a proper in-memory Storage implementation for the test environment.
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.get(key) ?? null;
    }

    key(index: number): string | null {
      const keys = Array.from(this.store.keys());
      return keys[index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }

    [Symbol.iterator](): IterableIterator<string> {
      return this.store.keys();
    }
  }

  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
}
