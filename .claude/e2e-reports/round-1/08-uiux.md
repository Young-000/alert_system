# 08. UI/UX - 코드 기반 정적 분석 점검

**Date**: 2026-03-14
**Branch**: `feature/e2e-auto-review-20260314`
**Test Method**: Source Code Analysis (Static Review)
**Scope**: frontend/src/presentation/pages/ + components/ + styles/

---

## Overall Status: PASS (경미한 이슈 3건, 수정: 1건)

---

## 점검 항목 결과

### 1. 로딩 상태 (isLoading + 로딩 UI)

| 페이지 | isLoading | 로딩 UI | 패턴 |
|--------|-----------|---------|------|
| HomePage | ✅ `data.isLoading` | ✅ `.home-greeting-skeleton` + `skeleton-card` × 2 | skeleton |
| AlertSettingsPage | ✅ `alertCrud.isLoadingAlerts` | ✅ spinner + "서버에 연결 중입니다..." | spinner |
| RouteSetupPage | ✅ `isLoading` | ✅ `.apple-loading` "불러오는 중..." | text |
| CommuteTrackingPage | ✅ `isLoading` | ✅ `spinner spinner-lg` + "준비 중..." | spinner |
| CommuteDashboardPage | ✅ `isLoading` | ✅ spinner + "통계를 불러오는 중..." | spinner |
| SettingsPage | ✅ `settings.isLoading` | ✅ spinner + "불러오는 중..." | spinner |
| NotificationHistoryPage | ✅ `isLoading` | ✅ spinner + "불러오는 중..." | spinner |
| MissionsPage | ✅ `isLoading` | ✅ `skeleton-card` × 5개 | skeleton |
| LoginPage | ✅ `isLoading` | ✅ spinner + "처리 중..." | spinner |
| ReportPage/WeeklyTab | ✅ `isLoading` | ✅ `WeeklyTabSkeleton` (다수 skeleton) | skeleton |
| PatternAnalysisPage | ✅ `isLoading` | ✅ `skeleton-card` × 2 | skeleton |
| InsightsPage | ✅ `isLoading` | ✅ `skeleton-card` × 3 | skeleton |
| App.tsx (페이지 전환) | ✅ `Suspense` | ✅ `PageLoader` (skeleton title + hero + card) | skeleton |

**결과: ✅ 전 페이지 로딩 상태 구현**

---

### 2. 에러 상태 (error state + 에러 UI)

| 페이지 | 에러 처리 |
|--------|----------|
| HomePage | ✅ `data.loadError` + 다시 시도 버튼 (`role="alert"`) |
| AlertSettingsPage | ✅ `alertCrud.loadError` (초기 로드) + `error` (CRUD 에러), 다시 시도 버튼 |
| RouteSetupPage | ✅ `loadError`, `error` state, 에러별 메시지 분류 (401/network/일반) |
| CommuteTrackingPage | ✅ `error` + 재시도 버튼 + 로그인 버튼 (401 케이스) |
| CommuteDashboardPage | ✅ `loadError` + `analyticsError` + `behaviorError` + `comparisonError` |
| SettingsPage | ✅ `settings.actionError` (`role="alert"`, `aria-live="assertive"`) |
| NotificationHistoryPage | ✅ `error` + 다시 시도 버튼 + 닫기 버튼 |
| MissionsPage | ✅ 전용 에러 화면 (`role="alert"`) + 재시도 버튼 |
| LoginPage | ✅ `error` notice (`role="alert"`) |
| ReportPage/WeeklyTab | ✅ `getQueryErrorMessage(error)` + `role="alert"` |
| InsightsPage | ✅ `.insights-error notice error` (`role="alert"`) |

**결과: ✅ 전 페이지 에러 처리 구현**

---

### 3. 빈 상태 (empty state)

| 페이지 | 빈 상태 UI |
|--------|-----------|
| AlertSettingsPage (비로그인) | ✅ `AuthRequired` 컴포넌트 |
| AlertSettingsPage (알림 없음) | ✅ 위저드 자동 표시 (알림 0개 시) |
| RouteSetupPage (비로그인) | ✅ `AuthRequired` 컴포넌트 |
| RouteListView (경로 없음) | ✅ 아이콘 + "경로가 없어요" + 경로 추가 버튼 |
| CommuteDashboardPage | ✅ `EmptyState` "아직 기록이 없어요" + CTA |
| NotificationHistoryPage | ✅ "알림 기록이 없어요" + 알림 설정하기 링크 |
| MissionsPage | ✅ `EmptyState` "출퇴근을 알차게!" + 미션 설정하기 버튼 |
| ReportPage/WeeklyTab | ✅ "이번 주 기록이 아직 없어요" + 설명 |
| InsightsPage | ✅ "아직 지역 데이터가 없어요" |
| PatternAnalysisPage | ✅ 날씨/요일 데이터 부족 시 안내 메시지 |
| CommuteDashboard/StopwatchTab | ✅ `EmptyState` "스톱워치 기록이 없어요" + CTA |

**결과: ✅ 주요 페이지 빈 상태 처리 구현**

