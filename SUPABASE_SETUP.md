# Supabase 설정 가이드

> ⚠️ **필독**: 이 프로젝트는 **Project 2 (비게임)**에 속합니다.
> 모든 테이블은 `alert_system` 스키마에 생성해야 합니다.
>
> 📖 글로벌 규칙: [`/SUPABASE_RULES.md`](/SUPABASE_RULES.md)

---

## 연결 정보

| 항목 | 값 |
|------|-----|
| **Project** | Project 2 (비게임) |
| **Project ID** | `gtnqsbdlybrkbsgtecvy` |
| **Schema** | `alert_system` |
| **URL** | `https://gtnqsbdlybrkbsgtecvy.supabase.co` |

---

## 1. 스키마 생성 (최초 1회)

```sql
-- alert_system 전용 스키마 생성
CREATE SCHEMA IF NOT EXISTS alert_system;
```

---

## 2. 테이블 생성

> ⚠️ 모든 테이블명 앞에 `alert_system.` 스키마 prefix 필수!

```sql
-- Users 테이블
CREATE TABLE alert_system.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subway Stations 테이블
CREATE TABLE alert_system.subway_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  line VARCHAR(100) NOT NULL,
  code VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON alert_system.subway_stations (name);
CREATE UNIQUE INDEX ON alert_system.subway_stations (name, line);

-- Alerts 테이블
CREATE TABLE alert_system.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES alert_system.users(id),
  name VARCHAR(255) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  alert_types JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  bus_stop_id VARCHAR(100),
  subway_station_id UUID REFERENCES alert_system.subway_stations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Push Subscriptions 테이블
CREATE TABLE alert_system.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES alert_system.users(id),
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX ON alert_system.push_subscriptions (endpoint);
```

---

## 3. RLS 활성화

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE alert_system.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.subway_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_system.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users: 본인 데이터만 접근
CREATE POLICY "Users can view own data" ON alert_system.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON alert_system.users
  FOR UPDATE USING (auth.uid() = id);

-- Subway Stations: 전체 읽기 허용 (참조 데이터)
CREATE POLICY "Anyone can view stations" ON alert_system.subway_stations
  FOR SELECT USING (true);

-- Alerts: 본인 알림만 접근
CREATE POLICY "Users can manage own alerts" ON alert_system.alerts
  FOR ALL USING (auth.uid() = user_id);

-- Push Subscriptions: 본인 구독만 접근
CREATE POLICY "Users can manage own subscriptions" ON alert_system.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

---

## 4. 환경 변수 설정

### backend/.env
```env
# Supabase Configuration - Project 2 (비게임)
# Schema: alert_system

SUPABASE_URL=https://gtnqsbdlybrkbsgtecvy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # 서버 전용, 클라이언트 노출 금지

NODE_ENV=development
PORT=3000
```

### frontend/.env
```env
# Supabase Configuration - Project 2 (비게임)
# Schema: alert_system

VITE_SUPABASE_URL=https://gtnqsbdlybrkbsgtecvy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=http://localhost:3000
```

---

## 5. 클라이언트 코드에서 스키마 지정

```typescript
// Supabase 클라이언트 설정
const { data } = await supabase
  .schema('alert_system')
  .from('users')
  .select('*');
```

---

## 참고 문서

- [글로벌 Supabase 규칙](/SUPABASE_RULES.md)
- [Supabase 공식 문서](https://supabase.com/docs)

---

*이 문서는 글로벌 규칙 `/SUPABASE_RULES.md`를 따릅니다.*
