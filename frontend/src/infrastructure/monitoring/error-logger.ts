/**
 * Centralized error logging service.
 *
 * Collects runtime errors (unhandled exceptions, promise rejections,
 * React render errors, API failures) into an in-memory buffer with
 * structured metadata. The buffer is capped to avoid memory leaks.
 *
 * Designed for easy future integration with external services
 * (Sentry, LogRocket, etc.) by swapping the `flush` implementation.
 */

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

type ErrorSource =
  | 'global'           // window.onerror / unhandledrejection
  | 'react-boundary'   // ErrorBoundary componentDidCatch
  | 'api'              // API client errors
  | 'query'            // react-query onError
  | 'manual';          // explicit logError() calls

interface ErrorEntry {
  timestamp: string;
  message: string;
  severity: ErrorSeverity;
  source: ErrorSource;
  stack?: string;
  context?: Record<string, unknown>;
}

const MAX_BUFFER_SIZE = 50;
const buffer: ErrorEntry[] = [];

function createEntry(
  error: unknown,
  source: ErrorSource,
  severity: ErrorSeverity,
  context?: Record<string, unknown>,
): ErrorEntry {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';

  const stack = error instanceof Error ? error.stack : undefined;

  return {
    timestamp: new Date().toISOString(),
    message,
    severity,
    source,
    stack,
    context,
  };
}

function pushEntry(entry: ErrorEntry): void {
  if (buffer.length >= MAX_BUFFER_SIZE) {
    buffer.shift(); // drop oldest
  }
  buffer.push(entry);

  // Dev-only console output for debugging
  if (import.meta.env.DEV) {
    console.error(`[ErrorLogger:${entry.source}] ${entry.message}`, entry.context ?? '');
  }
}

// --- Public API ---

export function logError(
  error: unknown,
  source: ErrorSource = 'manual',
  severity: ErrorSeverity = 'medium',
  context?: Record<string, unknown>,
): void {
  pushEntry(createEntry(error, source, severity, context));
}

export function logApiError(
  error: unknown,
  endpoint: string,
  method: string,
): void {
  pushEntry(createEntry(error, 'api', 'medium', { endpoint, method }));
}

export function logReactError(
  error: Error,
  componentStack: string,
): void {
  pushEntry(createEntry(error, 'react-boundary', 'critical', { componentStack }));
}

/** Returns a snapshot of the error buffer (read-only). */
export function getErrorBuffer(): readonly ErrorEntry[] {
  return [...buffer];
}

/** Clears the in-memory buffer. */
export function clearErrorBuffer(): void {
  buffer.length = 0;
}

/**
 * Installs global error handlers on `window`.
 * Call once at app startup (e.g. in main.tsx).
 */
export function installGlobalErrorHandlers(): void {
  // Synchronous JS errors
  window.addEventListener('error', (event: ErrorEvent) => {
    // Ignore cross-origin script errors (no useful info)
    if (event.message === 'Script error.' && !event.filename) return;

    logError(
      event.error ?? event.message,
      'global',
      'high',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    );
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    logError(
      event.reason,
      'global',
      'high',
      { type: 'unhandledrejection' },
    );
  });
}
