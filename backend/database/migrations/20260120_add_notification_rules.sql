-- Migration: Add Smart Notification Rules System
-- Date: 2026-01-20
-- Description: Add notification_rules table for rule-based smart notifications

-- Notification rules table
CREATE TABLE IF NOT EXISTS alert_system.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,  -- 'weather', 'air_quality', 'transit', 'transit_comparison'
  priority INTEGER NOT NULL DEFAULT 50,  -- 0-100 (CRITICAL=100, HIGH=75, MEDIUM=50, LOW=25)
  conditions JSONB NOT NULL,  -- Array of RuleCondition objects
  message_template TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  is_system_rule BOOLEAN DEFAULT true,
  user_id UUID REFERENCES alert_system.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS notification_rules_category_idx
  ON alert_system.notification_rules (category);
CREATE INDEX IF NOT EXISTS notification_rules_user_id_idx
  ON alert_system.notification_rules (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_rules_enabled_idx
  ON alert_system.notification_rules (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS notification_rules_system_idx
  ON alert_system.notification_rules (is_system_rule) WHERE is_system_rule = true;

-- Enable RLS
ALTER TABLE alert_system.notification_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- System rules visible to all authenticated users (read-only)
CREATE POLICY "Anyone can view system rules" ON alert_system.notification_rules
  FOR SELECT USING (is_system_rule = true OR auth.uid() = user_id);

-- Users can manage their own custom rules
CREATE POLICY "Users can insert own rules" ON alert_system.notification_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system_rule = false);

CREATE POLICY "Users can update own rules" ON alert_system.notification_rules
  FOR UPDATE USING (auth.uid() = user_id AND is_system_rule = false);

CREATE POLICY "Users can delete own rules" ON alert_system.notification_rules
  FOR DELETE USING (auth.uid() = user_id AND is_system_rule = false);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION alert_system.update_notification_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_rules_updated_at_trigger ON alert_system.notification_rules;
CREATE TRIGGER notification_rules_updated_at_trigger
  BEFORE UPDATE ON alert_system.notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION alert_system.update_notification_rules_updated_at();
