-- Migration: Add updated_at column to alerts table
-- Date: 2026-01-19
-- Description: Add updated_at timestamp column for tracking alert modifications

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'alert_system'
    AND table_name = 'alerts'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE alert_system.alerts
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

    -- Set initial value for existing rows
    UPDATE alert_system.alerts
    SET updated_at = created_at
    WHERE updated_at IS NULL;
  END IF;
END $$;

-- Create trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION alert_system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alerts_updated_at_trigger ON alert_system.alerts;
CREATE TRIGGER alerts_updated_at_trigger
  BEFORE UPDATE ON alert_system.alerts
  FOR EACH ROW
  EXECUTE FUNCTION alert_system.update_updated_at_column();
