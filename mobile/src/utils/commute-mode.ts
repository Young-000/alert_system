import type { CommuteMode } from '@/hooks/useCommuteMode';

/**
 * 홈의 모드 배지를 탭했을 때 수동 지정값(`manualMode`)이 다음에 가질 값.
 * `null`은 "시각으로 자동 판정"을 뜻한다.
 *
 * 배지는 자동 ⇄ 수동(반대 방향) 두 상태만 오간다:
 *
 * ```
 * 자동(예: 출근) --탭--> 수동 퇴근 --탭--> 자동(출근) --탭--> ...
 * ```
 *
 * **자동으로 돌아오는 탭이 없으면 시각 판정이 화면 수명 동안 죽는다.** 홈은 탭
 * 화면이라 한 번 뜨면 계속 살아 있어서(`useCommuteMode`의 주석), 오전에 배지를
 * 한 번 누른 사용자는 저녁이 되어도 "출근 모드"에 갇힌다. 모드가 경로 선택까지
 * 내려가므로(`routeTypeForMode`) 그때 화면에 뜨는 것은 **출근 경로의 버스·지하철
 * 도착 시각**이다 — 퇴근길에 출근길 정보를 읽는다.
 *
 * 웹이 정본이다. 웹은 `CommuteSection`의 경로 유형 세그먼트에 `'자동'`을 1급
 * 선택지로 두어(`frontend/.../CommuteSection.tsx`) 항상 자동으로 돌아갈 수 있다.
 * 모바일에는 그 세그먼트가 없으므로 배지 자체가 복귀 경로를 가져야 한다.
 *
 * 야간(`night`)은 수동으로 지정하지 않는다 — 자동값일 때만 나오는 상태이고,
 * 거기서 탭하면 출근길을 미리 보는 것이 사용자의 의도다.
 */
export function nextManualMode(
  manualMode: CommuteMode | null,
  autoMode: CommuteMode,
): CommuteMode | null {
  if (manualMode !== null) return null;
  return autoMode === 'commute' ? 'return' : 'commute';
}

/**
 * 배지의 접근성 라벨에 붙일 동작 안내.
 * 누르면 무엇이 되는지 말한다 (UX 라이팅 원칙 1 — Predictable hint).
 */
export function modeBadgeActionHint(isManualOverride: boolean): string {
  return isManualOverride ? '탭하여 자동으로 돌아가기' : '탭하여 전환';
}
