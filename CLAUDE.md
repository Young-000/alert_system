# Alert System Project

출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간을 통합 제공하는 알림 시스템

## 기술 스택

| Backend | Frontend |
|---------|----------|
| NestJS 10.3 + TypeScript 5.3 | React 18.2 + TypeScript 5.3 |
| PostgreSQL (Supabase) | Vite 5.0 |
| TypeORM 0.3 | PWA (vite-plugin-pwa) |
| Redis + BullMQ 5.0 | React Router 6.21 |
| Jest 29.7 | Jest + React Testing Library |
| web-push 3.6 | |

## 아키텍처: Clean Architecture + TDD

```
backend/src/
├── domain/            # 엔티티, Repository 인터페이스
│   ├── entities/      # User, Alert, Weather, AirQuality, BusArrival, SubwayArrival
│   └── repositories/  # IUserRepository, IAlertRepository
├── application/       # Use Cases, DTOs
│   ├── dto/           # CreateUserDto, CreateAlertDto
│   ├── use-cases/     # CreateUserUseCase, CreateAlertUseCase, etc.
│   └── ports/         # 외부 서비스 인터페이스
├── infrastructure/    # 외부 연동 구현체
│   ├── persistence/   # TypeORM 구현체
│   ├── external-apis/ # 날씨/미세먼지/버스/지하철 API 클라이언트
│   ├── push/          # Web Push 서비스
│   └── queue/         # BullMQ 스케줄러
└── presentation/      # API 레이어
    ├── controllers/   # REST API 컨트롤러
    └── modules/       # NestJS 모듈

frontend/src/
├── domain/            # 프론트엔드 도메인 모델
├── application/       # 애플리케이션 서비스
├── infrastructure/    # API 클라이언트, 로컬 스토리지
│   ├── api/           # UserApiClient, AlertApiClient, SubwayApiClient
│   └── push/          # PushService
└── presentation/      # React 컴포넌트
    ├── pages/         # HomePage, LoginPage, AlertSettingsPage
    └── hooks/         # usePushNotification
```

## API 엔드포인트

### Users
- `POST /users` - 사용자 생성
- `GET /users/:id` - 사용자 조회
- `PATCH /users/:id/location` - 위치 업데이트

### Alerts
- `POST /alerts` - 알림 생성
- `GET /alerts/user/:userId` - 사용자 알림 목록
- `GET /alerts/:id` - 알림 조회
- `DELETE /alerts/:id` - 알림 삭제

### Air Quality
- `GET /air-quality/location?lat=37.5665&lng=126.9780` - 미세먼지 조회
- `GET /air-quality/user/:userId` - 사용자 기반 미세먼지 조회

### Notifications
- `POST /notifications/subscribe` - 푸시 구독
- `POST /notifications/unsubscribe` - 푸시 구독 해제

### Subway
- `GET /subway/stations?query=강남` - 지하철역 검색

## 구현 현황 (100% 완료)

### 완료
- [x] User, Alert 엔티티 및 CRUD
- [x] 미세먼지 API 연동 (실제 API)
- [x] 날씨/버스/지하철 API 클라이언트
- [x] Web Push 알림 서비스
- [x] BullMQ 작업 스케줄러
- [x] 프론트엔드 페이지 (Home, Login, AlertSettings)
- [x] PWA 설정
- [x] JWT 인증 시스템
- [x] API 문서화 (Swagger)
- [x] 프론트엔드 UI 개선
- [x] Vercel 프로덕션 배포
- [x] 알림톡 (Solapi) 연동

---

## 🚀 배포 정보

### Frontend (Vercel)
| 항목 | 값 |
|------|-----|
| **Production URL** | https://frontend-xi-two-52.vercel.app |
| **Platform** | Vercel |
| **Auto Deploy** | GitHub push 시 자동 |

### Backend (Render)
| 항목 | 값 |
|------|-----|
| **Production URL** | https://alert-system-kdg9.onrender.com |
| **Platform** | Render (Free Tier) |
| **Database** | Supabase PostgreSQL |
| **주의** | Cold Start 시 ~30초 지연 |

### 핵심 환경 변수 (Render)
```
DATABASE_URL=postgresql://postgres.gtnqsbdlybrkbsgtecvy:...@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
DB_SYNCHRONIZE=true  # 스키마 자동 동기화 (초기 배포 시 필수)
```

> ⚠️ **DB_SYNCHRONIZE**: 테이블 스키마 변경 시 `true`로 설정 후 배포, 안정화 후 `false`로 변경 권장

## 개발 명령어

```bash
# Backend
cd backend
npm install
npm run start:dev     # 개발 서버 (포트 3000)
npm test              # 단위 테스트
npm run test:e2e      # E2E 테스트
npm run test:cov      # 커버리지

# Frontend
cd frontend
npm install
npm run dev           # 개발 서버
npm test              # 단위 테스트
npm run build         # 프로덕션 빌드

# Database
npm run db:apply      # Supabase 스키마 적용
npm run seed:subway   # 지하철역 데이터 시드

# Docker
docker-compose up -d redis  # Redis 실행
```

## Supabase 설정

> ⚠️ **필수 참조**: [`/SUPABASE_RULES.md`](/SUPABASE_RULES.md)

| 항목 | 값 |
|------|-----|
| **Project** | Project 2 (비게임) |
| **Project ID** | `gtnqsbdlybrkbsgtecvy` |
| **Schema** | `alert_system` |
| **URL** | `https://gtnqsbdlybrkbsgtecvy.supabase.co` |

**스키마 룰:**
- 모든 테이블은 `alert_system.table_name` 형식
- `public` 스키마 사용 금지
- 사용자 데이터 테이블 RLS 필수

---

## 환경 변수

### Backend (.env)
- `SUPABASE_URL` - Supabase 연결 URL
- `AIR_QUALITY_API_KEY` - 미세먼지 API 키
- `REDIS_HOST`, `REDIS_PORT` - Redis 연결

### Frontend (.env)
- `VITE_API_BASE_URL` - API 기본 URL
- `VITE_VAPID_PUBLIC_KEY` - 푸시 알림용

## 코드 컨벤션

- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- 테스트 파일: `*.spec.ts` (backend), `*.test.tsx` (frontend)
