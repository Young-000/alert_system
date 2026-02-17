# Cycle 1: 기술 검증 리뷰

> 작성: Developer Agent (Senior Software Engineer)
> 일자: 2026-02-17
> 기반: PM 감사 보고서 (`cycle-1-project-audit.md`)

---

## 1. PM 감사 결과 기술 검증

### 1.1 검증된 사실 (정확함)

| PM 항목 | 실제 확인 결과 | 판정 |
|---------|--------------|------|
| HomePage.tsx 806줄 | `wc -l` = **806줄** 확인 | **정확** |
| SettingsPage.tsx 652줄 | `wc -l` = **652줄** 확인 | **정확** |
| CSS 16,873줄 (`presentation/index.css`) | `wc -l` = **16,873줄** 확인 (경로: `frontend/src/presentation/index.css`) | **정확** (PM은 `src/index.css`라 기재했으나 실제 경로는 `src/presentation/index.css`) |
| CI/CD 없음 | `.github/` 디렉토리 자체가 없음 | **정확** |
| 루트 MD 파일 20개 | 실제 20개 확인 (README.md 포함) | **정확** |
| `.aws-ready/` 폴더 265줄 | `wc -l` = **265줄** 확인 | **정확** |
| InMemoryNotificationScheduler 139줄 | `wc -l` = **141줄** (미미한 차이) | **거의 정확** |
| Render URL 잔존 | 6개 파일에서 총 9건 확인 | **정확** |
| `eslint-disable` 2곳 | `AlertSettingsPage.tsx:136`, `CommuteTrackingPage.tsx:108` 확인 | **정확** |
| better-sqlite3 dependencies | `backend/package.json:39`에 dependencies로 확인 | **정확** |
| 하드코딩 좌표 | `HomePage.tsx:327-328` (`lat = 37.5665, lng = 126.978`) 확인 | **정확** (PM은 328-329라 기재, 실제 327-328) |
| LoginPage Cold Start 코드 | `LoginPage.tsx:24-51` 서버 예열 코드 확인 | **정확** (PM은 25-50이라 기재) |
| `domain/`, `application/` 비어있음 | 디렉토리 자체가 존재하지 않음 (PM은 "비어있음"이라 했으나 **아예 없음**) | **수정 필요** |

### 1.2 PM 보고서 보정 사항

1. **CSS 파일 경로**: PM이 `index.css`라고만 기재했으나, 정확한 경로는 `frontend/src/presentation/index.css`
2. **프론트엔드 domain/application**: "비어있음"이 아니라 **디렉토리 자체가 존재하지 않음**. tsconfig에 path alias만 설정되어 있을 뿐, 실제 폴더가 생성된 적 없음
3. **InMemoryScheduler 줄 수**: 139줄이 아닌 141줄 (사소한 차이)
4. **하드코딩 좌표 라인 번호**: 328-329가 아닌 327-328

### 1.3 PM이 놓친 추가 발견 사항

#### 추가 발견 1: QueueModule과 SchedulerModule 이중 구조

`backend/src/infrastructure/queue/queue.module.ts`와 `backend/src/infrastructure/scheduler/scheduler.module.ts`가 **모두** `InMemoryNotificationSchedulerService`를 참조하고, **모두** `INotificationScheduler`를 provide한다.

- `QueueModule`: `QUEUE_ENABLED` 환경변수로 분기 (BullMQ vs InMemory)
- `SchedulerModule`: `AWS_SCHEDULER_ENABLED` 환경변수로 분기 (EventBridge vs InMemory)
- `notification.module.ts`는 `SchedulerModule.forRoot()`를 import하므로, `QueueModule`은 **실질적으로 사용되지 않을 가능성**이 높음
- **위험**: 어떤 모듈이 실제로 활성화되는지 혼란. 환경변수 `QUEUE_ENABLED`는 `.env`에도 `.env.example`에도 없음.

