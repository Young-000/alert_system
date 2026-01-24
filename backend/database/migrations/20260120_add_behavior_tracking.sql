-- ============================================================================
-- Migration: Add Behavior Tracking for Routine Automation
-- Created: 2026-01-20
-- Description: Behavior events, user patterns, commute records, notification effectiveness
-- ============================================================================

-- 1. 사용자 행동 이벤트 테이블
CREATE TABLE IF NOT EXISTS alert_system.behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alert_system.alerts(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,  -- notification_received, notification_opened, departure_confirmed
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_weekday BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 학습된 패턴 테이블
CREATE TABLE IF NOT EXISTS alert_system.user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL,  -- departure_time, route_preference, notification_lead_time
  day_of_week SMALLINT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_weekday BOOLEAN,
  value JSONB NOT NULL,  -- { averageTime: "08:15", stdDev: 10, ... }
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),
  sample_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 출퇴근 기록 테이블
CREATE TABLE IF NOT EXISTS alert_system.commute_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alert_system.alerts(id) ON DELETE SET NULL,
  commute_date DATE NOT NULL,
  commute_type VARCHAR(20) NOT NULL CHECK (commute_type IN ('morning', 'evening')),
  scheduled_departure TIME,
  actual_departure TIMESTAMPTZ,
  weather_condition VARCHAR(50),
  transit_delay_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 알림 효과성 테이블
CREATE TABLE IF NOT EXISTS alert_system.notification_effectiveness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES alert_system.alerts(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  minutes_before_departure INTEGER,
  response_type VARCHAR(30) CHECK (response_type IN ('opened', 'dismissed', 'ignored', 'action_taken')),
  was_useful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- behavior_events indexes
CREATE INDEX IF NOT EXISTS behavior_events_user_id_idx ON alert_system.behavior_events(user_id);
CREATE INDEX IF NOT EXISTS behavior_events_timestamp_idx ON alert_system.behavior_events(timestamp);
CREATE INDEX IF NOT EXISTS behavior_events_event_type_idx ON alert_system.behavior_events(event_type);
CREATE INDEX IF NOT EXISTS behavior_events_user_timestamp_idx ON alert_system.behavior_events(user_id, timestamp DESC);

-- user_patterns indexes
CREATE INDEX IF NOT EXISTS user_patterns_user_id_idx ON alert_system.user_patterns(user_id);
CREATE INDEX IF NOT EXISTS user_patterns_type_idx ON alert_system.user_patterns(pattern_type);
CREATE UNIQUE INDEX IF NOT EXISTS user_patterns_unique_idx ON alert_system.user_patterns(user_id, pattern_type, day_of_week, is_weekday);

-- commute_records indexes
CREATE INDEX IF NOT EXISTS commute_records_user_id_idx ON alert_system.commute_records(user_id);
CREATE INDEX IF NOT EXISTS commute_records_date_idx ON alert_system.commute_records(commute_date);
CREATE INDEX IF NOT EXISTS commute_records_user_date_idx ON alert_system.commute_records(user_id, commute_date DESC);

-- notification_effectiveness indexes
CREATE INDEX IF NOT EXISTS notification_effectiveness_user_id_idx ON alert_system.notification_effectiveness(user_id);
CREATE INDEX IF NOT EXISTS notification_effectiveness_alert_id_idx ON alert_system.notification_effectiveness(alert_id);
CREATE INDEX IF NOT EXISTS notification_effectiveness_sent_at_idx ON alert_system.notification_effectiveness(sent_at);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE alert_system.behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.commute_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.notification_effectiveness ENABLE ROW LEVEL SECURITY;

-- behavior_events policies
CREATE POLICY behavior_events_select_own ON alert_system.behavior_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY behavior_events_insert_own ON alert_system.behavior_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- user_patterns policies
CREATE POLICY user_patterns_select_own ON alert_system.user_patterns
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_patterns_all_own ON alert_system.user_patterns
  FOR ALL USING (user_id = auth.uid());

-- commute_records policies
CREATE POLICY commute_records_select_own ON alert_system.commute_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY commute_records_all_own ON alert_system.commute_records
  FOR ALL USING (user_id = auth.uid());

-- notification_effectiveness policies
CREATE POLICY notification_effectiveness_select_own ON alert_system.notification_effectiveness
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_effectiveness_insert_own ON alert_system.notification_effectiveness
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Updated_at Triggers
-- ============================================================================

-- Trigger function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION alert_system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_patterns
DROP TRIGGER IF EXISTS update_user_patterns_updated_at ON alert_system.user_patterns;
CREATE TRIGGER update_user_patterns_updated_at
  BEFORE UPDATE ON alert_system.user_patterns
  FOR EACH ROW
  EXECUTE FUNCTION alert_system.update_updated_at_column();

-- ============================================================================
-- Data Retention: Cleanup old data (to be called by cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION alert_system.cleanup_old_behavior_data()
RETURNS void AS $$
BEGIN
  -- Delete behavior_events older than 90 days
  DELETE FROM alert_system.behavior_events
  WHERE timestamp < NOW() - INTERVAL '90 days';

  -- Delete commute_records older than 180 days
  DELETE FROM alert_system.commute_records
  WHERE commute_date < CURRENT_DATE - INTERVAL '180 days';

  -- Delete notification_effectiveness older than 90 days
  DELETE FROM alert_system.notification_effectiveness
  WHERE sent_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
