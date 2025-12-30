# Supabase 연결 문제 해결 가이드

## 🔍 현재 문제

1. **.env 파일 없음** - 환경 변수가 설정되지 않음
2. **TypeScript 컴파일 에러** - supertest 타입 문제

## ✅ 해결 방법

### 1. .env 파일 생성

`backend/.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 연결 정보
SUPABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres

# 또는 개별 설정
# DATABASE_HOST=db.[YOUR-PROJECT].supabase.co
# DATABASE_PORT=5432
# DATABASE_USER=postgres
# DATABASE_PASSWORD=[YOUR-PASSWORD]
# DATABASE_NAME=postgres

# 기타 설정
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# VAPID 키 (Web Push용)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com

# Redis (선택사항)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. Supabase URL 찾는 방법

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. Settings → Database
4. Connection string → Connection pooling → URI 복사
5. 비밀번호를 실제 비밀번호로 교체

### 3. 연결 테스트

```bash
cd backend
npm run test:supabase
```

성공하면:
```
✅ Supabase 연결 성공!
⏰ 현재 시간: ...
📊 PostgreSQL 버전: ...
```

### 4. 서버 시작

```bash
cd backend
npm run start:dev
```

## 🐛 문제 해결

### 문제: "SUPABASE_URL 환경 변수가 설정되지 않았습니다"
**해결**: `.env` 파일 생성 및 `SUPABASE_URL` 설정

### 문제: "비밀번호를 설정해주세요"
**해결**: `SUPABASE_URL`에서 `[PASSWORD]`를 실제 비밀번호로 교체

### 문제: "연결 실패"
**해결**:
1. 비밀번호 확인
2. Supabase 프로젝트 활성화 확인
3. 네트워크 연결 확인
4. URL 형식 확인

### 문제: TypeScript 컴파일 에러
**해결**: 
```bash
npm install --save-dev @types/supertest
```

## 📝 체크리스트

- [ ] `.env` 파일 생성
- [ ] `SUPABASE_URL` 설정 (비밀번호 포함)
- [ ] `npm run test:supabase` 실행하여 연결 확인
- [ ] 서버 시작 테스트

## 💡 빠른 시작

```bash
# 1. .env 파일 생성
cd backend
cat > .env << EOF
SUPABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
EOF

# 2. 연결 테스트
npm run test:supabase

# 3. 서버 시작
npm run start:dev
```
