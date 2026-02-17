# Cycle 3: Code Structure & Auth Consistency

> Date: 2026-02-17
> Scope: I-1, I-4, I-9, I-10, I-12

---

## JTBD

When **a developer opens the codebase to add or modify a feature**, they want to **find well-organized, consistent patterns for auth, headers, and component structure**, so they can **make changes quickly without introducing regressions or pattern drift**.

---

## Problem

- **Who:** The development team (1 developer, code reviewers)
- **Pain:** High friction when modifying HomePage (806 lines, 14 state variables, 7 useEffect hooks in a single file). Auth is read from localStorage directly in 9+ places bypassing the existing `useAuth` hook. Non-login states are handled with 4 different patterns across 4 pages. Page headers use 3 different CSS class names with near-identical styles. Two tab components (SettingsPage, RouteListView) lack ARIA tabpanel attributes.
- **Current workaround:** Developers must read the entire 816-line HomePage to understand any section. Auth changes require a shotgun-surgery edit across 9 files. Non-login UI inconsistency confuses users and complicates testing.
- **Success metric:** No file in `presentation/pages/` exceeds 300 lines. Zero direct `localStorage.getItem('userId')` calls outside `useAuth` and `api-client.ts`. All 4 non-login pages share one `AuthRequired` component. All page headers use one shared `PageHeader` component. All tab components pass WCAG 2.1 AA (axe-core audit: 0 violations on role="tab"/"tabpanel").

---

## Dependency Order

```
I-4 (useAuth) ──────► I-9 (AuthRequired) ──► I-1 (HomePage split)
                          │
I-10 (PageHeader) ────────┘
I-12 (ARIA tabs) ── independent
```

**Recommended execution order:**
1. **I-4** first -- useAuth becomes the single source of truth; all other items depend on it
2. **I-12** second -- independent, small, no cross-dependencies
3. **I-10** third -- PageHeader shared component, needed by I-9 and I-1
4. **I-9** fourth -- AuthRequired depends on useAuth (I-4) and PageHeader (I-10)
5. **I-1** last -- largest change, benefits from all prior refactors being in place

---

## I-4: useAuth Hook Full Adoption

### Current State

The `useAuth` hook exists at `frontend/src/presentation/hooks/useAuth.ts` (lines 1-63) and provides `{ userId, userName, userEmail, isLoggedIn }` via `useSyncExternalStore`. However, **11 files** still directly call `localStorage.getItem(...)` for auth values:

| File | Line(s) | What it reads |
|------|---------|---------------|
| `HomePage.tsx` | 85, 285, 286 | `userId`, `userName` |
| `AlertSettingsPage.tsx` | 43 | `userId` |
| `RouteSetupPage.tsx` | 29 | `userId` |
| `SettingsPage.tsx` | 16, 17 | `userId`, `phoneNumber` |
| `CommuteDashboardPage.tsx` (via `use-commute-dashboard.ts`) | 41 | `userId` |
| `CommuteTrackingPage.tsx` | 14 | `userId` |
| `NotificationHistoryPage.tsx` | 64 | `userId` |
| `OnboardingPage.tsx` | 32, 33 | `userId`, `userName` |

Additionally, `SettingsPage.tsx` reads `phoneNumber` (line 17) which `useAuth` does not currently expose.

**Exclusions (keep as-is):**
- `api-client.ts` line 31: reads `accessToken` for HTTP headers -- this is infrastructure, not presentation. Keep.
- `api-client.ts` lines 41-45: removes all auth keys on 401 -- infrastructure auto-logout. Keep.
- `LoginPage.tsx` / `LoginPage.test.tsx`: writes to localStorage via `safeSetItem` on login/register. Keep writes as-is (they already call `notifyAuthChange()`).
- `SettingsPage.tsx` lines 192-196: `handleLogout` removes all auth keys. Keep (already calls `notifyAuthChange()`).

### Changes Required

#### 1. Extend `useAuth` hook to expose `phoneNumber`

**File:** `frontend/src/presentation/hooks/useAuth.ts`

```typescript
// Change AUTH_KEYS to include 'phoneNumber'
const AUTH_KEYS = ['userId', 'userName', 'userEmail', 'accessToken', 'phoneNumber'] as const;

// Update AuthState interface
interface AuthState {
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber: string;
  isLoggedIn: boolean;
}

// Update return in useAuth()
export function useAuth(): AuthState {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [userId, userName, userEmail, , phoneNumber] = raw.split('|');
  // accessToken is index 3 -- skip it (not exposed to components)

  return {
    userId: userId || '',
    userName: userName || '',
    userEmail: userEmail || '',
    phoneNumber: phoneNumber || '',
    isLoggedIn: !!userId,
  };
}
```

