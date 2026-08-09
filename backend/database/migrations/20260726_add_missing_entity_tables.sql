-- ============================================================================
-- Migration: Add Missing Entity Tables
-- Created: 2026-07-26
-- Description: 14 TypeORM 엔티티가 `database.config.ts`의 allEntities에 등록되어
--              있으나 실제 DB에는 테이블이 없어, 프로덕션(synchronize=false)에서
--              해당 기능 호출 시 42P01(relation does not exist)로 500이 발생한다.
--              이 마이그레이션은 엔티티 정의와 1:1로 대응하는 DDL을 명시적으로
--              작성하여 스키마 갭을 닫는다.
--
--              대상: user_places, commute_events, smart_departure_settings,
--                    smart_departure_snapshots, live_activity_tokens,
--                    commute_streaks, streak_daily_logs, notification_logs,
--                    alternative_mappings, segment_congestion,
--                    regional_insights, community_tips,
--                    community_tip_reports, community_tips_helpfuls
--
--              타입 규약(기존 테이블과 동일):
--                - id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
--                - @CreateDateColumn/@UpdateDateColumn(타입 미지정) → TIMESTAMP
--                - type:'timestamptz' 명시 컬럼 → TIMESTAMPTZ
--                - simple-array → TEXT (콤마 구분, 리포지토리에서 매핑)
-- ============================================================================

-- ============================================================================
-- 1. user_places - 지오펜스 기준 장소 (집/회사 등)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.user_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  place_type VARCHAR(20) NOT NULL,            -- 'home' | 'work' | 'custom'
  label VARCHAR(100) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address VARCHAR(500),
  radius_m INTEGER NOT NULL DEFAULT 200,      -- 지오펜스 반경 (미터)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT user_places_user_type_unique UNIQUE (user_id, place_type)
);

COMMENT ON TABLE alert_system.user_places IS
  '지오펜스 기준 장소 - 사용자별 집/회사 좌표와 반경';

CREATE INDEX IF NOT EXISTS user_places_user_id_idx
  ON alert_system.user_places(user_id);

-- ============================================================================
-- 2. commute_events - 지오펜스 진입/이탈 이벤트
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.commute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES alert_system.user_places(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL,            -- 'enter' | 'exit'
  triggered_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  session_id UUID REFERENCES alert_system.commute_sessions(id) ON DELETE SET NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'geofence',
  is_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.commute_events IS
  '지오펜스 진입/이탈 이벤트 - 세션 자동 시작/종료 트리거';

CREATE INDEX IF NOT EXISTS commute_events_user_id_idx
  ON alert_system.commute_events(user_id);
CREATE INDEX IF NOT EXISTS commute_events_place_id_idx
  ON alert_system.commute_events(place_id);
CREATE INDEX IF NOT EXISTS commute_events_triggered_at_idx
  ON alert_system.commute_events(triggered_at);
CREATE INDEX IF NOT EXISTS commute_events_user_triggered_idx
  ON alert_system.commute_events(user_id, triggered_at);
CREATE INDEX IF NOT EXISTS commute_events_user_processed_idx
  ON alert_system.commute_events(user_id, is_processed);

-- ============================================================================
-- 3. smart_departure_settings - 스마트 출발 설정
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.smart_departure_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES alert_system.commute_routes(id) ON DELETE CASCADE,
  departure_type VARCHAR(20) NOT NULL,        -- 'morning' | 'evening'
  arrival_target TIME NOT NULL,               -- 도착 목표 시각
  prep_time_minutes INTEGER NOT NULL DEFAULT 30,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  active_days TEXT NOT NULL,                  -- simple-array: 'mon,tue,...'
  pre_alerts TEXT NOT NULL,                   -- simple-array: '30,15,5' (분 전)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT smart_departure_settings_user_type_unique UNIQUE (user_id, departure_type)
);

COMMENT ON TABLE alert_system.smart_departure_settings IS
  '스마트 출발 설정 - 도착 목표 시각 역산으로 최적 출발 시각 산출';

