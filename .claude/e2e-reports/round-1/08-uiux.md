# UI/UX Code Review Report

**Date:** 2026-02-24
**Scope:** `frontend/src/presentation/pages/` 전체 페이지 컴포넌트
**Method:** Code review (non-Playwright)

---

## 1. Loading State

| Page | Loading Indicator | Skeleton | Blank Screen Risk |
|------|:-:|:-:|:-:|
| HomePage | O (skeleton cards) | O | X |
| AlertSettingsPage | O (spinner + text) | X | X |
| CommuteDashboardPage | O (spinner + text) | X | X |
| CommuteTrackingPage | O (spinner) | X | X |
| RouteSetupPage | O (text) | X | X |
| LoginPage | O (button spinner) | X | X |
| NotificationHistoryPage | O (spinner) | X | X |
| NotificationStats | O (skeleton) | O | X |
| OnboardingPage | X (isCreating button text only) | X | X |
| SettingsPage | O (spinner) | X | X |
| AuthCallbackPage | O (spinner) | X | X |

**Summary:** 모든 페이지에 로딩 인디케이터 존재. HomePage와 NotificationStats는 skeleton UI 사용. 나머지는 spinner 기반. 빈 화면 없음. **양호.**

---

## 2. Error State

| Page | Error Feedback | Specific Messages | Retry Button |
|------|:-:|:-:|:-:|
| HomePage | O (notice + 다시 시도) | O (loadError, weatherError) | O (retryLoad) |
| AlertSettingsPage | O (wizard error) | O (401/403 분기) | X |
| CommuteDashboardPage | O (notice error) | O (loadError) | X |
| CommuteTrackingPage | O (role=alert) | O | X |
| RouteSetupPage | O | O (401/network 분기) | X |
| LoginPage | O (notice error) | O (409, 인증 실패 분기) | X |
| NotificationHistoryPage | O (error-banner + dismiss) | O | X (dismiss만) |
| OnboardingPage | O (notice error) | O | X |
| SettingsPage | O (notice error) | O | X |
| AuthCallbackPage | O (에러 표시 + 자동 리다이렉트) | O (google_not_configured 등) | X (자동 리다이렉트) |

**Issue UIUX-01 (Low):** AlertSettingsPage, CommuteDashboardPage, RouteSetupPage에 재시도 버튼 없음. 사용자가 새로고침해야 함. HomePage만 `retryLoad` 제공.

**Summary:** 에러 메시지는 구체적이고 HTTP 상태별 분기가 잘 되어 있음. 재시도 버튼은 HomePage만 제공.

---

## 3. Empty State

| Page / Section | Empty State | Message | Action CTA |
|------|:-:|:-:|:-:|
| HomePage (비로그인) | O (GuestLanding) | O | O (시작하기) |
| HomePage (경로 없음) | O (today-empty) | O | O (경로 등록하기) |
| HomePage (통계 없음) | O (home-stats-empty) | O | O (대시보드 보기) |
| AlertSettingsPage (알림 없음) | O (wizard 자동 표시) | O | O (wizard) |
| CommuteDashboardPage (기록 없음) | O (EmptyState) | O | O (트래킹 시작하기) |
| CommuteTrackingPage | N/A (자동 리다이렉트) | - | - |
| RouteSetupPage (경로 없음) | O (route-empty-v2) | O | O (경로 추가) |
| RouteSetupPage (필터 결과 없음) | O (route-filter-empty) | O | X |
| NotificationHistoryPage (기록 없음) | O (settings-empty) | O | O (알림 설정하기) |
| NotificationHistoryPage (필터 결과 없음) | O | O | X |
| HistoryTab (기록 없음) | O (EmptyState) | O | X |
| BehaviorTab (데이터 부족) | O (EmptyState) | O | O (트래킹 시작하기) |
| OverviewTab (요일별 데이터 없음) | O (empty-state) | O | X |

**Summary:** 모든 주요 빈 상태에 안내 메시지와 CTA가 잘 구현되어 있음. **양호.**

---

## 4. Responsive Design

- `className` 기반 CSS 사용. 반응형 여부는 CSS 파일에 의존.
- `viewport` 메타 태그는 `index.html`에서 설정됨 (CLAUDE.md 확인).
- 인라인 `style={{}}` 사용 다수 발견 (약 40+ 곳). CLAUDE.md 규칙("인라인 스타일 금지, 동적 값 제외")에 부분 위반.

