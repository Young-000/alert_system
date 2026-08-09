import type {
  CheckpointResponse,
  RouteType,
  UpdateCheckpointDto,
  UpdateRouteDto,
} from '@infrastructure/api/commute-api.client';
import type { SelectedStop } from './types';

/**
 * 경로 저장 요청에 담을 `isPreferred` 값을 정한다.
 *
 * 서버는 이 필드를 생략하면 기존 값을 보존한다(`dto.isPreferred ?? existing.isPreferred`).
 * 그래서 수정 요청에는 담지 않는다 — 담으면 "경로가 2개 이상이니 false"라는
 * 생성 시점의 규칙이 그대로 적용돼 사용자가 지정한 대표 경로가 소리 없이 풀린다.
 *
 * @returns 생성이면 대표 여부, 수정이면 undefined(= 서버가 보존)
 */
export function resolvePreferredFlag(params: {
  isEditing: boolean;
  existingRouteCount: number;
}): boolean | undefined {
  if (params.isEditing) return undefined;
  return params.existingRouteCount === 0;
}

/**
 * 선택된 정거장들로 저장용 체크포인트 목록을 만든다.
 *
 * 수정 저장에서는 기존 체크포인트 id를 반드시 실어 보내야 한다 — id가 없으면
 * 서버가 삭제→재삽입하고 ON DELETE CASCADE로 도착 기록이 전부 사라진다.
 * 정거장은 편집 로드 시 담아둔 `checkpointId`로, 집/회사는 checkpointType
 * 매칭으로 기존 id를 찾는다. 생성 시(existingCheckpoints 없음)에는 id를 담지 않는다.
 */
export function buildCheckpoints(
  stops: readonly SelectedStop[],
  type: RouteType,
  existingCheckpoints?: readonly CheckpointResponse[],
): UpdateCheckpointDto[] {
  const isToWork = type === 'morning';
  // 생성용 CreateCheckpointDto에는 id가 없다(forbidNonWhitelisted로 400) —
  // 수정 컨텍스트(existingCheckpoints 존재)에서만 id를 싣는다.
  const isEditing = existingCheckpoints !== undefined;
  const existingIdOfType = (t: 'home' | 'work'): string | undefined =>
    existingCheckpoints?.find((cp) => cp.checkpointType === t)?.id;
  const stopId = (stop: SelectedStop): string | undefined =>
    isEditing ? stop.checkpointId : undefined;

  const checkpoints: UpdateCheckpointDto[] = [];
  let seq = 1;

  const startType = isToWork ? 'home' as const : 'work' as const;
  checkpoints.push({
    id: existingIdOfType(startType),
    sequenceOrder: seq++,
    name: isToWork ? '집' : '회사',
    checkpointType: startType,
    transportMode: 'walk',
  });

  for (const stop of stops) {
    checkpoints.push({
      id: stopId(stop),
      sequenceOrder: seq++,
      name: stop.name,
      checkpointType: stop.transportMode === 'subway' ? 'subway' : 'bus_stop',
      linkedStationId: stop.transportMode === 'subway' ? stop.id : undefined,
      linkedBusStopId: stop.transportMode === 'bus' ? stop.id : undefined,
      lineInfo: stop.line,
      transportMode: stop.transportMode,
    });
  }

  const endType = isToWork ? 'work' as const : 'home' as const;
  checkpoints.push({
    id: existingIdOfType(endType),
    sequenceOrder: seq,
    name: isToWork ? '회사' : '집',
    checkpointType: endType,
  });

  return checkpoints;
}

/**
 * 경로 수정 PATCH 페이로드를 만든다.
 *
 * 서버 UpdateRouteDto에는 userId가 없고 전역 파이프가 forbidNonWhitelisted라
 * userId를 담으면 요청 전체가 400이 된다. isPreferred도 담지 않는다
 * (생략하면 서버가 기존 값을 보존 — resolvePreferredFlag 주석 참조).
 */
export function buildUpdateRouteDto(params: {
  name: string;
  routeType: RouteType;
  stops: readonly SelectedStop[];
  existingCheckpoints: readonly CheckpointResponse[];
}): UpdateRouteDto {
  return {
    name: params.name,
    routeType: params.routeType,
    checkpoints: buildCheckpoints(params.stops, params.routeType, params.existingCheckpoints),
  };
}