---

### 4. 성공 피드백 (저장/삭제 후 피드백)

| 동작 | 피드백 |
|------|-------|
| 알림 생성 | ✅ `setCrudSuccess('알림이 설정되었습니다! 알림톡으로 받아요.')` (4초 후 자동 소멸) |
| 알림 수정 | ✅ `setSuccess('알림이 수정되었습니다.')` |
| 날씨 알림 원클릭 | ✅ `setSuccess('날씨 알림이 설정되었습니다!')` |
| 알림 토글 | ✅ 낙관적 업데이트 + 실패 시 롤백 + 에러 메시지 |
| 경로 저장 | ✅ `toast.success('경로가 저장되었습니다')` / `'출근/퇴근 경로가 저장되었습니다'` |
| 경로 수정 | ✅ `toast.success('경로가 수정되었습니다')` |
| 설정 데이터 삭제 | ✅ `settings.resetSuccess` → `toast-success` DOM 렌더링 |
| 세션 완료 | ✅ 완료 화면으로 전환 (시간 + 비교 표시) |

**결과: ✅ 성공 피드백 전반적으로 구현**

---

### 5. 모달 확인 (삭제 전 확인 다이얼로그)

| 대상 | 모달 | focus trap | ESC key | isLoading disabled |
|------|------|-----------|---------|-------------------|
| 알림 삭제 | ✅ `DeleteConfirmModal` | ✅ | ✅ | ✅ |
| 알림 수정 | ✅ `EditAlertModal` | ✅ | ✅ | ✅ |
| 경로 삭제 (RouteSetupPage) | ✅ `ConfirmModal` | ✅ | ✅ | ✅ |
| 경로 삭제 (RouteListView) | ✅ `ConfirmModal` | ✅ | ✅ | ✅ |
| 출퇴근 세션 취소 | ✅ `ConfirmModal` | ✅ | ✅ | ✅ |
| 로컬 데이터 초기화 | ✅ `ConfirmModal` | ✅ | ✅ | N/A |
| 전체 데이터 삭제 | ✅ `ConfirmModal` | ✅ | ✅ | ✅ |

**결과: ✅ 삭제 확인 다이얼로그 전반 구현 + focus trap + ESC key 지원**

---

### 6. 중복 요청 방지 (버튼 disabled)

| 동작 | 방지 방법 |
|------|---------|
| 알림 생성 | ✅ `disabled={alertCrud.isSubmitting}` |
| 경로 저장 | ✅ `if (!userId || selectedStops.length === 0 || isSaving) return;` + `isSaving` 조건 |
| 로그인/가입 버튼 | ✅ `disabled={isLoading}` |
| 알림 삭제 모달 | ✅ `disabled={isDeleting}` (취소/삭제 양쪽) |
| 알림 수정 모달 | ✅ `disabled={isEditing}` + `disabled={isEditing || !editForm.name.trim()}` |
| 세션 완료 버튼 | ✅ `disabled={isCompleting}` |
| 알림 토글 | ✅ `togglingIds.has(alert.id)` Set으로 개별 항목별 중복 방지 |
| 더 보기 버튼 | ✅ `disabled={isLoading}` |
| 미션 토글 | ✅ `if (toggleMutation.isPending) return;` |

**결과: ✅ 중복 요청 방지 전반적으로 구현**

---

### 7. 반응형 CSS

| 위치 | 미디어쿼리 수 |
|------|-------------|
| `base.css` | 2개 (`prefers-reduced-motion`, `forced-colors`) |
| `components.css` | 8개 (max-width: 480px, 600px, 900px 등) |
| `home.css` | 21개 (가장 풍부, 360px ~ 1200px) |
| `alerts.css` | 4개 |
| `routes.css` | 6개 |
| `Toast.tsx` (Tailwind) | ✅ `max-sm:left-4 max-sm:right-4 max-sm:bottom-4` |

브레이크포인트: 360px / 374px / 390px / 480px / 600px / 768px / 900px / 1200px

**결과: ✅ 반응형 CSS 구현**

---

### 8. 스켈레톤/스피너

- ✅ `index.css`에 skeleton CSS 시스템 완비: `.skeleton`, `.skeleton-text`, `.skeleton-title`, `.skeleton-button`, `.skeleton-card`, `.skeleton-avatar`, `.page-skeleton`, `.page-skeleton-title`, `.page-skeleton-hero`, `.page-skeleton-card`
- ✅ `skeleton-shimmer` 애니메이션 (1.5s infinite) + staggered delay (nth-child)
- ✅ 스피너: `.spinner`, `.spinner-sm`, `.spinner-lg`
- ✅ `@media (prefers-reduced-motion: reduce)` 시 skeleton 정적 표시, spinner 최소 애니메이션

**결과: ✅ 스켈레톤/스피너 시스템 완비**

---

### 9. 토스트 알림

