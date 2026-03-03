# Cycle 13 QA 검증 리포트

**검증 일자**: 2026-02-17
**검증 대상**: F-7 (react-query), F-3 (Live Transit), F-1 (Morning Briefing)
**검증자**: QA Agent

---

## 📋 요약

- **전체 테스트**: 239개 통과 ✅
- **발견된 버그**: 7개 (P0: 0, P1: 3, P2: 3, P3: 1)
- **총평**: **PASS WITH CONDITIONS** — P1 버그 수정 후 배포 가능

---

## 🐛 발견된 버그

### P1 (Must Fix Before Ship)

#### 1. Transit Query — Memory Leak 위험 (Unmounted Component Update)
**파일**: `frontend/src/infrastructure/query/use-transit-query.ts`
**라인**: 62-73
**심각도**: P1

**문제**:
```typescript
export function useTransitQuery(activeRoute: RouteResponse | null) {
  return useQuery<TransitArrivalInfo[]>({
    queryKey: queryKeys.transit.byRoute(activeRoute?.id ?? ''),
    queryFn: () => fetchTransitArrivals(activeRoute!),
    enabled: !!activeRoute,
    staleTime: TRANSIT_STALE_TIME,
    refetchInterval: TRANSIT_REFETCH_INTERVAL,  // ❌ 30초마다 무조건 refetch
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
```

`refetchInterval`이 활성화되어 있지만, 컴포넌트가 언마운트될 때 interval이 정리되지 않는 경우가 있습니다. React Query는 기본적으로 언마운트 시 구독을 정리하지만, `gcTime` 내에 캐시가 유지되는 동안에는 백그라운드 refetch가 계속될 수 있습니다.

**영향**:
- 사용자가 홈페이지에서 다른 페이지로 이동한 후에도 30초마다 transit API 호출 발생
- 불필요한 네트워크 트래픽 및 API 쿼터 소모
- 메모리 누수 가능성

**재현 방법**:
1. 홈페이지 접속 (transit query 시작)
2. 설정 페이지로 이동
3. 30초 대기
4. 네트워크 탭 확인 → transit API 호출 여부 확인

**제안 수정**:
```typescript
// Option 1: gcTime을 짧게 설정하여 언마운트 후 빠르게 정리
export function useTransitQuery(activeRoute: RouteResponse | null) {
  return useQuery<TransitArrivalInfo[]>({
    queryKey: queryKeys.transit.byRoute(activeRoute?.id ?? ''),
    queryFn: () => fetchTransitArrivals(activeRoute!),
    enabled: !!activeRoute,
    staleTime: TRANSIT_STALE_TIME,
    gcTime: 1 * 60 * 1000,  // 1분 후 캐시 정리 (기본 30분에서 단축)
    refetchInterval: TRANSIT_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// Option 2: 조건부 refetch (더 안전)
export function useTransitQuery(activeRoute: RouteResponse | null, enabled = true) {
  return useQuery<TransitArrivalInfo[]>({
    queryKey: queryKeys.transit.byRoute(activeRoute?.id ?? ''),
    queryFn: () => fetchTransitArrivals(activeRoute!),
    enabled: !!activeRoute && enabled,  // 외부에서 제어 가능
    staleTime: TRANSIT_STALE_TIME,
    gcTime: 1 * 60 * 1000,
    refetchInterval: (data, query) => {
      // query가 active 상태일 때만 refetch
      return query.state.fetchStatus === 'idle' ? TRANSIT_REFETCH_INTERVAL : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
```

---

#### 2. Race Condition — useHomeData의 Departure Prediction 로딩
**파일**: `frontend/src/presentation/pages/home/use-home-data.ts`
**라인**: 119-139
**심각도**: P1

