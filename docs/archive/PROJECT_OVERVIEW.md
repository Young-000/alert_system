# 프로젝트 전체 개요

## 📋 프로젝트 정보

**이름**: Alert System  
**목적**: 출근/퇴근 시 필요한 날씨, 미세먼지, 버스/지하철 도착시간을 통합 제공하는 알림 시스템  
**아키텍처**: Clean Architecture + TDD  
**상태**: 개발 중 (미세먼지 API 구현 완료)

## 🏗️ 프로젝트 구조

```
alert_system/
├── backend/                    # NestJS 백엔드
│   ├── src/
│   │   ├── domain/            # 도메인 레이어 (비즈니스 로직)
│   │   │   ├── entities/      # 엔티티 (User, Alert, Weather 등)
│   │   │   └── repositories/  # Repository 인터페이스
│   │   ├── application/       # 애플리케이션 레이어 (유스케이스)
│   │   │   ├── dto/           # 데이터 전송 객체
│   │   │   └── use-cases/     # 비즈니스 유스케이스
│   │   ├── infrastructure/     # 인프라 레이어 (외부 연동)
│   │   │   ├── persistence/   # 데이터베이스 (PostgreSQL/Supabase)
│   │   │   ├── external-apis/ # 외부 API 클라이언트
│   │   │   ├── push/          # 푸시 알림 서비스
│   │   │   └── queue/         # 작업 큐 (BullMQ)
│   │   └── presentation/      # 프레젠테이션 레이어 (API)
│   │       ├── controllers/   # REST API 컨트롤러
│   │       └── modules/       # NestJS 모듈
│   └── test/                  # 테스트 파일
│
├── frontend/                   # React 프론트엔드 (PWA)
│   ├── src/
│   │   ├── domain/            # 도메인 모델
│   │   ├── application/        # 애플리케이션 서비스
│   │   ├── infrastructure/     # API 클라이언트, 로컬 스토리지
│   │   └── presentation/       # React 컴포넌트
│   │       ├── pages/         # 페이지 컴포넌트
│   │       └── hooks/         # Custom hooks
│   └── public/                # PWA 매니페스트, Service Worker
│
└── 문서/                       # 설정 가이드 및 문서
```

## ✅ 구현 완료된 기능

### Backend

#### 1. Domain Layer
- ✅ User 엔티티 (id, email, name, location)
- ✅ Alert 엔티티 (id, userId, name, schedule, alertTypes, enabled)
- ✅ Weather, AirQuality, BusArrival, SubwayArrival 엔티티
- ✅ Repository 인터페이스 (User, Alert)

#### 2. Application Layer
- ✅ CreateUserUseCase (사용자 생성)
- ✅ CreateAlertUseCase (알림 생성)
- ✅ GetAirQualityUseCase (미세먼지 조회)
- ✅ SendNotificationUseCase (알림 전송)

#### 3. Infrastructure Layer
- ✅ PostgreSQL/Supabase 연동 (TypeORM)
- ✅ 미세먼지 API 클라이언트 (실제 API 연동 완료)
- ✅ 날씨 API 클라이언트 (구현 완료, 테스트 필요)
- ✅ 버스 API 클라이언트 (구현 완료, 테스트 필요)
- ✅ 지하철 API 클라이언트 (구현 완료, 테스트 필요)
- ✅ Web Push 알림 서비스
- ✅ BullMQ 작업 큐 (스케줄러)

#### 4. Presentation Layer
- ✅ UserController (POST /users, GET /users/:id)
- ✅ AlertController (POST /alerts, GET /alerts/user/:userId, DELETE /alerts/:id)
- ✅ AirQualityController (GET /air-quality/location, GET /air-quality/user/:userId)
- ✅ NotificationController (POST /notifications/subscribe)

### Frontend

#### 1. 페이지
- ✅ HomePage (홈)
- ✅ LoginPage (회원가입/로그인)
- ✅ AlertSettingsPage (알림 설정)

#### 2. 인프라
- ✅ API 클라이언트 (User, Alert)
- ✅ Web Push 서비스
- ✅ PWA 설정 (Service Worker)

## 🔄 API 엔드포인트

### Users
- `POST /users` - 사용자 생성
- `GET /users/:id` - 사용자 조회
- `PATCH /users/:id/location` - 사용자 위치 업데이트

### Alerts
- `POST /alerts` - 알림 생성
- `GET /alerts/user/:userId` - 사용자 알림 목록
- `GET /alerts/:id` - 알림 조회
- `DELETE /alerts/:id` - 알림 삭제

### Air Quality
- `GET /air-quality/location?lat=37.5665&lng=126.9780` - 좌표 기반 미세먼지 조회
- `GET /air-quality/user/:userId` - 사용자 위치 기반 미세먼지 조회

