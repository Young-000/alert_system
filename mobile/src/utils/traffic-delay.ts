/**
 * "교통 지연이 있는가"의 판정은 **서버가 정한다.**
 *
 * 서버는 위젯에 내려보내는 값을 `realtimeAdjustmentMin > 0` 으로 계산한다
 * (`calculate-departure.use-case.ts` 의 `dto.hasTrafficDelay`). 그런데
 * Live Activity 쪽은 같은 숫자를 받아 `> 5` 로 다시 판정하고 있었다 —
 * 같은 순간 잠금화면의 위젯은 "지연", Live Activity 는 "정상"이 된다
 * (1~5분 지연 구간). 화면이 서버의 기준을 재계산하면 답이 갈린다.
 *
 * 문구도 같은 자리에서 정한다. 보정값은 **음수일 수 있고**(교통 원활),
 * 이전 코드는 그 값을 그대로 `+${n}분 지연` 에 끼워 `+-4분 지연` 이라는
 * 말이 안 되는 문구를 만들었다. 지연이 아닐 때는 문구를 주지 않는다.
 *
 * 카드(`SmartDepartureCard`)는 이미 `> 0` = 지연 / `< 0` = 원활로 서버와
 * 같은 기준을 쓰고 있다 — 어긋나 있던 것은 Live Activity 하나였다.
 *
 * 현재 서버의 `realtimeAdj` 는 실시간 API 연동 전이라 항상 0 이다
 * (`calculate-departure.use-case.ts`: "placeholder: 0 for now").
 * 그래서 오늘은 어느 기준을 써도 결과가 같지만, 연동되는 순간
 * 위 두 결함이 그대로 화면에 나온다.
 */
export type TrafficDelay = {
  hasTrafficDelay: boolean;
  /** 지연일 때만 문구를 준다. 아니면 undefined — 호출부가 그대로 넘길 수 있다. */
  trafficDelayMessage?: string;
};

export function resolveTrafficDelay(realtimeAdjustmentMin?: number): TrafficDelay {
  // 서버와 같은 기준. undefined(값 없음)와 0(보정 없음)은 둘 다 지연이 아니다.
  if (realtimeAdjustmentMin === undefined || realtimeAdjustmentMin <= 0) {
    return { hasTrafficDelay: false };
  }

  return {
    hasTrafficDelay: true,
    trafficDelayMessage: `+${realtimeAdjustmentMin}분 지연`,
  };
}
