# Alert System — LESSONS

> 비자명한 교훈만 1줄로 상단 append. 자명한 요약 금지.

- 2026-07-30 자동 리뷰 브랜치는 **날짜 기준 브랜치명이 재사용**된다 — 착수 시 `gh pr list`로
  같은 브랜치의 미머지 PR이 있는지 먼저 확인할 것. 로컬 브랜치가 stale한 상태로 push하면
  직전 리뷰 결과를 덮어쓴다 (2026-07-30 08:00 리뷰에서 PR #159가 OPEN인 채로 발견됨).
- 2026-07-30 ECS 컨테이너에 `TZ`가 없어 Node가 UTC로 돈다. `getHours()`/`getDay()`/`getDate()`로
  KST를 판정하는 코드는 전부 9시간 밀린 버그다 — 해법은 `ENV TZ` 추가가 아니라
  `domain/utils/kst-date.ts`의 TZ 무관 헬퍼(`toKSTWallClock` + `getUTC*`) 사용. 환경변수에
  정합성을 의존하면 로컬/CI에서 버그가 다시 숨는다.
- 2026-07-30 시각 관련 테스트에서 `new Date('2026-02-18T08:00:00')`(오프셋 없음)과
  `date.setHours(8, 0)`는 **서버 로컬 시간**으로 해석된다 → 버그 있는 로컬시간 코드를 통과시킨다.
  반드시 오프셋을 명시(`+09:00`/`Z`)하거나 `atTimeKST()`를 쓸 것. 이 함정 때문에 KST 결함
  8곳이 1398개 테스트를 통과한 채 프로덕션에 있었다.
- 2026-07-30 기상청(KMA) API의 `base_date`·`base_time`·`fcstDate`는 모두 KST 기준이다.
  UTC로 만들면 9시간 과거를 조회하고, `fcstDate` 필터는 KST 00:00~08:59 구간에 당일 예보를
  전부 걸러낸다 (= 출근 시간대에 예보가 빈다).
- 2026-07-30 신규 결함은 **spec 파일이 없는 모듈**에 몰려 있다 (이번 8곳 중 6곳).
  Phase 1 GREEN 이후 `find src -name '*.ts' ! -name '*.spec.ts'`로 spec 없는 핵심 모듈부터 정독할 것.
