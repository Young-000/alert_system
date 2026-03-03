# 04. Security - 보안 검증 (Round 2)

**Date**: 2026-02-12
**Branch**: `fix/homepage-ux-feedback`
**Round**: 2 (Round 1에서 1건 수정 후 재검증)
**Status**: PASS (no regression)

---

## 4-1. 하드코딩된 API 키/시크릿 없음 확인

**Result**: PASS (변동 없음)

### Frontend (frontend/src/)
- 하드코딩된 시크릿 없음
- 모든 민감 값은 `import.meta.env.VITE_*` 환경변수로 참조
- password 관련 코드는 테스트 파일(LoginPage.test.tsx)에서만 등장 (테스트 전용)
- Supabase anon key는 `VITE_SUPABASE_ANON_KEY` 환경변수로 관리

### Backend (backend/src/)
- 하드코딩된 시크릿 없음
- 모든 API 키는 `process.env.*` 또는 `configService.get()` 패턴으로 참조
- `database.config.ts` 라인 112: fallback 기본값 존재 (로컬 개발 전용, 프로덕션에서는 DATABASE_URL 사용)
- password 관련 grep 결과는 모두 테스트 파일 (spec.ts)

### CLAUDE.md 파일
- Solapi API Key가 개발 문서에 기록됨 (코드 아님)
- API Key 단독으로는 API 호출 불가 (API Secret 필요, AWS SSM에만 저장)

---

## 4-2. .env 파일 git 미포함

**Result**: PASS (변동 없음)

### .gitignore 설정 확인
```
.env
.env.local
.env.*.local
*/.env
*/.env.local
*/.env.*.local
```

### Git 추적 상태 (`git ls-files '*.env*'`)
| 파일 | Git 추적 | 민감 정보 | 판정 |
|------|:--------:|:---------:|:----:|
| backend/.env | NO | YES (DB URL, JWT Secret, API Keys) | SAFE |
| backend/.env.example | YES | NO (플레이스홀더만) | OK |
| frontend/.env | NO | NO | SAFE |
| frontend/.env.local | NO | YES (Vercel OIDC Token) | SAFE |
| frontend/.env.production | YES | NO (공개 URL + VAPID Public Key만) | OK |
| frontend/.env.test | YES | NO (공개 URL + VAPID Public Key만) | OK |

---

## 4-3. XSS 방어 확인

**Result**: PASS (변동 없음)

### XSS 벡터 검사 결과
- React unsafe HTML rendering API: 미사용 (0건)
- DOM 직접 HTML 조작: 미사용 (0건)
- DOM 직접 쓰기 API: 미사용 (0건)
- 동적 코드 실행 함수: 미사용 (0건)

### CSP (Content Security Policy) 헤더
- `backend/src/main.ts`에서 Helmet으로 CSP 설정
- scriptSrc: self만 허용 - 외부 스크립트 실행 차단
- Round 1 수정 (scheduler-legacy timingSafeEqual)이 XSS와 무관함 확인
- 새로운 XSS 벡터 도입 없음

---

## 4-4. Backend Helmet 활성화

**Result**: PASS (변동 없음)

**파일**: `backend/src/main.ts` (라인 13-23)
- Helmet 전역 미들웨어로 적용
- CSP, X-Content-Type-Options, X-Frame-Options, HSTS 등 보안 헤더 자동 설정
- `crossOriginEmbedderPolicy: false` (PWA 호환성)

---

## 4-5. Rate Limiting (Throttler) 활성화

**Result**: PASS (변동 없음)

**파일**: `backend/src/presentation/app.module.ts`
- `ThrottlerModule.forRoot`: `ttl=60000` (1분), `limit=60` (60회)
- `APP_GUARD`로 `ThrottlerGuard` 전역 적용
- 인증 엔드포인트 추가 제한:
  - `@Post('register')`: 1분 3회
  - `@Post('login')`: 1분 5회 (브루트포스 방지)

---

## 4-6. CORS 설정 올바름

**Result**: PASS (변동 없음)

**파일**: `backend/src/main.ts` (라인 25-57)
- 와일드카드(`*`) 미사용 - 명시적 도메인 화이트리스트
- 허용 목록: localhost 개발 포트 (5173-5178), 프로덕션 Vercel 도메인 2개
- Vercel 프리뷰 URL: 정규식으로 제한적 허용
- 차단된 origin은 `logger.warn`으로 기록
- `credentials: true`, 명시적 `methods` 및 `allowedHeaders`

---

## 4-7. SQL Injection 방지

**Result**: PASS (변동 없음)

### TypeORM 사용 패턴 분석

| 파일 | 패턴 | 안전성 |
|------|------|:------:|
| postgres-subway-station.repository.ts | `createQueryBuilder` + `:name` 파라미터 바인딩 | SAFE |
| route-analytics.repository.ts | `createQueryBuilder` + 파라미터 바인딩 | SAFE |
| sample-data.seed.ts | `queryRunner.query()` + `$1` 위치 파라미터 바인딩 | SAFE |

- 문자열 연결(+)을 통한 SQL 구성 없음
- 모든 raw query에서 parameterized query 패턴 사용

---

## 4-8. Scheduler trigger 인증 확인

