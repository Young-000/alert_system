# Round 6 - User Flow Review (09-userflow)

**Reviewer**: Claude Opus 4.6 (code review based)
**Date**: 2026-03-04
**Scope**: Routing setup, auth flow, alert CRUD flow, route setup flow, commute tracking flow, dashboard flow, navigation links, redirects

---

## 1. Routing Setup

**File**: `frontend/src/presentation/App.tsx`

| Route | Component | Status |
|-------|-----------|--------|
| `/` | HomePage | PASS |
| `/login` | LoginPage | PASS |
| `/onboarding` | OnboardingPage | PASS |
| `/alerts` | AlertSettingsPage | PASS |
| `/settings` | SettingsPage | PASS |
| `/auth/callback` | AuthCallbackPage | PASS |
| `/routes` | RouteSetupPage | PASS |
| `/commute` | CommuteTrackingPage | PASS |
| `/commute/dashboard` | CommuteDashboardPage | PASS |
| `/notifications` | NotificationHistoryPage | PASS |
| `/missions` | MissionsPage | PASS |
| `/missions/settings` | MissionSettingsPage | PASS |
| `/reports` | ReportPage | PASS |
| `/patterns` | PatternAnalysisPage | PASS |
| `/insights` | InsightsPage | PASS |
| `*` (404) | NotFoundPage | PASS |

**Verdict**: All 16 routes properly configured with lazy loading + Suspense fallback. `ScrollToTop` ensures proper scroll position on route change. `ErrorBoundary` wraps the entire app. `BottomNavigation` correctly hides on `/login`, `/onboarding`, and `/auth/callback`.

---

## 2. Auth Flow

### 2.1 Login Flow
- **Email/Password login**: `LoginPage` posts to `authApiClient.login()` -> stores `userId`, `accessToken`, `userName`, `phoneNumber` in localStorage -> calls `notifyAuthChange()` -> navigates to `/`
- **Error handling**: Catches errors, displays user-friendly messages for wrong credentials
- **Loading state**: Submit button disabled with spinner during API call
- **Form validation**: HTML5 `required`, `type="email"`, `minLength={6}` on password
- **Verdict**: PASS

### 2.2 Registration Flow
- **Register**: Posts to `authApiClient.register()` -> stores credentials -> navigates to `/onboarding`
- **Duplicate email**: Shows "이미 등록된 이메일입니다." on 409
- **Verdict**: PASS

### 2.3 Google OAuth Flow
- **AuthCallbackPage**: Extracts token from hash fragment (secure) or query string (fallback)
- **Success**: Stores auth data -> redirects to `/alerts`
- **Error**: Shows error message -> redirects to `/login` after 3 seconds
- **Verdict**: PASS

### 2.4 Auth State Management
- **useAuth hook**: Uses `useSyncExternalStore` with localStorage + custom event system
- **Cross-tab sync**: Listens to `storage` events for multi-tab synchronization
- **Reactive**: `notifyAuthChange()` triggers re-renders across all subscribed components
- **Verdict**: PASS

### 2.5 Protected Routes
- **Pattern**: Pages check `useAuth().userId` and render `AuthRequired` component (login prompt) instead of redirecting. This is the intentional pattern per MEMORY.md.
- **Pages using AuthRequired**: AlertSettingsPage, RouteSetupPage, CommuteDashboardPage, SettingsPage
- **CommuteTrackingPage**: Uses `navigate('/login')` redirect instead of AuthRequired (appropriate since active tracking requires auth)
- **Verdict**: PASS

### 2.6 Logout Flow
- **Settings -> ProfileTab**: `handleLogout()` removes all 5 auth keys from localStorage -> calls `notifyAuthChange()` -> navigates to `/` -> reloads page
- **Verdict**: PASS

---

## 3. Alert Flow

### 3.1 Create Alert (Wizard)
- **Step flow**: Type -> Transport -> Station -> Routine -> Confirm
- **Quick weather preset**: One-click "아침 날씨 알림" creation
- **Duplicate detection**: `checkDuplicateAlert()` checks schedule + types before submit
- **Auto wizard show**: Shows wizard when no alerts exist
- **Success feedback**: Toast "알림이 설정되었습니다!" -> resets wizard after delay
- **Error handling**: Auth expiry, permission, generic errors with user messages
- **Verdict**: PASS

### 3.2 List Alerts
- **Loading state**: Spinner with "서버에 연결 중입니다..." message
- **Alert display**: `AlertList` component shows name, types, toggle, edit, delete
- **Verdict**: PASS

### 3.3 Toggle Alert
- **Optimistic update**: Immediately toggles UI -> API call -> reverts on failure
- **Concurrent protection**: `togglingIds` set prevents double-toggle
- **Error feedback**: "알림 상태 변경에 실패했습니다."
- **Verdict**: PASS

