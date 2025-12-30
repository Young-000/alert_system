# Supabase 연결 문제 해결

## 현재 상황

### 문제
- 원격 환경에서 IPv6 연결 실패 (`ENETUNREACH`)
- 서버가 계속 재연결 시도 중

### 설정된 비밀번호
- 현재: `supaYje!090216` (URL 인코딩: `supaYje%21090216`)
- 대안: `supaYje!230209` (URL 인코딩: `supaYje%21230209`)

## 해결 방법

### 1. 로컬 환경에서 테스트 (권장)

원격 환경의 네트워크 제한으로 인해 연결이 안 될 수 있습니다. 로컬에서 테스트해보세요:

```bash
cd backend

# .env 파일 확인
cat .env

# 연결 테스트
npm run test:supabase

# 서버 시작
npm run start:dev
```

### 2. Supabase Dashboard에서 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **Database**
4. **Connection string** 확인
5. 비밀번호가 맞는지 확인

### 3. 비밀번호 재설정 (필요시)

비밀번호를 모르거나 확실하지 않다면:

1. Supabase Dashboard → Settings → Database
2. **"Reset database password"** 클릭
3. 새 비밀번호 설정
4. `.env` 파일 업데이트

### 4. 현재 .env 파일 내용

```bash
SUPABASE_URL=postgresql://postgres:supaYje%21090216@db.ayibvijmjygujjieueny.supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

**비밀번호 변경 방법:**
- `supaYje!090216` → `supaYje%21090216` (URL 인코딩)
- `supaYje!230209` → `supaYje%21230209` (URL 인코딩)

## 원격 환경 제한사항

현재 원격 환경에서는:
- IPv6 연결이 제한될 수 있음
- 네트워크 방화벽 설정으로 인해 외부 DB 연결이 안 될 수 있음

**해결책**: 로컬 환경에서 테스트하거나, Supabase의 Connection Pooling을 사용

## Connection Pooling 사용 (대안)

Supabase Dashboard에서:
1. Settings → Database
2. **Connection pooling** 섹션
3. **Session mode** 또는 **Transaction mode** 선택
4. Connection string 복사 (포트가 6543 또는 5432)

예시:
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

## 빠른 확인

로컬에서 다음 명령어로 확인:

```bash
cd backend

# 1. .env 파일 확인
cat .env

# 2. 연결 테스트
npm run test:supabase

# 3. 성공하면 서버 시작
npm run start:dev
```

성공하면:
```
✅ Supabase 연결 성공!
⏰ 현재 시간: ...
📊 PostgreSQL 버전: ...
```

## 다음 단계

1. ✅ `.env` 파일 생성 완료
2. ⏳ 로컬에서 연결 테스트 필요
3. ⏳ 서버 시작 확인 필요

**로컬 환경에서 테스트해보시고 결과를 알려주세요!**