CREATE INDEX IF NOT EXISTS smart_departure_settings_user_id_idx
  ON alert_system.smart_departure_settings(user_id);

-- ============================================================================
-- 4. smart_departure_snapshots - 일자별 출발 계산 스냅샷
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.smart_departure_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  setting_id UUID NOT NULL REFERENCES alert_system.smart_departure_settings(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  departure_type VARCHAR(20) NOT NULL,
  arrival_target TIME NOT NULL,
  estimated_travel_min INTEGER NOT NULL,
  prep_time_minutes INTEGER NOT NULL,
  optimal_departure_at TIMESTAMPTZ NOT NULL,
  baseline_travel_min INTEGER,
  history_avg_travel_min INTEGER,
  realtime_adjustment_min INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  alerts_sent TEXT,                           -- simple-array
  departed_at TIMESTAMPTZ,
  schedule_ids TEXT,                          -- simple-array (EventBridge schedule ids)
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT smart_departure_snapshots_setting_date_unique UNIQUE (setting_id, departure_date)
);

COMMENT ON TABLE alert_system.smart_departure_snapshots IS
  '일자별 스마트 출발 스냅샷 - 실시간 보정 반영된 최적 출발 시각';

CREATE INDEX IF NOT EXISTS smart_departure_snapshots_user_date_idx
  ON alert_system.smart_departure_snapshots(user_id, departure_date);
CREATE INDEX IF NOT EXISTS smart_departure_snapshots_status_idx
  ON alert_system.smart_departure_snapshots(status);

-- ============================================================================
-- 5. live_activity_tokens - iOS Live Activity 푸시 토큰
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.live_activity_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  activity_id VARCHAR(255) NOT NULL,
  push_token TEXT NOT NULL,
  mode VARCHAR(20) NOT NULL,
  setting_id UUID REFERENCES alert_system.smart_departure_settings(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.live_activity_tokens IS
  'iOS Live Activity 푸시 토큰 - activity_id 단위로 갱신 발송';

CREATE UNIQUE INDEX IF NOT EXISTS live_activity_tokens_activity_id_idx
  ON alert_system.live_activity_tokens(activity_id);
CREATE INDEX IF NOT EXISTS live_activity_tokens_user_id_idx
  ON alert_system.live_activity_tokens(user_id);
CREATE INDEX IF NOT EXISTS live_activity_tokens_is_active_idx
  ON alert_system.live_activity_tokens(is_active);

-- ============================================================================
-- 6. commute_streaks - 연속 출퇴근 기록 (사용자당 1행)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.commute_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  streak_start_date DATE,
  last_record_date DATE,
  best_streak INTEGER NOT NULL DEFAULT 0,
  best_streak_start DATE,
  best_streak_end DATE,
  weekly_goal INTEGER NOT NULL DEFAULT 5,
  weekly_count INTEGER NOT NULL DEFAULT 0,
  week_start_date DATE,
  milestones_achieved TEXT NOT NULL DEFAULT '',  -- simple-array
  latest_milestone VARCHAR(10),
  exclude_weekends BOOLEAN NOT NULL DEFAULT false,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.commute_streaks IS
  '연속 출퇴근 스트릭 - 사용자당 1행 (user_id 유니크)';

CREATE UNIQUE INDEX IF NOT EXISTS commute_streaks_user_id_idx
  ON alert_system.commute_streaks(user_id);
CREATE INDEX IF NOT EXISTS commute_streaks_last_record_date_idx
  ON alert_system.commute_streaks(last_record_date);

-- ============================================================================
-- 7. streak_daily_logs - 스트릭 일별 기록
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.streak_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  session_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT streak_daily_logs_user_date_unique UNIQUE (user_id, record_date)
);

COMMENT ON TABLE alert_system.streak_daily_logs IS
  '스트릭 일별 기록 - 하루 1건만 인정 (user_id, record_date 유니크)';

CREATE INDEX IF NOT EXISTS streak_daily_logs_user_id_idx
  ON alert_system.streak_daily_logs(user_id);
CREATE INDEX IF NOT EXISTS streak_daily_logs_record_date_idx
  ON alert_system.streak_daily_logs(record_date);