**Result**: PASS (Round 1 수정 유지 확인)

### EventBridge Scheduler (현재 사용)
**파일**: `backend/src/presentation/controllers/scheduler-trigger.controller.ts`
- `crypto.timingSafeEqual`로 타이밍 공격 방지 (라인 61-62)
- 시크릿 미설정 시 즉시 거부 (라인 54-57)
- `@Public()` 데코레이터 사용 (JWT 대신 자체 시크릿 검증)

### Legacy Scheduler (deprecated - Round 1 수정 확인)
**파일**: `backend/src/presentation/controllers/scheduler-legacy.controller.ts`
- **Round 1 수정 유지 확인**: `crypto.timingSafeEqual` 사용 (라인 48)
- `schedulerKey` 또는 `expectedKey` 미전달 시 즉시 거부 (라인 42-45)
- `Buffer.from` + `length` 비교 + `timingSafeEqual` 3중 검증
- 프로덕션에서는 `AWS_SCHEDULER_ENABLED=true`로 비활성화됨 (라인 36-38)

---

## 4-9. Frontend 민감 정보 미노출

**Result**: PASS (변동 없음)

### Frontend 환경변수 검사
| 변수 | 값 유형 | 민감도 |
|------|---------|:------:|
| `VITE_API_BASE_URL` | 공개 API URL | LOW |
| `VITE_SUPABASE_URL` | 공개 Supabase URL | LOW |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (RLS로 보호) | LOW |
| `VITE_VAPID_PUBLIC_KEY` | Web Push 공개키 | LOW |

- `service_role_key`는 프론트엔드에 존재하지 않음
- 모든 `VITE_` 환경변수는 공개 가능한 값만 포함

---

## 추가 검증 항목

### JWT 시크릿 강도
- `backend/.env` (git 미추적): JWT_SECRET은 64자 hex 문자열 - 256비트 엔트로피 - 충분한 강도
- JWT 만료: 7d (7일), `ignoreExpiration: false`

### 전역 인증 가드
- `APP_GUARD`로 `JwtAuthGuard` 전역 적용
- `@Public()` 엔드포인트: health, scheduler(자체 시크릿), auth(Throttle), weather/subway/bus(공개 API), dev(프로덕션 비활성화)

### 사용자 입력 검증 (DTO Validation)
- 전역 `ValidationPipe`: whitelist + forbidNonWhitelisted + transform
- `class-validator` 데코레이터 적용: CreateUserDto, CreateAlertDto, CreateRouteDto 등

### 에러 정보 노출 방지
- `AllExceptionsFilter`: 500 에러 시 스택 트레이스 서버 로그에만 기록

### DevController 프로덕션 보호
- `NODE_ENV !== 'production'`일 때만 등록 + `assertNotProduction()` 이중 체크

### HTTPS 강제 여부
- CloudFront HTTPS 자동 제공 + Vercel HTTPS 기본 제공

### JSON.parse 안전성 (Round 2 회귀 확인)
- `web-push.service.ts` 라인 56: `JSON.parse(sub.keys)` 호출
- try-catch 블록 내부에 위치하여 파싱 실패 시 graceful 처리됨

---

## npm audit 결과

### Frontend
```
4 vulnerabilities (3 moderate, 1 high)
- axios: DoS via __proto__ key (high)
- esbuild: dev server request access (moderate, dev only)
- vite: esbuild dependency (moderate, dev only)
- vite-plugin-pwa: vite dependency (moderate, dev only)
```

### Backend
```
21 vulnerabilities (6 low, 4 moderate, 11 high)
- cookie: prototype pollution (moderate)
- cross-spawn: ReDoS (high)
- ip: SSRF (high)
- path-to-regexp: ReDoS (high)
- tar: arbitrary file write (high)
- webpack: SSRF (high)
- other transitive dependencies
```

> Round 1 대비 변동 없음. 대부분 transitive dependency 취약점. npm audit fix 또는 메이저 버전 업그레이드로 별도 작업 필요.

---

## Summary

| # | Check | R1 결과 | R2 결과 | 변동 |
|---|-------|:-------:|:-------:|:----:|
| 4-1 | 하드코딩된 API 키/시크릿 없음 | PASS | PASS | - |
| 4-2 | .env 파일 git 미포함 | PASS | PASS | - |
| 4-3 | XSS 방어 | PASS | PASS | - |
| 4-4 | Helmet 활성화 | PASS | PASS | - |
| 4-5 | Rate Limiting | PASS | PASS | - |
| 4-6 | CORS 설정 | PASS | PASS | - |
| 4-7 | SQL Injection 방지 | PASS | PASS | - |
| 4-8 | Scheduler 인증 | PASS | PASS | R1 수정 유지 확인 |
| 4-9 | Frontend 민감 정보 미노출 | PASS | PASS | - |

**Round 2 결과**: 9/9 PASS - 회귀 없음
**수정 사항**: 0건 (Round 1 수정 1건 유지 확인)
**주의 사항** (수정 불가, Round 1과 동일):
- Frontend npm audit: 4 vulnerabilities (1 high, 3 moderate)
- Backend npm audit: 21 vulnerabilities (11 high, 4 moderate, 6 low)
