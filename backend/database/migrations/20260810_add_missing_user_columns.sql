-- ============================================================================
-- Migration: Add Missing `users` Columns
-- Created: 2026-08-10
-- Description: 20260726/20260803이 테이블 단위 갭은 닫았지만, **컬럼 단위 갭**이
--              루트 테이블 `users`에 남아 있다. schema.sql이 만드는 users는
--              (id, email, password_hash, name, location, created_at, updated_at)
--              7컬럼뿐인데 `UserEntity`는 phone_number와 google_id를 더 선언한다.
--
--              TypeORM은 엔티티에 선언된 모든 컬럼을 SELECT 목록에 넣으므로,
--              프로덕션(synchronize=false)에서 users를 읽는 **모든 경로**가
--              42703(column does not exist)으로 죽는다 — 로그인·회원가입·
--              알림 발송 대상 조회까지 전부.
--
--              테스트가 못 잡는 이유: 테스트는 SQLite + synchronize=true라
--              엔티티에서 테이블을 만들어낸다. DDL 파일의 부재가 보이지 않는다.
--
--              대상:
--                users.phone_number  — 알림톡 발송 대상 (`send-notification.use-case.ts:93`)
--                users.google_id     — Google 계정 연동 (`google-oauth.use-case.ts:34`)
--                users.password_hash — NOT NULL 해제 (소셜 로그인은 비밀번호가 없다)
--
--              모두 가산적(additive)이며 기존 행을 파괴하지 않는다.
--              적용은 사람이 판단한다 — 자동 리뷰는 파일만 만든다.
-- ============================================================================

-- 알림톡 수신번호. 엔티티 기본값이 ''이므로 기존 행도 ''로 채운다.
ALTER TABLE alert_system.users
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NOT NULL DEFAULT '';

COMMENT ON COLUMN alert_system.users.phone_number IS
  '알림톡(Solapi) 수신 번호. 미입력 시 빈 문자열 — 발송 대상에서 제외된다.';

-- Google 계정 식별자. 이메일 가입 사용자는 NULL이므로 UNIQUE + NULL 허용.
ALTER TABLE alert_system.users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

COMMENT ON COLUMN alert_system.users.google_id IS
  'Google OAuth sub. 이메일 가입 사용자는 NULL.';

-- Postgres UNIQUE 인덱스는 NULL을 서로 다른 값으로 취급하므로
-- 이메일 가입 사용자가 여럿이어도 충돌하지 않는다.
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx
  ON alert_system.users(google_id);

-- 소셜 로그인 사용자는 비밀번호가 없다(`google-oauth.use-case.ts`가 undefined 전달).
-- DDL의 NOT NULL이 남아 있으면 Google 신규 가입이 23502로 실패한다.
ALTER TABLE alert_system.users
  ALTER COLUMN password_hash DROP NOT NULL;
