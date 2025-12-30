# 데이터베이스 설계 문서

## 현재 DB 구조

### 데이터베이스: PostgreSQL

#### 연결 방식
- **로컬**: PostgreSQL 직접 연결
- **클라우드**: Supabase (관리형 PostgreSQL)
- 환경 변수로 자동 전환: `SUPABASE_URL` 있으면 Supabase, 없으면 로컬

---

## 테이블 구조

### 1. users 테이블

**용도**: 사용자 정보 저장

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  location JSONB,  -- { address: string, lat: number, lng: number }
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 필드 설명
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 사용자 고유 ID (PK) |
| `email` | VARCHAR | 이메일 (UNIQUE) |
| `name` | VARCHAR | 사용자 이름 |
| `location` | JSONB | 위치 정보 (nullable) |
| `created_at` | TIMESTAMP | 생성 시간 |

#### location JSONB 구조
```json
{
  "address": "서울시 강남구",
  "lat": 37.5665,
  "lng": 126.9780
}
```

#### 사용 예시
```sql
-- 사용자 생성
INSERT INTO users (email, name, location) 
VALUES (
  'user@example.com',
  '홍길동',
  '{"address": "서울시 강남구", "lat": 37.5665, "lng": 126.9780}'::jsonb
);

-- 사용자 조회
SELECT * FROM users WHERE email = 'user@example.com';
```

---

### 2. alerts 테이블

**용도**: 개인별 알림 설정 저장 (스케줄 포함)

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  schedule VARCHAR NOT NULL,        -- Cron 패턴 (예: "0 8 * * *")
  alert_types JSONB NOT NULL,       -- ["weather", "airQuality", "bus", "subway"]
  enabled BOOLEAN DEFAULT true,
  bus_stop_id VARCHAR,              -- 버스 정류장 ID (nullable)
  subway_station_id VARCHAR,        -- 지하철 역 ID (nullable)
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_enabled ON alerts(enabled);
```

#### 필드 설명
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 알림 고유 ID (PK) |
| `user_id` | UUID | 사용자 ID (FK → users.id) |
| `name` | VARCHAR | 알림 이름 (예: "출근 알림") |
| `schedule` | VARCHAR | Cron 패턴 (예: "0 8 * * *" = 매일 8시) |
| `alert_types` | JSONB | 알림 타입 배열 |
| `enabled` | BOOLEAN | 활성화 여부 |
| `bus_stop_id` | VARCHAR | 버스 정류장 ID (nullable) |
| `subway_station_id` | VARCHAR | 지하철 역 ID (nullable) |
| `created_at` | TIMESTAMP | 생성 시간 |

#### alert_types JSONB 구조
```json
["weather", "airQuality", "bus", "subway"]
```

#### schedule Cron 패턴 예시
```
"0 8 * * *"      → 매일 오전 8시
"0 18 * * 1-5"   → 평일 오후 6시
"30 7 * * *"     → 매일 오전 7시 30분
"0 9,18 * * *"   → 매일 오전 9시, 오후 6시
```

#### 사용 예시
```sql
-- 알림 생성
INSERT INTO alerts (user_id, name, schedule, alert_types, bus_stop_id)
VALUES (
  'user-uuid-here',
  '출근 알림',
  '0 8 * * *',
  '["weather", "airQuality"]'::jsonb,
  'bus-stop-123'
);

-- 사용자별 알림 조회
SELECT * FROM alerts WHERE user_id = 'user-uuid-here' AND enabled = true;

-- 스케줄별 알림 조회 (특정 시간에 실행할 알림 찾기)
SELECT * FROM alerts WHERE schedule = '0 8 * * *' AND enabled = true;
```

---

### 3. push_subscriptions 테이블

**용도**: 웹 푸시 구독 정보 저장

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,           -- 브라우저별 고유 endpoint
  keys JSONB NOT NULL,                -- { p256dh: string, auth: string }
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
```

#### 필드 설명
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 구독 고유 ID (PK) |
| `user_id` | UUID | 사용자 ID (FK → users.id) |
| `endpoint` | TEXT | 브라우저별 고유 endpoint URL |
| `keys` | JSONB | 암호화 키 |
| `created_at` | TIMESTAMP | 생성 시간 |

#### keys JSONB 구조
```json
{
  "p256dh": "base64-encoded-public-key",
  "auth": "base64-encoded-auth-secret"
}
```

