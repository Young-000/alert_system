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