-- ============================================================================
-- 8. notification_logs - 알림 발송 로그
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL,
  alert_name VARCHAR(100) NOT NULL DEFAULT '',
  alert_types TEXT NOT NULL,                  -- simple-array: 'weather,air,subway'
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  summary TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.notification_logs IS
  '알림 발송 로그 - 발송 이력 및 성공/실패 상태';

CREATE INDEX IF NOT EXISTS notification_logs_user_sent_idx
  ON alert_system.notification_logs(user_id, sent_at);
CREATE INDEX IF NOT EXISTS notification_logs_sent_at_idx
  ON alert_system.notification_logs(sent_at);

-- ============================================================================
-- 9. alternative_mappings - 대체 경로 역 매핑 (공용 참조 데이터)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.alternative_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_station_name VARCHAR(100) NOT NULL,
  from_line VARCHAR(50) NOT NULL,
  to_station_name VARCHAR(100) NOT NULL,
  to_line VARCHAR(50) NOT NULL,
  walking_minutes INTEGER NOT NULL,
  walking_distance_meters INTEGER,
  description TEXT,
  is_bidirectional BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.alternative_mappings IS
  '지연 시 대체 경로 매핑 - 도보 환승 가능한 인접역 (공용 참조 데이터)';

CREATE INDEX IF NOT EXISTS alternative_mappings_from_station_line_idx
  ON alert_system.alternative_mappings(from_station_name, from_line);

-- ============================================================================
-- 10. segment_congestion - 구간별 혼잡도 집계 (공용 참조 데이터)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.segment_congestion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key VARCHAR(255) NOT NULL,
  checkpoint_name VARCHAR(255) NOT NULL,
  checkpoint_type VARCHAR(50) NOT NULL,
  line_info VARCHAR(100),
  linked_station_id VARCHAR(255),
  linked_bus_stop_id VARCHAR(255),
  time_slot VARCHAR(30) NOT NULL,             -- 'weekday_07', 'weekend_18' 등
  avg_wait_minutes REAL NOT NULL DEFAULT 0,
  avg_delay_minutes REAL NOT NULL DEFAULT 0,
  std_dev_minutes REAL NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  congestion_level VARCHAR(20) NOT NULL DEFAULT 'moderate',
  confidence REAL NOT NULL DEFAULT 0.3,       -- 베이지안 신뢰도 (표본 수 기반)
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT segment_congestion_segment_slot_unique UNIQUE (segment_key, time_slot)
);

COMMENT ON TABLE alert_system.segment_congestion IS
  '구간별 시간대 혼잡도 - 익명 집계 (개인 식별 정보 없음)';

CREATE INDEX IF NOT EXISTS segment_congestion_segment_key_idx
  ON alert_system.segment_congestion(segment_key);
CREATE INDEX IF NOT EXISTS segment_congestion_time_slot_idx
  ON alert_system.segment_congestion(time_slot);
CREATE INDEX IF NOT EXISTS segment_congestion_level_idx
  ON alert_system.segment_congestion(congestion_level);

-- ============================================================================
-- 11. regional_insights - 지역별 통근 통계 (공용 참조 데이터)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.regional_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id VARCHAR(50) NOT NULL,
  region_name VARCHAR(255) NOT NULL,
  grid_lat REAL NOT NULL,
  grid_lng REAL NOT NULL,
  avg_duration_minutes REAL NOT NULL DEFAULT 0,
  median_duration_minutes REAL NOT NULL DEFAULT 0,
  user_count INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  peak_hour_distribution TEXT NOT NULL DEFAULT '{}',
  week_trend REAL NOT NULL DEFAULT 0,
  month_trend REAL NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT regional_insights_region_id_unique UNIQUE (region_id)
);

COMMENT ON TABLE alert_system.regional_insights IS
  '지역별 통근 통계 - 익명 집계 (그리드 단위, 개인 식별 정보 없음)';

CREATE INDEX IF NOT EXISTS regional_insights_region_id_idx
  ON alert_system.regional_insights(region_id);