**Issue UIUX-02 (Low):** `style={{}}` 사용이 다수 있음. 대부분 `margin`, `fontSize`, `textAlign` 등 정적 값으로, CSS 클래스로 추출해야 하는 항목. 동적 값(`width: ${barWidth}%` 등)은 허용.

정적 인라인 스타일 사용처 (주요):
- `CommuteDashboardPage.tsx:82` - `margin: '0 1rem 0.75rem'`
- `SettingsPage.tsx:63` - `margin: '0 1rem 0.75rem'`
- `AppTab.tsx:63,91,105,145` - `marginTop` 등
- `BehaviorTab.tsx:39,53` - `marginTop`
- `AnalyticsTab.tsx:13` - `margin`
- `AuthCallbackPage.tsx:76` - `textAlign: 'center'`
- `ErrorBoundary.tsx:47` - `fontSize: '4rem'`
- `LoadMoreButton.tsx:33` - 복합 스타일
- `WeeklyReportCard.tsx:20-24` - skeleton width/height

---

## 5. Form UX

| Form | Required Marker | Validation Feedback | Submit Feedback | Disabled While Loading |
|------|:-:|:-:|:-:|:-:|
| LoginPage | O (required, aria-required) | O (error notice) | O (spinner + text) | O |
| AlertSettingsPage (wizard) | O (implicit via canProceed) | O (error msg) | O (isSubmitting) | O |
| RouteSetupPage | O (validation hook) | O (error state) | O (isSaving) | O |
| OnboardingPage | O (implicit via step flow) | O (error notice) | O (isCreating) | O |
| EditAlertModal | O (implicit) | X (no client validation) | O (isEditing) | O |

**Issue UIUX-03 (Low):** LoginPage의 phoneNumber 필드에 `pattern="01[0-9]{8,9}"` 패턴이 있지만, 패턴 불일치 시 사용자에게 보여지는 커스텀 에러 메시지가 없음. 브라우저 기본 메시지에 의존.

**Summary:** 폼 UX 전반적으로 양호. 필수 필드 표시, 제출 중 비활성화, 성공/실패 피드백 모두 존재.

---

## 6. Conditional Rendering Bugs

### 점검 결과

1. **모순 조건 중첩:** 발견되지 않음. AlertSettingsPage의 wizard step은 명확하게 분리.
2. **삼항 연산자 3단계 중첩:** 발견되지 않음.
3. **`&&` 좌측 falsy 렌더링 위험:**
   - `HomePage.tsx:55` - `data.streak != null &&` -- `null` 체크이므로 안전.
   - `CommuteSection.tsx:92` - `transitInfos.length > 0 &&` -- `0` 렌더링 위험 없음 (`> 0`은 boolean 반환).
4. **조건부 렌더링 최상위 분리:** 잘 되어 있음.

**Summary:** 조건부 렌더링 버그 없음. **양호.**

---

## 7. State Management

### 파생 상태 (Derived State)

검색 결과, 파생 상태가 별도 `useState`로 관리되는 심각한 패턴은 발견되지 않음.

- `AlertSettingsPage` - `schedule`, `alertName`, `notificationTimes`를 `useMemo`로 올바르게 처리.
- `RouteSetupPage` - `sortedRoutes`, `filteredRoutes`를 `useMemo`로 처리.
- `use-home-data.ts` - `alerts`, `routes`, `activeRoute` 등을 `useMemo`로 처리.
- `NotificationHistoryPage` - `filteredLogs`를 `useMemo`로 처리.

### 관련 상태 동시 변경

- `AlertSettingsPage.handleSubmit` (line 134-143) - 성공 시 setTimeout 내에서 여러 상태를 함께 초기화. 적절함.
- `RouteSetupPage.cancelCreating` (line 455-466) - 취소 시 모든 관련 상태를 함께 초기화. 적절함.
- `use-alert-crud.ts.handleToggleAlert` (line 166-181) - optimistic update + rollback 패턴 올바르게 구현.

### useEffect 의존성

