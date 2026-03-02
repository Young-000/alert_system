# Round 2 - Quality Report

**Date**: 2026-02-12
**Branch**: `fix/homepage-ux-feedback`
**Scope**: Round 1에서 39건 quality 수정 후 회귀 검증 + 신규 항목

---

## Summary

| # | Check | Result | Notes |
|---|-------|:------:|-------|
| 5-1 | JSX 조건부 렌더링: 모순 조건 없음 | PASS | 변경 없음 |
| 5-2 | useEffect 의존성 배열 정확성 | PASS | 1건 eslint-disable (정당) |
| 5-3 | 비동기 cleanup: isMounted 패턴 | PASS | 10개 파일에서 일관 적용 |
| 5-4 | 이벤트 버블링: stopPropagation | PASS | 변경 없음 |
| 5-5 | 중복 요청 방지: isLoading guard | PASS | 변경 없음 |
| 5-6 | 파생 상태: useMemo 사용 | PASS | 변경 없음 |
| 5-7 | 에러 처리: catch 블록 사용자 피드백 | PASS | 변경 없음 |
| 5-8 | parseInt NaN 방지 | PASS | `\|\| 0` 패턴 적용 (AlertSettingsPage:572) |
| 5-9 | commuteApi useMemo singleton | WARN | 5개 파일 중 1개 미적용 (아래 상세) |
| 5-10 | console.log 프로덕션 코드 부재 | PASS | frontend/src 전체 0건, backend/src 전체 0건 |
| 5-11 | **[NEW]** web-push JSON.parse 안전성 | PASS | try-catch로 감싸져 있음 (아래 상세) |
| 5-12 | **[NEW]** auth.service.ts location 직렬화 | PASS | 일관된 형식 (아래 상세) |

**Result: PASS (0건 수정 필요, 2건 WARN)**

---

## 1. `any` 타입 사용 검사

### Frontend (`frontend/src/`)
```
검색: `: any` + `as any`
결과: 0건 (PASS)
```

### Backend (`backend/src/`) - Production Code
```
검색: `: any` (non-test files)
결과: 0건 (PASS)
```

### Backend Test Files (`.spec.ts`)
```
검색: `: any` + `as any`
결과:
- calculate-route-analytics.use-case.spec.ts: 3건 (mockRepository: any)
- alert.controller.spec.ts: 3건 (as any)
- notification-scheduler.service.spec.ts: 1건 (as any)
- auth.service.spec.ts: 1건 (as any)
- api-cache.service.spec.ts: 22건 (as any - mock 데이터 캐스팅)
- update-alert.use-case.spec.ts: 2건 (as any)
- cached-weather-api.client.spec.ts: 5건 (as any)
- air-quality-api.client.spec.ts: 1건 (as any)
- weather-api.client.spec.ts: 1건 (as any)
- subway-api.client.spec.ts: 1건 (as any)
- postgres-alert.repository.spec.ts: 1건 (as any)
- bus-api.client.spec.ts: 1건 (as any)

판정: INFO - 테스트 파일의 any/as any는 mock 객체 생성을 위한 관행. 프로덕션 코드에는 0건이므로 PASS.
```

---

## 2. 미사용 Import/변수

```bash
# Frontend
$ cd frontend && npm run lint:check
> eslint "src/**/*.{ts,tsx}"
# (exit 0, 에러/경고 0건)

$ cd frontend && npx tsc --noEmit
# (exit 0, 에러 0건)

# Backend
$ cd backend && npm run lint:check
> eslint "{src,apps,libs,test}/**/*.ts"
# (exit 0, 에러/경고 0건)

$ cd backend && npx tsc --noEmit
# (exit 0, 에러 0건)
```

**결과: PASS** - ESLint와 TypeScript 컴파일러 모두 미사용 import/변수 없음

---

## 3. 데드코드

```
검색: TODO, FIXME, HACK, XXX
- frontend/src: 0건
- backend/src: 0건

검색: @ts-ignore, @ts-expect-error
- frontend/src: 0건
- backend/src: 0건

검색: eslint-disable
- frontend/src: 1건 (CommuteTrackingPage.tsx:91)
  `// eslint-disable-next-line react-hooks/exhaustive-deps`
  사유: navState(useLocation state)는 의존성에서 의도적 제외.
  네비게이션 state는 최초 마운트 시에만 참조하며, 이후 변경 감지 불필요.
  판정: 정당한 사용

