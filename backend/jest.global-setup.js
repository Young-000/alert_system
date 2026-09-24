/**
 * 테스트 러너의 타임존을 프로덕션과 맞춘다.
 *
 * 프로덕션(ECS Fargate)은 UTC 로 돈다. 반면 TZ 를 고정하지 않으면 개발 맥은 KST,
 * CI(ubuntu)는 UTC 라 **같은 스펙이 환경마다 다른 것을 검사한다.**
 * 이 저장소는 KST/UTC 경계 회귀를 여러 번 겪었고(`kst-date.spec.ts` 의
 * getDayOfWeekKST·formatTimeKST 블록이 그 흔적이다), KST 러너에서는
 * 오프셋 보정을 통째로 뺀 구현조차 초록으로 통과한다 — 로컬 TZ 가 이미 KST 라서다.
 *
 * jest 안에서는 `process.env.TZ` 를 런타임에 바꿔도 먹지 않는다(V8 이 TZ 를 캐시한다).
 * 그래서 워커가 뜨기 전인 globalSetup 에서 고정해야 한다.
 */
module.exports = () => {
  process.env.TZ = 'UTC';
};
