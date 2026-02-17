# 설정 체크리스트

## ✅ 완료된 항목

- [x] 프로젝트 구조 설정 (Clean Architecture)
- [x] Backend 의존성 설치
- [x] Supabase 연결 정보 설정 (.env 파일)
- [x] 미세먼지 API 구현 및 테스트
- [x] AirQualityModule 등록

## ⚠️ 선택사항 (필수 아님)

- [ ] Redis 실행 (알림 큐용, 나중에 필요)
- [ ] Frontend 의존성 설치 (프론트엔드 개발 시)

## 🔧 지금 해야 할 것

### 1. 서버 시작 테스트

```bash
cd backend
npm run start:dev
```

**확인사항:**
- ✅ 서버가 시작되는가?
- ✅ 데이터베이스 연결이 성공하는가?
- ✅ 테이블이 자동 생성되는가?

### 2. API 테스트

서버가 시작되면:

```bash
# 미세먼지 API 테스트
curl "http://localhost:3000/air-quality/location?lat=37.5665&lng=126.9780"

# 사용자 생성 테스트
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### 3. Supabase에서 테이블 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. Table Editor에서 다음 테이블 확인:
   - `users`
   - `alerts`
   - `push_subscriptions`

## 🚀 다음 단계 (선택사항)

### Redis 설정 (알림 기능 사용 시)

```bash
# Redis 실행
docker-compose up -d redis

# 확인
docker ps | grep redis
```

### Frontend 설정 (프론트엔드 개발 시)

```bash
cd frontend
npm install
npm run dev
```

## 📝 문제 해결

### 서버가 시작되지 않으면

1. **포트 충돌 확인**
   ```bash
   lsof -i :3000
   ```

2. **환경 변수 확인**
   ```bash
   cd backend
   cat .env | grep SUPABASE_URL
   ```

3. **의존성 재설치**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 데이터베이스 연결 실패 시

1. **Supabase 프로젝트 상태 확인**
   - Dashboard에서 프로젝트가 활성화되어 있는지 확인

2. **비밀번호 확인**
   - `.env` 파일의 비밀번호가 올바른지 확인

3. **연결 테스트**
   ```bash
   npm run test:supabase
   ```

## ✅ 모든 설정 완료 확인

다음 명령어로 확인:

```bash
# 1. 서버 시작
cd backend && npm run start:dev

# 2. 새 터미널에서 API 테스트
curl "http://localhost:3000/air-quality/location?lat=37.5665&lng=126.9780"
```

성공하면 JSON 응답이 반환됩니다!

