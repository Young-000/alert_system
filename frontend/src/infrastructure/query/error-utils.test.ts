import { getApiErrorMessage, getQueryErrorMessage } from './error-utils';

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