- backend/src: 0건
```

**결과: PASS**

---

## 4. 함수 반환 타입 누락

### 명시적 반환 타입 없는 함수 (presentation layer)

**내부 컴포넌트 함수 (JSX.Element 누락):**
| File | Line | Function | Missing Type |
|------|------|----------|-------------|
| `App.tsx` | 20 | `PageLoader()` | `: JSX.Element` |
| `App.tsx` | 43 | `App()` | `: JSX.Element` |
| `BottomNavigation.tsx` | 15 | `HomeIcon(...)` | `: JSX.Element` |
| `BottomNavigation.tsx` | 25 | `RouteIcon(...)` | `: JSX.Element` |
| `BottomNavigation.tsx` | 36 | `BellIcon(...)` | `: JSX.Element` |
| `BottomNavigation.tsx` | 46 | `SettingsIcon(...)` | `: JSX.Element` |
| `CommuteDashboardPage.tsx` | 769 | `CheckpointAnalysisBar(...)` | `: JSX.Element` |
| `CommuteDashboardPage.tsx` | 829 | `RouteAnalyticsCard(...)` | `: JSX.Element` |
| `Toast.tsx` | 68 | `useToast()` | 반환 타입 미명시 |

**async 화살표 함수 (Promise<void> 누락) - 15건:**
| File | Line | Function |
|------|------|----------|
| `OnboardingPage.tsx` | 99 | `createRouteFromOnboarding` |
| `RouteSetupPage.tsx` | 239 | `handleImportSharedRoute` |
| `RouteSetupPage.tsx` | 616 | `handleSave` |
| `RouteSetupPage.tsx` | 748 | `handleDeleteConfirm` |
| `AlertSettingsPage.tsx` | 98 | `fetchAlerts` |
| `AlertSettingsPage.tsx` | 535 | `handleDeleteConfirm` |
| `AlertSettingsPage.tsx` | 566 | `handleEditConfirm` |
| `SettingsPage.tsx` | 57 | `loadData` |
| `SettingsPage.tsx` | 92 | `handleDeleteConfirm` |
| `SettingsPage.tsx` | 118 | `handleTogglePush` |
| `SettingsPage.tsx` | 137 | `handleExportData` |
| `SettingsPage.tsx` | 162 | `handleDeleteAllData` |
| `LoginPage.tsx` | 27 | `warmUpServer` |
| `LoginPage.tsx` | 58 | `checkGoogleStatus` |
| `CommuteDashboardPage.tsx` | 72 | `loadData` |

**판정: INFO** - 모두 컴포넌트 내부(non-exported) 함수. TypeScript가 타입을 정확히 추론하므로 런타임 영향 없음. 컨벤션 관점에서 개선 가능하나 Round 1에서 exported 함수는 모두 수정 완료됨.

---

## 5. 매직 넘버/문자열

### AuthCallbackPage.tsx - setTimeout 지연 값
```typescript
// Line 31, 50: 에러 시 3초 후 /login 이동
setTimeout(() => navigate('/login'), 3000);

// Line 46: 성공 시 0.5초 후 /alerts 이동
setTimeout(() => navigate('/alerts'), 500);
```

**판정: INFO** - AuthCallbackPage는 단순한 콜백 전환 페이지. 상수 추출 가능하나 파일 내 사용 횟수가 적고 맥락이 명확하여 가독성 영향 미미.

### 상수화 완료된 매직 넘버 (Round 1 수정 유지 확인)
```typescript
// AlertSettingsPage.tsx
const TOAST_DURATION_MS = 2000;     // OK
const SEARCH_DEBOUNCE_MS = 300;     // OK
const MAX_SEARCH_RESULTS = 15;      // OK
const TRANSPORT_NOTIFY_OFFSET_MIN = 15; // OK

// SettingsPage.tsx
const TOAST_DURATION_MS = 3000;     // OK (값이 다름 - 의도적)

