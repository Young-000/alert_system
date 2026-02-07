-- ============================================================================
-- Migration: Add Commute Tracking Tables
-- Created: 2026-02-08
-- Description: Creates commute_routes, route_checkpoints, commute_sessions,
--              and checkpoint_records tables for commute tracking functionality.
--              These tables were previously auto-created by TypeORM synchronize,
--              which is unsafe for production. This migration makes the schema
--              explicit and adds RLS policies.
-- ============================================================================

-- ============================================================================
-- 1. commute_routes - 출퇴근 경로 정의
-- ============================================================================

-- Stores user-defined commute routes (e.g., "Morning commute to office")
CREATE TABLE IF NOT EXISTS alert_system.commute_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  route_type VARCHAR(20) NOT NULL,           -- 'morning' | 'evening' | 'custom'
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  total_expected_duration INTEGER,            -- 총 예상 소요 시간 (분)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.commute_routes IS
  '사용자 출퇴근 경로 정의 - 아침/저녁/커스텀 경로';

COMMENT ON COLUMN alert_system.commute_routes.route_type IS
  '경로 유형: morning(출근), evening(퇴근), custom(사용자 정의)';

COMMENT ON COLUMN alert_system.commute_routes.total_expected_duration IS
  '총 예상 소요 시간 (분 단위)';

-- ============================================================================
-- 2. route_checkpoints - 경로 내 체크포인트 (정류장, 역, 환승지점 등)
-- ============================================================================