#### 사용 예시
```sql
-- 구독 저장
INSERT INTO push_subscriptions (user_id, endpoint, keys)
VALUES (
  'user-uuid-here',
  'https://fcm.googleapis.com/fcm/send/...',
  '{"p256dh": "...", "auth": "..."}'::jsonb
);

-- 사용자별 구독 조회
SELECT * FROM push_subscriptions WHERE user_id = 'user-uuid-here';
```

---

## ERD (Entity Relationship Diagram)

```
┌─────────────┐
│    users    │
├─────────────┤
│ id (PK)     │
│ email       │◄────┐
│ name        │     │
│ location    │     │
│ created_at  │     │
└─────────────┘     │
                    │
        ┌───────────┼───────────┐
        │           │           │
        │           │           │
┌───────▼──────┐  ┌─▼──────────────┐
│   alerts     │  │push_subscriptions│
├──────────────┤  ├─────────────────┤
│ id (PK)      │  │ id (PK)         │
│ user_id (FK) │  │ user_id (FK)    │
│ name         │  │ endpoint        │
│ schedule     │  │ keys            │
│ alert_types  │  │ created_at      │
│ enabled      │  └─────────────────┘
│ bus_stop_id  │
│ subway_      │
│   station_id │
│ created_at   │
└──────────────┘
```

---

## 관계 설명

### users ↔ alerts (1:N)
- 한 사용자는 여러 알림을 가질 수 있음
- `alerts.user_id` → `users.id`
- CASCADE DELETE: 사용자 삭제 시 알림도 삭제

### users ↔ push_subscriptions (1:N)
- 한 사용자는 여러 기기에서 구독 가능 (다중 기기)
- `push_subscriptions.user_id` → `users.id`
- CASCADE DELETE: 사용자 삭제 시 구독도 삭제

---

## 데이터 흐름

### 알림 생성 흐름
```
1. 사용자가 알림 설정 입력
   ↓
2. POST /alerts
   {
     "userId": "user-uuid",
     "name": "출근 알림",
     "schedule": "0 8 * * *",
     "alertTypes": ["weather", "airQuality"]
   }
   ↓
3. alerts 테이블에 INSERT
   ↓
4. (미완성) BullMQ 큐에 스케줄 등록
```

### 알림 전송 흐름
```
1. BullMQ 스케줄러가 시간 도래 감지
   ↓
2. alerts 테이블에서 해당 스케줄의 알림 조회
   ↓
3. users 테이블에서 사용자 정보 조회 (위치 정보)
   ↓
4. 외부 API 호출 (날씨, 미세먼지 등)
   ↓
5. push_subscriptions 테이블에서 구독 정보 조회
   ↓
6. PushNotificationService로 알림 전송
```

---

## 인덱스 전략

### 현재 인덱스
```sql
-- alerts 테이블
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_enabled ON alerts(enabled);

-- push_subscriptions 테이블
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
```

### 추가 권장 인덱스
```sql
-- 스케줄 조회 최적화 (미래에 필요할 수 있음)
CREATE INDEX idx_alerts_schedule ON alerts(schedule) WHERE enabled = true;

-- 복합 인덱스 (사용자별 활성 알림 조회)
CREATE INDEX idx_alerts_user_enabled ON alerts(user_id, enabled);
```

---

## 데이터 예시

### users 테이블
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "홍길동",
  "location": {
    "address": "서울시 강남구",
    "lat": 37.5665,
    "lng": 126.9780
  },
  "created_at": "2024-01-01T00:00:00Z"
}
```

### alerts 테이블
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "출근 알림",
  "schedule": "0 8 * * *",
  "alert_types": ["weather", "airQuality"],
  "enabled": true,
  "bus_stop_id": null,
  "subway_station_id": null,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### push_subscriptions 테이블
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc123...",
  "keys": {
    "p256dh": "BGx...",
    "auth": "abc..."
  },
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## 마이그레이션 전략

### 현재 상태
- TypeORM `synchronize: true` (개발 환경)
- 자동 테이블 생성/수정

### 프로덕션 권장
- TypeORM Migration 사용
- 수동 마이그레이션 파일 관리

---

## 보안 고려사항

1. **민감 정보**: `push_subscriptions.keys`는 암호화 고려
2. **인덱스**: `endpoint`는 UNIQUE로 중복 방지
3. **CASCADE DELETE**: 사용자 삭제 시 관련 데이터 정리
4. **JSONB 검증**: 애플리케이션 레벨에서 스키마 검증 필요
