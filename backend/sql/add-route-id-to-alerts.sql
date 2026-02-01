-- Phase 2: Alert-Route 연동을 위한 route_id 컬럼 추가
-- Supabase SQL Editor에서 실행

-- 1. alerts 테이블에 route_id 컬럼 추가
ALTER TABLE alert_system.alerts
ADD COLUMN IF NOT EXISTS route_id UUID NULL;

-- 2. Foreign Key 제약 조건 추가 (선택적)
-- ALTER TABLE alert_system.alerts
-- ADD CONSTRAINT fk_alerts_route
-- FOREIGN KEY (route_id) REFERENCES alert_system.commute_routes(id)
-- ON DELETE SET NULL;

-- 3. 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_alerts_route_id
ON alert_system.alerts(route_id);

-- 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'alert_system'
AND table_name = 'alerts'
ORDER BY ordinal_position;
