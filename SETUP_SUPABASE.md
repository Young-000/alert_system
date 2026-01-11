# Supabase 연결 설정 가이드

> ⚠️ **중요**: 이 프로젝트는 **Project 2 (비게임)**에 속합니다.
> 글로벌 규칙: [`/SUPABASE_RULES.md`](/SUPABASE_RULES.md)

## ✅ 연결 정보

| 항목 | 값 |
|------|-----|
| **Project** | Project 2 (비게임) |
| **Project ID** | `gtnqsbdlybrkbsgtecvy` |
| **Schema** | `alert_system` |
| **Host** | `db.gtnqsbdlybrkbsgtecvy.supabase.co` |
| **Port** | `5432` |
| **Database** | `postgres` |
| **User** | `postgres` |

## 🚀 빠른 설정

### 1. 환경 변수 파일 생성

```bash
cd backend
cp .env.supabase.example .env
```

### 2. .env 파일 수정

`.env` 파일을 열고 Supabase 연결 정보 설정:

```env
# Project 2 (비게임) - alert_system 스키마
SUPABASE_URL=https://gtnqsbdlybrkbsgtecvy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # 서버 전용
```

> ⚠️ 모든 테이블은 `alert_system` 스키마 내에 생성해야 합니다.
> `public` 스키마 사용 금지 (글로벌 규칙)

### 3. 연결 테스트

```bash
# TypeScript 실행을 위해 ts-node 필요
npm install -g ts-node

# 연결 테스트
npm run test:supabase
```

또는 직접 실행:
```bash
npx ts-node test-supabase-connection.ts
```

### 4. 서버 시작

```bash
npm run start:dev
```

로그에서 다음 메시지 확인:
```
[Nest] INFO [TypeOrmModule] Database connection established
```

## 🔍 문제 해결

### 연결 실패 시

1. **비밀번호 확인**
   - Supabase Dashboard → Settings → Database
   - "Reset database password"로 비밀번호 재설정 가능

2. **연결 문자열 확인**
   - URL에 특수문자가 있으면 URL 인코딩 필요
   - 예: `@` → `%40`, `#` → `%23`

3. **네트워크 확인**
   - 인터넷 연결 확인
   - 방화벽 설정 확인

### 비밀번호를 잊어버렸다면

Supabase Dashboard에서:
1. Settings → Database
2. "Reset database password" 클릭
3. 새 비밀번호 설정
4. `.env` 파일 업데이트

## 📝 다음 단계

연결이 성공하면:
1. 테이블이 자동으로 생성됩니다 (`synchronize: true`)
2. Supabase Dashboard → Table Editor에서 확인 가능
3. API 개발 시작!

## 🔐 보안 주의사항

- `.env` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 이미 포함되어 있습니다
- 비밀번호는 안전하게 관리하세요

