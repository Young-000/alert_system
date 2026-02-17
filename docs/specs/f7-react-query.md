# F-7: @tanstack/react-query 도입 (서버 상태 관리)

> 작성일: 2026-02-17
> 작성자: PM Agent
> RICE Score: 100 (Reach 100 x Impact 1.5 x Confidence 100% / Effort 1.5)

---

## JTBD

출퇴근 메이트 사용자로서, 페이지를 이동하거나 탭을 전환할 때 **데이터가 항상 최신 상태**이고, 불필요한 로딩 없이 **즉시 화면이 표시**되길 원한다. 그래서 **아침 출근 준비 시간에 빠르게 정보를 확인**할 수 있다.

---

## 1. 목적과 범위

### 1.1 왜 react-query가 필요한가 (구체적 문제점)

#### 문제 1: 매 마운트마다 불필요한 API 재호출

현재 모든 데이터 페칭은 `useEffect` + `useState` 패턴으로 구현되어 있다. 사용자가 홈 → 설정 → 홈으로 돌아오면, 이미 1분 전에 받았던 날씨/알림/경로 데이터를 **처음부터 다시 요청**한다.

```
현재: 홈(로드 1.2초) → 설정 → 홈(로드 1.2초 다시)
목표: 홈(로드 1.2초) → 설정 → 홈(캐시 즉시 표시, 백그라운드 갱신)
```

**영향받는 코드:**
- `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/home/use-home-data.ts` (7개 useEffect)
- `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/settings/use-settings.ts` (2개 useEffect)
- `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/alert-settings/use-alert-crud.ts` (2개 useEffect)
- `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/commute-dashboard/use-commute-dashboard.ts` (1개 useEffect)

#### 문제 2: 보일러플레이트 반복

4개 커스텀 훅에서 동일한 패턴이 반복된다:

```typescript
// 이 패턴이 4개 훅에서 각각 반복됨
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => {
  let isMounted = true;
  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await apiCall();
      if (isMounted) setData(result);
    } catch {
      if (isMounted) setError('...');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };
  loadData();
  return () => { isMounted = false; };
}, [dependency]);
```

현재 `isMounted` 가드가 **12곳**에서 수동 관리되고 있다. react-query는 이를 자동 처리한다.

#### 문제 3: 데이터 동기화 부재

- 알림 설정 페이지(`/alerts`)에서 알림을 생성한 후 홈(`/`)으로 돌아가면, 홈의 알림 목록은 여전히 이전 데이터이다.
- `useAlertCrud.reloadAlerts()`가 존재하지만, **같은 페이지 안에서만** 동작하고 다른 페이지의 상태는 갱신하지 못한다.
- react-query의 `queryClient.invalidateQueries`로 전역 캐시 무효화가 가능해진다.

#### 문제 4: F-3(실시간 교통 갱신)의 기술적 전제

F-3은 교통 정보를 30초 간격으로 자동 갱신하는 기능이다. 현재 아키텍처에서는 `setInterval` + `useState`로 구현해야 하는데, 이는 컴포넌트 언마운트 시 메모리 누수 위험이 있고 윈도우 포커스/비포커스 상태 관리가 수동이다. react-query의 `refetchInterval` + `refetchIntervalInBackground: false`로 간결하게 해결된다.

### 1.2 이번 사이클 전환 범위

**전환 대상: 핵심 READ API 5개** (가장 빈번하게 호출되는 GET 요청)

| # | API | 현재 위치 | 사용 페이지 | 선정 이유 |
|---|-----|-----------|------------|-----------|
| 1 | 사용자 알림 목록 | `alertApiClient.getAlertsByUser` | 홈, 알림 설정, 설정 | 3개 페이지에서 중복 호출 |
| 2 | 사용자 경로 목록 | `commuteApi.getUserRoutes` | 홈, 알림 설정, 설정 | 3개 페이지에서 중복 호출 |
| 3 | 현재 날씨 | `weatherApiClient.getCurrentWeather` | 홈 | 위치 기반, F-3 자동 갱신 대상 |
| 4 | 미세먼지 | `airQualityApiClient.getByLocation` | 홈 | 위치 기반, 날씨와 함께 갱신 |
| 5 | 출퇴근 통계 (7일) | `commuteApi.getStats` | 홈 | 자주 변하지 않는 데이터, 캐싱 효과 높음 |

