import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  active: boolean;
  onEscape?: () => void;
}

/**
 * Traps keyboard focus within a container element when active.
 *
 * Behavior:
 * 1. On activation: saves previous activeElement, focuses first focusable child
 * 2. Tab / Shift+Tab: cycles focus within the container
 * 3. Escape: calls onEscape callback
 * 4. On deactivation: restores previous focus
 */
export function useFocusTrap(options: UseFocusTrapOptions): RefObject<HTMLDivElement> {
  const { active, onEscape } = options;
  // Cast needed: useRef(null) returns MutableRefObject<null>, but we need RefObject<HTMLDivElement>
  // for compatibility with React 18's ref prop typing
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Save the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR,
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the first focusable element inside the container
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const firstFocusable = containerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();
      }
    }, 10);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      // Restore the previously focused element
      previousActiveElement.current?.focus();
    };
  }, [active, onEscape]);

  return containerRef;
}
