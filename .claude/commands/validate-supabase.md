# Supabase Connection Validator

Supabase PostgreSQL 연결 상태를 검증하고 스키마 상태를 확인합니다.

## 검증 항목

### 1. Production API Health Check
```bash
curl -s https://alert-system-kdg9.onrender.com/health | jq .
```

### 2. Database Connection Test (via API)
```bash
curl -s -X POST https://alert-system-kdg9.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-validator-'$(date +%s)'@test.com","password":"Test123!","name":"Validator"}'
```

### 3. Supabase MCP Direct Query
Supabase MCP를 통해 직접 스키마 확인:
```
mcp__supabase__execute_sql:
  project_id: gtnqsbdlybrkbsgtecvy
  query: SELECT table_name FROM information_schema.tables WHERE table_schema = 'alert_system';
```

### 4. Data Persistence Test
1. 회원가입 API로 사용자 생성
2. 로그인 API로 사용자 인증 확인
3. Supabase MCP로 DB에서 직접 데이터 확인

## 결과 출력 형식

```
## Supabase Connection Validation

| Check | Status | Details |
|-------|--------|---------|
| API Health | ✅/❌ | Response time: Xms |
| DB Connection | ✅/❌ | Schema: alert_system |
| Tables | ✅/❌ | users, alerts, push_subscriptions, subway_stations |
| Data Write | ✅/❌ | User creation test |
| Data Read | ✅/❌ | User retrieval test |

### Connection Info
- Host: aws-1-ap-northeast-1.pooler.supabase.com
- Database: postgres
- Schema: alert_system
- SSL: Enabled
```

## 문제 해결 가이드

### "column does not exist" 에러
1. Render에서 `DB_SYNCHRONIZE=true` 설정
2. "Clear build cache & deploy" 실행
3. 테이블 재생성 확인

### Connection Timeout
1. Supabase Session Pooler 포트 확인 (5432)
2. SSL 설정 확인 (`rejectUnauthorized: false`)

## 사용법

```
/validate-supabase
```
