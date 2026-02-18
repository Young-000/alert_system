import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Mock the error logger
vi.mock('@infrastructure/monitoring/error-logger', () => ({
  logReactError: vi.fn(),
}));

import { logReactError } from '@infrastructure/monitoring/error-logger';

// Suppress console.error for intentional error throws in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
});

afterAll(() => {
  console.error = originalConsoleError;
});

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Normal content</div>;
}

describe('ErrorBoundary', () => {
  it('정상 상태에서 children을 렌더링한다', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('에러 발생 시 폴백 UI를 표시한다', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText('다시 시도')).toBeInTheDocument();
    expect(screen.getByText('홈으로')).toBeInTheDocument();
  });

  it('에러 발생 시 logReactError를 호출한다', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(logReactError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test render error' }),
      expect.any(String),
    );
  });

  it('다시 시도 버튼이 존재한다', async () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const retryButton = screen.getByText('다시 시도');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton.tagName).toBe('BUTTON');
  });

  it('홈으로 버튼이 존재한다', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const homeButton = screen.getByText('홈으로');
    expect(homeButton).toBeInTheDocument();
    expect(homeButton.tagName).toBe('BUTTON');
  });
});