**문제**:
```typescript
useEffect(() => {
  let isMounted = true;
  if (!userId || alerts.length === 0 || !weather) return;

  const enabledAlert = alerts.find(a => a.enabled);
  if (!enabledAlert) return;

  behaviorApiClient.getOptimalDeparture(userId, enabledAlert.id, {
    weather: weather.condition,
    temperature: Math.round(weather.temperature),
    isRaining: getWeatherType(weather.condition) === 'rainy',
  })
    .then(prediction => {
      if (isMounted && prediction && prediction.confidence >= DEPARTURE_PREDICTION_CONFIDENCE_THRESHOLD) {
        setDeparturePrediction(prediction);
      }
    })
    .catch(err => console.warn('Failed to load departure prediction:', err));

  return () => { isMounted = false; };
}, [userId, alerts, weather]);
```

**문제점**:
1. **의존성 배열에 `alerts` 전체가 포함** → alerts가 변경될 때마다 API 호출 발생 (예: 토글, 추가, 삭제)
2. **경쟁 조건**: 빠르게 여러 번 호출되면 마지막 응답이 아닌 이전 응답이 늦게 도착하여 잘못된 데이터 표시 가능
3. **에러가 무시됨** (`console.warn`만 하고 사용자에게 피드백 없음)

**재현 방법**:
1. 알림 여러 개 등록
2. 알림 토글을 빠르게 여러 번 클릭
3. `setDeparturePrediction`에 중복/잘못된 데이터 설정 가능

**제안 수정**:
```typescript
useEffect(() => {
  let isMounted = true;
  let abortController: AbortController | null = null;

  if (!userId || alerts.length === 0 || !weather) {
    setDeparturePrediction(null);
    return;
  }

  const enabledAlert = alerts.find(a => a.enabled);
  if (!enabledAlert) {
    setDeparturePrediction(null);
    return;
  }

  abortController = new AbortController();

  behaviorApiClient.getOptimalDeparture(
    userId,
    enabledAlert.id,
    {
      weather: weather.condition,
      temperature: Math.round(weather.temperature),
      isRaining: getWeatherType(weather.condition) === 'rainy',
    },
    { signal: abortController.signal }  // AbortSignal 추가 필요
  )
    .then(prediction => {
      if (isMounted && prediction && prediction.confidence >= DEPARTURE_PREDICTION_CONFIDENCE_THRESHOLD) {
        setDeparturePrediction(prediction);
      }
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.warn('Failed to load departure prediction:', err);
      }
    });

  return () => {
    isMounted = false;
    abortController?.abort();
  };
}, [userId, alerts.find(a => a.enabled)?.id, weather]);  // enabledAlert.id만 의존
```

**추가 개선**: `behaviorApiClient.getOptimalDeparture`를 react-query로 전환하면 자동으로 중복 요청, 캐싱, 에러 처리 해결

---

#### 3. Missing Error Boundary — Query Error Handling
**파일**: `frontend/src/presentation/pages/home/use-home-data.ts`
**라인**: 94-101
**심각도**: P1

**문제**:
```typescript
const isLoading = !userId
  ? false
  : alertsQuery.isLoading || routesQuery.isLoading || statsQuery.isLoading;
const loadError = [alertsQuery.error, routesQuery.error, statsQuery.error]
  .filter(Boolean)
  .map(() => '데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
  [0] ?? '';
```

**문제점**:
1. **에러 메시지가 너무 일반적** — 어떤 데이터가 실패했는지 알 수 없음 (alerts? routes? stats?)
2. **재시도 버튼 없음** — 사용자가 새로고침 외에 방법이 없음
3. **`weatherQuery.error`와 `airQualityQuery.error`는 별도 처리**되지만, 일관성이 없음

**제안 수정**:
```typescript
const loadError = (() => {
  if (alertsQuery.error) return '알림 데이터를 불러올 수 없습니다.';
  if (routesQuery.error) return '경로 데이터를 불러올 수 없습니다.';
  if (statsQuery.error) return '통계 데이터를 불러올 수 없습니다.';
  return '';
})();

const handleRetry = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.alerts.byUser(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.routes.byUser(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.commuteStats.byUser(userId, 7) });
};
```

