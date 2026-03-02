# Round 2 - 03. Test (Unit Test Regression Verification)

**Date**: 2026-02-12
**Branch**: `fix/homepage-ux-feedback`
**Purpose**: Round 1에서 71건 수정 후 테스트 회귀(regression) 확인

---

## 1. Frontend Unit Tests

### 실행 커맨드
```bash
cd frontend && npm test  # jest
```

### 결과: PASS (8/8 suites, 25/25 tests)

| # | Test Suite | Tests | Status | Duration |
|---|-----------|------:|:------:|----------|
| 1 | AlertSettingsPage.test.tsx | 5 | PASS | 211ms |
| 2 | CommuteDashboardPage.test.tsx | 2 | PASS | 227ms |
| 3 | CommuteTrackingPage.test.tsx | 2 | PASS | 69ms |
| 4 | HomePage.test.tsx | 1 | PASS | 129ms |
| 5 | LoginPage.test.tsx | 9 | PASS | ~5.5s |
| 6 | NotFoundPage.test.tsx | 2 | PASS | 206ms |
| 7 | OnboardingPage.test.tsx | 2 | PASS | 177ms |
| 8 | RouteSetupPage.test.tsx | 2 | PASS | 223ms |

### 상세 테스트 목록

```
AlertSettingsPage.test.tsx
  ✓ should render wizard first step with type selection
  ✓ should load existing alerts
  ✓ should navigate through wizard steps when weather is selected
  ✓ should show login warning when userId is not set
  ✓ should delete an alert

CommuteDashboardPage.test.tsx
  ✓ should render dashboard page
  ✓ should show login message if not authenticated

CommuteTrackingPage.test.tsx
  ✓ should render commute tracking page
  ✓ should redirect to login if not authenticated

HomePage.test.tsx
  ✓ should render home page

LoginPage.test.tsx
  ✓ 로그인 폼을 렌더링해야 한다
  ✓ 로그인 성공 시 토큰을 저장하고 알림 페이지로 이동해야 한다
  ✓ 로그인 실패 시 에러 메시지를 표시해야 한다
  ✓ 회원가입 모드로 전환 시 이름 필드가 표시되어야 한다
  ✓ 회원가입 폼을 제출할 수 있어야 한다
  ✓ 이미 등록된 이메일로 회원가입 시 에러 메시지를 표시해야 한다
  ✓ 비밀번호 표시/숨기기 토글이 동작해야 한다
  ✓ 로딩 중에는 버튼이 비활성화되어야 한다
  ✓ 모드 전환 시 에러 메시지가 초기화되어야 한다

NotFoundPage.test.tsx
  ✓ should render 404 page
  ✓ should have a link to home

OnboardingPage.test.tsx
  ✓ should render onboarding page
  ✓ should redirect to login if not authenticated

RouteSetupPage.test.tsx
  ✓ should render route setup page
  ✓ should show login message if not authenticated
```

### Console Warnings (non-blocking)
- React Router v7 Future Flag warnings (v7_startTransition, v7_relativeSplatPath) - 모든 테스트에서 발생, 기능 무관
- `act(...)` warnings in CommuteTrackingPage, RouteSetupPage - 비동기 state update, 테스트 결과에 영향 없음

---

## 2. Backend Unit Tests

### 실행 커맨드
```bash
cd backend && npm test  # jest
```

### 결과: PASS (27/27 suites, 194 passed, 10 skipped)

| # | Test Suite | Status |
|---|-----------|:------:|
| 1 | alert.controller.spec.ts | PASS |
| 2 | alert.entity.spec.ts | PASS |
| 3 | alert.repository.spec.ts | PASS |
| 4 | alimtalk.service.spec.ts | PASS |
| 5 | api-cache.service.spec.ts | PASS |
| 6 | air-quality-api.client.spec.ts | PASS |
| 7 | bus-api.client.spec.ts | PASS |
| 8 | cached-weather-api.client.spec.ts | PASS |
| 9 | calculate-route-analytics.use-case.spec.ts | PASS |
| 10 | create-alert.use-case.spec.ts | PASS |
| 11 | create-user.use-case.spec.ts | PASS |
| 12 | delete-alert.use-case.spec.ts | PASS |
| 13 | get-air-quality.use-case.spec.ts | PASS |
| 14 | get-user.use-case.spec.ts | PASS |
| 15 | auth.service.spec.ts | PASS |
| 16 | login.use-case.spec.ts | PASS |
| 17 | notification-scheduler.service.spec.ts | PASS |
| 18 | route-analytics.entity.spec.ts | PASS |
| 19 | search-bus-stops.use-case.spec.ts | PASS |
| 20 | search-subway-stations.use-case.spec.ts | PASS |
| 21 | send-notification.use-case.spec.ts | PASS |
| 22 | subway-api.client.spec.ts | PASS |
| 23 | update-alert.use-case.spec.ts | PASS |
| 24 | update-user-location.use-case.spec.ts | PASS |
| 25 | user.entity.spec.ts | PASS |
| 26 | user.repository.spec.ts | PASS |
| 27 | weather-api.client.spec.ts | PASS |

### Skipped Suites (3)
- E2E 또는 통합 테스트 관련 suites (CI 환경 의존)

### Skipped Tests (10)
- 환경 의존 테스트 (Redis 연결, 외부 API 등)

---

## 3. Frontend Coverage

