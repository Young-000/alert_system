# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: alert-system
   - Database Password: 강력한 비밀번호 설정
   - Region: 가장 가까운 지역 선택

## 2. 연결 정보 확인

### Supabase Dashboard에서:
1. Settings → Database
2. Connection string 확인:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 또는 개별 정보:
- Host: `db.[PROJECT-REF].supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: 프로젝트 생성 시 설정한 비밀번호

## 3. 환경 변수 설정

### backend/.env 파일 생성:
```bash
# Supabase 연결 URL (전체 URL 사용 권장)
SUPABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# 또는 DATABASE_URL 사용 가능
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# 또는 개별 설정
# DATABASE_HOST=db.[PROJECT-REF].supabase.co
# DATABASE_PORT=5432
# DATABASE_USER=postgres
# DATABASE_PASSWORD=[YOUR-PASSWORD]
# DATABASE_NAME=postgres

# 기타 설정
NODE_ENV=development
PORT=3000
```

## 4. 테이블 자동 생성

### 개발 환경에서:
- 로컬 DB 사용 시 `synchronize: true` 설정으로 자동 생성됨
- Supabase 사용 시에는 `DB_SYNCHRONIZE=true`로 명시하거나 수동 생성 권장
- 프로덕션에서는 마이그레이션 사용 권장

### 수동 생성 (SQL Editor에서):
```sql
-- Users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  location JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subway Stations 테이블
CREATE TABLE subway_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  line VARCHAR(100) NOT NULL,
  code VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX subway_stations_name_idx ON subway_stations (name);
CREATE UNIQUE INDEX subway_stations_name_line_idx ON subway_stations (name, line);

-- Alerts 테이블
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  alert_types JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  bus_stop_id VARCHAR(100),
  subway_station_id UUID REFERENCES subway_stations(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Push Subscriptions 테이블
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX push_subscriptions_endpoint_idx ON push_subscriptions (endpoint);
```

### 지하철역 데이터 시드
```bash
cd backend
npm run db:apply
npm run seed:subway
```

## 5. 연결 테스트

```bash
cd backend
npm run start:dev
```

로그에서 연결 성공 메시지 확인:
```
[Nest] INFO [TypeOrmModule] Database connection established
```

## 6. Supabase Studio 사용

- Supabase Dashboard → Table Editor에서 데이터 확인
- SQL Editor에서 직접 쿼리 실행 가능
- API 자동 생성 (REST API, GraphQL)

## 7. 보안 설정

### Row Level Security (RLS) 활성화 (선택사항)
```sql
-- Users 테이블에 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책 생성 예시
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

## 8. 로컬 개발 vs Supabase

### ⚠️ 중요: Supabase만 사용해도 됩니다!

**Supabase = 관리형 PostgreSQL 데이터베이스**
- 별도로 PostgreSQL을 설치하거나 설정할 필요가 **없습니다**
- Supabase가 모든 데이터베이스 관리를 처리합니다
- `docker-compose.yml`의 PostgreSQL은 **선택사항**입니다 (로컬 개발용)

### Supabase 사용 (권장):
```env
# .env 파일에 이것만 설정하면 됩니다
SUPABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
DB_SYNCHRONIZE=false
```

**이것만으로 충분합니다!** 별도 PostgreSQL 설치 불필요.

### 로컬 PostgreSQL 사용 (선택사항):
로컬에서 개발하고 싶을 때만 사용:
```bash
# docker-compose.yml의 PostgreSQL 실행
docker-compose up -d postgres
```

```env
# .env 파일
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=alert_user
DATABASE_PASSWORD=alert_password
DATABASE_NAME=alert_system
```

### Redis는 여전히 필요합니다
알림 큐(BullMQ)를 위해 Redis가 필요합니다:
```bash
# Redis만 실행
docker-compose up -d redis
```

또는 Supabase와 함께 사용:
```env
# Supabase 사용 시
SUPABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
REDIS_HOST=localhost
REDIS_PORT=6379
DB_SYNCHRONIZE=false
```

코드는 자동으로 환경 변수를 확인하여 적절한 연결을 사용합니다.

## 9. 문제 해결

### 연결 실패
- 비밀번호 확인
- IP 주소가 Supabase 허용 목록에 있는지 확인
- SSL 설정 확인 (`ssl: { rejectUnauthorized: false }`)

### 타임아웃
- 네트워크 연결 확인
- Supabase 프로젝트 상태 확인

### 권한 오류
- 데이터베이스 사용자 권한 확인
- RLS 정책 확인
