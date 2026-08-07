# Alert System - 진행 기록

## [2026-08-08] Auto E2E Review 00:00 — 8건 수정 (Critical 3)

### Completed
- fix(smart-departure): **simple-array 하이드레이션 타입 오류로 조회 전 경로 500**
  (`value.split is not a function`). TypeORM은 simple-array를 조회 시 배열로 돌려주는데
  엔티티가 `string`으로 선언하고 리포지토리가 `.split()`을 걸었다. save()는 인메모리 반환이라
  통과해 "저장은 되는데 조회만 죽는" 형태 — sqljs 왕복 spec으로 재현 후 수정
- fix(routes): **PATCH /routes 체크포인트 id 결락 → 경로 수정마다 도착 기록 전량 유실**.
  UpdateRouteDto가 id 없는 CreateCheckpointDto를 재사용해 CASCADE 방어(survivingIds)가
  무력화됐다. 프론트가 실제로 이 경로를 타는 중이었음. `UpdateCheckpointDto(id?)` 신설 +
  소유권 검증(타 경로 체크포인트 탈취 차단) + `@ArrayMinSize(1)`
- fix(missions): **스트릭이 매일 1로 리셋** — findLatestStreak가 방금 저장한 오늘 행을
  previousStreak으로 참조 (미션 2개 이상이면 어제 5 → 오늘 전부 완료해도 1).
  `findLatestStreak(userId, beforeDate?)` 계약 변경 (오늘 이전 exclusive)
- fix(frontend): 삭제된 routeId로 /commute 진입 시 dead-end(전 버튼 무반응) → 홈 리다이렉트 ·
  알림 로드 실패 시 QuickPresets 노출로 중복 알림톡 생성 가능 → 차단 ·
  알림 기록 로드 실패 시 "기록이 없어요" 오표기 가드 · 미션 체크 실패 무음 → 피드백 배너 ·
  RouteSetupPage 저장 타이머 언마운트 cleanup
- fix(kst): snapshot normalizeDateField가 UTC 그대로 → `toDateOnlyKST()` 헬퍼로 교체
- test: 회귀 방지 19건 추가 (전부 RED 확인 후 수정). backend 1598 → **1612 passed** ·
  frontend 712 → **717 passed**
- Phase 1~8 전수 통과. 착수 시 worktree 43커밋 뒤처짐 → rebase 선행

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트). **11라운드째**.
      이번 백엔드 Critical 수정도 머지만 되고 프로덕션 미반영
- [ ] 프론트 경로 수정 플로우가 체크포인트 id를 안 보냄 — 백엔드는 수용하게 됐지만
      프론트 편집 UX 재설계 필요 (기획 판단)
- [ ] 미션 스트릭 공백일 처리 (며칠 쉬어도 연속 취급) — 리셋 규칙 기획 판단
- [ ] `ScheduleDepartureAlertsUseCase` 미배선 (**13라운드째**, D1). snapshot 상태머신
      절반 도달 불가 + alertsSent 영구 빈 값(중복 발송 방어 부재)은 배선 시 함께
- [ ] Supabase RLS 실측 불가 (MCP SQL 3회 connection timeout, 프로젝트는 ACTIVE_HEALTHY)
- [ ] required status checks 이름 불일치로 auto-merge 불능 — admin 머지 우회 지속

### Notes
- 상세 리포트: `.claude/e2e-reports/auto-review/20260808_000000.md` (gitignored)

## [2026-08-07] Auto E2E Review 16:00 — 1건 수정

### Completed
- fix(streak): **`excludeWeekends`(주말 제외)가 스트릭 판정에서 완전히 무시되던 문제**
  (`commute-streak.entity.ts`). 설정은 `PUT /commute/streak/settings`로 저장·반환까지 되지만
  `recordCompletion`·`getStatus`는 무조건 "어제 기록"만 봤다. 주말 제외를 켠 사용자도
  금→월 기록이 리셋되어 **스트릭이 5를 넘을 수 없고**, 일요일 조회에서는 `broken` 판정과 함께
  currentStreak이 0으로 표시됐다. `lastRequiredRecordDate()`(기본 어제, 주말 제외 시 직전 평일)를
  도입해 두 판정 경로가 공유하게 했다
