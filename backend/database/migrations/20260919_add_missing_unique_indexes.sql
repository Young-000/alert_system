-- ============================================================================
-- Migration: Add Missing UNIQUE Indexes (subway_stations, commute_sessions)
-- Created: 2026-09-19
-- Description: 엔티티가 선언한 UNIQUE 인덱스 두 개가 DDL에 없었다.
--
--              이 갭은 테스트가 구조적으로 못 본다. 테스트 DB는
--              `synchronize: true`(`database.config.ts:19`)라 엔티티 선언대로
--              인덱스를 만들어 주지만, 프로덕션은 synchronize=false이므로
--              `database/*.sql`에 없는 인덱스는 존재하지 않는다.
--
--              1) subway_stations(name, line)
--                 `PostgresSubwayStationRepository.saveMany`가
--                 `repository.upsert(entities, ['name', 'line'])`,
--                 즉 `INSERT ... ON CONFLICT (name, line) DO UPDATE`를 만든다.
--                 Postgres는 conflict target에 정확히 대응하는 unique 인덱스를
--                 요구하므로, 없으면 42P10으로 쿼리 전체가 실패한다:
--                   there is no unique or exclusion constraint matching
--                   the ON CONFLICT specification
--                 역 목록을 채우는 경로는 `npm run seed:subway` 하나뿐이라
--                 이 실패는 곧 역 검색·경로 설정·지하철 알림이 쓸 데이터가
--                 없다는 뜻이 된다.
--
--              2) commute_sessions(user_id, status) WHERE status='in_progress'
--                 "진행 중 세션은 사용자당 하나"는 use-case가 read-then-write로
--                 막고 있다(`manage-commute-session.use-case.ts` startSession).
--                 동시 요청에는 그 검사만으로 부족하고, 부분 unique 인덱스가
--                 마지막 방어선이다. 세션이 둘 생기면
--                 `findInProgressByUserId`(findOne·정렬 없음)가 그중 하나를
--                 비결정적으로 집어 오고, 나머지 하나는 화면에서 영원히
--                 보이지 않는 채 in_progress로 남는다.
--
-- 적용 전 확인: 두 인덱스 모두 기존 중복 행이 있으면 생성이 실패한다(비파괴적 —
--              실패해도 바뀌는 것은 없다). 중복이 있으면 어느 행을 남길지가
--              사람의 결정이므로 여기서 지우지 않는다.
--
--   SELECT name, line, COUNT(*) FROM alert_system.subway_stations
--    GROUP BY name, line HAVING COUNT(*) > 1;
--
--   SELECT user_id, COUNT(*) FROM alert_system.commute_sessions
--    WHERE status = 'in_progress' GROUP BY user_id HAVING COUNT(*) > 1;
-- ============================================================================

-- 1. subway_stations - 같은 노선의 같은 역은 하나뿐이다 (upsert의 ON CONFLICT 대상)
CREATE UNIQUE INDEX IF NOT EXISTS subway_stations_name_line_unique
  ON alert_system.subway_stations(name, line);

-- 2. commute_sessions - 진행 중 세션은 사용자당 하나.
--    완료/취소된 세션은 여러 개 남아야 하므로 status='in_progress'로 한정한다
--    (엔티티의 @Index(['userId','status'], { unique: true, where: "status = 'in_progress'" })와 대응).
CREATE UNIQUE INDEX IF NOT EXISTS commute_sessions_user_in_progress_unique
  ON alert_system.commute_sessions(user_id, status)
  WHERE status = 'in_progress';