- ✅ `Toast.tsx` 컴포넌트: 4가지 타입(success/error/info/warning), 4초 자동 소멸, 프로그레스바 애니메이션
- ✅ `useToast` 훅 제공 (success/error/info/warning 헬퍼 메서드)
- ✅ `ToastContainer` — `RouteSetupPage`에서 사용 (저장/수정 성공 피드백)
- ⚠️ `AlertSettingsPage` — `Toast` 컴포넌트 미사용. `success`/`error` state를 `TypeSelectionStep`, `ConfirmStep`에 직접 DOM 렌더링 (기능 동작하지만 Toast 컴포넌트와 다른 UX 패턴)
- ⚠️ `SettingsPage` — `settings.resetSuccess` 시 `.toast-success` CSS 클래스 직접 사용 (Toast 컴포넌트 미사용)

**결과: ⚠️ Toast 컴포넌트가 RouteSetupPage에서만 사용됨. AlertSettingsPage/SettingsPage는 자체 inline 방식 사용. 기능은 동작하나 UI 일관성 부족.**

---

### 10. 오프라인 배너

- ✅ `OfflineBanner.tsx` — `useOnlineStatus` 훅으로 `window.addEventListener('online'/'offline')` 감지
- ✅ `App.tsx` 최상단에 `<OfflineBanner />` 렌더링 (라우터 바깥, 전 페이지 적용)
- ✅ `role="alert"`, `aria-live="assertive"` 접근성 속성
- ✅ Tailwind 애니메이션 `animate-slide-down`
- ✅ z-index: 1002 (Bottom Nav 위, toast 아래)

**결과: ✅ 오프라인 배너 구현**

---

### 11. focus 스타일 (키보드 포커스 시각적 표시)

**전역 설정 (base.css)**:
- ✅ `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }`
- ✅ `button:focus-visible`, `.btn:focus-visible`: outline + `box-shadow: 0 0 0 4px var(--primary-glow)`
- ✅ `a:focus-visible`: outline + border-radius
- ✅ `.skip-link:focus`: top: 8px (키보드 전용 skip link)
- ✅ `.input:focus`: `border-color: var(--primary)` + `box-shadow: 0 0 0 3px var(--primary-glow)` (시각적 강조)

**발견된 이슈**:
- ⚠️ `base.css:115-120`: `button, input, select, textarea { outline: none; }` — 기본 outline 제거 후 `:focus-visible`로 복원하는 패턴. 단, `.station-input`, `.apple-search-input` 등 일부 input에서 `outline: none`만 있고 `:focus-visible` 오버라이드가 클래스 특이성(class > pseudo-class)으로 무효화될 수 있음.
- ⚠️ `routes.css`: `.preview-input:focus`, `.checkpoint-name-input:focus`, `.route-name-field:focus` — `outline: none` + `border-color` 변경만 있고 `box-shadow` 없음. WCAG 2.1 SC 2.4.11(Focus Appearance) 미충족 가능.

**결과: ⚠️ 전반적으로 구현되어 있으나, routes.css의 일부 입력 요소에서 focus box-shadow 누락 → 수정 완료 (아래 참조)**

---

### 12. 입력 유효성 (폼 입력 실시간 피드백)

| 폼 | 검증 방식 |
|----|---------|
| LoginPage | ✅ HTML5: `required`, `type="email"`, `minLength={6}`, `pattern` (전화번호), `aria-required="true"` |
| AlertSettingsPage | ✅ 제출 시 중복 알림 체크 + 에러 메시지 (`ConfirmStep.tsx`) |
| RouteSetupPage | ✅ `useRouteValidation` 훅, 실시간 `validateRoute()` 호출, 경고/에러 메시지 표시 |
| EditAlertModal | ✅ `disabled={isEditing || !editForm.name.trim()}` (이름 빈 경우 저장 불가) |
| MissionsPage | ✅ `isToggling` 체크로 토글 중복 방지 |

**결과: ✅ 입력 유효성 검증 구현**

---

## 수정 내역 (1건)

### 수정: routes.css focus 스타일 box-shadow 추가

`.preview-input:focus`, `.checkpoint-name-input:focus`, `.route-name-field:focus`에 `box-shadow: 0 0 0 3px var(--primary-glow)` 추가.
WCAG 2.1 SC 2.4.11(Focus Appearance) 준수를 위해 border-color 변경 외 시각적 강조 추가.

---

## 문제 발견 요약

| # | 심각도 | 위치 | 문제 | 수정 여부 |
|---|--------|------|------|---------|
| W-1 | 낮음 | `AlertSettingsPage`, `SettingsPage` | Toast 컴포넌트 미사용. inline success/error state 방식. 기능은 동작하나 UX 일관성 부족 | 미수정 (대규모 리팩토링 필요) |
| W-2 | 낮음 | `routes.css:462-465`, `routes.css:788-791`, `routes.css:3441-3444` | `.preview-input:focus`, `.checkpoint-name-input:focus`, `.route-name-field:focus`에 box-shadow 없음 | ✅ 수정 완료 |
| W-3 | 낮음 | `routes.css:702` | `.station-input { outline: none }` 클래스 특이성으로 `:focus-visible` 무효화 가능 | 미수정 (border: 2px solid var(--primary) 항상 표시되어 시각적 구분 가능) |