- test: 회귀 방지 6건 추가 (RED 확인 후 구현). backend 1592 → **1598 passed** · frontend 712 passed
- Phase 1·2·3·4·5·6·7 전수 통과. 착수 시 worktree가 origin/main보다 42커밋 뒤처져 있어 리베이스 선행

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트). **10라운드째** 재확인
      (`aws ecs list-clusters` → 빈 배열). 이번 스트릭 수정도 머지만 되고 프로덕션 미반영
- [ ] `excludeWeekends` 설정 토글 UI 미노출 — API로만 변경 가능. 화면 노출 여부는 기획 판단
- [ ] `ScheduleDepartureAlertsUseCase` 미배선 (**12라운드째**). 배선 = 알림 발송 = 외부 노출 D1 게이트
- [ ] required status checks 이름 불일치로 auto-merge 불능 — admin 머지 우회 지속

## [2026-08-07] Auto E2E Review 08:00 — 2건 수정

### Completed
- fix(mission): **미션 달성률이 100%를 넘어 스트릭이 조용히 끊기던 문제**
  (`daily-check.use-case.ts:126`). 분모는 활성 미션 수, 분자는 그날의 완료 기록 **전부**를
  세고 있었다. 완료한 미션을 비활성화하면 분모만 줄어 150%가 되는데,
  `MissionScore.calculate`는 `completionRate === 100`일 때만 스트릭을 잇기 때문에
  **초과하는 순간 스트릭이 0으로 리셋**된다. 반대 방향도 성립한다 — 활성 미션이
  미완료여도 비활성 미션의 완료 기록이 그 자리를 메워 "오늘 다 했다"로 오판한다.
  삭제된 미션의 잔존 기록도 같은 경로로 분자를 부풀린다.
  화면 경로(`getDailyStatus:56`)는 이미 올바르게 세고 있었고 **저장 경로만 틀렸다** —
  집계를 `countCompleted()` 한 함수로 모아 두 경로가 공유하게 했다
- fix(route-setup): **늦게 도착한 검색 응답이 최신 결과를 덮어쓰던 문제**
  (`use-station-search.ts:38`). 300ms 디바운스만 있고 stale 가드가 없었다.
  더 눈에 띄는 경로는 역을 고른 뒤 `clearSearch()`로 비운 목록을 떠 있던 요청이
  도착해 **되살리는** 것. 같은 앱의 자매 훅 `use-transport-search.ts:49`는
  `AbortController` 가드를 이미 갖고 있었다 — 복사 드리프트
- test: 회귀 방지 5건 추가 (전부 RED 확인 후 작성, 신규 spec 파일 1개).
  backend 1589 → **1592 passed** · frontend 710 → **712 passed**
- Phase 2·3·6·7 전수 통과. 특히 엔티티 36개 ↔ DDL 39개 대조에서
  **누락 0건** (테스트는 `synchronize=true`라 이 격차를 못 본다)

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트, 대표 판단 필요).
      **9라운드째** 재확인 (`aws ecs list-clusters` → 빈 배열).
      이번 백엔드 수정 1건은 머지돼도 프로덕션에 반영되지 않는다
- [ ] 미머지 auto-review PR **24건** (전 라운드와 동일). 원인은 required status checks
      이름 불일치 (`CI / frontend` vs 실제 `frontend`)
- [ ] `ScheduleDepartureAlertsUseCase` 미배선 (**11라운드째**). 3개 공개 메서드 호출부 0건.
      배선 = 실제 알림 발송 = 외부 노출 D1 게이트
- [ ] 남은 무-spec 컨트롤러: `mission`(414줄) · `smart-departure`(168) · `place`(94) ·
      `commute-event`(77) · `widget`(22) — 이번 라운드에 4개를 정독했고 소유권 검사·경계는
      정상이었다. 결함은 use-case 층에서 나왔다