Update `getServerSnapshot` to return `'||||'` (5 empty values for 5 keys).

#### 2. Replace all direct reads in page components

For each page file, add `import { useAuth } from '@presentation/hooks/useAuth';` and replace the `localStorage.getItem` calls:

| File | Remove | Replace with |
|------|--------|-------------|
| `HomePage.tsx` | `getInitialLoginState()` function (lines 84-86), `const userId = localStorage.getItem('userId') \|\| ''` (line 285), `const userName = localStorage.getItem('userName') \|\| ''` (line 286) | `const { userId, userName, isLoggedIn } = useAuth();` at top of `HomePage` component |
| `AlertSettingsPage.tsx` | `const userId = localStorage.getItem('userId') \|\| ''` (line 43) | `const { userId } = useAuth();` |
| `RouteSetupPage.tsx` | `const userId = localStorage.getItem('userId') \|\| ''` (line 29) | `const { userId } = useAuth();` |
| `SettingsPage.tsx` | `const userId = localStorage.getItem('userId') \|\| ''` (line 16), `const phoneNumber = localStorage.getItem('phoneNumber') \|\| ''` (line 17) | `const { userId, phoneNumber } = useAuth();` |
| `use-commute-dashboard.ts` | `const userId = localStorage.getItem('userId') \|\| ''` (line 41) | `const { userId } = useAuth();` |
| `CommuteTrackingPage.tsx` | `const userId = localStorage.getItem('userId') \|\| ''` (line 14) | `const { userId } = useAuth();` |
| `NotificationHistoryPage.tsx` | `const userId = localStorage.getItem('userId') \|\| ''` (line 64) | `const { userId } = useAuth();` |
| `OnboardingPage.tsx` | `const userId = localStorage.getItem('userId') \|\| ''` (line 32), `const userName = localStorage.getItem('userName') \|\| '회원'` (line 33) | `const { userId, userName } = useAuth();` (note: useAuth already defaults userName to '회원') |

#### 3. Remove `getInitialLoginState` from HomePage.tsx

Delete the standalone function on lines 84-86 and replace `const isLoggedIn = getInitialLoginState();` (line 268) with the destructured `isLoggedIn` from `useAuth()`.

### Risk: Low

- `useAuth` already works; we are extending coverage, not rewriting
- All tests that mock localStorage should still pass since `useAuth` reads from localStorage under the hood
- The `userName` default in `useAuth` is `'회원'` which matches `OnboardingPage`'s fallback

### Acceptance Criteria

- [ ] Given a search for `localStorage.getItem('userId')` in `presentation/`, When excluding test files, Then 0 results are found
- [ ] Given a search for `localStorage.getItem('userName')` in `presentation/`, When excluding test files, Then 0 results are found
- [ ] Given a search for `localStorage.getItem('phoneNumber')` in `presentation/`, When excluding test files, Then 0 results are found
- [ ] Given `useAuth()` is called in `SettingsPage`, When the user's phoneNumber is in localStorage, Then the phone number is displayed correctly
- [ ] Given all existing tests, When `npm test` is run, Then all tests pass
- [ ] Given a fresh login, When navigating to any page, Then `userId` is available from `useAuth()` without page refresh

---

## I-12: Tab Panel ARIA Attributes

### Current State

Three tab interfaces exist in the codebase:

| Component | File | Has `role="tablist"` | Has `role="tab"` | Has `id` on tabs | Has `aria-controls` | Has `role="tabpanel"` on content | Has `aria-labelledby` |
|-----------|------|:----:|:----:|:----:|:----:|:----:|:----:|
| DashboardTabs | `commute-dashboard/DashboardTabs.tsx` | YES | YES | YES | YES | YES (in tab content files) | YES |
| SettingsPage tabs | `SettingsPage.tsx` lines 239-284 | YES | YES | NO | NO | NO | NO |
| RouteListView filter tabs | `route-setup/RouteListView.tsx` lines 85-113 | YES | YES | NO | NO | NO | NO |

The **DashboardTabs** is the gold standard (fully compliant). SettingsPage and RouteListView are missing half the ARIA requirements.

### Changes Required

#### 1. SettingsPage.tsx -- Add tab IDs, aria-controls, and tabpanel wrapper

**Tabs (lines 239-284):** Add `id` and `aria-controls` to each tab button:

```tsx
<button
  type="button"
  role="tab"
  id="tab-profile"
  aria-selected={activeTab === 'profile'}
  aria-controls="tabpanel-profile"
  className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
  onClick={() => setActiveTab('profile')}
>
```

Repeat for all 4 tabs: `profile`, `routes`, `alerts`, `app`.

