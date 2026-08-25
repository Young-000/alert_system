import { ApiError } from '@/services/api-client';

/**
 * 서버가 4xx/5xx 본문에 실어 보낸, 사람이 읽을 메시지를 꺼낸다.
 *
 * 백엔드 `AllExceptionsFilter`는 `{ statusCode, message, path }`로 내려보내고,
 * `message`는 문자열이거나 (ValidationPipe의 경우) 문자열 배열이다.
 *
 * 꺼낼 수 없으면 `null` — 호출부가 자기 화면에 맞는 문구를 고르라는 뜻이다.
 * 상태 코드별 기본 문구를 여기서 정하지 않는 이유는, 같은 409라도 화면마다
 * 뜻이 다르기 때문이다 (가입=이메일 중복, 도전=참가 상한).
 */
export function serverMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;

  try {
    const parsed = JSON.parse(error.body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message[0] ?? null;
    return parsed.message ?? null;
  } catch {
    // 본문이 JSON이 아니면 (프록시 HTML 에러 페이지 등) 꺼낼 게 없다.
    return null;
  }
}