**이번 범위에서 제외 (Won't have this cycle):**
- mutation (createAlert, deleteAlert, toggleAlert 등) -> 다음 사이클
- 교통 도착시간 (subway/bus arrival) -> F-3에서 refetchInterval과 함께 전환
- 대시보드 전용 API (getHistory, getUserAnalytics, compareRoutes) -> 단일 페이지 사용, 캐싱 이점 적음
- 행동 분석 API (getOptimalDeparture, getPatterns) -> 종속성이 복잡

---

## 2. 기술 설계

### 2.1 QueryClientProvider 설정

```typescript
// 파일: frontend/src/infrastructure/query/query-client.ts (신규 생성)

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5분 — 대부분의 데이터에 적합
      gcTime: 30 * 60 * 1000,           // 30분 — 가비지 컬렉션 (구 cacheTime)
      retry: 1,                          // 1회 재시도 (기존 api-client의 2회 retry와 중복 방지)
      refetchOnWindowFocus: true,        // 탭 복귀 시 stale 데이터 자동 갱신
      refetchOnReconnect: true,          // 네트워크 복구 시 갱신
      refetchOnMount: true,              // 마운트 시 stale이면 갱신
    },
  },
});
```

**설정 근거:**
- `staleTime: 5분`: 출퇴근 준비 시간(약 30분) 동안 페이지 이동이 빈번. 5분 이내 재방문은 캐시 제공.
- `gcTime: 30분`: 통근 시간 전체를 커버. 앱을 백그라운드에 뒀다 돌아와도 캐시 유지.
- `retry: 1`: 기존 `ApiClient.withRetry`가 네트워크 에러에 대해 이미 2회 재시도하므로, react-query 레벨에서는 1회만.
- `refetchOnWindowFocus: true`: 이 앱은 아침 출근 시 알림톡 → 앱 전환이 빈번. 탭 복귀 시 최신 데이터 자동 반영.

### 2.2 전환 대상 API 상세 설계

#### Query Key 구조

```typescript
// 파일: frontend/src/infrastructure/query/query-keys.ts (신규 생성)

export const queryKeys = {
  alerts: {
    all: ['alerts'] as const,
    byUser: (userId: string) => ['alerts', 'user', userId] as const,
  },
  routes: {
    all: ['routes'] as const,
    byUser: (userId: string) => ['routes', 'user', userId] as const,
  },
  weather: {
    all: ['weather'] as const,
    current: (lat: number, lng: number) => ['weather', 'current', lat, lng] as const,
  },
  airQuality: {
    all: ['airQuality'] as const,
    byLocation: (lat: number, lng: number) => ['airQuality', lat, lng] as const,
  },
  commuteStats: {
    all: ['commuteStats'] as const,
    byUser: (userId: string, days: number) => ['commuteStats', userId, days] as const,
  },
} as const;
```

#### API별 커스텀 훅 설계

```typescript
// 파일: frontend/src/infrastructure/query/use-alerts-query.ts (신규 생성)

import { useQuery } from '@tanstack/react-query';
import { alertApiClient } from '@infrastructure/api';
import type { Alert } from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useAlertsQuery(userId: string) {
  return useQuery<Alert[]>({
    queryKey: queryKeys.alerts.byUser(userId),
    queryFn: () => alertApiClient.getAlertsByUser(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,  // 2분 — 알림은 자주 변경될 수 있음
  });
}
```

| # | 훅 이름 | queryKey | staleTime | 특수 설정 |
|---|---------|----------|-----------|-----------|
| 1 | `useAlertsQuery(userId)` | `['alerts', 'user', userId]` | 2분 | `enabled: !!userId` |
| 2 | `useRoutesQuery(userId)` | `['routes', 'user', userId]` | 10분 | `enabled: !!userId` (경로는 자주 안 변함) |
| 3 | `useWeatherQuery(lat, lng)` | `['weather', 'current', lat, lng]` | 10분 | `enabled: lat !== 0 && lng !== 0` |
| 4 | `useAirQualityQuery(lat, lng)` | `['airQuality', lat, lng]` | 10분 | `enabled: lat !== 0 && lng !== 0` |
| 5 | `useCommuteStatsQuery(userId, days)` | `['commuteStats', userId, days]` | 15분 | `enabled: !!userId` (통계는 느리게 변함) |

### 2.3 기존 커스텀 훅과의 통합 전략: **점진적 내부 리팩토링**

기존 커스텀 훅(`useHomeData`, `useSettings`, `useAlertCrud`)의 **인터페이스(반환 타입)는 변경하지 않는다**. 내부 구현만 `useState` + `useEffect` → `useQuery` 호출로 교체한다. 이렇게 하면 이 훅을 사용하는 모든 컴포넌트는 수정 없이 동작한다.

**전환 전 (현재 `use-home-data.ts` 코어 데이터 로딩):**
```typescript
// use-home-data.ts 82-110행
useEffect(() => {
  let isMounted = true;
  if (!userId) { setIsLoading(false); return; }
  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [alertsData, routesData, statsData] = await Promise.all([
        alertApiClient.getAlertsByUser(userId).catch(() => []),
        commuteApi.getUserRoutes(userId).catch(() => []),
        commuteApi.getStats(userId, 7).catch(() => null),
      ]);
      if (!isMounted) return;
      setAlerts(alertsData);
      setRoutes(routesData);
      setCommuteStats(statsData);
    } catch {
      if (isMounted) setLoadError('...');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };
  loadData();
  return () => { isMounted = false; };
}, [userId]);
```

**전환 후:**
```typescript
// use-home-data.ts — useQuery로 교체
const alertsQuery = useAlertsQuery(userId);
const routesQuery = useRoutesQuery(userId);
const statsQuery = useCommuteStatsQuery(userId, 7);

// 기존 인터페이스 유지를 위한 파생 값
const alerts = alertsQuery.data ?? [];
const routes = routesQuery.data ?? [];
const commuteStats = statsQuery.data ?? null;
const isLoading = alertsQuery.isLoading || routesQuery.isLoading || statsQuery.isLoading;
const loadError = [alertsQuery.error, routesQuery.error, statsQuery.error]
  .filter(Boolean)
  .map(() => '데이터를 불러올 수 없습니다.')
  .at(0) ?? '';
```

**통합 원칙:**
1. `UseHomeDataReturn` 인터페이스는 **그대로 유지** (53행 참조)
2. `useState` + `useEffect` 데이터 페칭 코드를 `useQuery` 호출로 교체
3. `useMemo`로 계산되는 파생 데이터(`activeRoute`, `nextAlert`, `checklistItems` 등)는 변경 없음
4. `useCallback` 이벤트 핸들러(`handleStartCommute`, `handleChecklistToggle` 등)는 변경 없음

### 2.4 에러 처리 패턴

**현재 패턴:** 각 훅에서 `try-catch` + `setError` 수동 관리

**전환 후 패턴:** `useQuery`의 `error` 상태를 활용하되, 사용자 메시지 변환은 유틸리티 함수로 통일

```typescript
// 파일: frontend/src/infrastructure/query/error-utils.ts (신규 생성)

export function getQueryErrorMessage(error: unknown, fallback: string): string {
  if (!error) return '';
  if (error instanceof Error) {
    if (error.message.includes('401')) return '로그인이 필요합니다.';
    if (error.message.includes('403')) return '권한이 없습니다.';
    if (error.message.includes('Network')) return '네트워크 오류가 발생했습니다.';
  }
  return fallback;
}
```

**기존 동작 유지:** 현재 `use-home-data.ts`에서 개별 API 실패가 전체 로딩을 막지 않는 패턴(`.catch(() => [])`)을 유지한다. react-query에서는 이를 `useQuery`의 개별 에러 상태로 처리한다:

```typescript
// 날씨 로딩 실패가 알림 목록 표시를 막지 않음
const weatherError = weatherQuery.error
  ? '날씨 정보를 불러올 수 없습니다'
  : '';
```

### 2.5 로딩 상태 통합

**현재:** 단일 `isLoading` boolean으로 전체 페이지 스켈레톤 표시/숨김 제어

**전환 후:** 개별 쿼리의 `isLoading`을 조합하여 동일한 단일 `isLoading` 제공

```typescript
// 핵심 데이터(알림, 경로, 통계)가 모두 로드되어야 스켈레톤 해제
const isLoading = alertsQuery.isLoading || routesQuery.isLoading || statsQuery.isLoading;

// 보조 데이터(날씨, 미세먼지)는 독립적으로 로딩 상태 표시
// → WeatherHeroSection 내부에서 자체 skeleton 표시
```

이 방식은 현재 `HomePage.tsx`의 렌더링 로직(`data.isLoading` 체크 후 스켈레톤 표시)과 **완전히 호환**된다.

---

## 3. 구현 단계 (Baby Steps)

### Step 1: 패키지 설치 + QueryClientProvider 래핑 (S)

**작업 내용:**
1. `@tanstack/react-query` 패키지 설치
2. `frontend/src/infrastructure/query/query-client.ts` 생성 (QueryClient 인스턴스)
3. `frontend/src/infrastructure/query/query-keys.ts` 생성 (query key factory)
4. `frontend/src/infrastructure/query/error-utils.ts` 생성 (에러 메시지 유틸)
5. `frontend/src/infrastructure/query/index.ts` 생성 (barrel export)
6. `frontend/src/main.tsx`에 `QueryClientProvider` 래핑

**변경 파일:**
- `frontend/package.json` (의존성 추가)
- `frontend/src/main.tsx` (Provider 추가)
- `frontend/src/infrastructure/query/*` (4개 신규 파일)

**완료 기준:** 앱이 기존과 동일하게 동작. 콘솔에 react-query devtools 관련 경고 없음.

**Dependencies:** 없음

---

### Step 2: 가장 단순한 API 1개 전환 — 알림 목록 (M)

**선정 이유:** `alertApiClient.getAlertsByUser`는 파라미터가 `userId` 하나이고, 3개 페이지에서 동일하게 호출되어 캐싱 효과가 가장 크다.

**작업 내용:**
1. `frontend/src/infrastructure/query/use-alerts-query.ts` 생성
2. `frontend/src/presentation/pages/home/use-home-data.ts`에서 alerts 관련 `useState` + `useEffect` → `useAlertsQuery` 교체
3. `UseHomeDataReturn.alerts` 반환 타입 유지 확인
4. 기존 테스트 실행하여 회귀 없음 확인

**변경 파일:**
- `frontend/src/infrastructure/query/use-alerts-query.ts` (신규)
- `frontend/src/presentation/pages/home/use-home-data.ts` (수정)

**완료 기준:**
- 홈 페이지에서 알림 목록이 정상 표시
- 홈 → 설정 → 홈 이동 시 알림 목록이 **캐시에서 즉시** 표시되고, 백그라운드에서 갱신
- `npm run test` 전체 통과

**Dependencies:** Step 1

---

### Step 3: 나머지 4개 API 순차 전환 (L)

**작업 순서 (각각 독립적이므로 순서 변경 가능):**

**3a. 경로 목록 (`useRoutesQuery`)**
- `frontend/src/infrastructure/query/use-routes-query.ts` 생성
- `use-home-data.ts`에서 routes 관련 `useState` + `useEffect` → `useRoutesQuery` 교체

**3b. 현재 날씨 (`useWeatherQuery`)**
- `frontend/src/infrastructure/query/use-weather-query.ts` 생성
- `use-home-data.ts`에서 weather 관련 `useState` + `useEffect` (116-132행) → `useWeatherQuery` 교체
- `enabled` 조건: `!!userId && !userLocation.isLoading`

**3c. 미세먼지 (`useAirQualityQuery`)**
- `frontend/src/infrastructure/query/use-air-quality-query.ts` 생성
- `use-home-data.ts`에서 airQuality 관련 코드 → `useAirQualityQuery` 교체
- 날씨와 동일한 `enabled` 조건

**3d. 출퇴근 통계 (`useCommuteStatsQuery`)**
- `frontend/src/infrastructure/query/use-commute-stats-query.ts` 생성
- `use-home-data.ts`에서 commuteStats 관련 코드 → `useCommuteStatsQuery` 교체

**변경 파일:**
- `frontend/src/infrastructure/query/use-routes-query.ts` (신규)
- `frontend/src/infrastructure/query/use-weather-query.ts` (신규)
- `frontend/src/infrastructure/query/use-air-quality-query.ts` (신규)
- `frontend/src/infrastructure/query/use-commute-stats-query.ts` (신규)
- `frontend/src/presentation/pages/home/use-home-data.ts` (수정)

**완료 기준:**
- 홈 페이지의 모든 섹션(날씨, 미세먼지, 알림, 경로, 통계)이 정상 표시
- 5개 API 모두 탭 전환 시 캐시 동작 확인
- `npm run test` 전체 통과

**Dependencies:** Step 2

---

### Step 4: `useHomeData` 리팩토링 — 불필요한 useState 제거 (M)

**작업 내용:**

Step 2-3에서 5개 쿼리를 `useHomeData` 내부에 적용했다. 이 단계에서는 더 이상 필요 없는 `useState` 선언을 정리한다.

**제거 대상 useState (12개 중 5개 제거):**

| # | 현재 useState | 전환 후 |
|---|--------------|---------|
| 1 | `const [alerts, setAlerts] = useState<Alert[]>([])` | `alertsQuery.data ?? []` |
| 2 | `const [routes, setRoutes] = useState<RouteResponse[]>([])` | `routesQuery.data ?? []` |
| 3 | `const [commuteStats, setCommuteStats] = useState(null)` | `statsQuery.data ?? null` |
| 4 | `const [weather, setWeather] = useState(null)` | `weatherQuery.data ?? null` |
| 5 | `const [airQualityData, setAirQualityData] = useState(null)` | `airQualityQuery.data ?? null` |

**유지하는 useState (7개):**
- `isCommuteStarting` — 로컬 UI 상태 (mutation 상태)
- `forceRouteType` — 로컬 UI 상태
- `departurePrediction` — 종속 데이터 (이번 사이클 전환 대상 아님)
- `routeRecommendation` — 종속 데이터 (이번 사이클 전환 대상 아님)
- `routeRecDismissed` — 로컬 세션 상태
- `checkedItems` — 로컬 스토리지 연동 상태
- `transitInfos` — F-3에서 별도 전환 예정

**제거 대상 useEffect (7개 중 2개 제거):**
- 코어 데이터 로딩 useEffect (82-110행) → `useQuery` 3개로 교체
- 날씨/미세먼지 로딩 useEffect (116-132행) → `useQuery` 2개로 교체

**변경 파일:**
- `frontend/src/presentation/pages/home/use-home-data.ts` (정리)

**완료 기준:**
- `use-home-data.ts`의 line count가 현재 317행에서 약 250행 이하로 감소
- `UseHomeDataReturn` 인터페이스 변경 없음
- 모든 기존 테스트 통과
- 홈 페이지 동작 이전과 동일

**Dependencies:** Step 3

---

### Step 5: `useSettings`, `useAlertCrud` 내부 전환 + 테스트 mock 업데이트 (M)

**작업 내용:**

`useAlertsQuery`, `useRoutesQuery`를 설정 페이지와 알림 설정 페이지에서도 재사용한다.

**5a. `use-settings.ts` 수정:**
- alerts/routes 로딩 useEffect (91-120행) → `useAlertsQuery` + `useRoutesQuery` 교체
- `isLoading` 상태를 쿼리 상태에서 파생

**5b. `use-alert-crud.ts` 수정:**
- alerts 로딩 useEffect (59-89행) → `useAlertsQuery` 교체
- routes 로딩 useEffect (92-103행) → `useRoutesQuery` 교체
- `reloadAlerts` 함수를 `queryClient.invalidateQueries(queryKeys.alerts.byUser(userId))`로 교체

**5c. 테스트 mock 업데이트:**
- `frontend/src/__mocks__/infrastructure/api/index.ts`는 변경 불필요 (API 클라이언트 mock은 그대로)
- `vitest.config.ts`에 `@infrastructure/query` 경로 alias 추가 (필요한 경우)
- 또는 테스트 파일에서 `QueryClientProvider` wrapper 추가

**변경 파일:**
- `frontend/src/presentation/pages/settings/use-settings.ts` (수정)
- `frontend/src/presentation/pages/alert-settings/use-alert-crud.ts` (수정)
- `frontend/vitest.config.ts` (alias 추가 가능)
- `frontend/src/infrastructure/query/index.ts` (export 업데이트)

**완료 기준:**
- 설정 페이지에서 알림/경로 목록 정상 표시
- 알림 설정 페이지에서 CRUD 후 데이터 갱신 정상 동작
- **핵심:** 알림 생성 → 홈 이동 → 홈의 알림 목록에 새 알림 반영 확인
- `npm run test` + `npm run lint` + `npm run type-check` 전체 통과

**Dependencies:** Step 4

---

## 4. 전환 대상 상세

### 4.1 사용자 알림 목록 (`alertApiClient.getAlertsByUser`)

**현재 코드 위치:**
- API 클라이언트: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/infrastructure/api/alert-api.client.ts` (34행, `getAlertsByUser`)
- 홈 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/home/use-home-data.ts` (93행)
- 알림 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/alert-settings/use-alert-crud.ts` (71행)
- 설정 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/settings/use-settings.ts` (104행)

**현재 호출 패턴:** 3개 페이지에서 각각 독립적으로 `useState` + `useEffect`로 호출

**react-query 전환 설정:**
```typescript
{
  queryKey: ['alerts', 'user', userId],
  queryFn: () => alertApiClient.getAlertsByUser(userId),
  enabled: !!userId,
  staleTime: 2 * 60 * 1000,       // 2분 — 알림 생성/삭제가 빈번할 수 있음
  refetchOnWindowFocus: true,       // 탭 복귀 시 최신 알림 반영
}
```

---

### 4.2 사용자 경로 목록 (`commuteApi.getUserRoutes`)

**현재 코드 위치:**
- API 클라이언트: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/infrastructure/api/commute-api.client.ts` (308행, `getUserRoutes`)
- 홈 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/home/use-home-data.ts` (94행)
- 알림 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/alert-settings/use-alert-crud.ts` (96행)
- 설정 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/settings/use-settings.ts` (105행)

**현재 호출 패턴:** 3개 페이지에서 각각 독립적으로 호출. 홈에서는 `Promise.all` 내부에서 호출.

**react-query 전환 설정:**
```typescript
{
  queryKey: ['routes', 'user', userId],
  queryFn: () => getCommuteApiClient().getUserRoutes(userId),
  enabled: !!userId,
  staleTime: 10 * 60 * 1000,      // 10분 — 경로는 자주 변경되지 않음
  refetchOnWindowFocus: false,      // 경로 변경은 드물어 포커스 갱신 불필요
}
```

---

### 4.3 현재 날씨 (`weatherApiClient.getCurrentWeather`)

**현재 코드 위치:**
- API 클라이언트: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/infrastructure/api/weather-api.client.ts` (34행, `getCurrentWeather`)
- 홈 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/home/use-home-data.ts` (123행)

**현재 호출 패턴:** `useUserLocation` 훅의 위도/경도가 결정된 후에만 호출. `userLocation.isLoading`이 의존성.

**react-query 전환 설정:**
```typescript
{
  queryKey: ['weather', 'current', lat, lng],
  queryFn: () => weatherApiClient.getCurrentWeather(lat, lng),
  enabled: !!userId && !userLocation.isLoading,
  staleTime: 10 * 60 * 1000,      // 10분 — 날씨는 분 단위로 급변하지 않음
  refetchOnWindowFocus: true,       // 탭 복귀 시 최신 날씨 반영
  // F-3에서 refetchInterval: 30 * 1000 추가 예정
}
```

---

### 4.4 미세먼지 (`airQualityApiClient.getByLocation`)

**현재 코드 위치:**
- API 클라이언트: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/infrastructure/api/air-quality-api.client.ts` (14행, `getByLocation`)
- 홈 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/home/use-home-data.ts` (127행)

**현재 호출 패턴:** 날씨와 동일한 조건에서 병렬 호출.

**react-query 전환 설정:**
```typescript
{
  queryKey: ['airQuality', lat, lng],
  queryFn: () => airQualityApiClient.getByLocation(lat, lng),
  enabled: !!userId && !userLocation.isLoading,
  staleTime: 10 * 60 * 1000,      // 10분 — 미세먼지는 시간 단위 변동
  refetchOnWindowFocus: true,
}
```

---

### 4.5 출퇴근 통계 (`commuteApi.getStats`)

**현재 코드 위치:**
- API 클라이언트: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/infrastructure/api/commute-api.client.ts` (363행, `getStats`)
- 홈 훅: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/presentation/pages/home/use-home-data.ts` (95행)

**현재 호출 패턴:** 홈에서 `Promise.all` 내부에서 7일 통계를 호출. 대시보드에서는 30일 통계를 별도 호출.

**react-query 전환 설정:**
```typescript
{
  queryKey: ['commuteStats', userId, 7],  // days 파라미터를 key에 포함
  queryFn: () => getCommuteApiClient().getStats(userId, 7),
  enabled: !!userId,
  staleTime: 15 * 60 * 1000,      // 15분 — 통계는 트래킹 완료 후에만 변함
  refetchOnWindowFocus: false,      // 통계는 포커스 갱신 불필요
}
```

---

## 5. 테스트 전략

### 5.1 기존 테스트 회귀 방지

**핵심 원칙:** 기존 214개 프론트엔드 테스트는 **모두 통과**해야 한다.

**현재 테스트 mock 구조:**
- `frontend/vitest.config.ts`에서 `@infrastructure/api` → `__mocks__/infrastructure/api/index.ts`로 alias
- 따라서 `useAlertsQuery` 등이 내부에서 `alertApiClient.getAlertsByUser`를 호출하면, 기존 mock이 자동 적용됨

**테스트에서 QueryClientProvider 필요:**
react-query 훅을 사용하는 컴포넌트를 테스트하려면, 테스트 렌더링 시 `QueryClientProvider`로 감싸야 한다.

```typescript
// 파일: frontend/src/test-utils.tsx (신규 생성)

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,           // 테스트에서는 재시도 비활성화
        gcTime: Infinity,       // 테스트 중 GC 방지
      },
    },
  });
}

export function TestProviders({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}
```

**기존 `HomePage.test.tsx` 수정 예시:**
```typescript
// 전환 전
render(
  <MemoryRouter>
    <HomePage />
  </MemoryRouter>
);

// 전환 후
render(
  <TestProviders>
    <HomePage />
  </TestProviders>
);
```

### 5.2 react-query Mocking 패턴

**방법 A: API 클라이언트 mock 유지 (권장)**

현재 `vitest.config.ts`의 alias로 API 클라이언트가 이미 mock 되어 있으므로, react-query 훅이 내부에서 mock된 API 클라이언트를 호출한다. **추가 mocking 불필요**.

```typescript
// 기존 mock이 그대로 동작
alertApiClient.getAlertsByUser.mockResolvedValue([
  { id: '1', name: '테스트 알림', enabled: true, ... }
]);
```

**방법 B: 쿼리 훅 자체를 mock (특정 테스트에서만)**

복잡한 로딩/에러 상태를 테스트할 때만 사용:

```typescript
vi.mock('@infrastructure/query', () => ({
  useAlertsQuery: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  }),
}));
```

### 5.3 새로 추가할 테스트 케이스

**5.3.1 Query Key Factory 테스트**
- 파일: `frontend/src/infrastructure/query/query-keys.test.ts`
- `queryKeys.alerts.byUser('user-1')`이 `['alerts', 'user', 'user-1']`을 반환하는지 확인
- 모든 key factory의 반환 타입이 `readonly` 배열인지 확인

**5.3.2 에러 유틸리티 테스트**
- 파일: `frontend/src/infrastructure/query/error-utils.test.ts`
- 401 에러 → '로그인이 필요합니다.' 반환
- 403 에러 → '권한이 없습니다.' 반환
- Network 에러 → '네트워크 오류가 발생했습니다.' 반환
- null/undefined → 빈 문자열 반환

**5.3.3 캐싱 동작 통합 테스트**
- 파일: `frontend/src/infrastructure/query/caching.test.ts`
- 동일한 queryKey로 두 번 호출 시, API가 1회만 호출되는지 확인
- `staleTime` 이내 재마운트 시 API 미호출 확인
- `queryClient.invalidateQueries` 호출 후 API 재호출 확인

**5.3.4 개별 쿼리 훅 테스트 (5개)**
- `useAlertsQuery`: userId 없을 때 `enabled: false` → API 미호출
- `useRoutesQuery`: userId 있을 때 정상 데이터 반환
- `useWeatherQuery`: 위치 로딩 중일 때 `enabled: false` → API 미호출
- `useAirQualityQuery`: 정상 데이터 반환 + 에러 상태 처리
- `useCommuteStatsQuery`: days 파라미터에 따른 queryKey 분리 확인

---

## 6. 수락 기준 (Acceptance Criteria)

### Must Have (이것 없이는 완성 아님)

- [ ] **AC-1:** `@tanstack/react-query` 패키지가 `frontend/package.json`의 `dependencies`에 추가됨
- [ ] **AC-2:** `QueryClientProvider`가 `frontend/src/main.tsx`에서 앱 루트를 감싸고 있음
- [ ] **AC-3:** 5개 query key factory가 `frontend/src/infrastructure/query/query-keys.ts`에 정의됨
- [ ] **AC-4:** 5개 커스텀 쿼리 훅(`useAlertsQuery`, `useRoutesQuery`, `useWeatherQuery`, `useAirQualityQuery`, `useCommuteStatsQuery`)이 생성됨
- [ ] **AC-5:** `use-home-data.ts`에서 5개 API가 `useQuery`로 전환됨 (기존 `useState` + `useEffect` 제거)
- [ ] **AC-6:** `use-settings.ts`에서 alerts/routes 로딩이 `useAlertsQuery` + `useRoutesQuery`로 전환됨
- [ ] **AC-7:** `use-alert-crud.ts`에서 alerts 로딩이 `useAlertsQuery`로 전환되고, `reloadAlerts`가 `queryClient.invalidateQueries`로 교체됨
- [ ] **AC-8:** `UseHomeDataReturn` 인터페이스가 **변경되지 않음** (기존 컴포넌트 수정 불필요)
- [ ] **AC-9:** `npm run test` — 기존 모든 프론트엔드 테스트 통과
- [ ] **AC-10:** `npm run lint` + `npm run type-check` + `npm run build` 모두 통과

### Should Have (중요하지만 Must 없이도 기능 동작)

- [ ] **AC-11:** 탭 전환 시 자동 데이터 갱신 동작 확인 — 홈 → 설정 → 홈 이동 시 날씨/알림이 stale이면 백그라운드 갱신
- [ ] **AC-12:** 알림 생성 후 홈 이동 시 홈의 알림 목록에 새 알림이 반영됨 (`invalidateQueries` 동작)
- [ ] **AC-13:** `use-home-data.ts`의 코드가 현재 317행에서 270행 이하로 감소
- [ ] **AC-14:** 테스트 헬퍼 `TestProviders`가 생성되어 다른 테스트에서 재사용 가능

### Could Have (시간 허용 시)

- [ ] **AC-15:** React Query DevTools가 개발 모드에서만 표시됨 (`@tanstack/react-query-devtools`)
- [ ] **AC-16:** 새 테스트 10개 이상 추가 (query key, error utils, 캐싱 동작, 개별 훅)

### Won't Have (이번 사이클)

- Mutation 전환 (createAlert, deleteAlert, toggleAlert 등)
- 교통 도착시간 API 전환 (F-3에서 `refetchInterval`과 함께)
- 대시보드 전용 API 전환
- 행동 분석 API 전환
- 낙관적 업데이트 (optimistic update) 패턴

---

## 7. Scope (MoSCoW 요약)

| 분류 | 항목 |
|------|------|
| **Must** | 패키지 설치, Provider 설정, 5개 쿼리 훅 생성, `useHomeData`/`useSettings`/`useAlertCrud` 내부 전환, 기존 테스트 통과 |
| **Should** | 탭 전환 시 캐시 동작, invalidateQueries 교차 페이지 동기화, 코드량 감소, 테스트 헬퍼 |
| **Could** | DevTools 설치, 새 테스트 추가 |
| **Won't** | Mutation 전환, 교통 API 전환, 대시보드 API 전환, 낙관적 업데이트 |

---

## 8. Task Breakdown (개발자 작업 분해)

| # | Task | 규모 | 의존성 | 예상 시간 |
|---|------|:----:|--------|----------|
| 1 | `npm install @tanstack/react-query` + `query-client.ts` + `query-keys.ts` + `error-utils.ts` + `index.ts` 생성 | S | 없음 | 15분 |
| 2 | `main.tsx`에 `QueryClientProvider` 래핑 | S | 1 | 5분 |
| 3 | `use-alerts-query.ts` 생성 + `use-home-data.ts`에서 alerts 전환 | M | 2 | 20분 |
| 4 | `use-routes-query.ts` 생성 + `use-home-data.ts`에서 routes 전환 | M | 2 | 15분 |
| 5 | `use-weather-query.ts` 생성 + `use-home-data.ts`에서 weather 전환 | M | 2 | 15분 |
| 6 | `use-air-quality-query.ts` 생성 + `use-home-data.ts`에서 airQuality 전환 | M | 2 | 10분 |
| 7 | `use-commute-stats-query.ts` 생성 + `use-home-data.ts`에서 stats 전환 | M | 2 | 10분 |
| 8 | `use-home-data.ts` 정리 — 불필요한 useState/useEffect 제거 | M | 3-7 | 20분 |
| 9 | `use-settings.ts` 내부 전환 | M | 3, 4 | 15분 |
| 10 | `use-alert-crud.ts` 내부 전환 + `invalidateQueries` 적용 | M | 3, 4 | 20분 |
| 11 | `test-utils.tsx` 생성 + 기존 테스트 `TestProviders` 적용 | M | 2 | 20분 |
| 12 | 새 테스트 작성 (query keys, error utils, 캐싱) | M | 3-7 | 30분 |
| 13 | `npm run lint` + `npm run type-check` + `npm run build` 전체 통과 확인 | S | 8-10 | 10분 |

**총 예상 시간: 약 3.5시간 (1.5 사이클)**

---

## 9. Open Questions

1. **DevTools 포함 여부:** `@tanstack/react-query-devtools`를 devDependencies로 설치하여 개발 편의를 높일 것인가? 번들 사이즈에 영향 없음 (dev 전용 lazy import). -> Could have로 분류.
2. **대시보드 페이지(`useCommuteDashboard`)의 `getStats(userId, 30)`:** 홈의 `getStats(userId, 7)`과 queryKey의 `days` 파라미터가 다르므로 별도 캐시로 동작한다. 향후 대시보드도 전환할 때 이 설계가 적절한지 확인 필요.
3. **`reloadAlerts` → `invalidateQueries` 전환 시점:** `useAlertCrud`의 delete/toggle/update 후 `reloadAlerts()`를 호출하는데, 이를 `invalidateQueries`로 바꾸면 mutation이 아직 전환되지 않은 상태에서도 동작하는지 확인 필요. -> Step 5에서 확인 후 결정.

---

## 10. Out of Scope

| 항목 | 제외 이유 |
|------|-----------|
| Mutation 전환 (`useMutation`) | 이번 사이클은 READ 쿼리만. Mutation은 CRUD 플로우에 영향이 크므로 별도 사이클 |
| 교통 도착시간 API 전환 | F-3(실시간 교통 갱신)과 함께 `refetchInterval` 적용 예정 |
| Suspense 모드 | React 18의 Suspense + react-query 통합은 실험적. 안정적인 `isLoading` 패턴 유지 |
| SSR/prefetch | 이 프로젝트는 SPA(Vite). SSR은 해당 없음 |
| 전역 에러 핸들러 (`queryClient.setDefaultOptions.onError`) | 기존 `ApiClient.handleAuthError`가 401 처리를 담당. 중복 방지 위해 제외 |

---

*F-7 스펙 작성 완료: 2026-02-17*
*다음 단계: 개발자 할당 → Step 1부터 순차 구현*