#### 추가 발견 2: better-sqlite3는 로컬 개발용

PM은 "E2E 테스트용이면 devDependencies로 이동해야 함"이라 했지만, 실제 확인 결과:
- `backend/.env.example:17` → `USE_SQLITE=true` (로컬 개발 기본값)
- `backend/src/infrastructure/persistence/database.config.ts:34` → SQLite 모드 분기 존재
- `backend/test/` 에서는 SQLite/better-sqlite3 직접 참조 **없음**
- **결론**: better-sqlite3는 E2E 테스트용이 아니라 **로컬 개발** 편의를 위한 것. 하지만 Dockerfile은 `npm ci --omit=dev`로 프로덕션 빌드하므로 devDependencies로 이동하면 **프로덕션에 영향 없음**. 다만 `npm ci` (개발 환경)에서 `USE_SQLITE=true`로 쓰는 사용자에게는 영향 있으므로 devDependencies 이동이 올바름.

#### 추가 발견 3: LoginPage에서 `serverStatus`가 UI에 영향

`LoginPage.tsx:249` → `disabled={isLoading || serverStatus === 'warming'}` — 서버 예열 상태에서 제출 버튼이 비활성화됨. Cold Start 코드 제거 시 `serverStatus` 상태 변수 전체를 제거하고, 버튼 disabled 조건에서도 이 참조를 제거해야 함.

#### 추가 발견 4: `notification.module.ts`의 InMemory 직접 주입

```typescript
// notification.module.ts:103-104
@Optional()
@Inject(InMemoryNotificationSchedulerService)
private readonly inMemoryScheduler?: InMemoryNotificationSchedulerService,
```

`SchedulerModule`이 EventBridge를 선택하더라도, `notification.module.ts`는 `InMemoryNotificationSchedulerService`를 `@Optional()`로 직접 주입받고 있음. InMemory 코드를 제거하면 이 부분도 함께 수정해야 함.

---

## 2. Quick Wins 상세 계획

### 2.1 C-1: CI/CD 파이프라인 구축

#### GitHub Actions 워크플로우 구조

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint:check
      - run: npm run type-check
      - run: npm test -- --passWithNoTests
      - run: npm run build

  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint:check
      - run: npm run type-check
      - run: npm test -- --passWithNoTests
      - run: npm run build
    env:
      USE_SQLITE: 'true'
      NODE_ENV: test
      JWT_SECRET: test-secret-for-ci
```

**구현 노트**:
- Frontend와 Backend를 별도 job으로 분리하여 병렬 실행
- Backend는 `USE_SQLITE=true`로 DB 없이 테스트 가능
- `--passWithNoTests`로 테스트 파일 없는 경우에도 통과
- AI Code Review (`anthropic/claude-code-action`)는 별도 PR 워크플로우로 추후 추가 가능
- 10개 skip 테스트가 있으므로 현재 CI에서 즉시 실패하지 않음 확인 필요

**예상 파일**: `.github/workflows/ci.yml` (1개 파일)

---

### 2.2 C-2: Dead Config 정리

#### 변경 필요 파일 전체 목록

**파일 1: `frontend/.env.test`** (삭제 또는 수정)
- 2행: `VITE_API_BASE_URL=https://alert-system-commute-test.onrender.com` → AWS CloudFront URL로 변경 또는 파일 삭제
- 판단: `.env.test` 파일 자체가 불필요할 수 있음. 테스트 시 mock을 사용하므로 삭제 권장

**파일 2: `frontend/.env.production`** (수정)
- 5~6행: 주석 처리된 Render URL 제거
  ```
  # 백업: Render (HTTPS)
  # VITE_API_BASE_URL=https://alert-system-kdg9.onrender.com
  ```

