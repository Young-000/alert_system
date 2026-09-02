import { getApiErrorMessage, getApiErrorStatus, getQueryErrorMessage } from './error-utils';

/**
 * ApiClient가 던지는 에러의 실제 모양.
 * `API Error {status}: {body}` — body는 AllExceptionsFilter가 만든 JSON 문자열.
 */
function apiError(status: number, body: unknown): Error {
  return new Error(`API Error ${status}: ${JSON.stringify(body)}`);
}

describe('getApiErrorMessage', () => {
  it('서버가 내려준 한국어 메시지를 그대로 보여준다', () => {
    const error = apiError(409, {
      statusCode: 409,
      message: '이미 등록된 집 장소가 있습니다.',
      error: 'Conflict',
      path: '/places',
    });

    expect(getApiErrorMessage(error, '장소 등록에 실패했습니다.')).toBe(
      '이미 등록된 집 장소가 있습니다.',
    );
  });

  it('원본 JSON 본문을 절대 사용자에게 노출하지 않는다', () => {
    const error = apiError(400, {
      statusCode: 400,
      message: ['schedule must be a valid cron expression'],
      error: 'Bad Request',
      path: '/alerts',
    });

    const message = getApiErrorMessage(error, '알림 생성에 실패했습니다.');

    expect(message).not.toContain('API Error');
    expect(message).not.toContain('statusCode');
    expect(message).not.toContain('{');
  });

  it('영어 내부 메시지는 노출하지 않고 상태 코드 안내로 대체한다', () => {
    const error = apiError(401, {
      statusCode: 401,
      message: 'Unauthorized',
      path: '/alerts',
    });

    const message = getApiErrorMessage(error, '알림 생성에 실패했습니다.');

    expect(message).toBe('로그인이 만료되었습니다. 다시 로그인해주세요.');
    expect(message).not.toContain('Unauthorized');
  });

  it('403은 권한 안내로 대체한다', () => {
    const error = apiError(403, { statusCode: 403, message: 'Forbidden resource' });

    expect(getApiErrorMessage(error, '실패했습니다.')).toBe('권한이 없습니다.');
  });

  it('500은 서버 오류 안내로 대체한다', () => {
    const error = apiError(500, { statusCode: 500, message: 'Internal server error' });

    expect(getApiErrorMessage(error, '실패했습니다.')).toBe(
      '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('JSON이 아닌 본문이면 fallback을 쓴다', () => {
    const error = new Error('API Error 409: <html>Conflict</html>');

    const message = getApiErrorMessage(error, '알림 생성에 실패했습니다.');

    expect(message).toBe('알림 생성에 실패했습니다.');
    expect(message).not.toContain('html');
  });

  it('게이트웨이 오류는 연결 안내로 대체한다', () => {
    const error = new Error('API Error 502: <html>Bad Gateway</html>');

    const message = getApiErrorMessage(error, '알림 생성에 실패했습니다.');

    expect(message).toBe('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    expect(message).not.toContain('html');
  });

  it('네트워크 오류는 네트워크 안내로 바꾼다', () => {
    expect(getApiErrorMessage(new TypeError('Failed to fetch'), '실패했습니다.')).toBe(
      '네트워크 오류가 발생했습니다. 연결을 확인해주세요.',
    );
  });

  it('Error가 아닌 값이면 fallback을 쓴다', () => {
    expect(getApiErrorMessage('그냥 문자열', '실패했습니다.')).toBe('실패했습니다.');
    expect(getApiErrorMessage(null, '실패했습니다.')).toBe('실패했습니다.');
  });
});

describe('getQueryErrorMessage', () => {
  it('기존 조회 에러 처리는 그대로 유지된다', () => {
    expect(getQueryErrorMessage(null, '불러올 수 없습니다.')).toBe('');
    expect(getQueryErrorMessage(new Error('API Error 401: {}'), '불러올 수 없습니다.')).toBe(
      '로그인이 필요합니다.',
    );
    expect(getQueryErrorMessage(new Error('boom'), '불러올 수 없습니다.')).toBe(
      '불러올 수 없습니다.',
    );
  });
});

/**
 * 상태 코드는 `API Error {status}:` 자리에서만 읽어야 한다.
 * 서버 응답 본문에는 AllExceptionsFilter가 넣은 `path`(사용자 UUID 포함)가 항상 들어 있어서,
 * 메시지 전체를 substring 으로 훑으면 남의 상태 코드를 자기 것으로 착각한다.
 */
describe('getQueryErrorMessage — 상태 코드 오인', () => {
  it('경로에 "401"이 든 404를 로그인 만료로 오인하지 않는다', () => {
    const error = apiError(404, {
      statusCode: 404,
      message: '분석 데이터를 찾을 수 없습니다.',
      path: '/analytics/summary/9c401f7a-1d2e-4b3c-8a90-5f6e7d8c9b0a',
    });

    expect(getQueryErrorMessage(error, '분석 요약을 불러올 수 없습니다.')).toBe(
      '분석 요약을 불러올 수 없습니다.',
    );
  });

  it('경로에 "403"이 든 500을 권한 오류로 오인하지 않는다', () => {
    const error = apiError(500, {
      statusCode: 500,
      message: 'Internal server error',
      path: '/commute/weekly-report/1b403e55-9a7c-4d21-b8f3-0e2a6c4d1f88',
    });

    expect(getQueryErrorMessage(error, '주간 리포트를 불러올 수 없습니다.')).toBe(
      '주간 리포트를 불러올 수 없습니다.',
    );
  });

  it('실제 401/403은 그대로 안내 문구로 바꾼다', () => {
    const unauthorized = apiError(401, { statusCode: 401, message: 'Unauthorized', path: '/x' });
    const forbidden = apiError(403, { statusCode: 403, message: 'Forbidden resource', path: '/x' });

    expect(getQueryErrorMessage(unauthorized, '불러올 수 없습니다.')).toBe('로그인이 필요합니다.');
    expect(getQueryErrorMessage(forbidden, '불러올 수 없습니다.')).toBe('권한이 없습니다.');
  });

  it('네트워크 오류는 그대로 네트워크 안내로 바꾼다', () => {
    expect(getQueryErrorMessage(new TypeError('Network request failed'), '불러올 수 없습니다.')).toBe(
      '네트워크 오류가 발생했습니다.',
    );
  });
});

describe('getApiErrorStatus', () => {
  it('상태 코드 자리에서만 코드를 읽는다', () => {
    expect(getApiErrorStatus(apiError(404, { path: '/x/9c401f7a' }))).toBe(404);
    expect(getApiErrorStatus(apiError(500, { path: '/x/1b403e55' }))).toBe(500);
    expect(getApiErrorStatus(apiError(401, { message: 'Unauthorized' }))).toBe(401);
  });

  it('API 에러 형태가 아니면 null을 준다', () => {
    expect(getApiErrorStatus(new Error('boom'))).toBeNull();
    expect(getApiErrorStatus(new TypeError('Failed to fetch'))).toBeNull();
    expect(getApiErrorStatus('문자열')).toBeNull();
    expect(getApiErrorStatus(null)).toBeNull();
  });
});
