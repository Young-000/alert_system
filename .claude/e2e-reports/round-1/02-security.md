# Phase 2: Security Review (2026-03-14)

## 2-1. 환경변수 노출

| 파일 | 상태 | 내용 | 판정 |
|------|------|------|------|
| `.gitignore` | OK | `.env`, `*.env.local`, `*.env.*.local` 패턴 포함 | PASS |
| `backend/.env.example` | TRACKED | 플레이스홀더만 (`your-jwt-secret` 등) | PASS |
| `frontend/.env.example` | TRACKED | 플레이스홀더만 | PASS |
| `frontend/.env.production` | TRACKED | 공개 URL + VAPID public key만 (비밀 아님) | PASS |
| `frontend/.env.test` | TRACKED | 테스트용 localhost URL만 | PASS |
| 소스코드 | OK | 하드코딩된 시크릿 없음. 테스트 파일의 `password123` 등은 테스트 픽스처 | PASS |
| Solapi Template IDs | OK | 카카오 템플릿 ID는 공개 식별자 (비밀 아님) | PASS |

**결과: PASS**

---

## 2-2. API 인증

### 전역 JWT Guard

- `APP_GUARD`로 `JwtAuthGuard` 등록 (`app.module.ts:73-74`) -- 모든 엔드포인트 기본 보호
- `@Public()` 데코레이터로 예외 처리 (public 엔드포인트만 명시적으로 제외)
- `ThrottlerGuard` 전역 적용 (60req/min 제한)

### Public 엔드포인트 분석

| 엔드포인트 | 이유 | 보호 수단 |
|-----------|------|----------|
| `GET /health` | 헬스체크 | 민감 데이터 없음 |
| `POST /auth/register` | 회원가입 | DTO validation |
| `POST /auth/login` | 로그인 | DTO validation |
| `GET /auth/google`, `/auth/google/callback` | OAuth | Google AuthGuard |
| `POST /auth/google/token` | OAuth 토큰 | 자체 토큰 검증 |
| `POST /users` | 회원가입 (하위호환) | DTO validation |
| `GET /weather/*` | 날씨 조회 | 공개 데이터 |
| `GET /subway/*` | 지하철 조회 | 공개 데이터 |
| `GET /bus/*` | 버스 조회 | 공개 데이터 |
| `GET /insights/regions*` | 지역 통계 | 집계 데이터만 (개인정보 없음) |
| `POST /scheduler/*` | EventBridge 트리거 | `x-scheduler-secret` + `timingSafeEqual` 검증 |
| `GET,POST,DELETE /dev/*` | 개발용 | `NODE_ENV !== 'production'`에서만 등록 + 런타임 체크 |

### 인가 (Authorization)

- 모든 보호 엔드포인트에서 `req.user.userId` 비교로 자기 데이터만 접근 가능
- `ForbiddenException` 처리 일관됨

**결과: PASS**

---

## 2-3. 입력 검증

### ValidationPipe 전역 설정 (`main.ts:63-71`)

```typescript
new ValidationPipe({
  whitelist: true,         // DTO에 없는 속성 자동 제거
  forbidNonWhitelisted: true, // 미정의 속성 에러
  transform: true,         // 자동 타입 변환
})
```

### DTO 검증 현황

| DTO | class-validator | 판정 |
|-----|:---:|:---:|
| `CreateAlertDto` | O | PASS |
| `UpdateAlertDto` | O | PASS |
| `CreateUserDto` | O | PASS |
| `LoginDto` | O | PASS |
| `CreateRouteDto` / `UpdateRouteDto` | O | PASS |
| `StartSessionDto` / `RecordCheckpointDto` / `CompleteSessionDto` | O | PASS |
| `CreateCheckpointDto` | O | PASS |
| `CreateTipRequestDto` | O | PASS |
| `SubscribeDto` / `UnsubscribeDto` / `ExpoTokenDto` | O | PASS |
| `SchedulerTriggerPayload` | O | PASS |
| `CreateMissionDto` / `UpdateMissionDto` / `ReorderMissionDto` | O | PASS |
| `WidgetDataQueryDto` | O | PASS |
| `RecordCommuteEventDto` / `BatchCommuteEventsDto` | O | PASS |
| `CreateSmartDepartureSettingDto` / `UpdateSmartDepartureSettingDto` | O | PASS |
| `JoinChallengeDto` | O | PASS |
| `UpdateStreakSettingsDto` | O | PASS |
| ~~`TrackEventDto`~~ | ~~X (interface)~~ | **FIX** |
| ~~`DepartureConfirmedDto`~~ | ~~X (interface)~~ | **FIX** |
| ~~`CreateAlternativeMappingDto`~~ | ~~X (interface)~~ | **FIX** |

