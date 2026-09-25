import type {
  SmartDepartureSnapshotDto,
  SmartDepartureTodayResponse,
  SnapshotStatus,
} from '@/types/smart-departure';

/** Live Activity 를 자동 종료하는 임계값 (출발 시각 이후 분). */
export const LIVE_ACTIVITY_TIMEOUT_MIN = 30;

/**
 * Live Activity 로 띄울 수 있는 스냅샷 상태.
 *
 * **서버 위젯과 같은 집합이다.** `getWidgetDepartureData` 는
 * `scheduled | notified` 만 남기고 고른다
 * (`backend/src/application/use-cases/calculate-departure.use-case.ts`).
 */
const LIVE_ELIGIBLE_STATUSES: readonly SnapshotStatus[] = ['scheduled', 'notified'];

function isLiveEligible(snapshot: SmartDepartureSnapshotDto): boolean {
  return LIVE_ELIGIBLE_STATUSES.includes(snapshot.status);
}

function minutesUntil(isoDatetime: string, nowMs: number): number {
  return Math.round((new Date(isoDatetime).getTime() - nowMs) / 60_000);
}

/**
 * 오늘의 스냅샷 중 지금 Live Activity 로 띄워야 할 출발을 고른다.
 *
 * `GET /smart-departure/today` 는 오늘 것이면 이미 지난 출발도 그대로 돌려주므로
 * (`calculate-departure.use-case.ts` `getTodayDeparture` — 시간 필터 없음),
 * `commute ?? return` 로 고르면 출근 설정이 있는 날에는 퇴근이 영영 선택되지 않는다.
 *
 * 규칙은 백엔드 위젯(`getWidgetDepartureData`)과 같다 — 다음 출발, 전부 지났으면
 * 가장 최근 것. 다만 경계는 `>= now` 가 아니라 자동 종료 임계값을 쓴다. 출발 직후
 * 몇 분은 아직 Activity 를 띄워 둬야 하는 구간이라 `>= now` 로 자르면 조기 전환된다.
 *
 * **상태 필터가 이 함수의 핵심이다.** `getTodayDeparture` 는 위젯 경로와 달리
 * 상태를 거르지 않고(`findTodayByUserId` 도 `userId + departureDate` 만 본다),
 * 취소·만료·출발완료 스냅샷을 그대로 내려보낸다. 그래서 화면 쪽이 거르지 않으면
 * **사용자가 취소한 출발이 잠금화면에 카운트다운으로 뜬다** — Live Activity 는
 * 사용자가 직접 지우기 전까지 남는 상시 UI라 되돌리기도 어렵다.
 *
 * 같은 모바일 안에서도 카드(`SmartDepartureCard`)는 이미 `status !== 'expired'` 로
 * 거르고 있었다. 어긋나 있던 것은 Live Activity 경로 하나다
 * (`traffic-delay.ts` 가 고친 결함과 같은 자리·같은 형태).
 */
export function selectLiveSnapshot(
  data: SmartDepartureTodayResponse,
  nowMs: number,
): SmartDepartureSnapshotDto | null {
  const byDeparture = [data.commute, data.return]
    .filter((snapshot): snapshot is SmartDepartureSnapshotDto => !!snapshot)
    .filter(isLiveEligible)
    .sort(
      (a, b) =>
        new Date(a.optimalDepartureAt).getTime() -
        new Date(b.optimalDepartureAt).getTime(),
    );

  const live = byDeparture.find(
    (snapshot) =>
      minutesUntil(snapshot.optimalDepartureAt, nowMs) >
      -LIVE_ACTIVITY_TIMEOUT_MIN,
  );

  return live ?? byDeparture[byDeparture.length - 1] ?? null;
}