**파일 3: `.claude/STATUS.md`** (수정)
- 205행: Render 콜백 URL → AWS CloudFront URL로 변경
- 223행: `GOOGLE_CALLBACK_URL=https://alert-system-kdg9.onrender.com/...` → CloudFront URL
- 239행: `curl https://alert-system-kdg9.onrender.com/...` → CloudFront URL
- 219행: `#### Backend (Render)` 섹션 제목 → `#### Backend (AWS)`

**파일 4: `.claude/commands/validate-supabase.md`** (수정)
- 9행: `curl -s https://alert-system-kdg9.onrender.com/health` → CloudFront URL
- 14행: `curl -s -X POST https://alert-system-kdg9.onrender.com/auth/register` → CloudFront URL
- 55행: `1. Render에서 DB_SYNCHRONIZE=true 설정` → AWS/ECS 관련으로 업데이트

**파일 5: `COMMUTE_TRACKING_PROGRESS.md`** (C-3에서 아카이브 대상이므로 별도 수정 불필요)
- 21행: Render URL 참조

**파일 6: `backend/src/infrastructure/scheduler/.aws-ready/`** (디렉토리 전체 삭제)
- `eventbridge-scheduler.service.ts` (265줄) — 실제 사용 중인 파일과 별도의 백업 코드
- `README.md` (45줄) — 마이그레이션 가이드 (이미 완료)

**파일 7: `backend/src/infrastructure/queue/in-memory-notification-scheduler.service.ts`** (141줄 삭제)

**파일 8: `backend/src/infrastructure/queue/queue.module.ts`** (수정 또는 삭제)
- InMemoryNotificationSchedulerService 참조 제거
- `QUEUE_ENABLED` 분기 정리 (Redis/BullMQ를 사용하지 않는다면 전체 삭제 가능)

**파일 9: `backend/src/infrastructure/scheduler/scheduler.module.ts`** (수정)
- InMemoryNotificationSchedulerService import 및 fallback 분기 제거
- EventBridge만 남기고 간소화

**파일 10: `backend/src/presentation/modules/notification.module.ts`** (수정)
- 18행: `InMemoryNotificationSchedulerService` import 제거
- 27행: `isQueueEnabled` 변수 제거
- 103~104행: `@Optional() @Inject(InMemoryNotificationSchedulerService)` 제거
- 110~117행: InMemory 스케줄러 핸들러 연결 코드 제거

**파일 11: `backend/src/presentation/app.module.ts`** (수정)
- 18행: `QueueModule` import 문 제거
- 30행: imports 배열에서 `QueueModule` 제거
- **이유**: `QueueModule`과 `SchedulerModule`이 모두 `INotificationScheduler`를 provide하는 DI 충돌 구조

**파일 12: `frontend/src/presentation/pages/LoginPage.tsx`** (수정)
- 21행: `serverStatus` 상태 제거
- 24~51행: `warmUpServer` useEffect 전체 제거
- 53~77행: `checkGoogleStatus` useEffect에서 `serverStatus !== 'ready'` 가드 제거 (직접 실행으로 변경)
- 249행: `disabled={isLoading || serverStatus === 'warming'}` → `disabled={isLoading}`
- 251~254행: `serverStatus === 'warming'` 분기의 "서버 연결 중..." UI 제거

**총 변경량**: 12개 파일, 약 500줄 삭제/수정

---

### 2.3 C-3: 레거시 문서 정리

#### 분류 기준
- **유지**: 현재 활성적으로 참조되거나 최신 정보를 담고 있는 파일
- **아카이브**: 과거 작업 기록이지만 참고 가치가 있는 파일 → `docs/archive/`로 이동
- **삭제**: 완전히 중복이거나 더 이상 의미 없는 파일

#### 파일별 판정

