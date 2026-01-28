# 출퇴근 구간별 트래킹 시스템 (Phase 1) - 진행 상황

## 프로젝트 개요

기존 Alert System을 확장하여 **출퇴근 시간을 구간별로 측정하고 분석**하는 기능 추가.

### 핵심 가치
- 유저가 **클릭 한 번**으로 쉽게 트래킹
- **구간별 시간 측정** (집 → 역 → 회사 각각)
- **통계 분석** (평균, 지연, 패턴)

---

## 테스트 환경 (별도 배포)

> **기존 사이트와 완전 분리**하여 AWS 이관 작업과 충돌 방지

| 컴포넌트 | URL | 브랜치 |
|----------|-----|--------|
| **Frontend** | https://alert-commute-test.vercel.app | feature/commute-tracking |
| **Backend** | https://alert-system-commute-test.onrender.com | feature/commute-tracking |
| **Database** | Supabase (gtnqsbdlybrkbsgtecvy) - `alert_system` 스키마 공유 | - |

### 배포 정보

**Vercel (Frontend)**
- Project: `alert-commute-test`
- 완전 별도 프로젝트 (기존 frontend와 분리)

**Render (Backend)**
- Service: `alert-system-commute-test`
- Service ID: `srv-d5sl7htactks73blecv0`
- Auto-deploy: 활성화 (feature/commute-tracking 브랜치)

---

## 구현 완료 항목

### Backend

#### Domain Layer
| 파일 | 설명 |
|------|------|
| `domain/entities/commute-route.entity.ts` | 경로 + 체크포인트 도메인 모델 |
| `domain/entities/commute-session.entity.ts` | 통근 세션 도메인 모델 |
| `domain/entities/checkpoint-record.entity.ts` | 체크포인트 기록 도메인 모델 |
| `domain/repositories/commute-route.repository.ts` | 경로 Repository 인터페이스 |
| `domain/repositories/commute-session.repository.ts` | 세션 Repository 인터페이스 |
| `domain/repositories/checkpoint-record.repository.ts` | 기록 Repository 인터페이스 |

#### Application Layer
| 파일 | 설명 |
|------|------|
| `application/dto/commute.dto.ts` | DTO 정의 (Route, Session, Checkpoint) |
| `application/use-cases/manage-route.use-case.ts` | 경로 CRUD |
| `application/use-cases/manage-commute-session.use-case.ts` | 세션 시작/체크포인트/완료 |
| `application/use-cases/get-commute-stats.use-case.ts` | 통계 조회 (구간별 분석) |

#### Infrastructure Layer
| 파일 | 설명 |
|------|------|
| `infrastructure/persistence/typeorm/commute-route.entity.ts` | 경로 TypeORM Entity |
| `infrastructure/persistence/typeorm/route-checkpoint.entity.ts` | 체크포인트 TypeORM Entity |
| `infrastructure/persistence/typeorm/commute-session.entity.ts` | 세션 TypeORM Entity |
| `infrastructure/persistence/typeorm/checkpoint-record.entity.ts` | 기록 TypeORM Entity |
| `infrastructure/persistence/repositories/commute-route.repository.ts` | 경로 Repository 구현 |
| `infrastructure/persistence/repositories/commute-session.repository.ts` | 세션 Repository 구현 |
| `infrastructure/persistence/repositories/checkpoint-record.repository.ts` | 기록 Repository 구현 |

#### Presentation Layer
| 파일 | 설명 |
|------|------|
| `presentation/controllers/route.controller.ts` | /routes API |
| `presentation/controllers/commute.controller.ts` | /commute API |
| `presentation/modules/commute.module.ts` | CommuteModule |

### Frontend

| 파일 | 설명 |
|------|------|
| `infrastructure/api/commute-api.client.ts` | API 클라이언트 |
| `presentation/pages/RouteSetupPage.tsx` | 경로/체크포인트 설정 화면 |
| `presentation/pages/CommuteTrackingPage.tsx` | 실시간 구간 체크 화면 |
| `presentation/pages/CommuteDashboardPage.tsx` | 통계 대시보드 |

### 라우팅

```tsx
// App.tsx
<Route path="/routes" element={<RouteSetupPage />} />
<Route path="/commute" element={<CommuteTrackingPage />} />
<Route path="/commute/dashboard" element={<CommuteDashboardPage />} />
```

---

## Database 테이블

> 모든 테이블은 `alert_system` 스키마에 생성됨