// BottomNavigation.tsx
const STROKE_ACTIVE = 'var(--primary)';   // OK
const STROKE_INACTIVE = 'var(--ink-secondary)'; // OK
const SW = 2.5;                      // OK (주석 포함)

// OnboardingPage.tsx
const DURATION_PRESETS = [15, 30, 45, 60, 90]; // OK
```

**판정: PASS** - 핵심 매직 넘버는 모두 상수화 완료. 나머지는 사소하며 맥락에서 충분히 이해 가능.

---

## 6. 코드 중복

### TOAST_DURATION_MS 중복 정의
```
AlertSettingsPage.tsx:14 - const TOAST_DURATION_MS = 2000;
SettingsPage.tsx:11 - const TOAST_DURATION_MS = 3000;
```
**판정: INFO** - 값이 다르므로 (2000 vs 3000) 의미적 중복이 아님. 페이지별 UX 의도가 다를 수 있음.

### isMounted 패턴 반복 (10개 useEffect)
```
HomePage.tsx, LoginPage.tsx, CommuteTrackingPage.tsx, SettingsPage.tsx,
CommuteDashboardPage.tsx, AlertSettingsPage.tsx, RouteSetupPage.tsx
```
**판정: INFO** - React의 비동기 cleanup 패턴으로 커스텀 훅 추출 가능하나, 각 useEffect의 로직이 다르므로 현재 구조도 합리적.

### commuteApi = getCommuteApiClient() 패턴
5개 파일에서 `useMemo(() => getCommuteApiClient(), [])` 적용:
- CommuteTrackingPage.tsx (line 14)
- RouteSetupPage.tsx (line 137)
- AlertSettingsPage.tsx (line 86)
- SettingsPage.tsx (line 46)
- CommuteDashboardPage.tsx (line 37)

1개 파일에서 미적용:
- **OnboardingPage.tsx** (line 34): `const commuteApi = getCommuteApiClient();`

**판정: WARN** - OnboardingPage는 useMemo 없이 매 렌더링마다 `getCommuteApiClient()` 호출. 해당 함수가 싱글톤을 반환하므로 기능적 문제는 없으나 다른 5개 페이지와 패턴 불일치.

또한 **HomePage.tsx**에서는 useEffect/handler 내부에서 직접 호출:
- Line 221: `const commuteApi = getCommuteApiClient();` (useEffect 내부)
- Line 379: `const commuteApi = getCommuteApiClient();` (handler 내부)

**판정: INFO** - HomePage는 함수 내부 호출이므로 useMemo 불필요 (매 렌더링 시 호출되지 않음). 패턴 차이가 있으나 정확한 사용.

---

## 7. 네이밍 컨벤션

```
검사 항목:
- 컴포넌트: PascalCase -> PASS (모든 컴포넌트)
- 훅: use 접두사 -> PASS (useToast, useOnlineStatus, useIdlePreload)
- 이벤트 핸들러: handle 접두사 -> PASS (handleStartCommute, handleDeleteConfirm 등)
- 상수: UPPER_SNAKE_CASE -> PASS (TOAST_DURATION_MS, SEARCH_DEBOUNCE_MS 등)
- 변수: camelCase -> PASS
- Props 인터페이스: 일관된 패턴 -> PASS
- 파일명: kebab-case (*.ts) 또는 PascalCase (*.tsx) -> PASS
```

**결과: PASS**

---

## 8. console.log 잔재

```
검색 범위: frontend/src + backend/src (프로덕션 코드)

console.log: 0건
console.debug: 0건
console.info: 0건
console.warn: 0건 (presentation layer)
console.error: 0건 (presentation layer)