| 파일 | 줄 수 | 판정 | 이유 |
|------|-------|------|------|
| `CLAUDE.md` | 463 | **유지** | 프로젝트 핵심 설정 파일 |
| `README.md` | 125 | **유지** | 프로젝트 진입점, GitHub 표시용 |
| `WARP.md` | 463 | **삭제** | `CLAUDE.md`와 **동일 내용** (diff 결과 0 차이) |
| `QUALITY_CHECKLIST.md` | 569 | **삭제** | `CLAUDE.md`에 이미 동일한 품질 체크리스트 포함 |
| `PROJECT_OVERVIEW.md` | 246 | **아카이브** | 프로젝트 개요이나 `CLAUDE.md`와 중복, 과거 스냅샷으로서 가치 있음 |
| `PROJECT_REVIEW.md` | 480 | **아카이브** | 2026-01-23 종합 리뷰, 과거 기록으로 참고 가치 |
| `IMPLEMENTATION_STATUS.md` | 97 | **아카이브** | 구현 현황 기록, 현재는 `docs/PROGRESS.md`가 대체 |
| `COMMUTE_TRACKING_PROGRESS.md` | 369 | **아카이브** | Phase 1 진행 기록 (Render URL 포함) |
| `E2E_CHECKLIST.md` | 192 | **아카이브** | 2026-02-08 E2E 검증 기록, `docs/qa/`에 유사 문서 존재 |
| `CHECKLIST.md` | 120 | **아카이브** | 설정 체크리스트, 과거 기록 |
| `GIT_SETUP.md` | 169 | **삭제** | Git 초기 설정 가이드, 일회성 작업 완료 |
| `PUSH_INSTRUCTIONS.md` | 80 | **삭제** | Git push 가이드, 일회성 |
| `PUSH_TO_GIT.md` | 94 | **삭제** | 위와 동일 목적 |
| `QUICK_START.md` | 111 | **삭제** | `README.md`와 `CLAUDE.md`에서 다루는 내용 |
| `SIMPLE_SETUP.md` | 71 | **삭제** | 설정 가이드 중복 |
| `SETUP_SUPABASE.md` | 103 | **삭제** | Supabase 설정, `CLAUDE.md`에 포함 |
| `SUPABASE_SETUP.md` | 160 | **삭제** | 위와 중복 |
| `MOBILE_SETUP.md` | 218 | **삭제** | 모바일 개발 가이드, 현재 사용하지 않음 |
| `MOBILE_WORK_SIMPLE.md` | 111 | **삭제** | 위와 동일 |
| `CURSOR_MOBILE_WORKFLOW.md` | 122 | **삭제** | Cursor 모바일 가이드, 현재 사용하지 않음 |

#### 실행 계획
1. `docs/archive/` 디렉토리 생성
2. 아카이브 대상 5개 파일 이동
3. 삭제 대상 12개 파일 삭제
4. 유지 대상 2개 파일은 그대로 유지

**결과**: 루트 MD 파일 20개 → 2개 (`CLAUDE.md`, `README.md`)

---

### 2.4 I-3: 사일런트 에러 처리 수정

#### 수정이 필요한 catch 블록 전체 목록

**즉시 수정 필요 (사용자에게 피드백 없음)**:

