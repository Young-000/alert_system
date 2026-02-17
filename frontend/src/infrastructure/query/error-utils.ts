export function getQueryErrorMessage(error: unknown, fallback: string): string {
  if (!error) return '';
  if (error instanceof Error) {
    if (error.message.includes('401')) return '로그인이 필요합니다.';
    if (error.message.includes('403')) return '권한이 없습니다.';
    if (error.message.includes('Network')) return '네트워크 오류가 발생했습니다.';
  }
  return fallback;
}