CREATE INDEX IF NOT EXISTS regional_insights_user_count_idx
  ON alert_system.regional_insights(user_count);
CREATE INDEX IF NOT EXISTS regional_insights_session_count_idx
  ON alert_system.regional_insights(session_count);

-- ============================================================================
-- 12. community_tips - 체크포인트 커뮤니티 팁
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.community_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_key VARCHAR(200) NOT NULL,
  author_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  content VARCHAR(100) NOT NULL,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.community_tips IS
  '체크포인트별 익명 커뮤니티 팁 - 신고 누적 시 is_hidden 처리';

CREATE INDEX IF NOT EXISTS community_tips_checkpoint_key_idx
  ON alert_system.community_tips(checkpoint_key, is_hidden, created_at);
CREATE INDEX IF NOT EXISTS community_tips_author_daily_idx
  ON alert_system.community_tips(author_id, created_at);

-- ============================================================================
-- 13. community_tip_reports - 팁 신고
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.community_tip_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES alert_system.community_tips(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_tip_reports_unique UNIQUE (tip_id, reporter_id)
);

COMMENT ON TABLE alert_system.community_tip_reports IS
  '팁 신고 - 사용자당 팁 1회 (tip_id, reporter_id 유니크)';

CREATE INDEX IF NOT EXISTS community_tip_reports_tip_id_idx
  ON alert_system.community_tip_reports(tip_id);

-- ============================================================================
-- 14. community_tip_helpfuls - 팁 도움됨
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_system.community_tip_helpfuls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES alert_system.community_tips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_tip_helpfuls_unique UNIQUE (tip_id, user_id)
);

COMMENT ON TABLE alert_system.community_tip_helpfuls IS
  '팁 도움됨 - 사용자당 팁 1회 (tip_id, user_id 유니크)';

CREATE INDEX IF NOT EXISTS community_tip_helpfuls_tip_id_idx
  ON alert_system.community_tip_helpfuls(tip_id);
CREATE INDEX IF NOT EXISTS community_tip_helpfuls_user_id_idx
  ON alert_system.community_tip_helpfuls(user_id);

-- ============================================================================
-- 15. 기존 테이블 누락 컬럼 보정
-- ============================================================================
-- 엔티티에는 정의되어 있으나 DB에 없어 SELECT 자체가 42703으로 실패하던 컬럼.
-- TypeORM은 엔티티에 선언된 모든 컬럼을 SELECT 목록에 넣으므로, 컬럼 1개가
-- 없으면 해당 엔티티를 쓰는 기능 전체가 죽는다.

-- push_subscriptions.platform 없음 → 푸시 구독 조회/저장 전부 실패
ALTER TABLE alert_system.push_subscriptions
  ADD COLUMN IF NOT EXISTS platform VARCHAR(10) NOT NULL DEFAULT 'web';

COMMENT ON COLUMN alert_system.push_subscriptions.platform IS
  '구독 플랫폼: web(Web Push) | expo(Expo Push)';

CREATE INDEX IF NOT EXISTS push_subscriptions_user_platform_idx
  ON alert_system.push_subscriptions(user_id, platform);

-- route_checkpoints.checkpoint_key 없음 → 경로 체크포인트 조회 전부 실패
ALTER TABLE alert_system.route_checkpoints
  ADD COLUMN IF NOT EXISTS checkpoint_key VARCHAR(200);

COMMENT ON COLUMN alert_system.route_checkpoints.checkpoint_key IS
  '이웃 매칭용 정규화 키 - 경로 저장 시 계산 (커뮤니티 팁/혼잡도 매칭)';

CREATE INDEX IF NOT EXISTS route_checkpoints_checkpoint_key_idx
  ON alert_system.route_checkpoints(checkpoint_key);

-- ============================================================================
-- RLS
-- ============================================================================
-- 백엔드는 Postgres 직접 접속(TypeORM)이라 RLS를 우회한다. 아래 정책은
-- Supabase anon/authenticated 키로 접근할 경우를 위한 방어선이다.
-- 개인 데이터 테이블 = 소유자만 · 익명 집계 테이블 = 읽기 전용 공개.