-- Stores ordered checkpoints within a commute route
CREATE TABLE IF NOT EXISTS alert_system.route_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES alert_system.commute_routes(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,            -- 체크포인트 순서
  name VARCHAR(100) NOT NULL,
  checkpoint_type VARCHAR(30) NOT NULL,       -- 'home' | 'subway' | 'bus_stop' | 'transfer_point' | 'work' | 'custom'
  linked_station_id UUID REFERENCES alert_system.subway_stations(id) ON DELETE SET NULL,
  linked_bus_stop_id VARCHAR(100),            -- 외부 API용 버스 정류장 ID
  line_info VARCHAR(50),                      -- 노선 정보 (지하철 몇호선, 버스 몇번)
  expected_duration_to_next INTEGER,          -- 다음 체크포인트까지 예상 이동 시간 (분)
  expected_wait_time INTEGER NOT NULL DEFAULT 0,  -- 환승/대기 예상 시간 (분)
  transport_mode VARCHAR(20),                 -- 'walk' | 'subway' | 'bus' | 'transfer' | 'taxi' | 'bike'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.route_checkpoints IS
  '경로 내 체크포인트 - 집, 지하철역, 버스정류장, 환승지점, 회사 등';

COMMENT ON COLUMN alert_system.route_checkpoints.checkpoint_type IS
  '체크포인트 유형: home, subway, bus_stop, transfer_point, work, custom';

COMMENT ON COLUMN alert_system.route_checkpoints.transport_mode IS
  '다음 체크포인트까지 이동 수단: walk, subway, bus, transfer, taxi, bike';

COMMENT ON COLUMN alert_system.route_checkpoints.expected_wait_time IS
  '환승/대기 예상 시간 (분) - 지하철 대기, 환승 이동 등';

-- ============================================================================
-- 3. commute_sessions - 출퇴근 트래킹 세션
-- ============================================================================

-- Stores individual commute tracking sessions
CREATE TABLE IF NOT EXISTS alert_system.commute_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES alert_system.commute_routes(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  total_duration_minutes INTEGER,             -- 총 소요 시간 (분)
  total_wait_minutes INTEGER NOT NULL DEFAULT 0,   -- 총 대기/환승 시간 (분)
  total_delay_minutes INTEGER NOT NULL DEFAULT 0,  -- 총 지연 시간 (분, 예상 대비)
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'cancelled'
  weather_condition VARCHAR(50),              -- 날씨 조건 (비, 눈, 맑음 등)
  notes TEXT,                                 -- 메모
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.commute_sessions IS
  '출퇴근 트래킹 세션 - 실제 이동 기록';

COMMENT ON COLUMN alert_system.commute_sessions.total_wait_minutes IS
  '총 대기/환승 시간 (분) - 실제 이동 시간과 분리하여 파악';

COMMENT ON COLUMN alert_system.commute_sessions.total_delay_minutes IS
  '총 지연 시간 (분) - 예상 대비 얼마나 늦었는지';

COMMENT ON COLUMN alert_system.commute_sessions.status IS
  '세션 상태: in_progress(진행중), completed(완료), cancelled(취소)';

-- ============================================================================
-- 4. checkpoint_records - 체크포인트 도착 기록
-- ============================================================================

-- Stores arrival records at each checkpoint during a commute session
CREATE TABLE IF NOT EXISTS alert_system.checkpoint_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES alert_system.commute_sessions(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES alert_system.route_checkpoints(id) ON DELETE CASCADE,
  arrived_at TIMESTAMPTZ NOT NULL,            -- 체크포인트 도착 시간
  actual_duration_from_previous INTEGER,      -- 이전 체크포인트부터 실제 이동 시간 (분)
  actual_wait_time INTEGER NOT NULL DEFAULT 0,     -- 실제 대기 시간 (분)
  delay_minutes INTEGER NOT NULL DEFAULT 0,        -- 지연 시간 (분, 음수면 빨리 도착)
  wait_delay_minutes INTEGER NOT NULL DEFAULT 0,   -- 대기 시간 지연 (분)
  notes VARCHAR(255),                         -- 메모 (예: "지하철 지연", "환승 복잡")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alert_system.checkpoint_records IS
  '체크포인트별 도착 기록 - 실제 이동/대기/지연 시간 기록';

COMMENT ON COLUMN alert_system.checkpoint_records.delay_minutes IS
  '지연 시간 (분) - 양수면 지연, 음수면 빨리 도착';

COMMENT ON COLUMN alert_system.checkpoint_records.wait_delay_minutes IS
  '대기 시간 지연 (분) - 예상 대기 시간 대비 실제 대기 시간 차이';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- commute_routes indexes
CREATE INDEX IF NOT EXISTS commute_routes_user_id_idx
  ON alert_system.commute_routes(user_id);

CREATE INDEX IF NOT EXISTS commute_routes_user_id_route_type_idx
  ON alert_system.commute_routes(user_id, route_type);

-- route_checkpoints indexes
CREATE INDEX IF NOT EXISTS route_checkpoints_route_id_idx
  ON alert_system.route_checkpoints(route_id);

CREATE INDEX IF NOT EXISTS route_checkpoints_route_id_sequence_order_idx
  ON alert_system.route_checkpoints(route_id, sequence_order);

-- commute_sessions indexes
CREATE INDEX IF NOT EXISTS commute_sessions_user_id_idx
  ON alert_system.commute_sessions(user_id);

CREATE INDEX IF NOT EXISTS commute_sessions_route_id_idx
  ON alert_system.commute_sessions(route_id);

CREATE INDEX IF NOT EXISTS commute_sessions_user_id_started_at_idx
  ON alert_system.commute_sessions(user_id, started_at);

CREATE INDEX IF NOT EXISTS commute_sessions_status_idx
  ON alert_system.commute_sessions(status);

-- checkpoint_records indexes
CREATE INDEX IF NOT EXISTS checkpoint_records_session_id_idx
  ON alert_system.checkpoint_records(session_id);

CREATE INDEX IF NOT EXISTS checkpoint_records_checkpoint_id_idx
  ON alert_system.checkpoint_records(checkpoint_id);

CREATE INDEX IF NOT EXISTS checkpoint_records_session_id_arrived_at_idx
  ON alert_system.checkpoint_records(session_id, arrived_at);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE alert_system.commute_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.route_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.commute_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.checkpoint_records ENABLE ROW LEVEL SECURITY;

-- ---- commute_routes policies ----

CREATE POLICY commute_routes_select_own ON alert_system.commute_routes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY commute_routes_insert_own ON alert_system.commute_routes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY commute_routes_update_own ON alert_system.commute_routes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY commute_routes_delete_own ON alert_system.commute_routes
  FOR DELETE USING (user_id = auth.uid());

-- ---- route_checkpoints policies ----
-- Checkpoints are owned indirectly via their parent route's user_id

CREATE POLICY route_checkpoints_select_own ON alert_system.route_checkpoints
  FOR SELECT USING (
    route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY route_checkpoints_insert_own ON alert_system.route_checkpoints
  FOR INSERT WITH CHECK (
    route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY route_checkpoints_update_own ON alert_system.route_checkpoints
  FOR UPDATE USING (
    route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY route_checkpoints_delete_own ON alert_system.route_checkpoints
  FOR DELETE USING (
    route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = auth.uid()
    )
  );

-- ---- commute_sessions policies ----

CREATE POLICY commute_sessions_select_own ON alert_system.commute_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY commute_sessions_insert_own ON alert_system.commute_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY commute_sessions_update_own ON alert_system.commute_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY commute_sessions_delete_own ON alert_system.commute_sessions
  FOR DELETE USING (user_id = auth.uid());

-- ---- checkpoint_records policies ----
-- Records are owned indirectly via their parent session's user_id

CREATE POLICY checkpoint_records_select_own ON alert_system.checkpoint_records
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM alert_system.commute_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY checkpoint_records_insert_own ON alert_system.checkpoint_records
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM alert_system.commute_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY checkpoint_records_update_own ON alert_system.checkpoint_records
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM alert_system.commute_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY checkpoint_records_delete_own ON alert_system.checkpoint_records
  FOR DELETE USING (
    session_id IN (
      SELECT id FROM alert_system.commute_sessions WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Updated_at Trigger (only for tables with updated_at column)
-- ============================================================================

-- The update_updated_at_column() function already exists in alert_system schema
-- (created in migration 20260119_add_alerts_updated_at.sql)

-- Apply trigger to commute_routes (the only table with an updated_at column)
DROP TRIGGER IF EXISTS update_commute_routes_updated_at ON alert_system.commute_routes;
CREATE TRIGGER update_commute_routes_updated_at
  BEFORE UPDATE ON alert_system.commute_routes
  FOR EACH ROW
  EXECUTE FUNCTION alert_system.update_updated_at_column();