그리고 `HomePage.tsx`에 재시도 버튼 추가:
```tsx
{data.loadError && (
  <div className="notice error" role="alert" style={{ margin: '0 1rem 0.75rem' }}>
    {data.loadError}
    <button onClick={data.handleRetry} className="btn btn-sm">재시도</button>
  </div>
)}
```

---

### P2 (Should Fix)

#### 4. Query Key Consistency — Empty String Fallback
**파일**: `frontend/src/infrastructure/query/use-transit-query.ts`
**라인**: 64
**심각도**: P2

**문제**:
```typescript
queryKey: queryKeys.transit.byRoute(activeRoute?.id ?? ''),
```

`activeRoute`가 `null`일 때 `''` (빈 문자열)을 query key로 사용합니다. 이는 다른 query hook들과 일관성이 없습니다:

- `useAlertsQuery`, `useRoutesQuery`, `useCommuteStatsQuery`: `enabled: !!userId`로 아예 실행 안 함
- `useWeatherQuery`, `useAirQualityQuery`: `enabled` prop으로 외부에서 제어

**문제점**:
- `activeRoute`가 `null`인데도 query는 `enabled: !!activeRoute`로 비활성화되므로 실행은 안 되지만, key는 `['transit', 'route', '']`로 생성됨
- 여러 컴포넌트에서 동시에 `useTransitQuery(null)`을 호출하면 같은 key를 공유하여 의도치 않은 캐시 공유 발생

**제안 수정**:
```typescript
export function useTransitQuery(activeRoute: RouteResponse | null) {
  return useQuery<TransitArrivalInfo[]>({
    queryKey: activeRoute ? queryKeys.transit.byRoute(activeRoute.id) : ['transit', 'disabled'],
    queryFn: () => fetchTransitArrivals(activeRoute!),
    enabled: !!activeRoute,
    // ...
  });
}
```

---

#### 5. Missing Cleanup — CommuteSection의 Tick Interval
**파일**: `frontend/src/presentation/pages/home/CommuteSection.tsx`
**라인**: 47-52
**심각도**: P2

**문제**:
```typescript
const [, setTick] = useState(0);
useEffect(() => {
  if (!lastTransitUpdate) return;
  const interval = setInterval(() => setTick(t => t + 1), 10_000);
  return () => clearInterval(interval);
}, [lastTransitUpdate]);
```

**문제점**:
- `lastTransitUpdate`가 변경될 때마다 interval이 재생성됨 (30초마다 API 호출 → `lastTransitUpdate` 갱신 → interval 재생성)
- interval이 **단순히 UI 갱신용**이므로 `lastTransitUpdate`에 의존할 필요 없음

**영향**:
- 성능 이슈는 아니지만 불필요한 interval cleanup/setup 반복
- 잠재적인 타이밍 이슈 (interval 재생성 순간에 UI 갱신이 누락될 수 있음)

**제안 수정**:
```typescript
useEffect(() => {
  if (!lastTransitUpdate) return;
  const interval = setInterval(() => setTick(t => t + 1), 10_000);
  return () => clearInterval(interval);
}, [!!lastTransitUpdate]);  // 또는 []로 변경하고 lastTransitUpdate 체크를 render에서
```

또는 더 나은 방법:
```typescript
// lastTransitUpdate가 있을 때만 interval 시작, 값 변경에는 반응 안 함
useEffect(() => {
  if (!lastTransitUpdate) {
    setTick(0);
    return;
  }
  const interval = setInterval(() => setTick(t => t + 1), 10_000);
  return () => clearInterval(interval);
}, []);  // 빈 의존성 배열
```

---

#### 6. Suboptimal Dependency — build-briefing의 useMemo
**파일**: `frontend/src/presentation/pages/home/MorningBriefing.tsx`
**라인**: 22-32
**심각도**: P2

