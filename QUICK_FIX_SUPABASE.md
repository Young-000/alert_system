# Supabase 연결 빠른 수정 가이드

## 🔴 문제: .env 파일이 없습니다

현재 `.env` 파일이 없어서 Supabase 연결이 안 됩니다.

## ✅ 해결 방법

### 1단계: .env 파일 생성

`backend` 폴더에 `.env` 파일을 생성하세요:

```bash
cd backend
touch .env
```

### 2단계: Supabase 연결 정보 입력

`.env` 파일에 다음 내용을 추가하세요:

```bash
SUPABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
```

**중요**: 
- `YOUR_PASSWORD`를 실제 Supabase 비밀번호로 교체
- `YOUR_PROJECT`를 실제 프로젝트 ID로 교체

### 3단계: Supabase URL 찾는 방법

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **Database** 클릭
4. **Connection string** 섹션에서 **Connection pooling** 선택
5. **URI** 복사
6. 비밀번호 부분을 실제 비밀번호로 교체

예시:
```
postgresql://postgres:your-actual-password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 4단계: 연결 테스트

```bash
cd backend
npm run test:supabase
```

성공하면:
```
✅ Supabase 연결 성공!
```

### 5단계: 서버 시작

```bash
npm run start:dev
```

## 🐛 여전히 안 되면?

### 에러: "SUPABASE_URL 환경 변수가 설정되지 않았습니다"
→ `.env` 파일이 `backend` 폴더에 있는지 확인

### 에러: "비밀번호를 설정해주세요"
→ `SUPABASE_URL`에서 `[PASSWORD]` 또는 `[YOUR-PASSWORD]`를 실제 비밀번호로 교체

### 에러: "연결 실패"
→ 다음을 확인:
1. 비밀번호가 맞는지
2. Supabase 프로젝트가 활성화되어 있는지
3. 네트워크 연결
4. URL 형식이 올바른지

## 📝 체크리스트

- [ ] `backend/.env` 파일 생성
- [ ] `SUPABASE_URL` 설정 (비밀번호 포함)
- [ ] `npm run test:supabase` 실행
- [ ] 연결 성공 확인
- [ ] `npm run start:dev` 실행

## 💡 빠른 명령어

```bash
# .env 파일 생성 및 편집
cd backend
nano .env  # 또는 vi .env, code .env

# 연결 테스트
npm run test:supabase

# 서버 시작
npm run start:dev
```