**Content (line 302-609):** Wrap each `activeTab === 'xxx'` block with a `tabpanel` div:

```tsx
{activeTab === 'profile' && (
  <div role="tabpanel" id="tabpanel-profile" aria-labelledby="tab-profile">
    <section className="settings-section">
      {/* existing profile content */}
    </section>
  </div>
)}
```

Repeat for all 4 panels: `profile`, `routes`, `alerts`, `app`.

#### 2. RouteListView.tsx -- Add tab IDs, aria-controls, and tabpanel wrapper

**Tabs (lines 85-113):** Add `id` and `aria-controls` to each tab button:

```tsx
<button
  type="button"
  role="tab"
  id="tab-route-all"
  aria-selected={routeTab === 'all'}
  aria-controls="tabpanel-route-list"
  className={`route-filter-tab ${routeTab === 'all' ? 'active' : ''}`}
  onClick={() => onTabChange('all')}
>
```

Repeat for `morning` and `evening` tabs (all control the same panel since they filter the same list).

**Content (lines 115-129):** Wrap the filtered route list with a tabpanel:

```tsx
<div role="tabpanel" id="tabpanel-route-list" aria-labelledby={`tab-route-${routeTab}`}>
  {filteredRoutes.length === 0 ? (
    <div className="route-filter-empty">...</div>
  ) : (
    filteredRoutes.map(...)
  )}
</div>
```

### Risk: Low

