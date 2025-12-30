# 배포 가이드

## 🚀 배포 전 체크리스트

### 백엔드
- [x] 모든 기능 구현 완료
- [x] 테스트 통과
- [ ] 환경 변수 설정
- [ ] Docker 설정
- [ ] 프로덕션 빌드 테스트

### 프론트엔드
- [ ] UI/UX 구현
- [ ] 프로덕션 빌드 테스트
- [ ] PWA 설정 완료
- [ ] 환경 변수 설정

### 인프라
- [ ] Supabase 프로덕션 설정
- [ ] Redis 프로덕션 설정
- [ ] 도메인 설정 (선택사항)
- [ ] SSL 인증서 (HTTPS)

---

## 📦 배포 옵션

### 옵션 1: Vercel (프론트엔드) + Railway (백엔드) - 권장

**장점**:
- 빠른 배포
- 무료 티어 제공
- 자동 HTTPS
- CI/CD 통합

**단계**:
1. Vercel에 프론트엔드 배포
2. Railway에 백엔드 배포
3. 환경 변수 설정
4. 도메인 연결

### 옵션 2: Docker Compose (자체 서버)

**장점**:
- 완전한 제어
- 비용 절감
- 확장성

**단계**:
1. Dockerfile 작성
2. docker-compose.prod.yml 작성
3. 서버에 배포
4. Nginx 리버스 프록시 설정

### 옵션 3: AWS/GCP/Azure

**장점**:
- 엔터프라이즈급
- 높은 가용성
- 확장성

**단계**:
1. 클라우드 계정 생성
2. 컨테이너 서비스 설정 (ECS, Cloud Run 등)
3. 데이터베이스 설정
4. 배포

---

## 🔧 배포 설정 파일 예시

### 백엔드 Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - REDIS_HOST=redis
      - NODE_ENV=production
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## 📊 예상 소요시간

### MVP 배포 (최소 기능)
- 프론트엔드 UI: 2-3일
- 배포 설정: 1일
- **총: 3-4일**

### 완전한 배포 (모든 기능)
- 프론트엔드 UI: 3-4일
- 배포 설정: 1-2일
- 보안 및 모니터링: 1-2일
- **총: 5-8일**

---

## 💡 다음 단계

1. **프론트엔드 UI 구현**부터 시작
2. **로컬에서 테스트**
3. **배포 설정**
4. **프로덕션 배포**
