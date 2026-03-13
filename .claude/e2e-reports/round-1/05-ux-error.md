# Phase 5: UX 에러 복구 점검

- **일시**: 2026-03-14
- **브랜치**: feature/e2e-auto-review-20260314
- **검증 방법**: 코드 리뷰 기반

---

## 점검 결과 요약

| # | 시나리오 | 결과 | 비고 |
|---|---------|:----:|------|
| 5-1 | 네트워크 끊김 | PASS | `useOnlineStatus` + `OfflineBanner` 정상 구현, App.tsx에서 전역 적용 |
| 5-2 | API 500 에러 | PASS | `getQueryErrorMessage` 유틸 + 각 페이지에서 에러 메시지 표시 + 재시도 버튼 |
| 5-3 | 인증 만료 | PASS | `api-client.ts`의 `handleAuthError`에서 401 시 localStorage 정리 + `/login` 리다이렉트 |
| 5-4 | 존재하지 않는 URL | PASS | `App.tsx` 라우터에 `<Route path="*" element={<NotFoundPage />} />` 적용 |
| 5-5 | 외부 API 실패 | PASS | 날씨/대기질/교통 API 실패 시 fallback 메시지 표시, non-blocking 처리 |
| 5-6 | 폼 유효성 실패 | PASS | 로그인 폼: HTML5 required + minLength + pattern 적용, 경로 설정: validateRoute 훅 |
| 5-7 | 중복 요청 | PASS | 모든 주요 버튼에 isLoading/isSubmitting disabled 처리 |
| 5-8 | 뒤로가기/새로고침 | PASS | CommuteTracking: beforeunload 경고 + 세션 복구, 홈: react-query 캐시 |

---

## 상세 분석

### 5-1. 네트워크 끊김 (PASS)

**구현 위치:**
- `frontend/src/presentation/hooks/useOnlineStatus.ts` - `navigator.onLine` + `online`/`offline` 이벤트 리스너
- `frontend/src/presentation/components/OfflineBanner.tsx` - 고정 배너, `role="alert"`, `aria-live="assertive"`
- `frontend/src/presentation/App.tsx` (line 63) - `<OfflineBanner />` 전역 적용

**추가 보강:**
- `react-query` 설정에서 `refetchOnReconnect: true` 적용 (네트워크 복구 시 자동 데이터 갱신)
- API 클라이언트에 `withRetry` (네트워크 에러/타임아웃 시 최대 2회 재시도, 지수 백오프)

### 5-2. API 500 에러 (PASS)

**구현 패턴:**
- `infrastructure/query/error-utils.ts`: `getQueryErrorMessage()` - 401/403/Network 에러 분류
- `infrastructure/query/query-client.ts`: 전역 에러 로깅 (`QueryCache.onError`, `MutationCache.onError`)
- 각 페이지의 에러 처리:
  - HomePage: `loadError` 표시 + "다시 시도" 버튼 (`retryLoad`)
  - AlertSettingsPage: `alertCrud.loadError` + `alertCrud.retryLoad`
  - RouteSetupPage: `loadError` + `onRetryLoad` 버튼
  - CommuteTrackingPage: 에러 메시지 + "다시 시도" / "로그인" 버튼 분기

**ErrorBoundary:**
- `ErrorBoundary.tsx`: 예상치 못한 런타임 에러 캐치, "다시 시도" + "홈으로" 버튼, `logReactError()` 호출

### 5-3. 인증 만료 (PASS)

**구현 위치:** `infrastructure/api/api-client.ts` (line 38-48)

```typescript
private handleAuthError(url: string, status: number): void {
  const isAuthEndpoint = url.startsWith('/auth/');
  if (status === 401 && !isAuthEndpoint) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('phoneNumber');
    notifyAuthChange();
    window.location.href = '/login';
  }
}
```

- auth 엔드포인트 자체는 제외 (무한 리다이렉트 방지)
- `notifyAuthChange()` 호출로 `useSyncExternalStore` 기반 useAuth 훅 즉시 업데이트

### 5-4. 존재하지 않는 URL (PASS)

**구현 위치:**
- `App.tsx` (line 89): `<Route path="*" element={<NotFoundPage />} />`
- `NotFoundPage.tsx`: "404" 코드, "페이지를 찾을 수 없습니다" 메시지, "홈으로" + "알림 설정" 링크

### 5-5. 외부 API 실패 (PASS)

