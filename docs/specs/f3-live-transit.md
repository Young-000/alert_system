# F-3: 실시간 교통 자동 갱신 (Live Transit Refresh)

> Status: READY
> Priority: RICE 200 (1st)
> Effort: 1 cycle
> Depends on: F-7 (@tanstack/react-query) — DONE

---

## Problem

현재 교통 도착시간은 페이지 마운트 시 1회만 로드됨.
1분만 지나도 정보가 낡아지며, 사용자가 수동으로 페이지를 떠났다 돌아와야 갱신됨.
이는 **앱을 열고 있을 동기가 부족한** 핵심 문제의 일부.

## Solution

홈 화면 교통 정보를 30초 간격 자동 갱신하고, "n초 전 업데이트" 타임스탬프 및 도착 임박 강조를 추가한다.

---

## Acceptance Criteria

### AC-1: useTransitQuery 훅 생성
- `useTransitQuery(activeRoute)` 커스텀 훅 생성
- `@tanstack/react-query`의 `useQuery` 사용
- `queryKey`: `['transit', routeId]`
- `queryFn`: 기존 `loadTransitArrivals` 로직을 순수 함수로 추출
- `staleTime`: 15초 (교통 데이터 특성상 짧게)
- `refetchInterval`: 30000 (30초)
- `refetchIntervalInBackground`: false (탭 비활성 시 갱신 중지)
- `enabled`: `!!activeRoute`

### AC-2: use-home-data.ts 정리
- 기존 `loadTransitArrivals` useCallback 제거
- 기존 `transitInfos` useState 제거
- 기존 transit loading useEffect 제거
- `useTransitQuery` 훅에서 데이터 가져오기
- `UseHomeDataReturn` 인터페이스에 `lastTransitUpdate` 필드 추가 (Date | null)

### AC-3: "n초 전 업데이트" 타임스탬프 표시
- CommuteSection에 마지막 갱신 시간 표시
- 형식: "방금 전", "30초 전", "1분 전", "2분 전" 등
- 1초 간격으로 텍스트 업데이트 (useInterval 또는 requestAnimationFrame은 과잉 — 10초 간격으로 충분)
- 데이터 로딩 중에는 "갱신 중..." 표시

### AC-4: 도착 임박 강조 (2분 이내)
- `arrivalTime <= 2`인 항목에 `arriving-soon` CSS 클래스 추가
- 시각적 강조: 텍스트 색상 변경 + 약한 펄스 애니메이션
- "곧 도착" 텍스트는 유지 (arrivalTime === 0일 때)
- 접근성: `aria-live="polite"`로 스크린 리더에 변경 알림

### AC-5: 가시성 기반 갱신 제어
- `document.visibilityState === 'hidden'` 일 때 갱신 중지 (refetchIntervalInBackground: false)
- 탭 복귀 시 즉시 1회 갱신 (refetchOnWindowFocus: true)
- 스크롤해서 교통 섹션이 뷰포트 밖이어도 갱신은 유지 (단순히 탭 가시성만 체크)

### AC-6: 에러 상태 처리
- 갱신 실패 시 마지막 성공 데이터 유지 (stale-while-revalidate)
- 3회 연속 실패 시 "교통 정보를 갱신할 수 없습니다" 메시지
- retry: 2 (기본 1회 + 재시도 2회 = 총 3회)

### AC-7: 기존 테스트 유지
- 214개 기존 테스트 모두 통과
- UseHomeDataReturn 인터페이스 변경은 하위 호환 (`lastTransitUpdate` 추가만)

---

## Implementation Steps (Baby Steps)

### Step 1: Transit fetch 함수 추출
- `use-home-data.ts`의 `loadTransitArrivals` 로직을 순수 함수 `fetchTransitArrivals(route): Promise<TransitArrivalInfo[]>`로 추출
- 새 파일: `frontend/src/infrastructure/query/use-transit-query.ts`
- queryKeys에 transit 키 추가

### Step 2: useTransitQuery 훅 생성
- `useQuery` + `refetchInterval(30000)` + `refetchIntervalInBackground(false)`
- `dataUpdatedAt`에서 lastUpdate 타임스탬프 도출

### Step 3: use-home-data.ts 통합
- transitInfos useState/useEffect/useCallback 제거
- useTransitQuery 사용
- lastTransitUpdate를 return 객체에 추가

### Step 4: CommuteSection UI 업데이트
- 타임스탬프 표시 추가
- 도착 임박 강조 CSS + aria-live
- useRelativeTime 유틸 또는 인라인 계산

### Step 5: 테스트 + 품질 게이트
- 기존 214개 테스트 통과 확인
- typecheck, lint, build 확인

---

## Non-Goals (범위 밖)
- 서버 사이드 WebSocket/SSE 실시간 스트림 (프론트 polling으로 충분)
- 교통 데이터 백엔드 캐싱 (향후 고려)
- 다른 페이지(commute dashboard 등)의 교통 갱신 (홈 전용)
- 버스/지하철 외 다른 교통수단 지원

---

## Technical Notes

### 기존 코드 구조

```
use-home-data.ts
├── loadTransitArrivals (useCallback, 64줄)
│   ├── subwayApiClient.getArrival(name) × 최대 2역
│   └── busApiClient.getArrival(id) × 최대 2정류장
├── transitInfos (useState)
└── useEffect: activeRoute 변경 시 loadTransitArrivals 호출
```

### 변환 후 구조

```
use-transit-query.ts (NEW)
├── fetchTransitArrivals(route): Promise<TransitArrivalInfo[]>
└── useTransitQuery(activeRoute): UseQueryResult + lastUpdate

use-home-data.ts (MODIFIED)
├── useTransitQuery(activeRoute)  ← 대체
└── transitInfos = transitQuery.data ?? []
```

### query key 구조

```typescript
queryKeys.transit = {
  all: ['transit'] as const,
  byRoute: (routeId: string) => ['transit', 'route', routeId] as const,
}
```