```sql
-- 통근 경로
alert_system.commute_routes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(100),
  route_type VARCHAR(20),  -- 'morning', 'evening', 'other'
  is_preferred BOOLEAN,
  total_expected_duration INTEGER,
  created_at, updated_at
)

-- 경로 체크포인트
alert_system.route_checkpoints (
  id UUID PRIMARY KEY,
  route_id UUID REFERENCES commute_routes(id),
  sequence_order INTEGER,
  name VARCHAR(100),
  checkpoint_type VARCHAR(20),  -- 'home', 'subway', 'bus_stop', 'transfer', 'work', 'custom'
  linked_station_id UUID,
  linked_bus_stop_id VARCHAR(100),
  line_info VARCHAR(100),
  expected_duration_to_next INTEGER,
  expected_wait_time INTEGER,
  transport_mode VARCHAR(20)
)

-- 통근 세션
alert_system.commute_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  route_id UUID REFERENCES commute_routes(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_duration_minutes INTEGER,
  total_wait_minutes INTEGER,
  total_delay_minutes INTEGER,
  status VARCHAR(20),  -- 'in_progress', 'completed', 'cancelled'
  weather_condition VARCHAR(50),
  notes TEXT
)

-- 체크포인트 기록
alert_system.checkpoint_records (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES commute_sessions(id),
  checkpoint_id UUID REFERENCES route_checkpoints(id),
  arrived_at TIMESTAMP,
  actual_duration_from_previous INTEGER,
  actual_wait_time INTEGER,
  delay_minutes INTEGER,
  wait_delay_minutes INTEGER,
  notes VARCHAR(255)
)
```

---

## API 엔드포인트

### Routes API (`/routes`)

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/routes` | 새 경로 생성 |
| `GET` | `/routes/user/:userId` | 사용자 경로 목록 |
| `GET` | `/routes/:id` | 특정 경로 조회 |
| `PATCH` | `/routes/:id` | 경로 수정 |
| `DELETE` | `/routes/:id` | 경로 삭제 |

### Commute API (`/commute`)

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/commute/start` | 통근 시작 |
| `POST` | `/commute/checkpoint` | 체크포인트 도착 기록 |
| `POST` | `/commute/complete` | 통근 완료 |
| `POST` | `/commute/cancel/:sessionId` | 통근 취소 |
| `GET` | `/commute/session/:sessionId` | 특정 세션 조회 |
| `GET` | `/commute/in-progress/:userId` | 진행 중인 세션 조회 |
| `GET` | `/commute/history/:userId` | 세션 히스토리 |
| `GET` | `/commute/stats/:userId` | 통계 조회 |

---

## 수정 사항 (버그 픽스)

### 1. CORS 설정
- `backend/src/main.ts`에 `https://alert-commute-test.vercel.app` 추가

### 2. DB 컬럼명 수정
- `duration_from_previous` → `actual_duration_from_previous` (DB 컬럼명 일치)

### 3. isDelayed 속성
- `@Column`에서 getter로 변경 (computed property)
```typescript
get isDelayed(): boolean {
  return (this.delayMinutes || 0) > 0;
}
```

### 4. 라우트 순서 수정 ⚠️
- `@Get('user/:userId')`를 `@Get(':id')` 앞으로 이동
- NestJS는 정의 순서대로 라우트 매칭

### 5. TypeORM 엔티티 등록 누락 수정 ⚠️
- `database.config.ts`에 commute tracking 엔티티들 추가
- TypeORM `buildDataSourceOptions()`의 `entities` 배열에 등록 필요
- 이 수정 없이는 Repository 주입 실패로 500 에러 발생

---

## 테스트 상태 ✅ DONE

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 회원가입/로그인 | ✅ | CORS 수정 후 정상 |
| 경로 설정 페이지 UI | ✅ | 체크포인트 추가/삭제 |
| 경로 저장 API | ✅ | TypeORM 엔티티 등록 후 정상 작동 |
| 통근 시작/체크포인트/완료 | ✅ | 전체 플로우 테스트 완료 |
| 히스토리 조회 | ✅ | 완료된 세션 조회 정상 |
| 통계 조회 | ✅ | API 정상 작동 (데이터 축적 필요)

---

## AWS 이관 시 체크리스트

### 병합 필요 파일

