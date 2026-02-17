import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  logError,
  logApiError,
  logReactError,
  getErrorBuffer,
  clearErrorBuffer,
  installGlobalErrorHandlers,
} from './error-logger';

describe('error-logger', () => {
  beforeEach(() => {
    clearErrorBuffer();
  });

  describe('logError', () => {
    it('에러 객체를 버퍼에 추가한다', () => {
      logError(new Error('test error'), 'manual', 'medium');
      const buffer = getErrorBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].message).toBe('test error');
      expect(buffer[0].source).toBe('manual');
      expect(buffer[0].severity).toBe('medium');
      expect(buffer[0].stack).toBeDefined();
    });

    it('문자열 에러를 처리한다', () => {
      logError('string error');
      expect(getErrorBuffer()[0].message).toBe('string error');
    });

    it('unknown 타입 에러를 처리한다', () => {
      logError(42);
      expect(getErrorBuffer()[0].message).toBe('Unknown error');
    });

    it('컨텍스트 정보를 포함한다', () => {
      logError('err', 'manual', 'low', { page: '/home' });
      expect(getErrorBuffer()[0].context).toEqual({ page: '/home' });
    });

    it('버퍼 최대 크기(50)를 초과하면 오래된 항목을 제거한다', () => {
      for (let i = 0; i < 55; i++) {
        logError(`error-${i}`);
      }
      const buffer = getErrorBuffer();
      expect(buffer).toHaveLength(50);
      expect(buffer[0].message).toBe('error-5'); // oldest 5 dropped
      expect(buffer[49].message).toBe('error-54');
    });
  });

  describe('logApiError', () => {
    it('API 에러를 endpoint/method 컨텍스트와 함께 기록한다', () => {
      logApiError(new Error('404'), '/users', 'GET');
      const entry = getErrorBuffer()[0];
      expect(entry.source).toBe('api');
      expect(entry.context).toEqual({ endpoint: '/users', method: 'GET' });
    });
  });

  describe('logReactError', () => {
    it('React 렌더 에러를 componentStack과 함께 기록한다', () => {
      logReactError(new Error('render fail'), '<App> -> <Home>');
      const entry = getErrorBuffer()[0];
      expect(entry.source).toBe('react-boundary');
      expect(entry.severity).toBe('critical');
      expect(entry.context).toEqual({ componentStack: '<App> -> <Home>' });
    });
  });

  describe('clearErrorBuffer', () => {
    it('버퍼를 비운다', () => {
      logError('a');
      logError('b');
      expect(getErrorBuffer()).toHaveLength(2);
      clearErrorBuffer();
      expect(getErrorBuffer()).toHaveLength(0);
    });
  });

  describe('getErrorBuffer', () => {
    it('버퍼의 복사본을 반환한다 (원본 불변)', () => {
      logError('a');
      const copy = getErrorBuffer();
      expect(copy).toHaveLength(1);
      // Mutating copy should not affect internal buffer
      (copy as unknown[]).push({ message: 'hack' });
      expect(getErrorBuffer()).toHaveLength(1);
    });
  });

  describe('installGlobalErrorHandlers', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: Record<string, (e: any) => void> = {};

    beforeEach(() => {
      vi.spyOn(window, 'addEventListener').mockImplementation(
        (event: string, handler: unknown) => {
          handlers[event] = handler as (e: unknown) => void;
        },
      );
      installGlobalErrorHandlers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('window error 이벤트를 캡처한다', () => {
      handlers['error']({
        error: new Error('global error'),
        message: 'global error',
        filename: 'app.js',
        lineno: 10,
        colno: 5,
      });
      const entry = getErrorBuffer()[0];
      expect(entry.source).toBe('global');
      expect(entry.severity).toBe('high');
      expect(entry.context?.filename).toBe('app.js');
    });

    it('cross-origin "Script error." 이벤트는 무시한다', () => {
      handlers['error']({
        message: 'Script error.',
        filename: '',
        error: null,
      });
      expect(getErrorBuffer()).toHaveLength(0);
    });

    it('unhandled promise rejection을 캡처한다', () => {
      handlers['unhandledrejection']({
        reason: new Error('promise rejected'),
      });
      const entry = getErrorBuffer()[0];
      expect(entry.source).toBe('global');
      expect(entry.context?.type).toBe('unhandledrejection');
    });
  });
});