| # | 파일 | 라인 | 현재 동작 | 수정 방안 |
|---|------|------|----------|----------|
| 1 | `SettingsPage.tsx` | 87-89 | 알림 토글 실패 시 무시, 주석 "optimistic" | **롤백 + 에러 메시지**. 낙관적 업데이트인데 실패 시 원래 상태로 복원하지 않음 (alert-settings/use-alert-crud.ts:201은 올바르게 롤백함) |
| 2 | `SettingsPage.tsx` | 105-106 | 삭제 실패 시 무시 | **에러 메시지 표시** 필요 (`setDeleteError` 같은 상태) |
| 3 | `SettingsPage.tsx` | 130-132 | 푸시 알림 토글 실패 시 무시 | **에러 메시지 표시** 필요 ("푸시 알림 설정에 실패했습니다") |
| 4 | `SettingsPage.tsx` | 68-70 | 데이터 로드 실패 시 무시 | 개별 API에 `.catch` 있으므로 **수용 가능**, 단 전체 실패 시 빈 화면 위험 → 에러 상태 추가 권장 |
| 5 | `HomePage.tsx` | 311-312 | 데이터 로드 실패 시 "Non-critical" 주석 | 개별 `.catch(() => [])` 처리가 있지만, **모든 API가 실패하면 빈 화면** → 최소한 "데이터를 불러올 수 없습니다" 표시 필요 |
| 6 | `commute-dashboard/use-commute-dashboard.ts` | 123-124 | 대시보드 데이터 로드 실패 시 무시 | **에러 상태 표시** 필요 |
| 7 | `commute-dashboard/LoadMoreButton.tsx` | 19-20 | "더 보기" 로드 실패 시 무시 | **"불러오기 실패" 메시지** 또는 재시도 버튼 필요 |
| 8 | `alert-settings/use-alert-crud.ts` | 108-109 | 알림 목록 리로드 실패 시 무시 | **수용 가능** (기존 목록은 유지되므로 심각하지 않음) |
| 9 | `RouteSetupPage.tsx` | 137-139 | 공유 데이터 파싱 실패 시 무시 | **수용 가능** (invalid data 무시는 정상 동작) |
| 10 | `RouteSetupPage.tsx` | 299-301 | 알림 자동 생성 실패 시 무시 | **수용 가능** (경로 저장 성공 우선, 주석으로 명시됨) |

**수용 가능한 사일런트 처리 (수정 불필요)**:

| # | 파일 | 라인 | 이유 |
|---|------|------|------|
| A | `behavior-collector.ts` | 76, 98, 118 | 애널리틱스 실패는 앱 동작에 영향 주면 안 됨 |
| B | `safe-storage.ts` | 9 | localStorage 실패는 `console.warn`으로 이미 기록 |
| C | `push-manager.ts` | 63 | 이미 제거된 구독 재시도는 무시해도 됨 |
| D | `sw.ts` | 76 | Service Worker 내부 파싱은 fallback이 있음 |
| E | `HomePage.tsx` | 521-523 | 세션 시작 실패 시 `/commute`로 fallback 이동 (의도적) |
| F | `HomePage.tsx` | 72-74 | localStorage 파싱 실패 시 빈 Set 반환 (의도적) |

**총 수정 대상**: 7건 (즉시), 3건 (권장)

---

### 2.5 I-8: better-sqlite3 검증

#### 사용처 분석

| 위치 | 용도 |
|------|------|
| `backend/package.json:39` | **dependencies**에 포함 |
| `backend/src/infrastructure/persistence/database.config.ts:34` | `USE_SQLITE=true`일 때 SQLite 모드 활성화 |
| `backend/src/infrastructure/persistence/database.config.ts:57-63` | SQLite 커넥션 옵션 생성 |
| `backend/src/infrastructure/persistence/postgres-subway-station.repository.ts:31` | SQLite/better-sqlite3 타입 분기 (SQL 구문 차이 대응) |
| `backend/.env.example:17` | `USE_SQLITE=true` (로컬 개발 기본값) |
| `backend/.env:19` | `USE_SQLITE=false` (현재 설정) |

#### 테스트에서의 사용

- `backend/test/` 디렉토리에서 `sqlite`, `better-sqlite3` 직접 참조: **0건**
- E2E 테스트 설정(`jest-e2e.json`)에도 SQLite 관련 설정: **없음**

#### 결론

`better-sqlite3`는 **로컬 개발 편의용**이다. PostgreSQL 없이 로컬에서 빠르게 개발/테스트할 때 사용한다.

**devDependencies로 이동해도 안전한 이유**:
1. Dockerfile에서 `npm ci --omit=dev` → 프로덕션 이미지에 포함되지 않음 (이미 포함 안 됨이 맞지만, dependencies에 있으면 Docker 이미지 빌드 단계에서 native 모듈 컴파일 시도로 빌드 시간 증가)
2. 프로덕션 환경(`NODE_ENV=production`)에서는 `USE_SQLITE=false`
3. CI에서는 `USE_SQLITE=true` + devDependencies 설치됨 (`npm ci`는 devDependencies 포함)