Backend에서 Logger 사용:
- this.logger.log() / this.logger.warn() / this.logger.debug() -> NestJS Logger (적절)
```

**결과: PASS**

---

## [NEW] 5-11: web-push JSON.parse 안전성

**파일**: `backend/src/infrastructure/messaging/web-push.service.ts`

```typescript
// Lines 55-73
for (const sub of subscriptions) {
  try {
    const parsedKeys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
    await webPush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: parsedKeys.p256dh, auth: parsedKeys.auth },
      },
      payload,
    );
    sent++;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 410 || statusCode === 404) {
      await this.subscriptionRepo.delete(sub.id);
      this.logger.debug(`Removed expired subscription ${sub.id}`);
    } else {
      this.logger.warn(`Push send failed: ${error}`);
    }
  }
}
```

**분석**:
- `JSON.parse(sub.keys)`가 실패하면 `SyntaxError`를 throw
- 이 에러는 바로 위의 `catch (error: unknown)` 블록에서 포착됨
- `statusCode`가 undefined이므로 `this.logger.warn()`으로 로깅 후 다음 subscription으로 continue
- 한 건의 파싱 실패가 나머지 전송을 중단하지 않음

**결과: PASS** - try-catch가 JSON.parse 실패를 안전하게 처리

---

## [NEW] 5-12: auth.service.ts location 직렬화

**Frontend** (`frontend/src/infrastructure/supabase/auth.service.ts`):
```typescript
// Line 118
const locationJson = JSON.stringify({ address: '', lat: latitude, lng: longitude });
```
-> Supabase에 `{"address":"","lat":37.5,"lng":127.0}` 형식으로 저장

**Backend Entity** (`backend/src/infrastructure/persistence/typeorm/user.entity.ts`):
```typescript
// Lines 23-28
@Column({ type: 'simple-json', nullable: true })
location?: {
  address: string;
  lat: number;
  lng: number;
};
```
-> TypeORM `simple-json`은 `JSON.stringify`/`JSON.parse`로 자동 직렬화/역직렬화

**Frontend API Client** (`frontend/src/infrastructure/api/user-api.client.ts`):
```typescript
// Lines 7-11
location?: {
  address: string;
  lat: number;
  lng: number;
};
```

**분석**:
- Frontend Supabase와 Backend TypeORM 모두 동일한 `{address, lat, lng}` 구조 사용
- Supabase 직접 쓰기: `JSON.stringify()` -> text column -> 읽기 시 수동 파싱 필요
- Backend API 경유: TypeORM `simple-json`이 자동 처리
- 두 경로 모두 동일한 JSON 구조를 생성하므로 데이터 일관성 유지됨

**결과: PASS** - 직렬화 형식 일관

---

## 회귀 검증 결과

| R1 수정 항목 | 회귀 여부 | 확인 방법 |
|-------------|:---------:|----------|
| any 타입 제거 (39건 중 일부) | 없음 | grep + tsc --noEmit PASS |
| 반환 타입 명시 | 없음 | exported 함수 모두 명시, tsc PASS |
| 매직 넘버 상수화 | 없음 | 상수 선언 유지 확인 |
| console.log 제거 | 없음 | 전체 검색 0건 |
| useMemo commuteApi 적용 | 없음 | 5/6 파일 적용 (OnboardingPage 미적용은 R1 이전부터) |
| 새로운 lint 에러 | 없음 | lint:check 양쪽 모두 PASS |
| 새로운 타입 에러 | 없음 | tsc --noEmit 양쪽 모두 PASS |

---

## WARN 항목 상세

### WARN-1: OnboardingPage commuteApi useMemo 미적용

**파일**: `frontend/src/presentation/pages/OnboardingPage.tsx:34`
```typescript
// 현재 (useMemo 없음)
const commuteApi = getCommuteApiClient();

// 다른 5개 페이지 패턴
const commuteApi = useMemo(() => getCommuteApiClient(), []);
```

**영향**: `getCommuteApiClient()`는 싱글톤을 반환하므로 기능적 영향 없음. 패턴 일관성 문제.
**우선순위**: LOW

### WARN-2: 내부 함수 반환 타입 미명시 (24건)

9개 JSX 반환 함수 + 15개 async 화살표 함수에서 반환 타입 미명시.
모두 non-exported 내부 함수이며 TypeScript가 정확히 추론.

**영향**: 코드 가독성. 런타임 영향 없음.
**우선순위**: LOW

---

## Final Verdict

| Category | Count |
|----------|------:|
| PASS | 12/12 |
| WARN (non-blocking) | 2 |
| FAIL | 0 |
| 수정 필요 | 0건 |

Round 1의 39건 quality 수정이 새로운 품질 문제를 유발하지 않았음을 확인.
`any` 타입 0건, console.log 0건, 미사용 import 0건, lint 에러 0건, 타입 에러 0건.
