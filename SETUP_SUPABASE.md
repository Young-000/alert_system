# Supabase 연결 설정 가이드

## ✅ 제공된 연결 정보

```
Host: db.ayibvijmjygujjieueny.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [프로젝트 생성 시 설정한 비밀번호]
```

## 🚀 빠른 설정

### 1. 환경 변수 파일 생성

```bash
cd backend
cp .env.supabase.example .env
```

### 2. .env 파일 수정

`.env` 파일을 열고 `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체:

```env
SUPABASE_URL=postgresql://postgres:실제비밀번호@db.ayibvijmjygujjieueny.supabase.co:5432/postgres
```

**예시:**
```env
SUPABASE_URL=postgresql://postgres:mypassword123@db.ayibvijmjygujjieueny.supabase.co:5432/postgres
```

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

