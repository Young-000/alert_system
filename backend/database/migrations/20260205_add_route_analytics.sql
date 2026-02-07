-- ============================================================================
-- Migration: Add Route Analytics for Commute Route Analysis
-- Created: 2026-02-05
-- Description: Route analytics table for storing calculated route statistics and scores
-- ============================================================================

-- 1. 경로 분석 테이블
CREATE TABLE IF NOT EXISTS alert_system.route_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES alert_system.commute_routes(id) ON DELETE CASCADE,
  route_name VARCHAR(100) NOT NULL,

  -- 전체 통계
  total_trips INTEGER DEFAULT 0,
  last_trip_date TIMESTAMPTZ,

  -- 시간 분석
  avg_duration_minutes DECIMAL(10,2) DEFAULT 0,
  min_duration_minutes INTEGER DEFAULT 0,
  max_duration_minutes INTEGER DEFAULT 0,
  std_dev_minutes DECIMAL(10,2) DEFAULT 0,

  -- 구간별 분석 (JSON)
  segment_stats JSONB DEFAULT '[]',

  -- 조건별 분석 (JSON)
  condition_analysis JSONB DEFAULT '{}',

  -- 점수
  speed_score INTEGER DEFAULT 0 CHECK (speed_score >= 0 AND speed_score <= 100),
  reliability_score INTEGER DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  comfort_score INTEGER DEFAULT 0 CHECK (comfort_score >= 0 AND comfort_score <= 100),
  total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),

  -- 메타
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Unique constraint on route_id (one analytics per route)
CREATE UNIQUE INDEX IF NOT EXISTS route_analytics_route_id_idx
  ON alert_system.route_analytics(route_id);

-- Score-based queries
CREATE INDEX IF NOT EXISTS route_analytics_score_idx
  ON alert_system.route_analytics(total_score DESC, total_trips DESC);

-- Combined index for user queries (via route)
CREATE INDEX IF NOT EXISTS route_analytics_trips_idx
  ON alert_system.route_analytics(total_trips DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE alert_system.route_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analytics for their own routes
CREATE POLICY route_analytics_select_own ON alert_system.route_analytics
  FOR SELECT USING (
    route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can manage analytics for their own routes
CREATE POLICY route_analytics_all_own ON alert_system.route_analytics
  FOR ALL USING (
    route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Updated_at Trigger
-- ============================================================================

-- Apply trigger to route_analytics
DROP TRIGGER IF EXISTS update_route_analytics_updated_at ON alert_system.route_analytics;
CREATE TRIGGER update_route_analytics_updated_at
  BEFORE UPDATE ON alert_system.route_analytics
  FOR EACH ROW
  EXECUTE FUNCTION alert_system.update_updated_at_column();

-- ============================================================================
-- Alert table updates for new category system
-- ============================================================================

-- Add new columns to alerts table for category-based system
ALTER TABLE alert_system.alerts
  ADD COLUMN IF NOT EXISTS alert_category VARCHAR(50) DEFAULT 'daily_weather',
  ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT 'fixed_time',
  ADD COLUMN IF NOT EXISTS target_arrival_time TIME,
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS departure_config JSONB DEFAULT '{}';

-- Create index for category-based queries
CREATE INDEX IF NOT EXISTS alerts_category_idx ON alert_system.alerts(alert_category);
CREATE INDEX IF NOT EXISTS alerts_route_id_idx ON alert_system.alerts(route_id);

-- ============================================================================
-- Data Migration: Set default categories for existing alerts
-- ============================================================================

-- Set category based on existing alert_types
UPDATE alert_system.alerts
SET alert_category = CASE
  WHEN route_id IS NOT NULL AND ('bus' = ANY(alert_types) OR 'subway' = ANY(alert_types))
    THEN 'departure_reminder'
  ELSE 'daily_weather'
END
WHERE alert_category IS NULL OR alert_category = '';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE alert_system.route_analytics IS
  '경로별 분석 데이터 - 평균 시간, 점수, 구간별 통계 등';

COMMENT ON COLUMN alert_system.route_analytics.segment_stats IS
  '구간별 통계 JSON: [{checkpointName, transportMode, averageDuration, variability, ...}]';

COMMENT ON COLUMN alert_system.route_analytics.condition_analysis IS
  '조건별 분석 JSON: {byWeather: {...}, byDayOfWeek: {...}, byTimeSlot: {...}}';

COMMENT ON COLUMN alert_system.route_analytics.total_score IS
  '종합 점수 (0-100): speed * 0.4 + reliability * 0.4 + comfort * 0.2';