- Purely additive ARIA attributes; no behavior change
- No CSS changes needed (role attributes don't affect styling)

### Acceptance Criteria

- [ ] Given the SettingsPage is open, When inspecting the tabs with axe-core, Then 0 ARIA violations related to tabs are reported
- [ ] Given the RouteListView is displayed, When inspecting the tabs with axe-core, Then 0 ARIA violations related to tabs are reported
- [ ] Given any tab is clicked, When the tabpanel renders, Then the `aria-labelledby` matches the corresponding tab's `id`
- [ ] Given all existing tests, When `npm test` is run, Then all tests pass

---

## I-10: Page Header Style Unification

### Current State

Four different header class names exist with nearly identical CSS:

| Class Name | Used In | CSS Properties |
|-----------|---------|----------------|
| `.home-header` | HomePage.tsx | `display:flex; justify:space-between; align:flex-start; padding:20px 0 16px` |
| `.route-page-v2-header` | RouteListView.tsx | `display:flex; align:center; justify:space-between; padding:20px 0 16px; sticky; top:0; bg; z:10` |
| `.alert-page-v2-header` | AlertSettingsPage.tsx | `display:flex; align:center; justify:space-between; padding:20px 0 16px; sticky; top:0; bg; z:10` |
| `.settings-page-v2-header` | SettingsPage.tsx, NotificationHistoryPage.tsx | `padding:20px 20px 0` (different!) |

All `h1` styles inside these headers are identical: `font-size:1.5rem; font-weight:700; color:var(--ink)`.

### Changes Required

#### 1. Create shared PageHeader component

**New file:** `frontend/src/presentation/components/PageHeader.tsx`

```tsx
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Right-side action (button, link, etc.) */
  action?: ReactNode;
  /** If true, header sticks to top on scroll. Default: true */
  sticky?: boolean;
}

export function PageHeader({ title, action, sticky = true }: PageHeaderProps): JSX.Element {
  return (
    <header className={`page-header${sticky ? ' page-header-sticky' : ''}`}>
      <h1>{title}</h1>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
```

#### 2. Add unified CSS class

**File:** `frontend/src/presentation/index.css`

Add near the top of the page-level styles section:

```css
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 16px;
}

.page-header-sticky {
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 10;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}
```

#### 3. Replace headers in each page

| File | Current Header | Replacement |
|------|---------------|-------------|
| `RouteListView.tsx` lines 52-57 | `<header className="route-page-v2-header"><h1>경로</h1><button>+ 새 경로</button></header>` | `<PageHeader title="경로" action={<button type="button" className="btn btn-primary btn-sm" onClick={onStartCreating}>+ 새 경로</button>} />` |
| `AlertSettingsPage.tsx` line 236-238 (non-login) | `<header className="alert-page-v2-header"><h1>알림</h1></header>` | `<PageHeader title="알림" sticky={false} />` |
| `AlertSettingsPage.tsx` line 253-255 (logged in) | `<header className="alert-page-v2-header"><h1>알림</h1></header>` | `<PageHeader title="알림" />` |
| `SettingsPage.tsx` line 216-218 (non-login) | `<header className="settings-page-v2-header"><h1>설정</h1></header>` | `<PageHeader title="설정" sticky={false} />` |
| `SettingsPage.tsx` line 234-236 (logged in) | `<header className="settings-page-v2-header"><h1>내 설정</h1></header>` | `<PageHeader title="내 설정" />` |
| `NotificationHistoryPage.tsx` line 139 (non-login) | `<header className="settings-page-v2-header"><h1>알림 기록</h1></header>` | `<PageHeader title="알림 기록" sticky={false} />` |
| `NotificationHistoryPage.tsx` line 156 (logged in) | Complex inline-styled header | `<PageHeader title="알림 기록" action={<button ...>초기화</button>} />` |

**Note:** `HomePage.tsx` uses `.home-header` with a different structure (greeting + user name, no `<h1>` title). This is intentionally different and should NOT use `PageHeader`. Keep as-is.

#### 4. Remove old CSS classes

After all pages are migrated, remove from `index.css`:
- `.route-page-v2-header` and `.route-page-v2-header h1` (lines ~16078-16093)
- `.alert-page-v2-header` and `.alert-page-v2-header h1` (lines ~16328-16343)
- `.settings-page-v2-header` and `.settings-page-v2-header h1` (lines ~12751-12759)

### Risk: Low-Medium

- CSS removal could break if any unlisted page uses these classes
- Grep the entire codebase for each class name before deleting to confirm no other usage

### Acceptance Criteria

- [ ] Given the AlertSettingsPage is open, When the header renders, Then it uses the `.page-header` CSS class
- [ ] Given the SettingsPage is open, When the header renders, Then it uses the `.page-header` CSS class
- [ ] Given the RouteListView is open, When the header renders, Then it uses the `.page-header-sticky` CSS class and sticks on scroll
- [ ] Given a grep for `alert-page-v2-header`, When searching CSS and TSX files, Then 0 results are found
- [ ] Given a grep for `settings-page-v2-header`, When searching CSS and TSX files, Then 0 results are found
- [ ] Given a grep for `route-page-v2-header`, When searching CSS and TSX files, Then 0 results are found
- [ ] Given all existing tests, When `npm test` is run, Then all tests pass

---

## I-9: Non-Login Handling Pattern Unification

### Current State

Five pages handle non-login state differently:

| Page | Pattern | Header | Icon | Message | Action |
|------|---------|--------|------|---------|--------|
| HomePage | Renders `<GuestLanding>` (full landing page) | Brand bar | None | Marketing copy | "무료로 시작하기" link |
| AlertSettingsPage (line 233-249) | `settings-empty` div | `alert-page-v2-header` with `<h1>알림</h1>` | Bell SVG (48px) | "로그인이 필요해요" | "로그인" link |
| RouteSetupPage (line 447-463) | `apple-empty` div | `apple-nav` with back button | Map SVG (48px) | "로그인이 필요해요" | "로그인" link |
| SettingsPage (line 213-229) | `settings-empty` div | `settings-page-v2-header` with `<h1>설정</h1>` | Lock SVG (48px) | "로그인이 필요해요" | "로그인" link |
| CommuteDashboardPage (line 36-44) | `notice warning` div | `nav` with back button | None | "먼저 로그인해주세요." | None! |

**Problems:**
1. CommuteDashboardPage has no login CTA -- user is stuck
2. 3 different CSS class patterns for the same empty-state layout
3. Each page duplicates icon + message + button markup
4. RouteSetupPage uses a completely different header pattern (`apple-nav`) for non-login

### Changes Required

#### 1. Create shared AuthRequired component

**New file:** `frontend/src/presentation/components/AuthRequired.tsx`

```tsx
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';

interface AuthRequiredProps {
  /** Page title displayed in the PageHeader */
  pageTitle: string;
  /** Icon to show in the empty state area */
  icon: ReactNode;
  /** Description text below "로그인이 필요해요" */
  description: string;
}

export function AuthRequired({
  pageTitle,
  icon,
  description,
}: AuthRequiredProps): JSX.Element {
  return (
    <main className="page">
      <PageHeader title={pageTitle} sticky={false} />
      <div className="auth-required">
        <span className="auth-required-icon" aria-hidden="true">
          {icon}
        </span>
        <h2>로그인이 필요해요</h2>
        <p>{description}</p>
        <Link to="/login" className="btn btn-primary">로그인</Link>
      </div>
    </main>
  );
}
```

#### 2. Add CSS for auth-required

**File:** `frontend/src/presentation/index.css`

```css
.auth-required {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1.5rem;
  gap: 0.5rem;
}

.auth-required-icon svg {
  color: var(--ink-muted);
}

.auth-required h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0.5rem 0 0;
}

.auth-required p {
  color: var(--ink-secondary);
  margin: 0 0 1rem;
  line-height: 1.5;
}
```

#### 3. Replace non-login blocks in each page

**AlertSettingsPage.tsx** (lines 233-249): Replace with:
```tsx
if (!userId) {
  return (
    <AuthRequired
      pageTitle="알림"
      icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
      description="알림을 설정하려면 먼저 로그인하세요"
    />
  );
}
```

**RouteSetupPage.tsx** (lines 447-463): Replace with:
```tsx
if (!userId) {
  return (
    <AuthRequired
      pageTitle="경로"
      icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg>}
      description="출퇴근 경로를 저장하려면 먼저 로그인하세요"
    />
  );
}
```

**SettingsPage.tsx** (lines 213-229): Replace with:
```tsx
if (!userId) {
  return (
    <AuthRequired
      pageTitle="설정"
      icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
      description="설정을 관리하려면 먼저 로그인하세요"
    />
  );
}
```

**CommuteDashboardPage.tsx** (lines 36-44): Replace with:
```tsx
if (!userId) {
  return (
    <AuthRequired
      pageTitle="통근 통계"
      icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
      description="통근 통계를 보려면 먼저 로그인하세요"
    />
  );
}
```

**HomePage.tsx**: Keep `<GuestLanding>` as-is. The homepage has a fundamentally different non-login experience (marketing landing page, not a simple auth gate).

#### 4. Remove old CSS that is no longer needed

After replacing all non-login blocks, the following CSS classes used only in the old non-login sections can be removed:
- `.apple-empty` (if used only in RouteSetupPage non-login -- verify by grep first)
- `.settings-empty` (if used only in non-login blocks -- **careful**: SettingsPage also uses this class within the logged-in alerts/routes empty states; keep if still referenced)

**Important:** Do NOT remove `.settings-empty` if it is still used elsewhere. Grep to confirm.

### Risk: Medium

- CommuteDashboardPage non-login state currently has no footer, no proper page structure -- adding `AuthRequired` is a visible behavior change (improvement)
- The `useAuth` hook must be applied first (I-4) so `userId` is available from the hook, not localStorage

### Acceptance Criteria

- [ ] Given a non-logged-in user visits `/alerts`, When the page renders, Then a centered lock/bell icon, "로그인이 필요해요" heading, description text, and "로그인" button are displayed
- [ ] Given a non-logged-in user visits `/routes`, When the page renders, Then the same visual pattern as `/alerts` is displayed (icon, heading, description, CTA)
- [ ] Given a non-logged-in user visits `/settings`, When the page renders, Then the same visual pattern is displayed
- [ ] Given a non-logged-in user visits `/commute/dashboard`, When the page renders, Then a "로그인" CTA button is present (fixing the current missing CTA)
- [ ] Given all non-login screens, When comparing them visually, Then they share the same layout structure, font sizes, spacing, and button style
- [ ] Given all existing tests, When `npm test` is run, Then all tests pass

---

## I-1: HomePage God Component Split

### Current State

**File:** `frontend/src/presentation/pages/HomePage.tsx` -- **816 lines**, 1 default export (`HomePage`), 1 internal component (`GuestLanding`), 7 standalone functions, ~14 state variables, 7 `useEffect` hooks.

**Section breakdown by line range:**

| Section | Lines | Description | State Variables | Effects |
|---------|-------|-------------|-----------------|---------|
| Weather Checklist Logic | 9-82 | Constants, types, pure functions (`getWeatherChecklist`, `getTodayKey`, `getCheckedItems`, `saveCheckedItems`) | 0 | 0 |
| Auth helper | 84-86 | `getInitialLoginState()` | 0 | 0 |
| Greeting/Weather utils | 88-184 | `getGreeting`, `getWeatherType`, `WeatherIcon`, `getWeatherAdvice`, `getAqiStatus` | 0 | 0 |
| Route utils | 186-213 | `getActiveRoute`, `TransitArrivalInfo` type | 0 | 0 |
| GuestLanding | 217-262 | Non-login landing page component | 0 | 0 |
| HomePage component | 266-815 | Everything else | 14 | 7 |

### Target Structure

```
frontend/src/presentation/pages/
  home/
    index.ts                    # barrel export: HomePage
    HomePage.tsx                # orchestrator (~150 lines)
    GuestLanding.tsx            # non-login landing page (~50 lines)
    WeatherHeroSection.tsx      # weather card + checklist (~80 lines)
    CommuteSection.tsx          # route + transit + start button (~100 lines)
    AlertSection.tsx            # next alert bar / CTA (~40 lines)
    StatsSection.tsx            # weekly stats section (~50 lines)
    DeparturePrediction.tsx     # A-1 prediction banner (~25 lines)
    RouteRecommendation.tsx     # A-3 recommendation banner (~30 lines)
    weather-utils.ts            # pure functions: getWeatherType, getWeatherChecklist, getAqiStatus, getWeatherAdvice, WeatherIcon
    route-utils.ts              # getActiveRoute, TransitArrivalInfo type
    use-home-data.ts            # custom hook: all state + effects from HomePage
```

### Changes Required

#### 1. Extract pure utility functions

**New file: `home/weather-utils.ts`**

Move these from `HomePage.tsx`:
- Lines 9-16: constants (`RAIN_PROBABILITY_THRESHOLD`, etc.)
- Lines 18-22: `ChecklistItem` interface
- Lines 24-58: `getWeatherChecklist()`
- Lines 60-82: `getTodayKey()`, `getCheckedItems()`, `saveCheckedItems()`
- Lines 88-97: `getGreeting()`
- Lines 99-108: `getWeatherType()` and `WeatherType` type
- Lines 110-165: `WeatherIcon` component
- Lines 167-176: `getWeatherAdvice()`
- Lines 178-184: `getAqiStatus()`

All are pure functions with no React hooks -- straightforward extraction.

**New file: `home/route-utils.ts`**

Move these from `HomePage.tsx`:
- Lines 186-206: `getActiveRoute()`
- Lines 208-213: `TransitArrivalInfo` interface

#### 2. Extract custom hook: `use-home-data.ts`

**New file: `home/use-home-data.ts`**

Move all state and effects from the `HomePage` component (lines 270-529):
- All 14 `useState` declarations (lines 270-283)
- `userId` and `userName` from `useAuth()` (after I-4 is applied)
- All 7 `useEffect` hooks (core data, weather, departure prediction, route recommendation, transit arrivals, behavior collector)
- `activeRoute` useMemo (line 384)
- `nextAlert` useMemo (lines 458-493)
- `airQuality` useMemo (line 495)
- `checklistItems` useMemo (lines 498-501)
- `handleChecklistToggle` callback (lines 503-511)
- `handleStartCommute` callback (lines 513-529)
- `loadTransitArrivals` callback (lines 386-449)

Return interface:
```typescript
interface UseHomeDataReturn {
  isLoggedIn: boolean;
  userId: string;
  userName: string;
  isLoading: boolean;
  loadError: string;
  weather: WeatherData | null;
  airQuality: { label: string; className: string };
  checklistItems: ChecklistItem[];
  checkedItems: Set<string>;
  handleChecklistToggle: (id: string) => void;
  departurePrediction: DeparturePrediction | null;
  routeRecommendation: RouteRecommendationResponse | null;
  routeRecDismissed: boolean;
  setRouteRecDismissed: (v: boolean) => void;
  routes: RouteResponse[];
  activeRoute: RouteResponse | null;
  forceRouteType: 'auto' | 'morning' | 'evening';
  setForceRouteType: (v: 'auto' | 'morning' | 'evening') => void;
  transitInfos: TransitArrivalInfo[];
  alerts: Alert[];
  nextAlert: { time: string; label: string } | null;
  commuteStats: CommuteStatsResponse | null;
  isCommuteStarting: boolean;
  handleStartCommute: () => Promise<void>;
}
```

#### 3. Extract sub-components

**`GuestLanding.tsx`**: Move lines 217-262 as-is. No props needed.

**`WeatherHeroSection.tsx`**: Extract lines 567-609 (weather hero card + checklist). Props:
```typescript
interface WeatherHeroSectionProps {
  weather: WeatherData;
  airQuality: { label: string; className: string };
  checklistItems: ChecklistItem[];
  checkedItems: Set<string>;
  onChecklistToggle: (id: string) => void;
}
```

**`DeparturePrediction.tsx`**: Extract lines 612-628. Props: `{ prediction: DeparturePrediction }`.

**`RouteRecommendation.tsx`**: Extract lines 631-650. Props:
```typescript
interface RouteRecommendationProps {
  recommendation: RouteRecommendationResponse;
  onDismiss: () => void;
}
```

**`CommuteSection.tsx`**: Extract lines 652-733 (today-card section). Props:
```typescript
interface CommuteSectionProps {
  routes: RouteResponse[];
  activeRoute: RouteResponse | null;
  forceRouteType: 'auto' | 'morning' | 'evening';
  onForceRouteTypeChange: (type: 'auto' | 'morning' | 'evening') => void;
  transitInfos: TransitArrivalInfo[];
  isCommuteStarting: boolean;
  onStartCommute: () => void;
}
```

**`AlertSection.tsx`**: Extract lines 736-761. Props: `{ nextAlert: { time: string; label: string } | null }`.

**`StatsSection.tsx`**: Extract lines 764-812. Props: `{ commuteStats: CommuteStatsResponse | null }`.

#### 4. Slim down HomePage.tsx to an orchestrator

The final `HomePage.tsx` (~100-150 lines) becomes:
```tsx
import { useNavigate } from 'react-router-dom';
import { useHomeData } from './use-home-data';
import { GuestLanding } from './GuestLanding';
import { WeatherHeroSection } from './WeatherHeroSection';
import { DeparturePrediction } from './DeparturePrediction';
import { RouteRecommendation } from './RouteRecommendation';
import { CommuteSection } from './CommuteSection';
import { AlertSection } from './AlertSection';
import { StatsSection } from './StatsSection';

export function HomePage(): JSX.Element {
  const data = useHomeData();

  if (!data.isLoggedIn) return <GuestLanding />;

  if (data.isLoading) {
    return (/* skeleton loading UI */);
  }

  return (
    <main className="page home-page">
      <a href="#weather-hero" className="skip-link">본문으로 건너뛰기</a>

      {data.loadError && (
        <div className="notice error" role="alert" style={{ margin: '0 1rem 0.75rem' }}>
          {data.loadError}
        </div>
      )}

      <header className="home-header">
        <div>
          <h1 className="home-greeting">{getGreeting()}</h1>
          {data.userName && <p className="home-user-name">{data.userName}님</p>}
        </div>
      </header>

      {data.weather && (
        <WeatherHeroSection
          weather={data.weather}
          airQuality={data.airQuality}
          checklistItems={data.checklistItems}
          checkedItems={data.checkedItems}
          onChecklistToggle={data.handleChecklistToggle}
        />
      )}

      {data.departurePrediction && (
        <DeparturePrediction prediction={data.departurePrediction} />
      )}

      {data.routeRecommendation?.recommendation && !data.routeRecDismissed && (
        <RouteRecommendation
          recommendation={data.routeRecommendation}
          onDismiss={() => {
            data.setRouteRecDismissed(true);
            sessionStorage.setItem('routeRecDismissed', 'true');
          }}
        />
      )}

      <CommuteSection
        routes={data.routes}
        activeRoute={data.activeRoute}
        forceRouteType={data.forceRouteType}
        onForceRouteTypeChange={data.setForceRouteType}
        transitInfos={data.transitInfos}
        isCommuteStarting={data.isCommuteStarting}
        onStartCommute={data.handleStartCommute}
      />

      <AlertSection nextAlert={data.nextAlert} />

      <StatsSection commuteStats={data.commuteStats} />

      {data.routes.length > 1 && (
        <section className="other-routes" aria-label="다른 경로 보기">
          {/* existing other routes chips */}
        </section>
      )}
    </main>
  );
}
```

#### 5. Update barrel export

**New file: `home/index.ts`**:
```typescript
export { HomePage } from './HomePage';
```

Update the router import path from `'./pages/HomePage'` to `'./pages/home'`.

#### 6. Move test file

Move `HomePage.test.tsx` to `home/HomePage.test.tsx` and update imports. The test should still function since it mocks API calls at the infrastructure layer.

### Risk: Medium-High

- Largest change in the cycle (new directory, 10+ new files)
- All sub-components must receive the correct props
- Existing test must be updated to match new import paths
- `getGreeting()` uses `new Date()` -- it should be importable from `weather-utils.ts`

### Acceptance Criteria

- [ ] Given `HomePage.tsx`, When counting lines, Then it is under 200 lines
- [ ] Given the `home/` directory, When listing files, Then it contains: `index.ts`, `HomePage.tsx`, `GuestLanding.tsx`, `WeatherHeroSection.tsx`, `CommuteSection.tsx`, `AlertSection.tsx`, `StatsSection.tsx`, `DeparturePrediction.tsx`, `RouteRecommendation.tsx`, `weather-utils.ts`, `route-utils.ts`, `use-home-data.ts`
- [ ] Given the logged-in home page, When visually comparing before/after, Then the UI is pixel-identical
- [ ] Given the non-logged-in home page, When rendering, Then `GuestLanding` displays the marketing page
- [ ] Given `weather-utils.ts`, When importing `getWeatherChecklist`, Then it returns the correct checklist items for rainy weather with bad air quality
- [ ] Given all existing tests (including `HomePage.test.tsx`), When `npm test` is run, Then all tests pass
- [ ] Given `npm run typecheck`, When executed, Then 0 errors

---

## Scope (MoSCoW)

### Must have
- [I-4] All 8 page files use `useAuth()` instead of direct localStorage reads
- [I-4] `useAuth` exposes `phoneNumber`
- [I-12] SettingsPage tabs have `id`, `aria-controls`, and content wrapped in `role="tabpanel"`
- [I-12] RouteListView tabs have `id`, `aria-controls`, and content wrapped in `role="tabpanel"`
- [I-10] `PageHeader` component created and used by Alert, Settings, Route, and Notification pages
- [I-10] Old header CSS classes removed
- [I-9] `AuthRequired` component created and used by 4 pages (Alert, Route, Settings, CommuteDashboard)
- [I-1] HomePage split into home/ directory with sub-components
- [I-1] `use-home-data.ts` custom hook extracted
- [I-1] No file exceeds 300 lines

### Should have
- [I-1] Weather utility functions have dedicated unit tests in `weather-utils.test.ts`
- [I-9] `AuthRequired` snapshot test

### Could have
- [I-10] Animate page header appearance
- [I-1] Individual sub-component tests (WeatherHeroSection, CommuteSection, etc.)

### Won't have (this cycle)
- SettingsPage god component split (I-7) -- separate cycle
- CSS modularization (I-2) -- too large, separate cycle
- Full error feedback audit (I-3 remaining 23 sites) -- separate cycle
- Tailwind migration -- per CLAUDE.md, new components use Tailwind only when full migration begins

---

## Task Breakdown

| # | Task | Size | Deps | Estimated Time |
|---|------|:----:|:----:|:--------------:|
| 1 | Extend `useAuth` hook: add `phoneNumber`, update `getServerSnapshot` | S | none | 10 min |
| 2 | Replace `localStorage.getItem` in all 8 page files with `useAuth()` | M | 1 | 30 min |
| 3 | Remove `getInitialLoginState()` from HomePage.tsx | S | 2 | 5 min |
| 4 | Add ARIA `id`/`aria-controls`/`tabpanel` to SettingsPage tabs | S | none | 15 min |
| 5 | Add ARIA `id`/`aria-controls`/`tabpanel` to RouteListView tabs | S | none | 10 min |
| 6 | Create `PageHeader` component + CSS | S | none | 15 min |
| 7 | Replace headers in 5 pages with `PageHeader` | M | 6 | 20 min |
| 8 | Remove old header CSS classes | S | 7 | 5 min |
| 9 | Create `AuthRequired` component + CSS | S | 6 | 15 min |
| 10 | Replace non-login blocks in 4 pages with `AuthRequired` | M | 2, 9 | 20 min |
| 11 | Create `home/` directory structure | S | none | 5 min |
| 12 | Extract `weather-utils.ts` and `route-utils.ts` | M | none | 20 min |
| 13 | Extract `use-home-data.ts` custom hook | L | 2, 12 | 40 min |
| 14 | Extract sub-components (GuestLanding, WeatherHero, Commute, Alert, Stats, Departure, RouteRec) | L | 12, 13 | 45 min |
| 15 | Slim down `HomePage.tsx` to orchestrator + create barrel `index.ts` | M | 14 | 15 min |
| 16 | Update router import + move test file | S | 15 | 10 min |
| 17 | Run full verification: `tsc && lint && test && build` | S | all | 10 min |

**Total estimated: ~4.5 hours**

---

## Open Questions

1. **Should `api-client.ts` also use `useAuth`?** No -- it is infrastructure, not a React component. It cannot call hooks. The current `localStorage.getItem('accessToken')` in `getHeaders()` is the correct pattern for non-React code.

2. **Should the `handleLogout` in SettingsPage be centralized?** It already calls `notifyAuthChange()` which triggers useAuth re-renders. A `logout()` utility function could be created in a future cycle, but it is out of scope here since it writes/removes, not reads.

3. **Should HomePage's `GuestLanding` use `AuthRequired`?** No. The guest landing page is a marketing-style page with feature cards, CTA, brand bar. It is fundamentally different from the auth-gate pattern used on other pages.

---

## Out of Scope

- **I-7 (SettingsPage split)**: SettingsPage is 672 lines but its tab structure makes it modular already. Splitting it is a separate cycle item.
- **I-2 (CSS modularization)**: This cycle adds 2 new CSS classes but does not restructure the 16K-line CSS file.
- **I-3 (remaining silent failures)**: The 23 remaining silent `catch` blocks are tracked separately.
- **LoginPage.tsx auth writes**: Login/register writes to localStorage via `safeSetItem` are intentional and already call `notifyAuthChange()`.
- **Tailwind migration**: Per project CLAUDE.md, new components use existing CSS patterns until a dedicated Tailwind migration cycle.

---

*Spec written by PM agent. Ready for Dev implementation.*
