# Supabase 연결 상태

## 현재 상황

### 비밀번호 설정 완료
- ✅ `.env` 파일 생성됨
- ✅ 비밀번호: `supaYje!090216` (URL 인코딩: `supaYje%21090216`)

### 연결 문제
- ❌ IPv6 연결 시도 실패 (`ENETUNREACH`)
- ⚠️ 원격 환경의 네트워크 설정 문제 가능성

## 해결 방법

### 옵션 1: 로컬에서 테스트
로컬 환경에서 직접 테스트해보세요:

```bash
cd backend
npm run test:supabase
```

### 옵션 2: Supabase Dashboard에서 확인
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. Settings → Database
4. Connection string 확인
5. 비밀번호 재설정 (필요시)

### 옵션 3: 서버 시작 시 자동 연결
서버를 시작하면 TypeORM이 자동으로 연결을 시도합니다:

```bash
cd backend
npm run start:dev
```

서버가 시작되면:
- 데이터베이스 연결 성공 시: 테이블 자동 생성
- 연결 실패 시: 에러 메시지 표시

## 현재 설정

### .env 파일
```bash
SUPABASE_URL=postgresql://postgres:supaYje%21090216@db.ayibvijmjygujjieueny.supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 비밀번호 URL 인코딩
- `!` → `%21`
- `supaYje!090216` → `supaYje%21090216`

## 다음 단계

1. 로컬 환경에서 서버 시작 테스트
2. Supabase Dashboard에서 연결 상태 확인
3. 필요시 비밀번호 재설정

## 참고

- 원격 환경에서는 IPv6 연결 문제가 발생할 수 있습니다
- 로컬 환경에서는 정상 작동할 가능성이 높습니다
- 서버 시작 시 TypeORM이 자동으로 재연결을 시도합니다
