# 배포 가이드

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
# 프로덕션 환경 변수 파일 생성
cp .env.production.example .env.production

# .env.production 파일 수정
# - SUPABASE_URL 설정
# - VAPID 키 생성 및 설정
# - 기타 API 키 설정
```

### 2. VAPID 키 생성

```bash
cd backend
npx web-push generate-vapid-keys
```

출력된 키를 `.env.production`에 추가:
```bash
VAPID_PUBLIC_KEY=생성된_공개키
VAPID_PRIVATE_KEY=생성된_개인키
```

### 3. Docker Compose로 배포

```bash
# 프로덕션 모드로 실행
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 중지
docker-compose -f docker-compose.prod.yml down
```

### 4. 개별 서비스 배포

#### 백엔드만 배포
```bash
cd backend
docker build -t alert-system-backend .
docker run -p 3000:3000 --env-file .env.production alert-system-backend
```

#### 프론트엔드만 배포
```bash
cd frontend
docker build -t alert-system-frontend .
docker run -p 80:80 alert-system-frontend
```

## 📦 배포 플랫폼별 가이드

### Vercel (프론트엔드) + Railway (백엔드)

#### Vercel 배포
1. [Vercel](https://vercel.com)에 로그인
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: `VITE_API_URL` 설정

#### Railway 배포
1. [Railway](https://railway.app)에 로그인
2. New Project → Deploy from GitHub
3. 환경 변수 설정
4. 자동 배포 완료

### Docker Compose (자체 서버)

```bash
# 서버에 Docker 설치
# docker-compose.prod.yml 및 .env.production 업로드
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 환경 변수

### 백엔드 필수
- `SUPABASE_URL`: Supabase 연결 URL
- `VAPID_PUBLIC_KEY`: Web Push 공개키
- `VAPID_PRIVATE_KEY`: Web Push 개인키
- `FRONTEND_URL`: 프론트엔드 URL (CORS용)

### 프론트엔드 필수
- `VITE_API_URL`: 백엔드 API URL

## 📝 체크리스트

배포 전 확인:
- [ ] 환경 변수 설정 완료
- [ ] VAPID 키 생성 완료
- [ ] Supabase 연결 확인
- [ ] Redis 실행 확인
- [ ] 프로덕션 빌드 테스트
- [ ] 헬스체크 엔드포인트 확인 (`/health`)

## 🎉 완료!

배포가 완료되면:
- 프론트엔드: `http://your-domain.com`
- 백엔드: `http://your-api-domain.com:3000`
