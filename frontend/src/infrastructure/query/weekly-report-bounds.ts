/**
 * 주간 리포트로 거슬러 올라갈 수 있는 최대 주차 수.
 *
 * 이 값은 우리가 고르는 게 아니라 서버가 정한다 — `GetWeeklyReportUseCase`는 0~4 밖의
 * weekOffset을 400으로 거절하고, `useWeeklyReportQuery`는 `retry: false`라 그 400이
 * 곧바로 에러 화면이 된다. 주 이동 버튼의 상한을 화면마다 따로 두면, 큰 쪽을 쓰는 화면이
 * 사용자를 서버가 거부하는 주차로 데려간다.
 *
 * 의존성 없는 파일로 따로 둔 이유: 훅 모듈(`use-weekly-report-query`)에 함께 두면
 * 그 모듈을 `vi.mock`하는 테스트마다 이 상수가 사라져 화면이 터진다. 상한은
 * 아무도 mock할 이유가 없는 자리에 있어야 테스트가 실제 상한을 검증한다.
 */
export const MAX_WEEK_OFFSET = 4;
