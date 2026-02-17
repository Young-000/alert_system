import { useState, useCallback, type KeyboardEvent } from 'react';

interface UseCollapsibleOptions {
  storageKey: string;
  defaultExpanded?: boolean;
}

interface UseCollapsibleReturn {
  isExpanded: boolean;
  toggle: () => void;
  ariaProps: {
    'aria-expanded': boolean;
    role: 'button';
    tabIndex: 0;
    onKeyDown: (e: KeyboardEvent) => void;
    onClick: () => void;
  };
}

function readFromStorage(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(`home_collapsible_${key}`);
    if (stored === null) return fallback;
    return stored === 'true';
  } catch {
    return fallback;
  }
}

function writeToStorage(key: string, value: boolean): void {
  try {
    localStorage.setItem(`home_collapsible_${key}`, String(value));
  } catch {
    // localStorage unavailable (e.g. quota exceeded, private browsing)
  }
}

export function useCollapsible(options: UseCollapsibleOptions): UseCollapsibleReturn {
  const { storageKey, defaultExpanded = false } = options;

  const [isExpanded, setIsExpanded] = useState<boolean>(
    () => readFromStorage(storageKey, defaultExpanded),
  );

  const toggle = useCallback((): void => {
    setIsExpanded(prev => {
      const next = !prev;
      writeToStorage(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const handleKeyDown = useCallback((e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }, [toggle]);

  return {
    isExpanded,
    toggle,
    ariaProps: {
      'aria-expanded': isExpanded,
      role: 'button' as const,
      tabIndex: 0 as const,
      onKeyDown: handleKeyDown,
      onClick: toggle,
    },
  };
}
