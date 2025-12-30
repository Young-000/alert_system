# Alert System

출근/퇴근 시 필요한 날씨, 미세먼지, 버스/지하철 도착시간을 통합 제공하는 알림 시스템

## 기술 스택

### Backend
- Node.js + TypeScript + NestJS
- PostgreSQL
- Redis + BullMQ
- Jest (TDD)

### Frontend
- React + TypeScript
- Vite
- PWA (Web Push)
- React Testing Library + Jest

## 프로젝트 구조

```
alert_system/
├── backend/          # NestJS 백엔드 (Clean Architecture)
├── frontend/         # React 프론트엔드 (PWA)
└── docker-compose.yml
```

## 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- Docker (Redis용, 선택사항)

### 시작하기 (가장 간단한 방법: Supabase 사용)

#### 방법 1: Supabase만 사용 (권장)
1. **Supabase 프로젝트 생성**
   - [Supabase](https://supabase.com)에서 프로젝트 생성
   - `SIMPLE_SETUP.md` 참고

2. **환경 변수 설정**
   ```bash
   cd backend
   cp .env.example .env
   # .env 파일에 SUPABASE_URL 설정
   ```

3. **Redis 실행** (알림 큐용)
   ```bash
   docker-compose up -d redis
   ```

4. **Backend 시작**
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

5. **Frontend 시작**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

#### 방법 2: 로컬 PostgreSQL 사용 (선택사항)
1. **Docker 서비스 시작**
   ```bash
   docker-compose up -d
   ```

2. **Backend 설정**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # 환경 변수 설정
   npm run start:dev
   ```

**참고**: Supabase는 관리형 PostgreSQL을 제공하므로 별도 PostgreSQL 설치 불필요합니다.

## 테스트 실행

### Backend
```bash
cd backend
npm test              # 단위 테스트
npm run test:e2e      # E2E 테스트
npm run test:cov      # 커버리지
```

### Frontend
```bash
cd frontend
npm test              # 단위 테스트
npm run test:cov      # 커버리지
```

## Clean Architecture

프로젝트는 Clean Architecture 원칙을 따릅니다:

- **Domain Layer**: 비즈니스 로직과 엔티티
- **Application Layer**: 유스케이스와 DTO
- **Infrastructure Layer**: 외부 세계와의 인터페이스 (DB, API, Queue)
- **Presentation Layer**: API 엔드포인트 (NestJS Controllers)

## TDD

모든 기능은 테스트 주도 개발(TDD) 방식으로 작성됩니다:
1. 실패하는 테스트 작성
2. 최소한의 코드로 테스트 통과
3. 리팩토링