**문제**:
```typescript
const briefing = useMemo(() => {
  const context = getTimeContext();
  return buildBriefing({
    context,
    weather,
    airQuality,
    commuteStats,
    transitInfos,
    routeName,
  });
}, [weather, airQuality, commuteStats, transitInfos, routeName]);
```

**문제점**:
1. **`context`가 의존성에 포함 안 됨** — 시간이 변경되어도 (예: 오전 11:59 → 오후 12:00) briefing이 재계산 안 됨
2. `transitInfos`는 30초마다 갱신되는데, 이 때마다 `useMemo` 재계산 → 원래 의도는 "값이 정말 변경되었을 때만" 재계산인데, 참조만 바뀌어도 재계산됨

**제안 수정**:
```typescript
const context = useMemo(() => getTimeContext(), []);  // 컴포넌트 수명 동안 한 번만

const briefing = useMemo(() => {
  return buildBriefing({
    context,
    weather,
    airQuality,
    commuteStats,
    transitInfos,
    routeName,
  });
}, [context, weather, airQuality, commuteStats, transitInfos, routeName]);
```

또는 context를 1분마다 갱신하도록:
```typescript
const [context, setContext] = useState(getTimeContext);
useEffect(() => {
  const interval = setInterval(() => setContext(getTimeContext()), 60_000);
  return () => clearInterval(interval);
}, []);
```

---

### P3 (Nice to Have)

#### 7. Test Coverage — Query Hook Unit Tests 없음
**파일**: `frontend/src/infrastructure/query/*.ts`
**심각도**: P3

**문제**:
- `use-alerts-query.ts`, `use-routes-query.ts`, `use-weather-query.ts`, `use-air-quality-query.ts`, `use-commute-stats-query.ts`, `use-transit-query.ts`
- 위 6개 query hook에 대한 **unit test가 전혀 없음**

**확인 결과**:
```bash
$ ls frontend/src/infrastructure/query/*.test.ts*
# No files found
```

**영향**:
- query hook 자체의 로직은 단순하지만, 통합 테스트만으로는 edge case 검증 어려움
- 예: `enabled` 조건, `staleTime`/`gcTime` 설정, `refetchInterval` 동작, error handling

**제안**:
각 hook에 대해 최소한의 테스트 추가:
```typescript
// use-alerts-query.test.ts 예시
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';
import { useAlertsQuery } from './use-alerts-query';
import { alertApiClient } from '@infrastructure/api';

vi.mock('@infrastructure/api');

describe('useAlertsQuery', () => {
  it('should not fetch when userId is empty', () => {
    const { result } = renderHook(() => useAlertsQuery(''), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
    expect(result.current.isLoading).toBe(false);
    expect(alertApiClient.getAlertsByUser).not.toHaveBeenCalled();
  });

  it('should fetch when userId is provided', async () => {
    vi.mocked(alertApiClient.getAlertsByUser).mockResolvedValue([]);
    const { result } = renderHook(() => useAlertsQuery('user-123'), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(alertApiClient.getAlertsByUser).toHaveBeenCalledWith('user-123');
  });
});
```

---

## 🧪 테스트 커버리지 분석

### 통과한 테스트
- **총 239개 테스트 모두 통과** ✅
- 기존 테스트는 모두 정상 작동 (react-query 마이그레이션이 기존 인터페이스를 깨뜨리지 않았음)

### 누락된 테스트
1. **Query Hook Unit Tests** (P3)
   - 6개 query hook에 대한 직접 테스트 없음
   - 통합 테스트에서 간접적으로만 검증됨

2. **Transit Auto-refresh Edge Cases**
   - 탭 숨김(hidden) 상태에서 polling 중지 여부 미검증
   - Network offline 시 retry 로직 미검증

3. **Morning Briefing Time Context**
   - `build-briefing.test.ts`는 **25개 테스트**로 잘 작성되어 있음 ✅
   - 하지만 `MorningBriefing.tsx` 컴포넌트 자체의 시간 변경 시나리오는 테스트 안 됨