### Notes
- 착수 시 worktree가 `origin/main`보다 **41커밋 뒤**였고 로컬 스테일 커밋 2건이 있었다.
  같은 이름의 PR #180이 이미 MERGED라 리셋이 안전함을 먼저 확인했고,
  두 커밋 모두 `patch contents already upstream`으로 drop됐다
- `frontend/.env.production`이 커밋돼 있다(규칙상 gitignore 대상). 내용은 전부 공개값이고
  Vercel 대시보드 설정 확인 없이 지우면 빌드가 깨지므로 이번엔 손대지 않았다
- 누적 교훈은 `docs/LESSONS.md` 참조

---

## [2026-08-04] Auto E2E Review 00:00 — 8건 수정 (PR #171 머지)

### Completed
- fix(api): **페이지네이션 쿼리 파라미터의 하한 검증이 없어 음수가 SQL `LIMIT`/`OFFSET`에
  그대로 도달**하던 문제. `Math.min(limit, 상한)`만 있고 `Math.max`가 없는 관용구가
  **8개 컨트롤러에 복사**돼 있었다 (insights · notification-history · commute ·
  congestion · challenge · behavior · commute-event · analytics).
  TypeORM은 음수 `take`/`skip`을 검증하지 않고 `LIMIT -1`로 실어 보낸다
  (better-sqlite3로 직접 실측) — **Postgres는 500, 테스트용 SQLite는 "제한 없음"으로
  해석해 전량 반환**. `GET /insights/regions`는 `@Public()`이라 **인증 없이 트리거 가능**했다
- refactor: `presentation/utils/query-param.ts` 신설 — 파싱과 범위 보정을 한 지점으로.
  8곳을 각각 `Math.max`로 덧대는 대신 계약을 한 함수가 갖게 했다
- test: 회귀 방지 19건 추가 (RED 확인 후 작성, 신규 spec 2개).
  `insights.controller.spec.ts`는 해당 컨트롤러 **첫 spec** — 페이지네이션 7건 +
  스케줄러 시크릿 검증 3건(`@Public()` + `timingSafeEqual` 조합이라 회귀 시 피해가 크다).
  backend 1482 → **1501 passed**, frontend **646 passed** (프론트엔드 변경 0)
- 근본 원인: **전역 `ValidationPipe`(`main.ts:64`)는 `@Body()`만 검증한다.**
  `@Query()`는 DTO를 거치지 않아 컨트롤러가 마지막 방어선인데, 그 방어가 빠져 있었다

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트, 대표 판단 필요).
      **8라운드째** 재확인 (`aws ecs list-clusters` → 빈 배열).
      이번 8건 전부 백엔드라 머지는 됐지만 프로덕션에는 반영되지 않는다
- [ ] 미머지 auto-review PR **24건** (전 라운드와 동일). 원인은 required status checks
      이름 불일치 (`CI / frontend` vs 실제 `frontend`) — 이번 PR #171도 CI 양쪽 SUCCESS인데
      BLOCKED이라 `--admin` 머지했다. PR 정리 → 컨텍스트 이름 정정 순서 권장
- [ ] `ScheduleDepartureAlertsUseCase` 미배선 (10라운드째). provider 등록은 있으나
      `scheduleAlerts`·`cancelAlerts`·`rescheduleAlerts` **3개 공개 메서드 전부 호출부 0건**.
      배선 = 실제 알림 발송 = 외부 노출 D1 게이트
- [ ] 남은 무-spec 컨트롤러: `mission`(408줄) · `smart-departure`(168) · `place`(94) ·
      `commute-event`(76) · `briefing`(74) · `widget`(22)

### Notes
- 착수 시 worktree가 `origin/main`보다 31커밋 뒤처져 있었다. 로컬 스테일 커밋 2건은
  내용이 이미 upstream에 반영된 중복임을 확인하고 버렸다. 같은 이름의 열린 PR은 없었다
- 누적 교훈은 `docs/LESSONS.md` 참조

---

## [2026-08-03] Auto E2E Review 08:00 + 16:00 — 3건 수정 (PR #169 머지)