**추가 정리 대상**: `devDependencies`에 이미 `sqlite3: ^5.1.7`과 `sql.js: ^1.13.0`이 있음. 세 가지 SQLite 관련 패키지가 혼재:
- `better-sqlite3` (dependencies) → devDependencies로 이동
- `sqlite3` (devDependencies) → 사용처 확인 필요, 아마 불필요
- `sql.js` (devDependencies) → 사용처 확인 필요, 아마 불필요

---

## 3. 기술 리스크 평가

### 3.1 Breaking Change 위험도

| 항목 | 위험도 | 상세 |
|------|:------:|------|
| C-1: CI/CD 추가 | **없음** | 신규 파일 추가만. 기존 코드 변경 없음. 단, CI에서 기존 테스트가 실패할 수 있으므로 먼저 로컬에서 전체 테스트 통과 확인 필요 |
| C-2: Dead Config 정리 | **낮음** | InMemory 스케줄러 제거 시 `notification.module.ts`, `scheduler.module.ts`, `queue.module.ts` 3개 파일 동시 수정 필요. 환경변수 분기 로직이 얽혀있어 주의 |
| C-2: LoginPage Cold Start 제거 | **없음** | UI 상태 변수와 useEffect 제거. 기능에 영향 없음 |
| C-2: Render URL 제거 | **없음** | 설정 파일과 문서 수정. 런타임 영향 없음 |
| C-3: 문서 정리 | **없음** | MD 파일 이동/삭제. 코드에 영향 없음 |
| I-3: 에러 피드백 추가 | **없음** | 기존 catch 블록에 상태 업데이트 추가. 기존 동작을 변경하지 않고 피드백만 추가 |
| I-8: better-sqlite3 이동 | **낮음** | devDependencies로 이동 시 로컬 개발(`npm ci`)에서는 여전히 설치됨. Docker 빌드 시 `npm ci --omit=dev`이므로 프로덕션 무영향. 단, 로컬 `npm install --omit=dev` 실행하는 사용자가 있다면 SQLite 모드 실패 |

### 3.2 숨겨진 의존성

#### 의존성 1: InMemory 스케줄러 → QueueModule → notification.module.ts

InMemory 스케줄러 제거 시 영향 체인:

```
in-memory-notification-scheduler.service.ts (삭제)
  ↑ import from
  ├── scheduler.module.ts (수정: fallback 제거)
  ├── queue.module.ts (수정: InMemory 참조 제거)
  └── notification.module.ts (수정: @Optional @Inject 제거, isQueueEnabled 제거)
```

**주의**: `queue.module.ts`는 `QUEUE_ENABLED` 환경변수로 Redis/BullMQ를 제어하는데, 이 환경변수는 어디에도 설정되어 있지 않다 (`.env`, `.env.example` 모두에 없음). 즉 `QUEUE_ENABLED`는 항상 `undefined`이므로 `isQueueEnabled`는 항상 `false` → 실질적으로 `QueueModule`은 항상 InMemory를 사용하도록 설정된다.

하지만 `notification.module.ts`는 `SchedulerModule.forRoot()`를 import하고, `SchedulerModule`은 `AWS_SCHEDULER_ENABLED`로 EventBridge를 선택한다. **두 모듈이 모두 `INotificationScheduler`를 provide하는 구조는 NestJS DI 충돌 가능성**이 있다.

**안전한 정리 방법**: `QueueModule`에서 `InMemoryNotificationSchedulerService` 관련 코드를 제거하되, Redis/BullMQ 관련 코드는 유지 (나중에 필요할 수 있으므로). 또는 `QueueModule` 자체가 사용되지 않는다면 `notification.module.ts`에서 import 여부 확인 후 판단.

