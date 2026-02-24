import '@testing-library/jest-dom/vitest';

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