### Completed
- fix(widget): 저녁에 위젯을 열면 **오늘 아침 출근 건**이 뜨던 문제
  (`calculate-departure.use-case.ts:211`). 오름차순 배열에서 `upcoming[0]`을
  "most recent"로 쓰고 있었다 — 주석과 코드가 정확히 반대였다.
  `status`가 `departed`로 바뀌려면 사용자가 "출발"을 눌러야 해서 **기본 경로**였다
- fix(widget): 그 결과가 **"출발까지 -690분!"** 으로 찍히던 문제
  (`briefing-advice.service.ts:376`). `minutesUntilDeparture`는 부호 있는 값인데
  음수가 `<= 10`을 통과해 문구에 그대로 박혔다. 부호별 분기 + 기한 초과 조기 반환
- fix(commute): **도착 기록이 임의 순서로 실려 와 구간 소요시간·지연이 부풀려지던 문제**
  (`commute-session.repository.ts:154`). 6개 finder가 `relations`만 걸고 ORDER BY가
  없는데, `manage-commute-session.use-case.ts:113`은 배열의 마지막 원소를 직전 도착으로
  보고 `durationFromPrevious`를 계산해 **DB에 영구 저장**한다. 그 값이 다시 구간별
  통계(`calculate-route-analytics.use-case.ts:227`)의 입력이 된다.
  전용 리포지토리·형제 리포지토리·테이블 인덱스가 전부 시간순을 전제하고 있었고
  **여기만 빠져 있었다**
- test: 회귀 방지 16건 추가 (전부 RED 확인 후 작성, 신규 spec 파일 2개).
  backend 1466 → **1482 passed**, frontend **646 passed**

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트, 대표 판단 필요).
      **7라운드째** 재확인 (`ecs list-clusters` 빈 배열 · ECR `RepositoryNotFoundException`).
      이번 3건 전부 백엔드라 머지는 됐지만 프로덕션에는 반영되지 않는다
- [ ] 미머지 auto-review PR **24건**. 원인은 required status checks 이름 불일치
      (`CI / frontend` vs 실제 `frontend`) — 리포 설정 한 줄이라 인프라 게이트와 무관.
      **다만 22건이 auto-merge 무장 상태라 고치는 순간 2월치까지 한꺼번에 쏟아진다**:
      PR 정리 → 컨텍스트 이름 정정 순서로
- [ ] `ScheduleDepartureAlertsUseCase` 미배선 (provider 등록만 있고 호출부 0건)
- [ ] 터치 타겟 44px 미달 6건 — 실화면 증거 필요

## [2026-08-03] Auto E2E Review — 2건 수정 (PR #167 머지)

### Completed
- fix(mission): 새 미션의 `sortOrder`를 기존 "개수"로 잡아, 중간 미션을 지운 뒤
  만들면 남아 있는 미션과 값이 겹치던 문제 교정 (`max(기존)+1`로 교체).
  겹치면 목록 정렬이 DB 임의 순서가 되고, **순서 변경 버튼이 같은 값을 두 번 써서
  200으로 성공하며 아무것도 하지 않았다** — 에러도 뜨지 않아 무반응으로 보였다
- fix(mission): 유형별 3개 제한이 활성 미션만 세어, 하나를 끄고 새로 만든 뒤 다시 켜면
  4개가 되던 우회 경로 차단 (프론트엔드는 비활성 포함 3개에서 막고 있었다 — 앞뒤 불일치)
- fix(db): 등록 엔티티 36개 중 **11개에 `CREATE TABLE`이 아예 없어** 프로덕션
  (`synchronize=false`)에서 42P01로 500나던 스키마 갭을 닫는 마이그레이션 신규 작성
  (`20260803_add_mission_challenge_cache_tables.sql`) — `MissionController`
  엔드포인트 10개 전부가 대상이었다. RLS 포함
- refactor(mission): 버그 원인이던 `countByUserAndType`(활성만 카운트) 제거 — 호출부 0
- test: 회귀 방지 7건 추가 (RED 7건 확인 후 작성). backend 1462 → 1466 passed

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트, 대표 판단 필요).
      5라운드째 재확인 (`ecs list-clusters` 빈 배열 · ECR `RepositoryNotFoundException`).
      **이번엔 마이그레이션이라 적용돼야 의미가 있다** — 미션 기능의 프로덕션 500이
      파일만 추가된 채 남는다
