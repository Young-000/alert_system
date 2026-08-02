-- ============================================================================
-- Migration: Add Mission / Challenge / API-Cache Tables
-- Created: 2026-08-03
-- Description: 20260726_add_missing_entity_tables.sql가 14개 엔티티의 스키마 갭을
--              닫았으나 11개 테이블이 남아 있었다. 이 테이블들은 `entities.ts`의
--              ALL_ENTITIES에 등록돼 있고 프로덕션 코드 경로가 존재하지만
--              DDL이 리포지토리 어디에도 없다.
--
--              프로덕션은 synchronize=false(`database.config.ts:31-33`)이므로
--              TypeORM이 테이블을 만들어 주지 않는다. 따라서 해당 기능을 호출하면
--              42P01(relation does not exist)로 500이 난다.
--              가장 큰 노출면은 미션 기능이다 — `MissionController`의 10개
--              엔드포인트 전부가 `missions`를 읽는다.
--
--              대상: missions, daily_mission_records, mission_scores,
--                    challenge_templates, user_challenges, user_badges,
--                    weather_cache, air_quality_cache,
--                    subway_arrival_cache, bus_arrival_cache, api_call_log
--
--              타입 규약(20260726과 동일):
--                - id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
--                - @CreateDateColumn/@UpdateDateColumn(타입 미지정) → TIMESTAMP
--                - type:'timestamptz' 명시 컬럼(TIMESTAMPTZ 상수) → TIMESTAMPTZ
--                - simple-json → JSONB
-- ============================================================================

-- ============================================================================
-- 1. missions - 출퇴근 중 수행할 사용자 정의 미션
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  mission_type VARCHAR(20) NOT NULL,          -- 'commute' | 'return'
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.missions IS
  '출퇴근 미션 - 유형(commute/return)별 최대 3개, sort_order로 목록 정렬';

CREATE INDEX IF NOT EXISTS missions_user_type_idx
  ON alert_system.missions(user_id, mission_type);

-- ============================================================================
-- 2. daily_mission_records - 일자별 미션 체크 기록
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.daily_mission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES alert_system.missions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_mission_records_user_mission_date_unique
    UNIQUE (user_id, mission_id, date)
);

COMMENT ON TABLE alert_system.daily_mission_records IS
  '일자별 미션 체크 기록 - date는 KST 달력 날짜(getTodayKST)';

CREATE INDEX IF NOT EXISTS daily_mission_records_user_date_idx
  ON alert_system.daily_mission_records(user_id, date);

-- ============================================================================
-- 3. mission_scores - 일자별 미션 달성 점수/스트릭
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.mission_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_missions INTEGER NOT NULL DEFAULT 0,
  completed_missions INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  streak_day INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT mission_scores_user_date_unique UNIQUE (user_id, date)
);

COMMENT ON TABLE alert_system.mission_scores IS
  '일자별 미션 달성률과 연속 달성일 - 주간/월간 통계의 원천';

CREATE INDEX IF NOT EXISTS mission_scores_user_date_idx
  ON alert_system.mission_scores(user_id, date);

