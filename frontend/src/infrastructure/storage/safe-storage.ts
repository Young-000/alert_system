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

/**
 * localStorage는 값이 없을 때가 아니라 **접근 자체가 막혔을 때** 던진다
 * (사이트 데이터 차단·샌드박스 iframe → SecurityError). 읽기는 렌더 중에 일어나므로
 * 던지면 화면이 통째로 죽는다. 못 읽으면 로그아웃 상태로 보는 것이 맞다 —
 * 앱은 비로그인 화면을 이미 갖고 있지만 흰 화면에는 다음 행동이 없다.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 접근이 막힌 저장소에는 지울 것도 없다. 로그아웃이 예외로 멈추면 안 된다. */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 읽을 수도 없는 저장소이므로 세션은 이미 비어 있는 것과 같다
  }
}

/** 세션 유지에 반드시 필요한 두 값. 하나라도 못 쓰면 로그인은 성립하지 않는다. */
export function saveCredentials(accessToken: string, userId: string): boolean {
  const tokenSaved = safeSetItem('accessToken', accessToken);
  const userIdSaved = safeSetItem('userId', userId);
  return tokenSaved && userIdSaved;
}

/**
 * sessionStorage는 값이 없을 때뿐 아니라 **접근 자체가 막혔을 때도** 던진다
 * (사이트 데이터 차단·샌드박스 iframe → SecurityError). 읽기는 렌더 중에,
 * 쓰기는 이벤트 핸들러에서 일어나므로 어느 쪽이든 던지면 화면이 통째로 죽는다.
 */
export function safeSessionGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSetItem(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    console.warn(`[Storage] Failed to set session "${key}" - storage may be full or unavailable`);
    return false;
  }
}

export const CREDENTIAL_STORAGE_ERROR =
  '이 브라우저에 로그인 정보를 저장할 수 없어요. 시크릿 모드를 끄거나 다른 브라우저에서 다시 시도해 주세요.';