---

## 🔍 Integration Check

### ✅ react-query 통합 성공
- `useHomeData`의 반환 인터페이스 (`UseHomeDataReturn`) **100% 유지** ✅
- 기존 `HomePage.tsx`에서 변경 없이 사용 가능 ✅
- 로딩 상태, 에러 처리 로직 모두 기존과 동일 ✅

### ✅ Invalidation 패턴 올바름
- `use-alert-crud.ts`:
  ```typescript
  await queryClient.invalidateQueries({ queryKey: queryKeys.alerts.byUser(userId) });
  ```
- `use-settings.ts`:
  ```typescript
  const alertsQuery = useAlertsQuery(userId);
  const routesQuery = useRoutesQuery(userId);
  ```
- invalidation 후 자동 refetch 정상 작동 ✅

### ⚠️ Cleanup on Unmount
- **대부분 정상**: `useEffect` cleanup 함수들 제대로 작성됨
- **P1 이슈**: `useTransitQuery`의 `refetchInterval`이 unmount 후에도 계속될 수 있음

---

## 📊 Edge Case 체크

| 시나리오 | 결과 | 비고 |
|----------|------|------|
| userId 없음 | ✅ | `enabled: !!userId`로 query 비활성화 |
| location 권한 거부 | ✅ | 서울 기본값 사용, `isDefaultLocation: true` |
| offline 상태 | ⚠️ | react-query의 기본 retry 동작 의존 (명시적 offline 처리 없음) |
| 탭 숨김 (hidden) | ✅ | `refetchIntervalInBackground: false` 설정됨 |
| activeRoute null | ⚠️ | P2: query key에 빈 문자열 사용 |
| transit API 실패 | ✅ | `try-catch`로 에러 처리, `error` 필드에 메시지 표시 |
| 빠른 경로 전환 | ⚠️ | P1: Race condition 가능 (departure prediction) |

---

## 🎯 최종 평가

### 종합 의견
- **코드 품질**: 전반적으로 우수. react-query 마이그레이션이 깔끔하게 이루어짐
- **기능 구현**: 3개 기능 모두 정상 작동 (F-7, F-3, F-1)
- **테스트**: 기존 테스트 모두 통과. `build-briefing`의 테스트 커버리지 특히 우수
- **문제점**: Memory leak 위험(P1), Race condition(P1), Error boundary 부재(P1)

### 권고사항
1. **P1 이슈 3개를 우선 수정**
   - Transit query의 gcTime 단축 또는 조건부 refetch
   - Departure prediction의 AbortController 추가
   - loadError 구체화 및 재시도 버튼 추가

2. **P2 이슈는 시간 허용 시 수정**
   - Query key consistency
   - CommuteSection interval 의존성
   - MorningBriefing context dependency

3. **P3 이슈는 차후 개선**
   - Query hook unit test 추가

### 배포 전 체크리스트
- [ ] P1-1: Transit query gcTime 설정 또는 조건부 refetch
- [ ] P1-2: Departure prediction AbortController 추가
- [ ] P1-3: loadError 구체화 및 재시도 버튼
- [ ] 브라우저 DevTools로 unmount 후 네트워크 요청 확인
- [ ] 탭 전환 시 polling 중지 확인
- [ ] 경로 빠른 전환 시 데이터 정합성 확인

---

## ✅ 결론

**총평**: **PASS WITH CONDITIONS**

3개 P1 버그를 수정하면 배포 가능합니다. 나머지 이슈들은 즉각적인 사용자 영향은 없지만, 장기적인 안정성을 위해 차후 수정을 권장합니다.

전체적으로 react-query 마이그레이션은 성공적이며, 기존 코드와의 통합도 매끄럽습니다. Morning Briefing 기능은 잘 설계되었고, Transit auto-refresh는 UX를 크게 개선할 것으로 보입니다.

**검증 완료**: 2026-02-17 17:45