→ 확인 결과: `QueueModule`은 `app.module.ts:30`에서 **직접 import되고 있음**. 즉:
- `app.module.ts` → `QueueModule` (InMemory `INotificationScheduler` provide)
- `app.module.ts` → `NotificationModule` → `SchedulerModule.forRoot()` (EventBridge `INotificationScheduler` provide)

**두 모듈이 같은 토큰 `INotificationScheduler`를 provide하는 DI 충돌 구조**. NestJS에서는 마지막 import가 우선하므로 현재는 `NotificationModule`(SchedulerModule)이 이기고 있을 가능성이 높지만, 이는 import 순서에 의존하는 취약한 구조.

**안전한 정리**: `app.module.ts`에서 `QueueModule` import를 제거하고, `QueueModule` 자체를 삭제 또는 Redis 전용으로 축소.

#### 의존성 2: `.env.test` → Frontend 테스트

`frontend/.env.test`를 삭제하면 Vite의 테스트 모드 환경변수가 사라짐. 현재 Jest를 사용하므로 Vite의 `.env.test` 로딩이 적용되지 않을 수 있지만, 안전하게 URL만 수정하는 것이 좋음.

### 3.3 안전한 구현 순서

```
Phase 1 (독립 작업, 병렬 가능):
  ├── C-1: CI/CD 파이프라인 구축 (신규 파일만)
  ├── C-3: 레거시 문서 정리 (파일 이동/삭제만)
  └── I-8: better-sqlite3 devDependencies 이동 (package.json만)

Phase 2 (CI 통과 확인 후):
  ├── C-2-a: Render URL 정리 (설정 파일/문서)
  ├── C-2-b: LoginPage Cold Start 코드 제거
  └── I-3: 에러 피드백 추가

Phase 3 (InMemory 정리 - 가장 주의 필요):
  └── C-2-c: InMemory Scheduler + .aws-ready + QueueModule 삭제
      ├── in-memory-notification-scheduler.service.ts 삭제
      ├── .aws-ready/ 디렉토리 삭제
      ├── queue.module.ts 수정 (InMemory 참조 제거)
      ├── scheduler.module.ts 수정 (InMemory fallback 제거)
      ├── notification.module.ts 수정 (@Optional InMemory 주입 제거)
      └── app.module.ts 수정 (QueueModule import 제거)
```

**이유**:
1. Phase 1은 서로 독립적이고 breaking change 없음. CI가 먼저 있어야 Phase 2/3의 변경이 자동 검증됨
2. Phase 2는 간단한 수정이지만 CI로 검증할 수 있으면 더 안전
3. Phase 3는 3개 모듈이 연쇄 수정되므로 가장 마지막에, 테스트 통과를 확인하면서 진행

---

## 4. 요약

### PM 감사 정확도: **95% (높음)**

PM의 발견 사항은 대부분 정확했다. CSS 파일 경로, 일부 라인 번호, domain/application 디렉토리 존재 여부 등 사소한 차이만 있었다.

### Cycle 2 작업 범위 확정

| 작업 | 파일 수 | 변경량 | 위험도 |
|------|---------|--------|:------:|
| C-1: CI/CD | 1 (신규) | ~50줄 | 없음 |
| C-2: Dead Config | 12 | ~500줄 삭제/수정 | 낮음 |
| C-3: 문서 정리 | 17 (이동/삭제) | 0줄 코드 변경 | 없음 |
| I-3: 에러 피드백 | 4~5 | ~60줄 추가 | 없음 |
| I-8: better-sqlite3 | 1 | 1줄 이동 | 낮음 |

**총 예상 노력**: 2~3 세션, 이 중 C-2의 InMemory 정리가 가장 주의 필요

---

*검증: Developer Agent (Cycle 1)*
*다음 단계: Cycle 2 구현 시작 → Phase 1 (CI/CD + 문서정리 + deps) → Phase 2 (Render/Cold Start) → Phase 3 (InMemory)*
