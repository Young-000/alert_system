-- Alert System MVP schema

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS alert_system;

-- Users table
CREATE TABLE IF NOT EXISTS alert_system.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subway stations table
CREATE TABLE IF NOT EXISTS alert_system.subway_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  line VARCHAR(100) NOT NULL,
  code VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subway_stations_name_idx ON alert_system.subway_stations (name);

-- Alerts table
CREATE TABLE IF NOT EXISTS alert_system.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES alert_system.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  alert_types JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  bus_stop_id VARCHAR(100),
  subway_station_id UUID REFERENCES alert_system.subway_stations(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON alert_system.alerts (user_id);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS alert_system.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES alert_system.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON alert_system.push_subscriptions (endpoint);

-- Enable RLS on all tables
ALTER TABLE alert_system.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.subway_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
-- Note: Backend uses service role (bypasses RLS). These policies apply to Supabase client direct access.
CREATE POLICY "Users can view own data" ON alert_system.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON alert_system.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON alert_system.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS policies for subway_stations (read-only reference data for all authenticated users)
CREATE POLICY "Anyone can view subway stations" ON alert_system.subway_stations
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS policies for alerts
CREATE POLICY "Users can view own alerts" ON alert_system.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON alert_system.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON alert_system.alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON alert_system.alerts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for push_subscriptions
CREATE POLICY "Users can view own subscriptions" ON alert_system.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON alert_system.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON alert_system.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