### 3.4 Delete Alert
- **Confirmation modal**: `DeleteConfirmModal` with confirm/cancel
- **ESC key**: Closes modal via keyboard event listener
- **Success**: Reloads alerts list, clears delete target
- **Error**: Shows error message
- **Verdict**: PASS

### 3.5 Edit Alert
- **Edit modal**: `EditAlertModal` with name and schedule editing
- **Pre-populated**: Existing alert data loaded into form
- **Success feedback**: "알림이 수정되었습니다."
- **Verdict**: PASS

---

## 4. Route Setup Flow

### 4.1 Route List (Main View)
- **Empty state**: "경로가 없어요" with "경로 추가" button
- **Tab filter**: All / 출근 / 퇴근 with count badges
- **Route cards**: Displays route info with edit/delete actions
- **New route button**: PageHeader action "+" button
- **Verdict**: PASS

### 4.2 Create Route (Step Flow)
- **Steps**: select-type -> select-transport -> select-station -> ask-more -> confirm
- **Route type**: 출근/퇴근 selection
- **Transport mode**: 지하철/버스 selection
- **Station search**: Search with grouped results, line selection modal
- **Drag & drop**: Checkpoint reordering via @dnd-kit
- **Route validation**: `useRouteValidation` hook with min 1 stop requirement
- **Auto reverse**: Creates evening route when morning route is saved
- **Auto alerts**: Creates default alerts when route is saved
- **Save redirect**: Navigates to `/` after 1.5s (dismissible via toast)
- **Verdict**: PASS

### 4.3 Edit Route
- **Edit mode**: Loads existing checkpoints, pre-fills name, enters at 'ask-more' step
- **Save**: Updates route via `commuteApi.updateRoute()`
- **Verdict**: PASS

### 4.4 Delete Route
- **Confirmation modal**: ConfirmModal with "경로 삭제" title
- **Optimistic removal**: Removes from local state on success
- **Error handling**: Shows error message on failure
- **Verdict**: PASS

### 4.5 Shared Route Import
- **URL parameter**: Parses `?shared=` base64-encoded JSON
- **Banner**: Shows import option, cleans up URL params
- **Verdict**: PASS

---

## 5. Commute Tracking Flow

### 5.1 Session Start
- **From home**: `handleStartCommute()` starts session -> navigates with `{ state: { routeId } }`
- **Auto-start**: CommuteTrackingPage auto-starts session when routeId is in nav state
- **Resume**: Checks for in-progress session on mount
- **PWA shortcut**: Handles `?mode=morning` and `?mode=evening`
- **No route fallback**: Redirects to `/` if no route or session
- **Verdict**: PASS

### 5.2 Active Tracking
- **Timer**: Real-time elapsed time with seconds precision
- **Visibility API**: Timer updates immediately on tab focus return
- **Timeline**: Checkpoint progress with completed/current/pending states
- **Before unload**: Warning on browser close during active session
- **Verdict**: PASS

### 5.3 Checkpoint Recording
- **Auto-complete**: On final "도착" button, auto-records all unrecorded checkpoints in parallel
- **Verdict**: PASS

### 5.4 Session Complete
- **Completion**: Shows result with duration, comparison to expected time
- **Home button**: Navigates to `/` with replace
- **Verdict**: PASS

### 5.5 Session Cancel
- **Confirm modal**: ConfirmModal with "기록 취소" title
- **Cancel action**: Calls `commuteApi.cancelSession()` -> navigates to `/`
- **Verdict**: PASS

---

## 6. Dashboard Flow

### 6.1 Stats Overview
- **Loading**: Spinner with "통계를 불러오는 중..."
- **Empty state**: EmptyState with link to `/commute` for "트래킹 시작하기"
- **Tabs**: overview, routes, history, stopwatch, analytics, behavior
- **Tab visibility**: Conditional based on data availability
- **Verdict**: PASS

### 6.2 History
- **Load more**: Paginated via offset loading
- **Verdict**: PASS

### 6.3 Cross-links
- **Nav actions**: Links to `/commute` (tracking) and `/routes` (setup)
- **Footer cross-link**: Link to `/alerts` (alert settings)
- **Verdict**: PASS

---

## 7. Navigation Links Verification

### 7.1 Bottom Navigation
| Tab | Target | Active Match | Status |
|-----|--------|-------------|--------|
| 홈 | `/` | exact `/` | PASS |
| 경로 | `/routes` | `/routes`, `/commute` | PASS |
| 리포트 | `/reports` | `/reports` | PASS |
| 인사이트 | `/insights` | `/insights` | PASS |
| 알림 | `/alerts` | `/alerts` | PASS |
| 설정 | `/settings` | `/settings`, `/notifications` | PASS |