**날씨 API 실패:**
- `use-home-data.ts` (line 121): `weatherError = weatherQuery.error ? '날씨 정보를 불러올 수 없습니다' : ''`
- `HomePage.tsx` (line 110-113): weather 없으면 에러 메시지 fallback 섹션 표시

**미세먼지 API 실패:**
- `use-home-data.ts` (line 122): `airQualityError = airQualityQuery.error ? '미세먼지 정보 없음' : ''`
- `WeatherHeroSection.tsx` (line 103-105): airQuality 없으면 muted 에러 텍스트 표시

**교통 API 실패:**
- `use-transit-query.ts` (line 38-49): subway/bus API 각각 try-catch로 개별 fallback (`error: '조회 실패'`, 빈 arrivals 배열)
- 한 교통수단 실패해도 다른 교통수단 정보는 정상 표시

**출발 예측/경로 추천 실패:**
- `use-home-data.ts` (line 157, 174): `.catch(err => console.warn(...))` - 비핵심 기능, silent 처리 (화면에 해당 섹션만 미표시)

### 5-6. 폼 유효성 실패 (PASS)

**로그인/회원가입 폼:**
- HTML5 validation: `required`, `type="email"`, `minLength={6}`, `pattern="01[0-9]{8,9}"`, `maxLength={11}`
- 서버 에러 메시지: 409 (이미 등록된 이메일), 일반 에러 → `role="alert"`로 표시

**경로 설정 폼:**
- `useRouteValidation` 훅: 선택한 정류장 유효성 검증
- 유효하지 않으면 저장 버튼 `disabled={isSaving || !validation.isValid}`
- 에러 메시지 인라인 표시 (`role="alert"`)
- 정류장 추가 시 즉시 검증 (line 91-94)

**알림 설정 위저드:**
- `canProceed` 체크로 "다음" 버튼 disabled
- 중복 알림 검출: `checkDuplicateAlert()` + "기존 알림 수정하기" / "시간 변경하기" 분기 UI

### 5-7. 중복 요청 (PASS)

**구현 패턴:**

| 페이지 | 버튼 | disabled 조건 |
|--------|------|---------------|
| LoginPage | 로그인/회원가입 | `disabled={isLoading}` |
| AlertSettingsPage (Wizard) | "알림 시작하기" | `disabled={isSubmitting \|\| !!success}` |
| AlertSettingsPage | "+ 새 알림 추가" | `disabled={alertCrud.isSubmitting}` |
| RouteSetupPage | 경로 저장 | `disabled={isSaving \|\| !validation.isValid}` |
| CommuteTrackingPage | "도착" | `disabled={isCompleting}` |
| CommuteTrackingPage | handleComplete | `if (!session \|\| isCompleting \|\| ...)  return;` guard |
| AlertCrud | handleToggleAlert | `togglingIds` Set 기반 per-item guard |
| RouteSetupPage | handleSave | `if (!userId \|\| selectedStops.length === 0 \|\| isSaving) return;` guard |
| use-home-data | handleStartCommute | `if (!activeRoute \|\| isCommuteStarting) return;` guard |

### 5-8. 뒤로가기/새로고침 (PASS)

**CommuteTrackingPage:**
- `beforeunload` 이벤트: 진행 중 세션이면 브라우저 경고 (line 143-153)
- 페이지 진입 시 `getInProgressSession()` 호출로 기존 세션 복구 (line 56)
- Page Visibility API: 백그라운드에서 돌아올 때 타이머 즉시 갱신 (line 126)

**React Query 캐시:**
- `staleTime: 5분` 기본값으로 새로고침 시 캐시된 데이터 즉시 표시
- `gcTime: 30분`으로 장시간 캐시 유지

**localStorage 기반 상태 유지:**
- 인증 상태: localStorage (`accessToken`, `userId` 등)
- useOnlineStatus: `navigator.onLine` 기반 (새로고침 후에도 즉시 반영)
- 날씨 체크리스트: `saveCheckedItems()` → localStorage 저장

---

## 결론

**전 항목 PASS (8/8)** - 수정 불필요

에러 복구 패턴이 일관되게 적용되어 있음:
1. API 클라이언트 레벨: 자동 재시도(네트워크/타임아웃), 401 자동 로그아웃
2. React Query 레벨: 전역 에러 로깅, 자동 재시도, 네트워크 복구 시 refetch
3. 페이지 레벨: 에러 메시지 + 재시도 버튼, 로딩 상태 표시, 버튼 disabled
4. 전역 레벨: ErrorBoundary, OfflineBanner, NotFoundPage