- [ ] 신규 마이그레이션을 실제 Postgres에서 실행 검증 (엔티티↔DDL 전수 대조와
      구문 구조 검사는 통과했으나 DB 적용은 미실행 — 적용 자체가 게이트)
- [ ] 미머지 auto-review PR **24건**으로 악화 (최고령 2026-03-04).
      원인은 required status checks 이름 불일치(`CI / frontend` vs 실제 `frontend`) —
      리포 설정 한 줄이라 인프라 게이트와 무관하게 풀 수 있다
- [ ] 터치 타겟 44px 미달 6건 — 실화면 증거 필요

### Notes
- 테스트 DB가 `synchronize: true`(sqljs)라 **DDL 부재는 원리적으로 테스트가 못 잡는다.**
  엔티티 목록과 마이그레이션 DDL의 집합 차이를 `comm -23`으로 대조하는 것이 유일한 탐지법
- 미션 기능은 컨트롤러·리포지토리가 여전히 spec 0 — 다음 라운드 후보

## [2026-08-02] Auto E2E Review — 3건 수정

### Completed
- fix(route): 경로 수정이 `route_checkpoints`를 전량 삭제해 `ON DELETE CASCADE`로
  도착 기록까지 지우던 데이터 유실 제거 — 이름만 바꿔도, 다른 경로를 대표로 지정해도 발생했다
- fix(route): 대표 경로 해제 시 `totalExpectedDuration`·`createdAt`·checkpoint id를
  떨어뜨려 건드리지도 않은 경로의 값이 유실되던 문제 교정
- fix(stats): 날씨 미기록 세션을 '맑음'으로 채워 넣어 "비 오는 날이 더 빠르다"로
  판정이 역전되던 문제 교정 (미기록 세션을 날씨별 통계에서 제외)
- test: 회귀 방지 10건 추가 (634 FE / 1461 BE) — backend TZ 5종·frontend 4종 동일

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트, 대표 판단 필요).
      이번 수정 2건이 DB 데이터 유실 방지라 배포 지연 비용이 크다
- [ ] 체크포인트 목록 편집은 여전히 기록이 사라진다 — `CreateCheckpointDto`에 `id` 없음 (설계 판단)
- [ ] 날씨 데이터 자체가 수집되지 않음 — 프론트가 `startSession`에 `weatherCondition` 미전송 (제품 판단)
- [ ] `ScheduleDepartureAlertsUseCase` 미배선 — 스마트 출발 사전 알림이 생성되지 않음
- [ ] 터치 타겟 44px 미달 6건 (실화면 확인 필요)

### Notes
- worktree base가 23커밋 뒤처져 있어 rebase 후 착수 (6회 연속 재발)
- 신규 결함 3건 모두 spec 0개 모듈에서 나왔다 (4라운드 연속 같은 패턴)
- 가설 1건은 테스트로 재현에 실패해 기각했다 (대시보드 탭 되돌림) — 불변조건 테스트로 대체

---

## [2026-07-31] Auto E2E Review — 4건 수정

### Completed
- fix(alert): `updateSchedule()`이 파생 필드 `notificationTime`을 갱신하도록 수정
- fix(route): 최속 경로가 아닌데 "가장 짧아요"라고 단정하던 추천 문구 판정 교정
- fix(air-quality): 경기 분기에 가려 도달 불가였던 인천 시도 판정 순서 교정
- fix(missions): 순서 변경의 무음 실패 제거 — 순차 요청 + 실패 알림 + 재진입 가드
- test: 회귀 방지 13건 추가 (620 FE / 1437 BE, TZ 3종 동일)

### Next Steps
- [ ] 🚨 AWS 백엔드 인프라 부재 → 배포 불가 (D1 게이트, 대표 판단 필요)
- [ ] `ScheduleDepartureAlertsUseCase` 미배선 — 스마트 출발 사전 알림이 생성되지 않음
- [ ] 터치 타겟 44px 미달 6건 (실화면 확인 필요)

