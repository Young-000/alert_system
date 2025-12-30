# 간단한 설정 가이드 (Supabase만 사용)

## 🎯 가장 간단한 방법: Supabase만 사용

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 생성 (약 2분 소요)

### 2. 연결 정보 복사
Supabase Dashboard → Settings → Database → Connection string 복사

### 3. 환경 변수 설정
```bash
cd backend
cp .env.example .env
```

`.env` 파일 수정:
```env
# Supabase 연결 URL (이것만 설정하면 됨!)
SUPABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# 기타 설정
NODE_ENV=development
PORT=3000
AIR_QUALITY_API_KEY=c854d1870b7792e9e000563a58e8d1e4aa664c0642501163c4b9e420a90f8686
```

### 4. Redis만 실행 (알림 큐용)
```bash
# Redis만 실행 (PostgreSQL은 Supabase 사용)
docker-compose up -d redis
```

또는 Redis도 클라우드 사용:
- [Upstash Redis](https://upstash.com) (무료 티어 제공)
- `.env`에 `REDIS_HOST` 설정

### 5. 서버 시작
```bash
cd backend
npm install
npm run start:dev
```

**끝!** PostgreSQL은 Supabase가 관리하므로 별도 설치 불필요합니다.

## ❓ 자주 묻는 질문

### Q: PostgreSQL을 따로 설치해야 하나요?
**A: 아니요!** Supabase가 PostgreSQL을 제공합니다. 별도 설치 불필요.

### Q: docker-compose.yml의 PostgreSQL은 뭔가요?
**A: 선택사항입니다.** 로컬에서 개발하고 싶을 때만 사용합니다. Supabase만 사용해도 됩니다.

### Q: Redis는 왜 필요한가요?
**A: 알림 스케줄링(BullMQ)을 위해 필요합니다.** 
- 로컬: `docker-compose up -d redis`
- 클라우드: Upstash Redis 사용

### Q: Supabase 무료 티어로 충분한가요?
**A: 네!** 개발 및 소규모 프로젝트에는 충분합니다.
- 500MB 데이터베이스
- 2GB 대역폭
- 무제한 API 요청

## 🚀 프로덕션 배포 시

프로덕션에서도 Supabase를 계속 사용하거나, 필요시 자체 PostgreSQL 서버로 마이그레이션 가능합니다.

