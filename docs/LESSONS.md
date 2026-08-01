# Alert System — LESSONS

> 비자명한 교훈만 1줄로 상단 append. 자명한 요약 금지.

- 2026-08-02 **유니온 타입의 어떤 멤버가 생산자에서 한 번도 반환되지 않으면, 그 값에 걸린 UI는
  전부 dead code다.** `StreakStatus`의 `at_risk`가 그랬다 — 프론트에 문구·스타일·`role="alert"`·
  점 강조까지 4곳이 구현돼 있는데 `getStatus()`가 그 값을 반환한 적이 없어
  **스트릭이 끊기기 직전인 사용자에게만** 아무 문구도 안 떴다(빈 문자열). 타입은 4갈래인데
  테스트·화면은 멀쩡해 보인다. **유니온을 보면 멤버별로 "이 값을 반환하는 코드"를 grep할 것.**
- 2026-08-02 **spec 파일이 있다고 커버리지가 있는 게 아니다 — 기존 테스트가 버그를 고정하고
  있을 수 있다.** `'어제 기록이 있으면 active 상태다'`가 정확히 위 결함을 못 박아
  1461개 테스트가 GREEN인 채로 기능이 죽어 있었다. "spec 없는 모듈부터"라는 직전 교훈을
  따르되, **테스트가 코드를 베낀 것인지(의도를 검증하는지) 한 번은 의심할 것.**
- 2026-08-02 **`if (x === 1)` 안에서만 갱신하는 파생 필드는 "그 조건을 건너뛰는 경로"를 의심하라.**
  `bestStreakStart`가 `currentStreak === 1`일 때만 갱신됐는데, 기존 기록을 경신하는 순간은
  항상 `>= 2`라 시작일이 옛 스트릭에 남아 실재하지 않는 49일 구간이 저장됐다.
  구간·범위 필드는 조건부로 찍지 말고 **원본에서 파생**시킬 것(`streakStartDate`).
- 2026-08-02 **"지우고 다시 넣기"는 자식 테이블에 `ON DELETE CASCADE`가 걸린 순간 데이터 유실이 된다.**
  `commute-route.repository.update()`가 체크포인트를 전량 delete 후 **같은 id로** 재삽입했는데,
  `checkpoint_records`가 CASCADE라 도착 기록만 조용히 사라졌다 — 부모는 복구되니 화면상 정상이고
  테스트도 통과한다(SQLite는 기본적으로 FK 미강제). **자식 행이 붙는 테이블에 delete-all이
  보이면 마이그레이션의 `REFERENCES ... ON DELETE`를 반드시 확인할 것.**
- 2026-08-02 **부분 정보로 엔티티를 재구성해 저장하면 사용자가 건드리지도 않은 레코드가 망가진다.**
  `manage-route.use-case.ts`가 "대표만 해제"하려고 `new CommuteRoute(...)`를 만들며
  `totalExpectedDuration`·checkpoint id를 빠뜨렸다. **한 필드만 바꿀 땐 새 객체를 짓지 말고
  기존 객체에서 파생시킬 것** (엔티티에 `withX()` 헬퍼가 있으면 그걸 쓸 것).
- 2026-08-02 **선택 필드의 `|| 기본값` 대체는 "없음"을 "관측됨"으로 날조한다.**
  `weatherCondition || '맑음'`이 날씨를 한 번도 수집하지 않은 세션 전량을 맑음 표본으로 만들어
  "비 오는 날이 +10분"을 **−10분**으로 뒤집었다. 통계·판정 경로에서 미기록은 채우지 말고 제외할 것.

- 2026-07-31 **파생 필드(`Alert.notificationTime`)는 원본을 바꾸는 setter에서 같이 갱신해야 한다.**
  생성자에서만 계산하면 `updateSchedule()` 직후의 **응답 1회분만** 옛 값이라 DB 재조회 시
  복구된다 — 그래서 테스트도 실사용도 잘 통과한다. 파생 필드를 발견하면 그 값을 만드는
  곳이 아니라 **원본을 바꾸는 모든 곳**을 grep할 것.
- 2026-07-31 **점수 임계값을 "최고"의 근거로 쓰지 말 것.** `normalizeToScore()`가 점수를
  50~100으로 압축하는 탓에 `speedScore >= 80`이 최속 경로가 아닌 것도 통과시켰다
  (30/34/50분 → 34분 경로가 90점). "가장 ~하다"는 문구는 실제 min/max와 직접 비교해야 한다.
- 2026-07-31 **범위 판정 분기는 좁은 범위를 먼저 놓아야 한다.** 대기질 `getSidoName()`의
  인천 범위가 경기 범위에 완전히 포함되는데 경기 검사가 먼저라 인천 분기가 dead code였다
  (인천 사용자 → 경기 측정소 데이터). 지역/등급 판정 코드를 볼 땐 분기 순서부터 확인할 것.
- 2026-07-30 **CLAUDE.md의 AWS 리소스 표를 신뢰하지 말 것** — ECS/ECR/ALB가 전부 철거됐는데
  문서엔 ✅로 남아 있었다(CloudFront만 생존, origin은 dangling). 배포 전 `aws ecs list-clusters`·
  `aws ecr describe-repositories`로 실존 확인부터. 인프라 재생성은 D1 게이트(비용·비가역)다.
- 2026-07-30 main 브랜치 protection의 required contexts가 `CI / frontend`인데 실제 check-run
  이름은 `frontend`다 → auto-merge가 영구 미충족. 머지에 `gh pr merge --admin`이 필요하다.
  `gh pr merge --delete-branch`는 worktree 세션에서 "'main' is already used by worktree" 에러를
  내지만 **머지 자체는 성공**한다(로컬 checkout 단계 실패일 뿐) — 에러만 보고 재시도하지 말고
  `gh pr view --json state`로 확인할 것.
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