ALTER TABLE alert_system.user_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.commute_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.smart_departure_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.smart_departure_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.live_activity_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.commute_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.streak_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.alternative_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.segment_congestion ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.regional_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.community_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.community_tip_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.community_tip_helpfuls ENABLE ROW LEVEL SECURITY;

-- ---- 개인 데이터: user_id = auth.uid() ----

CREATE POLICY user_places_select_own ON alert_system.user_places
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_places_insert_own ON alert_system.user_places
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_places_update_own ON alert_system.user_places
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY user_places_delete_own ON alert_system.user_places
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY commute_events_select_own ON alert_system.commute_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY commute_events_insert_own ON alert_system.commute_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY commute_events_update_own ON alert_system.commute_events
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY commute_events_delete_own ON alert_system.commute_events
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY smart_departure_settings_select_own ON alert_system.smart_departure_settings
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY smart_departure_settings_insert_own ON alert_system.smart_departure_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY smart_departure_settings_update_own ON alert_system.smart_departure_settings
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY smart_departure_settings_delete_own ON alert_system.smart_departure_settings
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY smart_departure_snapshots_select_own ON alert_system.smart_departure_snapshots
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY smart_departure_snapshots_insert_own ON alert_system.smart_departure_snapshots
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY smart_departure_snapshots_update_own ON alert_system.smart_departure_snapshots
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY smart_departure_snapshots_delete_own ON alert_system.smart_departure_snapshots
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY live_activity_tokens_select_own ON alert_system.live_activity_tokens
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY live_activity_tokens_insert_own ON alert_system.live_activity_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY live_activity_tokens_update_own ON alert_system.live_activity_tokens
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY live_activity_tokens_delete_own ON alert_system.live_activity_tokens
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY commute_streaks_select_own ON alert_system.commute_streaks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY commute_streaks_insert_own ON alert_system.commute_streaks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY commute_streaks_update_own ON alert_system.commute_streaks
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY commute_streaks_delete_own ON alert_system.commute_streaks
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY streak_daily_logs_select_own ON alert_system.streak_daily_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY streak_daily_logs_insert_own ON alert_system.streak_daily_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY streak_daily_logs_update_own ON alert_system.streak_daily_logs
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY streak_daily_logs_delete_own ON alert_system.streak_daily_logs
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY notification_logs_select_own ON alert_system.notification_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notification_logs_insert_own ON alert_system.notification_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ---- 익명 집계/참조 데이터: 읽기 전용 공개 (쓰기는 백엔드 직접 접속만) ----

CREATE POLICY alternative_mappings_select_public ON alert_system.alternative_mappings
  FOR SELECT USING (true);

CREATE POLICY segment_congestion_select_public ON alert_system.segment_congestion
  FOR SELECT USING (true);

CREATE POLICY regional_insights_select_public ON alert_system.regional_insights
  FOR SELECT USING (true);

-- ---- 커뮤니티: 숨김 처리되지 않은 팁은 공개 읽기, 쓰기는 본인만 ----

CREATE POLICY community_tips_select_visible ON alert_system.community_tips
  FOR SELECT USING (is_hidden = false);
CREATE POLICY community_tips_insert_own ON alert_system.community_tips
  FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY community_tips_update_own ON alert_system.community_tips
  FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY community_tips_delete_own ON alert_system.community_tips
  FOR DELETE USING (author_id = auth.uid());

CREATE POLICY community_tip_reports_select_own ON alert_system.community_tip_reports
  FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY community_tip_reports_insert_own ON alert_system.community_tip_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY community_tip_reports_delete_own ON alert_system.community_tip_reports
  FOR DELETE USING (reporter_id = auth.uid());

CREATE POLICY community_tip_helpfuls_select_own ON alert_system.community_tip_helpfuls
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY community_tip_helpfuls_insert_own ON alert_system.community_tip_helpfuls
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY community_tip_helpfuls_delete_own ON alert_system.community_tip_helpfuls
  FOR DELETE USING (user_id = auth.uid());
