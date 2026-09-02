/** ApiClient가 던지는 에러 메시지 형태: `API Error {status}: {body}` */
const API_ERROR_PATTERN = /^API Error (\d{3}): ([\s\S]*)$/;

/**
 * 에러에서 HTTP 상태 코드만 꺼낸다. API 에러가 아니면 `null`.
 *
 * 상태 코드를 알아야 할 때는 반드시 이 함수를 쓴다. `message.includes('401')` 같은
 * substring 검사는 응답 본문에 늘 들어 있는 `path`(사용자·리소스 UUID)의 숫자를
 * 상태 코드로 착각한다 — 예: `/analytics/summary/9c401f7a-...`의 404가 401이 된다.
 */
export function getApiErrorStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const match = API_ERROR_PATTERN.exec(error.message);
  return match ? Number(match[1]) : null;
}

/**
 * 조회(read) 실패를 사용자 문장으로 바꾼다.
 *
 * 상태 코드는 반드시 `API Error {status}:` 자리에서만 읽는다. 응답 본문에는
 * `AllExceptionsFilter`가 넣은 `path`(사용자·리소스 UUID 포함)가 항상 들어 있어서,
 * 메시지 전체를 substring으로 훑으면 UUID 안의 `401`·`403`을 상태 코드로 착각한다.
 * 쓰기 실패에는 `getApiErrorMessage`를 쓴다.
 */
export function getQueryErrorMessage(error: unknown, fallback: string): string {
  if (!error) return '';
  if (error instanceof Error) {
    if (error instanceof TypeError || error.message.includes('Network')) {
      return '네트워크 오류가 발생했습니다.';
    }

    const status = getApiErrorStatus(error);
    if (status === 401) return '로그인이 필요합니다.';
    if (status === 403) return '권한이 없습니다.';
  }
  return fallback;
}

/** 한글이 하나라도 있으면 사용자에게 보여주려고 쓴 문구로 간주한다. */
const HANGUL_PATTERN = /[가-힣]/;

/**
 * 상태 코드별 안내 문구. 서버의 내부 메시지(`Unauthorized`, `Forbidden resource`,
 * class-validator의 영문 필드 에러 등)를 사용자에게 그대로 보여주지 않기 위한 대체 문구다.
 */
const STATUS_MESSAGES: Record<number, string> = {
  401: '로그인이 만료되었습니다. 다시 로그인해주세요.',
  403: '권한이 없습니다.',
  404: '요청한 정보를 찾을 수 없습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  500: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  502: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  503: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
};

function parseServerMessage(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { message } = parsed as { message?: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) {
      return message.filter((m): m is string => typeof m === 'string').join(' ');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 쓰기 작업(생성/수정/삭제) 실패를 사용자 문장으로 바꾼다.
 *
 * 서버가 한국어로 내려준 사유(예: "이미 등록된 집 장소가 있습니다.")는 그대로 보여주고,
 * 그 밖의 내부 문자열(JSON 본문·영문 예외 메시지)은 절대 노출하지 않는다.
 * 조회 실패에는 `getQueryErrorMessage`를 쓴다.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  if (error instanceof TypeError || error.message.includes('Network')) {
    return '네트워크 오류가 발생했습니다. 연결을 확인해주세요.';
  }

  const match = API_ERROR_PATTERN.exec(error.message);
  if (!match) return fallback;

  const status = Number(match[1]);
  const statusMessage = STATUS_MESSAGES[status];

  // 인증/권한 오류는 서버 문구보다 안내 문구가 항상 더 유용하다.
  if (status === 401 || status === 403) return statusMessage;

  const serverMessage = parseServerMessage(match[2])?.trim();
  if (serverMessage && HANGUL_PATTERN.test(serverMessage)) return serverMessage;

  return statusMessage ?? fallback;
}