```
backend/
├── src/
│   ├── application/
│   │   ├── dto/commute.dto.ts
│   │   └── use-cases/
│   │       ├── manage-route.use-case.ts
│   │       ├── manage-commute-session.use-case.ts
│   │       └── get-commute-stats.use-case.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── commute-route.entity.ts
│   │   │   ├── commute-session.entity.ts
│   │   │   └── checkpoint-record.entity.ts
│   │   └── repositories/
│   │       ├── commute-route.repository.ts
│   │       ├── commute-session.repository.ts
│   │       └── checkpoint-record.repository.ts
│   ├── infrastructure/persistence/
│   │   ├── typeorm/
│   │   │   ├── commute-route.entity.ts
│   │   │   ├── route-checkpoint.entity.ts
│   │   │   ├── commute-session.entity.ts
│   │   │   └── checkpoint-record.entity.ts
│   │   └── repositories/
│   │       ├── commute-route.repository.ts
│   │       ├── commute-session.repository.ts
│   │       └── checkpoint-record.repository.ts
│   └── presentation/
│       ├── controllers/
│       │   ├── route.controller.ts
│       │   └── commute.controller.ts
│       └── modules/commute.module.ts

frontend/
├── src/
│   ├── infrastructure/api/commute-api.client.ts
│   └── presentation/pages/
│       ├── RouteSetupPage.tsx
│       ├── CommuteTrackingPage.tsx
│       └── CommuteDashboardPage.tsx
```

### AppModule 수정 필요

```typescript
// backend/src/presentation/app.module.ts
import { CommuteModule } from './modules/commute.module';

@Module({
  imports: [
    // ... 기존 모듈들
    CommuteModule,  // 추가
  ],
})
export class AppModule {}
```

### Frontend App.tsx 수정 필요

```tsx
import { RouteSetupPage } from './pages/RouteSetupPage';
import { CommuteTrackingPage } from './pages/CommuteTrackingPage';
import { CommuteDashboardPage } from './pages/CommuteDashboardPage';

// Routes 내부에 추가:
<Route path="/routes" element={<RouteSetupPage />} />
<Route path="/commute" element={<CommuteTrackingPage />} />
<Route path="/commute/dashboard" element={<CommuteDashboardPage />} />
```

### CORS 설정

AWS 환경에서도 프론트엔드 URL을 CORS 허용 목록에 추가 필요:
```typescript
const allowedOrigins = [
  // ... 기존 URL들
  'https://your-aws-frontend-url.com',  // CloudFront URL
];
```

---

## Git 브랜치

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 (AWS 이관 작업) |
| `feature/commute-tracking` | 출퇴근 트래킹 기능 개발 |

### 병합 명령

```bash
git checkout main
git merge feature/commute-tracking
# 충돌 해결 후
git push
```

---

## 다음 단계

1. ~~**경로 저장 API 테스트 완료**~~ ✅ DONE
2. ~~**전체 플로우 E2E 테스트**~~ ✅ DONE
   - 경로 생성 → 통근 시작 → 체크포인트 → 완료 → 통계 확인
3. **AWS 환경에 병합** (다음 작업)
   - feature 브랜치를 main에 병합
   - AWS ECS/Lambda에 배포
4. **프로덕션 테스트**

---

## E2E 테스트 결과 (2026-01-28)

테스트 유저: `0e2cbc1b-c267-4f5a-9c4c-89fddedeea95`

### API 테스트 결과

| API | 결과 | 응답 |
|-----|:----:|------|
| `POST /routes` | ✅ | 경로 ID: `c4a242de-c75f-484e-8e0d-8746e9abf376` |
| `GET /routes/user/:userId` | ✅ | 빈 배열 → 생성 후 1개 |
| `POST /commute/start` | ✅ | 세션 ID: `e7f88c09-c539-4f62-91d9-b1331bb0d58e` |
| `POST /commute/checkpoint` | ✅ | 진행률: 33% → 67% |
| `POST /commute/complete` | ✅ | status: `completed` |
| `GET /commute/history/:userId` | ✅ | totalCount: 1 |
| `GET /commute/stats/:userId` | ✅ | 정상 작동 |

### 수정된 커밋

| 커밋 | 설명 |
|------|------|
| `1c2e473` | CORS: 테스트 사이트 URL 추가 |
| `8ed9928` | 라우트 순서: user/:userId를 :id 앞으로 |
| `fab0d2f` | TypeORM: 엔티티를 buildDataSourceOptions에 등록 |

---

*Last Updated: 2026-01-28 09:40 KST*