-- ============================================================================
-- 4. challenge_templates - 챌린지 정의 (시드 데이터, 사용자 소유 아님)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.challenge_templates (
  id VARCHAR(100) PRIMARY KEY,                -- 사람이 읽는 슬러그 (자동 생성 아님)
  category VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  badge_id VARCHAR(100) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_emoji VARCHAR(20) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.challenge_templates IS
  '챌린지 템플릿 - 전역 시드 데이터, 모든 사용자가 읽는다';

CREATE INDEX IF NOT EXISTS challenge_templates_category_idx
  ON alert_system.challenge_templates(category);

-- ============================================================================
-- 5. user_challenges - 사용자가 수락한 챌린지 진행 상태
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  challenge_template_id VARCHAR(100) NOT NULL
    REFERENCES alert_system.challenge_templates(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_progress INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.user_challenges IS
  '사용자별 챌린지 진행 - 같은 챌린지를 동시에 두 번 진행할 수 없다';

CREATE INDEX IF NOT EXISTS user_challenges_user_status_idx
  ON alert_system.user_challenges(user_id, status);

-- 부분 유니크 인덱스: 진행 중(active)인 같은 챌린지는 1개만.
-- 완료/포기한 챌린지는 남아 있어야 하므로 status='active'로 한정한다
-- (엔티티의 @Index({ unique: true, where: "status = 'active'" })와 대응).
CREATE UNIQUE INDEX IF NOT EXISTS user_challenges_user_template_active_unique
  ON alert_system.user_challenges(user_id, challenge_template_id)
  WHERE status = 'active';

-- ============================================================================
-- 6. user_badges - 챌린지 완료로 획득한 배지
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  badge_id VARCHAR(100) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_emoji VARCHAR(20) NOT NULL,
  challenge_id UUID NOT NULL
    REFERENCES alert_system.user_challenges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT user_badges_user_badge_unique UNIQUE (user_id, badge_id)
);

COMMENT ON TABLE alert_system.user_badges IS
  '획득 배지 - 같은 배지는 사용자당 1회만';

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx
  ON alert_system.user_badges(user_id);

-- ============================================================================
-- 7. weather_cache - 외부 날씨 API 응답 캐시
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  location VARCHAR NOT NULL,
  temperature DECIMAL(5, 2) NOT NULL,
  condition VARCHAR NOT NULL,
  humidity INTEGER NOT NULL,
  wind_speed DECIMAL(5, 2) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE alert_system.weather_cache IS
  '기상청 API 응답 캐시 - 좌표 기준, expires_at 이후 무효';

CREATE INDEX IF NOT EXISTS weather_cache_lat_lng_idx
  ON alert_system.weather_cache(lat, lng);

-- ============================================================================
-- 8. air_quality_cache - 대기질 API 응답 캐시
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.air_quality_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sido_name VARCHAR NOT NULL,
  station_name VARCHAR NOT NULL,
  pm10 INTEGER NOT NULL,
  pm25 INTEGER NOT NULL,
  aqi INTEGER NOT NULL,
  status VARCHAR NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE alert_system.air_quality_cache IS
  '에어코리아 API 응답 캐시 - 시도/측정소 기준';

CREATE INDEX IF NOT EXISTS air_quality_cache_sido_name_idx
  ON alert_system.air_quality_cache(sido_name);

-- ============================================================================
-- 9. subway_arrival_cache - 지하철 도착정보 캐시
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.subway_arrival_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name VARCHAR NOT NULL,
  arrivals JSONB NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE alert_system.subway_arrival_cache IS
  '지하철 실시간 도착정보 캐시 - arrivals는 도착 예정 배열';

CREATE INDEX IF NOT EXISTS subway_arrival_cache_station_name_idx
  ON alert_system.subway_arrival_cache(station_name);

-- ============================================================================
-- 10. bus_arrival_cache - 버스 도착정보 캐시
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.bus_arrival_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id VARCHAR NOT NULL,
  arrivals JSONB NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE alert_system.bus_arrival_cache IS
  '버스 실시간 도착정보 캐시 - 정류장 기준';

CREATE INDEX IF NOT EXISTS bus_arrival_cache_stop_id_idx
  ON alert_system.bus_arrival_cache(stop_id);

-- ============================================================================
-- 11. api_call_log - 외부 API 호출 로그 (일일 호출량 집계용)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.api_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name VARCHAR NOT NULL,
  endpoint VARCHAR NOT NULL,
  called_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  error_message VARCHAR
);

COMMENT ON TABLE alert_system.api_call_log IS
  '외부 API 호출 로그 - 무료 쿼터 초과 감시용';

CREATE INDEX IF NOT EXISTS api_call_log_api_name_called_at_idx
  ON alert_system.api_call_log(api_name, called_at);

-- ============================================================================
-- RLS 활성화
-- ============================================================================
-- 백엔드는 서비스 롤로 접속하므로 RLS를 우회한다. 아래 정책은 PostgREST 등
-- anon/authenticated 경로로 직접 접근할 때의 방어선이다.

ALTER TABLE alert_system.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.daily_mission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.mission_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.air_quality_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.subway_arrival_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.bus_arrival_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.api_call_log ENABLE ROW LEVEL SECURITY;

-- ---- 사용자 소유 데이터: 본인 행만 ----

CREATE POLICY missions_select_own ON alert_system.missions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY missions_insert_own ON alert_system.missions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY missions_update_own ON alert_system.missions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY missions_delete_own ON alert_system.missions
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY daily_mission_records_select_own ON alert_system.daily_mission_records
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY daily_mission_records_insert_own ON alert_system.daily_mission_records
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY daily_mission_records_update_own ON alert_system.daily_mission_records
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY daily_mission_records_delete_own ON alert_system.daily_mission_records
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY mission_scores_select_own ON alert_system.mission_scores
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY mission_scores_insert_own ON alert_system.mission_scores
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY mission_scores_update_own ON alert_system.mission_scores
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_challenges_select_own ON alert_system.user_challenges
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_challenges_insert_own ON alert_system.user_challenges
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_challenges_update_own ON alert_system.user_challenges
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY user_challenges_delete_own ON alert_system.user_challenges
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY user_badges_select_own ON alert_system.user_badges
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_badges_insert_own ON alert_system.user_badges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ---- 챌린지 템플릿: 전역 읽기 전용 (쓰기 정책 없음 = 서비스 롤만 시드 가능) ----

CREATE POLICY challenge_templates_select_all ON alert_system.challenge_templates
  FOR SELECT USING (true);

-- ---- 캐시/로그 테이블: 사용자 소유가 아니므로 클라이언트 직접 접근을 막는다.
--      정책을 하나도 만들지 않으면 RLS가 켜진 상태에서 전부 거부된다
--      (백엔드 서비스 롤은 RLS를 우회하므로 영향 없음). ----