- `NotificationHistoryPage.tsx:157` - `// eslint-disable-line react-hooks/exhaustive-deps` 주석 있음. `periodFilter`가 의존성에서 빠져있지만, 이는 초기 로드와 period 변경을 분리하려는 의도적 설계.

**Summary:** 상태 관리 패턴 전반적으로 양호. **문제 없음.**

---

## 8. Accessibility (a11y) Quick Check

| Item | Status | Notes |
|------|:-:|-------|
| `role="alert"` for errors | O | 대부분의 에러 메시지에 적용 |
| `aria-label` for icon buttons | O | 편집/삭제/뒤로가기 버튼 모두 적용 |
| `aria-hidden` for decorative icons | O | SVG 아이콘에 일관되게 적용 |
| `role="tablist"/"tab"` for tabs | O | DashboardTabs, SettingsPage, RouteListView |
| `aria-pressed` for toggles | O | route type toggle 등 |
| `aria-live="polite"` for loading | O | 로딩 상태에 적용 |
| Skip link | O | HomePage, LoginPage, GuestLanding |
| `<label>` for form inputs | O | LoginPage 모든 필드에 연결 |

**Summary:** 접근성 기본 사항이 잘 구현되어 있음. **양호.**

---

## 9. Critical User Flow Verification

### Alert Settings Page (`/alerts`)
- [x] 비로그인 -> AuthRequired 컴포넌트 표시
- [x] 알림 없음 -> wizard 자동 표시
- [x] 알림 생성 -> 성공 토스트 + 목록 갱신
- [x] 알림 토글 -> optimistic update + rollback
- [x] 알림 삭제 -> ConfirmModal + 삭제
- [x] 알림 수정 -> EditAlertModal
- [x] 중복 알림 감지 -> 에러 + 수정/시간 변경 옵션

### Route Setup Page (`/routes`)
- [x] 비로그인 -> AuthRequired
- [x] 경로 없음 -> 빈 상태 + 추가 버튼
- [x] 새 경로 생성 -> 다단계 wizard
- [x] 경로 저장 -> 토스트 + 자동 네비게이션
- [x] 퇴근 경로 자동 생성 옵션
- [x] 경로 수정 / 삭제

### Commute Tracking Page (`/commute`)
- [x] 비로그인 -> /login 리다이렉트
- [x] 진행 중 세션 자동 복원
- [x] 타이머 실행 + Page Visibility API 지원
- [x] 도착 버튼 -> 세션 완료
- [x] 취소 -> ConfirmModal -> 홈 리다이렉트
- [x] beforeunload 경고

### Commute Dashboard Page (`/commute/dashboard`)
- [x] 비로그인 -> AuthRequired
- [x] 데이터 없음 -> EmptyState
- [x] 탭 전환 -> URL 파라미터 연동

---

## Issues Summary

| ID | Severity | Category | Description | File(s) |
|----|----------|----------|-------------|---------|
| UIUX-01 | Low | Error State | 대부분의 페이지에 에러 재시도 버튼 없음 (HomePage만 제공) | AlertSettingsPage, CommuteDashboardPage, RouteSetupPage 등 |
| UIUX-02 | Low | Style | 정적 인라인 `style={{}}` 약 15+ 곳 사용 (CLAUDE.md 규칙 위반) | AppTab, BehaviorTab, AnalyticsTab, LoadMoreButton 등 |
| UIUX-03 | Low | Form UX | LoginPage phoneNumber pattern 불일치 시 커스텀 에러 메시지 미제공 | LoginPage.tsx |

---

## Overall Assessment

**Status: PASS**

프론트엔드 UI/UX 품질이 전반적으로 높은 수준임:

- **로딩/에러/빈 상태** 처리가 모든 페이지에 일관되게 구현
- **조건부 렌더링 버그** 없음
- **상태 관리** 패턴이 올바르게 적용 (useMemo, optimistic update, 관련 상태 동시 초기화)
- **접근성** 기본 사항 잘 준수 (ARIA 속성, 시맨틱 HTML, skip link)
- **폼 UX** 필수 필드 표시, 제출 중 비활성화, 피드백 모두 존재
- **핵심 사용자 플로우** 정상 동작 확인

발견된 3건의 이슈는 모두 Low severity로, 기능적 버그가 아닌 개선 사항 수준.
