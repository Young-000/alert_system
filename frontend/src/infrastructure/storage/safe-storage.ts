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

/** 세션 유지에 반드시 필요한 두 값. 하나라도 못 쓰면 로그인은 성립하지 않는다. */
export function saveCredentials(accessToken: string, userId: string): boolean {
  const tokenSaved = safeSetItem('accessToken', accessToken);
  const userIdSaved = safeSetItem('userId', userId);
  return tokenSaved && userIdSaved;
}

export const CREDENTIAL_STORAGE_ERROR =
  '이 브라우저에 로그인 정보를 저장할 수 없어요. 시크릿 모드를 끄거나 다른 브라우저에서 다시 시도해 주세요.';