### Notifications
- `POST /notifications/subscribe` - 푸시 알림 구독
- `POST /notifications/unsubscribe` - 푸시 알림 구독 해제

### Subway
- `GET /subway/stations?query=강남` - 지하철역 검색

## 🧪 테스트 상태

### Backend
- ✅ Domain Layer 테스트 (User, Alert 엔티티)
- ✅ Repository 테스트 (메모리 기반)
- ✅ Use Case 테스트 (CreateUser, CreateAlert)
- ✅ External API 테스트 (Mock 기반)
- ✅ 미세먼지 API 통합 테스트 (실제 API 연동, 통과)
- ⚠️ PostgreSQL 통합 테스트 (DB 연결 필요)

### Frontend
- ✅ HomePage 테스트
- ✅ LoginPage 테스트
- ✅ AlertSettingsPage 테스트

## 📊 통계

- **총 파일 수**: 약 100개 이상
- **TypeScript 파일**: 약 60개
- **테스트 파일**: 약 20개
- **문서 파일**: 13개
- **코드 라인 수**: 약 26,000줄

## 🔧 기술 스택

### Backend
- **프레임워크**: NestJS 10.3.0
- **언어**: TypeScript 5.3.3
- **데이터베이스**: PostgreSQL (Supabase)
- **ORM**: TypeORM 0.3.17
- **작업 큐**: BullMQ 5.0.0
- **테스트**: Jest 29.7.0
- **푸시 알림**: web-push 3.6.6

### Frontend
- **프레임워크**: React 18.2.0
- **언어**: TypeScript 5.3.3
- **빌드 도구**: Vite 5.0.8
- **라우팅**: React Router 6.21.1
- **PWA**: vite-plugin-pwa
- **테스트**: Jest + React Testing Library

### Infrastructure
- **컨테이너**: Docker Compose
- **데이터베이스**: Supabase (관리형 PostgreSQL)
- **캐시/큐**: Redis 7-alpine

## 📝 설정 파일

### 환경 변수 (.env)
- `SUPABASE_URL` - Supabase 연결 URL
- `AIR_QUALITY_API_KEY` - 미세먼지 API 키 (설정 완료)
- `REDIS_HOST`, `REDIS_PORT` - Redis 연결 정보

### Docker
- `docker-compose.yml` - PostgreSQL, Redis 컨테이너 설정

## 🚀 실행 방법

### Backend
```bash
cd backend
npm install
npm run start:dev  # 개발 서버 시작 (포트 3000)
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # 개발 서버 시작
```

### 테스트
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📚 문서

1. **README.md** - 프로젝트 개요
2. **CHECKLIST.md** - 설정 체크리스트
3. **SUPABASE_SETUP.md** - Supabase 설정 가이드
4. **SIMPLE_SETUP.md** - 간단한 설정 가이드
5. **MOBILE_WORK_SIMPLE.md** - 모바일 작업 가이드
6. **CURSOR_MOBILE_WORKFLOW.md** - Cursor-모바일 워크플로우
7. **IMPLEMENTATION_STATUS.md** - 구현 현황
8. **GIT_SETUP.md** - Git 설정 가이드

## ⏳ 다음 단계

### 우선순위 높음
1. ⏳ 날씨 API 실제 연동 및 테스트
2. ⏳ 버스 API 실제 연동 및 테스트
3. ⏳ 지하철 API 실제 연동 및 테스트
4. ⏳ 알림 스케줄러 연동 및 테스트
5. ⏳ 프론트엔드 UI 개선

### 우선순위 중간
1. ⏳ 사용자 인증 시스템 (JWT)
2. ⏳ 에러 핸들링 개선
3. ⏳ 로깅 시스템
4. ⏳ API 문서화 (Swagger)

### 우선순위 낮음
1. ⏳ 모바일 앱 개발 (React Native)
2. ⏳ 위젯 기능
3. ⏳ 다국어 지원

## 🔍 주요 파일 위치

### Backend 핵심 파일
- `backend/src/main.ts` - 애플리케이션 진입점
- `backend/src/presentation/app.module.ts` - 루트 모듈
- `backend/src/infrastructure/persistence/database.module.ts` - 데이터베이스 설정
- `backend/src/infrastructure/external-apis/air-quality-api.client.ts` - 미세먼지 API

### Frontend 핵심 파일
- `frontend/src/main.tsx` - 애플리케이션 진입점
- `frontend/src/presentation/App.tsx` - 루트 컴포넌트
- `frontend/src/presentation/pages/AlertSettingsPage.tsx` - 알림 설정 페이지

## 💡 특징

1. **Clean Architecture**: 레이어 분리로 유지보수성 향상
2. **TDD**: 테스트 주도 개발로 코드 품질 보장
3. **TypeScript**: 타입 안정성
4. **PWA**: 모바일에서 앱처럼 사용 가능
5. **Supabase**: 관리형 데이터베이스로 설정 간소화