### Notes
- worktree base가 21커밋 뒤처져 있어 rebase 후 착수 (4회 연속 재발)

---

## 현재 상태

- 2026-07-10 `17b9022` chore(repo): auto-review 리포트 gitignore + PROGRESS 동기화


- 2026-03-13 `37e1a18` fix(e2e): auto-review 20260313 - 2건 수정 (#123)
- 2026-03-12 `e46c7ba` fix(e2e): auto-review 20260312 (#122)
- 2026-03-11 `e1fb624` chore(e2e): auto-review 20260311 - 전 Phase 통과 (#121)
- 2026-03-11 `dffc393` fix(e2e): auto-review 20260311 (#120)
- 2026-03-11 `55a29a2` fix(frontend): useEffect cleanup 및 reloadAlerts await 수정 (#118)
- 2026-03-11 `d1e9ca4` fix(frontend): 코드 품질 체크리스트 7건 수정 (#117)
- 2026-03-11 `bde8b7a` fix(e2e): auto-review 20260311 - 1건 수정 (#116)
- 2026-03-11 `c8a8039` chore(e2e): auto-review 20260311 - 0건 수정 (#115)
- 2026-03-10 `6f8d162` chore(e2e): auto-review 20260310 - 0건 수정 (#112)
- 2026-03-09 `b223ed3` fix(e2e): auto-review 20260309 - 3건 수정 (#110)
- 2026-03-08 `32b97b2` fix(e2e): auto-review 20260308 - 1건 수정 (#109)
- 2026-03-08 `c08301b` chore(e2e): auto-review 20260308 - 0건 수정 (코드 변경 없음) (#108)
- 2026-03-08 `e6b5d09` chore(e2e): auto-review 20260308 - all pass (#107)
- 2026-03-07 `3fffe7f` chore(e2e): auto-review 20260307 - 0건 수정 (#105)
- 2026-03-06 `a0b92fb` fix(e2e): auto-review 20260306 - 1건 수정 (#104)
- 2026-03-05 `1f27385` fix(e2e): auto-review 20260305 - 9건 수정 (#101)
- 2026-03-04 `3ace139` fix(e2e): auto-review 20260304 - 18건 수정 (#99)
- 2026-03-02 `503154b` fix(e2e): auto-review 20260302 - 3건 수정 (#97)
- 2026-03-02 `36cd139` feat(community): add anonymous route community + checkpoint tips — P4-3 (#96)
- 2026-03-02 `a09dea7` feat(insights): add regional commute insights — P4-2 full-stack (#95)
- 2026-03-02 `109d8a5` feat(frontend): add congestion chips + route overlay UI (E1~E4) (#P4-1) (#94)
- 2026-03-02 `1ca1ee8` feat(backend): add segment congestion pipeline — Bayesian aggregation (A1~G1) (#P4-1) (#93)
- 2026-03-02 `711bfce` feat(frontend): add delay alert banner + alternative route UI (FE-1~FE-9) (#P3-5) (#92)
- 2026-03-02 `d1c0cbd` feat(backend): add alternative route suggestion engine (BE-1~BE-11) (#P3-5) (#91)
- 2026-03-02 `78eb08d` feat(frontend): add pattern insights card + analysis page (FE-1~FE-9) (#90)

- 완성도: 95%
- 상태: 활성 (active) - 워크스페이스 내 가장 복잡한 프로젝트
- Phase 4 (4/4) 진행 중 — P4-4만 남음

## 마일스톤

### v1.0 - Render 시대 (완료)
- [x] NestJS 백엔드 기본 구조
- [x] React 프론트엔드 (Vite)
- [x] Supabase DB 연동
- [x] 기본 알림 기능
- [x] Render 배포

### v2.0 - AWS 마이그레이션 (완료)
- [x] ECS Fargate 배포
- [x] CloudFront HTTPS 제공
- [x] ALB 로드 밸런싱
- [x] ECR 컨테이너 레지스트리
- [x] SSM Parameter Store 시크릿 관리
- [x] EventBridge Scheduler (영구 스케줄)
- [x] Solapi 카카오 알림톡 연동
- [x] Terraform IaC 설정
- [x] PWA Push 알림
- [x] 경로 설정 (템플릿/커스텀)
- [x] 출퇴근 트래킹
- [x] 드래그앤드롭 UI (@dnd-kit)

### Native App — Phase 1: 위젯 MVP (완료)
- [x] Expo 프로젝트 셋업 + 네비게이션 + JWT 인증 (#45)
- [x] 홈 화면 (출근 브리핑 + 실시간 교통 + 경로) (#46)
- [x] 알림 설정 화면 CRUD + 토글 (#47)
- [x] 경로 설정 + 설정 + 알림 기록 화면 (#48)
- [x] FCM/APNs 푸시 알림 (#49)
- [x] iOS WidgetKit (Small + Medium) (#50)
- [x] Android Widget (#51)
- [x] 앱 아이콘 + 스플래시 + 스토어 에셋 (#52)

### Native App — Phase 2: 스마트 출발 (완료)
- [x] Geofence 자동 출퇴근 감지 (#53)
- [x] 스마트 출발 알림 (#54)
- [x] 상황 인식 브리핑 — 날씨/미세먼지 기반 조언 (#79)
- [x] 퇴근 모드 — 시간 기반 자동 전환 (#80)

### Native App — Phase 3: 출퇴근 코치 (완료)
- [x] 패턴 분석 ML — 5-tier Bayesian 예측 (#89, #90)
- [x] 미션 시스템 — CRUD + 토글 + 리오더 (#65~#78)
- [x] 스트릭 강화 + 마일스톤 배지 (#81)
- [x] 주간/월간/요약 리포트 (#82)
- [x] 대안 경로 제시 — 지연 감지 + 대안 경로 UI (#91, #92)

### Native App — Phase 4: 데이터 플라이휠 (진행 중)
- [x] 구간별 혼잡도 — Bayesian 집계 + CongestionChip UI (#93, #94)
- [x] 지역별 출퇴근 인사이트 — grid 클러스터링 + 대시보드 (#95)
- [x] 소셜 기능 — 익명 이웃 커뮤니티 + 체크포인트 팁 (#96)
- [ ] **P4-4: 예측 고도화 — 네트워크 효과 기반 정확도 향상**

### 인프라 (선택사항)
- [ ] ElastiCache Redis 활성화 (BullMQ 큐)
- [ ] 커스텀 도메인 (Route 53 + ACM)

## 작업 이력
| 날짜 | 작업 내용 | 비고 |
|------|----------|------|
| 2026-03-02 | P4-3 소셜 커뮤니티 완료 (#96) | Phase 4 거의 완료 |
| 2026-03-02 | E2E auto-review 3건 수정 (#97) | 자동 리뷰 반영 |
| 2026-02-28 | P4-2 지역별 인사이트 (#95) | grid 클러스터링 |
| 2026-02-27 | P4-1 혼잡도 파이프라인 (#93, #94) | Bayesian 집계 |
| 2026-02-25 | P3-5 대안 경로 엔진 (#91, #92) | 지연 감지 + UI |
| 2026-02-24 | P3-4 리포트 페이지 (#82) | 주간/월간/요약 |
| 2026-02-23 | P3-3 마일스톤 배지 (#81) | 배지 컬렉션 |
| 2026-02-22 | P3-1 패턴 ML + 인사이트 (#89, #90) | 5-tier Bayesian |
| 2026-02-20 | Phase 2 완료 — 퇴근모드, 브리핑 (#79, #80) | 시간 기반 전환 |
| 2026-02-13 | 문서 표준화 (CLAUDE.md, docs/) | 워크스페이스 정리 |

## 다음 단계
1. **P4-4 예측 고도화** — 네트워크 효과로 사용자 수 비례 정확도 향상
2. ElastiCache Redis 활성화 (선택)
3. 커스텀 도메인 설정 (선택)

---
*마지막 업데이트: 2026-03-03*
