# Performance 점검 리포트 (Round 7)

## 결론: PASS (수정 2건)

---

## Frontend

### 1. Lazy Loading - PASS
`App.tsx`에서 모든 페이지(13개)가 `lazy()` + `Suspense`로 구현되어 있음.
- Idle preload (`useIdlePreload`) — 마운트 3초 후 6개 핵심 페이지 사전 로드
- BottomNavigation에서 `onTouchStart`/`onMouseEnter` 시 `PREFETCH_MAP`으로 hover prefetch
- Vite `manualChunks`로 vendor-react / vendor-router / vendor-query 청크 분리

### 2. useCallback / useMemo 사용 현황 - PASS
총 89개 호출. 주요 파일별 검토:
- `use-home-data.ts`: `useMemo`는 파생 배열/값(alerts, routes, airQuality 등)에 적절히 사용. `useCallback`은 `handleChecklistToggle`, `handleStartCommute`, `retryLoad` 3개.
  - `retryLoad`의 deps `[alertsQuery, routesQuery, statsQuery, weeklyReportQuery]`: TanStack Query 객체는 렌더마다 stable하므로 문제 없음.
- `AlertSettingsPage.tsx`: `useMemo`로 `schedule`, `alertName`, `notificationTimes` 계산. `useCallback`으로 `handleSubmit` 래핑. 적절한 사용.
- `RouteSetupPage.tsx`: `sortedRoutes`, `filteredRoutes`를 `useMemo`로, 이벤트 핸들러를 `useCallback`으로 처리. 적절.
- `BottomNavigation.tsx`: `handlePrefetch`를 `useCallback`으로 래핑 — `PREFETCH_MAP` 접근 함수로 deps `[]` 가능하나 현재 deps 없음. 허용 범위.
- **과다 사용 패턴 없음**: React.memo는 `DeparturePrediction`, `StreakBadge`, `AlertSection`, `PatternInsightsCard`, `SortableStopItem` 5개 컴포넌트에 선별 적용.

### 3. eslint-disable 처리된 deps - 수용 가능
- `HomePage.tsx:35`: `[mode]`만 deps, `data.setForceRouteType`은 stable setter라 suppresson 합당.
- `NotificationHistoryPage.tsx:157`: `[userId]` - 첫 마운트에 stats + history 동시 로드. `periodFilter` 변경 시 별도 useEffect로 처리. 허용.

### 4. 번들 사이즈 - PASS
무거운 의존성 없음:
- `moment.js`, `lodash` (전체), `chart.js`, `d3`, `recharts` 불포함
- 차트는 순수 CSS + SVG로 직접 구현 (`DailyBarChart.tsx`)
- 의존성: react, react-dom, react-router-dom, @tanstack/react-query, @supabase/supabase-js, @dnd-kit/*, clsx, tailwind-merge

### 5. 리스트 가상화 - 현재 불필요
- `NotificationHistoryPage`: 페이지네이션(20개/페이지) + "더 보기" 버튼 — 100개 이상 동시 렌더 없음
- `CommuteDashboardPage`: 탭별로 분리 + 히스토리는 서버에서 10개 단위 로드
- 가상화 도입 기준(100개 이상 동시 리스트) 미달

### 6. 이미지 lazy loading - 해당 없음
`<img>` 태그 없음. 아이콘은 모두 인라인 SVG 사용.

---

## Backend

### 1. N+1 쿼리 패턴

#### `calculate-departure.use-case.ts` - 수정 완료 (2건)

**문제 1**: `calculateForToday` — for 루프에서 각 설정마다 `calculateForSetting` 순차 호출.
`calculateForSetting` 내부에서 snapshotRepo + routeRepo + sessionRepo 조회가 있어 설정 수 × DB쿼리 수만큼 순차 실행됨.

```typescript
// 수정 전 (N개 설정 × 순차 실행)
for (const setting of settings) {
  const snapshot = await this.calculateForSetting(setting, today);
}

// 수정 후 (병렬 실행)
const settled = await Promise.allSettled(
  activeSettings.map((setting) => this.calculateForSetting(setting, today)),
);
```

**문제 2**: `calculateForSetting` — 스텝 2(route 조회)와 스텝 3(history 조회)이 순차였으나 독립적.

```typescript
// 수정 전 (순차)
const route = await this.routeRepo.findById(setting.routeId);
const historyAvgMin = await this.getHistoryAverage(setting.userId, setting.routeId);

// 수정 후 (병렬)
const [route, historyAvgMin] = await Promise.all([
  this.routeRepo.findById(setting.routeId),
  this.getHistoryAverage(setting.userId, setting.routeId),
]);
```

### 2. 알림 발송 (`send-notification.use-case.ts`) - PASS
- `execute()`: weather/transit/route 수집을 `Promise.all` 병렬 처리
- `collectSubwayData()`: 여러 역 조회를 `Promise.allSettled` 병렬 처리
- `collectBusData()`: 여러 버스 정류장을 `Promise.allSettled` 병렬 처리
- `collectSmartNotificationData()`: weather context 의존성 때문에 순차 처리 — 정상

### 3. 통계 조회 (`get-commute-stats.use-case.ts`) - PASS
- `calculateRouteStats()`: `findByUserId`로 모든 경로를 한 번에 조회 후 Map으로 캐싱. N+1 없음.
- `calculateCheckpointStats()`: 모든 세션/체크포인트를 in-memory Map으로 처리. DB 추가 조회 없음.

### 4. 위젯 데이터 (`widget-data.service.ts`) - PASS
- `getData()`: weather, airQuality, alerts, transit, departure를 `Promise.allSettled` 병렬 처리
- `fetchTransitData()`: subway + bus 조회를 `Promise.allSettled` 병렬 처리

### 5. 미션/스트릭 (`daily-check.use-case.ts`) - PASS
- `getDailyStatus()`: missions, records, score를 `Promise.all` 병렬 처리
- `recalculateScore()`: missions, records, previousStreak를 `Promise.all` 병렬 처리

### 6. SELECT * 여부 - PASS
TypeORM `find()`/`findOne()` 사용 — 기본적으로 entity 전체 컬럼 로드.
현재 entity 크기가 작고, 대부분 단일 레코드 조회라 실질 영향 미미.
일부 집계 쿼리는 `createQueryBuilder + select()` 사용 (challenge.repository.impl.ts 등).

---

## 수정 내역

| # | 파일 | 변경 내용 | 효과 |
|---|------|----------|------|
| 1 | `backend/src/application/use-cases/calculate-departure.use-case.ts` | `calculateForToday`: for 루프 → `Promise.allSettled` 병렬화 | 설정 수만큼 DB 쿼리 시간 단축 |
| 2 | `backend/src/application/use-cases/calculate-departure.use-case.ts` | `calculateForSetting`: route + historyAvg 순차 → `Promise.all` 병렬화 | 설정당 1 RTT 단축 |
