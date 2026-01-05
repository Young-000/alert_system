-- Supabase pg_cron 스케줄러 설정
-- 이 스크립트는 Supabase 대시보드 > SQL Editor에서 실행하세요.

-- 1. pg_cron 확장 활성화 (Supabase Pro 플랜 필요)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 알림 발송 대상 조회 함수
CREATE OR REPLACE FUNCTION get_pending_alerts()
RETURNS TABLE (
  alert_id UUID,
  user_id UUID,
  alert_name VARCHAR,
  alert_types JSONB,
  user_email VARCHAR,
  user_location JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as alert_id,
    a.user_id,
    a.name as alert_name,
    a.alert_types,
    u.email as user_email,
    u.location as user_location
  FROM alerts a
  JOIN users u ON a.user_id = u.id
  WHERE a.enabled = true
  AND a.schedule IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. 알림 발송 로그 테이블
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id),
  user_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL, -- 'sent', 'failed', 'skipped'
  channel VARCHAR(50) NOT NULL, -- 'push', 'alimtalk', 'sms'
  message TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_logs_alert_id_idx ON notification_logs(alert_id);
CREATE INDEX IF NOT EXISTS notification_logs_created_at_idx ON notification_logs(created_at);

-- 4. 유저 전화번호 컬럼 추가 (알림톡용)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(20);
  END IF;
END $$;

-- 5. pg_cron 작업 등록 예시 (Supabase Pro 필요)
-- 매일 오전 7시에 출근 알림 발송
-- SELECT cron.schedule(
--   'morning-alert',
--   '0 7 * * 1-5', -- 월-금 오전 7시
--   $$
--   SELECT net.http_post(
--     'https://your-backend-url.com/api/notifications/trigger',
--     '{"type": "morning"}',
--     '{"Content-Type": "application/json", "Authorization": "Bearer your-api-key"}'
--   );
--   $$
-- );

-- 매일 오후 6시에 퇴근 알림 발송
-- SELECT cron.schedule(
--   'evening-alert',
--   '0 18 * * 1-5', -- 월-금 오후 6시
--   $$
--   SELECT net.http_post(
--     'https://your-backend-url.com/api/notifications/trigger',
--     '{"type": "evening"}',
--     '{"Content-Type": "application/json", "Authorization": "Bearer your-api-key"}'
--   );
--   $$
-- );

-- 스케줄러 작업 조회
-- SELECT * FROM cron.job;

-- 스케줄러 작업 삭제
-- SELECT cron.unschedule('morning-alert');