### SQL Injection 방지

- TypeORM QueryBuilder: 모든 `.where()` 호출이 파라미터 바인딩 사용 (`:paramName`)
- Raw SQL (`queryRunner.query`): 모든 쿼리가 `$1` 파라미터 바인딩 사용
- 문자열 보간(`${...}`)을 SQL에 직접 삽입하는 사례 없음

**결과: FIX 3건 (interface -> class + validators)**

---

## 2-4. CORS 설정

### 설정 분석 (`main.ts:26-57`)

- **명시적 허용 목록**: `localhost:5173-5178`, 프로덕션 Vercel URL, 테스트 사이트 URL
- **Vercel 프리뷰**: 정규식 `/^https:\/\/frontend-xi-two-52(-[a-z0-9]+)?\.vercel\.app$/` (프로젝트 한정)
- **차단 로깅**: 미허용 origin 접근 시 `logger.warn` 기록
- **credentials**: `true` (쿠키/인증 헤더 전달 허용)
- **허용 메서드**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **허용 헤더**: Content-Type, Authorization, X-Requested-With

**와일드카드(`*`) 미사용, 프로덕션 도메인 한정**

**결과: PASS**

---

## 2-5. Supabase RLS

### 코드 기반 확인

- `backend/database/schema.sql`: `users`, `subway_stations`, `alerts`, `push_subscriptions` 4개 테이블 ENABLE RLS + 정책 정의
- `backend/database/migrations/`: 추가 테이블(`commute_routes`, `route_checkpoints`, `commute_sessions`, `checkpoint_records`, `route_analytics`, `behavior_events`, `user_patterns`, `commute_records`, `notification_effectiveness`, `notification_rules`) ENABLE RLS 포함
- 이전 리뷰(round-3, round-4)에서 **실제 DB에는 RLS 미적용** 상태로 보고됨

### 완화 요소

- Backend는 TypeORM 직접 연결 (서비스 역할 -- RLS 우회)
- 모든 API에 JWT 인증 + 사용자 소유권 검증 (`req.user.userId` 비교)
- Frontend Supabase 클라이언트는 `alert_system` 스키마 사용 (PostgREST 기본 노출 대상 아님)

**결과: WARN -- Migration 파일에 RLS SQL 존재하나 실제 적용 여부는 Supabase 대시보드 확인 필요**

---

## 추가 보안 체크

### Helmet (보안 헤더)

- CSP, CORS, XSS Protection 등 Helmet 기본 보안 헤더 적용 (`main.ts:13-23`)

### Exception Filter

- `AllExceptionsFilter`로 500 에러 시 스택 트레이스 노출 방지 (`main.ts:60`)

### Swagger (API 문서)

- `NODE_ENV !== 'production'`에서만 활성화 (`main.ts:75`)

### DevController

- `NODE_ENV !== 'production'`에서만 모듈 등록 (`app.module.ts:37`)
- 추가로 런타임 `assertNotProduction()` 이중 체크

---

## 수정 내역

| # | 파일 | 내용 |
|---|------|------|
| 1 | `backend/src/presentation/controllers/behavior.controller.ts` | `TrackEventDto`: interface -> class + `@IsString`, `@IsNotEmpty`, `@IsOptional`, `@IsIn`, `@IsObject` 데코레이터 추가 |
| 2 | `backend/src/presentation/controllers/behavior.controller.ts` | `DepartureConfirmedDto`: interface -> class + `@IsString`, `@IsNotEmpty`, `@IsIn`, `@IsOptional`, `@IsNumber`, `@Min` 데코레이터 추가 |
| 3 | `backend/src/application/dto/delay-status.dto.ts` | `CreateAlternativeMappingDto`: interface -> class + `@IsString`, `@IsNotEmpty`, `@IsNumber`, `@Min`, `@IsOptional`, `@IsBoolean` 데코레이터 추가 |

---

## 요약

| # | 항목 | 판정 |
|---|------|------|
| 2-1 | 환경변수 노출 | PASS |
| 2-2 | API 인증 | PASS |
| 2-3 | 입력 검증 | FIX 3건 (DTO validation 누락) |
| 2-4 | CORS 설정 | PASS |
| 2-5 | Supabase RLS | WARN (코드에 SQL 존재, 실 적용 대시보드 확인 필요) |