### 7.2 Cross-Page Navigation
| Source | Target | Context | Status |
|--------|--------|---------|--------|
| GuestLanding | `/login` | "시작하기", "무료로 시작하기" | PASS |
| LoginPage | `/` | "홈" nav link | PASS |
| HomePage (logged in) | `/routes` | "경로 등록하기" (empty state) | PASS |
| HomePage (logged in) | `/commute` | "출발하기" (via handleStartCommute) | PASS |
| HomePage (logged in) | `/commute/dashboard` | "자세히 보기" / "대시보드 보기" | PASS |
| AlertSettingsPage | `/notifications` | "알림 기록" link | PASS |
| CommuteDashboardPage | `/commute` | "트래킹" nav link | PASS |
| CommuteDashboardPage | `/routes` | "경로 설정" nav link | PASS |
| CommuteDashboardPage | `/alerts` | "알림 설정하기" cross-link | PASS |
| NotFoundPage | `/` | "홈으로" | PASS |
| NotFoundPage | `/alerts` | "알림 설정" | PASS |
| OnboardingPage (commute) | `/alerts` | "알림 설정하기" | PASS |
| OnboardingPage (commute) | `/commute` | "트래킹 시작하기" | PASS (user just created routes) |
| OnboardingPage (commute) | `/` | "홈으로" | PASS |

---

## 8. Redirects After Actions

| Action | Redirect | Status |
|--------|----------|--------|
| Login success | `/` | PASS |
| Register success | `/onboarding` | PASS |
| Google OAuth success | `/alerts` | PASS |
| Google OAuth error | `/login` (3s delay) | PASS |
| Logout | `/` + page reload | PASS |
| Route save | `/` (1.5s delay, dismissible) | PASS |
| Commute complete | Shows result, "홈으로" button to `/` | PASS |
| Commute cancel | `/` (replace) | PASS |
| No active session on `/commute` | `/` (replace) | PASS |
| Onboarding skip | `/` | PASS |

---

## 9. Issues Found

### 9.1 FIXED: Broken `/commute?mode=stopwatch` link in OnboardingPage

**Severity**: Medium
**File**: `frontend/src/presentation/pages/OnboardingPage.tsx`
**Issue**: The OnboardingPage's "no commute" completion step had a link `<Link to="/commute?mode=stopwatch">` but `CommuteTrackingPage` only handles `mode=morning` and `mode=evening`. The `mode=stopwatch` value falls through to the "no route and no active session" case, which silently redirects to `/` -- making the button appear broken.

**Root cause**: The stopwatch feature exists only as a display tab in CommuteDashboardPage (reading from localStorage records), not as a separate page or mode in CommuteTrackingPage. The link was pointing to a non-existent functionality.

**Fix applied**: Changed the "스톱워치로 시작" link (to `/commute?mode=stopwatch`) to "경로 설정하기" (to `/routes`), and changed the secondary "경로 설정하기" link to "홈으로" (to `/`). This gives users without a commute a clear path forward.

### 9.2 INFO: Dashboard link to `/commute` may redirect away

**Severity**: Low (informational)
**File**: `frontend/src/presentation/pages/CommuteDashboardPage.tsx` line 73
**Observation**: The dashboard has a nav link to `/commute` (tracking page). If the user has no active session and no route to start, CommuteTrackingPage redirects to `/`. This is expected behavior but could be surprising for users navigating from the dashboard. The empty state in the dashboard already provides a link to start tracking, which includes proper context.

**Action**: No fix needed. The behavior is correct -- tracking requires an active route.

### 9.3 INFO: Pre-existing TypeScript errors in PlacesTab.tsx

**Severity**: Low (pre-existing, not related to user flow)
**File**: `frontend/src/presentation/pages/settings/PlacesTab.tsx`
**Observation**: 5 TypeScript errors related to unused imports and undeclared `handleDelete` function. These are pre-existing issues not introduced by this review.

---

## 10. Summary

| Area | Items Checked | Issues Found | Fixed |
|------|:------------:|:------------:|:-----:|
| Routing (16 routes) | 16 | 0 | 0 |
| Auth flow (login/register/OAuth/logout) | 6 | 0 | 0 |
| Alert CRUD (create/list/toggle/delete/edit) | 5 | 0 | 0 |
| Route setup (create/list/edit/delete/share) | 5 | 0 | 0 |
| Commute tracking (start/track/complete/cancel) | 5 | 0 | 0 |
| Dashboard (stats/history/tabs) | 3 | 0 | 0 |
| Navigation links | 18 | 1 | 1 |
| Redirects after actions | 10 | 0 | 0 |
| **Total** | **68** | **1** | **1** |

**Overall Assessment**: User flows are well-structured with proper auth guards, loading states, error handling, and redirects. The single issue found (broken stopwatch link from onboarding) has been fixed. All major CRUD flows follow the complete pattern: create -> list -> toggle/edit -> delete with confirmation modals, optimistic updates, and error recovery.

---

*Review completed: 2026-03-04*