```
File                       | % Stmts | % Branch | % Funcs | % Lines
---------------------------|---------|----------|---------|--------
All files                  |   33.04 |    16.73 |   22.57 |   34.89
 safe-storage.ts           |   66.66 |      100 |     100 |   66.66
 ConfirmModal.tsx          |   29.41 |        8 |   28.57 |      25
 EmptyState.tsx            |     100 |      100 |     100 |     100
 StatCard.tsx              |      50 |        0 |       0 |      50
 AlertSettingsPage.tsx     |   27.95 |    24.09 |   23.66 |   29.82
 CommuteDashboardPage.tsx  |   41.53 |     7.64 |   16.66 |    46.9
 CommuteTrackingPage.tsx   |      45 |    21.42 |   34.48 |   47.05
 HomePage.tsx              |   24.33 |     7.73 |   21.42 |   26.11
 LoginPage.tsx             |   88.09 |    84.48 |   93.33 |   89.74
 NotFoundPage.tsx          |     100 |      100 |     100 |     100
 OnboardingPage.tsx        |   38.02 |    25.42 |   11.11 |   38.57
 RouteSetupPage.tsx        |   24.26 |     3.39 |   10.57 |   25.06
```

**분석**:
- LoginPage (89.74%), NotFoundPage (100%), EmptyState (100%) - 높은 커버리지
- HomePage (26.11%), RouteSetupPage (25.06%), AlertSettingsPage (29.82%) - 낮은 커버리지
  - 이유: 복잡한 상태 머신(wizard 등)의 다양한 경로를 테스트하지 않음 (smoke test 수준)
- 전체 33.04% - 향후 테스트 보강 필요 (현재는 핵심 렌더링 + auth guard 중심)

## 4. Backend Coverage

```
All files   | % Stmts: 26.43 | % Branch: 20.27 | % Funcs: 22.34 | % Lines: 26.4
```

**분석**:
- 핵심 비즈니스 로직 (use-cases, entities, repositories, external APIs) 집중 테스트
- Controller, Module 파일은 주로 0% (NestJS DI 구조상 통합 테스트 영역)
- 27개 test suite가 핵심 로직을 커버

---

## 5. Checklist 검증 결과

| # | Check | R1 결과 | R2 결과 | 비고 |
|---|-------|:-------:|:-------:|------|
| 3-1 | Frontend 단위 테스트 전체 통과 | 8/8 | **8/8 PASS** | 25 tests 전체 통과 |
| 3-2 | Backend 단위 테스트 전체 통과 | 27/27 | **27/27 PASS** | 194 passed, 10 skipped |
| 3-3 | Frontend 테스트 커버리지 확인 | PASS | **PASS** | 33.04% stmts |
| 3-4 | Backend 테스트 커버리지 확인 | PASS | **PASS** | 26.43% stmts |
| 3-5 | Playwright E2E 테스트 | SKIP | **SKIP** | CI 환경 필요 |
| 3-6 | HomePage.test.tsx 동기화 확인 | PASS | **PASS** | '출퇴근 메이트' 텍스트 매칭 |
| 3-7 | AlertSettingsPage.test.tsx 동기화 확인 | PASS | **PASS** | wizard step + delete 테스트 정상 |
| 3-8 | RouteSetupPage.test.tsx 동기화 확인 | PASS | **PASS** | 렌더링 + auth guard 정상 |

---

## 6. 회귀 분석

### Round 1 수정의 영향 분석

| 수정 카테고리 | 건수 | 테스트 영향 | 결과 |
|-------------|-----:|:----------:|:----:|
| quality (any 제거, 반환 타입 추가) | 39 | mock 타입 호환성 | 영향 없음 |
| performance (lazy, useMemo, React.memo) | 6 | 렌더링 테스트 | 영향 없음 |
| accessibility (aria-label 추가) | 16 | getByLabelText 쿼리 | 영향 없음 (삭제 버튼 `aria-label='삭제'` 테스트 정상) |
| Entity 수정 (push_subscriptions keys) | 1 | Backend mock | 영향 없음 |
| Frontend DbUser 인터페이스 | 1 | Frontend mock | 영향 없음 |

### 핵심 회귀 포인트 확인

1. **DbUser 인터페이스 변경** (latitude/longitude -> location/email/google_id):
   - Frontend 테스트에서 직접 DbUser를 사용하지 않으므로 영향 없음
   - HomePage.test.tsx는 렌더링만 확인 (API mock 미사용)

2. **push-subscription.entity 변경** (p256dh/auth -> keys):
   - Backend 테스트에서 push-subscription 직접 테스트 없음 (entity만 coverage)
   - notification 관련 use-case 테스트는 mock으로 격리됨

3. **aria-label 추가** (a11y 16건):
   - AlertSettingsPage.test.tsx에서 `getByLabelText('삭제')` 사용 -> 정상 동작 확인
   - 새로 추가된 aria-label이 기존 테스트와 충돌하지 않음

---

## 7. Note: Vitest vs Jest

**주의**: 체크리스트에 `npx vitest run`으로 기재되어 있으나, 프로젝트는 Jest를 사용합니다.
- `frontend/package.json` -> `"test": "jest"`
- `vitest.config.*` 파일 없음
- 테스트 파일은 `jest.mock()`, `jest.fn()` API 사용
- 올바른 실행 커맨드: `cd frontend && npm test` (jest)

---

## Summary

| Area | Suites | Tests | Skipped | Result |
|------|-------:|------:|--------:|:------:|
| **Frontend** | 8/8 | 25/25 | 0 | **PASS** |
| **Backend** | 27/27 | 194/194 | 10 | **PASS** |
| **Total** | **35/35** | **219/219** | **10** | **PASS** |

> R1 기준 229개에서 R2 219개로 차이: R1에서 skip 포함 총수를 카운트했을 가능성. 실제 실행(pass) 기준 Frontend 25 + Backend 194 = **219 tests passed**.

**수정 필요 건수: 0건** - 71건 수정 후 모든 테스트 회귀 없음 확인.
