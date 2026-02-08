/**
 * Safe localStorage wrapper that handles QuotaExceededError
 * and private browsing mode restrictions.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn(`[Storage] Failed to set "${key}" - storage may be full or unavailable`);
    return false;
  }
}
